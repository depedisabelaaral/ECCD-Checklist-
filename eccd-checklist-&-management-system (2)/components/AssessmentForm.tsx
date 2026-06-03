import React, { useState, useEffect } from 'react';
import { DOMAINS, PERIODS, ECCD_TASKS } from '../constants';
import { SCALED_SCORE_TABLES, STANDARD_SCORE_TABLE } from '../constants/scaledScores';
import { Assessment, Learner, ECCDScore } from '../types';
import { Save, X, ChevronDown, ChevronUp, Info, Calendar, FileText, Lock, GraduationCap, Check } from 'lucide-react';

interface AssessmentFormProps {
  learner: Learner;
  initialData?: Assessment;
  targetPeriod?: Assessment['period'];
  onSubmit: (assessment: Omit<Assessment, 'id'>) => void;
  onCancel: () => void;
}

const AssessmentForm: React.FC<AssessmentFormProps> = ({ learner, initialData, targetPeriod, onSubmit, onCancel }) => {
  const [period, setPeriod] = useState<Assessment['period']>(initialData?.period || targetPeriod || 'FIRST ASSESSMENT');
  const [expandedDomain, setExpandedDomain] = useState<string | null>('grossMotor');
  
  const currentPeriodIdx = PERIODS.indexOf(period);

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
        const pIdx = PERIODS.indexOf(initialData.period);
        Object.keys(initialData.checklist).forEach(domainId => {
            if (initial[domainId]) {
                initialData.checklist![domainId].forEach((passed, tIdx) => {
                    if (initial[domainId][tIdx]) initial[domainId][tIdx][pIdx] = passed;
                });
            }
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

  const handleToggleTask = (domainId: string, taskIdx: number, periodIdx: number) => {
    if (periodIdx !== currentPeriodIdx) return;

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
    if (s <= 69) return "Suggest Significant Delay in Overall Development";
    if (s <= 79) return "Suggest Slight Delay in Overall Development";
    if (s <= 119) return "Average Overall Development";
    if (s <= 129) return "Suggests Slightly Advanced Development";
    return "Suggest Highly Advanced Development";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
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
    if (idx !== currentPeriodIdx) return;
    setPeriodDates(prev => {
      const next = [...prev] as [string, string, string];
      next[idx] = date;
      return next;
    });
  };

  const activeDomainLabel = expandedDomain ? DOMAINS.find(d => d.id === expandedDomain)?.label : null;

  return (
    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-6xl w-full max-h-[95vh] flex flex-col animate-in zoom-in-95 duration-200">
      <div className="bg-slate-900 px-8 py-5 text-white flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-xl font-black tracking-tight">{initialData ? 'Update Assessment Record' : 'Enroll Assessment Entry'}</h2>
          <div className="flex items-center gap-4 mt-1">
            <div className="flex items-center gap-2">
               <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-black ring-2 ring-white/10">
                  {learner.name[0]}
               </div>
               <span className="text-blue-400 font-black text-xs uppercase tracking-tight">{learner.name}</span>
            </div>
            <div className="h-3 w-px bg-slate-700" />
            <div className="flex items-center gap-2">
               <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
               <span className="text-emerald-400 font-bold text-[10px] uppercase tracking-widest">S.Y. {learner.schoolYear}</span>
            </div>
            <div className="h-3 w-px bg-slate-700" />
            <div className="flex items-center gap-2">
               <span className="text-slate-400 text-[10px] font-mono">LRN: {learner.lrn}</span>
            </div>
          </div>
        </div>
        <button onClick={onCancel} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
        <div className="px-8 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-6">
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Active Period</label>
              <select 
                value={period}
                onChange={(e) => setPeriod(e.target.value as any)}
                className="block w-44 text-[11px] font-black bg-white border border-blue-500 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none uppercase shadow-sm"
              >
                {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="h-6 w-px bg-gray-200" />
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <Info className="w-3.5 h-3.5" />
              </div>
              <p className="text-[11px] text-gray-500">
                Evaluating: <span className="font-black text-blue-600 underline">{period}</span>
                {activeDomainLabel && (
                  <>
                    <span className="mx-2 text-gray-300">|</span>
                    <span className="font-black text-slate-800 uppercase">{activeDomainLabel} Domain</span>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
          {DOMAINS.map((domain) => {
            const isExpanded = expandedDomain === domain.id;
            const tasks = ECCD_TASKS[domain.id] || [];
            
            return (
              <div key={domain.id} className={`bg-white rounded-xl border transition-all ${isExpanded ? 'border-blue-300 shadow-md ring-1 ring-blue-50' : 'border-gray-200 shadow-sm'} overflow-hidden`}>
                <button
                  type="button"
                  onClick={() => setExpandedDomain(isExpanded ? null : domain.id)}
                  className={`w-full flex items-center justify-between px-6 py-3 transition-colors ${isExpanded ? 'bg-blue-50/30' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-opacity-10 ${domain.color.replace('text-', 'bg-')}`}>
                      {React.cloneElement(domain.icon as React.ReactElement<any>, { className: `w-5 h-5 ${domain.color}` })}
                    </div>
                    <div className="text-left">
                      <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">{domain.label} Domain</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Current Score:</span>
                        <span className={`text-[11px] font-black ${domain.color}`}>{calculateDomainScore(domain.id, currentPeriodIdx)} / {domain.max}</span>
                      </div>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 animate-in slide-in-from-top-2">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50/50 border-b border-gray-200 text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                          <tr>
                            <th className="px-6 py-3 min-w-[300px]">Checklist Execution</th>
                            {PERIODS.map((p, idx) => {
                              const isActive = idx === currentPeriodIdx;
                              return (
                                <th key={p} className={`px-2 py-3 text-center border-l border-gray-100 transition-colors ${isActive ? 'bg-blue-50/50 text-blue-700' : 'bg-white/50 opacity-40'}`}>
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span>{idx + 1}{idx === 0 ? 'st' : idx === 1 ? 'nd' : 'rd'} Assessment</span>
                                    {isActive && <span className="text-[7px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full">ACTIVE</span>}
                                  </div>
                                </th>
                              );
                            })}
                          </tr>
                          <tr className="bg-white border-b border-gray-100 text-[8px] text-gray-400">
                            <td className="px-6 py-2 font-black">Date & Age</td>
                            {PERIODS.map((p, idx) => {
                              const isActive = idx === currentPeriodIdx;
                              return (
                                <td key={p} className={`px-2 py-2 text-center border-l border-gray-50 ${isActive ? '' : 'opacity-30 pointer-events-none'}`}>
                                  <div className="flex flex-col items-center gap-0.5">
                                    <input 
                                      type="date" 
                                      disabled={!isActive}
                                      className="bg-gray-50 rounded px-1 text-[8px] font-bold outline-none border border-gray-200 disabled:bg-gray-100" 
                                      value={periodDates[idx]}
                                      onChange={(e) => updatePeriodDate(idx, e.target.value)}
                                    />
                                    <span className={`${isActive ? 'text-blue-600' : 'text-gray-400'} font-black`}>Age: {calculateAgeAtDate(learner.birthday, periodDates[idx])}</span>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {tasks.map((taskLabel, idx) => (
                            <tr key={idx} className="hover:bg-blue-50/20 group/row transition-colors">
                              <td className="px-6 py-2">
                                <div className="flex gap-2">
                                  <span className="text-gray-400 font-bold text-xs">{idx + 1}.</span>
                                  <span className="text-gray-700 text-[11px] leading-snug font-semibold">{taskLabel}</span>
                                </div>
                              </td>
                              {PERIODS.map((_, pIdx) => {
                                const isColumnEnabled = pIdx === currentPeriodIdx;
                                const isChecked = taskData[domain.id][idx][pIdx];
                                return (
                                  <td 
                                    key={pIdx} 
                                    onClick={() => isColumnEnabled && handleToggleTask(domain.id, idx, pIdx)}
                                    className={`px-2 py-2 text-center border-l border-gray-50/50 cursor-pointer transition-colors ${isColumnEnabled ? 'hover:bg-blue-50/50' : 'grayscale opacity-30 cursor-not-allowed bg-gray-50/20'}`}
                                  >
                                    <div
                                      style={{ width: '28px', height: '28px' }}
                                      className={`rounded-lg border-2 transition-all flex items-center justify-center mx-auto shadow-sm ${
                                        isChecked
                                          ? 'bg-emerald-500 border-emerald-500 text-white scale-105'
                                          : isColumnEnabled 
                                            ? 'border-slate-300 bg-white group-hover/row:border-blue-400' 
                                            : 'border-gray-200 bg-white'
                                      } ${!isColumnEnabled ? 'pointer-events-none' : 'hover:scale-110 active:scale-95'}`}
                                    >
                                      {isChecked ? (
                                        <Check className="w-4 h-4 stroke-[4]" />
                                      ) : isColumnEnabled ? (
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200 group-hover/row:bg-blue-200" />
                                      ) : (
                                        <Lock className="w-3 h-3 text-gray-300" />
                                      )}
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-50/30 text-gray-900 text-[11px]">
                          <tr className="border-t border-gray-200">
                            <td className="px-6 py-2.5 font-bold">Raw Score</td>
                            {PERIODS.map((_, pIdx) => (
                                <td key={pIdx} className={`px-2 py-2.5 text-center font-black text-sm border-l border-gray-50 ${pIdx === currentPeriodIdx ? 'text-blue-700' : 'opacity-40'}`}>
                                  {calculateDomainScore(domain.id, pIdx)}
                                </td>
                            ))}
                          </tr>
                          <tr className="border-t border-gray-100">
                            <td className="px-6 py-2.5 font-bold">Scaled Score Equivalent</td>
                            {PERIODS.map((_, pIdx) => {
                              const raw = calculateDomainScore(domain.id, pIdx);
                              const ageStr = calculateAgeAtDate(learner.birthday, periodDates[pIdx]);
                              const scaled = getScaledScore(domain.id, raw, ageStr);
                              return (
                                <td key={pIdx} className={`px-2 py-2.5 text-center font-black text-sm border-l border-gray-50 ${pIdx === currentPeriodIdx ? 'text-blue-600' : 'opacity-40'}`}>
                                  {scaled}
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

          <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-xl border border-slate-800">
            <div className="px-8 py-4 border-b border-slate-800 flex items-center gap-3">
              <div className="p-2 bg-blue-600/20 rounded-xl">
                <FileText className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-tight">Consolidated Evaluation</h3>
                <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">Standard Score Calculation Matrix</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-800/50 border-b border-slate-800 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  <tr>
                    <th className="px-8 py-3">Metric</th>
                    {PERIODS.map((p, idx) => (
                      <th key={p} className={`px-6 py-3 text-center border-l border-slate-800 ${idx === currentPeriodIdx ? 'bg-blue-600/10' : 'opacity-40'}`}>
                        {idx + 1}{idx === 0 ? 'st' : idx === 1 ? 'nd' : 'rd'} Assessment
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-xs">
                  <tr className="bg-slate-900/40">
                    <td className="px-8 py-3 text-white font-bold">Sum of Scaled Scores</td>
                    {PERIODS.map((_, pIdx) => {
                      let sum = 0;
                      DOMAINS.forEach(d => {
                        const raw = calculateDomainScore(d.id, pIdx);
                        const ageStr = calculateAgeAtDate(learner.birthday, periodDates[pIdx]);
                        const scaled = getScaledScore(d.id, raw, ageStr);
                        if (scaled !== "-") sum += Number(scaled);
                      });
                      return (
                        <td key={pIdx} className={`px-6 py-3 text-center border-l border-slate-800 font-black text-base ${pIdx === currentPeriodIdx ? 'text-blue-400' : 'text-slate-500 opacity-50'}`}>
                          {sum > 0 ? sum : '-'}
                        </td>
                      );
                    })}
                  </tr>
                  <tr className="bg-slate-900/60">
                    <td className="px-8 py-3 text-white font-bold">Standard Score</td>
                    {PERIODS.map((_, pIdx) => {
                      const stdScore = getStandardScore(pIdx);
                      return (
                        <td key={pIdx} className={`px-6 py-3 text-center border-l border-slate-800 font-black text-xl ${pIdx === currentPeriodIdx ? 'text-emerald-400' : 'text-slate-500 opacity-50'}`}>
                          {stdScore}
                        </td>
                      );
                    })}
                  </tr>
                  <tr className="bg-slate-800/20">
                    <td className="px-8 py-3 text-slate-400 font-black text-[9px] uppercase tracking-wider">Interpretation</td>
                    {PERIODS.map((_, pIdx) => {
                      const stdScore = getStandardScore(pIdx);
                      return (
                        <td key={pIdx} className={`px-6 py-3 text-center border-l border-slate-800 italic font-bold text-[10px] ${pIdx === currentPeriodIdx ? 'text-slate-300' : 'text-slate-600'}`}>
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

        <div className="p-6 bg-white border-t border-gray-200 flex items-center justify-between shrink-0">
          <div className="flex-1 max-w-lg mr-8">
             <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Observations / Remarks</label>
             <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                placeholder="Note any specific behavioral observations for this entry..."
              />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onCancel} className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-50 transition-all">Cancel</button>
            <button type="submit" className="flex items-center gap-2 px-10 py-2.5 rounded-xl bg-blue-600 text-white font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95">
              <Save className="w-4 h-4" />
              {initialData ? 'Update Entry' : 'Save Entry'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AssessmentForm;