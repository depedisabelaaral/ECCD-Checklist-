import React, { useState, useMemo, useEffect } from 'react';
import { User, UserRole, Learner, Assessment } from '../types';
import { DOMAINS, PERIODS, getAutomaticSchoolYear } from '../constants';
import { Search, FileSpreadsheet, Download, Filter, Pencil, Trash2, UserCog, MoreVertical, GraduationCap, Briefcase, Users as UsersIcon, User as UserIcon, Shield, ChevronDown, ChevronRight, Eye } from 'lucide-react';
import * as XLSX from 'xlsx';

interface MasterRecordsProps {
  user: User;
  learners: Learner[];
  assessments: Assessment[];
  onDeleteAssessment: (id: string) => void;
  onEditAssessment: (assessment: Assessment) => void;
  onDeleteLearner: (id: string) => void;
  onEditLearner: (learner: Learner) => void;
}

const MasterRecords: React.FC<MasterRecordsProps> = ({ 
  user,
  learners, 
  assessments, 
  onDeleteAssessment, 
  onEditAssessment,
  onDeleteLearner,
  onEditLearner
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('All');
  const [selectedSection, setSelectedSection] = useState<string>('All');
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<string>(user.schoolYear || getAutomaticSchoolYear());
  const [expandedSchoolId, setExpandedSchoolId] = useState<string | null>(null);

  const isSchoolUser = user.role === UserRole.SCHOOL_USER;
  const isCoordinator = user.role === UserRole.COORDINATOR;
  
  // Show Adviser column for Admin, Consolidator, and now Coordinator (as requested)
  const showAdviserColumn = user.role === UserRole.ADMIN || user.role === UserRole.CONSOLIDATOR || user.role === UserRole.COORDINATOR;

  const uniqueSections = useMemo(() => {
    return ['All', ...Array.from(new Set(learners.map(l => l.section).filter(Boolean)))].sort();
  }, [learners]);

  const schoolYearOptions = useMemo(() => {
    const years = new Set<string>();
    learners.forEach(l => { if (l.schoolYear) years.add(l.schoolYear); });
    years.add(user.schoolYear || getAutomaticSchoolYear());
    return ['All', ...Array.from(years).sort().reverse()];
  }, [learners, user.schoolYear]);

  const getCombinedRecords = () => {
    const list: any[] = [];
    learners.forEach(learner => {
      const learnerAssessments = assessments.filter(a => a.learnerId === learner.id);
      
      if (selectedPeriod === 'All') {
        const a1 = learnerAssessments.find(a => a.period === 'FIRST ASSESSMENT');
        const a2 = learnerAssessments.find(a => a.period === 'MID-ASSESSMENT');
        const a3 = learnerAssessments.find(a => a.period === 'THIRD ASSESSMENT');

        list.push({
          id: learner.id,
          learnerId: learner.id,
          learnerName: learner.name,
          lrn: learner.lrn,
          gender: learner.gender,
          section: learner.section,
          schoolId: learner.schoolId,
          schoolYear: learner.schoolYear,
          adviser: learner.adviser,
          schoolHeadName: learner.schoolHeadName,
          a1, a2, a3,
          isPlaceholder: learnerAssessments.length === 0,
          rawLearner: learner,
          scores: (a3 || a2 || a1)?.scores || {}
        });
      } else {
        const periodAssessment = learnerAssessments.find(a => a.period === selectedPeriod);
        list.push({
          id: (periodAssessment ? periodAssessment.id : ("no-ast-" + learner.id + "-" + selectedPeriod)),
          learnerId: learner.id,
          learnerName: learner.name,
          lrn: learner.lrn,
          gender: learner.gender,
          section: learner.section,
          schoolId: learner.schoolId,
          schoolYear: learner.schoolYear,
          adviser: learner.adviser,
          schoolHeadName: learner.schoolHeadName,
          period: selectedPeriod,
          scores: (periodAssessment ? periodAssessment.scores : {}),
          date: (periodAssessment ? periodAssessment.date : '---'),
          remarks: (periodAssessment ? periodAssessment.remarks : ''),
          isPlaceholder: !periodAssessment,
          rawLearner: learner
        });
      }
    });

    return list.filter(r => {
      const nameMatch = r.learnerName.toLowerCase().includes(searchTerm.toLowerCase());
      const lrnMatch = r.lrn.includes(searchTerm);
      const sectionMatch = selectedSection === 'All' || r.section === selectedSection;
      const syMatch = selectedSchoolYear === 'All' || r.schoolYear === selectedSchoolYear;
      return (nameMatch || lrnMatch) && sectionMatch && syMatch;
    });
  };

  const records = getCombinedRecords();

  const recordsBySchool = useMemo(() => {
    const groups: Record<string, any[]> = {};
    records.forEach(r => {
      if (!groups[r.schoolId]) groups[r.schoolId] = [];
      groups[r.schoolId].push(r);
    });
    return groups;
  }, [records]);

  const schoolList = useMemo(() => {
    return Object.keys(recordsBySchool).map(id => {
      const sample = recordsBySchool[id][0];
      return {
        id,
        name: sample.schoolName || sample.rawLearner?.schoolName || `School ID: ${id}`,
        adviser: sample.adviser || 'N/A',
        learnerCount: recordsBySchool[id].length
      };
    });
  }, [recordsBySchool]);

  // AUTO-EXPAND FOR SCHOOL USERS
  useEffect(() => {
    if (isSchoolUser && schoolList.length > 0 && !expandedSchoolId) {
      const timer = setTimeout(() => setExpandedSchoolId(schoolList[0].id), 0);
      return () => clearTimeout(timer);
    }
  }, [isSchoolUser, schoolList, expandedSchoolId]);

  const reportMeta = useMemo(() => {
    const activeSection = selectedSection === 'All' ? 'Consolidated View' : selectedSection;
    const activeYear = records.length > 0 ? records[0].schoolYear : '2024-2025';
    const activeAdviser = user.fullName;

    return { section: activeSection, schoolYear: activeYear, adviser: activeAdviser };
  }, [records, selectedSection, user.fullName]);

  const calculateCompletionPercent = (assessment: Assessment | undefined) => {
    if (!assessment) return 0;
    const scores = assessment.scores as any;
    const totalDomains = DOMAINS.length;
    const domainsWithData = DOMAINS.filter(d => scores[d.id] > 0).length;
    return Math.round((domainsWithData / totalDomains) * 100);
  };

  const exportToExcel = () => {
    const exportData = records.map(r => {
      const row: any = {
        'LRN': r.lrn,
        'Learner Name': r.learnerName,
        'Gender': r.gender,
        'Section': r.section,
      };

      // Only include administrative columns for users who can see them in the UI
      if (showAdviserColumn) {
        row['Adviser'] = r.adviser;
        row['School Head'] = r.schoolHeadName;
      }

      row['School Year'] = r.schoolYear;
      
      if (selectedPeriod === 'All') {
        row['1st Status'] = r.a1 ? `Completed (${calculateCompletionPercent(r.a1)}%)` : 'Pending';
        row['Mid Status'] = r.a2 ? `Completed (${calculateCompletionPercent(r.a2)}%)` : 'Pending';
        row['3rd Status'] = r.a3 ? `Completed (${calculateCompletionPercent(r.a3)}%)` : 'Pending';
      } else {
        row['Period'] = r.period;
        row['Completion %'] = calculateCompletionPercent(r.period === 'FIRST ASSESSMENT' ? r.a1 : r.period === 'MID-ASSESSMENT' ? r.a2 : r.a3) + '%';
      }

      return row;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ECCD Master List");
    XLSX.writeFile(wb, `ECCD_Master_Records_${reportMeta.section}.xlsx`);
  };

  const getScoreColor = (score: number | undefined) => {
    if (score === undefined || score === null) return 'text-gray-300 bg-gray-50';
    if (score >= 4) return 'text-emerald-600 bg-emerald-50';
    if (score >= 2) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Report Header */}
      <div className="bg-slate-900 rounded-[24px] p-6 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/10 rounded-full blur-[60px] -mr-24 -mt-24"></div>
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-900/40">
                <FileSpreadsheet className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight">Consolidated Master Records</h2>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">Registry of Assessment Milestones</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
                 <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-0.5 flex items-center gap-1.5"><GraduationCap className="w-3 h-3" /> School Year</p>
                 <p className="font-black text-xs">{reportMeta.schoolYear}</p>
              </div>
              <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
                 <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-0.5 flex items-center gap-1.5"><Briefcase className="w-3 h-3" /> Class Section</p>
                 <p className="font-black text-xs uppercase">{reportMeta.section}</p>
              </div>
              <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
                 <p className="text-[9px] font-black text-purple-400 uppercase tracking-widest mb-0.5 flex items-center gap-1.5"><UserIcon className="w-3 h-3" /> Primary Facilitator</p>
                 <p className="font-black text-xs uppercase truncate max-w-[120px]">{reportMeta.adviser}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-4 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search learners or LRN..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-gray-400" />
            <select
              value={selectedSchoolYear}
              onChange={(e) => setSelectedSchoolYear(e.target.value)}
              className="text-sm border-none bg-gray-50 rounded-lg px-3 py-2 outline-none font-bold text-gray-700 uppercase"
            >
              {schoolYearOptions.map(sy => <option key={sy} value={sy}>{sy === 'All' ? 'All Years' : `S.Y. ${sy}`}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="text-sm border-none bg-gray-50 rounded-lg px-3 py-2 outline-none font-bold text-gray-700 uppercase"
            >
              {uniqueSections.map(s => <option key={s} value={s}>{s === 'All' ? 'All Sections' : s}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="text-sm border-none bg-gray-50 rounded-lg px-3 py-2 outline-none font-bold text-gray-700"
            >
              <option value="All">All Transactions</option>
              {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <button
          onClick={exportToExcel}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold text-sm hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100"
        >
          <Download className="w-4 h-4" />
          Export Database
        </button>
      </div>

      <div className="space-y-4">
        {schoolList.map(school => {
          const isExpanded = expandedSchoolId === school.id;
          const schoolRecords = recordsBySchool[school.id] || [];

          return (
            <div key={school.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-300">
              <button 
                onClick={() => setExpandedSchoolId(isExpanded ? null : school.id)}
                className={`w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors ${isExpanded ? 'bg-slate-50/50 border-b border-gray-100' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600">
                    <SchoolIcon className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-black text-gray-900 text-sm uppercase tracking-tight">
                      {isCoordinator ? `${school.id} ${school.name}` : school.name}
                    </h3>
                    {!isSchoolUser && !isCoordinator && (
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                        ID: {school.id} • Lead Teacher: {school.adviser} • {school.learnerCount} Records
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                   {!isExpanded && (
                     <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.15em] flex items-center gap-2">
                       <Eye className="w-3.5 h-3.5" /> {isCoordinator ? 'Unhide Reports' : 'View School Data'}
                     </span>
                   )}
                   {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                </div>
              </button>

              {isExpanded && (
                <div className="overflow-x-auto animate-in fade-in slide-in-from-top-2 duration-300">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-3 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest sticky left-0 bg-gray-50 z-10 border border-gray-200 min-w-[180px]">Learner / Section</th>
                        {showAdviserColumn && (
                          <th className="px-3 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center border border-gray-200 min-w-[100px]">Adviser / Head</th>
                        )}
                        <th className="px-3 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center border border-gray-200 min-w-[150px]">RECORD STATUS (1st to 3rd)</th>
                        {DOMAINS.map(d => (
                          <th key={d.id} className="px-1 py-3 text-[8px] font-black text-gray-400 uppercase tracking-tighter text-center min-w-[65px] border border-gray-200">
                            {d.label.split(' ')[0]}
                          </th>
                        ))}
                        <th className="px-3 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right border border-gray-200 min-w-[120px]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {schoolRecords.map((record) => {
                        const p1 = calculateCompletionPercent(record.a1);
                        const p2 = calculateCompletionPercent(record.a2);
                        const p3 = calculateCompletionPercent(record.a3);
                        const avgCompletion = Math.round((p1 + p2 + p3) / 3);

                        return (
                          <tr key={record.id} className="hover:bg-blue-50/30 transition-colors group">
                            <td className="px-3 py-3 sticky left-0 bg-white group-hover:bg-blue-50/30 z-10 border border-gray-200 shadow-[2px_0_5px_rgba(0,0,0,0.01)]">
                              <div className="flex items-center gap-2">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-[9px] shrink-0 ${record.gender === 'Female' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'}`}>
                                  {record.learnerName[0]}
                                </div>
                                <div className="min-w-0">
                                   <div className="font-black text-gray-900 text-xs leading-tight truncate uppercase tracking-tight">{record.learnerName}</div>
                                   <div className="flex items-center gap-1.5 mt-0.5">
                                      <span className="text-[8px] font-mono text-gray-400">{record.lrn}</span>
                                      <span className="text-[7px] font-black px-1 py-0.5 bg-slate-100 text-slate-500 rounded uppercase tracking-tighter">{record.section}</span>
                                   </div>
                                </div>
                              </div>
                            </td>
                            {showAdviserColumn && (
                              <td className="px-2 py-3 text-center border border-gray-200">
                                  <div className="flex flex-col items-center">
                                      <span className="text-[8px] font-black text-gray-700 uppercase truncate max-w-[90px]" title={`Adviser: ${record.adviser}`}>
                                          {record.adviser || '---'}
                                      </span>
                                      <div className="flex items-center gap-1 mt-0.5 text-slate-400">
                                          <Shield className="w-2 h-2" />
                                          <span className="text-[7px] font-bold uppercase truncate max-w-[80px]" title={`Head: ${record.schoolHeadName}`}>
                                              {record.schoolHeadName || '---'}
                                          </span>
                                      </div>
                                  </div>
                              </td>
                            )}
                            <td className="px-2 py-3 text-center border border-gray-200">
                              <div className="flex flex-col gap-1.5">
                                {selectedPeriod === 'All' ? (
                                  <>
                                    <div className="flex items-center justify-between gap-1">
                                       <div className={`flex-1 px-1 py-0.5 rounded text-[7px] font-black uppercase border ${record.a1 ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-100 text-gray-300'}`}>
                                          1st:{record.a1 ? `${p1}%` : '---'}
                                       </div>
                                       <div className={`flex-1 px-1 py-0.5 rounded text-[7px] font-black uppercase border ${record.a2 ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-gray-50 border-gray-100 text-gray-300'}`}>
                                          Mid:{record.a2 ? `${p2}%` : '---'}
                                       </div>
                                       <div className={`flex-1 px-1 py-0.5 rounded text-[7px] font-black uppercase border ${record.a3 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-gray-50 border-gray-100 text-gray-300'}`}>
                                          3rd:{record.a3 ? `${p3}%` : '---'}
                                       </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                       <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                                          <div className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 transition-all duration-700" style={{ width: `${avgCompletion}%` }}></div>
                                       </div>
                                       <span className="text-[8px] font-black text-gray-600">{avgCompletion}%</span>
                                    </div>
                                  </>
                                ) : (
                                  <div className="flex flex-col items-center gap-1">
                                     <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-tight border w-full ${
                                       record.isPlaceholder ? 'bg-gray-50 border-gray-100 text-gray-400' : 'bg-blue-50 border-blue-200 text-blue-700'
                                     }`}>
                                        {record.isPlaceholder ? 'Pending' : 'Completed'}
                                     </span>
                                  </div>
                                )}
                              </div>
                            </td>
                            {DOMAINS.map(d => {
                              const score = record.scores[d.id];
                              return (
                                <td key={d.id} className="px-1 py-3 text-center border border-gray-200">
                                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg font-black text-[10px] border shadow-sm ${getScoreColor(score)} ${score !== undefined && score !== null && score !== "" ? 'border-current opacity-80' : 'border-gray-100'}`}>
                                    {score !== undefined && score !== null && score !== "" ? score : '-'}
                                  </span>
                                </td>
                              );
                            })}
                            <td className="px-2 py-3 text-right border border-gray-200">
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {selectedPeriod === 'All' ? (
                                  <div className="flex gap-0.5">
                                     {[record.a1, record.a2, record.a3].map((ast, i) => (
                                       <button 
                                         key={i}
                                         disabled={!ast}
                                         onClick={() => ast && onEditAssessment(ast)}
                                         className={`w-6 h-6 flex items-center justify-center rounded-lg transition-all border text-[9px] font-black ${ast ? 'hover:bg-blue-50 text-blue-600 border-blue-100' : 'text-gray-200 border-transparent'}`}
                                         title={ast ? `Edit ${PERIODS[i]}` : 'Not assessed'}
                                       >
                                         {i + 1}
                                       </button>
                                     ))}
                                  </div>
                                ) : (
                                  !record.isPlaceholder && (
                                    <button 
                                      onClick={() => onEditAssessment(record)}
                                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                  )
                                )}
                                <div className="w-px h-4 bg-gray-200 mx-1"></div>
                                <button 
                                  onClick={() => onEditLearner(record.rawLearner)}
                                  className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                  title="Profile"
                                >
                                  <UserCog className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => onDeleteLearner(record.learnerId)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
        
        {schoolList.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-24 text-center">
            <div className="flex flex-col items-center gap-3 text-gray-400">
              <UsersIcon className="w-16 h-16 opacity-10" />
              <p className="font-black text-sm uppercase tracking-widest">No matching records found.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Add missing icon used in consolidation view
const SchoolIcon = ({ className }: { className: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

export default MasterRecords;