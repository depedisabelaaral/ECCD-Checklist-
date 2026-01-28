
import React, { useState, useEffect } from 'react';
import { Learner, User } from '../types';
import { X, User as UserIcon, ShieldCheck, MapPin, Calendar, Users as UsersIcon, GraduationCap, Briefcase, Hash, Info, UserCircle2 } from 'lucide-react';

interface LearnerModalProps {
  initialData?: Learner;
  user: User; // Added user prop to get current schoolId
  onSubmit: (learner: Omit<Learner, 'id'>) => void;
  onCancel: () => void;
}

const LearnerModal: React.FC<LearnerModalProps> = ({ initialData, user, onSubmit, onCancel }) => {
  // Helper to ensure date is in YYYY-MM-DD for the input[type="date"]
  const formatDateForInput = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return d.toISOString().split('T')[0];
    } catch (e) {
      return '';
    }
  };

  const [formData, setFormData] = useState<Omit<Learner, 'id'>>({
    lrn: initialData?.lrn || '',
    name: initialData?.name || '',
    age: initialData?.age || 5,
    gender: initialData?.gender || 'Male',
    birthday: initialData?.birthday || '',
    address: initialData?.address || '',
    fathersName: initialData?.fathersName || '',
    fathersAge: initialData?.fathersAge || undefined,
    mothersName: initialData?.mothersName || '',
    mothersAge: initialData?.mothersAge || undefined,
    // Fix: Default schoolId to the logged in user's schoolId instead of 'sch-1'
    schoolId: initialData?.schoolId || user.schoolId || 'sch-1',
    handedness: initialData?.handedness || 'Right',
    fathersOccupation: initialData?.fathersOccupation || '',
    mothersOccupation: initialData?.mothersOccupation || '',
    fathersEducation: initialData?.fathersEducation || '',
    mothersEducation: initialData?.mothersEducation || '',
    numSiblings: initialData?.numSiblings || 0,
    birthOrder: initialData?.birthOrder || '1st',
    status: initialData?.status || 'New Student/Enrolled',
    excelColG: initialData?.excelColG || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
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
            <div className="flex items-center gap-3">
               <label className="text-[10px] font-black text-gray-400 uppercase">Registration Status</label>
               <select
                  className="px-3 py-1.5 border border-blue-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-[10px] font-black uppercase text-blue-700 bg-blue-50/50"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                >
                  <option value="New Student/Enrolled">New Student/Enrolled</option>
                  <option value="Transferred-In">Transferred-In</option>
                  <option value="Transferred-Out">Transferred-Out</option>
                </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
            <div className="space-y-1">
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
              <label className={labelClasses}>Age (Years)</label>
              <input
                required
                type="number"
                min={3}
                max={10}
                className={inputClasses}
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 0 })}
              />
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
