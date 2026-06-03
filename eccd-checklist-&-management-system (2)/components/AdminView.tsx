
import React, { useState, useMemo } from 'react';
import { User, Learner, Assessment, UserRole, SubmissionStatus } from '../types';
import { Building2, Landmark, GraduationCap, Map as MapIcon, Users, ArrowUpRight, CheckCircle, Clock, Cloud, Link as LinkIcon, Save, RefreshCw, Loader2, AlertTriangle, Activity, Zap, FileCheck, ClipboardList, AlertCircle } from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { LD_MAPPING } from '../constants';
import { syncToCloud, CLOUD_SCRIPT_URL } from '../services/sync';

const getAutomaticSchoolYear = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  if (currentMonth >= 4) return `${currentYear}-${currentYear + 1}`;
  return `${currentYear - 1}-${currentYear}`;
};

interface AdminViewProps {
  users: User[];
  learners: Learner[];
  assessments: Assessment[];
  submissions: SubmissionStatus[];
}

const AdminView: React.FC<AdminViewProps> = ({ users, learners, assessments, submissions }) => {
  const [selectedLegislative, setSelectedLegislative] = useState('All');
  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [selectedSchoolYear, setSelectedSchoolYear] = useState(getAutomaticSchoolYear());
  const [showStatusFilter, setShowStatusFilter] = useState<'All' | 'Finalized' | 'Active' | 'Preparing' | 'Inactive'>('All');
  const [cloudUrl, setCloudUrl] = useState(() => localStorage.getItem('eccd_cloud_url') || CLOUD_SCRIPT_URL);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string | null>(null);

  const handleSaveCloudUrl = () => {
    const trimmedUrl = cloudUrl.trim().replace(/['"]/g, '');
    localStorage.setItem('eccd_cloud_url', trimmedUrl);
    setCloudUrl(trimmedUrl);
    alert("URL Saved locally. Use 'Test Connection' to verify.");
  };

  const handleTestConnection = async () => {
    if (isTesting) return;
    setIsTesting(true);
    try {
      const result = await syncToCloud(cloudUrl, 'test', 'Ping');
      if (result && result.status === 'success') {
        alert("Success! The Cloud Database is responding correctly.");
      } else {
        throw new Error("Cloud responded but format was unexpected.");
      }
    } catch (err: any) {
      alert(`Connection Test Failed: ${err.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  const handleForceSync = async () => {
    const urlToUse = cloudUrl.trim();
    
    if (!urlToUse || urlToUse.length < 20 || !urlToUse.includes('exec')) {
        alert("Please enter a valid Google Apps Script URL (ending in /exec).");
        return;
    }

    if (!window.confirm("Push all local data to the cloud? This will overwrite records in the sheet.")) return;

    setIsSyncing(true);
    setSyncProgress("Ready...");
    
    try {
        console.group("Manual Cloud Sync Initiation");
        
        setSyncProgress("Syncing Accounts...");
        await syncToCloud(urlToUse, 'sync_all', 'Users', users);
        await delay(1000);
        
        setSyncProgress("Syncing Learners...");
        await syncToCloud(urlToUse, 'sync_all', 'Learners', learners);
        await delay(1000);
        
        setSyncProgress("Syncing Assessments...");
        await syncToCloud(urlToUse, 'sync_all', 'Assessments', assessments);
        
        console.groupEnd();
        setSyncProgress(null);
        alert("Cloud sync complete! Data dispatched to Google Sheets.");
    } catch (err: any) {
        console.groupEnd();
        setSyncProgress(null);
        alert(`Sync Error: ${err.message}`);
    } finally {
        setIsSyncing(false);
    }
  };

  const legDistricts = ['All', ...Object.keys(LD_MAPPING)];
  const districtOptions = useMemo(() => {
    return selectedLegislative !== 'All' ? ['All', ...LD_MAPPING[selectedLegislative]] : ['All'];
  }, [selectedLegislative]);

  const schoolYearOptions = useMemo(() => {
    const years = new Set<string>();
    learners.forEach(l => {
      if (l.schoolYear) years.add(l.schoolYear);
    });
    users.forEach(u => {
      if (u.schoolYear) years.add(u.schoolYear);
    });
    years.add(getAutomaticSchoolYear());
    return Array.from(years).sort().reverse();
  }, [learners, users]);

  const schoolStats = useMemo(() => {
    const schoolMap = new Map();

    const filteredLearners = learners.filter(l => l.schoolYear === selectedSchoolYear);
    const filteredAssessments = assessments.filter(a => filteredLearners.some(l => l.id === a.learnerId));

    users.filter(u => u.role === UserRole.SCHOOL_USER).forEach(schoolUser => {
      if (selectedLegislative !== 'All' && schoolUser.legislativeDistrict !== selectedLegislative) return;
      if (selectedDistrict !== 'All' && schoolUser.district !== selectedDistrict) return;

      const schoolId = schoolUser.schoolId;
      const schoolLearners = filteredLearners.filter(l => l.schoolId === schoolId);
      const schoolAssessments = filteredAssessments.filter(a => schoolLearners.some(l => l.id === a.learnerId));
      const schoolSubmissions = submissions.filter(s => s.userId === schoolUser.id && s.schoolYear === selectedSchoolYear);
      
      const isFinalized = schoolSubmissions.some(s => s.isFinalized);
      const isPreparing = schoolLearners.length > 0 && schoolAssessments.length === 0;
      const isActive = schoolAssessments.length > 0 && !isFinalized;
      const isInactive = schoolLearners.length === 0;
      
      let status: 'Finalized' | 'Active' | 'Preparing' | 'Inactive' = 'Inactive';
      if (isFinalized) status = 'Finalized';
      else if (isActive) status = 'Active';
      else if (isPreparing) status = 'Preparing';

      if (showStatusFilter !== 'All' && status !== showStatusFilter) return;

      schoolMap.set(schoolId, {
        id: schoolId,
        name: schoolUser.schoolName || `School ${schoolId}`,
        district: schoolUser.district,
        legislativeDistrict: schoolUser.legislativeDistrict,
        learnerCount: schoolLearners.length,
        assessmentCount: schoolAssessments.length,
        status,
        lastActive: schoolUser.lastActive || 0,
        avgScore: schoolAssessments.length > 0 
          ? (schoolAssessments.reduce((acc, curr) => {
              const scores = Object.values(curr.scores) as number[];
              return acc + (scores.reduce((a, b) => a + b, 0) / scores.length);
            }, 0) / schoolAssessments.length).toFixed(1)
          : '0.0'
      });
    });

    return Array.from(schoolMap.values()).sort((a, b) => b.lastActive - a.lastActive);
  }, [users, learners, assessments, submissions, selectedLegislative, selectedDistrict, showStatusFilter, selectedSchoolYear]);

  const completionData = useMemo(() => {
    const totalPossible = schoolStats.reduce((acc, s) => acc + (s.learnerCount * 3), 0);
    const filteredLearners = learners.filter(l => l.schoolYear === selectedSchoolYear);
    const completed = assessments.filter(a => 
      filteredLearners.some(l => l.id === a.learnerId) &&
      schoolStats.some(s => s.id === filteredLearners.find(l => l.id === a.learnerId)?.schoolId)
    ).length;
    const pending = Math.max(0, totalPossible - completed);

    return [
      { name: 'Completed Assessments', value: completed, fill: '#3b82f6' },
      { name: 'Pending Records', value: pending, fill: '#f1f5f9' },
    ];
  }, [schoolStats, assessments, learners, selectedSchoolYear]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-8 rounded-[40px] shadow-2xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-6">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                <Cloud className="w-6 h-6 text-white" />
                </div>
                <div>
                <h3 className="text-xl font-black uppercase tracking-tight">Cloud Database Connector</h3>
                <p className="text-blue-100 text-xs font-medium">Synchronize local records with your master Google Spreadsheet.</p>
                </div>
            </div>
            <div className="flex flex-col items-end gap-2">
                <button 
                  onClick={handleForceSync}
                  disabled={isSyncing}
                  className={`px-6 py-3 border rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 ${
                      isSyncing ? 'bg-white/5 border-white/10 text-white/50 cursor-not-allowed' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                  }`}
                >
                  {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  {isSyncing ? 'Syncing...' : 'Force Cloud Sync'}
                </button>
                {syncProgress && (
                    <span className="text-[9px] font-black uppercase text-blue-200 animate-pulse tracking-widest">{syncProgress}</span>
                )}
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input 
                type="text" 
                placeholder="Paste Web App URL (must end in /exec)" 
                className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-2xl outline-none focus:bg-white/20 transition-all text-sm font-bold placeholder:text-white/30"
                value={cloudUrl}
                onChange={(e) => setCloudUrl(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleTestConnection}
                disabled={isTesting}
                className="px-6 py-4 bg-blue-500 hover:bg-blue-400 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl flex items-center gap-2 disabled:opacity-50"
              >
                {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                Test
              </button>
              <button 
                onClick={handleSaveCloudUrl}
                className="px-6 py-4 bg-white text-blue-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-50 transition-all shadow-xl flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            </div>
          </div>
          
          <div className="mt-4 flex items-center gap-2 text-[9px] font-bold text-blue-100/60 uppercase tracking-wider">
             <AlertTriangle className="w-3 h-3" />
             Troubleshooting: Ensure script "Who has access" is set to "Anyone".
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[32px] border border-gray-200 shadow-sm flex flex-wrap gap-6 items-center">
        <div className="flex items-center gap-3">
          <Landmark className="w-5 h-5 text-blue-600" />
          <select 
            value={selectedLegislative}
            onChange={(e) => { setSelectedLegislative(e.target.value); setSelectedDistrict('All'); }}
            className="px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold"
          >
            {legDistricts.map(d => <option key={d} value={d}>{d === 'All' ? 'All Legislative Districts' : d}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <MapIcon className="w-5 h-5 text-emerald-600" />
          <select 
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            disabled={selectedLegislative === 'All'}
            className="px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-bold disabled:opacity-50"
          >
            {districtOptions.map(d => <option key={d} value={d}>{d === 'All' ? 'All Districts' : d}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <GraduationCap className="w-5 h-5 text-amber-600" />
          <select 
            value={selectedSchoolYear}
            onChange={(e) => setSelectedSchoolYear(e.target.value)}
            className="px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-sm font-bold"
          >
            {schoolYearOptions.map(sy => <option key={sy} value={sy}>SY {sy}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <Activity className="w-5 h-5 text-indigo-600" />
          <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
            {['All', 'Finalized', 'Active', 'Preparing', 'Inactive'].map((s) => (
              <button 
                key={s}
                onClick={() => setShowStatusFilter(s as any)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  showStatusFilter === s ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black flex items-center gap-3 tracking-tight">
              <Building2 className="w-6 h-6 text-blue-600" />
              School Enrollment & Performance
            </h3>
            <span className="text-xs font-bold text-gray-400">{schoolStats.length} Schools in View</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {schoolStats.map((school) => {
              const isOnline = Date.now() - school.lastActive < 300000; // 5 mins
              return (
                <div key={school.id} className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/5 transition-all group relative overflow-hidden">
                  <div className={`absolute top-0 right-0 w-24 h-24 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform ${
                    school.status === 'Finalized' ? 'bg-emerald-50' : 
                    school.status === 'Active' ? 'bg-blue-50' : 
                    school.status === 'Preparing' ? 'bg-amber-50' : 'bg-slate-50'
                  }`}></div>
                  
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className={`p-2.5 rounded-2xl ${
                      school.status === 'Finalized' ? 'bg-emerald-50' : 
                      school.status === 'Active' ? 'bg-blue-50' : 
                      school.status === 'Preparing' ? 'bg-amber-50' : 'bg-slate-50'
                    }`}>
                      {school.status === 'Finalized' ? <FileCheck className="w-6 h-6 text-emerald-600" /> : 
                       school.status === 'Active' ? <Activity className="w-6 h-6 text-blue-600" /> : 
                       school.status === 'Preparing' ? <ClipboardList className="w-6 h-6 text-amber-600" /> : 
                       <AlertCircle className="w-6 h-6 text-slate-400" />}
                    </div>
                    
                    <div className="flex flex-col items-end gap-1">
                      <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                        school.status === 'Finalized' ? 'bg-emerald-500 text-white' : 
                        school.status === 'Active' ? 'bg-blue-500 text-white' : 
                        school.status === 'Preparing' ? 'bg-amber-500 text-white' : 
                        'bg-slate-400 text-white'
                      }`}>
                        {school.status}
                      </div>
                      {school.lastActive > 0 && (
                        <div className="flex items-center gap-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                          <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">
                            {isOnline ? 'Online Now' : new Date(school.lastActive).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <h4 className="font-black text-gray-900 text-lg tracking-tight mb-1 truncate pr-4">{school.name}</h4>
                  <div className="flex items-center gap-2">
                    <Landmark className="w-3 h-3 text-gray-300" />
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{school.district}</p>
                  </div>
                  
                  <div className="mt-6 grid grid-cols-3 gap-4 border-t border-gray-100 pt-6 relative z-10">
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Learners</p>
                      <div className="flex items-center gap-1.5">
                          <Users className="w-3 h-3 text-blue-400" />
                          <p className="font-black text-gray-900 text-xs">{school.learnerCount}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Assessments</p>
                      <div className="flex items-center gap-1.5">
                          <FileCheck className="w-3 h-3 text-emerald-400" />
                          <p className="font-black text-gray-900 text-xs">{school.assessmentCount}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Avg Score</p>
                      <div className="flex items-center gap-1.5">
                          <Zap className="w-3 h-3 text-amber-400" />
                          <p className="font-black text-gray-900 text-xs">{school.avgScore}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-slate-900 rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden flex flex-col">
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600 rounded-full blur-[100px] opacity-20 -mr-24 -mt-24"></div>
          
          <h3 className="text-xl font-black mb-8 flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-blue-400" />
              District Coverage
          </h3>
          
          <div className="h-64 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={completionData} cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={8} dataKey="value" stroke="none">
                  {completionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-4xl font-black">
                    {completionData[0].value > 0 ? Math.round((completionData[0].value / (completionData[0].value + completionData[1].value)) * 100) : 0}%
                </span>
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Completed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminView;
