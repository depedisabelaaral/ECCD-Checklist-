import React from 'react';
import { Learner, Assessment } from '../types';
import { DOMAINS, PERIODS } from '../constants';
import { SCALED_SCORE_TABLES, STANDARD_SCORE_TABLE } from '../constants/scaledScores';

interface ECCDCardProps {
  learner: Learner;
  assessment: Assessment;
}

const ECCDCard: React.FC<ECCDCardProps> = ({ learner, assessment }) => {
  const calculateAgeDescriptive = (birthday: string, refDate: string) => {
    if (!birthday) return "N/A";
    const birth = new Date(birthday);
    const ref = new Date(refDate);
    if (isNaN(birth.getTime())) return "N/A";

    let years = ref.getFullYear() - birth.getFullYear();
    let months = ref.getMonth() - birth.getMonth();
    let days = ref.getDate() - birth.getDate();

    if (days < 0) {
      months--;
    }
    if (months < 0) {
      years--;
      months += 12;
    }
    
    const yLabel = years === 1 ? 'year' : 'years';
    const mLabel = months === 1 ? 'month' : 'months';
    return `${years} ${yLabel} and ${months} ${mLabel}`;
  };

  const calculateAgeNumeric = (birthday: string, refDate: string) => {
    const birth = new Date(birthday);
    const ref = new Date(refDate);
    let years = ref.getFullYear() - birth.getFullYear();
    let months = ref.getMonth() - birth.getMonth();
    if (ref.getDate() < birth.getDate()) months--;
    if (months < 0) {
      years--;
      months += 12;
    }
    return `${years}.${months}`;
  };

  const getScaledScore = (domainId: string, raw: number, ageStr: string) => {
    const ageNum = parseFloat(ageStr);
    let tableKey = "";
    if (ageNum >= 3.1 && ageNum <= 4.0) tableKey = '3.1-4.0';
    else if (ageNum >= 4.1 && ageNum <= 5.0) tableKey = '4.1-5.0';
    else if (ageNum >= 5.1) tableKey = '5.1-above';
    else return "-";

    return SCALED_SCORE_TABLES[tableKey]?.[domainId]?.[raw] ?? "-";
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

  const ageStr = calculateAgeNumeric(learner.birthday, assessment.date);
  let totalScaled = 0;
  DOMAINS.forEach(d => {
    const s = getScaledScore(d.id, (assessment.scores as any)[d.id], ageStr);
    if (s !== "-") totalScaled += Number(s);
  });

  const standardScore = STANDARD_SCORE_TABLE[totalScaled] || "-";

  const getOverallInterpretation = (stdScore: any) => {
    if (stdScore === "-") return "-";
    const s = Number(stdScore);
    if (s <= 69) return "Suggests Significant Delay";
    if (s <= 79) return "Suggests Slight Delay";
    if (s <= 119) return "Average Development";
    if (s <= 129) return "Suggests Slight Advancement";
    return "Suggests High Advancement";
  };

  return (
    <div className="bg-white p-12 max-w-4xl mx-auto border border-gray-300 shadow-xl print:shadow-none print:border-none print:p-4">
      {/* Header */}
      <div className="text-center border-b-2 border-gray-800 pb-6 mb-8">
        <div className="flex justify-between items-center mb-4">
           <div className="w-16 h-16 bg-gray-100 rounded-full border border-gray-200"></div>
           <div className="flex-1">
              <h1 className="text-xl font-black uppercase tracking-tight">Early Childhood Care and Development (ECCD)</h1>
              <h2 className="text-lg font-bold">Checklist Profile</h2>
              <p className="text-xs font-bold text-gray-500 mt-1 uppercase">Department of Education • Republic of the Philippines</p>
           </div>
           <div className="w-16 h-16 bg-gray-100 rounded-full border border-gray-200"></div>
        </div>
        <div className="flex justify-center gap-12 mt-4 text-[10px] font-black uppercase text-gray-500">
          <p>Legislative District: 1st District</p>
          <p>School Year: 2024-2025</p>
          <p>Region: VII</p>
        </div>
      </div>

      {/* Learner Info Section */}
      <div className="space-y-8">
        <div className="grid grid-cols-2 gap-y-4 gap-x-12 text-xs">
          <div className="flex justify-between border-b border-gray-200 pb-1">
            <span className="font-bold uppercase text-[10px] text-gray-400">Name of Learner</span>
            <span className="font-black text-gray-900">{learner.name}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 pb-1">
            <span className="font-bold uppercase text-[10px] text-gray-400">LRN</span>
            <span className="font-mono font-black">{learner.lrn}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 pb-1">
            <span className="font-bold uppercase text-[10px] text-gray-400">Gender</span>
            <span className="font-bold">{learner.gender}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 pb-1">
            <span className="font-bold uppercase text-[10px] text-gray-400">Enrollment Status</span>
            <span className="font-black text-blue-700 uppercase">{learner.status}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 pb-1">
            <span className="font-bold uppercase text-[10px] text-gray-400">Handedness</span>
            <span>{learner.handedness}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 pb-1">
            <span className="font-bold uppercase text-[10px] text-gray-400">Birthday</span>
            <span>{learner.birthday}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 pb-1">
            <span className="font-bold uppercase text-[10px] text-gray-400">Age at Assessment</span>
            <span className="font-bold">{calculateAgeDescriptive(learner.birthday, assessment.date)}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 pb-1">
            <span className="font-bold uppercase text-[10px] text-gray-400">Assessment Date</span>
            <span className="font-bold">{assessment.date}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 pb-1">
            <span className="font-bold uppercase text-[10px] text-gray-400">Number of Siblings</span>
            <span>{learner.numSiblings}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 pb-1">
            <span className="font-bold uppercase text-[10px] text-gray-400">Birth Order</span>
            <span className="font-bold">{learner.birthOrder}</span>
          </div>
        </div>

        {/* Family Background */}
        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
           <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4">Family Background</h3>
           <div className="grid grid-cols-2 gap-x-12 gap-y-4 text-xs">
              <div className="space-y-2">
                <div className="flex justify-between border-b border-gray-200 pb-1">
                  <span className="font-bold">Father's Name:</span> 
                  <span className="font-black">{learner.fathersName} {learner.fathersAge ? `(Age: ${learner.fathersAge})` : ''}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-1">
                  <span className="text-gray-500 italic">Occupation:</span> 
                  <span>{learner.fathersOccupation || '---'}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-1">
                  <span className="text-gray-500 italic">Education:</span> 
                  <span>{learner.fathersEducation || '---'}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between border-b border-gray-200 pb-1">
                  <span className="font-bold">Mother's Name:</span> 
                  <span className="font-black">{learner.mothersName} {learner.mothersAge ? `(Age: ${learner.mothersAge})` : ''}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-1">
                  <span className="text-gray-500 italic">Occupation:</span> 
                  <span>{learner.mothersOccupation || '---'}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-1">
                  <span className="text-gray-500 italic">Education:</span> 
                  <span>{learner.mothersEducation || '---'}</span>
                </div>
              </div>
           </div>
        </div>

        {/* Assessment Scores Table */}
        <div className="border border-gray-300 rounded-xl overflow-hidden mt-8">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Developmental Domain</th>
                <th className="px-4 py-4 text-center">Raw Score</th>
                <th className="px-4 py-4 text-center">Scaled Score</th>
                <th className="px-6 py-4">Interpretation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-xs">
              {DOMAINS.map(d => {
                const raw = (assessment.scores as any)[d.id];
                const scaled = getScaledScore(d.id, raw, ageStr);
                return (
                  <tr key={d.id}>
                    <td className="px-6 py-4 font-bold text-gray-700">{d.label}</td>
                    <td className="px-4 py-4 text-center font-mono">{raw}</td>
                    <td className="px-4 py-4 text-center font-black text-blue-600">{scaled}</td>
                    <td className="px-6 py-4 italic text-gray-500">{getInterpretation(scaled)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-300">
               <tr>
                  <td className="px-6 py-4 font-black uppercase text-[10px] text-gray-500">Sum of Scaled Scores</td>
                  <td colSpan={2} className="px-4 py-4 text-center font-black text-lg text-blue-700">{totalScaled}</td>
                  <td></td>
               </tr>
               <tr className="bg-blue-50">
                  <td className="px-6 py-4 font-black uppercase text-[10px] text-blue-600">Standard Score (Equivalent)</td>
                  <td colSpan={2} className="px-4 py-4 text-center font-black text-2xl text-blue-900">{standardScore}</td>
                  <td className="px-6 py-4 font-black text-blue-900 uppercase tracking-tight">{getOverallInterpretation(standardScore)}</td>
               </tr>
            </tfoot>
          </table>
        </div>

        {/* Remarks Section */}
        <div className="mt-8 space-y-2">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Teacher's Observations & Remarks</h3>
          <div className="p-4 border border-gray-200 rounded-xl min-h-[100px] text-sm text-gray-700 italic bg-gray-50/30">
            {assessment.remarks || "No specific remarks recorded for this period."}
          </div>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-12 pt-16 mt-12">
           <div className="text-center">
              <div className="border-b border-gray-800 mx-auto w-48 mb-1"></div>
              <p className="text-[10px] font-black uppercase">Adviser / Examiner</p>
              <p className="text-[9px] text-gray-400">(Signature over Printed Name)</p>
           </div>
           <div className="text-center">
              <div className="border-b border-gray-800 mx-auto w-48 mb-1"></div>
              <p className="text-[10px] font-black uppercase">School Principal / Head</p>
              <p className="text-[9px] text-gray-400">(Signature over Printed Name)</p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ECCDCard;