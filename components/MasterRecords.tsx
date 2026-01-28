
import React, { useState } from 'react';
import { Learner, Assessment } from '../types';
import { DOMAINS, PERIODS } from '../constants';
import { Search, FileSpreadsheet, Download, Filter, Pencil, Trash2, UserMinus, UserCog } from 'lucide-react';
import * as XLSX from 'xlsx';

interface MasterRecordsProps {
  learners: Learner[];
  assessments: Assessment[];
  onDeleteAssessment: (id: string) => void;
  onEditAssessment: (assessment: Assessment) => void;
  onDeleteLearner: (id: string) => void;
  onEditLearner: (learner: Learner) => void;
}

const MasterRecords: React.FC<MasterRecordsProps> = ({ 
  learners, 
  assessments, 
  onDeleteAssessment, 
  onEditAssessment,
  onDeleteLearner,
  onEditLearner
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('All');

  const getCombinedRecords = () => {
    const list: any[] = [];
    learners.forEach(learner => {
      const learnerAssessments = assessments.filter(a => a.learnerId === learner.id);
      
      if (selectedPeriod === 'All') {
        if (learnerAssessments.length === 0) {
          list.push({
            id: "no-ast-" + learner.id,
            learnerId: learner.id,
            learnerName: learner.name,
            lrn: learner.lrn,
            gender: learner.gender,
            period: 'Pending',
            scores: {},
            date: '---',
            isPlaceholder: true,
            rawLearner: learner
          });
        } else {
          learnerAssessments.forEach(a => {
            list.push({
              ...a,
              learnerName: learner.name,
              lrn: learner.lrn,
              gender: learner.gender,
              isPlaceholder: false,
              rawLearner: learner
            });
          });
        }
      } else {
        const periodAssessment = learnerAssessments.find(a => a.period === selectedPeriod);
        list.push({
          id: (periodAssessment ? periodAssessment.id : ("no-ast-" + learner.id + "-" + selectedPeriod)),
          learnerId: learner.id,
          learnerName: learner.name,
          lrn: learner.lrn,
          gender: learner.gender,
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
      return nameMatch || lrnMatch;
    });
  };

  const records = getCombinedRecords();

  const exportToExcel = () => {
    const exportData = records.map(r => {
      const row: any = {
        'Date': r.date,
        'LRN': r.lrn,
        'Learner Name': r.learnerName,
        'Gender': r.gender,
        'Period': r.period
      };
      
      DOMAINS.forEach(d => {
        row[d.label] = r.scores[d.id] || 0;
      });
      
      row['Status'] = r.isPlaceholder ? 'Pending' : 'Completed';
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ECCD Master List");
    XLSX.writeFile(wb, "ECCD_Master_Records.xlsx");
  };

  const getScoreColor = (score: number | undefined) => {
    if (score === undefined) return 'text-gray-300 bg-gray-50';
    if (score >= 4) return 'text-emerald-600 bg-emerald-50';
    if (score >= 2) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex flex-1 items-center gap-4">
          <div className="relative flex-1 max-w-sm">
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
            <Filter className="w-4 h-4 text-gray-400" />
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

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest sticky left-0 bg-gray-50 z-10">Learner Info</th>
                <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Status</th>
                {DOMAINS.map(d => (
                  <th key={d.id} className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center min-w-[80px]">
                    {d.label.split(' ')[0]}
                  </th>
                ))}
                <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map((record) => (
                <tr key={record.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-4 py-4 sticky left-0 bg-white group-hover:bg-blue-50/30 z-10 border-r border-gray-100 shadow-[2px_0_5px_rgba(0,0,0,0.01)]">
                    <div className="font-bold text-gray-900 text-sm">{record.learnerName}</div>
                    <div className="text-[10px] text-gray-400 font-mono">{record.lrn}</div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    {record.isPlaceholder ? (
                      <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-gray-100 text-gray-400">
                        Pending
                      </span>
                    ) : (
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                        record.period === 'FIRST ASSESSMENT' ? 'bg-blue-100 text-blue-700' :
                        record.period === 'MID-ASSESSMENT' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {record.period}
                      </span>
                    )}
                  </td>
                  {DOMAINS.map(d => {
                    const score = record.scores[d.id];
                    return (
                      <td key={d.id} className="px-4 py-4 text-center">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold text-sm ${getScoreColor(score)}`}>
                          {score !== undefined ? score : '-'}
                        </span>
                      </td>
                    );
                  })}
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!record.isPlaceholder && (
                        <>
                          <button 
                            onClick={() => onEditAssessment(record as any)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                            title="Edit Assessment Record"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => onDeleteAssessment(record.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                            title="Delete Assessment Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <div className="w-px h-6 bg-gray-100 mx-1"></div>
                      <button 
                        onClick={() => onEditLearner(record.rawLearner)}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                        title="Edit Full Learner Profile"
                      >
                        <UserCog className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => onDeleteLearner(record.learnerId)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Permanently Delete Learner and All Records"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <FileSpreadsheet className="w-12 h-12 opacity-20" />
                      <p className="font-medium">The database is currently empty.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MasterRecords;
