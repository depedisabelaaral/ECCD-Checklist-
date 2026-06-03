import React, { useMemo, useState, useEffect } from 'react';
import { 
  Users, 
  CheckCircle2, 
  TrendingUp, 
  MapPin,
  Shield,
  User as UserIcon,
  Clock,
  Table as TableIcon,
  Landmark,
  Map as MapIcon,
  School as SchoolIcon,
  BrainCircuit,
  Loader2,
  Sparkles,
  Upload,
  ChevronRight,
  Target,
  BarChart3,
  Layout as LayoutIcon,
  Pencil,
  Check,
  Zap,
  Activity,
  ArrowUpRight,
  Award,
  Palette,
  Eye,
  Search,
  X,
  ClipboardList,
  Bell,
  AlertCircle,
  Hash,
  UserCheck,
  Unlock
} from 'lucide-react';
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
import { User, UserRole, UserStatus, Learner, Assessment, SubmissionStatus } from '../types.ts';
import { DOMAINS, PERIODS, LD_MAPPING, getAutomaticSchoolYear } from '../constants.tsx';
import { getAIInsights } from '../services/geminiService.ts';

interface DashboardProps {
  user: User;
  learners: Learner[];
  assessments: Assessment[];
  users: User[];
  submissions: SubmissionStatus[];
  onUpdateProfile?: (updatedProfile: Partial<User>) => void;
  onUpdateSubmission?: (submission: SubmissionStatus) => void;
}

type ThemeKey = 'slate' | 'zinc' | 'blue' | 'emerald';

const THEMES: Record<ThemeKey, { primary: string, accent: string, bg: string, card: string, border: string, text: string }> = {
  slate: { primary: 'bg-slate-900', accent: 'text-blue-600', bg: 'bg-slate-50', card: 'bg-white', border: 'border-slate-200', text: 'text-slate-900' },
  zinc: { primary: 'bg-zinc-900', accent: 'text-zinc-600', bg: 'bg-zinc-50', card: 'bg-white', border: 'border-zinc-200', text: 'text-zinc-900' },
  blue: { primary: 'bg-indigo-900', accent: 'text-indigo-600', bg: 'bg-indigo-50/30', card: 'bg-white', border: 'border-indigo-100', text: 'text-indigo-900' },
  emerald: { primary: 'bg-emerald-950', accent: 'text-emerald-600', bg: 'bg-emerald-50/40', card: 'bg-white', border: 'border-emerald-100', text: 'text-emerald-900' },
};

const QuickStat = ({ title, value, subtext, icon: Icon, colorClass, theme }: any) => (
  <div className={`${theme.card} p-5 rounded-2xl border ${theme.border} shadow-sm hover:shadow-md transition-all duration-300 group`}>
    <div className="flex items-center justify-between mb-4">
      <div className={`p-2 rounded-xl ${colorClass} bg-opacity-10`}>
        <Icon className={`w-5 h-5 ${colorClass.replace('bg-', 'text-')}`} />
      </div>
      <div className="p-1 rounded-md bg-slate-50 group-hover:bg-blue-50 transition-colors">
        <ArrowUpRight className="w-3 h-3 text-slate-300 group-hover:text-blue-500" />
      </div>
    </div>
    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.1em] mb-1">{title}</p>
    <div className="flex items-baseline gap-1.5">
      <h3 className="text-lg font-black text-slate-800 tracking-tight">{value}</h3>
      <span className="text-[8px] font-bold text-slate-400">{subtext}</span>
    </div>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ user, learners, assessments, users, submissions, onUpdateProfile, onUpdateSubmission }) => {
  const [currentThemeKey, setCurrentThemeKey] = useState<ThemeKey>(() => (localStorage.getItem('dashboard_theme') as ThemeKey) || 'slate');
  const theme = THEMES[currentThemeKey];

  const currentSY = useMemo(() => {
    return user.schoolYear || getAutomaticSchoolYear();
  }, [user.schoolYear]);

  const [isEditingSY, setIsEditingSY] = useState(false);
  const [tempSY, setTempSY] = useState('');
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<string>(currentSY);

  const isAdmin = user.role === UserRole.ADMIN;
  const isDistrictAdmin = user.role === UserRole.CONSOLIDATOR || user.role === UserRole.COORDINATOR;
  const isConsolidator = user.role === UserRole.CONSOLIDATOR;
  const isSchoolUser = user.role === UserRole.SCHOOL_USER;

  const [selectedLD, setSelectedLD] = useState<string>(isDistrictAdmin ? user.legislativeDistrict || 'All' : 'All');
  const [selectedDistrict, setSelectedDistrict] = useState<string>(isDistrictAdmin ? user.district || 'All' : 'All');
  const [selectedSchool, setSelectedSchool] = useState<string>('All');
  const [selectedPeriod, setSelectedPeriod] = useState<Assessment['period']>('FIRST ASSESSMENT');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  // For Consolidator Drill-down
  const [drillDownSchoolId, setDrillDownSchoolId] = useState<string | null>(null);
  const [schoolSearchTerm, setSchoolSearchTerm] = useState('');

  const DEPED_LOGO_KEY = 'branding_deped_logo';
  const USER_FORM_LOGO_KEY = `branding_form_logo_${user.id}`;
  const GLOBAL_SIDEBAR_KEY = 'branding_sidebar_logo';

  const [logos, setLogos] = useState({
    depedLogo: localStorage.getItem(DEPED_LOGO_KEY) || 'eccd.jpg',
    schoolLogo: localStorage.getItem(isAdmin ? GLOBAL_SIDEBAR_KEY : USER_FORM_LOGO_KEY) || ''
  });

  useEffect(() => {
    localStorage.setItem('dashboard_theme', currentThemeKey);
  }, [currentThemeKey]);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editFields, setEditFields] = useState({
    fullName: user.fullName || '',
    schoolId: user.schoolId || '',
    schoolHeadName: user.schoolHeadName || '',
    schoolName: user.schoolName || ''
  });

  const handleSaveProfile = () => {
    if (onUpdateProfile) {
      onUpdateProfile({
        fullName: editFields.fullName,
        schoolId: editFields.schoolId,
        schoolHeadName: editFields.schoolHeadName,
        schoolName: editFields.schoolName
      });
    }
    setIsEditingProfile(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'depedLogo' | 'schoolLogo') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setLogos(prev => ({ ...prev, [type]: base64String }));
        if (type === 'depedLogo') {
          localStorage.setItem(DEPED_LOGO_KEY, base64String);
          window.dispatchEvent(new Event('branding_user_logo_updated'));
        } else {
          const storageKey = isAdmin ? GLOBAL_SIDEBAR_KEY : USER_FORM_LOGO_KEY;
          localStorage.setItem(storageKey, base64String);
          if (isAdmin) window.dispatchEvent(new Event('branding_sidebar_updated'));
          window.dispatchEvent(new Event('branding_user_logo_updated'));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const schoolYearOptions = useMemo(() => {
    const years = new Set<string>();
    learners.forEach(l => { if (l.schoolYear) years.add(l.schoolYear); });
    submissions.forEach(s => { if (s.schoolYear) years.add(s.schoolYear); });
    years.add(currentSY);
    return Array.from(years).sort().reverse();
  }, [learners, submissions, currentSY]);

  const filteredData = useMemo(() => {
    const approvedSchoolIds = new Set(
      users.filter(u => u.status === UserStatus.APPROVED && u.schoolId).map(u => u.schoolId!)
    );

    let jLearners = learners.filter(l => approvedSchoolIds.has(l.schoolId));

    // Filter by School Year
    if (selectedSchoolYear !== 'All') {
      jLearners = jLearners.filter(l => l.schoolYear === selectedSchoolYear);
    }

    if (user.role === UserRole.SCHOOL_USER) {
      jLearners = jLearners.filter(l => l.schoolId === user.schoolId);
    } else if (isDistrictAdmin) {
      jLearners = jLearners.filter(l => {
          const lUser = users.find(u => u.schoolId === l.schoolId);
          return lUser?.district === user.district;
      });
    }

    if (selectedLD !== 'All' && !isDistrictAdmin) {
      jLearners = jLearners.filter(l => {
        const lUser = users.find(u => u.schoolId === l.schoolId);
        return lUser?.legislativeDistrict === selectedLD;
      });
    }
    if (selectedDistrict !== 'All' && !isDistrictAdmin) {
      jLearners = jLearners.filter(l => {
        const lUser = users.find(u => u.schoolId === l.schoolId);
        return lUser?.district === selectedDistrict;
      });
    }
    if (selectedSchool !== 'All') {
      jLearners = jLearners.filter(l => l.schoolId === selectedSchool);
    }

    const jAssessments = assessments.filter(a => jLearners.some(l => l.id === a.learnerId));
    return { learners: jLearners, assessments: jAssessments };
  }, [user, learners, assessments, users, selectedLD, selectedDistrict, selectedSchool, isDistrictAdmin]);

  const schoolBrandingInfo = useMemo(() => {
    if (!isSchoolUser) return null;
    const firstLearner = filteredData.learners[0];
    return {
      schoolName: user.schoolName || firstLearner?.schoolName || '---',
      schoolId: user.schoolId || firstLearner?.schoolId || '---',
      adviser: user.fullName || firstLearner?.adviser || '---',
      schoolHead: user.schoolHeadName || firstLearner?.schoolHeadName || '---',
      schoolYear: currentSY
    };
  }, [isSchoolUser, filteredData.learners, user, currentSY]);

  const districtSchoolsData = useMemo(() => {
    if (!isConsolidator) return [];

    const districtUsers = users.filter(u => 
      u.role === UserRole.SCHOOL_USER && 
      u.district === user.district &&
      u.schoolId
    );

    return districtUsers.map(schoolUser => {
      const sId = schoolUser.schoolId!;
      const sLearners = learners.filter(l => l.schoolId === sId && (selectedSchoolYear === 'All' || l.schoolYear === selectedSchoolYear));
      const sAssessments = assessments.filter(a => sLearners.some(l => l.id === a.learnerId) && a.period === selectedPeriod);
      
      const assessedLearnerIds = new Set(sAssessments.map(a => a.learnerId));
      let totalDomainCompletion = 0;
      sLearners.forEach(l => {
        const a = sAssessments.find(as => as.learnerId === l.id);
        if (a) {
          let assessedDomains = 0;
          DOMAINS.forEach(d => {
            if ((a.scores as any)[d.id] > 0) assessedDomains++;
          });
          totalDomainCompletion += (assessedDomains / DOMAINS.length);
        }
      });
      
      const completionRate = sLearners.length > 0 ? (totalDomainCompletion / sLearners.length) * 100 : 0;
      
      const submission = submissions.find(s => s.userId === schoolUser.id && s.period === selectedPeriod && (selectedSchoolYear === 'All' || s.schoolYear === selectedSchoolYear));
      
      let remark = "Awaiting Entry";
      let remarkColor = "bg-amber-50 text-amber-600 border-amber-100";
      
      if (submission?.isFinalized) {
        remark = "Finalized";
        remarkColor = "bg-emerald-50 text-emerald-600 border-emerald-100";
      } else if (completionRate > 0) {
        remark = "Preparing";
        remarkColor = "bg-blue-50 text-blue-600 border-blue-100";
      }

      return {
        id: sId,
        name: schoolUser.schoolName || `School ${sId}`,
        totalLearners: sLearners.length,
        assessedCount: assessedLearnerIds.size,
        progress: Math.round(completionRate),
        remark,
        remarkColor
      };
    }).filter(s => s.name.toLowerCase().includes(schoolSearchTerm.toLowerCase()) || s.id.includes(schoolSearchTerm));
  }, [isConsolidator, users, user.district, learners, assessments, submissions, selectedPeriod, schoolSearchTerm, selectedSchoolYear]);

  const pendingPasswordRequests = useMemo(() => {
    if (!isConsolidator) return [];
    return users.filter(u => u.district === user.district && u.passwordRequest && !u.passwordRequest.resolved);
  }, [isConsolidator, users, user.district]);

  const unfinalizeRequests = useMemo(() => {
    if (!isConsolidator) return [];
    return submissions.filter(s => {
      const sUser = users.find(u => u.id === s.userId);
      return sUser?.district === user.district && s.requestUnfinalize;
    }).map(s => ({
      ...s,
      schoolName: users.find(u => u.id === s.userId)?.schoolName || 'Unknown School'
    }));
  }, [isConsolidator, submissions, users, user.district]);

  const handleApproveUnfinalize = (sub: SubmissionStatus) => {
    if (!onUpdateSubmission) return;
    onUpdateSubmission({
      ...sub,
      isFinalized: false,
      requestUnfinalize: false,
      requestMessage: '',
      unfinalizeCount: 1, // Set to 1 to give 2 more chances (can unfinalize at 1 and 2)
      lastUpdated: Date.now()
    });
  };

  const stats = useMemo(() => {
    const totalLearners = filteredData.learners.length;
    // For general stats, we look at current active assessments (if any)
    const periodAssessments = filteredData.assessments.filter(a => a.period === selectedPeriod);
    const assessedLearnerIds = new Set(periodAssessments.map(a => a.learnerId));
    
    let totalDomainCompletionOverall = 0;
    filteredData.learners.forEach(l => {
      const a = periodAssessments.find(as => as.learnerId === l.id);
      if (a) {
        let assessedDomains = 0;
        DOMAINS.forEach(d => {
          if ((a.scores as any)[d.id] > 0) assessedDomains++;
        });
        totalDomainCompletionOverall += (assessedDomains / DOMAINS.length);
      }
    });

    const completionRate = totalLearners > 0 ? Math.round((totalDomainCompletionOverall / totalLearners) * 100) : 0;
    const totalAssessments = filteredData.assessments.length;
    
    const avgScore = periodAssessments.length > 0 
      ? (periodAssessments.reduce((acc, curr) => {
          const scoreValues = Object.values(curr.scores) as number[];
          return acc + (scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length);
        }, 0) / periodAssessments.length).toFixed(1)
      : "0.0";

    return { totalLearners, assessedLearnersCount: assessedLearnerIds.size, totalAssessments, avgScore, completionRate };
  }, [filteredData, selectedPeriod]);

  const domainData = useMemo(() => {
    return DOMAINS.map(d => {
      const relevantScores = filteredData.assessments.map(a => (a.scores as any)[d.id] || 0);
      const avg = relevantScores.length > 0 
        ? (relevantScores.reduce((a, b) => a + b, 0) / relevantScores.length) 
        : 0;
      return {
        name: d.label.toUpperCase(),
        value: Math.min(100, Math.round((avg / d.max) * 100)) 
      };
    });
  }, [filteredData]);

  const handleGenerateAIInsights = async () => {
    if (filteredData.assessments.length === 0) return alert("Need assessment data to generate insights.");
    setAiLoading(true);
    try {
      const sample = filteredData.assessments.slice(0, 50);
      const insight = await getAIInsights(sample, user.schoolName || user.district || "District Learners");
      setAiSummary(insight || "Unable to generate insights at this time.");
    } catch (err) { setAiSummary("Error generating AI insights."); }
    finally { setAiLoading(false); }
  };

  const chartColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1', '#06b6d4'];
  const drillDownSchool = districtSchoolsData.find(s => s.id === drillDownSchoolId);
  const drillDownLearners = drillDownSchoolId ? learners.filter(l => l.schoolId === drillDownSchoolId) : [];

  return (
    <div className={`space-y-6 animate-in fade-in duration-500 pb-16 max-w-7xl mx-auto`}>
      {/* HEADER SECTION */}
      <div className={`${theme.card} p-6 rounded-[32px] border ${theme.border} shadow-sm overflow-hidden relative`}>
        <div className="flex flex-col md:flex-row items-start justify-between gap-8">
          <div className="flex items-center gap-6 flex-1 min-w-0">
            <div className="flex gap-2 shrink-0">
              <div className="w-14 h-14 rounded-xl bg-white p-1.5 border border-slate-100 shadow-sm relative z-10 overflow-hidden group/deped">
                <img src={logos.depedLogo} className="w-full h-full object-contain" alt="DepEd" />
                <label className="absolute inset-0 cursor-pointer flex items-center justify-center opacity-0 group-hover/deped:opacity-100 transition-all bg-black/50 backdrop-blur-[2px]">
                  <Upload className="w-3 h-3 text-white" />
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoUpload(e, 'depedLogo')} />
                </label>
              </div>
              <div className="w-14 h-14 rounded-xl bg-slate-50 p-1.5 border border-slate-100 shadow-sm relative z-0 overflow-hidden group/school">
                {logos.schoolLogo ? (
                  <img src={logos.schoolLogo} className="w-full h-full object-contain" alt="School" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <SchoolIcon className="w-5 h-5" />
                  </div>
                )}
                <label className="absolute inset-0 cursor-pointer flex items-center justify-center opacity-0 group-hover/school:opacity-100 transition-all bg-black/50 backdrop-blur-[2px]">
                  <Upload className="w-3 h-3 text-white" />
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoUpload(e, 'schoolLogo')} />
                </label>
              </div>
            </div>
            
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-1.5 py-0.5 bg-blue-600 text-white text-[8px] font-black uppercase tracking-wider rounded shadow-sm shadow-blue-200">Live</span>
                {isSchoolUser && (
                  <div className="flex items-center gap-1">
                    {isEditingSY ? (
                      <div className="flex items-center gap-1 bg-white rounded border border-slate-200 px-1 py-0.5">
                        <input 
                          type="text" 
                          value={tempSY} 
                          onChange={(e) => setTempSY(e.target.value)}
                          placeholder="e.g. 2024-2025"
                          className="w-20 text-[8px] font-black uppercase tracking-widest outline-none"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              if (onUpdateProfile) onUpdateProfile({ schoolYear: tempSY });
                              setIsEditingSY(false);
                            }
                          }}
                        />
                        <button 
                          onClick={() => {
                            if (onUpdateProfile) onUpdateProfile({ schoolYear: tempSY });
                            setIsEditingSY(false);
                          }}
                          className="text-emerald-500 hover:text-emerald-600"
                        >
                          <Check className="w-2.5 h-2.5" />
                        </button>
                        <button 
                          onClick={() => setIsEditingSY(false)}
                          className="text-rose-500 hover:text-rose-600"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => {
                          setTempSY(currentSY);
                          setIsEditingSY(true);
                        }}
                        className="px-1.5 py-0.5 bg-slate-900 text-white text-[8px] font-black uppercase tracking-widest rounded border border-slate-700 flex items-center gap-1 hover:bg-slate-800 transition-colors"
                      >
                        S.Y. {currentSY}
                        <Pencil className="w-2 h-2 opacity-50" />
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex flex-col lg:flex-row lg:items-center lg:gap-3">
                <h1 className="text-lg font-black text-slate-800 uppercase tracking-tight truncate max-w-lg">
                  {isSchoolUser ? user.schoolName : (user.district && user.district !== 'All' ? `${user.district} District` : "Regional Dashboard")}
                </h1>
                <div className="hidden lg:block h-4 w-px bg-slate-200 shrink-0"></div>
                <div className="flex items-center gap-2 text-slate-400 font-medium text-[9px] uppercase tracking-wider whitespace-nowrap">
                  <span className="flex items-center gap-1"><MapPin className="w-2.5 h-2.5" /> Division of Isabela</span>
                  <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                  <span className="flex items-center gap-1"><Landmark className="w-2.5 h-2.5" /> {user.legislativeDistrict || "Division Level"}</span>
                </div>
              </div>

              {isSchoolUser && schoolBrandingInfo && (
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 mt-2.5 pt-2.5 border-t border-slate-100 animate-in slide-in-from-left-4 duration-500 w-full font-sans">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                     <div className="flex items-center gap-1.5">
                        <div className="p-1 bg-blue-50 text-blue-600 rounded">
                          <Hash className="w-2.5 h-2.5" />
                        </div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">School ID:</span>
                        <span className="text-[9px] font-bold text-slate-700">{schoolBrandingInfo.schoolId}</span>
                     </div>
                     <div className="flex items-center gap-1.5">
                        <div className="p-1 bg-emerald-50 text-emerald-600 rounded">
                          <UserIcon className="w-2.5 h-2.5" />
                        </div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Adviser:</span>
                        <span className="text-[9px] font-black text-slate-800 uppercase truncate max-w-[120px]">{schoolBrandingInfo.adviser}</span>
                     </div>
                     <div className="flex items-center gap-1.5">
                        <div className="p-1 bg-indigo-50 text-indigo-600 rounded">
                          <UserCheck className="w-2.5 h-2.5" />
                        </div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">SCHOOL HEAD:</span>
                        <span className="text-[9px] font-black text-slate-800 uppercase truncate max-w-[120px]">{schoolBrandingInfo.schoolHead}</span>
                     </div>
                  </div>
                  <button
                    onClick={() => {
                      setEditFields({
                        fullName: user.fullName || '',
                        schoolId: user.schoolId || '',
                        schoolHeadName: user.schoolHeadName || '',
                        schoolName: user.schoolName || ''
                      });
                      setIsEditingProfile(true);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-[8px] font-black uppercase tracking-widest text-slate-600 rounded-lg transition-all border border-slate-200 active:scale-95 cursor-pointer"
                  >
                    <Pencil className="w-2.5 h-2.5" /> Modify Info
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-3 shrink-0 ml-auto md:ml-0">
            <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
              {(Object.keys(THEMES) as ThemeKey[]).map((k) => (
                <button 
                  key={k} 
                  onClick={() => setCurrentThemeKey(k)}
                  className={`w-6 h-6 rounded-full transition-all flex items-center justify-center border-2 ${currentThemeKey === k ? 'border-white ring-2 ring-blue-400 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: k === 'slate' ? '#0f172a' : k === 'zinc' ? '#18181b' : k === 'blue' ? '#312e81' : '#064e3b' }}
                >
                  {currentThemeKey === k && <Check className="w-3 h-3 text-white" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SECURITY & DATA REQUESTS */}
      {isConsolidator && (pendingPasswordRequests.length > 0 || unfinalizeRequests.length > 0) && (
         <div className="space-y-4">
            {pendingPasswordRequests.length > 0 && (
               <div className="bg-rose-50 border border-rose-100 rounded-3xl p-6 shadow-sm animate-in slide-in-from-top-4 duration-500">
                  <div className="flex items-center gap-3 mb-4">
                     <div className="p-2 bg-rose-500 rounded-xl text-white">
                        <Bell className="w-5 h-5 animate-bounce" />
                     </div>
                     <h4 className="text-sm font-black text-rose-900 uppercase tracking-tight">{pendingPasswordRequests.length} Pending Password Requests</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {pendingPasswordRequests.map(req => (
                        <div key={req.id} className="bg-white p-4 rounded-2xl border border-rose-100 shadow-sm flex flex-col gap-1">
                           <span className="text-[10px] font-black text-slate-800 uppercase">{req.fullName}</span>
                           <p className="text-[11px] text-slate-500 italic">"{req.passwordRequest!.message}"</p>
                        </div>
                     ))}
                  </div>
               </div>
            )}

            {unfinalizeRequests.length > 0 && (
               <div className="bg-amber-50 border border-amber-100 rounded-3xl p-6 shadow-sm animate-in slide-in-from-top-4 duration-500">
                  <div className="flex items-center gap-3 mb-4">
                     <div className="p-2 bg-amber-500 rounded-xl text-white">
                        <Unlock className="w-5 h-5 animate-pulse" />
                     </div>
                     <h4 className="text-sm font-black text-amber-900 uppercase tracking-tight">{unfinalizeRequests.length} Unfinalize Requests</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {unfinalizeRequests.map(req => (
                        <div key={`${req.userId}-${req.period}`} className="bg-white p-4 rounded-2xl border border-amber-100 shadow-sm flex flex-col gap-2">
                           <div>
                              <span className="text-[10px] font-black text-slate-800 uppercase block">{req.schoolName}</span>
                              <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest">{req.period}</span>
                           </div>
                           <p className="text-[11px] text-slate-500 italic">"{req.requestMessage}"</p>
                           <button 
                              onClick={() => handleApproveUnfinalize(req)}
                              className="mt-2 w-full py-2 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-amber-200"
                           >
                              Approve Unfinalize
                           </button>
                        </div>
                     ))}
                  </div>
               </div>
            )}
         </div>
      )}

      {/* KPI GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <QuickStat theme={theme} title="Total Enrollment" value={stats.totalLearners.toLocaleString()} subtext="Learners" icon={Users} colorClass="bg-blue-600" />
        <QuickStat theme={theme} title="Completion Rate" value={`${stats.completionRate}%`} subtext={`${stats.assessedLearnersCount} Verified`} icon={CheckCircle2} colorClass="bg-emerald-600" />
        <QuickStat theme={theme} title="Avg. Bench Score" value={stats.avgScore} subtext="Average" icon={Award} colorClass="bg-indigo-600" />
        <QuickStat theme={theme} title="Sync Activity" value={stats.totalAssessments.toLocaleString()} subtext="Ops" icon={Activity} colorClass="bg-amber-600" />
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 space-y-6">
          {isConsolidator ? (
             <div className={`${theme.card} rounded-3xl border ${theme.border} shadow-sm overflow-hidden`}>
                <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                   <div>
                      <h4 className="text-base font-black text-slate-800 tracking-tight">District School Consolidation</h4>
                      <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Monitoring status of institutional data packets</p>
                   </div>
                   <div className="flex items-center gap-3">
                      <select 
                        value={selectedSchoolYear}
                        onChange={(e) => setSelectedSchoolYear(e.target.value)}
                        className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="All">All Years</option>
                        {schoolYearOptions.map(sy => <option key={sy} value={sy}>S.Y. {sy}</option>)}
                      </select>
                      <select 
                        value={selectedPeriod}
                        onChange={(e) => setSelectedPeriod(e.target.value as any)}
                        className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <div className="relative w-48">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input 
                          type="text" 
                          placeholder="Search schools..."
                          className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none"
                          value={schoolSearchTerm}
                          onChange={(e) => setSchoolSearchTerm(e.target.value)}
                        />
                      </div>
                   </div>
                </div>
                <div className="overflow-x-auto">
                   <table className="w-full text-left">
                      <thead className="bg-slate-50/50 border-b border-slate-100">
                         <tr>
                            <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">School ID & Name</th>
                            <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Enrollment</th>
                            <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Progress</th>
                            <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Remarks</th>
                            <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                         {districtSchoolsData.map((school) => (
                            <tr key={school.id} className="hover:bg-blue-50/30 transition-colors group">
                               <td className="px-6 py-4">
                                  <div>
                                     <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{school.name}</p>
                                     <p className="text-[9px] font-mono text-slate-400 mt-0.5">ID: {school.id}</p>
                                  </div>
                               </td>
                               <td className="px-6 py-4 text-center">
                                  <span className="text-xs font-black text-slate-700">{school.totalLearners}</span>
                               </td>
                               <td className="px-6 py-4">
                                  <div className="w-full max-w-[80px] h-1 bg-slate-100 rounded-full overflow-hidden">
                                     <div className="h-full bg-blue-500" style={{ width: `${school.progress}%` }}></div>
                                  </div>
                                  <p className="text-[7px] font-black text-slate-400 uppercase mt-1">{school.progress}% Complete</p>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border whitespace-nowrap ${school.remarkColor}`}>
                                     {school.remark}
                                  </span>
                               </td>
                               <td className="px-6 py-4 text-right">
                                  <button onClick={() => setDrillDownSchoolId(school.id)} className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:bg-blue-600 hover:text-white transition-all">
                                     <Eye className="w-4 h-4" />
                                  </button>
                               </td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </div>
          ) : (
             <div className={`${theme.card} p-8 rounded-3xl border ${theme.border} shadow-sm`}>
                <h4 className="text-base font-black text-slate-800 mb-6 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Developmental Milestones
                </h4>
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={domainData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: '800', fill: '#94a3b8' }} interval={0} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: '700', fill: '#cbd5e1' }} unit="%" />
                      <Tooltip cursor={{ fill: '#f8fafc', radius: 8 }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px' }} />
                      <Bar dataKey="value" radius={[6, 6, 2, 2]} barSize={32}>
                        {domainData.map((_, index) => <Cell key={index} fill={chartColors[index % chartColors.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
             </div>
          )}
        </div>

        <div className="xl:col-span-4 space-y-6">
          <div className={`${theme.primary} rounded-3xl p-6 text-white shadow-lg relative overflow-hidden group`}>
            <div className="relative z-10">
              <h5 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 mb-3">
                <Sparkles className="w-3.5 h-3.5" /> AI Analysis
              </h5>
              <p className="text-xs font-medium text-blue-50/80 mb-5">Instantly synthesize your district or school data into actionable pedagogical insights.</p>
              <button 
                onClick={handleGenerateAIInsights}
                disabled={aiLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-blue-900 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-blue-50 transition-all disabled:opacity-50"
              >
                {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BrainCircuit className="w-3.5 h-3.5" />}
                {aiLoading ? 'Analyzing...' : 'Generate Analysis'}
              </button>
            </div>
            {aiSummary && (
              <div className="mt-6 bg-black/20 rounded-2xl p-5 text-[11px] border border-white/5 max-h-[300px] overflow-y-auto custom-scrollbar">
                <div className="text-blue-50/90 whitespace-pre-wrap font-medium">{aiSummary}</div>
              </div>
            )}
          </div>

          <div className={`${theme.card} p-5 rounded-2xl border ${theme.border} shadow-sm space-y-3`}>
            <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><LayoutIcon className="w-3.5 h-3.5" /> Operations</h5>
            <div className="grid grid-cols-1 gap-2">
               <button className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl hover:border-blue-400 transition-all">
                  <div className="flex items-center gap-2.5">
                    <TableIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[9px] font-black text-slate-800 uppercase">Export Excel</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-slate-300" />
               </button>
            </div>
          </div>
        </div>
      </div>

      {/* DRILL-DOWN MODAL */}
      {drillDownSchoolId && drillDownSchool && (
         <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-8">
               <div className="p-8 bg-slate-900 text-white flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-4">
                     <SchoolIcon className="w-6 h-6 text-blue-400" />
                     <div>
                        <h3 className="text-xl font-black uppercase tracking-tight">{drillDownSchool.name}</h3>
                        <p className="text-blue-100/50 text-[10px] font-bold uppercase">ID: {drillDownSchoolId} • {drillDownLearners.length} Registered Learners</p>
                     </div>
                  </div>
                  <button onClick={() => setDrillDownSchoolId(null)} className="p-3 hover:bg-white/10 rounded-full transition-colors"><X className="w-6 h-6" /></button>
               </div>
               <div className="flex-1 overflow-auto p-8 custom-scrollbar">
                  <div className="bg-white border border-gray-100 rounded-[32px] overflow-hidden">
                     <table className="w-full text-left">
                        <thead className="bg-slate-50/50 border-b border-gray-100">
                           <tr>
                              <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">LRN / Name</th>
                              <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Section</th>
                              <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Gender</th>
                              <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">History</th>
                              <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                           {drillDownLearners.map(l => {
                              const lAssessments = assessments.filter(a => a.learnerId === l.id);
                              return (
                                 <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-8 py-1.5">
                                       <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{l.name}</p>
                                       <p className="text-[10px] font-mono text-slate-400">LRN: {l.lrn}</p>
                                    </td>
                                    <td className="px-8 py-1.5 text-center">
                                       <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-black uppercase">{l.section || 'N/A'}</span>
                                    </td>
                                    <td className="px-8 py-1.5 text-center">
                                       <span className={`text-[10px] font-black uppercase ${l.gender === 'Female' ? 'text-pink-600' : 'text-blue-600'}`}>{l.gender}</span>
                                    </td>
                                    <td className="px-8 py-1.5 text-center">
                                       <div className="flex justify-center gap-1">
                                          {[1,2,3].map(i => (
                                            <div key={i} className={`w-5 h-5 rounded-md flex items-center justify-center text-[8px] font-black ${lAssessments[i-1] ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-300'}`}>{i}</div>
                                          ))}
                                       </div>
                                    </td>
                                    <td className="px-8 py-1.5 text-center">
                                       <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${lAssessments.length > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                          {lAssessments.length > 0 ? 'Active' : 'No Data'}
                                       </span>
                                    </td>
                                 </tr>
                              );
                           })}
                        </tbody>
                     </table>
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* PROFILE / SCHOOL BRANDING MODIFY MODAL */}
      {isSchoolUser && isEditingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm select-none font-sans animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col animate-in scale-in duration-300">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <SchoolIcon className="w-5 h-5 text-blue-400 animate-pulse" />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-tight">Modify School & Adviser Info</h3>
                  <p className="text-slate-400 text-[9px] font-medium uppercase">Updates active headers and reports across pages</p>
                </div>
              </div>
              <button 
                onClick={() => setIsEditingProfile(false)} 
                className="p-1.5 hover:bg-white/10 rounded-full transition-colors cursor-pointer text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              
              {/* School Logo Section */}
              <div>
                <label className="text-[9px] uppercase font-black tracking-widest text-slate-400 block mb-1">School Logo</label>
                <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-3">
                  <div className="w-12 h-12 bg-white rounded-xl border border-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                    {logos.schoolLogo ? (
                      <img src={logos.schoolLogo} className="w-full h-full object-contain" alt="School logo preview" />
                    ) : (
                      <SchoolIcon className="w-5 h-5 text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="inline-block px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-black uppercase tracking-widest rounded-lg cursor-pointer transition-colors">
                      Change Logo Image
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoUpload(e, 'schoolLogo')} />
                    </label>
                    <p className="text-[8px] text-slate-400 mt-1 font-medium">Recommends square PNG/JPG (base64 saved)</p>
                  </div>
                </div>
              </div>

              {/* School Name */}
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-black tracking-widest text-slate-400 block">School Name</label>
                <input
                  type="text"
                  value={editFields.schoolName}
                  onChange={(e) => setEditFields(prev => ({ ...prev, schoolName: e.target.value.toUpperCase() }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-xs outline-none focus:border-blue-500 text-slate-800"
                  placeholder="e.g. ISABELA ELEMENTARY SCHOOL"
                />
              </div>

              {/* School ID */}
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-black tracking-widest text-slate-400 block">School ID</label>
                <input
                  type="text"
                  value={editFields.schoolId}
                  onChange={(e) => setEditFields(prev => ({ ...prev, schoolId: e.target.value.toUpperCase() }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-xs outline-none focus:border-blue-500 text-slate-800"
                  placeholder="e.g. 104231"
                />
              </div>

              {/* Adviser name */}
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-black tracking-widest text-slate-400 block">Adviser / Teacher Name</label>
                <input
                  type="text"
                  value={editFields.fullName}
                  onChange={(e) => setEditFields(prev => ({ ...prev, fullName: e.target.value.toUpperCase() }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-xs outline-none focus:border-blue-500 text-slate-800"
                  placeholder="e.g. JEANE D. SMITH"
                />
              </div>

              {/* School Head */}
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-black tracking-widest text-slate-400 block">School Head / Principal Name</label>
                <input
                  type="text"
                  value={editFields.schoolHeadName}
                  onChange={(e) => setEditFields(prev => ({ ...prev, schoolHeadName: e.target.value.toUpperCase() }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-xs outline-none focus:border-blue-500 text-slate-800"
                  placeholder="e.g. DR. MARIA A. REYES"
                />
              </div>

            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="px-4 py-2 text-slate-500 hover:text-slate-700 font-bold text-[10px] uppercase tracking-widest transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-md cursor-pointer"
              >
                Save Updates
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;