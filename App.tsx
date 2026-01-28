
import React, { useState, useEffect, useMemo } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import LearnerList from './components/LearnerList';
import AssessmentForm from './components/AssessmentForm';
import AdminView from './components/AdminView';
import ECCDCard from './components/ECCDCard';
import MasterRecords from './components/MasterRecords';
import AssessmentView from './components/AssessmentView';
import ReportView from './components/ReportView';
import LearnerModal from './components/LearnerModal';
import { User, UserRole, UserStatus, Learner, Assessment } from './types';
import { LD_MAPPING } from './constants';
import { getAIInsights } from './services/gemini';
import { Printer, ArrowLeft, BrainCircuit, School, Pencil, Trash2, UserMinus, Ban, ChevronDown, Check, X as CloseIcon, UserCheck, Shield, GraduationCap, Building, User as UserIcon, Key, Eye, EyeOff, Circle } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [learners, setLearners] = useState<Learner[]>(() => {
    const saved = localStorage.getItem('eccd_learners');
    return saved ? JSON.parse(saved) : [];
  });
  const [assessments, setAssessments] = useState<Assessment[]>(() => {
    const saved = localStorage.getItem('eccd_assessments');
    return saved ? JSON.parse(saved) : [];
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('eccd_users');
    if (saved) return JSON.parse(saved);
    return [{
      id: 'u-admin',
      username: 'admin',
      password: 'password',
      fullName: 'System Administrator',
      designation: 'Administrator',
      role: UserRole.ADMIN,
      status: UserStatus.APPROVED,
      lastActive: Date.now()
    }];
  });

  // Filter lists based on jurisdiction for safety/privacy - MOVED TO TOP to fix Hook Violation
  const jLearners = useMemo(() => {
    if (!user) return [];
    if (user.role === UserRole.ADMIN) return learners;
    if (user.role === UserRole.CONSOLIDATOR) {
        // Consolidators see all learners for now as district mapping is implicit
        return learners;
    }
    return learners.filter(l => l.schoolId === user.schoolId);
  }, [learners, user]);

  const jAssessments = useMemo(() => {
    if (!user) return [];
    return assessments.filter(a => jLearners.some(l => l.id === a.learnerId));
  }, [assessments, jLearners, user]);

  // Track activity for the current user
  useEffect(() => {
    if (!user) return;

    const updateActivity = () => {
      const now = Date.now();
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, lastActive: now } : u));
    };

    updateActivity(); 
    const interval = setInterval(updateActivity, 30000); 

    return () => clearInterval(interval);
  }, [user?.id]);

  const [selectedLearner, setSelectedLearner] = useState<Learner | null>(null);
  const [isAddingAssessment, setIsAddingAssessment] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null);
  const [targetPeriod, setTargetPeriod] = useState<string>('FIRST ASSESSMENT');
  const [editingLearner, setEditingLearner] = useState<Learner | null>(null);
  const [isAddingLearner, setIsAddingLearner] = useState(false);
  
  const [showPrintPreview, setShowPrintPreview] = useState<Assessment | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [signupSuccess, setSignupSuccess] = useState('');

  const [signupData, setSignupData] = useState({
    username: '',
    password: '',
    fullName: '',
    designation: '',
    legislativeDistrict: '',
    district: '',
    schoolName: '',
    schoolId: '',
    districtSupervisorName: '',
    districtSupervisorDesignation: '',
    kindergartenCoordinatorName: '',
    kindergartenCoordinatorDesignation: '',
    schoolHeadName: '',
    schoolHeadDesignation: '',
    role: UserRole.SCHOOL_USER
  });

  const [loginData, setLoginData] = useState({
    username: '',
    password: ''
  });

  const districtOptions = useMemo(() => {
    return signupData.legislativeDistrict ? LD_MAPPING[signupData.legislativeDistrict] || [] : [];
  }, [signupData.legislativeDistrict]);

  const teacherOptions = [
    'Teacher I', 'Teacher II', 'Teacher III', 'Teacher IV', 'Teacher V', 'Teacher VI', 'Teacher VII',
    'Master Teacher I', 'Master Teacher II', 'Master Teacher III', 'Master Teacher IV', 'Master Teacher V'
  ];

  const headTeacherOptions = [
    'Head Teacher I', 'Head Teacher II', 'Head Teacher III', 'Head Teacher IV', 'Head Teacher V', 'Head Teacher VI', 'Head Teacher VII'
  ];

  const principalOptions = [
    'Principal I', 'Principal II', 'Principal III', 'Principal IV', 'Principal V'
  ];

  const masterTeacherOptions = [
    'Master Teacher I', 'Master Teacher II', 'Master Teacher III', 'Master Teacher IV', 'Master Teacher V'
  ];

  const currentRoleDesignations = signupData.role === UserRole.SCHOOL_USER 
    ? teacherOptions 
    : [...teacherOptions, ...headTeacherOptions];

  const supervisorCoordinatorDesignations = [...masterTeacherOptions, ...principalOptions];
  
  const schoolHeadDesignationOptions = [...teacherOptions, ...headTeacherOptions, ...principalOptions];

  useEffect(() => {
    localStorage.setItem('eccd_learners', JSON.stringify(learners));
    localStorage.setItem('eccd_assessments', JSON.stringify(assessments));
    localStorage.setItem('eccd_users', JSON.stringify(users));
  }, [learners, assessments, users]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const foundUser = users.find(u => u.username === loginData.username && u.password === loginData.password);
    if (!foundUser) {
      setLoginError('Invalid credentials.');
      return;
    }
    if (foundUser.status === UserStatus.PENDING) {
      setLoginError('Your account is awaiting approval.');
      return;
    }
    if (foundUser.status === UserStatus.REJECTED) {
      setLoginError('Your account registration was rejected.');
      return;
    }
    
    const updatedUser = { ...foundUser, lastActive: Date.now() };
    setUsers(prev => prev.map(u => u.id === foundUser.id ? updatedUser : u));
    setUser(updatedUser);
    setActiveTab('dashboard');
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const existing = users.find(u => u.username === signupData.username);
    if (existing) {
      alert("Username already taken.");
      return;
    }

    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      username: signupData.username,
      password: signupData.password,
      fullName: signupData.fullName,
      designation: signupData.designation,
      role: signupData.role,
      status: UserStatus.PENDING,
      lastActive: 0,
      legislativeDistrict: signupData.legislativeDistrict,
      district: signupData.district,
      schoolId: signupData.schoolId, // Ensure schoolId is set from signup for filtering
      ...(signupData.role === UserRole.SCHOOL_USER ? {
        schoolName: signupData.schoolName,
        schoolHeadName: signupData.schoolHeadName,
        schoolHeadDesignation: signupData.schoolHeadDesignation
      } : {
        districtSupervisorName: signupData.districtSupervisorName,
        districtSupervisorDesignation: signupData.districtSupervisorDesignation,
        kindergartenCoordinatorName: signupData.kindergartenCoordinatorName,
        kindergartenCoordinatorDesignation: signupData.kindergartenCoordinatorDesignation
      })
    };

    setUsers(prev => [...prev, newUser]);
    setSignupSuccess('Signup successful! Awaiting district approval.');
    setIsRegistering(false);
    setSignupData({
      username: '', password: '', fullName: '', designation: '', legislativeDistrict: '', district: '', 
      schoolName: '', schoolId: '', districtSupervisorName: '', districtSupervisorDesignation: '',
      kindergartenCoordinatorName: '', kindergartenCoordinatorDesignation: '', 
      schoolHeadName: '', schoolHeadDesignation: '', role: UserRole.SCHOOL_USER
    });
  };

  const handleApproveUser = (userId: string, approve: boolean) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: approve ? UserStatus.APPROVED : UserStatus.REJECTED } : u));
  };

  const managedUsers = users.filter(u => {
    const isTargetStatus = u.status === UserStatus.PENDING || u.status === UserStatus.APPROVED;
    if (!isTargetStatus) return false;
    if (u.id === user?.id) return false;
    if (user?.role === UserRole.ADMIN) return u.role !== UserRole.ADMIN;
    if (user?.role === UserRole.CONSOLIDATOR) return u.district === user.district && u.role !== UserRole.ADMIN;
    return false;
  });

  const isOnline = (lastActive?: number) => {
    if (!lastActive) return false;
    return (Date.now() - lastActive) < 120000;
  };

  const inputClasses = "w-full bg-[#374151]/50 border border-white/5 rounded-2xl px-6 py-4 text-white placeholder-gray-500 focus:bg-[#374151] focus:ring-2 focus:ring-blue-500/50 outline-none transition-all text-sm appearance-none";
  const labelClasses = "block text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2";

  if (!user) {
    return (
      <div className="min-h-screen bg-[#1E2530] flex items-center justify-center p-6 font-sans relative overflow-hidden">
        <div className="absolute top-0 -left-20 w-96 h-96 bg-blue-600 rounded-full blur-[120px] opacity-10 animate-pulse"></div>
        <div className="absolute bottom-0 -right-20 w-96 h-96 bg-emerald-600 rounded-full blur-[120px] opacity-5 animate-pulse delay-700"></div>

        <div className={`bg-[#2D3748]/50 backdrop-blur-xl rounded-[40px] shadow-2xl p-10 md:p-12 ${isRegistering ? 'max-w-6xl' : 'max-w-md'} w-full space-y-8 relative border border-white/5 overflow-hidden transition-all duration-500`}>
          <div className="text-center">
            <div className="w-20 h-20 bg-blue-600 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-2xl shadow-blue-500/20 rotate-3 hover:rotate-0 transition-transform duration-300">
              <School className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">ECCD <span className="text-blue-500">PRO</span></h1>
            <p className="text-gray-400 mt-1 font-semibold uppercase tracking-[0.3em] text-[9px]">Early Childhood Care and Development</p>
          </div>

          {signupSuccess && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-2xl text-sm text-center font-medium">
              {signupSuccess}
              <button onClick={() => setSignupSuccess('')} className="block w-full mt-2 font-black uppercase text-[10px] tracking-widest text-emerald-300">Dismiss</button>
            </div>
          )}

          {isRegistering ? (
            <form onSubmit={handleRegister} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col items-center">
                <label className={labelClasses}>Select User Role</label>
                <div className="flex gap-4 w-full max-w-md">
                  <button type="button" onClick={() => setSignupData({...signupData, role: UserRole.SCHOOL_USER, designation: ''})} className={`flex-1 py-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all ${signupData.role === UserRole.SCHOOL_USER ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-[#374151]/30 border-white/5 text-gray-400 hover:bg-[#374151]'}`}>School User</button>
                  <button type="button" onClick={() => setSignupData({...signupData, role: UserRole.CONSOLIDATOR, designation: ''})} className={`flex-1 py-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all ${signupData.role === UserRole.CONSOLIDATOR ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-[#374151]/30 border-white/5 text-gray-400 hover:bg-[#374151]'}`}>Consolidator</button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className={labelClasses}>Username</label>
                  <input required type="text" placeholder="Account name" value={signupData.username} onChange={(e) => setSignupData({...signupData, username: e.target.value})} className={inputClasses} />
                </div>
                <div className="space-y-2">
                  <label className={labelClasses}>Password</label>
                  <input required type="password" placeholder="........" value={signupData.password} onChange={(e) => setSignupData({...signupData, password: e.target.value})} className={inputClasses} />
                </div>
                <div className="space-y-2">
                  <label className={labelClasses}>{signupData.role === UserRole.SCHOOL_USER ? 'Fullname (Teacher/User)' : 'Fullname (Consolidator)'}</label>
                  <input required type="text" placeholder="Last Name, First Name" value={signupData.fullName} onChange={(e) => setSignupData({...signupData, fullName: e.target.value})} className={inputClasses} />
                </div>
                <div className="space-y-2 relative">
                  <label className={labelClasses}>Designation</label>
                  <select required value={signupData.designation} onChange={(e) => setSignupData({...signupData, designation: e.target.value})} className={inputClasses}>
                    <option value="" disabled className="bg-[#1E2530]">Select Designation</option>
                    {currentRoleDesignations.map(opt => <option key={opt} value={opt} className="bg-[#1E2530]">{opt}</option>)}
                  </select>
                  <ChevronDown className="absolute right-5 bottom-4 w-5 h-5 text-gray-500 pointer-events-none" />
                </div>
                <div className="space-y-2 relative">
                  <label className={labelClasses}>Legislative District</label>
                  <select required value={signupData.legislativeDistrict} onChange={(e) => setSignupData({...signupData, legislativeDistrict: e.target.value, district: ''})} className={inputClasses}>
                    <option value="" disabled className="bg-[#1E2530]">Select LD</option>
                    {Object.keys(LD_MAPPING).map(ld => <option key={ld} value={ld} className="bg-[#1E2530]">{ld}</option>)}
                  </select>
                  <ChevronDown className="absolute right-5 bottom-4 w-5 h-5 text-gray-500 pointer-events-none" />
                </div>
                <div className="space-y-2 relative">
                  <label className={labelClasses}>District</label>
                  <select required value={signupData.district} onChange={(e) => setSignupData({...signupData, district: e.target.value})} className={`${inputClasses} ${!signupData.legislativeDistrict ? 'opacity-50' : ''}`} disabled={!signupData.legislativeDistrict}>
                    <option value="" disabled className="bg-[#1E2530]">Select District</option>
                    {districtOptions.map(dist => <option key={dist} value={dist} className="bg-[#1E2530]">{dist}</option>)}
                  </select>
                  <ChevronDown className="absolute right-5 bottom-4 w-5 h-5 text-gray-500 pointer-events-none" />
                </div>

                {signupData.role === UserRole.SCHOOL_USER ? (
                  <>
                    <div className="space-y-2">
                      <label className={labelClasses}>School Name</label>
                      <input required type="text" placeholder="Full school name" value={signupData.schoolName} onChange={(e) => setSignupData({...signupData, schoolName: e.target.value})} className={inputClasses} />
                    </div>
                    <div className="space-y-2">
                      <label className={labelClasses}>School ID</label>
                      <input required type="text" placeholder="e.g. 102931" value={signupData.schoolId} onChange={(e) => setSignupData({...signupData, schoolId: e.target.value})} className={inputClasses} />
                    </div>
                    <div className="space-y-2">
                      <label className={labelClasses}>School Head Fullname</label>
                      <input required type="text" placeholder="Fullname of Principal/Head" value={signupData.schoolHeadName} onChange={(e) => setSignupData({...signupData, schoolHeadName: e.target.value})} className={inputClasses} />
                    </div>
                    <div className="space-y-2 relative">
                      <label className={labelClasses}>School Head Designation</label>
                      <select required value={signupData.schoolHeadDesignation} onChange={(e) => setSignupData({...signupData, schoolHeadDesignation: e.target.value})} className={inputClasses}>
                        <option value="" disabled className="bg-[#1E2530]">Select Designation</option>
                        {schoolHeadDesignationOptions.map(opt => <option key={opt} value={opt} className="bg-[#1E2530]">{opt}</option>)}
                      </select>
                      <ChevronDown className="absolute right-5 bottom-4 w-5 h-5 text-gray-500 pointer-events-none" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className={labelClasses}>District Supervisor Fullname</label>
                      <input required type="text" placeholder="Supervisor Name" value={signupData.districtSupervisorName} onChange={(e) => setSignupData({...signupData, districtSupervisorName: e.target.value})} className={inputClasses} />
                    </div>
                    <div className="space-y-2 relative">
                      <label className={labelClasses}>Supervisor Designation</label>
                      <select required value={signupData.districtSupervisorDesignation} onChange={(e) => setSignupData({...signupData, districtSupervisorDesignation: e.target.value})} className={inputClasses}>
                        <option value="" disabled className="bg-[#1E2530]">Select Designation</option>
                        {supervisorCoordinatorDesignations.map(opt => <option key={opt} value={opt} className="bg-[#1E2530]">{opt}</option>)}
                      </select>
                      <ChevronDown className="absolute right-5 bottom-4 w-5 h-5 text-gray-500 pointer-events-none" />
                    </div>
                    <div className="space-y-2">
                      <label className={labelClasses}>Kindergarten Coordinator Fullname</label>
                      <input required type="text" placeholder="Coordinator Name" value={signupData.kindergartenCoordinatorName} onChange={(e) => setSignupData({...signupData, kindergartenCoordinatorName: e.target.value})} className={inputClasses} />
                    </div>
                    <div className="space-y-2 relative">
                      <label className={labelClasses}>Coordinator Designation</label>
                      <select required value={signupData.kindergartenCoordinatorDesignation} onChange={(e) => setSignupData({...signupData, kindergartenCoordinatorDesignation: e.target.value})} className={inputClasses}>
                        <option value="" disabled className="bg-[#1E2530]">Select Designation</option>
                        {supervisorCoordinatorDesignations.map(opt => <option key={opt} value={opt} className="bg-[#1E2530]">{opt}</option>)}
                      </select>
                      <ChevronDown className="absolute right-5 bottom-4 w-5 h-5 text-gray-500 pointer-events-none" />
                    </div>
                  </>
                )}
              </div>

              <div className="pt-4 flex flex-col items-center gap-4">
                <button type="submit" className="w-full max-w-sm py-5 bg-blue-600 text-white rounded-[24px] font-black text-sm uppercase tracking-widest hover:bg-blue-500 shadow-2xl shadow-blue-600/20 transition-all">Register Account</button>
                <button type="button" onClick={() => setIsRegistering(false)} className="text-xs text-gray-500 hover:text-blue-500 font-black uppercase tracking-widest transition-colors">Already have an account? Sign in</button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-6 max-w-sm mx-auto">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className={labelClasses}>Username</label>
                  <input required type="text" placeholder="Username" value={loginData.username} onChange={(e) => setLoginData({...loginData, username: e.target.value})} className={inputClasses} />
                </div>
                <div className="space-y-1">
                  <label className={labelClasses}>Password</label>
                  <input required type="password" placeholder="Password" value={loginData.password} onChange={(e) => setLoginData({...loginData, password: e.target.value})} className={inputClasses} />
                </div>
              </div>
              {loginError && <p className="text-rose-400 text-xs font-bold text-center">{loginError}</p>}
              <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-[24px] font-black text-sm uppercase tracking-widest hover:bg-blue-500 transition-all">Secure Login</button>
              <div className="pt-6 border-t border-white/5">
                <button type="button" onClick={() => setIsRegistering(true)} className="w-full py-5 bg-white/5 text-white rounded-[24px] font-black text-sm uppercase tracking-widest border border-white/10 hover:border-blue-500 transition-all">Signup User</button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  const handleDeleteLearner = (id: string) => {
    if (!id) return;
    if (window.confirm("Confirm delete learner? All associated assessments and developmental records will be permanently lost.")) {
      setLearners(prev => prev.filter(l => l.id !== id));
      setAssessments(prev => prev.filter(a => a.learnerId !== id));
      if (selectedLearner?.id === id) {
        setSelectedLearner(null);
      }
    }
  };

  const handleEditLearner = (l: Learner) => {
    setEditingLearner(l);
  };

  return (
    <Layout user={user} onLogout={() => setUser(null)} activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'dashboard' && <Dashboard user={user} learners={jLearners} assessments={jAssessments} users={users} />}
      
      {activeTab === 'approvals' && (
        <div className="space-y-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-50 rounded-2xl text-blue-600"><UserCheck className="w-6 h-6" /></div>
            <div>
              <h3 className="text-xl font-black text-gray-900">User Management & Approvals</h3>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{user.role === UserRole.ADMIN ? 'System Administrator' : `District Consolidator for ${user.district}`}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6">
            {managedUsers.map(p => {
              const userOnline = isOnline(p.lastActive);
              return (
                <div key={p.id} className={`bg-white p-8 rounded-[32px] border transition-all duration-300 shadow-sm hover:shadow-xl ${p.status === UserStatus.PENDING ? 'border-amber-200 bg-amber-50/20' : 'border-gray-100'}`}>
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
                    <div className="flex items-start gap-6 flex-1">
                      <div className="relative shrink-0">
                        <div className={`w-16 h-16 rounded-3xl flex items-center justify-center font-black text-xl shadow-lg ${p.role === UserRole.CONSOLIDATOR ? 'bg-indigo-600 text-white' : 'bg-blue-600 text-white'}`}>
                          {p.role === UserRole.CONSOLIDATOR ? <Shield className="w-8 h-8" /> : <GraduationCap className="w-8 h-8" />}
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-white ${userOnline ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                      </div>
                      <div className="space-y-3 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <h4 className="font-black text-gray-900 text-xl tracking-tight">{p.fullName}</h4>
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border tracking-widest ${p.role === UserRole.CONSOLIDATOR ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>{p.role}</span>
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border tracking-widest ${p.status === UserStatus.PENDING ? 'bg-amber-100 text-amber-600 border-amber-200' : 'bg-emerald-100 text-emerald-600 border-emerald-200'}`}>{p.status}</span>
                          <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase border tracking-widest ${userOnline ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                            <Circle className={`w-2 h-2 fill-current ${userOnline ? 'animate-pulse' : ''}`} />
                            {userOnline ? 'Active Now' : 'Offline'}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3">
                          <div className="space-y-1">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Designation</p>
                              <p className="text-sm font-bold text-blue-600">{p.designation}</p>
                          </div>
                          <div className="space-y-1">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">District Jurisdiction</p>
                              <p className="text-sm font-bold text-gray-700">{p.legislativeDistrict} • {p.district}</p>
                          </div>
                          <div className="space-y-1 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                              <div className="flex items-center gap-2 mb-1">
                                  <Key className="w-3.5 h-3.5 text-slate-400" />
                                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Credentials</p>
                              </div>
                              <p className="text-xs font-bold text-slate-800">User: <span className="text-blue-600">@{p.username}</span></p>
                              <p className="text-xs font-bold text-slate-800 mt-0.5">Pass: <span className="font-mono text-emerald-600 tracking-tighter">{p.password}</span></p>
                          </div>
                        </div>

                        {p.role === UserRole.SCHOOL_USER ? (
                          <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                             <div className="flex items-center gap-4">
                                <p className="text-[11px] font-bold text-slate-600 uppercase flex items-center gap-2"><Building className="w-4 h-4 text-blue-500" /> {p.schoolName} (ID: {p.schoolId})</p>
                             </div>
                             <p className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-2"><UserIcon className="w-4 h-4 text-slate-400" /> Head: {p.schoolHeadName} <span className="text-[9px] text-slate-400">({p.schoolHeadDesignation})</span></p>
                          </div>
                        ) : (
                          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">District Supervisor</p>
                               <p className="text-[11px] font-bold text-slate-700 flex items-center gap-2"><Shield className="w-4 h-4 text-indigo-400" /> {p.districtSupervisorName} <span className="text-[9px] text-slate-400 italic">({p.districtSupervisorDesignation})</span></p>
                            </div>
                            <div className="space-y-1">
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kindergarten Coordinator</p>
                               <p className="text-[11px] font-bold text-slate-700 flex items-center gap-2"><GraduationCap className="w-4 h-4 text-blue-400" /> {p.kindergartenCoordinatorName} <span className="text-[9px] text-slate-400 italic">({p.kindergartenCoordinatorDesignation})</span></p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {p.status === UserStatus.PENDING ? (
                          <>
                              <button onClick={() => handleApproveUser(p.id, false)} className="px-6 py-4 text-rose-500 hover:bg-rose-50 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest" title="Reject Account">Reject</button>
                              <button onClick={() => handleApproveUser(p.id, true)} className="flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-[20px] font-black text-[10px] uppercase tracking-[0.15em] hover:bg-blue-700 shadow-xl shadow-blue-600/20 transition-all"><Check className="w-4 h-4" /> Approve Account</button>
                          </>
                      ) : (
                          <div className="flex flex-col items-end gap-2">
                               <span className="flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase tracking-widest px-4 py-2 bg-emerald-50 rounded-full border border-emerald-100">
                                  <Check className="w-3.5 h-3.5" /> Fully Authorized
                               </span>
                               <button onClick={() => handleApproveUser(p.id, false)} className="text-gray-400 hover:text-red-500 text-[9px] font-bold uppercase tracking-widest hover:underline transition-all">Revoke Access</button>
                          </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {managedUsers.length === 0 && (
              <div className="p-32 border-2 border-dashed border-gray-100 rounded-[64px] text-center bg-gray-50/50">
                <UserCheck className="w-20 h-20 text-gray-200 mx-auto mb-6" />
                <h4 className="text-gray-400 font-black uppercase tracking-[0.2em] text-sm">No Active Registrations</h4>
                <p className="text-xs text-gray-300 mt-2 font-medium">All accounts within your jurisdiction are up to date.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'learners' && (
        <LearnerList 
          user={user}
          learners={jLearners} 
          onAddLearner={() => setIsAddingLearner(true)} 
          onViewAssessments={(l) => {
            setSelectedLearner(l);
            setActiveTab('assessment');
          }} 
          onImportLearners={(nl) => setLearners(prev => [...prev, ...nl])} 
          onDeleteLearner={handleDeleteLearner} 
          onEditLearner={handleEditLearner} 
        />
      )}
      
      {activeTab === 'assessment' && (
        <AssessmentView 
          assessments={jAssessments} 
          learners={jLearners} 
          onEdit={(a) => {
            setEditingAssessment(a);
            setSelectedLearner(learners.find(l => l.id === a.learnerId) || null);
          }} 
          onDelete={(id) => {
            if(window.confirm("Delete assessment record?")) {
              setAssessments(prev => prev.filter(a => a.id !== id));
            }
          }} 
          onPrint={(a) => {
            setShowPrintPreview(a);
            setSelectedLearner(learners.find(l => l.id === a.learnerId) || null);
          }} 
          onNewAssessment={(l, p) => {
            setSelectedLearner(l);
            setTargetPeriod(p);
            setIsAddingAssessment(true);
          }} 
        />
      )}
      
      {activeTab === 'report-all' && <ReportView user={user!} users={users} learners={jLearners} assessments={jAssessments} period="All" />}
      {activeTab === 'report-first' && <ReportView user={user!} users={users} learners={jLearners} assessments={jAssessments} period="FIRST ASSESSMENT" />}
      {activeTab === 'report-mid' && <ReportView user={user!} users={users} learners={jLearners} assessments={jAssessments} period="MID-ASSESSMENT" />}
      {activeTab === 'report-third' && <ReportView user={user!} users={users} learners={jLearners} assessments={jAssessments} period="THIRD ASSESSMENT" />}
      
      {activeTab === 'reports' && (
        <MasterRecords 
          learners={jLearners} 
          assessments={jAssessments} 
          onDeleteAssessment={(id) => {
            if(window.confirm("Delete assessment?")) setAssessments(prev => prev.filter(a => a.id !== id));
          }} 
          onDeleteLearner={handleDeleteLearner} 
          onEditLearner={handleEditLearner}
          onEditAssessment={(a) => {
            setEditingAssessment(a);
            setSelectedLearner(learners.find(l => l.id === a.learnerId) || null);
          }} 
        />
      )}
      
      {activeTab === 'admin' && <AdminView />}

      {(isAddingAssessment || editingAssessment) && selectedLearner && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <AssessmentForm 
            learner={selectedLearner}
            initialData={editingAssessment || undefined}
            targetPeriod={targetPeriod as any}
            onSubmit={(data) => {
              if (editingAssessment) {
                setAssessments(prev => prev.map(a => a.id === editingAssessment.id ? { ...data, id: a.id } : a));
              } else {
                setAssessments(prev => [...prev, { ...data, id: Math.random().toString(36).substr(2, 9) }]);
              }
              setIsAddingAssessment(false);
              setEditingAssessment(null);
            }}
            onCancel={() => {
              setIsAddingAssessment(false);
              setEditingAssessment(null);
            }}
          />
        </div>
      )}

      {showPrintPreview && selectedLearner && (
        <div className="fixed inset-0 z-[100] bg-white overflow-y-auto no-print">
          <div className="sticky top-0 bg-slate-900 text-white p-4 flex justify-between items-center z-10">
            <button onClick={() => setShowPrintPreview(null)} className="flex items-center gap-2 font-bold hover:text-blue-400 transition-colors">
              <ArrowLeft className="w-5 h-5" /> Back to Dashboard
            </button>
            <button onClick={() => window.print()} className="bg-blue-600 px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-500 transition-all">
              <Printer className="w-5 h-5" /> Print ECCD Card
            </button>
          </div>
          <div className="p-8">
            <ECCDCard learner={selectedLearner} assessment={showPrintPreview} />
          </div>
        </div>
      )}

      {(isAddingLearner || editingLearner) && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <LearnerModal 
            user={user!}
            initialData={editingLearner || undefined}
            onSubmit={(data) => {
              if (editingLearner) {
                setLearners(prev => prev.map(l => l.id === editingLearner.id ? { ...data, id: l.id } : l));
              } else {
                setLearners(prev => [...prev, { ...data, id: Math.random().toString(36).substr(2, 9) }]);
              }
              setIsAddingLearner(false);
              setEditingLearner(null);
            }}
            onCancel={() => {
              setIsAddingLearner(false);
              setEditingLearner(null);
            }}
          />
        </div>
      )}

      <div className="print-only">
        {showPrintPreview && selectedLearner && <ECCDCard learner={selectedLearner} assessment={showPrintPreview} />}
      </div>
    </Layout>
  );
};

export default App;
