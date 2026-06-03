import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Learner, Assessment, User, UserRole, SubmissionStatus } from '../types';
import { DOMAINS, PERIODS } from '../constants';
import { STANDARD_SCORE_TABLE, SCALED_SCORE_TABLES } from '../constants/scaledScores';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Printer, CheckCircle2, TrendingUp, Table as TableIcon, Users, FileText, Eye, X, Image as ImageIcon, Layout as LayoutIcon, File, Maximize, Settings2, Sliders, CheckSquare, Square, ChevronDown, Calendar, Filter, Landmark } from 'lucide-react';

interface ReportViewProps {
  user: User;
  users: User[];
  learners: Learner[];
  assessments: Assessment[];
  submissions: SubmissionStatus[];
  period?: Assessment['period'] | 'All';
}

interface PrintSettings {
  paperSize: 'A4' | 'Letter' | 'Legal';
  margin: 'none' | 'narrow' | 'normal';
  layout: 'landscape' | 'portrait';
  scale: number;
  selectedPages: number[];
}

const calculateAgeNumeric = (birthday: string, refDate: string) => {
  if (!birthday || !refDate) return "0.0";
  const birth = new Date(birthday);
  const ref = new Date(refDate);
  if (isNaN(birth.getTime()) || isNaN(ref.getTime())) return "0.0";
  let years = ref.getFullYear() - birth.getFullYear();
  let months = ref.getMonth() - birth.getMonth();
  if (ref.getDate() < birth.getDate()) months--;
  if (months < 0) { years--; months += 12; }
  return `${years}.${months}`;
};

const getScaledScore = (domainId: string, raw: number, ageStr: string) => {
  const ageNum = parseFloat(ageStr);
  let tableKey = "";
  if (ageNum >= 3.1 && ageNum <= 4.0) tableKey = '3.1-4.0';
  else if (ageNum >= 4.1 && ageNum <= 5.0) tableKey = '4.1-5.0';
  else if (ageNum >= 5.1) tableKey = '5.1-above';
  else return 0;
  return SCALED_SCORE_TABLES[tableKey]?.[domainId]?.[raw] ?? 0;
};

const getStandardScore = (assessment: Assessment, learner: Learner) => {
  const ageStr = calculateAgeNumeric(learner.birthday, assessment.date);
  let totalScaled = 0;
  DOMAINS.forEach(d => {
    const raw = (assessment.scores as any)[d.id] || 0;
    const s = getScaledScore(d.id, raw, ageStr);
    totalScaled += Number(s);
  });
  if (totalScaled < 29) return 37;
  if (totalScaled > 98) return 138;
  return STANDARD_SCORE_TABLE[totalScaled] || 0;
};

const getInterpretation = (score: number) => {
  if (score === 0) return "No Data";
  if (score <= 69) return "Significant Delay";
  if (score <= 79) return "Slight Delay";
  if (score <= 119) return "Average Development";
  if (score <= 129) return "Slightly Advanced";
  return "Highly Advanced";
};

const getAutomaticSchoolYear = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  if (currentMonth >= 4) return `${currentYear}-${currentYear + 1}`;
  return `${currentYear - 1}-${currentYear}`;
};

const ReportView: React.FC<ReportViewProps> = ({ user, users, learners, assessments, submissions, period: initialPeriod = 'All' }) => {
  const [previewType, setPreviewType] = useState<'consolidation' | 'summary' | null>(null);
  const [activePeriod, setActivePeriod] = useState<Assessment['period'] | 'All'>(initialPeriod === 'All' ? 'All' : initialPeriod);
  const [localMatrixPeriod, setLocalMatrixPeriod] = useState<Assessment['period'] | 'All'>('All');
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<string>(user.schoolYear || getAutomaticSchoolYear());
  
  const [printSettings, setPrintSettings] = useState<PrintSettings>({
    paperSize: 'A4',
    margin: 'narrow',
    layout: 'landscape',
    scale: 95,
    selectedPages: [1]
  });

  // Sync state with prop changes
  useEffect(() => {
    setActivePeriod(initialPeriod);
    setLocalMatrixPeriod(initialPeriod);
  }, [initialPeriod]);

  // Logo state matching Dashboard/ECCDCard keys
  const USER_FORM_LOGO_KEY = user ? `branding_form_logo_${user.id}` : '';
  const DEPED_LOGO_KEY = 'branding_deped_logo';
  
  const [logos, setLogos] = useState(() => ({
    depedLogo: (typeof localStorage !== 'undefined' ? localStorage.getItem(DEPED_LOGO_KEY) : null) || 'eccd.jpg',
    schoolLogo: (typeof localStorage !== 'undefined' && USER_FORM_LOGO_KEY ? localStorage.getItem(USER_FORM_LOGO_KEY) : null) || ''
  }));

  useEffect(() => {
    if (!user) return;
    const handleLogoUpdate = () => {
      setLogos({
        depedLogo: localStorage.getItem(DEPED_LOGO_KEY) || 'eccd.jpg',
        schoolLogo: localStorage.getItem(USER_FORM_LOGO_KEY) || ''
      });
    };
    window.addEventListener('branding_user_logo_updated', handleLogoUpdate);
    return () => window.removeEventListener('branding_user_logo_updated', handleLogoUpdate);
  }, [user.id, USER_FORM_LOGO_KEY]);

  const filteredData = useMemo(() => {
    if (!user) return { learners: [], assessments: [] };
    let jLearners = learners;

    // Filter by School Year
    if (selectedSchoolYear !== 'All') {
      jLearners = jLearners.filter(l => l.schoolYear === selectedSchoolYear);
    }

    if (user.role === UserRole.SCHOOL_USER) {
      jLearners = jLearners.filter(l => l.schoolId === user.schoolId && (selectedSchoolYear === 'All' || l.schoolYear === selectedSchoolYear));
    } else if (user.role === UserRole.CONSOLIDATOR || user.role === UserRole.COORDINATOR) {
      jLearners = learners.filter(l => {
        const u = users.find(usr => usr.schoolId === l.schoolId);
        return u?.district === user.district;
      });
    }
    const jAssessments = assessments.filter(a => 
      jLearners.some(l => l.id === a.learnerId)
    );
    return { learners: jLearners, assessments: jAssessments };
  }, [user, learners, assessments, users, selectedSchoolYear]);

  const schoolYearOptions = useMemo(() => {
    const years = new Set<string>();
    learners.forEach(l => { if (l.schoolYear) years.add(l.schoolYear); });
    submissions.forEach(s => { if (s.schoolYear) years.add(s.schoolYear); });
    years.add(user.schoolYear || getAutomaticSchoolYear());
    return ['All', ...Array.from(years).sort().reverse()];
  }, [learners, submissions, user.schoolYear]);

  const calculateMetricsForSchool = useCallback((schoolId: string, schoolName: string, p: Assessment['period']) => {
    const schoolLearners = filteredData.learners.filter(l => l.schoolId === schoolId);
    const schoolAssessments = filteredData.assessments.filter(a => 
      a.period === p && schoolLearners.some(l => l.id === a.learnerId)
    );

    const schoolUser = users.find(u => u.schoolId === schoolId);
    const submission = submissions.find(s => s.userId === schoolUser?.id && s.period === p);
    
    let remark = "Awaiting Entry";
    if (submission?.isFinalized) {
      remark = "Finalized";
    } else if (schoolAssessments.length > 0) {
      remark = "Preparing";
    }
    
    const metrics = {
      schoolName, schoolId, period: p, enrollment: { m: 0, f: 0 }, tested: { m: 0, f: 0 },
      completionRate: 0,
      remark,
      status: {
        significantDelay: { m: 0, f: 0 },
        slightDelay: { m: 0, f: 0 },
        average: { m: 0, f: 0 },
        slightlyAdvanced: { m: 0, f: 0 },
        highlyAdvanced: { m: 0, f: 0 },
      }
    };

    schoolLearners.forEach(l => {
      if (l.gender === 'Male') metrics.enrollment.m++;
      else metrics.enrollment.f++;
    });

    schoolAssessments.forEach(a => {
      const learner = schoolLearners.find(l => l.id === a.learnerId);
      if (!learner) return;
      const gender = learner.gender === 'Male' ? 'm' : 'f';
      metrics.tested[gender]++;
      const score = getStandardScore(a, learner);
      const interp = getInterpretation(score);
      if (interp === "Significant Delay") metrics.status.significantDelay[gender]++;
      else if (interp === "Slight Delay") metrics.status.slightDelay[gender]++;
      else if (interp === "Average Development") metrics.status.average[gender]++;
      else if (interp === "Slightly Advanced") metrics.status.slightlyAdvanced[gender]++;
      else if (interp === "Highly Advanced") metrics.status.highlyAdvanced[gender]++;
    });

    const totalEnroll = metrics.enrollment.m + metrics.enrollment.f;
    
    // Domain-aware completion rate
    let totalDomainCompletion = 0;
    schoolLearners.forEach(l => {
      const a = schoolAssessments.find(as => as.learnerId === l.id);
      if (a) {
        let assessedDomains = 0;
        DOMAINS.forEach(d => {
          if ((a.scores as any)[d.id] > 0) assessedDomains++;
        });
        totalDomainCompletion += (assessedDomains / DOMAINS.length);
      }
    });

    metrics.completionRate = totalEnroll > 0 ? Math.round((totalDomainCompletion / totalEnroll) * 100) : 0;

    return metrics;
  }, [filteredData.learners, filteredData.assessments, users, submissions]);

  const schools = useMemo(() => {
    const schoolIds = Array.from(new Set(filteredData.learners.map(l => l.schoolId)));
    return schoolIds.map(id => {
      const u = users.find(usr => usr.schoolId === id);
      const name = u?.schoolName || id;
      return { id, name };
    });
  }, [filteredData.learners, users]);

  const periodsToDisplay = useMemo(() => activePeriod === 'All' ? PERIODS : [activePeriod], [activePeriod]);
  
  const reportRows = useMemo(() => {
    const rows: any[] = [];
    schools.forEach(school => {
      periodsToDisplay.forEach(p => {
        const rowMetrics = calculateMetricsForSchool(school.id, school.name, p);
        if (rowMetrics.enrollment.m + rowMetrics.enrollment.f > 0) {
            rows.push(rowMetrics);
        }
      });
    });
    return rows;
  }, [schools, periodsToDisplay, calculateMetricsForSchool]);

  // Derived filtered rows for the Consolidation Matrix specifically
  const consolidationRows = useMemo(() => {
    if (localMatrixPeriod === 'All') return reportRows;
    return reportRows.filter(r => r.period === localMatrixPeriod);
  }, [reportRows, localMatrixPeriod]);

  const totalTested = consolidationRows.reduce((acc, row) => acc + row.tested.m + row.tested.f, 0);

  const detailedMatrixData = useMemo(() => {
    const defaultGenderCount = () => ({ m: 0, f: 0, t: 0 });
    const defaultDomainSet = () => {
        const set: any = {};
        DOMAINS.forEach(d => { set[d.id] = defaultGenderCount(); });
        set['summary'] = defaultGenderCount();
        return set;
    };

    const data: any = {
      enrollment: defaultGenderCount(),
      tested: defaultGenderCount(),
      significant: defaultDomainSet(),
      slightDelay: defaultDomainSet(),
      average: defaultDomainSet(),
      slightlyAdvanced: defaultDomainSet(),
      highlyAdvanced: defaultDomainSet(),
    };

    filteredData.learners.forEach(l => {
        const gender = l.gender === 'Male' ? 'm' : 'f';
        data.enrollment[gender]++;
        data.enrollment.t++;
    });

    periodsToDisplay.forEach(p => {
        const periodAssessments = filteredData.assessments.filter(a => a.period === p);
        periodAssessments.forEach(a => {
            const learner = filteredData.learners.find(l => l.id === a.learnerId);
            if (!learner) return;

            const gender = learner.gender === 'Male' ? 'm' : 'f';
            data.tested[gender]++;
            data.tested.t++;

            const ageStr = calculateAgeNumeric(learner.birthday, a.date);
            const standardScore = getStandardScore(a, learner);
            const overallInterp = getInterpretation(standardScore);

            const categoryMap: any = {
                "Significant Delay": "significant",
                "Slight Delay": "slightDelay",
                "Average Development": "average",
                "Slightly Advanced": "slightlyAdvanced",
                "Highly Advanced": "highlyAdvanced"
            };
            if (categoryMap[overallInterp]) {
                data[categoryMap[overallInterp]].summary[gender]++;
                data[categoryMap[overallInterp]].summary.t++;
            }

            DOMAINS.forEach(d => {
                const raw = (a.scores as any)[d.id] || 0;
                const scaled = getScaledScore(d.id, raw, ageStr);
                
                let domainCategory = "";
                if (scaled >= 1 && scaled <= 3) domainCategory = "significant";
                else if (scaled >= 4 && scaled <= 6) domainCategory = "slightDelay";
                else if (scaled >= 7 && scaled <= 13) domainCategory = "average";
                else if (scaled >= 14 && scaled <= 16) domainCategory = "slightlyAdvanced";
                else if (scaled >= 17) domainCategory = "highlyAdvanced";

                if (domainCategory) {
                    data[domainCategory][d.id][gender]++;
                    data[domainCategory][d.id].t++;
                }
            });
        });
    });

    return data;
  }, [filteredData, periodsToDisplay]);

  const assessmentDate = useMemo(() => {
    if (filteredData.assessments.length === 0) return new Date().toLocaleDateString();
    const dates = filteredData.assessments.map(a => new Date(a.date).getTime());
    return new Date(Math.max(...dates)).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }, [filteredData.assessments]);

  const ReportLegend = ({ stats }: { stats?: { 
    significant: number, 
    slight: number, 
    average: number, 
    slightlyAdvanced: number, 
    highlyAdvanced: number, 
    total: number 
  } }) => (
    <div className="mt-6">
      <p className="text-[9px] font-black uppercase tracking-widest mb-2 text-slate-500 border-b border-gray-200 pb-1 flex items-center gap-2">
         {stats ? 'Interpretation Summary & Legend' : 'Interpretation Legend'}
      </p>
      <div className="grid grid-cols-5 gap-1.5">
        {[
          { key: 'significant', label: 'Significant Delay', colorClass: 'red', desc: 'Development is significantly lower than expected for age.' },
          { key: 'slight', label: 'Slight Delay', colorClass: 'amber', desc: 'Development is slightly lower than expected for age.' },
          { key: 'average', label: 'Average Development', colorClass: 'emerald', desc: 'Child\'s development is within the normal range.' },
          { key: 'slightlyAdvanced', label: 'Slightly Advanced', colorClass: 'blue', desc: 'Development is slightly higher than expected for age.' },
          { key: 'highlyAdvanced', label: 'Highly Advanced', colorClass: 'purple', desc: 'Development is significantly higher than expected for age.' },
        ].map((item) => {
          const count = stats ? (stats as any)[item.key] : null;
          const percentage = stats && stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
          
          // CSS classes for color (avoiding string templates for reliability)
          const bgClass = item.colorClass === 'red' ? 'bg-red-50/50' : 
                         item.colorClass === 'amber' ? 'bg-amber-50/50' :
                         item.colorClass === 'emerald' ? 'bg-emerald-50/50' :
                         item.colorClass === 'blue' ? 'bg-blue-50/50' : 'bg-purple-50/50';
          const textClass = item.colorClass === 'red' ? 'text-red-700' : 
                          item.colorClass === 'amber' ? 'text-amber-700' :
                          item.colorClass === 'emerald' ? 'text-emerald-700' :
                          item.colorClass === 'blue' ? 'text-blue-700' : 'text-purple-700';

          return (
            <div key={item.key} className={`p-1.5 border border-slate-300 ${bgClass}`}>
              <div className="flex justify-between items-start mb-1">
                <p className={`text-[7.5px] font-black uppercase leading-none ${textClass}`}>{item.label}</p>
                {stats && (
                  <span className={`text-[8.5px] font-black ${textClass}`}>
                    {count} ({percentage}%)
                  </span>
                )}
              </div>
              <p className="text-[6.5px] lowercase font-medium leading-tight text-gray-500 italic">{item.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );

  const SignatureBlock = () => {
    const executiveName = user.role === UserRole.SCHOOL_USER ? (user.schoolHeadName || 'Assign Name') : (user.districtSupervisorName || 'Assign Name');
    const executiveDesignation = user.role === UserRole.SCHOOL_USER ? (user.schoolHeadDesignation || 'SCHOOL HEAD') : (user.districtSupervisorDesignation || 'DISTRICT SUPERVISOR');

    return (
      <div className="mt-12 flex justify-between gap-20">
        <div className="flex-1 text-left">
           <p className="text-[10px] font-bold uppercase mb-8 text-slate-400">Prepared by:</p>
           <p className="text-sm font-black border-b border-slate-300 inline-block min-w-[220px] pb-1 uppercase text-slate-700">{user.fullName}</p>
           <p className="text-[9px] font-bold uppercase mt-1 text-slate-400">{user.designation || 'TEACHER / FACILITATOR'}</p>
        </div>
        <div className="flex-1 text-left">
           <p className="text-[10px] font-bold uppercase mb-8 text-slate-400">Noted:</p>
           <p className="text-sm font-black border-b border-slate-300 inline-block min-w-[220px] pb-1 uppercase text-slate-700">{executiveName}</p>
           <p className="text-[9px] font-bold uppercase mt-1 text-slate-400">{executiveDesignation}</p>
        </div>
      </div>
    );
  };

  const PrintHeader = ({ title }: { title: string }) => (
    <div className="flex items-center justify-between mb-8">
      <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center border border-gray-100 shadow-sm overflow-hidden shrink-0">
        {logos.depedLogo ? (
          <img src={logos.depedLogo} className="w-full h-full object-contain p-2" alt="DepEd" />
        ) : (
          <div className="w-full h-full bg-slate-100 flex items-center justify-center"><ImageIcon className="w-8 h-8 text-slate-300" /></div>
        )}
      </div>
      <div className="text-center flex-1 px-10">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Republic of the Philippines • Department of Education</p>
        <p className="text-[9px] font-bold uppercase mt-1 text-gray-500">Region II • Schools Division of Isabela</p>
        <h2 className="text-xl font-black uppercase tracking-tighter mt-2">{title}</h2>
        <div className="mt-4 flex justify-center gap-10 text-[9px] font-black uppercase border-t border-gray-100 pt-3">
            <span>Jurisdiction: {user.district} District</span>
            <span>School Year: {selectedSchoolYear === 'All' ? 'All Years' : `S.Y. ${selectedSchoolYear}`}</span>
            <span>Period: {activePeriod}</span>
        </div>
      </div>
      <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center border border-gray-100 shadow-sm overflow-hidden shrink-0">
        {logos.schoolLogo ? (
          <img src={logos.schoolLogo} className="w-full h-full object-contain p-2" alt="School" />
        ) : (
          <div className="w-full h-full bg-slate-100 flex items-center justify-center text-[7px] font-black text-slate-300 uppercase leading-none text-center">OFFICIAL<br/>LOGO</div>
        )}
      </div>
    </div>
  );

  const DetailedMatrixTable = ({ isPrint = false }: { isPrint?: boolean }) => {
    const getCategoryHeader = (cat: string) => {
      switch(cat) {
        case 'significant': return <>Significant Delay In<br/>Overall Development</>;
        case 'slightDelay': return <>Slightly Delay In<br/>Overall Development</>;
        case 'average': return <>Average Overall<br/>Development</>;
        case 'slightlyAdvanced': return <>Slightly Advance<br/>Development</>;
        case 'highlyAdvanced': return <>Highly Advance<br/>Development</>;
        default: return '';
      }
    };

    const summaryStats = {
      significant: detailedMatrixData.significant.summary.t,
      slight: detailedMatrixData.slightDelay.summary.t,
      average: detailedMatrixData.average.summary.t,
      slightlyAdvanced: detailedMatrixData.slightlyAdvanced.summary.t,
      highlyAdvanced: detailedMatrixData.highlyAdvanced.summary.t,
      total: detailedMatrixData.tested.t
    };

    return (
      <div className={`overflow-x-auto ${isPrint ? 'print-page-box' : ''}`}>
        <table className={`detailed-report-table w-full text-[10px] border-collapse ${isPrint ? 'table-layout-fixed' : ''}`} style={{ minWidth: isPrint ? '100%' : '1200px' }}>
          <thead>
            <tr className="border border-slate-300">
              <th rowSpan={3} className="border border-slate-300 px-1 uppercase w-16 leading-tight bg-slate-50">
                <div className="vertical-header h-32 flex items-center justify-center font-black text-slate-600">ASSESSMENT DATE<br/>{assessmentDate}</div>
              </th>
              <th colSpan={3} rowSpan={2} className="border border-slate-300 bg-slate-50 vertical-header h-32 uppercase px-1 font-black text-slate-600">Enrollment</th>
              <th colSpan={3} rowSpan={2} className="border border-slate-300 bg-slate-50 vertical-header h-32 uppercase px-1 font-black text-slate-600">No. of Pupils Tested</th>
              
              {['significant', 'slightDelay', 'average', 'slightlyAdvanced', 'highlyAdvanced'].map(cat => (
                <th key={cat} colSpan={DOMAINS.length * 3} className="border border-slate-300 px-1 py-2 text-[11px] font-black uppercase bg-slate-100 text-slate-700 leading-tight whitespace-normal max-w-[120px]">
                  {getCategoryHeader(cat)}
                </th>
              ))}
            </tr>
            <tr className="border border-slate-300">
              {['significant', 'slightDelay', 'average', 'slightlyAdvanced', 'highlyAdvanced'].map(cat => (
                <React.Fragment key={cat}>
                  {DOMAINS.map(d => (
                     <th key={d.id} colSpan={3} className="border border-slate-300 vertical-header h-32 uppercase px-1 font-bold bg-white text-slate-500">{d.label}</th>
                  ))}
                </React.Fragment>
              ))}
            </tr>
            <tr className="border border-slate-300 bg-slate-50 text-[9px] font-black text-slate-400">
              <th className="border border-slate-300 px-0.5 w-6">M</th>
              <th className="border border-slate-300 px-0.5 w-6">F</th>
              <th className="border border-slate-300 px-0.5 w-6">T</th>
              <th className="border border-slate-300 px-0.5 w-6">M</th>
              <th className="border border-slate-300 px-0.5 w-6">F</th>
              <th className="border border-slate-300 px-0.5 w-6">T</th>
              {['significant', 'slightDelay', 'average', 'slightlyAdvanced', 'highlyAdvanced'].map(cat => (
                <React.Fragment key={cat}>
                  {DOMAINS.map(d => (
                     <React.Fragment key={d.id}>
                       <th className="border border-slate-300 px-0.5 w-5">M</th>
                       <th className="border border-slate-300 px-0.5 w-5">F</th>
                       <th className="border border-slate-300 px-0.5 w-5">T</th>
                     </React.Fragment>
                  ))}
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white font-bold text-center text-slate-700">
            <tr className="border border-slate-300 h-8">
              <td className="border border-slate-300 text-[8px] font-black bg-slate-50 text-slate-500">TOTALS</td>
              <td className="border border-slate-300 px-0.5">{detailedMatrixData.enrollment.m}</td>
              <td className="border border-slate-300 px-0.5">{detailedMatrixData.enrollment.f}</td>
              <td className="border border-slate-300 px-0.5 bg-slate-50 font-black">{detailedMatrixData.enrollment.t}</td>
              <td className="border border-slate-300 px-0.5">{detailedMatrixData.tested.m}</td>
              <td className="border border-slate-300 px-0.5">{detailedMatrixData.tested.f}</td>
              <td className="border border-slate-300 px-0.5 bg-slate-50 font-black">{detailedMatrixData.tested.t}</td>
              
              {['significant', 'slightDelay', 'average', 'slightlyAdvanced', 'highlyAdvanced'].map(cat => (
                <React.Fragment key={cat}>
                  {DOMAINS.map(d => (
                     <React.Fragment key={d.id}>
                       <td className="border border-slate-300 px-0.5">{detailedMatrixData[cat][d.id].m || 0}</td>
                       <td className="border border-slate-300 px-0.5">{detailedMatrixData[cat][d.id].f || 0}</td>
                       <td className="border border-slate-300 px-0.5 bg-slate-50">{detailedMatrixData[cat][d.id].t || 0}</td>
                     </React.Fragment>
                  ))}
                </React.Fragment>
              ))}
            </tr>
          </tbody>
        </table>
        
        <ReportLegend stats={summaryStats} />

        {isPrint && <SignatureBlock />}
      </div>
    );
  };

  const ConsolidationMatrixTable = ({ isPrint = false }: { isPrint?: boolean }) => {
    const matrixStats = {
      significant: consolidationRows.reduce((a, b) => a + b.status.significantDelay.m + b.status.significantDelay.f, 0),
      slight: consolidationRows.reduce((a, b) => a + b.status.slightDelay.m + b.status.slightDelay.f, 0),
      average: consolidationRows.reduce((a, b) => a + b.status.average.m + b.status.average.f, 0),
      slightlyAdvanced: consolidationRows.reduce((a, b) => a + b.status.slightlyAdvanced.m + b.status.slightlyAdvanced.f, 0),
      highlyAdvanced: consolidationRows.reduce((a, b) => a + b.status.highlyAdvanced.m + b.status.highlyAdvanced.f, 0),
      total: totalTested
    };

    return (
      <div className={`overflow-x-auto ${isPrint ? 'print-page-box' : ''}`}>
        <table className="w-full text-left border-collapse border border-slate-300">
          <thead className={`bg-slate-50 font-black text-slate-500 uppercase tracking-widest ${isPrint ? 'text-[8.5px]' : 'text-[11px]'}`}>
            <tr className="border-b border-slate-300">
              <th rowSpan={2} className="px-4 py-3 border-r border-slate-300 text-slate-700">School</th>
              <th rowSpan={2} className="px-4 py-3 border-r border-slate-300 text-center text-slate-700">Period</th>
              <th rowSpan={2} className="px-4 py-3 border-r border-slate-300 text-center text-slate-700 leading-tight">Completion<br/>Rate (%)</th>
              <th colSpan={3} className="px-4 py-2 border-b border-slate-300 text-center border-r border-slate-300 bg-slate-100/50">Enrollment</th>
              <th colSpan={3} className="px-4 py-2 border-b border-slate-300 text-center border-r border-slate-300 bg-slate-100/50 leading-tight">
                <div className="flex flex-col items-center">
                    <span>Number of</span>
                    <span>Assessed Learners</span>
                </div>
              </th>
              <th colSpan={5} className="px-4 py-2 border-b border-slate-300 text-center bg-slate-100/50">Development Interpretation (M+F)</th>
            </tr>
            <tr className={`${isPrint ? 'text-[7.5px]' : 'text-[9px]'} bg-slate-50/50`}>
              <th className="px-2 py-1.5 text-center border-r border-slate-300">M</th>
              <th className="px-2 py-1.5 text-center border-r border-slate-300">F</th>
              <th className="px-2 py-1.5 text-center border-r border-slate-300 font-black text-slate-900 bg-slate-200/30">T</th>
              <th className="px-2 py-1.5 text-center border-r border-slate-300">M</th>
              <th className="px-2 py-1.5 text-center border-r border-slate-300">F</th>
              <th className="px-2 py-1.5 text-center border-r border-slate-300 font-black text-slate-900 bg-slate-200/30">T</th>
              <th className="px-2 py-1.5 text-center border-r border-slate-300 bg-red-50 text-red-600 leading-tight">Significant<br/>Delay</th>
              <th className="px-2 py-1.5 text-center border-r border-slate-300 bg-amber-50 text-amber-600 leading-tight">Slight<br/>Delay</th>
              <th className="px-2 py-1.5 text-center border-r border-slate-300 bg-emerald-50 text-emerald-600 leading-tight">Average<br/>Development</th>
              <th className="px-2 py-1.5 text-center border-r border-slate-300 bg-blue-50 text-blue-600 leading-tight">Slightly<br/>Advanced</th>
              <th className="px-2 py-1.5 text-center bg-purple-50 text-purple-600 leading-tight">Highly<br/>Advanced</th>
            </tr>
          </thead>
          <tbody className={`divide-y divide-slate-200 ${isPrint ? 'text-[9px]' : 'text-[11px]'}`}>
            {consolidationRows.map((row, idx) => (
              <tr key={idx} className="hover:bg-blue-50/30 transition-colors border-b border-slate-200">
                <td className="px-4 py-3 font-bold text-slate-900 border-r border-slate-200 uppercase leading-tight truncate whitespace-nowrap">{row.schoolName}</td>
                <td className="px-2 py-3 text-center font-black uppercase text-blue-600 border-r border-slate-200 whitespace-nowrap">{row.period}</td>
                <td className="px-2 py-3 text-center border-r border-slate-200 font-black text-emerald-600 bg-emerald-50/30">
                  {row.completionRate}%
                </td>
                <td className="px-2 py-3 text-center border-r border-slate-200 text-slate-600">{row.enrollment.m}</td>
                <td className="px-2 py-3 text-center border-r border-slate-200 text-slate-600">{row.enrollment.f}</td>
                <td className="px-2 py-3 text-center border-r border-slate-200 font-black bg-slate-50 text-slate-900">{row.enrollment.m + row.enrollment.f}</td>
                <td className="px-2 py-3 text-center border-r border-slate-200 text-slate-600">{row.tested.m}</td>
                <td className="px-2 py-3 text-center border-r border-slate-200 text-slate-600">{row.tested.f}</td>
                <td className="px-2 py-3 text-center border-r border-slate-200 font-black bg-emerald-50/50 text-emerald-700">{row.tested.m + row.tested.f}</td>
                <td className="px-2 py-3 text-center border-r border-slate-200 font-bold text-slate-700">{row.status.significantDelay.m + row.status.significantDelay.f}</td>
                <td className="px-2 py-3 text-center border-r border-slate-200 font-bold text-slate-700">{row.status.slightDelay.m + row.status.slightDelay.f}</td>
                <td className="px-2 py-3 text-center border-r border-slate-200 font-bold text-slate-700">{row.status.average.m + row.status.average.f}</td>
                <td className="px-2 py-3 text-center border-r border-slate-200 font-bold text-slate-700">{row.status.slightlyAdvanced.m + row.status.slightlyAdvanced.f}</td>
                <td className="px-2 py-3 text-center font-bold text-slate-700">{row.status.highlyAdvanced.m + row.status.highlyAdvanced.f}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className={`bg-slate-800 text-white font-black border-t border-slate-300 ${isPrint ? 'text-[9px]' : 'text-[11px]'}`}>
            <tr>
                <td colSpan={2} className="px-4 py-4 uppercase tracking-widest text-right">TOTAL</td>
                <td className="px-2 py-4 text-center bg-emerald-600/30">
                  {consolidationRows.length > 0 ? Math.round(consolidationRows.reduce((a, b) => a + b.completionRate, 0) / consolidationRows.length) : 0}%
                </td>
                <td className="px-2 py-4 text-center"></td>
                <td className="px-2 py-4 text-center"></td>
                <td className="px-2 py-4 text-center bg-blue-600/30"></td>
                <td className="px-2 py-4 text-center">{consolidationRows.reduce((a, b) => a + b.tested.m, 0)}</td>
                <td className="px-2 py-4 text-center">{consolidationRows.reduce((a, b) => a + b.tested.f, 0)}</td>
                <td className="px-2 py-4 text-center bg-emerald-600/50 font-black">{totalTested}</td>
                <td className="px-2 py-4 text-center">{consolidationRows.reduce((a, b) => a + b.status.significantDelay.m + b.status.significantDelay.f, 0)}</td>
                <td className="px-2 py-4 text-center">{consolidationRows.reduce((a, b) => a + b.status.slightDelay.m + b.status.slightDelay.f, 0)}</td>
                <td className="px-2 py-4 text-center">{consolidationRows.reduce((a, b) => a + b.status.average.m + b.status.average.f, 0)}</td>
                <td className="px-2 py-4 text-center">{consolidationRows.reduce((a, b) => a + b.status.slightlyAdvanced.m + b.status.slightlyAdvanced.f, 0)}</td>
                <td className="px-2 py-4 text-center">{consolidationRows.reduce((a, b) => a + b.status.highlyAdvanced.m + b.status.highlyAdvanced.f, 0)}</td>
            </tr>
          </tfoot>
        </table>
        
        <ReportLegend stats={matrixStats} />

        {isPrint && <SignatureBlock />}
      </div>
    );
  };

  const getMarginInches = () => {
    if (printSettings.margin === 'none') return 0;
    if (printSettings.margin === 'narrow') return 0.25;
    return 0.5;
  };

  const handleTogglePage = (page: number) => {
    setPrintSettings(prev => ({
      ...prev,
      selectedPages: prev.selectedPages.includes(page) ? prev.selectedPages.filter(p => p !== page) : [...prev.selectedPages, page]
    }));
  };

  const dataByLD = useMemo(() => {
    const groups: Record<string, { learners: Learner[], assessments: Assessment[] }> = {};
    
    filteredData.learners.forEach(l => {
      const u = users.find(usr => usr.schoolId === l.schoolId);
      const ld = u?.legislativeDistrict || "Unknown";
      if (!groups[ld]) groups[ld] = { learners: [], assessments: [] };
      groups[ld].learners.push(l);
    });

    filteredData.assessments.forEach(a => {
      const l = filteredData.learners.find(lrn => lrn.id === a.learnerId);
      if (!l) return;
      const u = users.find(usr => usr.schoolId === l.schoolId);
      const ld = u?.legislativeDistrict || "Unknown";
      if (!groups[ld]) groups[ld] = { learners: [], assessments: [] };
      groups[ld].assessments.push(a);
    });

    return groups;
  }, [filteredData, users]);

  if (!user) return null;

  const LegislativeDistrictMatrixTable = ({ ld, ldLearners, ldAssessments }: { ld: string, ldLearners: Learner[], ldAssessments: Assessment[] }) => {
    const categories = [
      { id: 'significant', label: 'Significant Delay In Overall Development' },
      { id: 'slightDelay', label: 'Slightly Delay In Overall Development' },
      { id: 'average', label: 'Average Overall Development' },
      { id: 'slightlyAdvanced', label: 'Slightly Advance Development' },
      { id: 'highlyAdvanced', label: 'Highly Advance Development' }
    ];

    const matrix = useMemo(() => {
      const m: any = {};
      categories.forEach(cat => {
        m[cat.id] = {};
        DOMAINS.forEach(d => {
          m[cat.id][d.id] = { m: 0, f: 0 };
        });
      });

      ldAssessments.forEach(a => {
        if (activePeriod !== 'All' && a.period !== activePeriod) return;
        
        const learner = ldLearners.find(l => l.id === a.learnerId);
        if (!learner) return;
        const gender = learner.gender === 'Male' ? 'm' : 'f';
        const ageStr = calculateAgeNumeric(learner.birthday, a.date);

        DOMAINS.forEach(d => {
          const raw = (a.scores as any)[d.id] || 0;
          const scaled = getScaledScore(d.id, raw, ageStr);
          
          let catId = "";
          if (scaled >= 1 && scaled <= 3) catId = "significant";
          else if (scaled >= 4 && scaled <= 6) catId = "slightDelay";
          else if (scaled >= 7 && scaled <= 13) catId = "average";
          else if (scaled >= 14 && scaled <= 16) catId = "slightlyAdvanced";
          else if (scaled >= 17) catId = "highlyAdvanced";

          if (catId) {
            m[catId][d.id][gender]++;
          }
        });
      });
      return m;
    }, [ldLearners, ldAssessments, activePeriod]);

    const totals = useMemo(() => {
      const t: any = {};
      DOMAINS.forEach(d => {
        t[d.id] = { m: 0, f: 0 };
        categories.forEach(cat => {
          t[d.id].m += matrix[cat.id][d.id].m;
          t[d.id].f += matrix[cat.id][d.id].f;
        });
      });
      return t;
    }, [matrix]);

    return (
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden mb-8">
        <div className="bg-slate-50 px-8 py-4 border-b border-gray-200 flex items-center justify-between">
          <h4 className="font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
            <Landmark className="w-4 h-4 text-blue-600" />
            {ld} Summary Matrix
          </h4>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Legislative District Performance</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-300">
            <thead>
              <tr className="bg-blue-50/50">
                <th rowSpan={2} className="border border-slate-300 px-4 py-2 text-[10px] font-black uppercase text-slate-600"></th>
                {DOMAINS.map(d => {
                  let label = d.label.toUpperCase();
                  if (label === 'EXPRESSIVE LANGUAGE') label = 'EXPRESSICE LANGUAGE';
                  if (label === 'SOCIO-EMOTIONAL') label = 'SOCIAL EMOTIONAL';
                  return (
                    <th key={d.id} colSpan={2} className="border border-slate-300 px-2 py-2 text-[10px] font-black uppercase text-center bg-blue-100/50 text-slate-700">
                      {label}
                    </th>
                  );
                })}
              </tr>
              <tr className="bg-slate-50">
                {DOMAINS.map(d => (
                  <React.Fragment key={d.id}>
                    <th className="border border-slate-300 px-2 py-1.5 text-[9px] font-black text-center w-12 text-slate-400">Male</th>
                    <th className="border border-slate-300 px-2 py-1.5 text-[9px] font-black text-center w-12 text-slate-400">Female</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody className="text-[10px] font-bold text-slate-700">
              {categories.map(cat => (
                <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                  <td className="border border-slate-300 px-4 py-3 font-black uppercase bg-slate-50/30 text-slate-600">{cat.label}</td>
                  {DOMAINS.map(d => (
                    <React.Fragment key={d.id}>
                      <td className="border border-slate-300 px-2 py-3 text-center">{matrix[cat.id][d.id].m}</td>
                      <td className="border border-slate-300 px-2 py-3 text-center">{matrix[cat.id][d.id].f}</td>
                    </React.Fragment>
                  ))}
                </tr>
              ))}
              <tr className="bg-amber-50 font-black text-amber-900">
                <td className="border border-slate-300 px-4 py-3 uppercase text-center">TOTAL</td>
                {DOMAINS.map(d => (
                  <React.Fragment key={d.id}>
                    <td className="border border-slate-300 px-2 py-3 text-center">{totals[d.id].m}</td>
                    <td className="border border-slate-300 px-2 py-3 text-center">{totals[d.id].f}</td>
                  </React.Fragment>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <style>{`
        .vertical-header {
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          text-align: center;
          padding: 4px;
        }
        .detailed-report-table th, .detailed-report-table td {
          border: 1px solid black;
        }
        .table-layout-fixed {
          table-layout: fixed !important;
        }
        @media print {
          @page { 
            size: ${printSettings.paperSize} ${printSettings.layout}; 
            margin: 0 !important; 
          }
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-page-box { 
            width: ${printSettings.layout === 'landscape' ? '297mm' : '210mm'} !important;
            height: ${printSettings.layout === 'landscape' ? '210mm' : '297mm'} !important;
            padding: ${getMarginInches()}in !important;
            box-sizing: border-box !important;
            transform: scale(${printSettings.scale / 100}) !important;
            transform-origin: top left !important;
            page-break-after: always;
            background: white !important;
            overflow: hidden;
          }
          ${!printSettings.selectedPages.includes(1) ? '.print-page-box { display: none !important; }' : ''}
        }
      `}</style>

      {/* Unified Print Preview Modal */}
      {previewType && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 no-print">
          <div className="bg-white rounded-[40px] shadow-2xl w-full h-full max-w-[95vw] max-h-[90vh] flex flex-col overflow-hidden">
             <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-slate-900 text-white">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-600 rounded-2xl">
                    <Printer className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight">Report Print Preview</h3>
                    <p className="text-blue-100/60 text-[10px] font-black uppercase tracking-widest mt-0.5">
                      {previewType === 'consolidation' ? 'District-wide Consolidation Matrix' : 'Developmental Status Summary Matrix'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => window.print()} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-blue-900/40">Confirm Print</button>
                  <button onClick={() => setPreviewType(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-6 h-6" /></button>
                </div>
             </div>
             
             <div className="flex flex-1 overflow-hidden">
                {/* Print Settings Sidebar */}
                <div className="w-72 bg-slate-50 border-r border-gray-200 overflow-y-auto p-6 flex flex-col gap-8">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><CheckSquare className="w-3.5 h-3.5" /> Select Pages</label>
                    <button
                      onClick={() => handleTogglePage(1)}
                      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border transition-all ${printSettings.selectedPages.includes(1) ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' : 'bg-white border-gray-200 text-gray-400'}`}
                    >
                      <div className="flex items-center gap-3">
                        {printSettings.selectedPages.includes(1) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                        <span className="text-xs font-black uppercase tracking-tight">Page 1</span>
                      </div>
                    </button>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><File className="w-3.5 h-3.5" /> Paper Size</label>
                    <div className="grid grid-cols-1 gap-2">
                      {['A4', 'Letter', 'Legal'].map(size => (
                        <button 
                          key={size}
                          onClick={() => setPrintSettings({...printSettings, paperSize: size as any})}
                          className={`px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-tight transition-all border ${printSettings.paperSize === size ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-gray-200 text-gray-400 hover:border-blue-200'}`}
                        >
                          {size} Size
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><LayoutIcon className="w-3.5 h-3.5" /> Orientation</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['landscape', 'portrait'].map(l => (
                        <button 
                          key={l}
                          onClick={() => setPrintSettings({...printSettings, layout: l as any})}
                          className={`px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-tight transition-all border ${printSettings.layout === l ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-gray-200 text-gray-400 hover:border-blue-200'}`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Sliders className="w-3.5 h-3.5" /> Margins</label>
                    <div className="grid grid-cols-1 gap-2">
                      {['none', 'narrow', 'normal'].map(m => (
                        <button 
                          key={m}
                          onClick={() => setPrintSettings({...printSettings, margin: m as any})}
                          className={`px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-tight transition-all border ${printSettings.margin === m ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' : 'bg-white border-gray-200 text-gray-400 hover:border-emerald-200'}`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Maximize className="w-3.5 h-3.5" /> Scale ({printSettings.scale}%)</label>
                    </div>
                    <input 
                      type="range" 
                      min="50" 
                      max="120" 
                      step="1"
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      value={printSettings.scale}
                      onChange={(e) => setPrintSettings({...printSettings, scale: parseInt(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-auto p-10 bg-gray-100 flex flex-col items-center">
                   <div 
                    className="bg-white shadow-2xl border border-gray-300 w-fit transition-all duration-300 origin-top"
                    style={{ 
                      padding: `${getMarginInches()}in`,
                      transform: `scale(${printSettings.scale / 100})`,
                      width: printSettings.layout === 'landscape' ? '297mm' : '210mm',
                      minHeight: printSettings.layout === 'landscape' ? '210mm' : '297mm',
                    }}
                   >
                      {previewType === 'consolidation' && (
                        <>
                          <PrintHeader title="DISTRICT-WIDE CONSOLIDATION MATRIX" />
                          <ConsolidationMatrixTable isPrint={true} />
                        </>
                      )}
                      {previewType === 'summary' && (
                        <>
                          <PrintHeader title="DEVELOPMENTAL STATUS SUMMARY MATRIX" />
                          <div className="mb-4 text-center">
                            <p className="text-[10px] font-black uppercase">Assessment Date: {assessmentDate}</p>
                          </div>
                          <DetailedMatrixTable isPrint={true} />
                        </>
                      )}
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Report Header */}
      <div className="bg-white p-10 border border-gray-200 rounded-[32px] shadow-sm text-center space-y-2 relative overflow-hidden no-print">
        <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
        <p className="text-sm font-black text-gray-400 uppercase tracking-tighter">Department of Education • Republic of the Philippines</p>
        <h2 className="text-2xl font-black uppercase tracking-tight text-gray-900">ECCD Checklist Summary Performance Report</h2>
        
        <div className="max-w-2xl mx-auto mt-8 flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="flex items-center gap-3 mb-2 px-2">
               <Landmark className="w-4 h-4 text-emerald-600" />
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">School Year</label>
            </div>
            <div className="relative">
              <select 
                value={selectedSchoolYear}
                onChange={(e) => setSelectedSchoolYear(e.target.value)}
                className="w-full pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-sm font-black text-emerald-700 appearance-none focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all cursor-pointer uppercase"
              >
                {schoolYearOptions.map(sy => (
                  <option key={sy} value={sy}>{sy === 'All' ? 'All Years' : `S.Y. ${sy}`}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex-1 w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="flex items-center gap-3 mb-2 px-2">
               <Calendar className="w-4 h-4 text-blue-600" />
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select Assessment Period</label>
            </div>
            <div className="relative">
              <select 
                value={activePeriod}
                onChange={(e) => setActivePeriod(e.target.value as any)}
                className="w-full pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-sm font-black text-blue-700 appearance-none focus:ring-2 focus:ring-blue-500/20 outline-none transition-all cursor-pointer uppercase"
              >
                <option value="All">Comprehensive (All Periods)</option>
                {PERIODS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-6 border-t border-gray-100 mt-8 text-left">
           <div><p className="text-[10px] font-black text-gray-400 uppercase">Jurisdiction</p><p className="text-sm font-black">{user.role === UserRole.SCHOOL_USER ? user.schoolName : (user.district && user.district !== 'All' ? `${user.district} District` : 'Division of Isabela')}</p></div>
           <div><p className="text-[10px] font-black text-gray-400 uppercase">Year</p><p className="text-sm font-black">{selectedSchoolYear === 'All' ? 'All Years' : `S.Y. ${selectedSchoolYear}`}</p></div>
           <div><p className="text-[10px] font-black text-gray-400 uppercase">Active Period</p><p className="text-sm font-black uppercase text-blue-600">{activePeriod}</p></div>
           <div><p className="text-[10px] font-black text-gray-400 uppercase">Report Officer</p><p className="text-sm font-black">{user.fullName}</p></div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-6">
          <div className="p-4 bg-blue-50 rounded-2xl text-blue-600"><Users className="w-8 h-8" /></div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Enrollment</p>
            <p className="text-3xl font-black text-gray-900">{filteredData.learners.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-6">
          <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600"><CheckCircle2 className="w-8 h-8" /></div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Tested</p>
            <p className="text-3xl font-black text-gray-900">{totalTested}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-6">
          <div className="p-4 bg-purple-50 rounded-2xl text-purple-600"><TrendingUp className="w-8 h-8" /></div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Completion Rate</p>
            <p className="text-3xl font-black text-gray-900">{filteredData.learners.length > 0 ? Math.round((totalTested / filteredData.learners.length) * 100) : 0}%</p>
          </div>
        </div>
      </div>

      {/* Legislative District Summary Matrices */}
      <div className="space-y-6 no-print">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200">
            <LayoutIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Legislative District Performance Matrix</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Consolidated Domain Distribution per District</p>
          </div>
        </div>
        
        {Object.entries(dataByLD).map(([ld, data]) => (
          (data.learners.length > 0 || data.assessments.length > 0) && (
            <LegislativeDistrictMatrixTable 
              key={ld} 
              ld={ld} 
              ldLearners={data.learners} 
              ldAssessments={data.assessments} 
            />
          )
        ))}
      </div>

      {/* District-wide Matrix Table Section */}
      <div className="bg-white rounded-[40px] border border-gray-200 shadow-sm overflow-hidden no-print">
        <div className="p-8 border-b border-gray-100 flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200">
                 <TableIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight">District-wide Consolidation Matrix</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Institutional Performance Log</p>
              </div>
           </div>
           <div className="flex items-center gap-4">
             {/* Period to view specifically for this Matrix */}
             <div className="flex items-center gap-3 bg-slate-100 px-4 py-2 rounded-xl border border-slate-200">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[10px] font-black text-slate-500 uppercase">View Period:</span>
                <select 
                  value={localMatrixPeriod}
                  onChange={(e) => setLocalMatrixPeriod(e.target.value as any)}
                  className="bg-transparent text-[10px] font-black uppercase text-blue-600 outline-none cursor-pointer"
                >
                  <option value="All">All Transactions</option>
                  {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
             </div>
             <div className="h-8 w-px bg-gray-200"></div>
             <div className="flex items-center gap-3">
               <button onClick={() => { setPreviewType('consolidation'); setTimeout(() => window.print(), 100); }} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">
                  <Printer className="w-4 h-4" /> Direct Print
               </button>
               <button onClick={() => setPreviewType('consolidation')} className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all">
                  <Eye className="w-4 h-4" /> Print Setup
               </button>
             </div>
           </div>
        </div>
        <div className="p-8 bg-gray-50/30">
          <div className="bg-white border border-slate-200 shadow-sm overflow-hidden p-6 rounded-[32px]">
             <ConsolidationMatrixTable />
          </div>
        </div>
      </div>

      {/* Developmental Status Summary Matrix Section */}
      <div className="bg-white rounded-[40px] border border-gray-200 shadow-xl overflow-hidden mt-12 no-print">
        <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-600 rounded-2xl text-white shadow-lg shadow-emerald-200">
                 <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight uppercase">Developmental Status Summary Matrix</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Aggregated Domain Performance (M/F/T)</p>
              </div>
           </div>
           <div className="flex items-center gap-3">
             <button onClick={() => { setPreviewType('summary'); setTimeout(() => window.print(), 100); }} className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200">
                <Printer className="w-4 h-4" /> Direct Print
             </button>
             <button onClick={() => setPreviewType('summary')} className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 no-print">
                <Eye className="w-4 h-4" /> Full Preview
             </button>
           </div>
        </div>
        <div className="p-8 bg-gray-50 overflow-x-auto">
           <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-inner w-fit min-w-full">
              <DetailedMatrixTable />
           </div>
        </div>
      </div>
    </div>
  );
};

export default ReportView;