import React, { useState, useEffect } from 'react';
import { DOMAINS, PERIODS, ECCD_TASKS } from '../constants';
import { SCALED_SCORE_TABLES, STANDARD_SCORE_TABLE } from '../constants/scaledScores';
import { Assessment, Learner, ECCDScore } from '../types';
import { Save, X, ChevronDown, ChevronUp, Info, Calendar, FileText } from 'lucide-react';

interface AssessmentFormProps {
  learner: Learner;
  initialData?: Assessment;
  // Fix: Added targetPeriod to props interface to match usage in App.tsx
  targetPeriod?: Assessment['period'];
  onSubmit: (assessment: Omit<Assessment, 'id'>) => void;
  onCancel: () => void;
}

// Fix: Destructured targetPeriod from props
const AssessmentForm: React.FC<AssessmentFormProps> = ({ learner, initialData, targetPeriod, onSubmit, onCancel }) => {
  // Fix: Use targetPeriod as fallback if initialData.period is missing
  const [period, setPeriod] = useState<Assessment['period']>(initialData?.period || targetPeriod || 'FIRST ASSESSMENT');
  const [expandedDomain, setExpandedDomain] = useState<string | null>('grossMotor');
  
  const [periodDates, setPeriodDates] = useState<[string, string, string]>(() => {
    const today = new Date().toISOString().split('T')[0];
    const initialDates: [string, string, string] = [today, today, today];
    if (initialData) {
      const idx = PERIODS.indexOf(initialData.period);
      initialDates[idx] = initialData.date;
    }
    return initialDates;
  });

  const [taskData, setTaskData] = useState<Record<string, boolean[][]>>(() => {
    const initial: Record<string, boolean[][]> = {};
    DOMAINS.forEach(d => {
      const taskCount = ECCD_TASKS[d.id]?.length || 0;
      initial[d.id] = Array.from({ length: taskCount }, () => [false, false, false]);
    });

    if (initialData?.checklist) {
      Object.keys(initialData.checklist).forEach(domainId => {
        const periodIdx = PERIODS.indexOf(initialData.period);
        initialData.checklist![domainId].forEach((passed, taskIdx) => {
          if (initial[domainId] && initial[domainId][taskIdx]) {
            initial[domainId][taskIdx][periodIdx] = passed;
          }
        });
      });
    }
    return initial;
  });

  const [remarks, setRemarks] = useState(initialData?.remarks || '');

  const calculateAgeAtDate = (birthday: string, evalDate: string) => {
    if (!birthday || !evalDate) return "---";
    const birth = new Date(birthday);
    const evaluation = new Date(evalDate);
    if (isNaN(birth.getTime()) || isNaN(evaluation.getTime())) return "---";

    let years = evaluation.getFullYear() - birth.getFullYear();
    let months = evaluation.getMonth() - birth.getMonth();
    let days = evaluation.getDate() - birth.getDate();

    if (days < 0) {
      months--;
    }
    if (months < 0) {
      years--;
      months += 12;
    }

    return `${years}.${months}`;
  };

  const formatAgeDescriptive = (ageStr: string) => {
    if (ageStr === "---") return "---";
    const [years, months] = ageStr.split('.');
    const yLabel = years === '1' ? 'year' : 'years';
    const mLabel = months === '1' ? 'month' : 'months';
    return `${years} ${yLabel} and ${months} ${mLabel}`;
  };

  const handleToggleTask = (domainId: string, taskIdx: number, periodIdx: number) => {
    setTaskData(prev => {
      const newDomainData = [...prev[domainId]];
      newDomainData[taskIdx] = [...newDomainData[taskIdx]];
      newDomainData[taskIdx][periodIdx] = !newDomainData[taskIdx][periodIdx];
      return { ...prev, [domainId]: newDomainData };
    });
  };

  const calculateDomainScore = (domainId: string, periodIdx: number) => {
    return taskData[domainId].filter(task => task[periodIdx]).length;
  };

  const getScaledScore = (domainId: string, raw: number, ageStr: string) => {
    if (ageStr === "---") return "-";
    const ageNum = parseFloat(ageStr);
    
    let tableKey = "";
    if (ageNum >= 3.1 && ageNum <= 4.0) tableKey = '3.1-4.0';
    else if (ageNum >= 4.1 && ageNum <= 5.0) tableKey = '4.1-5.0';
    else if (ageNum >= 5.1) tableKey = '5.1-above';
    else return "-";

    const scaled = SCALED_SCORE_TABLES[tableKey]?.[domainId]?.[raw];
    return scaled !== undefined ? scaled : "-";
  };

  const getInterpretation = (scaled: any) => {
    if (scaled === "-") return "-";
    const s = Number(scaled);
    if (s <= 6) return "Significant Delay";
    if (s <= 9) return "Slight Delay";
    if (s <= 12) return "Average";
    if (s <= 15) return "Slightly Advanced";
    return "Highly Advanced";
  };

  const getStandardScore = (periodIdx: number) => {
    let sum = 0;
    let allValid = true;
    
    DOMAINS.forEach(d => {
      const raw = calculateDomainScore(d.id, periodIdx);
      const ageStr = calculateAgeAtDate(learner.birthday, periodDates[periodIdx]);
      const scaled = getScaledScore(d.id, raw, ageStr);
      if (scaled === "-") allValid = false;
      else sum += Number(scaled);
    });

    if (!allValid || sum < 29 || sum > 98) return "-";
    return STANDARD_SCORE_TABLE[sum] || "-";
  };

  const getOverallInterpretation = (stdScore: any) => {
    if (stdScore === "-") return "-";
    const s = Number(stdScore);
    if (s <= 69) return "Suggests Significant Delay";
    if (s <= 79) return "Suggests Slight Delay";
    if (s <= 119) return "Average Development";
    if (s <= 129) return "Suggests Slight Advancement";
    return "Suggests High Advancement";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const currentPeriodIdx = PERIODS.indexOf(period);
    
    const finalScores: ECCDScore = {
      grossMotor: calculateDomainScore('grossMotor', currentPeriodIdx),
      fineMotor: calculateDomainScore('fineMotor', currentPeriodIdx),
      selfHelp: calculateDomainScore('selfHelp', currentPeriodIdx),
      receptiveLanguage: calculateDomainScore('receptiveLanguage', currentPeriodIdx),
      expressiveLanguage: calculateDomainScore('expressiveLanguage', currentPeriodIdx),
      cognitive: calculateDomainScore('cognitive', currentPeriodIdx),
      socioEmotional: calculateDomainScore('socioEmotional', currentPeriodIdx),
    };

    const checklistSlice: Record<string, boolean[]> = {};
    DOMAINS.forEach(d => {
      checklistSlice[d.id] = taskData[d.id].map(tasks => tasks[currentPeriodIdx]);
    });

    onSubmit({
      learnerId: learner.id,
      date: periodDates[currentPeriodIdx],
      period,
      scores: finalScores,
      remarks,
      checklist: checklistSlice
    });
  };

  const updatePeriodDate = (idx: number, date: string) => {
    setPeriodDates(prev => {
      const next = [...prev] as [string, string, string];
      next[idx] = date;
      return next;
    });
  };

  return (
    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-6xl w-full max-h-[95vh] flex flex-col animate-in zoom-in-95 duration-200">
      <div className="bg-slate-900 px-8 py-6 text-white flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-2xl font-black tracking-tight">{initialData ? 'Update Record' : 'Enroll Assessment'}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-blue-400 font-bold text-sm uppercase">{learner.name}</span>
            <span className="text-slate-500 text-xs">•</span>
            <span className="text-slate-400 text-xs font-mono">LRN: {learner.lrn}</span>
            <span className="text-slate-500 text-xs ml-2">Birthday: {learner.birthday}</span>
          </div>
        </div>
        <button onClick={onCancel} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
          <X className="w-6 h-6" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
        <div className="px-8 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-6">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active Period</label>
              <select 
                value={period}
                onChange={(e) => setPeriod(e.target.value as any)}
                className="block w-48 text-xs font-black bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none uppercase"
              >
                {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div className="flex items-center gap-3">
              <Info className="w-4 h-4 text-blue-500" />
              <p className="text-xs text-gray-500">Processing <span className="font-bold text-gray-900 uppercase">"{period}"</span> with standardized conversion tables.</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/50">
          {DOMAINS.map((domain) => {
            const isExpanded = expandedDomain === domain.id;
            const tasks = ECCD_TASKS[domain.id] || [];
            
            return (
              <div key={domain.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedDomain(isExpanded ? null : domain.id)}
                  className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl bg-opacity-10 ${domain.color.replace('text-', 'bg-')}`}>
                      {React.cloneElement(domain.icon as React.ReactElement<any>, { className: `w-6 h-6 ${domain.color}` })}
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-black text-gray-900">{domain.label} Domain</h3>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Current Score:</span>
                        <span className={`text-xs font-black ${domain.color}`}>{calculateDomainScore(domain.id, PERIODS.indexOf(period))} / {domain.max}</span>
                      </div>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 animate-in slide-in-from-top-2">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50/50 border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                          <tr>
                            <th className="px-6 py-4 min-w-[300px]">Task Description</th>
                            {PERIODS.map((p, idx) => (
                              <th key={p} className="px-4 py-4 text-center border-l border-gray-100 bg-white/50">
                                {idx + 1}{idx === 0 ? 'st' : idx === 1 ? 'nd' : 'rd'} Assessment
                              </th>
                            ))}
                          </tr>
                          <tr className="bg-white border-b border-gray-100 text-[9px] text-gray-400">
                            <td className="px-6 py-3 font-black">Date & Age</td>
                            {PERIODS.map((p, idx) => (
                              <td key={p} className="px-4 py-3 text-center border-l border-gray-50">
                                <div className="flex flex-col items-center gap-1">
                                  <input 
                                    type="date" 
                                    className="bg-gray-50 rounded px-1 text-[10px] font-bold outline-none border border-gray-200" 
                                    value={periodDates[idx]}
                                    onChange={(e) => updatePeriodDate(idx, e.target.value)}
                                  />
                                  <span className="text-blue-600 font-black">Age: {formatAgeDescriptive(calculateAgeAtDate(learner.birthday, periodDates[idx]))}</span>
                                </div>
                              </td>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {tasks.map((taskLabel, idx) => (
                            <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex gap-3">
                                  <span className="text-gray-400 font-bold text-sm">{idx + 1}.</span>
                                  <span className="text-gray-700 text-sm leading-tight font-medium">{taskLabel}</span>
                                </div>
                              </td>
                              {PERIODS.map((_, pIdx) => (
                                <td key={pIdx} className="px-4 py-4 text-center border-l border-gray-50/50">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleTask(domain.id, idx, pIdx)}
                                    className={`w-7 h-7 rounded-lg border-2 transition-all flex items-center justify-center mx-auto ${
                                      taskData[domain.id][idx][pIdx]
                                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-100'
                                        : 'border-gray-200 bg-white hover:border-emerald-300'
                                    }`}
                                  >
                                    {taskData[domain.id][idx][pIdx] && (
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </button>
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-50/30 text-gray-900 text-sm">
                          <tr className="border-t border-gray-200">
                            <td className="px-6 py-4 font-bold">Raw Score</td>
                            {PERIODS.map((_, pIdx) => (
                                <td key={pIdx} className="px-4 py-4 text-center font-black text-lg border-l border-gray-50">
                                  {calculateDomainScore(domain.id, pIdx)}
                                </td>
                            ))}
                          </tr>
                          <tr className="border-t border-gray-100">
                            <td className="px-6 py-4 font-bold">Scaled Score</td>
                            {PERIODS.map((_, pIdx) => {
                              const raw = calculateDomainScore(domain.id, pIdx);
                              const ageStr = calculateAgeAtDate(learner.birthday, periodDates[pIdx]);
                              return (
                                <td key={pIdx} className="px-4 py-4 text-center font-black text-blue-600 border-l border-gray-50">
                                  {getScaledScore(domain.id, raw, ageStr)}
                                </td>
                              );
                            })}
                          </tr>
                          <tr className="border-t border-gray-100">
                            <td className="px-6 py-4 font-bold text-xs uppercase text-gray-400 tracking-wider">Domain Interpretation</td>
                            {PERIODS.map((_, pIdx) => {
                              const raw = calculateDomainScore(domain.id, pIdx);
                              const ageStr = calculateAgeAtDate(learner.birthday, periodDates[pIdx]);
                              const scaled = getScaledScore(domain.id, raw, ageStr);
                              return (
                                <td key={pIdx} className="px-4 py-4 text-center text-[10px] leading-tight border-l border-gray-50 italic font-bold">
                                  {getInterpretation(scaled)}
                                </td>
                              );
                            })}
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* FINAL SUMMARY TABLE */}
          <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
            <div className="px-8 py-6 border-b border-slate-800 flex items-center gap-4">
              <div className="p-3 bg-blue-600/20 rounded-2xl">
                <FileText className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">Consolidated Evaluation Summary</h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Standard Score Equivalent (Total Child's Record)</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-800/50 border-b border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  <tr>
                    <th className="px-8 py-4">Evaluation Metric</th>
                    {PERIODS.map((p, idx) => (
                      <th key={p} className="px-6 py-4 text-center border-l border-slate-800">
                        {idx + 1}{idx === 0 ? 'st' : idx === 1 ? 'nd' : 'rd'} Assessment
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-sm">
                  <tr className="bg-slate-900/40">
                    <td className="px-8 py-5 text-white font-bold">Sum of Scaled Scores</td>
                    {PERIODS.map((_, pIdx) => {
                      let sum = 0;
                      DOMAINS.forEach(d => {
                        const raw = calculateDomainScore(d.id, pIdx);
                        const ageStr = calculateAgeAtDate(learner.birthday, periodDates[pIdx]);
                        const scaled = getScaledScore(d.id, raw, ageStr);
                        if (scaled !== "-") sum += Number(scaled);
                      });
                      return (
                        <td key={pIdx} className="px-6 py-5 text-center border-l border-slate-800 text-blue-400 font-black text-xl">
                          {sum > 0 ? sum : '-'}
                        </td>
                      );
                    })}
                  </tr>
                  <tr className="bg-slate-900/60">
                    <td className="px-8 py-5 text-white font-bold">Standard Score (Equiv.)</td>
                    {PERIODS.map((_, pIdx) => {
                      const stdScore = getStandardScore(pIdx);
                      return (
                        <td key={pIdx} className="px-6 py-5 text-center border-l border-slate-800 text-emerald-400 font-black text-2xl">
                          {stdScore}
                        </td>
                      );
                    })}
                  </tr>
                  <tr className="bg-slate-800/20">
                    <td className="px-8 py-5 text-slate-400 font-black text-[10px] uppercase tracking-wider">Standard Score Interpretation</td>
                    {PERIODS.map((_, pIdx) => {
                      const stdScore = getStandardScore(pIdx);
                      return (
                        <td key={pIdx} className="px-6 py-5 text-center border-l border-slate-800 text-slate-300 italic font-bold text-xs">
                          {getOverallInterpretation(stdScore)}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="p-8 bg-white border-t border-gray-200 flex items-center justify-between shrink-0">
          <div className="flex-1 max-w-lg mr-8">
             <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Qualitative Observations / Notes</label>
             <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={2}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                placeholder="Note any behavioral observations for this specific assessment period..."
              />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onCancel} className="px-8 py-3 rounded-2xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-50">Cancel</button>
            <button type="submit" className="flex items-center gap-3 px-12 py-3 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-95">
              <Save className="w-5 h-5" />
              {initialData ? 'Update Current Record' : 'Save Active Assessment'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AssessmentForm;