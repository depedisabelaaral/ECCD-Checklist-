import React, { useState, useMemo } from 'react';
import { Assessment, Learner, User, SubmissionStatus, UserRole } from '../types';
import { Search, Filter, Pencil, Trash2, Printer, ClipboardCheck, PlusCircle, UserCircle, Ban, CheckCircle2, Lock, Unlock, AlertCircle, Send, X, GraduationCap } from 'lucide-react';
import { PERIODS, DOMAINS, getAutomaticSchoolYear } from '../constants';

interface AssessmentViewProps {
  user: User | null;
  assessments: Assessment[];
  learners: Learner[];
  submissions: SubmissionStatus[];
  onUpdateSubmission: (status: SubmissionStatus) => void;
  onEdit: (assessment: Assessment) => void;
  onDelete: (id: string) => void;
  onPrint: (assessment: Assessment) => void;
  onNewAssessment: (learner: Learner, period: Assessment['period']) => void;
}

const AssessmentView: React.FC<AssessmentViewProps> = ({ 
  user,
  assessments, 
  learners, 
  submissions,
  onUpdateSubmission,
  onEdit, 
  onDelete, 
  onPrint,
  onNewAssessment
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<Assessment['period']>('FIRST ASSESSMENT');
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<string>(user?.schoolYear || getAutomaticSchoolYear());
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestReason, setRequestReason] = useState('');

  const schoolYearOptions = useMemo(() => {
    const years = new Set<string>();
    learners.forEach(l => { if (l.schoolYear) years.add(l.schoolYear); });
    submissions.forEach(s => { if (s.schoolYear) years.add(s.schoolYear); });
    const current = user?.schoolYear || getAutomaticSchoolYear();
    years.add(current);
    return Array.from(years).sort().reverse();
  }, [learners, submissions, user]);

  const currentSubmission = useMemo(() => 
    submissions.find(s => s.userId === user?.id && s.period === selectedPeriod && s.schoolYear === selectedSchoolYear),
    [submissions, user, selectedPeriod, selectedSchoolYear]
  );

  const isFinalized = currentSubmission?.isFinalized || false;
  const unfinalizeCount = currentSubmission?.unfinalizeCount || 0;
  const requestUnfinalize = currentSubmission?.requestUnfinalize || false;

  const handleFinalize = () => {
    if (!user) return;
    const newStatus: SubmissionStatus = {
      id: currentSubmission?.id || (typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`),
      userId: user.id,
      period: selectedPeriod,
      schoolYear: selectedSchoolYear,
      isFinalized: true,
      unfinalizeCount: unfinalizeCount,
      requestUnfinalize: false,
      lastUpdated: Date.now()
    };
    onUpdateSubmission(newStatus);
  };

  const handleUnfinalize = () => {
    if (!user || !currentSubmission) return;
    if (unfinalizeCount >= 3) {
      alert("You have reached the maximum number of self-unfinalizations (3). Please request the consolidator to unfinalize.");
      return;
    }
    const newStatus: SubmissionStatus = {
      ...currentSubmission,
      isFinalized: false,
      unfinalizeCount: unfinalizeCount + 1,
      lastUpdated: Date.now()
    };
    onUpdateSubmission(newStatus);
  };

  const handleSubmitRequest = () => {
    if (!user || !currentSubmission || !requestReason.trim()) return;
    
    const newStatus: SubmissionStatus = {
      ...currentSubmission,
      requestUnfinalize: true,
      requestMessage: requestReason.trim(),
      lastUpdated: Date.now()
    };
    onUpdateSubmission(newStatus);
    setIsRequestModalOpen(false);
    setRequestReason('');
    alert("Request sent to consolidator.");
  };

  const calculateCompletionPercent = (assessment: Assessment | undefined) => {
    if (!assessment) return 0;
    const scores = assessment.scores as any;
    const totalDomains = DOMAINS.length;
    const domainsWithData = DOMAINS.filter(d => scores[d.id] > 0).length;
    return Math.round((domainsWithData / totalDomains) * 100);
  };

  const filteredLearners = useMemo(() => {
    return learners.filter(l => 
      (selectedSchoolYear === 'All' || l.schoolYear === selectedSchoolYear) &&
      (l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
       l.lrn.includes(searchTerm))
    );
  }, [learners, searchTerm, selectedSchoolYear]);

  const isPeriodFinalized = (period: Assessment['period']) => {
    return submissions.find(s => s.userId === user?.id && s.period === period && s.schoolYear === selectedSchoolYear)?.isFinalized || false;
  };

  return (
    <div className="space-y-6">
      {/* Finalization Header */}
      <div className={`p-6 rounded-3xl border transition-all ${
        isFinalized 
          ? 'bg-emerald-50 border-emerald-200' 
          : 'bg-amber-50 border-amber-200'
      }`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${isFinalized ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
              {isFinalized ? <Lock className="w-6 h-6" /> : <Unlock className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">
                  {selectedPeriod} STATUS
                </h3>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  isFinalized ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {isFinalized ? 'Finalized' : 'Preparing'}
                </span>
              </div>
              <p className="text-slate-500 text-xs font-medium mt-1">
                {isFinalized 
                  ? "Assessment is locked. You can no longer add or edit records for this period."
                  : "Assessment is open. You can add and edit records for this period."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
               <GraduationCap className="w-4 h-4 text-slate-400" />
               <select 
                  value={selectedSchoolYear}
                  onChange={(e) => setSelectedSchoolYear(e.target.value)}
                  className="bg-transparent text-sm font-bold outline-none cursor-pointer"
               >
                  {schoolYearOptions.map(sy => <option key={sy} value={sy}>S.Y. {sy}</option>)}
               </select>
            </div>

            <select 
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as any)}
              className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
            >
              {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            {isFinalized ? (
              <div className="flex items-center gap-2">
                {unfinalizeCount < 3 ? (
                  <button 
                    onClick={handleUnfinalize}
                    className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2"
                  >
                    <Unlock className="w-4 h-4" />
                    Unfinalize ({3 - unfinalizeCount} left)
                  </button>
                ) : (
                  <button 
                    onClick={() => setIsRequestModalOpen(true)}
                    disabled={requestUnfinalize}
                    className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 ${
                      requestUnfinalize 
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                    {requestUnfinalize ? 'Request Pending' : 'Request Unfinalize'}
                  </button>
                )}
              </div>
            ) : (
              <button 
                onClick={handleFinalize}
                className="px-8 py-2.5 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Finalize Assessment
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Request Unfinalize Modal */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-indigo-600 text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Send className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-black uppercase tracking-tight">Request Unfinalize</h3>
              </div>
              <button onClick={() => setIsRequestModalOpen(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reason for Request</label>
                <textarea 
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  placeholder="Explain why you need to unfinalize this assessment (e.g., data correction, missing entries)..."
                  className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button 
                  onClick={() => setIsRequestModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSubmitRequest}
                  disabled={!requestReason.trim()}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex flex-1 items-center gap-4 w-full">
          <div className="relative flex-1 max-sm:max-w-none max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Find learner to assess..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="hidden md:block">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Comprehensive Assessment Overview
            </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Learner Name</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Enrollment</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Result Preview</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions per Period</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLearners.map((learner) => {
                const isTransferredOut = learner.status === 'Transferred-Out';
                const learnerAssessments = assessments.filter(a => a.learnerId === learner.id);
                
                const a1 = learnerAssessments.find(a => a.period === 'FIRST ASSESSMENT');
                const a2 = learnerAssessments.find(a => a.period === 'MID-ASSESSMENT');
                const a3 = learnerAssessments.find(a => a.period === 'THIRD ASSESSMENT');

                const p1 = calculateCompletionPercent(a1);
                const p2 = calculateCompletionPercent(a2);
                const p3 = calculateCompletionPercent(a3);

                const totalCompletedCount = [a1, a2, a3].filter(Boolean).length;

                return (
                  <tr key={learner.id} className="hover:bg-blue-50/20 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            learner.gender === 'Female' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                            {learner.name[0]}
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-gray-900 text-sm">{learner.name}</span>
                            <span className="text-[10px] text-gray-400 font-mono tracking-tighter">{learner.lrn}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tight border ${
                            learner.status === 'Transferred-Out' ? 'bg-red-50 text-red-700 border-red-100' : 
                            learner.status === 'Transferred-In' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                            'bg-emerald-50 text-emerald-600 border-emerald-100'
                        }`}>
                            {learner.status}
                        </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ring-1 whitespace-nowrap ${
                        totalCompletedCount === 3 
                          ? 'bg-emerald-100 text-emerald-700 ring-emerald-200' 
                          : totalCompletedCount > 0 
                          ? 'bg-blue-50 text-blue-700 ring-blue-100'
                          : 'bg-gray-100 text-gray-400 ring-gray-200'
                      }`}>
                        {totalCompletedCount}/3 Completed
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5 min-w-[140px]">
                        <div className="flex items-center justify-between text-[9px] font-black uppercase">
                          <span className={p1 > 0 ? 'text-blue-600' : 'text-gray-300'}>1st: {p1}%</span>
                          <span className={p2 > 0 ? 'text-purple-600' : 'text-gray-300'}>2nd: {p2}%</span>
                          <span className={p3 > 0 ? 'text-emerald-600' : 'text-gray-300'}>3rd: {p3}%</span>
                        </div>
                        <div className="flex h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="bg-blue-500 transition-all duration-500" style={{ width: `${p1/3}%` }} />
                          <div className="bg-purple-500 transition-all duration-500" style={{ width: `${p2/3}%` }} />
                          <div className="bg-emerald-500 transition-all duration-500" style={{ width: `${p3/3}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {PERIODS.map((pLabel, pIdx) => {
                          const existing = [a1, a2, a3][pIdx];
                          const pNum = pIdx + 1;
                          const isPeriodLocked = isPeriodFinalized(pLabel);
                          
                          if (isTransferredOut) return null;

                          return (
                            <div key={pLabel} className="relative group/action">
                              {existing ? (
                                <div className={`flex items-center gap-1 p-1 rounded-lg border shadow-sm transition-all ${
                                  isPeriodLocked ? 'bg-gray-100 border-gray-200' : 'bg-gray-50 border-gray-100'
                                }`}>
                                  <button 
                                    onClick={() => !isPeriodLocked && onEdit(existing)} 
                                    disabled={isPeriodLocked}
                                    className={`px-2 py-1 text-[9px] font-black rounded transition-all uppercase ${
                                      isPeriodLocked 
                                        ? 'text-gray-400 cursor-not-allowed' 
                                        : 'text-blue-600 hover:bg-blue-600 hover:text-white'
                                    }`}
                                    title={isPeriodLocked ? "Locked" : `Edit ${pLabel}`}
                                  >
                                    {pNum}{pNum === 1 ? 'st' : pNum === 2 ? 'nd' : 'rd'}
                                  </button>
                                  <div className="w-px h-3 bg-gray-200" />
                                  <button 
                                    onClick={() => onPrint(existing)} 
                                    className="p-1 text-gray-400 hover:text-gray-900 transition-colors"
                                    title="Print"
                                  >
                                    <Printer className="w-3 h-3" />
                                  </button>
                                  {!isPeriodLocked && (
                                    <button 
                                      onClick={() => onDelete(existing.id)} 
                                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                  {isPeriodLocked && <Lock className="w-3 h-3 text-gray-300 mx-1" />}
                                </div>
                              ) : (
                                <button 
                                  onClick={() => !isPeriodLocked && onNewAssessment(learner, pLabel)}
                                  disabled={isPeriodLocked}
                                  className={`px-3 py-1.5 text-[9px] font-black border rounded-lg transition-all uppercase flex items-center gap-1.5 ${
                                    isPeriodLocked
                                      ? 'bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed'
                                      : 'border-blue-200 text-blue-500 hover:bg-blue-500 hover:text-white'
                                  }`}
                                >
                                  {isPeriodLocked ? <Lock className="w-3 h-3" /> : <PlusCircle className="w-3 h-3" />}
                                  {pNum}{pNum === 1 ? 'st' : pNum === 2 ? 'nd' : 'rd'}
                                </button>
                              )}
                            </div>
                          );
                        })}
                        {isTransferredOut && (
                          <div className="text-red-400 flex items-center gap-1 font-bold text-[9px] uppercase tracking-widest px-3 py-1.5 bg-red-50 rounded-lg">
                            <Ban className="w-3 h-3" /> Locked
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredLearners.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center gap-3 text-gray-300">
                      <UserCircle className="w-16 h-16 opacity-10" />
                      <div>
                        <p className="font-bold text-gray-400">No learners found</p>
                        <p className="text-xs">Try searching for a different name or LRN</p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="p-6 bg-slate-900 rounded-3xl shadow-xl shadow-blue-100 text-white flex items-center justify-between">
          <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                  <ClipboardCheck className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                  <h4 className="font-black text-lg">Cross-Period Monitoring</h4>
                  <p className="text-slate-400 text-xs font-medium">This view allows you to monitor and record milestones for all three assessment periods side-by-side.</p>
              </div>
          </div>
          <div className="hidden sm:flex items-center gap-6">
              <div className="flex items-center gap-3 px-6 py-2 bg-white/5 rounded-2xl border border-white/5">
                 <div className="w-2.5 h-2.5 bg-blue-500 rounded-full"></div>
                 <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">1st Assessment</span>
              </div>
              <div className="flex items-center gap-3 px-6 py-2 bg-white/5 rounded-2xl border border-white/5">
                 <div className="w-2.5 h-2.5 bg-purple-500 rounded-full"></div>
                 <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Mid Assessment</span>
              </div>
              <div className="flex items-center gap-3 px-6 py-2 bg-white/5 rounded-2xl border border-white/5">
                 <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div>
                 <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Third Assessment</span>
              </div>
          </div>
      </div>
    </div>
  );
};

export default AssessmentView;
