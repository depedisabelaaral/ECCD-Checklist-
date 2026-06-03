
import React, { useState, useMemo } from 'react';
import { Learner, User } from '../types';
import { Search, Plus, FileSpreadsheet, CheckCircle2, ClipboardList, Trash2, Pencil, Calendar, Info, Bell, X, Users as UsersIcon, CalendarDays, GraduationCap } from 'lucide-react';
import { getAutomaticSchoolYear } from '../constants';
import * as XLSX from 'xlsx';

interface LearnerListProps {
  user: User;
  learners: Learner[];
  startDateFilter: string;
  setStartDateFilter: (date: string) => void;
  endDateFilter: string;
  setEndDateFilter: (date: string) => void;
  onAddLearner: () => void;
  onViewAssessments: (learner: Learner) => void;
  onImportLearners: (newLearners: Learner[]) => void;
  onDeleteLearner: (id: string) => void;
  onEditLearner: (learner: Learner) => void;
  onDeleteMultipleLearners: (ids: string[]) => void;
}

const LearnerList: React.FC<LearnerListProps> = ({ 
  user,
  learners, 
  startDateFilter,
  setStartDateFilter,
  endDateFilter,
  setEndDateFilter,
  onAddLearner, 
  onViewAssessments, 
  onImportLearners, 
  onDeleteLearner, 
  onEditLearner,
  onDeleteMultipleLearners
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<string>(user.schoolYear || getAutomaticSchoolYear());
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<Learner[] | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Reset selection to only keep existing IDs when learners list changes
  React.useEffect(() => {
    setSelectedIds(prev => {
      const next = new Set<string>();
      prev.forEach(id => {
        if (learners.some(l => l.id === id)) {
          next.add(id);
        }
      });
      return next;
    });
  }, [learners]);

  const filtered = useMemo(() => learners.filter(l => {
    const matchesSearch = l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         l.lrn.includes(searchTerm);
    const matchesDate = startDateFilter === '' || l.dateOfBeginningOfClasses === startDateFilter;
    const matchesSY = selectedSchoolYear === 'All' || l.schoolYear === selectedSchoolYear;
    return matchesSearch && matchesDate && matchesSY;
  }), [learners, searchTerm, startDateFilter, selectedSchoolYear]);

  const isAllSelected = useMemo(() => {
    if (filtered.length === 0) return false;
    return filtered.every(l => selectedIds.has(l.id));
  }, [filtered, selectedIds]);

  const handleSelectAllToggle = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (isAllSelected) {
        // Deselect all filtered learners
        filtered.forEach(l => next.delete(l.id));
      } else {
        // Select all filtered learners
        filtered.forEach(l => next.add(l.id));
      }
      return next;
    });
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    onDeleteMultipleLearners(Array.from(selectedIds));
  };

  const schoolYearOptions = useMemo(() => {
    const years = new Set<string>();
    learners.forEach(l => { if (l.schoolYear) years.add(l.schoolYear); });
    years.add(user.schoolYear || getAutomaticSchoolYear());
    return ['All', ...Array.from(years).sort().reverse()];
  }, [learners, user.schoolYear]);
  const categorized = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => {
      // Primary sort by Section
      const sectionA = a.section || '';
      const sectionB = b.section || '';
      const sectionCompare = sectionA.localeCompare(sectionB);
      if (sectionCompare !== 0) return sectionCompare;
      
      // Secondary sort by Name
      return a.name.localeCompare(b.name);
    });

    return {
      Male: sorted.filter(l => l.gender === 'Male'),
      Female: sorted.filter(l => l.gender === 'Female')
    };
  }, [filtered]);

  const calculateAgeAtBeginningOfSY = (birthday: string, startDate: string | undefined, schoolYear: string) => {
    if (!birthday) return "---";
    
    // Robust date parsing for different formats
    const bParts = birthday.split(/[-/]/);
    if (bParts.length !== 3) return "---";
    
    let bYear: number, bMonth: number, bDay: number;
    const yearIdx = bParts.findIndex(p => p.length === 4);
    
    if (yearIdx === 0) {
      bYear = parseInt(bParts[0]);
      bMonth = parseInt(bParts[1]);
      bDay = parseInt(bParts[2]);
    } else if (yearIdx === 2) {
      bYear = parseInt(bParts[2]);
      const p0 = parseInt(bParts[0]);
      const p1 = parseInt(bParts[1]);
      if (p0 > 12) {
        bDay = p0;
        bMonth = p1;
      } else {
        bMonth = p0;
        bDay = p1;
      }
    } else {
      bYear = parseInt(bParts[0]);
      bMonth = parseInt(bParts[1]);
      bDay = parseInt(bParts[2]);
    }
    
    if (isNaN(bYear) || isNaN(bMonth) || isNaN(bDay)) return "---";

    let targetYear: number;
    let targetMonth: number;
    let targetDay: number;

    if (startDate && startDate !== '') {
      const sParts = startDate.split(/[-/]/);
      const sYearIdx = sParts.findIndex(p => p.length === 4);
      if (sYearIdx === 0) {
        targetYear = parseInt(sParts[0]);
        targetMonth = parseInt(sParts[1]);
        targetDay = parseInt(sParts[2]);
      } else if (sYearIdx === 2) {
        targetYear = parseInt(sParts[2]);
        targetMonth = parseInt(sParts[0]);
        targetDay = parseInt(sParts[1]);
      } else {
        targetYear = parseInt(sParts[0]);
        targetMonth = parseInt(sParts[1]);
        targetDay = parseInt(sParts[2]);
      }
    } else if (schoolYear) {
      const startYearMatch = schoolYear.match(/^(\d{4})/);
      targetYear = startYearMatch ? parseInt(startYearMatch[1]) : new Date().getFullYear();
      targetMonth = 6;
      targetDay = 1;
    } else {
      return "---";
    }

    if (isNaN(targetYear) || isNaN(targetMonth) || isNaN(targetDay)) return "---";

    let y = targetYear - bYear;
    let m = targetMonth - bMonth;

    if (targetDay < bDay) {
      m--;
    }

    if (m < 0) {
      y--;
      m += 12;
    }

    if (y < 0) return "---";
    
    return `${y} Year${y !== 1 ? 's' : ''}, ${m} Month${m !== 1 ? 's' : ''}`;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset error & success states on new upload attempt
    setImportError(null);
    setImportStatus(null);

    // Smart helper to clean and normalize headers to cover curly/smart quotes, abbreviations, and extra spaces
    const cleanHeader = (cell: any): string => {
      if (cell === undefined || cell === null) return "";
      return String(cell)
        .toLowerCase()
        .replace(/[’‘“”’‘´`']/g, "'") // normalized smart/curly quotes
        .replace(/[^a-z0-9]/g, "") // alphanumeric only for robustness
        .trim();
    };

    // Robust parser that can format numeric values or scientific exponent strings (like 1.03e11) to normal integer strings
    const formatNumericString = (val: any): string => {
      if (val === undefined || val === null) return "";
      if (typeof val === 'number') {
        return Number(val).toFixed(0);
      }
      let str = String(val).trim();
      if (str.endsWith(".0")) {
        str = str.slice(0, -2);
      } else if (str.endsWith(".00")) {
        str = str.slice(0, -3);
      }
      if (/^[+-]?\d*(\.\d+)?e[+-]?\d+$/i.test(str)) {
        const num = Number(str);
        if (!isNaN(num)) {
          return num.toFixed(0);
        }
      }
      return str;
    };

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          setImportError("Import Error: No tables or sheets were found in the uploaded workbook.");
          return;
        }

        let consolidatedLearners: Learner[] = [];
        let detectedSheetsList: string[] = [];

        // Scan ALL sheets to consolidate and support both split folders/sheets (Male/Female tabs) and standard configurations
        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          if (!worksheet) continue;

          const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1, 
            defval: "",
            blankrows: true 
          });
          
          if (!rows || rows.length === 0) continue;

          // Let's analyze and detect columns from rows inside this specific sheet
          let lrnColIdx = -1;
          let nameColIdx = -1;
          let sexColIdx = -1;
          let bdayColIdx = -1;
          let sectionColIdx = -1;
          let ageColIdx = -1;
          let fatherColIdx = -1;
          let motherColIdx = -1;

          let detectedSection = '';
          let detectedAdviser = '';
          let detectedSchoolHead = '';
          let detectedSchoolName = user.schoolName || '';
          let detectedSchoolId = user.schoolId || '';
          let detectedSchoolYear = '2024-2025';

          // Get Section from cell AM4 (Row 4, Column 39) if available (0-indexed 3, 38)
          if (rows[3] && rows[3][38]) {
            detectedSection = String(rows[3][38]).trim().toUpperCase();
          }
          
          // Scan first 20 rows for column headers and school metadata
          for (let r = 0; r < Math.min(rows.length, 20); r++) {
            const row = rows[r];
            if (!row) continue;
            
            for (let c = 0; c < row.length; c++) {
              const rawVal = row[c];
              if (rawVal === undefined || rawVal === null || rawVal === "") continue;
              
              const strVal = String(rawVal).trim();
              const cellVal = strVal.toUpperCase();
              
              // Metadata discovery
              if (cellVal.includes('SCHOOL NAME')) {
                detectedSchoolName = String(row[c+1] || row[c+2] || "").trim().toUpperCase();
              }
              if (cellVal.includes('SCHOOL ID')) {
                detectedSchoolId = String(row[c+1] || row[c+2] || "").trim().toUpperCase();
              }
              if (cellVal.includes('SCHOOL YEAR') || cellVal.includes('S.Y.')) {
                const combinedText = cellVal + " " + String(row[c+1] || "").toUpperCase();
                const match = combinedText.match(/(\d{4}\s*-\s*\d{4})/);
                if (match) detectedSchoolYear = match[0].replace(/\s/g, '');
              }

              // Normalised header discovery with fuzzy mapping - LOCK IN the first match to prevent footers overriding correct headers!
              const clean = cleanHeader(rawVal);
              if (clean.includes("lrn") || (clean.includes("learner") && clean.includes("reference"))) {
                if (lrnColIdx === -1) lrnColIdx = c;
              }
              if (clean.includes("name") && !/school|teacher|adviser|father|mother|guardian|parent|by|head|facilitator/i.test(clean)) {
                if (nameColIdx === -1) nameColIdx = c;
              }
              if (clean.includes("sex") || clean.includes("gender") || clean === "mf") {
                if (sexColIdx === -1) sexColIdx = c;
              }
              if (clean.includes("birth") || clean.includes("bdate") || clean.includes("bday") || clean === "dob" || clean.includes("dateofbirth")) {
                if (bdayColIdx === -1) bdayColIdx = c;
              }
              if (clean === "section" || (clean.includes("section") && !clean.includes("intersection"))) {
                if (sectionColIdx === -1) sectionColIdx = c;
              }
              if (clean.includes('ageasof') || (clean.startsWith('age') && clean.includes('june'))) {
                if (ageColIdx === -1) ageColIdx = c;
              }

              // Fallback Section detection if AM4 was empty or not defined
              if (!detectedSection && clean === "section") {
                const match = strVal.match(/SECTION[:\s-]+([^\s][^:]*)/i);
                if (match && match[1]) {
                  detectedSection = match[1].trim().toUpperCase();
                } else {
                  const nextVal = String(row[c+1] || "").trim();
                  if (nextVal) {
                    detectedSection = nextVal.toUpperCase();
                  }
                }
              }

              if (cellVal.includes("PREPARED BY")) {
                 for (let k = 1; k <= 5; k++) {
                   const valBelow = rows[r+k]?.[c];
                   if (valBelow && String(valBelow).trim() !== "") {
                     detectedAdviser = String(valBelow).trim();
                     break;
                   }
                 }
              }

              if (cellVal.includes("CERTIFIED CORRECT:")) {
                 detectedSchoolHead = String(rows[r+1]?.[c] || rows[r+2]?.[c] || "").trim().toUpperCase();
              }
            }
          }

          // Dynamic scanner: Guess columns by scanning actual values inside student patterns
          if (lrnColIdx === -1 || nameColIdx === -1 || bdayColIdx === -1) {
            for (let r = 4; r < Math.min(rows.length, 50); r++) {
              const row = rows[r];
              if (!row || row.length < 4) continue;

              let foundLrn = -1;
              let foundName = -1;
              let foundSex = -1;
              let foundBday = -1;

              for (let c = 0; c < row.length; c++) {
                const val = row[c];
                if (val === undefined || val === null || val === '') continue;

                let strVal = String(val).trim();
                const cleanStr = formatNumericString(val).replace(/\D/g, "");

                // LRN is typically a 12 digit number
                if (cleanStr.length === 12 && !isNaN(Number(cleanStr))) {
                  foundLrn = c;
                }

                // Name standard matches
                const hasLetters = /[A-Z]/i.test(strVal);
                if (typeof val === 'string' && hasLetters && strVal.length > 5) {
                  const upperStr = strVal.toUpperCase();
                  if (!/school|form|section|year|report|total|count|remark|schoolyear|teacher|adviser/i.test(upperStr)) {
                    if (strVal.includes(',') || strVal.split(/\s+/).length >= 2) {
                      foundName = c;
                    }
                  }
                }

                // Gender indicator
                const upperStr = strVal.toUpperCase();
                if (upperStr === 'M' || upperStr === 'F' || upperStr === 'MALE' || upperStr === 'FEMALE') {
                  foundSex = c;
                }

                // Birthday scanning
                if (val instanceof Date) {
                  foundBday = c;
                } else if (typeof val === 'number' && val > 20000 && val < 60000) {
                  foundBday = c;
                } else if (typeof val === 'string' && (val.includes('/') || val.includes('-')) && val.length >= 8) {
                  const parsedDate = Date.parse(val);
                  if (!isNaN(parsedDate)) {
                    const yearMatch = val.match(/(19|20)\d{2}/);
                    if (yearMatch) {
                      foundBday = c;
                    }
                  }
                }
              }

              if (foundLrn !== -1) {
                if (lrnColIdx === -1) lrnColIdx = foundLrn;
                if (nameColIdx === -1 && foundName !== -1) nameColIdx = foundName;
                if (sexColIdx === -1 && foundSex !== -1) sexColIdx = foundSex;
                if (bdayColIdx === -1 && foundBday !== -1) bdayColIdx = foundBday;
                if (foundName !== -1) break; // Found a strong line that contains both LRN and Name
              }
            }
          }

          // Fallback column indexes if scan didn't capture them
          if (lrnColIdx === -1) lrnColIdx = 1; // Column B
          if (nameColIdx === -1) nameColIdx = 2; // Column C
          if (sexColIdx === -1) sexColIdx = 3; // Column D
          if (bdayColIdx === -1) bdayColIdx = 4; // Column E (Birth Date)
          if (ageColIdx === -1) ageColIdx = 9; // Column J
          if (fatherColIdx === -1) fatherColIdx = 27; // Column AB
          if (motherColIdx === -1) motherColIdx = 31; // Column AF

          const currentSheetLearners: Learner[] = [];
          const startRowIndex = 4; // Scan from row 4 onwards for flexible layout variants
          const endRowIndex = Math.min(rows.length, 1000); // Allow sheets up to 1000 lines

          for (let i = startRowIndex; i < endRowIndex; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;

            const firstCol = String(row[0] || "").toUpperCase();
            const secondCol = String(row[2] || "").toUpperCase();
            if (
              firstCol.includes("TOTAL") || 
              secondCol.includes("TOTAL") || 
              secondCol.includes("COMBINED") ||
              secondCol.includes("COUNT") ||
              firstCol.includes("PREPARED") ||
              secondCol.includes("PREPARED")
            ) {
              continue; 
            }

            const colVal = row[lrnColIdx] !== undefined ? row[lrnColIdx] : row[0];
            let lrnString = formatNumericString(colVal);
            const cleanLRN = lrnString.replace(/\D/g, "");

            // Flexible validation check: allow files where LRN is not present or partial, but Name and Gender are valid
            const isValidLRN = cleanLRN.length >= 10 && cleanLRN.length <= 15;
            const nameRaw = String(row[nameColIdx] !== undefined ? row[nameColIdx] : (row[2] || "")).trim();
            const sexRaw = String(row[sexColIdx] !== undefined ? row[sexColIdx] : (row[3] || "")).trim().toUpperCase();

            const isValidName = nameRaw && 
                               nameRaw.length > 3 && 
                               !nameRaw.toUpperCase().includes('NAME') && 
                               !nameRaw.toUpperCase().includes('TOTAL') && 
                               !nameRaw.toUpperCase().includes('COUNT') &&
                               !nameRaw.toUpperCase().includes('PAGE') &&
                               !nameRaw.toUpperCase().includes('SCHOOL') &&
                               !nameRaw.toUpperCase().includes('PREPARED') &&
                               nameRaw !== '---';

            const isValidSex = sexRaw === 'M' || sexRaw === 'F' || sexRaw === 'MALE' || sexRaw === 'FEMALE';

            if (isValidLRN || (isValidName && isValidSex)) {
              if (!isValidName) {
                continue; // Ignore lines with valid LRN but no name
              }

              const colGRaw = row[6] !== undefined ? String(row[6]).trim().toUpperCase() : "---";
              
              let detectedGender: 'Male' | 'Female' = 'Male';
              if (colGRaw === 'F' || colGRaw === 'FEMALE' || colGRaw.startsWith('F')) {
                detectedGender = 'Female';
              } else if (sexRaw === 'F' || sexRaw === 'FEMALE' || sexRaw.startsWith('F')) {
                detectedGender = 'Female';
              }

              let bday = '';
              const bdayVal = row[bdayColIdx] !== undefined ? row[bdayColIdx] : row[4];
              if (bdayVal instanceof Date) {
                bday = bdayVal.toISOString().split('T')[0];
              } else if (bdayVal) {
                if (typeof bdayVal === 'number') {
                  const date = new Date((bdayVal - 25569) * 86400 * 1000);
                  bday = date.toISOString().split('T')[0];
                } else {
                  const bdayStr = String(bdayVal).trim();
                  if (bdayStr.includes('/') || bdayStr.includes('-')) {
                    const parsedDate = new Date(bdayStr);
                    if (!isNaN(parsedDate.getTime())) {
                      bday = parsedDate.toISOString().split('T')[0];
                    } else {
                      bday = bdayStr;
                    }
                  } else {
                    bday = bdayStr;
                  }
                }
              }

              const addr = row.slice(17, 23).map(p => String(p || "").trim()).filter(Boolean).join(', ');
              const rowSection = sectionColIdx !== -1 ? String(row[sectionColIdx] || "").trim() : "";
              const learnerSection = rowSection || detectedSection || '---';
              
              const learnerAge = ageColIdx !== -1 ? (row[ageColIdx] === "" ? 0 : Number(row[ageColIdx])) : (parseInt(String(row[9] || '0')) || 0);

              currentSheetLearners.push({
                id: Math.random().toString(36).substr(2, 9),
                lrn: cleanLRN || "N/A",
                name: nameRaw,
                gender: detectedGender,
                birthday: bday,
                age: learnerAge,
                address: addr || 'N/A',
                fathersName: String(row[fatherColIdx] || row[27] || '').trim(),
                mothersName: String(row[motherColIdx] || row[31] || '').trim(),
                schoolId: detectedSchoolId || user.schoolId || 'sch-1',
                handedness: 'Right',
                fathersOccupation: '',
                mothersOccupation: '',
                fathersEducation: '',
                mothersEducation: '',
                numSiblings: 0,
                birthOrder: '',
                status: 'ENROLLED',
                excelColG: colGRaw,
                schoolYear: detectedSchoolYear,
                dateOfBeginningOfClasses: startDateFilter || '', 
                dateOfEndOfClasses: endDateFilter || '',
                section: learnerSection,
                adviser: detectedAdviser,
                schoolHeadName: detectedSchoolHead
              });
            }
          }

          if (currentSheetLearners.length > 0) {
            consolidatedLearners = [...consolidatedLearners, ...currentSheetLearners];
            detectedSheetsList.push(sheetName);
          }
        } // end sheet lookup

        if (consolidatedLearners.length > 0) {
          setPreviewData(consolidatedLearners);
        } else {
          setImportError("Import Failed: No valid learner records found in the uploaded file. Please make sure the sheet contains columns indicating LRNs (10-15 digits) and Learner Names in standard DepEd SF1 rows layout.");
        }
      } catch (error) {
        console.error("Excel Import Error:", error);
        setImportError("Import Error: Unable to read the uploaded spreadsheet file because of an unsupported format or corrupted tables.");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = ''; 
  };

  const confirmImport = () => {
    if (previewData) {
      onImportLearners(previewData);
      setImportStatus(`Successfully imported ${previewData.length} learners into the system.`);
      setPreviewData(null);
      setTimeout(() => setImportStatus(null), 6000);
    }
  };

  const renderTableRows = (learnersList: Learner[], gender: 'Male' | 'Female') => {
    return (
      <React.Fragment key={gender}>
        {learnersList.length > 0 && (
          <tr className="bg-gray-50/80">
            <td colSpan={7} className="px-6 py-1 border border-gray-200">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${gender === 'Male' ? 'bg-blue-500' : 'bg-pink-500'}`}></span>
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">
                  {gender} Category ({learnersList.length})
                </span>
              </div>
            </td>
          </tr>
        )}
        {learnersList.map((learner) => (
          <tr key={learner.id} className="hover:bg-blue-50/30 transition-colors group">
            <td className="px-4 py-1.5 text-center border border-gray-200 w-12 bg-white">
              <input 
                type="checkbox"
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                checked={selectedIds.has(learner.id)}
                onChange={() => handleSelectRow(learner.id)}
              />
            </td>
            <td className="px-6 py-1.5 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-sm ${
                  learner.gender === 'Female' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {learner.name[0]}
                </div>
                <div>
                  <div className="font-bold text-gray-900 text-[13px] leading-tight uppercase">{learner.name}</div>
                  <div className="text-[9px] text-gray-400 font-mono tracking-tight">{learner.lrn}</div>
                </div>
              </div>
            </td>
            <td className="px-6 py-1.5 text-center border border-gray-200">
              <div className="flex flex-col items-center">
                <span className="px-2 py-0.5 bg-slate-50 border border-slate-100 text-slate-600 rounded text-[9px] font-black uppercase tracking-widest">
                  {learner.section || '---'}
                </span>
                <span className="text-[8px] text-gray-400 font-bold uppercase mt-0.5">Facilitator: {user.fullName || learner.adviser || '---'}</span>
              </div>
            </td>
            <td className="px-6 py-1.5 text-center border border-gray-200">
               <div className="flex flex-col items-center">
                  <span className="text-[13px] font-bold text-gray-700 flex items-center gap-2">
                     <Calendar className="w-3 h-3 text-blue-400 pointer-events-none" />
                     {learner.birthday || "---"}
                  </span>
               </div>
            </td>
            <td className="px-6 py-1.5 text-center border border-gray-200">
              <span className={`px-2 py-0.5 rounded-md text-[11px] font-black uppercase ${learner.gender === 'Female' ? 'bg-pink-50 text-pink-600' : 'bg-blue-50 text-blue-600'}`}>
                {learner.excelColG || learner.gender}
              </span>
            </td>
            <td className="px-6 py-1.5 text-center text-[13px] font-black text-gray-700 border border-gray-200">{calculateAgeAtBeginningOfSY(learner.birthday, learner.dateOfBeginningOfClasses, learner.schoolYear)}</td>
            <td className="px-6 py-1.5 text-right border border-gray-200">
              <div className="flex items-center justify-end gap-1.5">
                <button 
                  onClick={() => onViewAssessments(learner)}
                  className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-xl transition-all"
                  title="View Assessments"
                >
                  <ClipboardList className="w-4 h-4 pointer-events-none" />
                </button>
                <button 
                  onClick={() => onEditLearner(learner)}
                  className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                  title="Edit Learner Profile"
                >
                  <Pencil className="w-4 h-4 pointer-events-none" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteLearner(learner.id);
                  }}
                  className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all"
                  title="Delete Learner Profile"
                >
                  <Trash2 className="w-4 h-4 pointer-events-none" />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </React.Fragment>
    );
  };

  return (
    <div className="space-y-6">
      {importStatus && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-6 py-4 rounded-2xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 shadow-xl shadow-emerald-500/5">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-emerald-100 rounded-xl">
                <Bell className="w-5 h-5 text-emerald-600 animate-bounce" />
             </div>
             <div>
                <p className="text-xs font-black uppercase tracking-widest text-emerald-600 leading-none mb-1">System Notification</p>
                <p className="font-bold text-sm">{importStatus}</p>
             </div>
          </div>
          <button onClick={() => setImportStatus(null)} className="p-2 hover:bg-emerald-100 rounded-xl transition-colors">
             <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {importError && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-2xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 shadow-xl shadow-red-500/5">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-red-100 rounded-xl">
                 <Info className="w-5 h-5 text-red-600 animate-pulse" />
             </div>
             <div>
                 <p className="text-xs font-black uppercase tracking-widest text-red-600 leading-none mb-1">Import Error Notification</p>
                 <p className="font-bold text-sm text-red-900">{importError}</p>
             </div>
          </div>
          <button onClick={() => setImportError(null)} className="p-2 hover:bg-red-100 rounded-xl transition-colors">
             <X className="w-4 h-4 text-red-600" />
          </button>
        </div>
      )}

      {previewData && (
        <div className="fixed inset-0 z-[60] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 rounded-xl"><FileSpreadsheet className="w-6 h-6 text-blue-600 pointer-events-none" /></div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">SF1 Import Preview</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <p className="text-sm text-gray-500">Acknowledging {previewData.length} learners for {user.schoolName || 'your school'}</p>
                    {previewData[0] && previewData[0].schoolYear && previewData[0].schoolYear !== (selectedSchoolYear === 'All' ? (user.schoolYear || getAutomaticSchoolYear()) : selectedSchoolYear) && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-50 text-amber-700 border border-amber-200 tracking-wide animate-pulse">
                        ⚠️ S.Y. Mismatch ({previewData[0].schoolYear})
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setPreviewData(null)} className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">Discard</button>
                <button onClick={confirmImport} className="px-7 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center gap-2">
                   <CheckCircle2 className="w-4 h-4" />
                   Acknowledge & Import
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-6 bg-gray-50/50">
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="bg-gray-100 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-4 border-r border-gray-200">LRN</th>
                      <th className="px-3 py-4 border-r border-gray-200">Name</th>
                      <th className="px-3 py-4 border-r border-gray-200 text-center bg-blue-50 text-blue-600">Section</th>
                      <th className="px-3 py-4 border-r border-gray-200 text-center">Birthdate</th>
                      <th className="px-3 py-4 border-r border-gray-200 text-center bg-emerald-50 text-emerald-700">Age as of Beginning of SY</th>
                      <th className="px-3 py-4 border-r border-gray-200">Adviser</th>
                      <th className="px-3 py-4 text-center">School ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {previewData.map((p, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-3 py-4 border-r border-gray-100 font-mono text-blue-600 font-bold">{p.lrn}</td>
                        <td className="px-3 py-4 border-r border-gray-100 font-semibold text-gray-900">{p.name}</td>
                        <td className="px-3 py-4 border-r border-gray-100 text-center font-bold text-blue-600 bg-blue-50/20 uppercase">
                          {p.section}
                        </td>
                        <td className="px-3 py-4 border-r border-gray-200 text-center font-bold text-gray-700">
                          {p.birthday || "---"}
                        </td>
                        <td className="px-3 py-4 border-r border-gray-100 text-center text-emerald-700 font-black">
                          {calculateAgeAtBeginningOfSY(p.birthday, p.dateOfBeginningOfClasses, p.schoolYear)}
                        </td>
                        <td className="px-3 py-4 border-r border-gray-100 truncate max-w-[150px] text-gray-500 uppercase italic font-bold">{p.adviser}</td>
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

      <div className="flex flex-col xl:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative w-full xl:w-56 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search name/LRN..."
            className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-[11px] font-semibold text-gray-700 shadow-xs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full xl:w-auto justify-end">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">S.Y.:</span>
            <div className="relative min-w-[100px]">
              <GraduationCap className="absolute left-2 top-1/2 -translate-y-1/2 text-blue-500 w-3.5 h-3.5 pointer-events-none" />
              <select
                className="w-full pl-7 pr-2 py-1.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-[11px] font-bold text-gray-700 bg-gray-50/50 cursor-pointer"
                value={selectedSchoolYear}
                onChange={(e) => setSelectedSchoolYear(e.target.value)}
              >
                {schoolYearOptions.map(sy => <option key={sy} value={sy}>{sy === 'All' ? 'All' : sy}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Beginning of Classes:</span>
            <div className="relative">
              <CalendarDays className="absolute left-2 top-1/2 -translate-y-1/2 text-blue-500 w-3.5 h-3.5 pointer-events-none" />
              <input
                type="date"
                className="pl-7 pr-2 py-1.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-[11px] font-semibold text-gray-700 bg-gray-50/50"
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
                title="Date of Beginning of Classes"
              />
              {startDateFilter && (
                <button 
                  onClick={() => setStartDateFilter('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">End of School Year:</span>
            <div className="relative">
              <CalendarDays className="absolute left-2 top-1/2 -translate-y-1/2 text-emerald-500 w-3.5 h-3.5 pointer-events-none" />
              <input
                type="date"
                className="pl-7 pr-2 py-1.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-[11px] font-semibold text-gray-700 bg-gray-50/50"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
                title="Date of End of School Year"
              />
              {endDateFilter && (
                <button 
                  onClick={() => setEndDateFilter('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {selectedIds.size > 0 && (
              <button 
                onClick={handleBulkDelete}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 text-white font-bold text-[11px] hover:bg-red-700 shadow-lg shadow-red-100 transition-all active:scale-95 shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5 pointer-events-none" />
                <span>Delete Selected ({selectedIds.size})</span>
              </button>
            )}

            <label 
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-700 font-bold text-[11px] transition-all group shadow-xs cursor-pointer shrink-0 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50/10"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-105 transition-transform pointer-events-none" />
              <span>Import SF1</span>
              <input 
                type="file" 
                className="hidden" 
                accept=".xls,.xlsx" 
                onChange={handleFileUpload} 
              />
            </label>

            <button 
              onClick={onAddLearner}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-[11px] hover:bg-blue-700 shadow-sm shadow-blue-100 transition-all active:scale-95 shrink-0"
            >
              <Plus className="w-3.5 h-3.5 pointer-events-none" />
              <span>Add Learner</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-center border border-gray-200 w-12 whitespace-nowrap">
                  <input 
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                    checked={isAllSelected}
                    onChange={handleSelectAllToggle}
                    title="Select/Deselect All Filtered Learners"
                  />
                </th>
                <th className="px-6 py-2 text-[10px] font-black text-gray-600 uppercase tracking-wider border border-gray-200 whitespace-nowrap">ID / Name</th>
                <th className="px-6 py-2 text-[10px] font-black text-gray-600 uppercase tracking-wider text-center border border-gray-200 whitespace-nowrap">Section</th>
                <th className="px-6 py-2 text-[10px] font-black text-gray-600 uppercase tracking-wider text-center border border-gray-200 whitespace-nowrap">Birthdate</th>
                <th className="px-6 py-2 text-[10px] font-black text-gray-600 uppercase tracking-wider text-center border border-gray-200 whitespace-nowrap">Sex</th>
                <th className="px-6 py-2 text-[10px] font-black text-gray-600 uppercase tracking-wider text-center border border-gray-200 whitespace-nowrap">Age as of Beginning of SY</th>
                <th className="px-6 py-2 text-[10px] font-black text-gray-600 uppercase tracking-wider text-right border border-gray-200 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                <>
                  {renderTableRows(categorized.Male, 'Male')}
                  {renderTableRows(categorized.Female, 'Female')}
                </>
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center border border-gray-200">
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
