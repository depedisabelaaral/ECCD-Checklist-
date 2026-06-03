import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User, Learner, Assessment } from '../types';
import { DOMAINS, PERIODS, ECCD_TASKS } from '../constants';
import { SCALED_SCORE_TABLES, STANDARD_SCORE_TABLE } from '../constants/scaledScores';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer 
} from 'recharts';
import { Printer, X, CheckCircle2, Maximize, File, Layout as LayoutIcon, Search, CheckSquare, Square, UserCheck, ClipboardList, ChevronRight, Download, Loader2, FileDown, Users } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ECCDCardProps {
  user: User;
  learner: Learner;
  allLearners: Learner[];
  onSelectLearner: (l: Learner) => void;
  assessments: Assessment[];
  onClose?: () => void;
}

interface PrintSettings {
  paperSize: 'A4' | 'Letter' | 'Legal';
  margin: 'none' | 'narrow' | 'normal' | 'custom';
  customMargin: number;
  scale: number;
  layout: 'landscape' | 'portrait';
}

const getAutomaticSchoolYear = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  if (currentMonth >= 4) return `${currentYear}-${currentYear + 1}`;
  return `${currentYear - 1}-${currentYear}`;
};

const ECCDCard: React.FC<ECCDCardProps> = ({ user, learner, allLearners, onSelectLearner, assessments, onClose }) => {
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedPages, setSelectedPages] = useState<number[]>([1, 2, 3, 4]);
  const [visibleAssessments, setVisibleAssessments] = useState<string[]>([...PERIODS]);
  const [learnerSearch, setLearnerSearch] = useState('');
  
  // PDF Generation States
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 });
  const [pdfCaptureLearner, setPdfCaptureLearner] = useState<Learner | null>(null);
  
  const pdfRef = useRef<HTMLDivElement>(null);
  
  const USER_FORM_LOGO_KEY = `branding_form_logo_${user.id}`;
  const DEPED_LOGO_KEY = 'branding_deped_logo';
  
  const [formBranding, setFormBranding] = useState({
    schoolLogo: localStorage.getItem(USER_FORM_LOGO_KEY) || '',
    depedLogo: localStorage.getItem(DEPED_LOGO_KEY) || 'eccd.jpg'
  });

  useEffect(() => {
    const handleLogoUpdate = () => {
      setFormBranding({
        schoolLogo: localStorage.getItem(USER_FORM_LOGO_KEY) || '',
        depedLogo: localStorage.getItem(DEPED_LOGO_KEY) || 'eccd.jpg'
      });
    };
    window.addEventListener('branding_user_logo_updated', handleLogoUpdate);
    return () => window.removeEventListener('branding_user_logo_updated', handleLogoUpdate);
  }, [user.id]);

  const [printSettings, setPrintSettings] = useState<PrintSettings>({
    paperSize: 'A4',
    margin: 'narrow',
    customMargin: 0.15,
    scale: 100,
    layout: 'landscape'
  });

  const toggleAllPages = () => {
    setSelectedPages(selectedPages.length === 4 ? [] : [1, 2, 3, 4]);
  };

  const togglePageSelection = (page: number) => {
    setSelectedPages(prev => 
      prev.includes(page) ? prev.filter(p => p !== page) : [...prev, page]
    );
  };

  const toggleAssessmentVisibility = (period: string) => {
    setVisibleAssessments(prev => 
      prev.includes(period) ? prev.filter(p => p !== period) : [...prev, period]
    );
  };

  const assessedLearners = useMemo(() => {
    return allLearners.filter(l => assessments.some(a => a.learnerId === l.id));
  }, [allLearners, assessments]);

  const filteredLearners = useMemo(() => {
    return assessedLearners.filter(l => 
      l.name.toLowerCase().includes(learnerSearch.toLowerCase()) || 
      l.lrn.includes(learnerSearch)
    );
  }, [assessedLearners, learnerSearch]);

  const getAssessmentForLearner = (l: Learner, p: string) => {
    if (!visibleAssessments.includes(p)) return undefined;
    return assessments.filter(a => a.learnerId === l.id).find(a => a.period === p);
  };

  const brandingLabels = {
    schoolName: user.schoolName || 'DISTRICT ELEMENTARY SCHOOL',
    district: user.district || 'SAN MARIANO I DISTRICT',
    legislativeDistrict: user.legislativeDistrict || 'REGION II - CAGAYAN VALLEY'
  };

  const calculateAgeDetails = (birthday: string, refDate: string) => {
    if (!birthday || !refDate || refDate === '---') return { y: '-', m: '-', d: '-' };
    const b = new Date(birthday);
    const r = new Date(refDate);
    if (isNaN(b.getTime()) || isNaN(r.getTime())) return { y: '-', m: '-', d: '-' };
    
    let y = r.getFullYear() - b.getFullYear();
    let m = r.getMonth() - b.getMonth();
    let d = r.getDate() - b.getDate();
    
    if (d < 0) { m--; d += 30; }
    if (m < 0) { y--; m += 12; }
    
    return { y, m, d };
  };

  const getScaledScore = (domainId: string, raw: number, birthday: string, refDate: string) => {
    const age = calculateAgeDetails(birthday, refDate);
    if (age.y === '-') return 0;
    const ageNum = parseFloat(`${age.y}.${age.m}`);
    let tableKey = "";
    if (ageNum >= 3.1 && ageNum <= 4.0) tableKey = '3.1-4.0';
    else if (ageNum >= 4.1 && ageNum <= 5.0) tableKey = '4.1-5.0';
    else if (ageNum >= 5.1) tableKey = '5.1-above';
    else return 0;
    return SCALED_SCORE_TABLE_LOOKUP(tableKey, domainId, raw);
  };

  const SCALED_SCORE_TABLE_LOOKUP = (tableKey: string, domainId: string, raw: number) => {
      return SCALED_SCORE_TABLES[tableKey]?.[domainId]?.[raw] ?? 0;
  };

  const getStandardScore = (a: Assessment, l: Learner) => {
    let totalScaled = 0;
    DOMAINS.forEach(d => {
      totalScaled += getScaledScore(d.id, (a.scores as any)[d.id], l.birthday, a.date);
    });
    if (totalScaled < 29) return 37;
    if (totalScaled > 98) return 138;
    return STANDARD_SCORE_TABLE[totalScaled] || 0;
  };

  const getInterpretation = (score: number) => {
    if (score === 0) return "";
    if (score <= 69) return "Significant Delay";
    if (score <= 79) return "Slight Delay";
    if (score <= 119) return "Average";
    if (score <= 129) return "Slightly Adv.";
    return "Highly Adv.";
  };

  const renderPageHeader = () => (
    <div className="flex justify-center items-center gap-4 mb-1 px-6 text-center shrink-0">
      <div className="w-[53px] h-[53px] flex items-center justify-center shrink-0">
         <img src={formBranding.depedLogo} alt="DepEd" className="max-h-full object-contain" onError={(e) => e.currentTarget.src='eccd.jpg'} />
      </div>
      <div className="text-[8.4pt]">
        <p className="uppercase leading-tight font-medium">Republic of the Philippines</p>
        <p className="text-[10.2pt] font-black uppercase leading-tight">Department of Education</p>
        <p className="text-[8.4pt] uppercase italic leading-tight">{brandingLabels.legislativeDistrict}</p>
        <p className="text-[8.4pt] uppercase leading-tight">SCHOOLS DIVISION OF ISABELA</p>
        <p className="text-[8.8pt] font-black mt-0.5 uppercase leading-none">{brandingLabels.district}</p>
        <p className="text-[10pt] font-black mt-0.5 uppercase leading-none whitespace-nowrap">EARLY CHILDHOOD CARE AND DEVELOPMENT CHECKLIST</p>
        <p className="text-[9pt] font-black mt-0.5 uppercase leading-none text-slate-500 text-center md:text-left">
          School Year: {learner.schoolYear || user.schoolYear || getAutomaticSchoolYear()}
        </p>
      </div>
      <div className="w-[53px] h-[53px] flex items-center justify-center shrink-0">
         {formBranding.schoolLogo ? (
           <img src={formBranding.schoolLogo} alt="School" className="max-h-full object-contain" />
         ) : (
           <div className="w-full h-full border border-dashed border-gray-300 rounded flex items-center justify-center text-[6px] text-gray-300 leading-none font-black uppercase">SCHOOL<br/>LOGO</div>
         )}
      </div>
    </div>
  );

  const renderChecklistTable = (params: { 
    domainId: string, 
    title: string, 
    items: string[],
    targetLearner: Learner,
    startIdx?: number,
    showSummary?: boolean,
    size?: 'small' | 'normal' | 'large' | 'xlarge' | 'page4',
    rowHeightOverride?: string
  }) => {
    const { domainId, title, items, targetLearner, startIdx = 0, showSummary = true, size = 'normal', rowHeightOverride } = params;
    const a1 = getAssessmentForLearner(targetLearner, 'FIRST ASSESSMENT');
    const a2 = getAssessmentForLearner(targetLearner, 'MID-ASSESSMENT');
    const a3 = getAssessmentForLearner(targetLearner, 'THIRD ASSESSMENT');

    let headerSize, dataSize, rowHeight, colWidth, commentWidth;
    switch(size) {
        case 'small':
            headerSize = 'text-[7pt]'; dataSize = 'text-[6.8pt]'; rowHeight = 'h-[19.53px]'; colWidth = 'w-6'; commentWidth = 'w-17';
            break;
        case 'page4':
            headerSize = 'text-[7.5pt]'; dataSize = 'text-[7pt]'; rowHeight = 'h-[23.94px]'; colWidth = 'w-9'; commentWidth = 'w-24';
            break;
        case 'xlarge':
            headerSize = 'text-[11pt]'; dataSize = 'text-[10pt]'; rowHeight = 'h-[35.28px]'; colWidth = 'w-12'; commentWidth = 'w-34';
            break;
        case 'large':
            headerSize = 'text-[9.2pt]'; dataSize = 'text-[8.5pt]'; rowHeight = 'h-[30.24px]'; colWidth = 'w-10'; commentWidth = 'w-29';
            break;
        default: // normal
            headerSize = 'text-[8.5pt]'; dataSize = 'text-[8pt]'; rowHeight = 'h-[23.94px]'; colWidth = 'w-9'; commentWidth = 'w-24';
    }

    const finalRowHeight = rowHeightOverride || rowHeight;

    return (
      <div className="mb-1 w-full overflow-hidden">
        <table className="eccd-official-table w-full border-collapse border border-black">
          <thead>
            <tr className="bg-gray-100 font-black">
              <th className={`px-1 py-0.5 text-left uppercase border border-black ${headerSize}`}>{title}</th>
              <th className={`border border-black ${colWidth} py-0.5 ${dataSize}`}>1<sup>ST</sup></th>
              <th className={`border border-black ${colWidth} py-0.5 ${dataSize}`}>2<sup>ND</sup></th>
              <th className={`border border-black ${colWidth} py-0.5 ${dataSize}`}>3<sup>RD</sup></th>
              <th className={`border border-black ${commentWidth} py-0.5 uppercase ${dataSize}`}>Comments</th>
            </tr>
          </thead>
          <tbody>
            {items.map((task, idx) => {
              const currentTaskIdx = startIdx + idx;
              let activeRowHeight = finalRowHeight;
              if (domainId === 'socioEmotional' && size === 'page4' && currentTaskIdx >= 2 && currentTaskIdx <= 6) {
                  activeRowHeight = 'h-[23.5px]';
              }

              return (
                <tr key={idx} className={`${activeRowHeight} border-b border-black`}>
                  <td className={`px-1 border-r border-black ${dataSize} leading-tight font-medium`}>{currentTaskIdx + 1}. {task}</td>
                  <td className={`border-r border-black text-center font-bold ${dataSize}`}>{a1 ? (a1.checklist?.[domainId]?.[currentTaskIdx] ? '✓' : '--') : ''}</td>
                  <td className={`border-r border-black text-center font-bold ${dataSize}`}>{a2 ? (a2.checklist?.[domainId]?.[currentTaskIdx] ? '✓' : '--') : ''}</td>
                  <td className={`border-r border-black text-center font-bold ${dataSize}`}>{a3 ? (a3.checklist?.[domainId]?.[currentTaskIdx] ? '✓' : '--') : ''}</td>
                  <td className="px-1 border-r border-black"></td>
                </tr>
              );
            })}
            {showSummary && (
              <tr className={`bg-gray-50 font-black uppercase h-[25.2px] border-b border-black`}>
                <td className={`px-1 border-r border-black text-right text-[7pt]`}>KABUUANG ISKOR</td>
                <td className={`border-r border-black text-center ${dataSize}`}>{a1 ? (a1.scores as any)[domainId] : ''}</td>
                <td className={`border-r border-black text-center ${dataSize}`}>{a2 ? (a2.scores as any)[domainId] : ''}</td>
                <td className={`border-r border-black text-center ${dataSize}`}>{a3 ? (a3.scores as any)[domainId] : ''}</td>
                <td className="px-1"></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const renderSummaryChart = (targetLearner: Learner, assessment: Assessment | undefined, title: string) => {
    const data = DOMAINS.map(d => ({
        name: d.label.split(' ')[0].toUpperCase(),
        scaled: assessment ? getScaledScore(d.id, (assessment.scores as any)[d.id], targetLearner.birthday, assessment.date) : 0,
        raw: assessment ? (assessment.scores as any)[d.id] : 0
    })).reverse();

    return (
      <div className="h-[210px] w-full flex flex-col items-center">
        <p className="text-[9.5pt] font-black uppercase mb-1 text-slate-700 tracking-tight text-center">{title}</p>
        <div className="flex-1 w-full px-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 0, right: 15, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
              <XAxis type="number" domain={[0, 140]} hide />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 8.4, fontWeight: 'bold', fill: '#475569' }} width={95} />
              <Bar dataKey="scaled" fill="#64748b" barSize={8} radius={[0, 2, 2, 0]} />
              <Bar dataKey="raw" fill="#ea580c" barSize={8} radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex gap-4 justify-center mt-1 pb-2">
          <span className="flex items-center gap-1.5 text-[7.5pt] font-bold text-slate-600">
            <div className="w-2.5 h-2.5 bg-slate-500 rounded-sm"></div> Scaled Score
          </span>
          <span className="flex items-center gap-1.5 text-[7.5pt] font-bold text-slate-600">
            <div className="w-2.5 h-2.5 bg-orange-600 rounded-sm"></div> Raw Score
          </span>
        </div>
      </div>
    );
  };

  const renderPage1 = (targetLearner: Learner) => {
    const a1 = getAssessmentForLearner(targetLearner, 'FIRST ASSESSMENT');
    const a2 = getAssessmentForLearner(targetLearner, 'MID-ASSESSMENT');
    const a3 = getAssessmentForLearner(targetLearner, 'THIRD ASSESSMENT');

    const score1 = a1 ? getStandardScore(a1, targetLearner) : 0;
    const score2 = a2 ? getStandardScore(a2, targetLearner) : 0;
    const score3 = a3 ? getStandardScore(a3, targetLearner) : 0;

    return (
      <div className="eccd-official-page flex flex-col relative print-page-1 border border-black/10 bg-white" key={`p1-${targetLearner.id}`}>
        <div className="absolute left-1/2 top-0 bottom-0 w-px border-l border-dashed border-gray-300 -translate-x-1/2 pointer-events-none z-0"></div>
        <div className="grid grid-cols-2 gap-3 flex-1 relative z-10 p-0">
          <div className="space-y-4">
            <div>
              <p className="text-[11.8pt] font-black uppercase mb-1 text-center">INTERPRETATION OF THE SCALED SCORES</p>
              <table className="eccd-official-table thick-border-table text-[9pt]">
                <tbody>
                  <tr><td className="w-12 text-center font-bold whitespace-nowrap">1-3</td><td className="whitespace-nowrap">Suggest Significant Delay in Overall Development</td></tr>
                  <tr><td className="text-center font-bold whitespace-nowrap">4-6</td><td className="whitespace-nowrap">Suggest Slight Delay in Overall Development</td></tr>
                  <tr><td className="text-center font-bold whitespace-nowrap">7-13</td><td className="whitespace-nowrap">Average Overall Development</td></tr>
                  <tr><td className="text-center font-bold whitespace-nowrap">14-16</td><td className="whitespace-nowrap">Suggest Slightly Advanced Development</td></tr>
                  <tr><td className="text-center font-bold whitespace-nowrap">17-19</td><td className="whitespace-nowrap">Suggest Highly Advanced Development</td></tr>
                </tbody>
              </table>
            </div>
            <div>
              <p className="text-[11.8pt] font-black uppercase mb-1 text-center">INTERPRETATION OF STANDARD SCORE</p>
              <table className="eccd-official-table thick-border-table text-[9pt]">
                <tbody>
                  <tr><td className="w-24 text-center font-bold whitespace-nowrap">69 AND BELOW</td><td className="whitespace-nowrap">Suggest Significant Delay in Overall Development</td></tr>
                  <tr><td className="text-center font-bold whitespace-nowrap">70 - 79</td><td className="whitespace-nowrap">Suggest Slight Delay in Overall Development</td></tr>
                  <tr><td className="text-center font-bold whitespace-nowrap">80 - 119</td><td className="whitespace-nowrap">Average Overall Development</td></tr>
                  <tr><td className="text-center font-bold whitespace-nowrap">120 - 129</td><td className="whitespace-nowrap">Suggests Slightly Advanced Development</td></tr>
                  <tr><td className="text-center font-bold whitespace-nowrap">130 AND ABOVE</td><td className="whitespace-nowrap">Suggest Highly Advanced Development</td></tr>
                </tbody>
              </table>
            </div>
            <div>
              <p className="text-[12.4pt] font-black uppercase mb-1 text-center bg-gray-100 py-0.5 border-2 border-black">SUMMARY OF RESULTS</p>
              <table className="eccd-official-table thick-border-table text-[8.8pt] font-bold">
                <thead>
                  <tr className="bg-gray-50 uppercase text-[7.5pt]">
                    <th rowSpan={2} className="w-24">DOMAIN</th>
                    <th colSpan={2}>1ST<br/>ASSESSMENT</th>
                    <th colSpan={2}>2ND<br/>ASSESSMENT</th>
                    <th colSpan={2}>3RD<br/>ASSESSMENT</th>
                  </tr>
                  <tr className="bg-gray-50 text-[7pt]">
                    <th className="w-6">Raw</th><th className="w-6">Scaled</th>
                    <th className="w-6">Raw</th><th className="w-6">Scaled</th>
                    <th className="w-6">Raw</th><th className="w-6">Scaled</th>
                  </tr>
                </thead>
                <tbody>
                  {DOMAINS.map(d => (
                    <tr key={d.id} className="h-5">
                      <td className="px-1 uppercase text-[7.5pt]">{d.label.toUpperCase()}</td>
                      <td className="text-center">{a1 ? (a1.scores as any)[d.id] : ''}</td>
                      <td className="text-center">{a1 ? getScaledScore(d.id, (a1.scores as any)[d.id], targetLearner.birthday, a1.date) : ''}</td>
                      <td className="text-center">{a2 ? (a2.scores as any)[d.id] : ''}</td>
                      <td className="text-center">{a2 ? getScaledScore(d.id, (a2.scores as any)[d.id], targetLearner.birthday, a2.date) : ''}</td>
                      <td className="text-center">{a3 ? (a3.scores as any)[d.id] : ''}</td>
                      <td className="text-center">{a3 ? getScaledScore(d.id, (a3.scores as any)[d.id], targetLearner.birthday, a3.date) : ''}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 h-6 text-[8.5pt] uppercase">
                    <td>SUM OF SCALED SCORE</td>
                    <td colSpan={2} className="text-center font-black">
                      {(() => {
                        if (!a1) return '';
                        let sum = 0;
                        DOMAINS.forEach(d => { sum += getScaledScore(d.id, (a1.scores as any)[d.id], targetLearner.birthday, a1.date); });
                        return sum;
                      })()}
                    </td>
                    <td colSpan={2} className="text-center font-black">
                      {(() => {
                        if (!a2) return '';
                        let sum = 0;
                        DOMAINS.forEach(d => { sum += getScaledScore(d.id, (a2.scores as any)[d.id], targetLearner.birthday, a2.date); });
                        return sum;
                      })()}
                    </td>
                    <td colSpan={2} className="text-center font-black">
                      {(() => {
                        if (!a3) return '';
                        let sum = 0;
                        DOMAINS.forEach(d => { sum += getScaledScore(d.id, (a3.scores as any)[d.id], targetLearner.birthday, a3.date); });
                        return sum;
                      })()}
                    </td>
                  </tr>
                  <tr className="bg-gray-100 font-black h-16">
                    <td className="text-[9.2pt]">STANDARD SCORE<br/><span className="text-[8pt] font-normal lowercase opacity-60">Interpretation</span></td>
                    <td colSpan={2} className="text-center">
                      <div className="flex flex-col items-center justify-center leading-tight">
                        <span className="text-[11pt]">{a1 ? score1 : ''}</span>
                        <span className="text-[7pt] font-bold text-blue-700 uppercase mt-1">{a1 ? getInterpretation(score1) : ''}</span>
                      </div>
                    </td>
                    <td colSpan={2} className="text-center">
                      <div className="flex flex-col items-center justify-center leading-tight">
                        <span className="text-[11pt]">{a2 ? score2 : ''}</span>
                        <span className="text-[7pt] font-bold text-blue-700 uppercase mt-1">{a2 ? getInterpretation(score2) : ''}</span>
                      </div>
                    </td>
                    <td colSpan={2} className="text-center">
                      <div className="flex flex-col items-center justify-center leading-tight">
                        <span className="text-[11pt]">{a3 ? score3 : ''}</span>
                        <span className="text-[7pt] font-bold text-blue-700 uppercase mt-1">{a3 ? getInterpretation(score3) : ''}</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-end pt-8 text-[10pt] font-black uppercase">
                <div className="text-center">
                    <p className="font-normal lowercase text-[9.3pt] mb-8">PREPARED BY:</p>
                    <span className="border-t border-black pt-1 px-4 min-w-[150px] inline-block">{user.fullName || 'EXAMINER'}</span>
                </div>
                <div className="text-center">
                    <p className="font-normal lowercase text-[9.3pt] mb-8">NOTED:</p>
                    <span className="border-t border-black pt-1 px-4 min-w-[150px] inline-block">{user.schoolHeadName || 'SCHOOL HEAD'}</span>
                </div>
            </div>
          </div>

          <div className="space-y-4">
            {renderPageHeader()}
            <p className="text-[10.1pt] font-black uppercase text-center bg-gray-100 py-0.5 border border-black">SOCIODEMOGRAPHIC PROFILE</p>
            
            <div className="border border-black text-[7.5pt] divide-y divide-black">
              <div className="flex divide-x divide-black h-8 items-center">
                <div className="w-1/2 px-2">
                  <span className="text-[7pt] font-bold block leading-none text-gray-500">LEARNERS REFERENCE NUMBER (LRN):</span>
                  <span className="font-black text-blue-800 text-[10pt]">{targetLearner.lrn}</span>
                </div>
                <div className="w-1/2 px-2">
                  <span className="text-[7pt] font-bold block leading-none text-gray-500">REGISTRATION STATUS:</span>
                  <span className="font-black text-[9pt] uppercase">{targetLearner.status}</span>
                </div>
              </div>

              <div className="flex divide-x divide-black h-10 items-center">
                <div className="flex-1 px-2">
                  <span className="text-[7pt] font-bold block leading-none text-gray-500">CHILD'S NAME (LAST NAME, FIRST NAME, M.I.):</span>
                  <span className="font-black uppercase text-[10.5pt]">{targetLearner.name}</span>
                </div>
                <div className="w-24 px-2 text-center">
                  <span className="text-[7pt] font-bold block leading-none text-gray-500">SEX:</span>
                  <span className="font-black uppercase text-[10pt]">{targetLearner.gender}</span>
                </div>
              </div>

              <div className="flex divide-x divide-black h-10 items-center">
                <div className="w-1/3 px-2">
                  <span className="text-[7pt] font-bold block leading-none text-gray-500">DATE OF BIRTH:</span>
                  <span className="font-black text-[9.5pt]">{targetLearner.birthday}</span>
                </div>
                <div className="flex-1 px-2">
                  <span className="text-[7pt] font-bold block leading-none text-gray-500">CHILD'S HANDEDNESS (CHECK ONE):</span>
                  <div className="flex items-center gap-4 mt-1 font-bold text-[8.5pt]">
                    <span className="flex items-center gap-1">{targetLearner.handedness === 'Right' ? '☑' : '☐'} RIGHT</span>
                    <span className="flex items-center gap-1">{targetLearner.handedness === 'Left' ? '☑' : '☐'} LEFT</span>
                    <span className="flex items-center gap-1">{targetLearner.handedness === 'Both' ? '☑' : '☐'} AMBI.</span>
                  </div>
                </div>
              </div>

              <div className="h-9 px-2 flex flex-col justify-center">
                <span className="text-[7pt] font-bold block leading-none text-gray-500">RESIDENTIAL ADDRESS:</span>
                <span className="font-black uppercase truncate text-[9pt]">{targetLearner.address}</span>
              </div>

              <div className="h-8 px-2 flex flex-col justify-center">
                <span className="text-[7pt] font-bold block leading-none text-gray-500">FATHER'S FULL NAME:</span>
                <span className="font-black uppercase truncate block text-[9.5pt]">{targetLearner.fathersName}</span>
              </div>

              <div className="flex divide-x divide-black h-8 items-center">
                <div className="w-1/2 px-2">
                  <span className="text-[7pt] font-bold block leading-none text-gray-500">OCCUPATION:</span>
                  <span className="font-black uppercase truncate block text-[9pt]">{targetLearner.fathersOccupation || '---'}</span>
                </div>
                <div className="w-1/2 px-2">
                  <span className="text-[7pt] font-bold block leading-none text-gray-500">EDUCATIONAL ATTAINMENT:</span>
                  <span className="font-black uppercase truncate block text-[9pt]">{targetLearner.fathersEducation || '---'}</span>
                </div>
              </div>

              <div className="h-8 px-2 flex flex-col justify-center">
                <span className="text-[7pt] font-bold block leading-none text-gray-500">MOTHER'S FULL NAME (MAIDEN NAME):</span>
                <span className="font-black uppercase truncate block text-[9.5pt]">{targetLearner.mothersName}</span>
              </div>

              <div className="flex divide-x divide-black h-8 items-center">
                <div className="w-1/2 px-2">
                  <span className="text-[7pt] font-bold block leading-none text-gray-500">OCCUPATION:</span>
                  <span className="font-black uppercase truncate block text-[9pt]">{targetLearner.mothersOccupation || '---'}</span>
                </div>
                <div className="w-1/2 px-2">
                  <span className="text-[7pt] font-bold block leading-none text-gray-500">EDUCATIONAL ATTAINMENT:</span>
                  <span className="font-black uppercase truncate block text-[9pt]">{targetLearner.mothersEducation || '---'}</span>
                </div>
              </div>

              <div className="flex divide-x divide-black h-8 items-center">
                <div className="w-1/2 px-2">
                  <span className="text-[7pt] font-bold block leading-none text-gray-500">NUMBER OF SIBLINGS:</span>
                  <span className="font-black text-[10pt]">{targetLearner.numSiblings}</span>
                </div>
                <div className="w-1/2 px-2">
                  <span className="text-[7pt] font-bold block leading-none text-gray-500">BIRTH ORDER:</span>
                  <span className="font-black text-[10pt] uppercase">{targetLearner.birthOrder}</span>
                </div>
              </div>
            </div>

            <p className="text-[10.1pt] font-black uppercase text-center mt-2 bg-gray-100 py-0.5 border border-black">COMPUTATION OF CHILD’S AGE</p>
            <table className="eccd-official-table text-[8.5pt] text-center uppercase">
              <thead><tr className="bg-gray-50 h-5"><th className="w-24"></th><th className="w-20"></th><th>YEAR</th><th>MONTH</th><th>DAY</th><th className="w-32">Examiner’s Name</th></tr></thead>
              <tbody>
                {PERIODS.map((pLabel) => {
                  const ast = getAssessmentForLearner(targetLearner, pLabel);
                  const age = ast ? calculateAgeDetails(targetLearner.birthday, ast.date) : { y: '', m: '', d: '' };
                  const displayP = pLabel.split(' ')[0];
                  return (
                    <React.Fragment key={pLabel}>
                      <tr className="h-5.5">
                        <td rowSpan={3} className="font-black bg-gray-50 text-[7.8pt] leading-tight border border-black">{displayP} EVALUATION</td>
                        <td className="bg-gray-50 font-bold text-[7pt] border border-black">Date Tested</td>
                        <td className="font-black border border-black">{ast?.date.split('-')[0] || ''}</td>
                        <td className="font-black border border-black">{ast?.date.split('-')[1] || ''}</td>
                        <td className="font-black border border-black">{ast?.date.split('-')[2] || ''}</td>
                        <td rowSpan={3} className="text-[8.9pt] font-black border border-black">{user.fullName}</td>
                      </tr>
                      <tr className="h-5.5">
                        <td className="bg-gray-50 font-bold text-[7pt] border border-black">Child’s Date of Birth</td>
                        <td className="font-black border border-black">{targetLearner.birthday.split('-')[0]}</td>
                        <td className="font-black border border-black">{targetLearner.birthday.split('-')[1]}</td>
                        <td className="font-black border border-black">{targetLearner.birthday.split('-')[2]}</td>
                      </tr>
                      <tr className="h-5.5">
                        <td className="bg-gray-50 font-black text-[6.5pt] border border-black">Child’s Age</td>
                        <td className="font-black border border-black">{age.y}</td>
                        <td className="font-black border border-black">{age.m}</td>
                        <td className="font-black border border-black">{age.d}</td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderPage2 = (targetLearner: Learner) => (
    <div className="eccd-official-page flex relative print-page-2 border border-black/10 bg-white" key={`p2-${targetLearner.id}`}>
      <div className="absolute left-1/2 top-0 bottom-0 w-px border-l border-dashed border-gray-300 -translate-x-1/2 pointer-events-none z-0"></div>
      <div className="w-1/2 pr-1 border-r border-gray-100 relative z-10 overflow-hidden flex flex-col justify-start">
         {renderChecklistTable({ domainId: "grossMotor", title: "GROSS MOTOR DOMAIN", items: ECCD_TASKS.grossMotor, targetLearner, size: "normal", rowHeightOverride: "h-[31.11px]" })}
         {renderChecklistTable({ domainId: "fineMotor", title: "FINE MOTOR DOMAIN", items: ECCD_TASKS.fineMotor.slice(0, 8), targetLearner, size: "normal", rowHeightOverride: "h-[31.11px]" })}
      </div>
      <div className="w-1/2 pl-1 py-2 relative z-10 overflow-hidden flex flex-col justify-between">
         {renderSummaryChart(targetLearner, getAssessmentForLearner(targetLearner, 'FIRST ASSESSMENT'), "1ST ASSESSMENT PERFORMANCE")}
         {renderSummaryChart(targetLearner, getAssessmentForLearner(targetLearner, 'MID-ASSESSMENT'), "2ND ASSESSMENT PERFORMANCE")}
         {renderSummaryChart(targetLearner, getAssessmentForLearner(targetLearner, 'THIRD ASSESSMENT'), "3RD ASSESSMENT PERFORMANCE")}
      </div>
    </div>
  );

  const renderPage3 = (targetLearner: Learner) => (
    <div className="eccd-official-page flex relative print-page-3 border border-black/10 bg-white" key={`p3-${targetLearner.id}`}>
      <div className="absolute left-1/2 top-0 bottom-0 w-px border-l border-dashed border-gray-300 -translate-x-1/2 pointer-events-none z-0"></div>
      <div className="w-1/2 pr-1 border-r border-gray-100 relative z-10 overflow-hidden flex flex-col justify-start">
         {renderChecklistTable({ domainId: "selfHelp", title: "SELF-HELP DOMAIN (Part 2)", items: ECCD_TASKS.selfHelp.slice(18, 27), startIdx: 18, targetLearner, size: "small", rowHeightOverride: "h-[28.12px]" })}
         {renderChecklistTable({ domainId: "receptiveLanguage", title: "RECEPTIVE LANGUAGE DOMAIN", items: ECCD_TASKS.receptiveLanguage, targetLearner, size: "small", rowHeightOverride: "h-[28.12px]" })}
         {renderChecklistTable({ domainId: "expressiveLanguage", title: "EXPRESSIVE LANGUAGE DOMAIN", items: ECCD_TASKS.expressiveLanguage, targetLearner, size: "small", rowHeightOverride: "h-[28.12px]" })}
      </div>
      <div className="w-1/2 pl-1 pt-1 relative z-10 overflow-hidden flex flex-col justify-start">
         {renderChecklistTable({ domainId: "cognitive", title: "COGNITIVE DOMAIN", items: ECCD_TASKS.cognitive, targetLearner, size: "small", rowHeightOverride: "h-[28.12px]" })}
         {renderChecklistTable({ domainId: "socioEmotional", title: "SOCIAL-EMOTIONAL DOMAIN (Part 1)", items: ECCD_TASKS.socioEmotional.slice(0, 2), showSummary: false, targetLearner, size: "small", rowHeightOverride: "h-[30.09px]" })}
      </div>
    </div>
  );

  const renderPage4 = (targetLearner: Learner) => (
    <div className="eccd-official-page flex relative print-page-4 border border-black/10 bg-white" key={`p4-${targetLearner.id}`}>
      <div className="absolute left-1/2 top-0 bottom-0 w-px border-l border-dashed border-gray-300 -translate-x-1/2 pointer-events-none z-0"></div>
      <div className="w-1/2 pr-1 border-r border-gray-100 relative z-10 overflow-hidden flex flex-col justify-start">
         {renderChecklistTable({ domainId: "socioEmotional", title: "EMOTIONAL DOMAIN", items: ECCD_TASKS.socioEmotional.slice(2, 24), startIdx: 2, targetLearner, size: "page4", rowHeightOverride: "h-[32.4px]" })}
      </div>
      <div className="w-1/2 pl-1 pt-1 relative z-10 overflow-hidden flex flex-col justify-start">
         {renderChecklistTable({ domainId: "fineMotor", title: "FINE MOTOR continuation", items: ECCD_TASKS.fineMotor.slice(8, 11), startIdx: 8, targetLearner, size: "page4", showSummary: false, rowHeightOverride: "h-[32.4px]" })}
         {renderChecklistTable({ domainId: "selfHelp", title: "SELF-HELP DOMAIN (Part 1)", items: ECCD_TASKS.selfHelp.slice(0, 18), showSummary: false, targetLearner, size: "page4", rowHeightOverride: "h-[32.4px]" })}
      </div>
    </div>
  );

  const downloadAllAsPDF = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    setDownloadProgress({ current: 0, total: assessedLearners.length });

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const canvasOptions = {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      // Force consistent pixel dimensions to prevent responsive layout shifts
      windowWidth: 1123, 
      windowHeight: 794
    };

    try {
      for (let i = 0; i < assessedLearners.length; i++) {
        const l = assessedLearners[i];
        setDownloadProgress({ current: i + 1, total: assessedLearners.length });
        
        // Update temporary renderer state
        setPdfCaptureLearner(l);
        
        // Wait for React to re-render the capture area for this learner
        await new Promise(resolve => setTimeout(resolve, 150)); 

        const captureArea = pdfRef.current;
        if (!captureArea) continue;

        const pages = captureArea.querySelectorAll('.eccd-official-page');
        for (let k = 0; k < pages.length; k++) {
          const canvas = await html2canvas(pages[k] as HTMLElement, canvasOptions);
          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          
          if (i === 0 && k === 0) {
            // First page of first learner, no need to add page
          } else {
            doc.addPage();
          }
          doc.addImage(imgData, 'JPEG', 0, 0, 297, 210);
        }
      }

      doc.save(`ECCD_Cards_Export_${new Date().getTime()}.pdf`);
    } catch (error) {
      console.error("PDF Export Error:", error);
      alert("Failed to generate PDF. Please try a smaller batch of learners.");
    } finally {
      setIsDownloading(false);
      setPdfCaptureLearner(null);
    }
  };

  const getMarginValue = () => {
    switch(printSettings.margin) {
      case 'none': return 0;
      case 'narrow': return 0.15;
      case 'normal': return 0.35;
      default: return 0.15;
    }
  };

  return (
    <div className="bg-slate-200 py-6 flex flex-col gap-6 items-center min-h-screen print-root-fix">
      <style>
        {`
          .thick-border-table, .thick-border-table th, .thick-border-table td {
            border: 1.5px solid black !important;
          }

          .eccd-official-table {
            margin-top: 1pt !important;
          }
          
          /* Special PDF Capture Fixes - Move table 2pt down for PDF output specifically */
          .pdf-capture-mode .eccd-official-table {
            margin-top: 2pt !important;
          }

          .pdf-capture-mode .eccd-official-table td, 
          .pdf-capture-mode .eccd-official-table th {
            line-height: 1.15 !important;
            padding-top: 2px !important;
            padding-bottom: 2px !important;
            box-sizing: border-box !important;
            vertical-align: top !important;
            word-break: break-word !important;
          }

    @media print {
      @page {
        size: ${printSettings.paperSize} ${printSettings.layout} !important;
        margin: 0 !important;
      }
      
      /* Hide the entire app structure except our target */
      body > div:not(.print-root-fix), 
      #root > div:not(.print-root-fix),
      .no-print {
        display: none !important;
      }

      .eccd-official-page {
        width: ${printSettings.layout === 'landscape' ? '297mm' : '210mm'} !important;
        height: ${printSettings.layout === 'landscape' ? '210mm' : '297mm'} !important;
        transform: none !important;
        margin: 0 !important;
        padding: ${getMarginValue()}in !important;
        box-sizing: border-box !important;
        border: none !important;
        page-break-after: always !important;
        break-after: page !important;
        display: flex !important;
        position: relative !important;
        background-color: white !important;
        visibility: visible !important;
      }
      
      .print-container-fix {
        display: block !important;
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        visibility: visible !important;
        transform: none !important;
      }

      ${[1, 2, 3, 4].filter(p => !selectedPages.includes(p)).map(p => `.print-page-${p} { display: none !important; }`).join('\n')}
    }
          
          .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
        `}
      </style>

      {/* HIDDEN PDF CAPTURE AREA - RENDERS ONE LEARNER AT A TIME FOR STABILITY */}
      <div className="fixed top-0 left-0 -z-50 opacity-0 pointer-events-none overflow-hidden h-0 w-0 no-print">
        <div ref={pdfRef} className="pdf-capture-mode" style={{ width: '297mm' }}>
           {pdfCaptureLearner && (
              <React.Fragment>
                 {selectedPages.includes(1) && renderPage1(pdfCaptureLearner)}
                 {selectedPages.includes(2) && renderPage2(pdfCaptureLearner)}
                 {selectedPages.includes(3) && renderPage3(pdfCaptureLearner)}
                 {selectedPages.includes(4) && renderPage4(pdfCaptureLearner)}
              </React.Fragment>
           )}
        </div>
      </div>

      {showPreviewModal && (
        <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-7xl h-full max-h-[95vh] overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600 rounded-2xl shadow-lg">
                  <Printer className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight">ECCD Card Print Preview</h3>
                  <p className="text-blue-100/60 text-xs font-bold uppercase tracking-widest mt-0.5">Viewing: {learner.name}</p>
                </div>
              </div>
              <button onClick={() => setShowPreviewModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-6 h-6" /></button>
            </div>

            <div className="flex-1 overflow-hidden flex">
              <div className="w-80 bg-slate-50 border-r border-gray-200 overflow-y-auto p-6 flex flex-col gap-8 no-print shrink-0">
                
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><UserCheck className="w-3.5 h-3.5" /> Target Learner</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Search assessed..."
                      className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500/20 outline-none"
                      value={learnerSearch}
                      onChange={(e) => setLearnerSearch(e.target.value)}
                    />
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto divide-y divide-gray-100 shadow-inner">
                    {filteredLearners.length > 0 ? filteredLearners.map(l => (
                      <button
                        key={l.id}
                        onClick={() => onSelectLearner(l)}
                        className={`w-full text-left px-4 py-3 transition-colors flex items-center justify-between group ${
                          l.id === learner.id ? 'bg-blue-600 text-white' : 'hover:bg-blue-50'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className={`text-[11px] font-black truncate uppercase tracking-tight ${l.id === learner.id ? 'text-white' : 'text-gray-900'}`}>
                            {l.name}
                          </p>
                          <p className={`text-[9px] font-bold ${l.id === learner.id ? 'text-blue-100' : 'text-gray-400'}`}>
                            {l.lrn}
                          </p>
                        </div>
                        {l.id === learner.id && <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />}
                      </button>
                    )) : (
                      <div className="px-4 py-4 text-center">
                        <p className="text-[10px] font-bold text-gray-400 italic">No assessed learners found</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><CheckSquare className="w-3.5 h-3.5" /> Pages to Print</label>
                    <button 
                      onClick={toggleAllPages}
                      className="text-[9px] font-black text-blue-600 uppercase tracking-tight hover:underline"
                    >
                      {selectedPages.length === 4 ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {[1, 2, 3, 4].map(p => (
                      <button
                        key={p}
                        onClick={() => togglePageSelection(p)}
                        className={`flex items-center justify-between px-4 py-2.5 rounded-xl border transition-all ${
                          selectedPages.includes(p) 
                            ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' 
                            : 'bg-white border-gray-200 text-gray-400 grayscale'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {selectedPages.includes(p) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                          <span className="text-xs font-black uppercase tracking-tight">Page {p}</span>
                        </div>
                        <ChevronRight className="w-3 h-3 opacity-30" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><ClipboardList className="w-3.5 h-3.5" /> Assessment Records</label>
                  <div className="grid grid-cols-1 gap-2">
                    {PERIODS.map(p => (
                      <button
                        key={p}
                        onClick={() => toggleAssessmentVisibility(p)}
                        className={`flex items-center justify-between px-4 py-2.5 rounded-xl border transition-all ${
                          visibleAssessments.includes(p) 
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm' 
                            : 'bg-white border-gray-200 text-gray-400 grayscale'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {visibleAssessments.includes(p) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                          <span className="text-xs font-black uppercase tracking-tight">{p}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-2"><File className="w-3.5 h-3.5" /> Paper Size</label>
                    <div className="grid grid-cols-1 gap-2">
                      {['A4', 'Letter', 'Legal'].map(size => (
                        <button 
                          key={size}
                          onClick={() => setPrintSettings({...printSettings, paperSize: size as any})}
                          className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-tight transition-all border ${
                            printSettings.paperSize === size 
                              ? 'bg-blue-600 border-blue-600 text-white shadow-lg' 
                              : 'bg-white border-gray-200 text-gray-400 hover:border-blue-200'
                          }`}
                        >
                          {size} Size
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-2"><LayoutIcon className="w-3.5 h-3.5" /> Orientation</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['landscape', 'portrait'].map(l => (
                        <button 
                          key={l}
                          onClick={() => setPrintSettings({...printSettings, layout: l as any})}
                          className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-tight transition-all border ${
                            printSettings.layout === l 
                              ? 'bg-blue-600 border-blue-600 text-white shadow-lg' 
                              : 'bg-white border-gray-200 text-gray-400 hover:border-blue-200'
                          }`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
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

                <div className="mt-auto pt-8 flex flex-col gap-3">
                  <button 
                    onClick={downloadAllAsPDF}
                    disabled={isDownloading || assessedLearners.length === 0}
                    className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 active:scale-95 border-2 ${
                      !isDownloading 
                        ? 'bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-700 shadow-xl shadow-emerald-500/10' 
                        : 'bg-emerald-50 border-emerald-200 text-emerald-400 cursor-not-allowed'
                    }`}
                  >
                    {isDownloading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        PDF: {downloadProgress.current}/{downloadProgress.total}
                      </>
                    ) : (
                      <>
                        <FileDown className="w-4 h-4" /> Download All (PDF)
                      </>
                    )}
                  </button>
                  <button 
                    onClick={() => {
                      window.focus();
                      setTimeout(() => window.print(), 200);
                    }}
                    disabled={selectedPages.length === 0}
                    className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 active:scale-95 ${
                      selectedPages.length > 0 
                        ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-2xl' 
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <Printer className="w-4 h-4" /> Print Now
                  </button>
                </div>
              </div>

              <div className="flex-1 bg-gray-100 p-8 overflow-auto flex flex-col items-center gap-10 scroll-smooth">
                <div 
                  id="print-area-container"
                  className="flex flex-col gap-10 transition-all duration-300 origin-top max-w-full" 
                  style={{ 
                    transform: `scale(${(printSettings.scale / 100) * 0.45})`, 
                    padding: `0.2in`, 
                    width: printSettings.layout === 'landscape' ? '297mm' : '210mm',
                    minHeight: printSettings.layout === 'landscape' ? '210mm' : '297mm',
                    backgroundColor: 'transparent'
                  }}
                >
                  {selectedPages.includes(1) && renderPage1(learner)}
                  {selectedPages.includes(2) && renderPage2(learner)}
                  {selectedPages.includes(3) && renderPage3(learner)}
                  {selectedPages.includes(4) && renderPage4(learner)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="no-print sticky top-4 z-[100] w-full max-w-[1400px] bg-white/90 backdrop-blur-md p-4 rounded-3xl border border-white shadow-2xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Card Print Utility</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{learner.name}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setShowPreviewModal(true)} className="px-5 py-2 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">OPEN PRINT PREVIEW</button>
          <div className="h-8 w-px bg-slate-200 mx-2"></div>
          <button onClick={onClose} className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"><X className="w-4 h-4" />Exit View</button>
        </div>
      </div>

      <div className="w-full max-w-[1400px] px-6 flex gap-8 items-start">
        {/* Sidebar for Learner Selection & Controls */}
        <div className="w-80 shrink-0 sticky top-24 space-y-6 no-print max-h-[calc(100vh-120px)] overflow-y-auto pr-2 custom-scrollbar">
          {/* Print Controls */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="flex items-center gap-2 text-blue-600">
              <Printer className="w-4 h-4" />
              <h4 className="text-[10px] font-black uppercase tracking-widest">Print Controls</h4>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Layout Scale</label>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">{printSettings.scale}%</span>
                </div>
                <input 
                  type="range" min="40" max="100" step="1"
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  value={printSettings.scale}
                  onChange={(e) => setPrintSettings({...printSettings, scale: parseInt(e.target.value)})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Orientation</label>
                <div className="grid grid-cols-2 gap-2">
                  {['landscape', 'portrait'].map(l => (
                    <button 
                      key={l}
                      onClick={() => setPrintSettings({...printSettings, layout: l as any})}
                      className={`py-2 rounded-xl font-black text-[9px] uppercase tracking-tight border transition-all ${
                        printSettings.layout === l ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-400 hover:border-blue-200'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pages to Print</label>
                <div className="grid grid-cols-4 gap-1">
                  {[1, 2, 3, 4].map(p => (
                    <button
                      key={p}
                      onClick={() => togglePageSelection(p)}
                      className={`py-2 rounded-lg font-black text-[10px] border transition-all ${
                        selectedPages.includes(p) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-50 border-slate-100 text-slate-400'
                      }`}
                    >
                      P{p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-3">
              <button 
                onClick={() => {
                  window.focus();
                  setTimeout(() => window.print(), 200);
                }}
                className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95"
              >
                <Printer className="w-3.5 h-3.5" /> Print Now
              </button>
              <button 
                onClick={() => setShowPreviewModal(true)}
                className="w-full py-3 bg-blue-50 text-blue-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-100 transition-all flex items-center justify-center gap-2"
              >
                <Maximize className="w-3.5 h-3.5" /> Full Preview
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Users className="w-3.5 h-3.5" /> Assessed Learners
              </h4>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[9px] font-black uppercase">
                {assessedLearners.length} Total
              </span>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search by name or LRN..."
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                value={learnerSearch}
                onChange={(e) => setLearnerSearch(e.target.value)}
              />
            </div>

            <div className="space-y-1 max-h-[calc(100vh-350px)] overflow-y-auto pr-2 custom-scrollbar">
              {filteredLearners.length > 0 ? filteredLearners.map(l => (
                <button
                  key={l.id}
                  onClick={() => onSelectLearner(l)}
                  className={`w-full text-left px-4 py-3 rounded-2xl transition-all flex items-center justify-between group ${
                    l.id === learner.id 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                      : 'hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <div className="min-w-0">
                    <p className={`text-[11px] font-black truncate uppercase tracking-tight ${l.id === learner.id ? 'text-white' : 'text-slate-900 group-hover:text-blue-600'}`}>
                      {l.name}
                    </p>
                    <p className={`text-[9px] font-bold ${l.id === learner.id ? 'text-blue-100' : 'text-slate-400'}`}>
                      {l.lrn}
                    </p>
                  </div>
                  {l.id === learner.id ? (
                    <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                  )}
                </button>
              )) : (
                <div className="py-10 text-center space-y-2">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                    <Search className="w-6 h-6 text-slate-200" />
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No matches found</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-900 rounded-3xl p-6 text-white space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-xl">
                <FileDown className="w-4 h-4" />
              </div>
              <h4 className="text-[10px] font-black uppercase tracking-widest">Batch Export</h4>
            </div>
            <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
              Generate a single PDF containing all assessed learners' ECCD cards.
            </p>
            <button 
              onClick={downloadAllAsPDF}
              disabled={isDownloading || assessedLearners.length === 0}
              className={`w-full py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                !isDownloading 
                  ? 'bg-white text-slate-900 hover:bg-blue-50' 
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'
              }`}
            >
              {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              {isDownloading ? `Exporting ${downloadProgress.current}/${downloadProgress.total}` : 'Download All PDF'}
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col gap-10 items-center no-print-scroll-fix pb-20 print:p-0 print:m-0 print:block">
          <div 
            className="w-full flex flex-col gap-10 items-center transition-all duration-300 origin-top print:transform-none print:scale-100 print:gap-0 print:block print-container-fix"
            style={{ transform: `scale(${printSettings.scale / 100})` }}
          >
            {selectedPages.includes(1) && renderPage1(learner)}
            {selectedPages.includes(2) && renderPage2(learner)}
            {selectedPages.includes(3) && renderPage3(learner)}
            {selectedPages.includes(4) && renderPage4(learner)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ECCDCard;