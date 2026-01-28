
import React, { useMemo, useState } from 'react';
import { 
  Users, 
  CheckCircle2, 
  TrendingUp, 
  AlertCircle,
  MapPin,
  Shield,
  GraduationCap,
  Building,
  User as UserIcon,
  Clock,
  Table as TableIcon,
  Filter,
  Landmark,
  Map as MapIcon
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
import { User, UserRole, Learner, Assessment } from '../types';
import { DOMAINS, PERIODS, LD_MAPPING } from '../constants';
import { STANDARD_SCORE_TABLE, SCALED_SCORE_TABLES } from '../constants/scaledScores';

interface DashboardProps {
  user: User;
  learners: Learner[];
  assessments: Assessment[];
  users: User[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1', '#06b6d4'];

const StatCard = ({ title, value, icon, color, trend, subValue }: any) => (
  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between transition-all hover:shadow-md h-full">
    <div className="flex items-start justify-between mb-4">
      <div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{title}</p>
        <h3 className="text-3xl font-black text-gray-900 tracking-tight">{value}</h3>
      </div>
      <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
        {React.cloneElement(icon, { className: `w-6 h-6 ${color.replace('bg-', 'text-')}` })}
      </div>
    </div>
    
    {subValue && (
      <div className="pt-3 border-t border-gray-50 flex gap-4">
        {subValue}
      </div>
    )}

    {trend && !subValue && (
      <div className={`flex items-center mt-2 text-[10px] font-bold ${trend.positive ? 'text-emerald-600' : 'text-red-600'}`}>
        <TrendingUp className={`w-3 h-3 mr-1 ${trend.positive ? '' : 'rotate-180'}`} />
        {trend.value}% Completion
      </div>
    )}
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ user, learners, assessments, users }) => {
  const isAdmin = user.role === UserRole.ADMIN;
  const isConsolidator = user.role === UserRole.CONSOLIDATOR;

  const [selectedLD, setSelectedLD] = useState<string>(isConsolidator ? user.legislativeDistrict || 'All' : 'All');
  const [selectedDistrict, setSelectedDistrict] = useState<string>(isConsolidator ? user.district || 'All' : 'All');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('FIRST ASSESSMENT');

  const districtOptions = useMemo(() => {
    return selectedLD !== 'All' ? LD_MAPPING[selectedLD] || [] : [];
  }, [selectedLD]);

  // Global filtering logic for the whole dashboard
  const filteredData = useMemo(() => {
    let jUsers = users;
    let jLearners = learners;

    // First apply base role restrictions
    if (user.role === UserRole.SCHOOL_USER) {
      jLearners = learners.filter(l => l.schoolId === user.schoolId);
      jUsers = users.filter(u => u.schoolId === user.schoolId);
    } else if (user.role === UserRole.CONSOLIDATOR) {
      // Consolidators are locked to their district unless they are admin-like
      jLearners = learners.filter(l => {
          const lUser = users.find(u => u.schoolId === l.schoolId);
          return lUser?.district === user.district;
      });
      jUsers = users.filter(u => u.district === user.district);
    }

    // Then apply dashboard UI filters
    if (selectedLD !== 'All') {
      jLearners = jLearners.filter(l => {
        const lUser = users.find(u => u.schoolId === l.schoolId);
        return lUser?.legislativeDistrict === selectedLD;
      });
    }
    if (selectedDistrict !== 'All') {
      jLearners = jLearners.filter(l => {
        const lUser = users.find(u => u.schoolId === l.schoolId);
        return lUser?.district === selectedDistrict;
      });
    }

    const jAssessments = assessments.filter(a => jLearners.some(l => l.id === a.learnerId));
    return { learners: jLearners, assessments: jAssessments, users: jUsers };
  }, [user, learners, assessments, users, selectedLD, selectedDistrict]);

  // Helper functions for score calculation
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
    if (score <= 119) return "Average";
    if (score <= 129) return "Slightly Advanced";
    return "Highly Advanced";
  };

  // Summary Metrics grouped by school
  const schoolMetrics = useMemo(() => {
    // Use the native global Map constructor
    const schoolsMap = new Map<string, any>();
    
    // Group learners by school for enrollment
    filteredData.learners.forEach(l => {
      const sId = l.schoolId;
      if (!schoolsMap.has(sId)) {
        const u = users.find(usr => usr.schoolId === sId);
        schoolsMap.set(sId, {
          name: u?.schoolName || sId,
          enrollment: { m: 0, f: 0 },
          tested: { m: 0, f: 0 },
          status: {
            significantDelay: { m: 0, f: 0 },
            slightDelay: { m: 0, f: 0 },
            average: { m: 0, f: 0 },
            slightlyAdvanced: { m: 0, f: 0 },
            highlyAdvanced: { m: 0, f: 0 },
          }
        });
      }
      const school = schoolsMap.get(sId);
      if (l.gender === 'Male') school.enrollment.m++;
      else school.enrollment.f++;
    });

    // Process assessments for the selected period
    filteredData.assessments.filter(a => a.period === selectedPeriod).forEach(a => {
      const learner = learners.find(l => l.id === a.learnerId);
      if (!learner || !schoolsMap.has(learner.schoolId)) return;
      
      const school = schoolsMap.get(learner.schoolId);
      const gender = learner.gender === 'Male' ? 'm' : 'f';
      school.tested[gender]++;

      const score = getStandardScore(a, learner);
      const interp = getInterpretation(score);

      if (interp === "Significant Delay") school.status.significantDelay[gender]++;
      else if (interp === "Slight Delay") school.status.slightDelay[gender]++;
      else if (interp === "Average") school.status.average[gender]++;
      else if (interp === "Slightly Advanced") school.status.slightlyAdvanced[gender]++;
      else if (interp === "Highly Advanced") school.status.highlyAdvanced[gender]++;
    });

    return Array.from(schoolsMap.values()).sort((a: any, b: any) => a.name.localeCompare(b.name));
  }, [filteredData, selectedPeriod, learners, users]);

  const stats = useMemo(() => {
    const totalLearners = filteredData.learners.length;
    const totalMales = filteredData.learners.filter(l => l.gender === 'Male').length;
    const totalFemales = filteredData.learners.filter(l => l.gender === 'Female').length;
    
    const assessedLearnerIds = new Set(filteredData.assessments.map(a => a.learnerId));
    const totalAssessments = filteredData.assessments.length;

    const schoolsWithAssessments = new Set();
    filteredData.assessments.forEach(a => {
      const learner = learners.find(l => l.id === a.learnerId);
      if (learner && learner.schoolId) schoolsWithAssessments.add(learner.schoolId);
    });
    
    const avgScore = filteredData.assessments.length > 0 
      ? (filteredData.assessments.reduce((acc, curr) => {
          const scoreValues = Object.values(curr.scores) as number[];
          return acc + (scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length);
        }, 0) / filteredData.assessments.length).toFixed(1)
      : "0.0";

    return {
      totalLearners, totalMales, totalFemales,
      assessedLearnersCount: assessedLearnerIds.size,
      totalAssessments, avgScore,
      schoolsWithAssessmentsCount: schoolsWithAssessments.size
    };
  }, [filteredData, learners]);

  const domainData = useMemo(() => {
    const domains = [
      { id: 'grossMotor', label: 'Gross Motor' },
      { id: 'fineMotor', label: 'Fine Motor' },
      { id: 'selfHelp', label: 'Self-Help' },
      { id: 'receptiveLanguage', label: 'Receptive' },
      { id: 'expressiveLanguage', label: 'Expressive' },
      { id: 'cognitive', label: 'Cognitive' },
      { id: 'socioEmotional', label: 'Socio-Emo' },
    ];

    return domains.map(d => {
      const relevantScores = filteredData.assessments.map(a => (a.scores as any)[d.id] || 0);
      const avg = relevantScores.length > 0 
        ? (relevantScores.reduce((a, b) => a + b, 0) / relevantScores.length) 
        : 0;
      return {
        name: d.label,
        value: Math.min(100, Math.round((avg / 15) * 100)) 
      };
    });
  }, [filteredData]);

  const recentActivities = useMemo(() => {
    return [...filteredData.users]
      .filter(u => u.lastActive && u.lastActive > 0)
      .sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0))
      .slice(0, 5)
      .map(u => {
        const diffMs = Date.now() - (u.lastActive || 0);
        const diffMins = Math.floor(diffMs / 60000);
        let timeLabel = "Just now";
        if (diffMins > 0 && diffMins < 60) timeLabel = `${diffMins}m ago`;
        else if (diffMins >= 60) timeLabel = `${Math.floor(diffMins / 60)}h ago`;
        return {
          id: u.id, user: u.fullName, role: u.role,
          action: "Session Active", time: timeLabel, online: diffMs < 120000
        };
      });
  }, [filteredData]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Dynamic Filter Bar */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2">
           <Filter className="w-5 h-5 text-gray-400" />
           <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Dashboard Filters</span>
        </div>
        
        <div className="h-8 w-px bg-gray-100 hidden md:block"></div>

        <div className="flex items-center gap-3">
          <Landmark className="w-4 h-4 text-blue-500" />
          <select 
            disabled={isConsolidator}
            value={selectedLD}
            onChange={(e) => { setSelectedLD(e.target.value); setSelectedDistrict('All'); }}
            className="text-sm font-bold bg-gray-50 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="All">All Legislative Districts</option>
            {Object.keys(LD_MAPPING).map(ld => <option key={ld} value={ld}>{ld}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <MapIcon className="w-4 h-4 text-emerald-500" />
          <select 
            disabled={isConsolidator}
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="text-sm font-bold bg-gray-50 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            <option value="All">All Districts</option>
            {districtOptions.map(dist => <option key={dist} value={dist}>{dist}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <Clock className="w-4 h-4 text-amber-500" />
          <select 
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="text-sm font-black bg-slate-900 text-white border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none uppercase"
          >
            {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {/* Role Header */}
      {isAdmin ? (
         <div className="bg-slate-900 rounded-[32px] border border-gray-200 shadow-sm overflow-hidden p-8 flex items-center justify-between text-white">
            <div className="flex items-center gap-6">
               <div className="p-4 bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl shadow-xl">
                  <Shield className="w-8 h-8" />
               </div>
               <div>
                  <h4 className="font-black text-2xl uppercase tracking-tight">System Administration Hub</h4>
                  <p className="text-rose-400 text-xs font-bold uppercase tracking-widest opacity-80">Monitoring across {selectedLD === 'All' ? 'All Districts' : selectedLD}</p>
               </div>
            </div>
            <div className="flex gap-12">
               <div className="text-center">
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Context</p>
                  <div className="flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                     <span className="text-sm font-bold">{selectedDistrict === 'All' ? 'Consolidated View' : selectedDistrict}</span>
                  </div>
               </div>
               <div className="text-center">
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Active Schools</p>
                  <p className="text-xl font-black">{schoolMetrics.length}</p>
               </div>
            </div>
         </div>
      ) : (
        <div className="bg-white rounded-[32px] border border-gray-200 shadow-sm overflow-hidden p-8 flex items-center justify-between">
            <div className="flex items-center gap-6">
                <div className="p-4 bg-blue-600 rounded-2xl shadow-xl shadow-blue-100">
                    <GraduationCap className="w-8 h-8 text-white" />
                </div>
                <div>
                    <h4 className="font-black text-2xl text-gray-900 uppercase tracking-tight">
                        {isConsolidator ? 'District Performance Monitoring' : 'School Management Portal'}
                    </h4>
                    <p className="text-blue-500 text-xs font-bold uppercase tracking-widest">{user.schoolName || user.district}</p>
                </div>
            </div>
            <div className="flex gap-10">
                <div className="text-right">
                    <p className="text-gray-400 text-[10px] font-black uppercase mb-1">Jurisdiction</p>
                    <p className="text-sm font-black text-gray-900">{user.legislativeDistrict}</p>
                </div>
                <div className="text-right">
                    <p className="text-gray-400 text-[10px] font-black uppercase mb-1">Status</p>
                    <p className="text-sm font-black text-emerald-600">Authorized</p>
                </div>
            </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Learners Enrolled" 
          value={stats.totalLearners.toLocaleString()} 
          icon={<Users />} 
          color="bg-blue-600"
          subValue={
            <>
               <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-gray-400 uppercase">Males</span>
                  <span className="text-xs font-black text-blue-600">{stats.totalMales}</span>
               </div>
               <div className="w-px h-6 bg-gray-100"></div>
               <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-gray-400 uppercase">Females</span>
                  <span className="text-xs font-black text-pink-600">{stats.totalFemales}</span>
               </div>
            </>
          }
        />
        <StatCard 
          title={isAdmin ? "Participating Schools" : "Students Assessed"} 
          value={isAdmin ? stats.schoolsWithAssessmentsCount.toLocaleString() : stats.assessedLearnersCount.toLocaleString()} 
          icon={<CheckCircle2 />} 
          color="bg-emerald-600"
        />
        <StatCard 
          title="Avg. Domain Score" 
          value={`${stats.avgScore}`} 
          icon={<TrendingUp />} 
          color="bg-purple-600"
        />
        <StatCard 
          title="System Interactions" 
          value={stats.totalAssessments.toLocaleString()} 
          icon={<AlertCircle />} 
          color="bg-amber-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <h3 className="font-black text-gray-900 flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Domain Proficiency Profile
            </h3>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">Aggregated Progress (%)</span>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={domainData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'black' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} unit="%" />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.15)' }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={40}>
                  {domainData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-black text-gray-900 flex items-center gap-3">
                <Clock className="w-5 h-5 text-blue-600" />
                Regional User Activity
            </h3>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          </div>
          <div className="space-y-6">
            {recentActivities.map((act) => (
              <div key={act.id} className="flex gap-4 group transition-all duration-300">
                <div className="relative shrink-0">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg text-white shadow-lg transition-transform group-hover:scale-105 ${
                    act.role === UserRole.ADMIN ? 'bg-gradient-to-br from-red-500 to-rose-600' :
                    act.role === UserRole.CONSOLIDATOR ? 'bg-gradient-to-br from-indigo-500 to-blue-600' : 
                    'bg-gradient-to-br from-blue-500 to-indigo-600'
                  }`}>
                    {act.user[0]}
                  </div>
                  {act.online && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-[3px] border-white rounded-full" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-black text-gray-900 truncate pr-2 tracking-tight">{act.user}</p>
                    <span className="text-[9px] font-black text-gray-400 whitespace-nowrap bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">{act.time}</span>
                  </div>
                  <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest mt-0.5">{act.action}</p>
                </div>
              </div>
            ))}
            {recentActivities.length === 0 && (
              <div className="py-24 text-center space-y-3 opacity-30">
                 <UserIcon className="w-12 h-12 text-gray-400 mx-auto" />
                 <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">Idle Network</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CONSOLIDATED SUMMARY TABLE SECTION */}
      <div className="bg-white border-2 border-black overflow-hidden shadow-2xl rounded-sm">
        <div className="p-5 bg-slate-900 flex items-center justify-between border-b-2 border-black">
            <div className="flex items-center gap-4">
                <TableIcon className="w-6 h-6 text-white" />
                <div>
                  <h3 className="font-black text-white text-sm uppercase tracking-widest leading-none">Consolidated Summary Performance Report</h3>
                  <p className="text-blue-400 text-[10px] font-bold uppercase mt-1">Status: {selectedPeriod} Summary</p>
                </div>
            </div>
            <div className="flex items-center gap-6">
               <div className="text-right">
                  <p className="text-slate-500 text-[9px] font-black uppercase">Schools Logged</p>
                  <p className="text-white text-xs font-black">{schoolMetrics.length}</p>
               </div>
               <button onClick={() => window.print()} className="bg-white text-slate-900 px-6 py-2 rounded-lg text-xs font-black uppercase hover:bg-gray-100 transition-all shadow-lg">Print Summary</button>
            </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] text-center border-collapse">
            <thead>
              <tr className="border-b-2 border-black bg-white">
                <th className="border-r-2 border-black px-1 py-4 w-10 font-black" rowSpan={2}>No.</th>
                <th className="border-r-2 border-black px-3 py-4 min-w-[180px] font-black" rowSpan={2}>School</th>
                <th className="border-r-2 border-black px-3 py-4 min-w-[120px] font-black" rowSpan={2}>Assessment Period</th>
                <th className="border-r-2 border-black px-1 py-4 font-black" colSpan={3}>Enrollment</th>
                <th className="border-r-2 border-black px-1 py-4 font-black" colSpan={3}>No of Pupils Tested</th>
                <th className="border-r-2 border-black px-1 py-4 font-black leading-tight" colSpan={3}>Significant Delay In<br/>Overall Development</th>
                <th className="border-r-2 border-black px-1 py-4 font-black leading-tight" colSpan={3}>Slightly Delay In<br/>Overall Development</th>
                <th className="border-r-2 border-black px-1 py-4 font-black leading-tight" colSpan={3}>Average Overall<br/>Development</th>
                <th className="border-r-2 border-black px-1 py-4 font-black leading-tight" colSpan={3}>Slightly Advance<br/>Development</th>
                <th className="px-1 py-4 font-black leading-tight" colSpan={3}>Highly Advance<br/>Development</th>
              </tr>
              <tr className="border-b-2 border-black bg-white font-black text-[9px]">
                {/* Headers Repeat for M, F, T */}
                {[...Array(7)].map((_, i) => (
                   <React.Fragment key={i}>
                      <th className="border-r border-black px-1 py-1 w-7">M</th>
                      <th className="border-r border-black px-1 py-1 w-7">F</th>
                      <th className={`px-1 py-1 w-9 bg-amber-400 ${i === 6 ? '' : 'border-r-2 border-black'}`}>T</th>
                   </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y border-b border-black">
              {schoolMetrics.map((row: any, idx) => (
                <tr key={idx} className="border-b border-black font-bold text-slate-800 hover:bg-blue-50/50">
                  <td className="border-r-2 border-black px-1 py-2">{idx + 1}</td>
                  <td className="border-r-2 border-black px-3 py-2 text-left uppercase font-black text-[9px] truncate max-w-[180px]">{row.name}</td>
                  <td className="border-r-2 border-black px-3 py-2 text-left uppercase font-black text-[9px]">{selectedPeriod} SUMMARY</td>
                  
                  {/* Enrollment */}
                  <td className="border-r border-black px-1 py-2">{row.enrollment.m}</td>
                  <td className="border-r border-black px-1 py-2">{row.enrollment.f}</td>
                  <td className="border-r-2 border-black px-1 py-2 bg-amber-400/30 font-black">{row.enrollment.m + row.enrollment.f}</td>
                  
                  {/* Tested */}
                  <td className="border-r border-black px-1 py-2">{row.tested.m}</td>
                  <td className="border-r border-black px-1 py-2">{row.tested.f}</td>
                  <td className="border-r-2 border-black px-1 py-2 bg-amber-400/30 font-black">{row.tested.m + row.tested.f}</td>
                  
                  {/* Significant Delay */}
                  <td className="border-r border-black px-1 py-2">{row.status.significantDelay.m}</td>
                  <td className="border-r border-black px-1 py-2">{row.status.significantDelay.f}</td>
                  <td className="border-r-2 border-black px-1 py-2 bg-amber-400/30 font-black">{row.status.significantDelay.m + row.status.significantDelay.f}</td>
                  
                  {/* Slight Delay */}
                  <td className="border-r border-black px-1 py-2">{row.status.slightDelay.m}</td>
                  <td className="border-r border-black px-1 py-2">{row.status.slightDelay.f}</td>
                  <td className="border-r-2 border-black px-1 py-2 bg-amber-400/30 font-black">{row.status.slightDelay.m + row.status.slightDelay.f}</td>
                  
                  {/* Average */}
                  <td className="border-r border-black px-1 py-2">{row.status.average.m}</td>
                  <td className="border-r border-black px-1 py-2">{row.status.average.f}</td>
                  <td className="border-r-2 border-black px-1 py-2 bg-amber-400/30 font-black">{row.status.average.m + row.status.average.f}</td>
                  
                  {/* Slightly Advanced */}
                  <td className="border-r border-black px-1 py-2">{row.status.slightlyAdvanced.m}</td>
                  <td className="border-r border-black px-1 py-2">{row.status.slightlyAdvanced.f}</td>
                  <td className="border-r-2 border-black px-1 py-2 bg-amber-400/30 font-black">{row.status.slightlyAdvanced.m + row.status.slightlyAdvanced.f}</td>
                  
                  {/* Highly Advanced */}
                  <td className="border-r border-black px-1 py-2">{row.status.highlyAdvanced.m}</td>
                  <td className="border-r border-black px-1 py-2">{row.status.highlyAdvanced.f}</td>
                  <td className="px-1 py-2 bg-amber-400/30 font-black">{row.status.highlyAdvanced.m + row.status.highlyAdvanced.f}</td>
                </tr>
              ))}
              {schoolMetrics.length === 0 && (
                <tr>
                   <td colSpan={24} className="py-20 text-center text-gray-400 font-black uppercase tracking-[0.2em] opacity-30">No school data found for this selection</td>
                </tr>
              )}
            </tbody>
            {schoolMetrics.length > 0 && (
                <tfoot className="bg-white border-t-2 border-black font-black text-slate-900">
                    <tr className="border-b-2 border-black">
                        <td className="border-r-2 border-black px-4 py-3 text-left uppercase text-xs" colSpan={3}>Grand Total</td>
                        {/* Enrollment */}
                        <td className="border-r border-black">{schoolMetrics.reduce((a, r: any) => a + r.enrollment.m, 0)}</td>
                        <td className="border-r border-black">{schoolMetrics.reduce((a, r: any) => a + r.enrollment.f, 0)}</td>
                        <td className="border-r-2 border-black bg-amber-400">{schoolMetrics.reduce((a, r: any) => a + r.enrollment.m + r.enrollment.f, 0)}</td>
                        {/* Tested */}
                        <td className="border-r border-black">{schoolMetrics.reduce((a, r: any) => a + r.tested.m, 0)}</td>
                        <td className="border-r border-black">{schoolMetrics.reduce((a, r: any) => a + r.tested.f, 0)}</td>
                        <td className="border-r-2 border-black bg-amber-400">{schoolMetrics.reduce((a, r: any) => a + r.tested.m + r.tested.f, 0)}</td>
                        {/* Sig Delay */}
                        <td className="border-r border-black">{schoolMetrics.reduce((a, r: any) => a + r.status.significantDelay.m, 0)}</td>
                        <td className="border-r border-black">{schoolMetrics.reduce((a, r: any) => a + r.status.significantDelay.f, 0)}</td>
                        <td className="border-r-2 border-black bg-amber-400">{schoolMetrics.reduce((a, r: any) => a + r.status.significantDelay.m + r.status.significantDelay.f, 0)}</td>
                        {/* Slight Delay */}
                        <td className="border-r border-black">{schoolMetrics.reduce((a, r: any) => a + r.status.slightDelay.m, 0)}</td>
                        <td className="border-r border-black">{schoolMetrics.reduce((a, r: any) => a + r.status.slightDelay.f, 0)}</td>
                        <td className="border-r-2 border-black bg-amber-400">{schoolMetrics.reduce((a, r: any) => a + r.status.slightDelay.m + r.status.slightDelay.f, 0)}</td>
                        {/* Average */}
                        <td className="border-r border-black">{schoolMetrics.reduce((a, r: any) => a + r.status.average.m, 0)}</td>
                        <td className="border-r border-black">{schoolMetrics.reduce((a, r: any) => a + r.status.average.f, 0)}</td>
                        <td className="border-r-2 border-black bg-amber-400">{schoolMetrics.reduce((a, r: any) => a + r.status.average.m + r.status.average.f, 0)}</td>
                        {/* Slight Advance */}
                        <td className="border-r border-black">{schoolMetrics.reduce((a, r: any) => a + r.status.slightlyAdvanced.m, 0)}</td>
                        <td className="border-r border-black">{schoolMetrics.reduce((a, r: any) => a + r.status.slightlyAdvanced.f, 0)}</td>
                        <td className="border-r-2 border-black bg-amber-400">{schoolMetrics.reduce((a, r: any) => a + r.status.slightlyAdvanced.m + r.status.slightlyAdvanced.f, 0)}</td>
                        {/* High Advance */}
                        <td className="border-r border-black">{schoolMetrics.reduce((a, r: any) => a + r.status.highlyAdvanced.m, 0)}</td>
                        <td className="border-r border-black">{schoolMetrics.reduce((a, r: any) => a + r.status.highlyAdvanced.f, 0)}</td>
                        <td className="bg-amber-400">{schoolMetrics.reduce((a, r: any) => a + r.status.highlyAdvanced.m + r.status.highlyAdvanced.f, 0)}</td>
                    </tr>
                </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
