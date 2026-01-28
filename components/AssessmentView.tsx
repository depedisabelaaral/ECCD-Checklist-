
import React, { useState } from 'react';
import { Assessment, Learner } from '../types';
import { Search, Filter, Pencil, Trash2, Printer, ClipboardCheck, PlusCircle, UserCircle, Ban } from 'lucide-react';
import { PERIODS, DOMAINS } from '../constants';

interface AssessmentViewProps {
  assessments: Assessment[];
  learners: Learner[];
  onEdit: (assessment: Assessment) => void;
  onDelete: (id: string) => void;
  onPrint: (assessment: Assessment) => void;
  onNewAssessment: (learner: Learner, period: Assessment['period']) => void;
}

const AssessmentView: React.FC<AssessmentViewProps> = ({ 
  assessments, 
  learners, 
  onEdit, 
  onDelete, 
  onPrint,
  onNewAssessment
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [periodFilter, setPeriodFilter] = useState<Assessment['period']>(PERIODS[0]);

  const learnerRows = learners.map(learner => {
    const assessment = assessments.find(a => a.learnerId === learner.id && a.period === periodFilter);
    return {
      learner,
      assessment,
      hasRecord: !!assessment
    };
  }).filter(row => {
    const matchesSearch = row.learner.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          row.learner.lrn.includes(searchTerm);
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
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
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Period:</span>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as any)}
              className="text-sm bg-transparent border-none rounded-lg outline-none font-bold text-blue-600 cursor-pointer"
            >
              {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <div className="hidden md:block">
            <p className="text-xs text-gray-400 font-medium">
                Showing {learnerRows.length} learners for <span className="text-gray-900 font-bold">{periodFilter}</span>
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
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {learnerRows.map(({ learner, assessment, hasRecord }) => {
                const avgScore = hasRecord 
                  ? ((Object.values(assessment!.scores) as number[]).reduce((acc, v) => acc + v, 0) / 7).toFixed(1)
                  : null;

                const isTransferredOut = learner.status === 'Transferred-Out';
                // Calculate how many domains have "data" (defined as a score > 0)
                const domainsWithData = hasRecord 
                  ? Object.values(assessment!.scores).filter(score => (score as number) > 0).length 
                  : 0;
                const totalDomains = DOMAINS.length;

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
                      {hasRecord ? (
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ring-1 ${
                          domainsWithData === totalDomains 
                            ? 'bg-emerald-100 text-emerald-700 ring-emerald-200' 
                            : 'bg-blue-50 text-blue-700 ring-blue-100'
                        }`}>
                          {domainsWithData}/{totalDomains} Data
                        </span>
                      ) : (
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ring-1 ${
                            isTransferredOut ? 'bg-red-50 text-red-400 ring-red-100' : 'bg-gray-100 text-gray-400 ring-1 ring-gray-200'
                        }`}>
                          {isTransferredOut ? 'Locked' : 'No Record'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {hasRecord ? (
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-gray-100 h-1.5 rounded-full overflow-hidden max-w-[80px]">
                            <div className="bg-blue-600 h-full transition-all duration-1000" style={{ width: `${(parseFloat(avgScore!) / 5) * 100}%` }} />
                          </div>
                          <span className="font-black text-xs text-blue-600">{avgScore}</span>
                        </div>
                      ) : (
                        <span className={`text-xs italic ${isTransferredOut ? 'text-red-300' : 'text-gray-300'}`}>
                            {isTransferredOut ? 'Evaluation Disabled' : 'Pending Encoding'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {hasRecord ? (
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!isTransferredOut && (
                            <button onClick={() => onEdit(assessment!)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Edit Assessment">
                                <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={() => onDelete(assessment!.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all" title="Delete Record">
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => onPrint(assessment!)} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all" title="Print ECCD Card">
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                            {!isTransferredOut ? (
                                <button 
                                    onClick={() => onNewAssessment(learner, periodFilter)}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all font-bold text-[10px] uppercase tracking-wider"
                                >
                                    <PlusCircle className="w-3.5 h-3.5" />
                                    Assess Now
                                </button>
                            ) : (
                                <div className="text-red-400 flex items-center justify-end gap-1 font-bold text-[9px] uppercase tracking-widest px-3 py-1.5">
                                    <Ban className="w-3 h-3" />
                                    Locked
                                </div>
                            )}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
              {learnerRows.length === 0 && (
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
      
      <div className="p-6 bg-blue-600 rounded-3xl shadow-xl shadow-blue-100 text-white flex items-center justify-between">
          <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                  <ClipboardCheck className="w-6 h-6" />
              </div>
              <div>
                  <h4 className="font-black text-lg">Batch Assessment Guide</h4>
                  <p className="text-blue-100 text-xs font-medium">Select a period above to start recording scores for your entire class. Assessment is locked for Transferred-Out learners.</p>
              </div>
          </div>
          <div className="hidden sm:flex items-center gap-6">
              <div className="text-right">
                  <p className="text-[10px] font-bold uppercase text-blue-200">Completion</p>
                  <p className="text-xl font-black">
                      {Math.round((learnerRows.filter(r => r.hasRecord).length / Math.max(1, learnerRows.length)) * 100)}%
                  </p>
              </div>
          </div>
      </div>
    </div>
  );
};

export default AssessmentView;
