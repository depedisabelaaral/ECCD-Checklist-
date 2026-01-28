
import React, { useMemo } from 'react';
import { Learner, Assessment, User, UserRole } from '../types';
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
import { Printer, CheckCircle2, TrendingUp, Table as TableIcon } from 'lucide-react';

interface ReportViewProps {
  user: User;
  // Added users to the props to allow looking up school names by schoolId
  users: User[];
  learners: Learner[];
  assessments: Assessment[];
  period?: Assessment['period'] | 'All';
}

const ReportView: React.FC<ReportViewProps> = ({ user, users, learners, assessments, period = 'All' }) => {
  
  const filteredData = useMemo(() => {
    let jLearners = learners;
    if (user.role === UserRole.SCHOOL_USER) {
      jLearners = learners.filter(l => l.schoolId === user.schoolId);
    }
    const jAssessments = assessments.filter(a => 
      jLearners.some(l => l.id === a.learnerId)
    );
    return { learners: jLearners, assessments: jAssessments };
  }, [user, learners, assessments]);

  const calculateAgeNumeric = (birthday: string, refDate: string) => {
    if (!birthday || !refDate) return "0.0";
    const birth = new Date(birthday);
    const ref = new Date(refDate);
    if (isNaN(birth.getTime()) || isNaN(ref.getTime())) return "0.0";
    let years = ref.getFullYear() - birth.getFullYear();
    let months = ref.getMonth() - birth.getMonth();
    if (ref.getDate() < birth.getDate()) months--;
    if (months < 0) {
      years--;
      months += 12;
    }
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
    if (score <= 119) return "Average";
    if (score <= 129) return "Slightly Advanced";
    return "Highly Advanced";
  };

  const calculateMetricsForSchool = (schoolId: string, schoolName: string, p: Assessment['period']) => {
    const schoolLearners = filteredData.learners.filter(l => l.schoolId === schoolId);
    const schoolAssessments = filteredData.assessments.filter(a => 
      a.period === p && schoolLearners.some(l => l.id === a.learnerId)
    );
    
    const metrics = {
      schoolName,
      schoolId,
      period: p,
      enrollment: { m: 0, f: 0 },
      tested: { m: 0, f: 0 },
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
      else if (interp === "Average") metrics.status.average[gender]++;
      else if (interp === "Slightly Advanced") metrics.status.slightlyAdvanced[gender]++;
      else if (interp === "Highly Advanced") metrics.status.highlyAdvanced[gender]++;
    });

    return metrics;
  };

  const schools = useMemo(() => {
    const schoolIds = Array.from(new Set(filteredData.learners.map(l => l.schoolId)));
    return schoolIds.map(id => {
      // Fix: Lookup school name from users list since Learner does not have schoolName
      const u = users.find(usr => usr.schoolId === id);
      const name = user.schoolId === id ? (user.schoolName || id) : (u?.schoolName || id);
      return { id, name };
    });
  }, [filteredData.learners, user, users]);

  const periodsToDisplay = period === 'All' ? PERIODS : [period];
  
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
  }, [schools, periodsToDisplay, filteredData]);

  const chartData = useMemo(() => {
    const summary = {
      significantDelay: 0,
      slightDelay: 0,
      average: 0,
      slightlyAdvanced: 0,
      highlyAdvanced: 0
    };
    reportRows.forEach(row => {
      summary.significantDelay += row.status.significantDelay.m + row.status.significantDelay.f;
      summary.slightDelay += row.status.slightDelay.m + row.status.slightDelay.f;
      summary.average += row.status.average.m + row.status.average.f;
      summary.slightlyAdvanced += row.status.slightlyAdvanced.m + row.status.slightlyAdvanced.f;
      summary.highlyAdvanced += row.status.highlyAdvanced.m + row.status.highlyAdvanced.f;
    });
    return [
      { name: 'Significant Delay', value: summary.significantDelay, fill: '#ef4444' },
      { name: 'Slight Delay', value: summary.slightDelay, fill: '#f59e0b' },
      { name: 'Average', value: summary.average, fill: '#10b981' },
      { name: 'Slightly Adv.', value: summary.slightlyAdvanced, fill: '#3b82f6' },
      { name: 'Highly Adv.', value: summary.highlyAdvanced, fill: '#8b5cf6' }
    ];
  }, [reportRows]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Info */}
      <div className="bg-white p-10 border border-gray-200 rounded-[32px] shadow-sm text-center space-y-2 relative overflow-hidden no-print">
        <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
        <p className="text-sm font-black text-gray-400 uppercase tracking-tighter">Department of Education • Republic of the Philippines</p>
        <h2 className="text-2xl font-black uppercase tracking-tight text-gray-900">
            ECCD Checklist Summary Performance Report
        </h2>
        <div className="flex items-center justify-center gap-2 py-4">
            <span className="px-6 py-2 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-[0.25em] shadow-lg">
                {period === 'All' ? 'CONSOLIDATED MONITORING' : `${period} SUMMARY`}
            </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-6 border-t border-gray-100 mt-4">
           <div className="text-left">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Target Jurisdiction</p>
              <p className="text-sm font-black text-gray-800 tracking-tight">{user.role === UserRole.SCHOOL_USER ? user.schoolName : user.district || 'District Office'}</p>
           </div>
           <div className="text-left">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">School Year</p>
              <p className="text-sm font-black text-gray-800 tracking-tight">2024 - 2025</p>
           </div>
           <div className="text-left">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Data Context</p>
              <p className="text-sm font-black text-gray-800 tracking-tight">Kindergarten Learners</p>
           </div>
           <div className="text-left">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Reporting Officer</p>
              <p className="text-sm font-black text-gray-800 tracking-tight">{user.fullName}</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 no-print">
        <div className="lg:col-span-2 bg-white p-10 rounded-[40px] border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <h3 className="font-black text-gray-900 flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-blue-600" />
              Developmental Status Profile
            </h3>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 'black' }} axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)' }} />
                <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={45}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-10 rounded-[40px] border border-gray-200 shadow-sm space-y-6">
          <h3 className="font-black text-gray-900 flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            Statistical Overview
          </h3>
          <div className="space-y-4">
            <div className="p-6 bg-blue-50 rounded-[24px] border border-blue-100 transition-all hover:shadow-lg">
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Total Enrolled</p>
              <p className="text-4xl font-black text-blue-900">
                {reportRows.reduce((acc, r) => acc + r.enrollment.m + r.enrollment.f, 0)}
              </p>
            </div>
            <div className="p-6 bg-emerald-50 rounded-[24px] border border-emerald-100 transition-all hover:shadow-lg">
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Total Assessed</p>
              <p className="text-4xl font-black text-emerald-900">
                {reportRows.reduce((acc, r) => acc + r.tested.m + r.tested.f, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Matching Image Structure */}
      <div className="bg-white border-2 border-black overflow-hidden shadow-lg">
        <div className="p-4 bg-gray-50 flex items-center justify-between no-print border-b-2 border-black">
            <div className="flex items-center gap-4">
                <TableIcon className="w-6 h-6 text-slate-800" />
                <h3 className="font-black text-gray-900 text-sm uppercase">Consolidated Summary Table</h3>
            </div>
            <button onClick={() => window.print()} className="flex items-center gap-3 px-6 py-2 bg-slate-900 text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all">
                <Printer className="w-4 h-4" /> Print Report
            </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] text-center border-collapse">
            <thead>
              <tr className="border-b-2 border-black bg-white">
                <th className="border-r-2 border-black px-2 py-4 w-10" rowSpan={2}>No.</th>
                <th className="border-r-2 border-black px-4 py-4 min-w-[200px]" rowSpan={2}>School</th>
                <th className="border-r-2 border-black px-4 py-4 min-w-[150px]" rowSpan={2}>Assessment Period</th>
                <th className="border-r-2 border-black px-2 py-4" colSpan={3}>Enrollment</th>
                <th className="border-r-2 border-black px-2 py-4" colSpan={3}>No of Pupils Tested</th>
                <th className="border-r-2 border-black px-2 py-4" colSpan={3}>Significant Delay In Overall Development</th>
                <th className="border-r-2 border-black px-2 py-4" colSpan={3}>Slightly Delay In Overall Development</th>
                <th className="border-r-2 border-black px-2 py-4" colSpan={3}>Average Overall Development</th>
                <th className="border-r-2 border-black px-2 py-4" colSpan={3}>Slightly Advance Development</th>
                <th className="px-2 py-4" colSpan={3}>Highly Advance Development</th>
              </tr>
              <tr className="border-b-2 border-black bg-white font-bold">
                {/* Enrollment */}
                <th className="border-r border-black px-2 py-1 w-8">M</th>
                <th className="border-r border-black px-2 py-1 w-8">F</th>
                <th className="border-r-2 border-black px-2 py-1 w-10 bg-amber-400">T</th>
                {/* Tested */}
                <th className="border-r border-black px-2 py-1 w-8">M</th>
                <th className="border-r border-black px-2 py-1 w-8">F</th>
                <th className="border-r-2 border-black px-2 py-1 w-10 bg-amber-400">T</th>
                {/* Sig Delay */}
                <th className="border-r border-black px-2 py-1 w-8">M</th>
                <th className="border-r border-black px-2 py-1 w-8">F</th>
                <th className="border-r-2 border-black px-2 py-1 w-10 bg-amber-400">T</th>
                {/* Slight Delay */}
                <th className="border-r border-black px-2 py-1 w-8">M</th>
                <th className="border-r border-black px-2 py-1 w-8">F</th>
                <th className="border-r-2 border-black px-2 py-1 w-10 bg-amber-400">T</th>
                {/* Average */}
                <th className="border-r border-black px-2 py-1 w-8">M</th>
                <th className="border-r border-black px-2 py-1 w-8">F</th>
                <th className="border-r-2 border-black px-2 py-1 w-10 bg-amber-400">T</th>
                {/* Slight Advance */}
                <th className="border-r border-black px-2 py-1 w-8">M</th>
                <th className="border-r border-black px-2 py-1 w-8">F</th>
                <th className="border-r-2 border-black px-2 py-1 w-10 bg-amber-400">T</th>
                {/* High Advance */}
                <th className="border-r border-black px-2 py-1 w-8">M</th>
                <th className="border-r border-black px-2 py-1 w-8">F</th>
                <th className="px-2 py-1 w-10 bg-amber-400">T</th>
              </tr>
            </thead>
            <tbody className="divide-y border-b border-black">
              {reportRows.map((row, idx) => (
                <tr key={idx} className="border-b border-black font-semibold text-gray-800">
                  <td className="border-r-2 border-black px-2 py-2">{idx + 1}</td>
                  <td className="border-r-2 border-black px-4 py-2 text-left uppercase font-bold">{row.schoolName}</td>
                  <td className="border-r-2 border-black px-4 py-2 text-left uppercase">{row.period} SUMMARY</td>
                  
                  {/* Enrollment */}
                  <td className="border-r border-black px-2 py-2">{row.enrollment.m}</td>
                  <td className="border-r border-black px-2 py-2">{row.enrollment.f}</td>
                  <td className="border-r-2 border-black px-2 py-2 bg-amber-400 font-black">{row.enrollment.m + row.enrollment.f}</td>
                  
                  {/* Tested */}
                  <td className="border-r border-black px-2 py-2">{row.tested.m}</td>
                  <td className="border-r border-black px-2 py-2">{row.tested.f}</td>
                  <td className="border-r-2 border-black px-2 py-2 bg-amber-400 font-black">{row.tested.m + row.tested.f}</td>
                  
                  {/* Significant Delay */}
                  <td className="border-r border-black px-2 py-2">{row.status.significantDelay.m}</td>
                  <td className="border-r border-black px-2 py-2">{row.status.significantDelay.f}</td>
                  <td className="border-r-2 border-black px-2 py-2 bg-amber-400 font-black">{row.status.significantDelay.m + row.status.significantDelay.f}</td>
                  
                  {/* Slight Delay */}
                  <td className="border-r border-black px-2 py-2">{row.status.slightDelay.m}</td>
                  <td className="border-r border-black px-2 py-2">{row.status.slightDelay.f}</td>
                  <td className="border-r-2 border-black px-2 py-2 bg-amber-400 font-black">{row.status.slightDelay.m + row.status.slightDelay.f}</td>
                  
                  {/* Average */}
                  <td className="border-r border-black px-2 py-2">{row.status.average.m}</td>
                  <td className="border-r border-black px-2 py-2">{row.status.average.f}</td>
                  <td className="border-r-2 border-black px-2 py-2 bg-amber-400 font-black">{row.status.average.m + row.status.average.f}</td>
                  
                  {/* Slightly Advanced */}
                  <td className="border-r border-black px-2 py-2">{row.status.slightlyAdvanced.m}</td>
                  <td className="border-r border-black px-2 py-2">{row.status.slightlyAdvanced.f}</td>
                  <td className="border-r-2 border-black px-2 py-2 bg-amber-400 font-black">{row.status.slightlyAdvanced.m + row.status.slightlyAdvanced.f}</td>
                  
                  {/* Highly Advanced */}
                  <td className="border-r border-black px-2 py-2">{row.status.highlyAdvanced.m}</td>
                  <td className="border-r border-black px-2 py-2">{row.status.highlyAdvanced.f}</td>
                  <td className="px-2 py-2 bg-amber-400 font-black">{row.status.highlyAdvanced.m + row.status.highlyAdvanced.f}</td>
                </tr>
              ))}
              {reportRows.length === 0 && (
                <tr>
                   <td colSpan={24} className="py-24 text-center text-gray-400 font-black uppercase tracking-[0.2em] opacity-40">No Assessment Records Logged for this Selection</td>
                </tr>
              )}
            </tbody>
            {reportRows.length > 0 && (
                <tfoot className="bg-white border-t-2 border-black font-black">
                    <tr className="border-b-2 border-black">
                        <td className="border-r-2 border-black px-4 py-3 text-left uppercase" colSpan={3}>Grand Total</td>
                        {/* Enrollment */}
                        <td className="border-r border-black">{reportRows.reduce((a, r) => a + r.enrollment.m, 0)}</td>
                        <td className="border-r border-black">{reportRows.reduce((a, r) => a + r.enrollment.f, 0)}</td>
                        <td className="border-r-2 border-black bg-amber-400 text-lg">{reportRows.reduce((a, r) => a + r.enrollment.m + r.enrollment.f, 0)}</td>
                        
                        {/* Tested */}
                        <td className="border-r border-black">{reportRows.reduce((a, r) => a + r.tested.m, 0)}</td>
                        <td className="border-r border-black">{reportRows.reduce((a, r) => a + r.tested.f, 0)}</td>
                        <td className="border-r-2 border-black bg-amber-400 text-lg">{reportRows.reduce((a, r) => a + r.tested.m + r.tested.f, 0)}</td>
                        
                        {/* Sig Delay */}
                        <td className="border-r border-black">{reportRows.reduce((a, r) => a + r.status.significantDelay.m, 0)}</td>
                        <td className="border-r border-black">{reportRows.reduce((a, r) => a + r.status.significantDelay.f, 0)}</td>
                        <td className="border-r-2 border-black bg-amber-400 text-lg">{reportRows.reduce((a, r) => a + r.status.significantDelay.m + r.status.significantDelay.f, 0)}</td>
                        
                        {/* Slight Delay */}
                        <td className="border-r border-black">{reportRows.reduce((a, r) => a + r.status.slightDelay.m, 0)}</td>
                        <td className="border-r border-black">{reportRows.reduce((a, r) => a + r.status.slightDelay.f, 0)}</td>
                        <td className="border-r-2 border-black bg-amber-400 text-lg">{reportRows.reduce((a, r) => a + r.status.slightDelay.m + r.status.slightDelay.f, 0)}</td>
                        
                        {/* Average */}
                        <td className="border-r border-black">{reportRows.reduce((a, r) => a + r.status.average.m, 0)}</td>
                        <td className="border-r border-black">{reportRows.reduce((a, r) => a + r.status.average.f, 0)}</td>
                        <td className="border-r-2 border-black bg-amber-400 text-lg">{reportRows.reduce((a, r) => a + r.status.average.m + r.status.average.f, 0)}</td>
                        
                        {/* Slight Advance */}
                        <td className="border-r border-black">{reportRows.reduce((a, r) => a + r.status.slightlyAdvanced.m, 0)}</td>
                        <td className="border-r border-black">{reportRows.reduce((a, r) => a + r.status.slightlyAdvanced.f, 0)}</td>
                        <td className="border-r-2 border-black bg-amber-400 text-lg">{reportRows.reduce((a, r) => a + r.status.slightlyAdvanced.m + r.status.slightlyAdvanced.f, 0)}</td>
                        
                        {/* High Advance */}
                        <td className="border-r border-black">{reportRows.reduce((a, r) => a + r.status.highlyAdvanced.m, 0)}</td>
                        <td className="border-r border-black">{reportRows.reduce((a, r) => a + r.status.highlyAdvanced.f, 0)}</td>
                        <td className="bg-amber-400 text-lg">{reportRows.reduce((a, r) => a + r.status.highlyAdvanced.m + r.status.highlyAdvanced.f, 0)}</td>
                    </tr>
                </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportView;
