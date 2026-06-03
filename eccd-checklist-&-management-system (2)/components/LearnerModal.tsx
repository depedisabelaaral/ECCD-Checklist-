
import React, { useState, useMemo } from 'react';
import { Learner, User, UserRole } from '../types';
import { X, User as UserIcon, ShieldCheck, MapPin, Calendar, Users as UsersIcon, GraduationCap, Briefcase, Hash, Info, UserCircle2, BookOpen, Shield, CalendarDays, Clock } from 'lucide-react';

interface LearnerModalProps {
  initialData?: Learner;
  user: User; 
  learners?: Learner[]; // Populated to get existing sections and advisers for options
  onSubmit: (learner: Omit<Learner, 'id'>) => void;
  onCancel: () => void;
}

const LearnerModal: React.FC<LearnerModalProps> = ({ initialData, user, learners = [], onSubmit, onCancel }) => {
  // Helper to ensure date is in YYYY-MM-DD for the input[type="date"]
  const formatDateForInput = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      // Split and check for 4-digit segment to normalize to YYYY-MM-DD for HTML input
      const parts = dateStr.split(/[-/]/);
      const yearIdx = parts.findIndex(p => p.length === 4);
      if (yearIdx === 2) {
        // MM-DD-YYYY or DD-MM-YYYY
        const y = parts[2];
        const m = parts[0].padStart(2, '0');
        const d = parts[1].padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return d.toISOString().split('T')[0];
    } catch (e) {
      return '';
    }
  };

  const existingSections = useMemo(() => {
    const sections = Array.from(new Set(learners.map(l => l.section).filter(Boolean)));
    return sections.sort();
  }, [learners]);

  const existingAdvisers = useMemo(() => {
    const advisers = Array.from(new Set(learners.map(l => l.adviser).filter(Boolean)));
    return advisers.sort();
  }, [learners]);

  const existingSchoolHeads = useMemo(() => {
    const heads = Array.from(new Set(learners.map(l => l.schoolHeadName).filter(Boolean)));
    return heads.sort();
  }, [learners]);

  const [formData, setFormData] = useState<Omit<Learner, 'id'>>({
    lrn: initialData?.lrn || '',
    name: initialData?.name || '',
    age: initialData?.age || 0,
    gender: initialData?.gender || 'Male',
    birthday: initialData?.birthday || '',
    address: initialData?.address || '',
    fathersName: initialData?.fathersName || '',
    fathersAge: initialData?.fathersAge || undefined,
    mothersName: initialData?.mothersName || '',
    mothersAge: initialData?.mothersAge || undefined,
    schoolId: initialData?.schoolId || user.schoolId || 'sch-1',
    handedness: initialData?.handedness || 'Right',
    fathersOccupation: initialData?.fathersOccupation || '',
    mothersOccupation: initialData?.mothersOccupation || '',
    fathersEducation: initialData?.fathersEducation || '',
    mothersEducation: initialData?.mothersEducation || '',
    numSiblings: initialData?.numSiblings || 0,
    birthOrder: initialData?.birthOrder || '1st',
    status: initialData?.status || 'ENROLLED',
    excelColG: initialData?.excelColG || '',
    schoolYear: initialData?.schoolYear || '2024-2025',
    dateOfBeginningOfClasses: initialData?.dateOfBeginningOfClasses || '',
    dateOfEndOfClasses: initialData?.dateOfEndOfClasses || localStorage.getItem('eccd_class_end_date') || '',
    section: initialData?.section || '',
    adviser: initialData?.adviser || (user.role === UserRole.SCHOOL_USER ? user.fullName : ''),
    schoolHeadName: initialData?.schoolHeadName || user.schoolHeadName || ''
  });

  const calculateAgeAtBeginningOfSY = (birthday: string, startDate: string | undefined, schoolYear: string) => {
    if (!birthday) return "---";
    
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

  const computedAgeDisplay = useMemo(() => {
    return calculateAgeAtBeginningOfSY(formData.birthday, formData.dateOfBeginningOfClasses, formData.schoolYear);
  }, [formData.birthday, formData.dateOfBeginningOfClasses, formData.schoolYear]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // We update the 'age' field numeric part for legacy compatibility if needed
    const yearsPart = parseInt(computedAgeDisplay.split(' ')[0]) || formData.age;
    onSubmit({ ...formData, age: yearsPart });
  };

  const getBirthOrderSuffix = (n: number) => {
    const lastDigit = n % 10;
    const lastTwoDigits = n % 100;
    if (lastDigit === 1 && lastTwoDigits !== 11) return 'st';
    if (lastDigit === 2 && lastTwoDigits !== 12) return 'nd';
    if (lastDigit === 3 && lastTwoDigits !== 13) return 'rd';
    return 'th';
  };

  const birthOrderOptions = Array.from({ length: 15 }, (_, i) => {
    const n = i + 1;
    return `${n}${getBirthOrderSuffix(n)}`;
  });

  const schoolYearOptions = [
    '2023-2024',
    '2024-2025',
    '2025-2026',
    '2026-2027'
  ];

  const labelClasses = "text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-1.5";
  const inputClasses = "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-semibold text-gray-900";

  return (
    <div className="bg-white rounded-[32px] shadow-2xl overflow-hidden max-w-4xl w-full animate-in zoom-in-95 duration-200 border border-gray-100">
      <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-900/40">
            <UserCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight">{initialData ? 'Modify Learner Profile' : 'Enroll New Learner'}</h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-0.5">Identification & Socio-Demographic Registry</p>
          </div>
        </div>
        <button onClick={onCancel} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
          <X className="w-6 h-6" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-10 space-y-10 overflow-y-auto max-h-[75vh]">
        {/* SECTION 1: IDENTIFICATION */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2">
               <ShieldCheck className="w-4 h-4" /> I. Identification & Status
            </h3>
            <div className="flex items-center gap-6">
               <div className="flex items-center gap-3">
                 <label className="text-[10px] font-black text-gray-400 uppercase">Status</label>
                 <select
                    className="px-3 py-1.5 border border-blue-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-[10px] font-black uppercase text-blue-700 bg-blue-50/50"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  >
                    <option value="ENROLLED">ENROLLED</option>
                    <option value="Transferred-In">Transferred-In</option>
                    <option value="Transferred-Out">Transferred-Out</option>
                  </select>
               </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-1">
              <label className={labelClasses}>Learner Reference Number (LRN)</label>
              <input
                required
                type="text"
                maxLength={12}
                placeholder="12-digit LRN"
                className={inputClasses}
                value={formData.lrn}
                onChange={(e) => setFormData({ ...formData, lrn: e.target.value.replace(/\D/g, '') })}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className={labelClasses}>Full Name (Last, First, M.I.)</label>
              <input
                required
                type="text"
                placeholder="e.g. DELA CRUZ, JUAN A."
                className={`${inputClasses} uppercase`}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-1">
              <label className={labelClasses}>School Year</label>
              <select
                className={inputClasses}
                value={formData.schoolYear}
                onChange={(e) => setFormData({ ...formData, schoolYear: e.target.value })}
              >
                {schoolYearOptions.map(sy => <option key={sy} value={sy}>{sy}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className={labelClasses}><CalendarDays className="w-3.5 h-3.5 text-blue-500" /> Date of Beginning of Classes</label>
              <input
                type="date"
                className={inputClasses}
                value={formatDateForInput(formData.dateOfBeginningOfClasses || '')}
                onChange={(e) => setFormData({ ...formData, dateOfBeginningOfClasses: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className={labelClasses}><CalendarDays className="w-3.5 h-3.5 text-emerald-500" /> End of School Year Date</label>
              <input
                type="date"
                className={inputClasses}
                value={formatDateForInput(formData.dateOfEndOfClasses || '')}
                onChange={(e) => setFormData({ ...formData, dateOfEndOfClasses: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-1">
              <label className={labelClasses}>Class Section</label>
              <div className="relative">
                <input
                  required
                  type="text"
                  list="section-suggestions"
                  placeholder="e.g. KINDER-A"
                  className={`${inputClasses} uppercase`}
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value.toUpperCase() })}
                />
                <datalist id="section-suggestions">
                  {existingSections.map(s => <option key={s} value={s} />)}
                </datalist>
              </div>
            </div>
            <div className="space-y-1">
              <label className={labelClasses}>Adviser / Teacher</label>
              <div className="relative">
                <input
                  required
                  type="text"
                  list="adviser-suggestions"
                  placeholder="e.g. MARK CABILDO"
                  className={`${inputClasses} uppercase`}
                  value={formData.adviser}
                  onChange={(e) => setFormData({ ...formData, adviser: e.target.value.toUpperCase() })}
                />
                <datalist id="adviser-suggestions">
                  {existingAdvisers.map(a => <option key={a} value={a} />)}
                </datalist>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-1 md:col-span-2">
              <label className={labelClasses}><Shield className="w-3.5 h-3.5 text-blue-500" /> School Head / Principal</label>
              <div className="relative">
                <input
                  required
                  type="text"
                  list="head-suggestions"
                  placeholder="e.g. JUAN LUNA"
                  className={`${inputClasses} uppercase`}
                  value={formData.schoolHeadName}
                  onChange={(e) => setFormData({ ...formData, schoolHeadName: e.target.value.toUpperCase() })}
                />
                <datalist id="head-suggestions">
                  {existingSchoolHeads.map(h => <option key={h} value={h} />)}
                </datalist>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 pt-4">
            <div className="space-y-1">
              <label className={labelClasses}><Info className="w-3.5 h-3.5 text-blue-500" /> Additional Excel Identification (Column G)</label>
              <input
                type="text"
                placeholder="Data captured from import Column G"
                className={`${inputClasses} bg-blue-50/30 text-blue-700 border-blue-100`}
                value={formData.excelColG || ''}
                onChange={(e) => setFormData({ ...formData, excelColG: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: VITAL STATISTICS */}
        <div className="space-y-6">
          <h3 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] border-b border-gray-100 pb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" /> II. Vital Statistics
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-1">
              <label className={labelClasses}>Birthdate</label>
              <input
                required
                type="date"
                className={inputClasses}
                value={formatDateForInput(formData.birthday)}
                onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className={labelClasses}><Clock className="w-3.5 h-3.5 text-emerald-500" /> Age as of Beginning of SY</label>
              <div className="w-full px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-xl text-sm font-black text-emerald-700 flex items-center justify-center">
                {computedAgeDisplay}
              </div>
            </div>
            <div className="space-y-1">
              <label className={labelClasses}>Sex / Gender</label>
              <select
                className={inputClasses}
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className={labelClasses}>Handedness</label>
              <select
                className={inputClasses}
                value={formData.handedness}
                onChange={(e) => setFormData({ ...formData, handedness: e.target.value as any })}
              >
                <option value="Right">Right Handed</option>
                <option value="Left">Left Handed</option>
                <option value="Both">Ambidextrous</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 3: FAMILY BACKGROUND */}
        <div className="space-y-6">
          <h3 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] border-b border-gray-100 pb-3 flex items-center gap-2">
            <UsersIcon className="w-4 h-4" /> III. Family Background
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="space-y-1">
              <label className={labelClasses}>Total Number of Siblings</label>
              <input
                type="number"
                min={0}
                className={inputClasses}
                value={formData.numSiblings}
                onChange={(e) => setFormData({ ...formData, numSiblings: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1">
              <label className={labelClasses}>Birth Order</label>
              <select
                className={inputClasses}
                value={formData.birthOrder}
                onChange={(e) => setFormData({ ...formData, birthOrder: e.target.value })}
              >
                {birthOrderOptions.map(option => (
                  <option key={option} value={option}>{option} Child</option>
                ))}
              </select>
            </div>
          </div>

          {/* Father's Info */}
          <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 space-y-1">
              <label className={labelClasses}>Father's Full Name</label>
              <input
                type="text"
                placeholder="Last Name, First Name"
                className={inputClasses}
                value={formData.fathersName}
                onChange={(e) => setFormData({ ...formData, fathersName: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className={labelClasses}>Age</label>
              <input
                type="number"
                className={inputClasses}
                value={formData.fathersAge || ''}
                onChange={(e) => setFormData({ ...formData, fathersAge: parseInt(e.target.value) || undefined })}
              />
            </div>
            <div className="space-y-1">
              <label className={labelClasses}>Occupation</label>
              <input
                type="text"
                className={inputClasses}
                value={formData.fathersOccupation}
                onChange={(e) => setFormData({ ...formData, fathersOccupation: e.target.value })}
              />
            </div>
            <div className="md:col-span-4 space-y-1">
              <label className={labelClasses}>Educational Attainment</label>
              <input
                type="text"
                placeholder="e.g. College Graduate"
                className={inputClasses}
                value={formData.fathersEducation}
                onChange={(e) => setFormData({ ...formData, fathersEducation: e.target.value })}
              />
            </div>
          </div>

          {/* Mother's Info */}
          <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 space-y-1">
              <label className={labelClasses}>Mother's Full Name (Maiden)</label>
              <input
                type="text"
                placeholder="Last Name, First Name"
                className={inputClasses}
                value={formData.mothersName}
                onChange={(e) => setFormData({ ...formData, mothersName: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className={labelClasses}>Age</label>
              <input
                type="number"
                className={inputClasses}
                value={formData.mothersAge || ''}
                onChange={(e) => setFormData({ ...formData, mothersAge: parseInt(e.target.value) || undefined })}
              />
            </div>
            <div className="space-y-1">
              <label className={labelClasses}>Occupation</label>
              <input
                type="text"
                className={inputClasses}
                value={formData.mothersOccupation}
                onChange={(e) => setFormData({ ...formData, mothersOccupation: e.target.value })}
              />
            </div>
            <div className="md:col-span-4 space-y-1">
              <label className={labelClasses}>Educational Attainment</label>
              <input
                type="text"
                placeholder="e.g. High School Graduate"
                className={inputClasses}
                value={formData.mothersEducation}
                onChange={(e) => setFormData({ ...formData, mothersEducation: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: ADDRESS */}
        <div className="space-y-6">
          <h3 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] border-b border-gray-100 pb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4" /> IV. Residential Address
          </h3>
          <div className="space-y-1">
            <label className={labelClasses}>Permanent Address</label>
            <input
              required
              type="text"
              placeholder="House No., Street, Barangay, Municipality/City, Province"
              className={inputClasses}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-10 border-t border-gray-100">
          <button type="button" onClick={onCancel} className="px-8 py-3.5 rounded-2xl border border-gray-200 text-gray-600 font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all">Discard Changes</button>
          <button type="submit" className="px-12 py-3.5 rounded-2xl bg-blue-600 text-white font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all active:scale-95">
            {initialData ? 'Update Profile' : 'Confirm Enrollment'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LearnerModal;
