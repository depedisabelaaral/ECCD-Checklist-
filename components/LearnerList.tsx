
import React, { useState } from 'react';
import { Learner, User } from '../types';
import { Search, Plus, FileSpreadsheet, CheckCircle2, ClipboardList, Trash2, Pencil, Calendar, Info } from 'lucide-react';
import * as XLSX from 'xlsx';

interface LearnerListProps {
  user: User;
  learners: Learner[];
  onAddLearner: () => void;
  onViewAssessments: (learner: Learner) => void;
  onImportLearners: (newLearners: Learner[]) => void;
  onDeleteLearner: (id: string) => void;
  onEditLearner: (learner: Learner) => void;
}

const LearnerList: React.FC<LearnerListProps> = ({ 
  user,
  learners, 
  onAddLearner, 
  onViewAssessments, 
  onImportLearners, 
  onDeleteLearner, 
  onEditLearner 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<Learner[] | null>(null);

  const filtered = learners.filter(l => 
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.lrn.includes(searchTerm)
  );

  const calculateAgeDescriptive = (birthday: string) => {
    if (!birthday) return "N/A";
    const birth = new Date(birthday);
    const today = new Date();
    if (isNaN(birth.getTime())) return "N/A";

    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    let days = today.getDate() - birth.getDate();

    if (days < 0) {
      months--;
    }
    if (months < 0) {
      years--;
      months += 12;
    }
    
    const yLabel = years === 1 ? 'yr' : 'yrs';
    const mLabel = months === 1 ? 'mo' : 'mos';
    return `${years}${yLabel}, ${months}${mLabel}`;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1, 
          defval: "",
          blankrows: true 
        });
        
        if (!rows || rows.length < 7) {
          alert("Import Error: The file does not have enough rows. Data should start at Row 7.");
          return;
        }

        const validLearners: Learner[] = [];
        const startRowIndex = 6; // Index 6 is Row 7
        
        const endRowIndex = Math.min(rows.length - 1, 500);

        for (let i = startRowIndex; i < endRowIndex; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          const firstCol = String(row[0] || "").toUpperCase();
          const secondCol = String(row[2] || "").toUpperCase();
          if (
            firstCol.includes("TOTAL") || 
            secondCol.includes("TOTAL") || 
            secondCol.includes("COMBINED") ||
            (firstCol === "" && secondCol === "")
          ) {
            continue; 
          }

          const colAValue = row[0];
          let lrnString = "";

          if (typeof colAValue === 'number') {
            lrnString = colAValue.toLocaleString('fullwide', { useGrouping: false });
          } else {
            lrnString = String(colAValue || "").trim();
            if (lrnString.toLowerCase().includes('e')) {
              const num = Number(lrnString);
              if (!isNaN(num)) {
                lrnString = num.toLocaleString('fullwide', { useGrouping: false });
              }
            }
          }

          const cleanLRN = lrnString.replace(/\D/g, "");

          if (cleanLRN.length > 0) {
            const nameRaw = String(row[2] || "").trim();
            const sexRaw = String(row[3] || "").trim().toUpperCase();
            const colGRaw = row[6] !== undefined ? String(row[6]).trim().toUpperCase() : "---";
            
            let detectedGender: 'Male' | 'Female' = 'Male';
            if (colGRaw === 'F' || colGRaw === 'FEMALE' || colGRaw.startsWith('F')) {
              detectedGender = 'Female';
            } else if (sexRaw === 'F' || sexRaw === 'FEMALE' || sexRaw.startsWith('F')) {
              detectedGender = 'Female';
            }

            let bday = '';
            if (row[7] instanceof Date) {
              bday = row[7].toISOString().split('T')[0];
            } else if (row[7]) {
              const dateVal = row[7];
              if (typeof dateVal === 'number') {
                const date = new Date((dateVal - 25569) * 86400 * 1000);
                bday = date.toISOString().split('T')[0];
              } else {
                bday = String(dateVal).trim();
              }
            }

            const addr = row.slice(17, 23).map(p => String(p || "").trim()).filter(Boolean).join(', ');

            validLearners.push({
              id: Math.random().toString(36).substr(2, 9),
              lrn: cleanLRN,
              name: nameRaw || 'Unknown Learner',
              gender: detectedGender,
              birthday: bday,
              age: parseInt(String(row[9] || '0')) || 0,
              address: addr || 'N/A',
              fathersName: String(row[27] || '').trim(),
              mothersName: String(row[31] || '').trim(),
              // Use logged in user's schoolId instead of hardcoded 'sch-1'
              schoolId: user.schoolId || 'sch-1',
              handedness: 'Right',
              fathersOccupation: '',
              mothersOccupation: '',
              fathersEducation: '',
              mothersEducation: '',
              numSiblings: 0,
              birthOrder: '',
              status: 'New Student/Enrolled',
              excelColG: colGRaw
            });
          }
        }

        if (validLearners.length > 0) {
          setPreviewData(validLearners);
        } else {
          alert("Import Failed: No valid records found.");
        }
      } catch (error) {
        console.error("Excel Import Error:", error);
        alert("Error reading file.");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = ''; 
  };

  const confirmImport = () => {
    if (previewData) {
      onImportLearners(previewData);
      setImportStatus(`Successfully imported ${previewData.length} learners.`);
      setPreviewData(null);
      setTimeout(() => setImportStatus(null), 6000);
    }
  };

  return (
    <div className="space-y-6">
      {importStatus && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-4 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 pointer-events-none" />
          <span className="font-medium">{importStatus}</span>
        </div>
      )}

      {/* Import Preview Modal */}
      {previewData && (
        <div className="fixed inset-0 z-[60] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 rounded-xl"><FileSpreadsheet className="w-6 h-6 text-blue-600 pointer-events-none" /></div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Import Preview</h3>
                  <p className="text-sm text-gray-500">Records being assigned to {user.schoolName || 'Current School'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setPreviewData(null)} className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">Discard</button>
                <button onClick={confirmImport} className="px-7 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-200 transition-all">Import {previewData.length} Records</button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-6 bg-gray-50/50">
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="bg-gray-100 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-4 border-r border-gray-200">LRN</th>
                      <th className="px-3 py-4 border-r border-gray-200">Name</th>
                      <th className="px-3 py-4 border-r border-gray-200 text-center bg-blue-50 text-blue-600">Sex</th>
                      <th className="px-3 py-4 border-r border-gray-200 text-center">Birthdate</th>
                      <th className="px-3 py-4 border-r border-gray-200 text-center">Age</th>
                      <th className="px-3 py-4 border-r border-gray-200">Address</th>
                      <th className="px-3 py-4 border-r border-gray-200 text-center">School ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {previewData.map((p, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-3 py-4 border-r border-gray-100 font-mono text-blue-600 font-bold">{p.lrn}</td>
                        <td className="px-3 py-4 border-r border-gray-100 font-semibold text-gray-900">{p.name}</td>
                        <td className="px-3 py-4 border-r border-gray-100 text-center font-bold text-blue-600 bg-blue-50/20">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${p.excelColG === 'F' ? 'bg-pink-100 text-pink-700' : p.excelColG === 'M' ? 'bg-blue-100 text-blue-700' : ''}`}>
                            {p.excelColG}
                          </span>
                        </td>
                        <td className="px-3 py-4 border-r border-gray-200 text-center font-bold text-gray-700">
                          {p.birthday || "---"}
                        </td>
                        <td className="px-3 py-4 border-r border-gray-100 text-center text-gray-600 font-bold">{calculateAgeDescriptive(p.birthday)}</td>
                        <td className="px-3 py-4 border-r border-gray-100 truncate max-w-[150px] text-gray-500">{p.address}</td>
                        <td className="px-3 py-4 text-center font-bold text-blue-600">
                          {p.schoolId}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name or LRN..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 font-bold text-sm hover:border-emerald-500 hover:text-emerald-600 cursor-pointer transition-all group shadow-sm">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform pointer-events-none" />
            <span>Import Excel</span>
            <input type="file" className="hidden" accept=".xls,.xlsx" onChange={handleFileUpload} />
          </label>
          <button 
            onClick={onAddLearner}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 pointer-events-none" />
            <span>Add Learner</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-5 text-xs font-bold text-gray-500 uppercase tracking-wider">ID / Name</th>
                <th className="px-6 py-5 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Status</th>
                <th className="px-6 py-5 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Birthdate</th>
                <th className="px-6 py-5 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Sex</th>
                <th className="px-6 py-5 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Current Age</th>
                <th className="px-6 py-5 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((learner) => (
                <tr key={learner.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-sm ${
                        learner.gender === 'Female' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {learner.name[0]}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{learner.name}</div>
                        <div className="text-xs text-gray-400 font-mono tracking-tight">{learner.lrn}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tight border ${
                      learner.status === 'Transferred-Out' 
                        ? 'bg-red-50 text-red-600 border-red-100' 
                        : learner.status === 'Transferred-In'
                        ? 'bg-amber-50 text-amber-600 border-amber-100'
                        : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                    }`}>
                      {learner.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-center">
                     <div className="flex flex-col items-center">
                        <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                           <Calendar className="w-3 h-3 text-blue-400 pointer-events-none" />
                           {learner.birthday || "---"}
                        </span>
                     </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${learner.gender === 'Female' ? 'bg-pink-50 text-pink-600' : 'bg-blue-50 text-blue-600'}`}>
                      {learner.excelColG || learner.gender}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-center text-sm font-bold text-gray-700">{calculateAgeDescriptive(learner.birthday)}</td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={() => onViewAssessments(learner)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-xl transition-all"
                        title="View Assessments"
                      >
                        <ClipboardList className="w-5 h-5 pointer-events-none" />
                      </button>
                      <button 
                        onClick={() => onEditLearner(learner)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                        title="Edit Learner Profile"
                      >
                        <Pencil className="w-5 h-5 pointer-events-none" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteLearner(learner.id);
                        }}
                        className="p-2 text-red-400 hover:text-red-700 hover:bg-red-100 rounded-xl transition-all shadow-sm"
                        title="Delete Learner Profile"
                      >
                        <Trash2 className="w-5 h-5 pointer-events-none" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <ClipboardList className="w-12 h-12 opacity-20 pointer-events-none" />
                      <p className="font-medium text-sm">No learners found matching your criteria.</p>
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

export default LearnerList;
