
import React, { useState, useEffect, useMemo } from 'react';
import Layout from './components/Layout.tsx';
import Dashboard from './components/Dashboard.tsx';
import LearnerList from './components/LearnerList.tsx';
import AssessmentForm from './components/AssessmentForm.tsx';
import AdminView from './components/AdminView.tsx';
import ECCDCard from './components/ECCDCard.tsx';
import TemporaryECCDCard from './components/TemporaryECCDCard.tsx';
import MasterRecords from './components/MasterRecords.tsx';
import AssessmentView from './components/AssessmentView.tsx';
import { ProgressReportCard } from './components/ProgressReportCard.tsx';
import ReportView from './components/ReportView.tsx';
import LearnerModal from './components/LearnerModal.tsx';
import UserApprovals from './components/UserApprovals.tsx';
import { User, UserRole, UserStatus, Learner, Assessment, ChatMessage, SubmissionStatus } from './types.ts';
import { LD_MAPPING } from './constants.tsx';
import { supabaseService } from './src/services/supabaseService.ts';
import { 
  Key, User as UserIcon, Building, AlertCircle, Sparkles, CheckCircle, 
  ChevronRight, Landmark, Map as MapIcon, School, GraduationCap, ArrowLeft,
  ShieldCheck, Briefcase, HelpCircle, Send, Users, Loader2, Trash2
} from 'lucide-react';

const DEFAULT_SEAL = "eccd.jpg";

const getNow = () => Date.now();

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  
  const GLOBAL_SIDEBAR_KEY = 'branding_sidebar_logo';
  const [displayLogo, setDisplayLogo] = useState(localStorage.getItem(GLOBAL_SIDEBAR_KEY) || DEFAULT_SEAL);

  const [classStartDate, setClassStartDate] = useState(() => localStorage.getItem('eccd_class_start_date') || '');
  const [classEndDate, setClassEndDate] = useState(() => localStorage.getItem('eccd_class_end_date') || '');
  
  const [learners, setLearners] = useState<Learner[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionStatus[]>([]);

  const [isRegistering, setIsRegistering] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [registrationPath, setRegistrationPath] = useState<'SCHOOL' | 'DISTRICT' | 'ADMIN' | null>(null);
  const [loginError, setLoginError] = useState('');
  const [signupSuccess, setSignupSuccess] = useState('');
  const [recoverySent, setRecoverySent] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');

  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [recoveryData, setRecoveryData] = useState({ username: '', message: '', legislativeDistrict: '', district: '' });
  const [signupData, setSignupData] = useState({
    username: '', email: '', password: '', fullName: '', designation: '', legislativeDistrict: '', district: '', 
    schoolName: '', schoolId: '', districtSupervisorName: '', districtSupervisorDesignation: '',
    kindergartenCoordinatorName: '', kindergartenCoordinatorDesignation: '', schoolHeadName: '', schoolHeadDesignation: '',
    role: UserRole.SCHOOL_USER
  });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });


  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      // In localhost mode, we might want to check a local session token or just stay logged out
      setIsLoading(false);
    };
    checkSession();
  }, []);

  // Fetch data when user is logged in
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const [allLearners, allAssessments, allUsers, allMessages] = await Promise.all([
          supabaseService.getLearners(),
          supabaseService.getAssessments(),
          supabaseService.getAllProfiles(),
          supabaseService.getMessages()
        ]);
        setLearners(allLearners || []);
        setAssessments(allAssessments || []);
        setUsers(allUsers || []);
        setMessages(allMessages || []);
      } catch (err) {
        console.error("Failed to fetch data:", err);
      }
    };

    fetchData();
    
    // Polling for messages instead of real-time for now in localhost
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      handleEditUser(user.id, { lastActive: Date.now() });
    }, 60000); // Update lastActive every minute
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const refreshLogo = () => setDisplayLogo(localStorage.getItem(GLOBAL_SIDEBAR_KEY) || DEFAULT_SEAL);
    window.addEventListener('branding_sidebar_updated', refreshLogo);
    return () => window.removeEventListener('branding_sidebar_updated', refreshLogo);
  }, []);

  // Persist Class Start Date
  useEffect(() => {
    localStorage.setItem('eccd_class_start_date', classStartDate);
  }, [classStartDate]);

  // Persist Class End Date
  useEffect(() => {
    localStorage.setItem('eccd_class_end_date', classEndDate);
  }, [classEndDate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);

    try {
      const { user: authUser } = await supabaseService.signIn(loginData.username, loginData.password);
      if (authUser) {
        if (authUser.status === UserStatus.PENDING) {
          setLoginError('This account is still awaiting administrator approval.');
          setIsLoading(false);
          return;
        }
        setUser(authUser);
        setActiveTab('dashboard');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Invalid username or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await supabaseService.signUp(signupData);
      setSignupSuccess('Registration successful! Please wait for admin approval.');
      setIsRegistering(false);
      setRegistrationPath(null);
      setLoginData({ username: signupData.username, password: signupData.password });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setLoginError(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateUserStatus = async (userId: string, status: UserStatus) => {
    try {
      await supabaseService.updateProfile(userId, { status });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status } : u));
    } catch (err) {
      console.error("Failed to update user status:", err);
    }
  };

  const handleEditUser = async (userId: string, updates: Partial<User>) => {
    try {
      await supabaseService.updateProfile(userId, updates);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
    } catch (err) {
      console.error("Failed to edit user:", err);
    }
  };

  const handleUpdateProfile = async (updatedProfile: Partial<User>) => {
    if (!user) return;
    try {
      await supabaseService.updateProfile(user.id, updatedProfile);
      const updatedUser = { ...user, ...updatedProfile };
      setUser(updatedUser);
      setUsers(prev => prev.map(u => u.id === user.id ? updatedUser : u));
    } catch (err) {
      console.error("Failed to update profile:", err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === 'u-admin') return;
    setConfirmModal({
      isOpen: true,
      title: 'Delete Request',
      message: 'Are you sure you want to delete this registration request?',
      onConfirm: async () => {
        try {
          setUsers(prev => prev.filter(u => u.id !== userId));
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          console.error("Failed to delete user:", err);
        }
      }
    });
  };

  const handleRecoverySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');
    
    const target = users.find(u => 
      u.username === recoveryData.username && 
      u.legislativeDistrict === recoveryData.legislativeDistrict &&
      u.district === recoveryData.district
    );

    if (!target) {
      setRecoveryError('No account found matching those details in the specified district.');
      return;
    }

    handleEditUser(target.id, {
      passwordRequest: {
        message: recoveryData.message,
        timestamp: getNow(),
        resolved: false
      }
    });

    setRecoverySent(true);
  };

  const handleSendMessage = async (text: string, receiverId?: string) => {
    if (!user) return;
    
    const targetDistrict = receiverId 
      ? (users.find(u => u.id === receiverId)?.district || user.district || 'Global')
      : (user.district || 'Global');

    const newMessage = {
      id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sender_id: user.id,
      sender_name: user.fullName,
      receiver_id: receiverId,
      target_district: targetDistrict,
      text,
      timestamp: Date.now(),
      read: false,
      is_from_consolidator: user.role === UserRole.CONSOLIDATOR
    };

    try {
      await supabaseService.sendMessage(newMessage);
      setMessages(prev => [...prev, newMessage as unknown as ChatMessage]);
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  const handleMarkAsRead = async (messageIds: string[]) => {
    try {
      await supabaseService.markMessagesAsRead(messageIds);
      setMessages(prev => prev.map(m => messageIds.includes(m.id) ? { ...m, read: true } : m));
    } catch (err) {
      console.error("Failed to mark messages as read:", err);
    }
  };

  const handleUpdateSubmission = async (status: SubmissionStatus) => {
    // Localhost logic for submissions could be added to server.ts
    setSubmissions(prev => {
      const index = prev.findIndex(s => s.userId === status.userId && s.period === status.period && s.schoolYear === status.schoolYear);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = status;
        return updated;
      }
      return [...prev, status];
    });
  };

  const handleLogout = async () => {
    await supabaseService.signOut();
    setUser(null);
    setActiveTab('dashboard');
  };

  const teacherOptions = ['Teacher I', 'Teacher II', 'Teacher III', 'Teacher IV', 'Teacher V', 'Teacher VI', 'Teacher VII', 'Master Teacher I', 'Master Teacher II', 'Master Teacher III', 'Master Teacher IV', 'Master Teacher V'];
  const districtOptions = useMemo(() => {
    return signupData.legislativeDistrict ? LD_MAPPING[signupData.legislativeDistrict] || [] : [];
  }, [signupData.legislativeDistrict]);
  
  const recoveryDistrictOptions = useMemo(() => {
    return recoveryData.legislativeDistrict ? LD_MAPPING[recoveryData.legislativeDistrict] || [] : [];
  }, [recoveryData.legislativeDistrict]);

  const [selectedLearner, setSelectedLearner] = useState<Learner | null>(null);
  const [isAddingAssessment, setIsAddingAssessment] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null);
  const [targetPeriod, setTargetPeriod] = useState<string>('FIRST ASSESSMENT');
  const [editingLearner, setEditingLearner] = useState<Learner | null>(null);
  const [isAddingLearner, setIsAddingLearner] = useState(false);

  const onAddLearnerSubmit = async (newLearner: Omit<Learner, 'id'>) => {
    const learner = { ...newLearner, id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `l-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` };
    try {
      await supabaseService.saveLearner(learner as Learner);
      setLearners(prev => [...prev, learner as Learner]);
      setIsAddingLearner(false);
    } catch (err) {
      console.error("Failed to add learner:", err);
    }
  };

  const onEditLearnerSubmit = async (updatedLearner: Omit<Learner, 'id'>) => {
    if (!editingLearner) return;
    const learner = { ...updatedLearner, id: editingLearner.id };
    try {
      await supabaseService.saveLearner(learner as Learner);
      setLearners(prev => prev.map(l => l.id === editingLearner.id ? { ...updatedLearner, id: l.id } as Learner : l));
      setEditingLearner(null);
    } catch (err) {
      console.error("Failed to edit learner:", err);
    }
  };

  const onAddAssessmentSubmit = async (newAssessment: Omit<Assessment, 'id'>) => {
    const assessment = { ...newAssessment, id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `a-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` };
    try {
      await supabaseService.saveAssessment(assessment as Assessment);
      setAssessments(prev => [...prev, assessment as Assessment]);
      setIsAddingAssessment(false);
    } catch (err) {
      console.error("Failed to add assessment:", err);
    }
  };

  const onEditAssessmentSubmit = async (updatedAssessment: Omit<Assessment, 'id'>) => {
    if (!editingAssessment) return;
    const assessment = { ...updatedAssessment, id: editingAssessment.id };
    try {
      await supabaseService.saveAssessment(assessment as Assessment);
      setAssessments(prev => prev.map(a => a.id === editingAssessment.id ? { ...updatedAssessment, id: a.id } as Assessment : a));
      setEditingAssessment(null);
    } catch (err) {
      console.error("Failed to edit assessment:", err);
    }
  };

  const handleDeleteAssessment = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Assessment',
      message: 'Are you sure you want to delete this assessment?',
      onConfirm: async () => {
        try {
          await supabaseService.deleteAssessment(id);
          setAssessments(prev => prev.filter(a => a.id !== id));
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          console.error("Failed to delete assessment:", err);
        }
      }
    });
  };

  const handleDeleteLearner = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Learner',
      message: 'Are you sure you want to delete this learner and all their assessments?',
      onConfirm: async () => {
        try {
          await supabaseService.deleteLearner(id);
          setLearners(prev => prev.filter(l => l.id !== id));
          setAssessments(prev => prev.filter(a => a.learnerId !== id));
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          console.error("Failed to delete learner:", err);
        }
      }
    });
  };

  const handleDeleteMultipleLearners = async (ids: string[]) => {
    if (ids.length === 0) return;
    setConfirmModal({
      isOpen: true,
      title: 'Delete Selected Learners',
      message: `Are you sure you want to delete the ${ids.length} selected learners and all their associated assessments? This action is irreversible.`,
      onConfirm: async () => {
        try {
          await Promise.all(ids.map(id => supabaseService.deleteLearner(id)));
          setLearners(prev => prev.filter(l => !ids.includes(l.id)));
          setAssessments(prev => prev.filter(a => !ids.includes(a.learnerId)));
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          console.error("Failed to delete selected learners:", err);
        }
      }
    });
  };

  const jLearners = useMemo(() => {
    if (!user) return [];
    if (user.role === UserRole.ADMIN) return learners;
    if (user.role === UserRole.COORDINATOR || user.role === UserRole.CONSOLIDATOR) {
        return learners.filter(l => {
            const lUser = users.find(u => u.schoolId === l.schoolId);
            return lUser?.district === user.district;
        });
    }
    return learners.filter(l => l.schoolId === user.schoolId);
  }, [learners, user, users]);

  const jAssessments = useMemo(() => {
    if (!user) return [];
    return assessments.filter(a => jLearners.some(l => l.id === a.learnerId));
  }, [assessments, jLearners, user]);

  useEffect(() => {
    if (activeTab === 'print-eccd' && !selectedLearner) {
      const assessed = jLearners.find(l => jAssessments.some(a => a.learnerId === l.id));
      if (assessed) {
        const timer = setTimeout(() => setSelectedLearner(assessed), 0);
        return () => clearTimeout(timer);
      }
    }
  }, [activeTab, selectedLearner, jLearners, jAssessments]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Initializing System...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <div className={`bg-white rounded-2xl shadow-xl border border-slate-200 p-3 md:p-4 ${isRegistering ? 'max-w-5xl' : 'max-w-[320px]'} w-full space-y-2 relative animate-in fade-in duration-500`}>
          <div className="text-center">
            <div className="w-10 h-10 mx-auto mb-1 bg-white rounded-xl border border-slate-100 overflow-hidden flex items-center justify-center shadow-sm">
              <img src={displayLogo} alt="ECCD Logo" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = "https://cdn-icons-png.flaticon.com/512/2602/2602414.png"; }} />
            </div>
            <h1 className="text-xs font-black text-black tracking-tight uppercase leading-none">
              Early Childhood Care and Development
            </h1>
            <p className="text-[7.5px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Management & Monitoring System</p>
            
            {signupSuccess && (
              <div className="mt-2 p-2 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" /> {signupSuccess}
              </div>
            )}
          </div>

          {isRegistering ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-3">
                  <h3 className="text-[9px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5 mb-1"><Key className="w-3 h-3" /> 1. Access Credentials</h3>
                  <div className="space-y-2">
                    <input required type="text" placeholder="Username" value={signupData.username} onChange={(e) => setSignupData({...signupData, username: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-xs" />
                    <input type="email" placeholder="Email (Optional)" value={signupData.email} onChange={(e) => setSignupData({...signupData, email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-xs" />
                    <input required type="password" placeholder="Password" value={signupData.password} onChange={(e) => setSignupData({...signupData, password: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-xs" />
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-[9px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5 mb-1"><UserIcon className="w-3 h-3" /> 2. Personal Details</h3>
                  <div className="space-y-2">
                    <input required type="text" placeholder="Full Name" value={signupData.fullName} onChange={(e) => setSignupData({...signupData, fullName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-xs" />
                    {registrationPath === 'ADMIN' ? (
                      <input required type="text" placeholder="Designation" value={signupData.designation} onChange={(e) => setSignupData({...signupData, designation: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-xs" />
                    ) : (
                      <select required value={signupData.designation} onChange={(e) => setSignupData({...signupData, designation: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-xs">
                        <option value="" disabled>Select Designation</option>
                        {teacherOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        <option value="District Coordinator">District Coordinator</option>
                        <option value="Consolidator">District Consolidator</option>
                        <option value="Principal">School Principal</option>
                        <option value="School Head">School Head</option>
                      </select>
                    )}
                    {registrationPath === 'SCHOOL' && (
                      <input required type="text" placeholder="School Name" value={signupData.schoolName} onChange={(e) => setSignupData({...signupData, schoolName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-xs" />
                    )}
                    {registrationPath === 'ADMIN' && (
                      <div className="p-2 bg-amber-50 border border-amber-100 rounded-lg">
                        <p className="text-[9px] text-amber-700 font-bold uppercase tracking-tight leading-tight">
                          Note: Admin accounts require verification by the system owner.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                {registrationPath !== 'ADMIN' && (
                  <div className="space-y-3">
                    <h3 className="text-[9px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5 mb-1"><Landmark className="w-3 h-3" /> 3. Regional Data</h3>
                    <div className="space-y-2">
                      <input required type="text" placeholder={registrationPath === 'SCHOOL' ? "School ID (6-digit)" : "Office ID / Mother Station"} maxLength={6} value={signupData.schoolId} onChange={(e) => setSignupData({...signupData, schoolId: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-xs" />
                      <select required value={signupData.legislativeDistrict} onChange={(e) => setSignupData({...signupData, legislativeDistrict: e.target.value, district: ''})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-xs">
                        <option value="" disabled>Legislative District</option>
                        {Object.keys(LD_MAPPING).map(ld => <option key={ld} value={ld}>{ld}</option>)}
                      </select>
                      <select required value={signupData.district} onChange={(e) => setSignupData({...signupData, district: e.target.value})} disabled={!signupData.legislativeDistrict} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-xs">
                        <option value="" disabled>School District</option>
                        {districtOptions.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button type="button" onClick={() => { setIsRegistering(false); setRegistrationPath(null); }} className="px-6 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-1.5">
                  <ArrowLeft className="w-3.5 h-3.5" /> Go Back
                </button>
                <button type="submit" className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95 flex items-center justify-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5" /> Complete Registration
                </button>
              </div>
            </form>
          ) : isForgotPassword ? (
            <div className="space-y-3 max-w-[280px] mx-auto">
              <div className="text-center space-y-1">
                <div className="p-2.5 bg-blue-50 rounded-xl w-fit mx-auto text-blue-600">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">Account Recovery</h2>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Message your District Consolidator</p>
              </div>

              {!recoverySent ? (
                <form onSubmit={handleRecoverySubmit} className="space-y-3">
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input required type="text" placeholder="Your Username" value={recoveryData.username} onChange={(e) => setRecoveryData({...recoveryData, username: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-3 py-2 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-xs" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <select required value={recoveryData.legislativeDistrict} onChange={(e) => setRecoveryData({...recoveryData, legislativeDistrict: e.target.value, district: ''})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-[9.5px] font-bold uppercase">
                      <option value="" disabled>LD</option>
                      {Object.keys(LD_MAPPING).map(ld => <option key={ld} value={ld}>{ld}</option>)}
                    </select>
                    <select required value={recoveryData.district} onChange={(e) => setRecoveryData({...recoveryData, district: e.target.value})} disabled={!recoveryData.legislativeDistrict} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-[9.5px] font-bold uppercase">
                      <option value="" disabled>DISTRICT</option>
                      {recoveryDistrictOptions.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>

                  <div className="relative">
                    <textarea required placeholder="Message to Consolidator" value={recoveryData.message} onChange={(e) => setRecoveryData({...recoveryData, message: e.target.value})} rows={2} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-xs resize-none" />
                  </div>
                  
                  {recoveryError && (
                    <div className="p-2 bg-rose-50 border border-rose-100 rounded-lg flex items-center gap-1.5 text-rose-600">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <p className="text-[9px] font-bold uppercase tracking-tight">{recoveryError}</p>
                    </div>
                  )}

                  <button type="submit" className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95 flex items-center justify-center gap-2">
                    <Send className="w-3.5 h-3.5" /> Send Request
                  </button>
                  <button type="button" onClick={() => { setIsForgotPassword(false); setRecoverySent(false); setRecoveryError(''); }} className="w-full py-1.5 text-slate-400 font-bold text-[9px] uppercase tracking-widest hover:text-slate-600 transition-colors">
                    Back to Login
                  </button>
                </form>
              ) : (
                <div className="space-y-4 text-center animate-in fade-in zoom-in">
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl space-y-2">
                    <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
                    <p className="text-slate-900 font-black uppercase text-[10px]">Request Dispatched</p>
                    <p className="text-[9px] text-slate-500 leading-relaxed font-medium">The Consolidator for <span className="text-slate-900 font-bold">{recoveryData.district}</span> has been notified.</p>
                  </div>
                  <button type="button" onClick={() => { setIsForgotPassword(false); setRecoverySent(false); setRecoveryError(''); }} className="w-full py-2.5 bg-slate-800 text-white rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-slate-900 transition-all">
                    Return to Login
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3 max-w-[280px] mx-auto">
              <form onSubmit={handleLogin} className="space-y-3">
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input required type="text" placeholder="Username" value={loginData.username} onChange={(e) => setLoginData({...loginData, username: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-3 py-2 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-xs" />
                </div>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input required type="password" placeholder="Password" value={loginData.password} onChange={(e) => setLoginData({...loginData, password: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-3 py-2 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-xs" />
                </div>
                <div className="flex justify-end">
                   <button type="button" onClick={() => setIsForgotPassword(true)} className="text-[9px] font-bold text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors">Forgot Password?</button>
                </div>
                {loginError && (
                  <div className="p-2 bg-rose-50 border border-rose-100 rounded-lg flex items-center gap-1.5 text-rose-600 animate-in slide-in-from-bottom-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <p className="text-[9px] font-bold uppercase tracking-tight">{loginError}</p>
                  </div>
                )}
                <button type="submit" className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95">
                  Sign In
                </button>
              </form>
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <p className="text-center text-[9px] text-slate-400 font-bold uppercase tracking-widest">Create a new account</p>
                <div className="grid grid-cols-1 gap-1">
                  <button type="button" onClick={() => { setIsRegistering(true); setRegistrationPath('SCHOOL'); setSignupData({...signupData, role: UserRole.SCHOOL_USER}); setSignupSuccess(''); }} className="group w-full flex items-center justify-between px-3 py-1.5 bg-slate-50 text-slate-700 rounded-lg border border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-all">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-white rounded-lg border border-slate-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <School className="w-3 h-3" />
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] font-black uppercase tracking-tight">School User</p>
                        <p className="text-[8px] text-slate-400 font-medium leading-none">Teachers & School Admins</p>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500" />
                  </button>
                  <button type="button" onClick={() => { setIsRegistering(true); setRegistrationPath('DISTRICT'); setSignupData({...signupData, role: UserRole.COORDINATOR}); setSignupSuccess(''); }} className="group w-full flex items-center justify-between px-3 py-1.5 bg-slate-50 text-slate-700 rounded-lg border border-slate-100 hover:border-emerald-500 hover:bg-emerald-50 transition-all">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-white rounded-lg border border-slate-100 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                        <Briefcase className="w-3 h-3" />
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] font-black uppercase tracking-tight">Coordinator</p>
                        <p className="text-[8px] text-slate-400 font-medium leading-none">District & Office Users</p>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-500" />
                  </button>
                  <button type="button" onClick={() => { setIsRegistering(true); setRegistrationPath('ADMIN'); setSignupData({...signupData, role: UserRole.ADMIN}); setSignupSuccess(''); }} className="group w-full flex items-center justify-between px-3 py-1.5 bg-slate-50 text-slate-700 rounded-lg border border-slate-100 hover:border-amber-500 hover:bg-amber-50 transition-all">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-white rounded-lg border border-slate-100 text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-all">
                        <ShieldCheck className="w-3 h-3" />
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] font-black uppercase tracking-tight">System Admin</p>
                        <p className="text-[8px] text-slate-400 font-medium leading-none">Full System Access</p>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-amber-500" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const currentUser = user as User;

  return (
    <Layout 
      user={currentUser} 
      onLogout={handleLogout} 
      activeTab={activeTab} 
      setActiveTab={setActiveTab}
      messages={messages}
      users={users}
      onSendMessage={handleSendMessage}
      onMarkAsRead={handleMarkAsRead}
    >
      {activeTab === 'dashboard' && <Dashboard user={currentUser} learners={jLearners} assessments={jAssessments} users={users} onUpdateProfile={handleUpdateProfile} submissions={submissions} onUpdateSubmission={handleUpdateSubmission} />}
      {activeTab === 'consolidation' && (
        <ReportView 
          user={currentUser} users={users} 
          learners={learners} assessments={assessments} 
          submissions={submissions}
          period="All" 
        />
      )}
      {activeTab === 'learners' && (
        <LearnerList 
          user={currentUser} 
          learners={jLearners} 
          startDateFilter={classStartDate}
          setStartDateFilter={setClassStartDate}
          endDateFilter={classEndDate}
          setEndDateFilter={setClassEndDate}
          onAddLearner={() => setIsAddingLearner(true)} 
          onViewAssessments={(l) => { setSelectedLearner(l); setActiveTab('assessment'); }} 
          onImportLearners={async (nl) => {
            const learnersWithIds = nl.map(l => ({ 
              ...l, 
              id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `l-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` 
            }));
            try {
              for (const l of learnersWithIds) {
                await supabaseService.saveLearner(l as Learner);
              }
              setLearners(prev => [...prev, ...learnersWithIds as Learner[]]);
            } catch (err) {
              console.error("Failed to import learners:", err);
            }
          }} 
          onDeleteLearner={handleDeleteLearner} 
          onEditLearner={(l) => setEditingLearner(l)} 
          onDeleteMultipleLearners={handleDeleteMultipleLearners}
        />
      )}
      {activeTab === 'admin' && (
        <AdminView 
          users={users} 
          learners={learners} 
          assessments={assessments} 
          submissions={submissions}
        />
      )}
      {activeTab === 'approvals' && (
        <UserApprovals 
          currentUser={currentUser}
          users={users}
          onUpdateUser={handleUpdateUserStatus}
          onEditUser={handleEditUser}
          onDeleteUser={handleDeleteUser}
        />
      )}
      {activeTab === 'assessment' && (
        <AssessmentView 
          user={currentUser}
          assessments={jAssessments} learners={jLearners} 
          submissions={submissions}
          onUpdateSubmission={handleUpdateSubmission}
          onEdit={(a) => { setEditingAssessment(a); setSelectedLearner(learners.find(l => l.id === a.learnerId) || null); }} 
          onDelete={handleDeleteAssessment} 
          onPrint={(a) => { const l = learners.find(l => l.id === a.learnerId); if(l) { setSelectedLearner(l); setActiveTab('print-eccd'); } }} 
          onNewAssessment={(l, p) => { setSelectedLearner(l); setTargetPeriod(p); setIsAddingAssessment(true); }} 
        />
      )}
      {activeTab === 'progress-report-card' && (
        <ProgressReportCard 
          user={currentUser}
          learners={jLearners}
        />
      )}
      {activeTab === 'print-eccd' && selectedLearner && (
        <ECCDCard 
          user={currentUser}
          learner={selectedLearner}
          allLearners={jLearners}
          onSelectLearner={setSelectedLearner}
          assessments={jAssessments} 
          onClose={() => setActiveTab('assessment')}
        />
      )}
      {activeTab === 'print-temporary-eccd' && (
        jLearners.length > 0 ? (
          <TemporaryECCDCard 
            user={currentUser}
            learner={selectedLearner || jLearners[0]}
            allLearners={jLearners}
            onSelectLearner={setSelectedLearner}
            assessments={jAssessments}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-[60vh] bg-white rounded-3xl border border-slate-200 shadow-sm p-12 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <Users className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">No Learners Found</h3>
            <p className="text-slate-500 text-sm mt-2 max-w-xs">Please add learners to your database before you can print temporary ECCD cards.</p>
          </div>
        )
      )}
      {activeTab === 'reports' && (
         <MasterRecords 
            user={currentUser}
            learners={jLearners} assessments={jAssessments}
            onDeleteAssessment={handleDeleteAssessment}
            onEditAssessment={(a) => { setEditingAssessment(a); setSelectedLearner(learners.find(l => l.id === a.learnerId) || null); }}
            onDeleteLearner={handleDeleteLearner}
            onEditLearner={(l) => setEditingLearner(l)}
         />
      )}
      {activeTab.startsWith('report-') && (
        <ReportView 
          user={currentUser} users={users} 
          learners={learners} assessments={assessments} 
          submissions={submissions}
          period={activeTab === 'report-first' ? 'FIRST ASSESSMENT' : activeTab === 'report-mid' ? 'MID-ASSESSMENT' : activeTab === 'report-third' ? 'THIRD ASSESSMENT' : 'All'} 
        />
      )}

      {(isAddingAssessment || editingAssessment) && selectedLearner && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <AssessmentForm 
            learner={selectedLearner}
            initialData={editingAssessment || undefined}
            targetPeriod={targetPeriod as any}
            onSubmit={editingAssessment ? onEditAssessmentSubmit : onAddAssessmentSubmit}
            onCancel={() => { setIsAddingAssessment(false); setEditingAssessment(null); }}
          />
        </div>
      )}

      {(isAddingLearner || editingLearner) && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <LearnerModal 
            user={currentUser} 
            initialData={editingLearner || undefined} 
            learners={learners}
            onSubmit={editingLearner ? onEditLearnerSubmit : onAddLearnerSubmit} 
            onCancel={() => { setIsAddingLearner(false); setEditingLearner(null); }} 
          />
        </div>
      )}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-100 p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-red-50 text-red-600 rounded-2xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">{confirmModal.title}</h3>
            </div>
            <p className="text-slate-500 text-xs mb-6 leading-relaxed font-medium">{confirmModal.message}</p>
            <div className="flex items-center gap-3 justify-end text-xs font-bold">
              <button 
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} 
                className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  confirmModal.onConfirm();
                }} 
                className="px-5 py-2 text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-lg shadow-red-200 transition-all cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
