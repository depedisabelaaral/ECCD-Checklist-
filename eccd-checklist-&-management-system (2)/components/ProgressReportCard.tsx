import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, Learner, ProgressReport, ProgressReportAttendanceMonth } from '../types.ts';
import { supabaseService } from '../src/services/supabaseService.ts';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { 
  Printer, Save, CheckCircle2, FileSpreadsheet, FileText, Calendar, 
  ChevronRight, ArrowLeft, Loader2, RefreshCw, Layers, Edit3, Eye, Trash2, 
  HelpCircle, Check, BookOpen, Heart, Activity, ListChecks, Sliders, Layout, CheckCircle
} from 'lucide-react';

const MONTHS_LIST = [
  'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March', 'April'
];

interface ProgressReportCardProps {
  user: User;
  learners: Learner[];
}

export const COMPETENCY_GROUPS = [
  {
    id: 'motor',
    title: 'I. Sensory Perceptual and Motor Development',
    items: [
      { id: 'I.1', num: 1, text: "Identifies external body parts and their functions" },
      { id: 'I.2', num: 2, text: "Identifies ways to care for and protects one's body parts" },
      { id: 'I.3', num: 3, text: "Demonstrates gross motor skills (locomotor, non-locomotor)" },
      { id: 'I.4', num: 4, text: "Moves body parts as directed" },
      { id: 'I.5', num: 5, text: "Demonstrates fine motor skills (tearing, cutting, rolling, molding with playdough)" }
    ]
  },
  {
    id: 'socio',
    title: 'II. Socio-Emotional Development',
    items: [
      { id: 'II.1', num: 1, text: "Identifies and expresses feelings in appropriate ways" },
      { id: 'II.2', num: 2, text: "Recognizes and respects feelings of others" },
      { id: 'II.3', num: 3, text: "Expresses needs and preferences" },
      { id: 'II.4', num: 4, text: "Behaves appropriately in different situations" },
      { id: 'II.5', num: 5, text: "Participates in classroom routines and activities" },
      { id: 'II.6', num: 6, text: "Follows classroom and school rules" },
      { id: 'II.7', num: 7, text: "Fulfills classroom responsibilities" }
    ]
  },
  {
    id: 'cognitive',
    title: 'III. Cognitive Development',
    items: [
      { id: 'III.1', num: 1, text: "Identifies attributes of objects (color, shape, size)" },
      { id: 'III.2', num: 2, text: "Groups/classifies objects based on attributes with help" },
      { id: 'III.3', num: 3, text: "Describes objects based on attributes" },
      { id: 'III.4', num: 4, text: "Classifies objects by a single attribute (color, shape, size)" },
      { id: 'III.5', num: 5, text: "Groups/classifies objects according to multiple attributes" },
      { id: 'III.6', num: 6, text: "Arranges objects according to specific attributes" },
      { id: 'III.7', num: 7, text: "Integrates, extends and creates patterns using concrete objects" },
      { id: 'III.8', num: 8, text: "Measures size, length, capacity and mass of objects using non-standard measuring tools" },
      { id: 'III.9', num: 9, text: "Identifies position of objects (in, on, over, under, top, bottom)" },
      { id: 'III.10', num: 10, text: "Compares quantities of objects (more/less)" },
      { id: 'III.11', num: 11, text: "Establishes one-to-one correspondence" },
      { id: 'III.12', num: 12, text: "Recognizes numerals" },
      { id: 'III.13', num: 13, text: "Matches numerals to objects" },
      { id: 'III.14', num: 14, text: "Adds and subtracts using concrete objects" },
      { id: 'III.15', num: 15, text: "Identifies simple sequence of time (hours and minutes)" },
      { id: 'III.16', num: 16, text: "Shows awareness and care for the natural and physical environment" },
      { id: 'III.17', num: 17, text: "Talks about participation in cultural and religious activities" },
      { id: 'III.18', num: 18, text: "Shows awareness of the importance of caring for the environment" },
      { id: 'III.19', num: 19, text: "Predicts outcomes in familiar stories read aloud in class" },
      { id: 'III.20', num: 20, text: "Suggests solutions to problems in class activities and stories read aloud" },
      { id: 'III.21', num: 21, text: "Demonstrates simple logical reasoning skills" }
    ]
  },
  {
    id: 'language',
    title: 'IV. Language, Literacy, and Communication Development',
    items: [],
    subgroups: [
      {
        title: 'A. Listening and Viewing',
        items: [
          { id: 'IV.A.1', num: 1, text: "Identifies familiar environmental sound" },
          { id: 'IV.A.2', num: 2, text: "Recalls what happens first, middle and end in a story" },
          { id: 'IV.A.3', num: 3, text: "Retells story in sequence" },
          { id: 'IV.A.4', num: 4, text: "Follows 1-2 step instructions" }
        ]
      },
      {
        title: 'B. Sight Word Recognition',
        items: [
          { id: 'IV.B.5', num: 5, text: "Recognizes non-decodable words in and out of context automatically" },
          { id: 'IV.B.6', num: 6, text: "Recognizes sight words" }
        ]
      },
      {
        title: 'C. Speaking',
        items: [
          { id: 'IV.C.7', num: 7, text: "Identifies first and last name" },
          { id: 'IV.C.8', num: 8, text: "Identifies classmates, teachers, family member" },
          { id: 'IV.C.9', num: 9, text: "Identifies familiar objects at home, in school and in the community" },
          { id: 'IV.C.10', num: 10, text: "Uses polite greetings and courteous expressions in varied situations" },
          { id: 'IV.C.11', num: 11, text: "Retells personal experiences to story events" },
          { id: 'IV.C.12', num: 12, text: "Expresses ideas and feelings using phrases and simple sentences" }
        ]
      },
      {
        title: 'D. Reading (Phonological/Phonemic Awareness, Letter Knowledge)',
        items: [
          { id: 'IV.D.13', num: 13, text: "Orally segment sounds: a. syllable, b. onset and rime, c. phoneme by phoneme" },
          { id: 'IV.D.14', num: 14, text: "Identifies uppercase letters" },
          { id: 'IV.D.15', num: 15, text: "Identifies lowercase letters" },
          { id: 'IV.D.16', num: 16, text: "Matches upper and lowercase letters" },
          { id: 'IV.D.17', num: 17, text: "Identifies letter sounds" },
          { id: 'IV.D.18', num: 18, text: "Matches letters and their corresponding sounds" }
        ]
      },
      {
        title: 'E. Comprehension of Information / Concepts from Print',
        items: [
          { id: 'IV.E.19', num: 19, text: "Uses a variety of strategies to gain meaning of leveled texts" },
          { id: 'IV.E.20', num: 20, text: "Uses print and illustrations to make meaning" }
        ]
      },
      {
        title: 'F. Concepts of Print',
        items: [
          { id: 'IV.F.21', num: 21, text: "Demonstrates book handling skills" },
          { id: 'IV.F.22', num: 22, text: "Distinguishes between letters, words, and sentences" },
          { id: 'IV.F.23', num: 23, text: "Demonstrates awareness of print (left to right and top to bottom)" }
        ]
      },
      {
        title: 'G. Writing',
        items: [
          { id: 'IV.G.24', num: 24, text: "Traces/draws/copies shapes, designs, pictures" },
          { id: 'IV.G.25', num: 25, text: "Traces/copies/writes name, words" },
          { id: 'IV.G.26', num: 26, text: "Writes uppercase and lowercase letters" },
          { id: 'IV.G.27', num: 27, text: "Spells sight words" },
          { id: 'IV.G.28', num: 28, text: "Spells simple words phonetically" }
        ]
      }
    ]
  }
];

export const ProgressReportCard: React.FC<ProgressReportCardProps> = ({ user, learners }) => {
  const [selectedLearner, setSelectedLearner] = useState<Learner | null>(null);
  const [reports, setReports] = useState<ProgressReport[]>([]);
  const [activeMode, setActiveMode] = useState<'grade' | 'preview'>('grade');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // User Branding Logo Configurations
  const USER_FORM_LOGO_KEY = `branding_form_logo_${user.id}`;
  const DEPED_LOGO_KEY = 'branding_deped_logo';
  
  const [formBranding, setFormBranding] = useState({
    schoolLogo: localStorage.getItem(USER_FORM_LOGO_KEY) || '',
    depedLogo: localStorage.getItem(DEPED_LOGO_KEY) || 'eccd.jpg'
  });

  useEffect(() => {
    const handleLogoUpdate = () => {
      setFormBranding({
        schoolLogo: localStorage.getItem(USER_FORM_LOGO_KEY) || '',
        depedLogo: localStorage.getItem(DEPED_LOGO_KEY) || 'eccd.jpg'
      });
    };
    window.addEventListener('branding_user_logo_updated', handleLogoUpdate);
    return () => window.removeEventListener('branding_user_logo_updated', handleLogoUpdate);
  }, [user.id]);

  // Active Progress Report states
  const [ratings, setRatings] = useState<Record<string, string[]>>({});
  const [comments, setComments] = useState<string[]>(['', '', '']);
  const [attendance, setAttendance] = useState<Record<string, ProgressReportAttendanceMonth>>({});
  const [isTransferring, setIsTransferring] = useState<boolean>(false);
  const [printPageSelection, setPrintPageSelection] = useState<'both' | 'page1' | 'page2'>('both');
  const [isExportingPDF, setIsExportingPDF] = useState<boolean>(false);
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);

  // Computations for Pupil Age at Beginning and End of SY
  const begAge = useMemo(() => {
    if (!selectedLearner) return { y: '__', m: '__' };
    const birthday = selectedLearner.birthday;
    const startDate = selectedLearner.dateOfBeginningOfClasses;
    if (!birthday) return { y: '__', m: '__' };

    let bYear: number, bMonth: number, bDay: number;
    const parsedDate = new Date(birthday);
    if (!isNaN(parsedDate.getTime()) && birthday.includes('-') && birthday.split('-')[0].length === 4) {
      bYear = parsedDate.getFullYear();
      bMonth = parsedDate.getMonth() + 1;
      bDay = parsedDate.getDate();
    } else {
      const bParts = birthday.split(/[-/]/);
      if (bParts.length !== 3) return { y: '__', m: '__' };
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
    }

    if (isNaN(bYear) || isNaN(bMonth) || isNaN(bDay)) return { y: '__', m: '__' };
    let targetYear: number, targetMonth: number, targetDay: number;
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
    } else if (selectedLearner?.schoolYear) {
      const startYearMatch = selectedLearner.schoolYear.match(/^(\d{4})/);
      targetYear = startYearMatch ? parseInt(startYearMatch[1]) : new Date().getFullYear();
      targetMonth = 6;
      targetDay = 1;
    } else {
      targetYear = new Date().getFullYear();
      targetMonth = 6;
      targetDay = 1;
    }
    if (isNaN(targetYear) || isNaN(targetMonth) || isNaN(targetDay)) return { y: '__', m: '__' };
    let y = targetYear - bYear;
    let m = targetMonth - bMonth;
    if (targetDay < bDay) m--;
    if (m < 0) {
      y--;
      m += 12;
    }
    if (y < 0) return { y: '0', m: '0' };
    return { y: String(y), m: String(m) };
  }, [selectedLearner]);

  const endAge = useMemo(() => {
    if (!selectedLearner) return { y: '__', m: '__' };
    const birthday = selectedLearner.birthday;
    if (!birthday) return { y: '__', m: '__' };

    let bYear: number, bMonth: number, bDay: number;
    const parsedDate = new Date(birthday);
    if (!isNaN(parsedDate.getTime()) && birthday.includes('-') && birthday.split('-')[0].length === 4) {
      bYear = parsedDate.getFullYear();
      bMonth = parsedDate.getMonth() + 1;
      bDay = parsedDate.getDate();
    } else {
      const bParts = birthday.split(/[-/]/);
      if (bParts.length !== 3) return { y: '__', m: '__' };
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
    }

    if (isNaN(bYear) || isNaN(bMonth) || isNaN(bDay)) return { y: '__', m: '__' };
    let targetYear: number, targetMonth = 4, targetDay = 30;
    const endClassesDate = selectedLearner?.dateOfEndOfClasses || localStorage.getItem('eccd_class_end_date');
    if (endClassesDate && endClassesDate !== '') {
      const sParts = endClassesDate.split(/[-/]/);
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
    } else if (selectedLearner?.schoolYear) {
      const startYearMatch = selectedLearner.schoolYear.match(/^(\d{4})/);
      const baseYear = startYearMatch ? parseInt(startYearMatch[1]) : new Date().getFullYear();
      targetYear = baseYear + 1;
    } else {
      targetYear = new Date().getFullYear() + 1;
    }
    if (isNaN(targetYear) || isNaN(targetMonth) || isNaN(targetDay)) return { y: '__', m: '__' };
    let y = targetYear - bYear;
    let m = targetMonth - bMonth;
    if (targetDay < bDay) m--;
    if (m < 0) {
      y--;
      m += 12;
    }
    if (y < 0) return { y: '0', m: '0' };
    return { y: String(y), m: String(m) };
  }, [selectedLearner]);

  // Saved Page Layout & Print Calibration Settings
  const [paperSize, setPaperSize] = useState<'a4' | 'letter'>(() => {
    try {
      const saved = localStorage.getItem('progress_report_paper_size');
      return (saved as 'a4' | 'letter') || 'a4';
    } catch { return 'a4'; }
  });

  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>(() => {
    try {
      const saved = localStorage.getItem('progress_report_orientation');
      return (saved as 'landscape' | 'portrait') || 'landscape';
    } catch { return 'landscape'; }
  });

  const [marginSize, setMarginSize] = useState<'none' | 'narrow' | 'normal' | 'wide'>(() => {
    try {
      const saved = localStorage.getItem('progress_report_margin_size');
      return (saved as 'none' | 'narrow' | 'normal' | 'wide') || 'none';
    } catch { return 'none'; }
  });

  const [printScale, setPrintScale] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('progress_report_print_scale');
      return saved ? parseInt(saved, 10) : 95;
    } catch { return 95; }
  });

  const [settingsSavedMsg, setSettingsSavedMsg] = useState<string | null>(null);

  const handleSavePrintSettings = () => {
    try {
      localStorage.setItem('progress_report_paper_size', paperSize);
      localStorage.setItem('progress_report_orientation', orientation);
      localStorage.setItem('progress_report_margin_size', marginSize);
      localStorage.setItem('progress_report_print_scale', printScale.toString());
      setSettingsSavedMsg('Page calibration settings saved successfully!');
      setTimeout(() => setSettingsSavedMsg(null), 3500);
    } catch (e) {
      console.error(e);
    }
  };

  const paperSizes = {
    a4: { width: '11.69in', height: '8.27in', label: 'A4 Landscape (11.69" x 8.27")' },
    letter: { width: '11.00in', height: '8.50in', label: 'US Letter Landscape (11.00" x 8.50")' }
  };

  const marginValues = {
    none: '0',
    narrow: '0.15',
    normal: '0.40',
    wide: '0.75'
  };

  const widthVal = orientation === 'landscape' ? paperSizes[paperSize].width : paperSizes[paperSize].height;
  const heightVal = orientation === 'landscape' ? paperSizes[paperSize].height : paperSizes[paperSize].width;
  const marginInch = marginValues[marginSize];

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const data = await supabaseService.getProgressReports();
      setReports(data || []);
      if (learners.length > 0 && !selectedLearner) {
        setSelectedLearner(learners[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Switch learner & hydrate state
  useEffect(() => {
    if (!selectedLearner) return;

    const matchingReport = reports.find(
      r => r.learnerId === selectedLearner.id && r.schoolYear === selectedLearner.schoolYear
    );

    if (matchingReport) {
      setRatings(matchingReport.ratings || {});
      setComments(matchingReport.comments || ['', '', '']);
      setAttendance(matchingReport.attendance || {});
    } else {
      // Hydrate with empty/default data
      const defaultRatings: Record<string, string[]> = {};
      COMPETENCY_GROUPS.forEach(g => {
        g.items.forEach(i => { defaultRatings[i.id] = ['', '', '']; });
        g.subgroups?.forEach(sub => {
          sub.items.forEach(i => { defaultRatings[i.id] = ['', '', '']; });
        });
      });

      const defaultAttendance: Record<string, ProgressReportAttendanceMonth> = {};
      MONTHS_LIST.forEach(m => {
        defaultAttendance[m] = { classDays: 0, daysPresent: 0, timesAbsent: 0 };
      });

      setRatings(defaultRatings);
      setComments(['', '', '']);
      setAttendance(defaultAttendance);
    }
  }, [selectedLearner, reports]);

  const handleSaveReport = async () => {
    if (!selectedLearner) return;

    try {
      setSaving(true);
      setSuccessMsg(null);

      const matchingReport = reports.find(
        r => r.learnerId === selectedLearner.id && r.schoolYear === selectedLearner.schoolYear
      );

      const reportPayload: ProgressReport = {
        id: matchingReport?.id || `pr-${Date.now()}`,
        learnerId: selectedLearner.id,
        schoolYear: selectedLearner.schoolYear,
        ratings,
        comments,
        attendance
      };

      await supabaseService.saveProgressReport(reportPayload);
      
      // Update local state list
      setReports(prev => {
        const otherReports = prev.filter(r => r.id !== reportPayload.id);
        return [...otherReports, reportPayload];
      });

      setSuccessMsg(`Progress details for ${selectedLearner.name} saved successfully!`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (e) {
      console.error(e);
      alert('Error saving Progress Report Card. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRatingChange = (compKey: string, termIdx: number, val: string) => {
    setRatings(prev => {
      const current = prev[compKey] ? [...prev[compKey]] : ['', '', ''];
      current[termIdx] = val;
      return { ...prev, [compKey]: current };
    });
  };

  const handleAttendanceChange = (month: string, field: keyof ProgressReportAttendanceMonth, val: number) => {
    setAttendance(prev => {
      const monthData = prev[month] ? { ...prev[month] } : { classDays: 0, daysPresent: 0, timesAbsent: 0 };
      monthData[field] = isNaN(val) ? 0 : val;
      
      // Auto compile formula: Class minus Present equals absent
      monthData.timesAbsent = Math.max(0, (monthData.classDays || 0) - (monthData.daysPresent || 0));
      
      return { ...prev, [month]: monthData };
    });
  };

  const handleCommentChange = (termIdx: number, val: string) => {
    setComments(prev => {
      const copy = [...prev];
      copy[termIdx] = val;
      return copy;
    });
  };

  const totalAttendance = useMemo(() => {
    let classDays = 0;
    let daysPresent = 0;
    let timesAbsent = 0;
    MONTHS_LIST.forEach(m => {
      if (attendance[m]) {
        classDays += attendance[m].classDays || 0;
        daysPresent += attendance[m].daysPresent || 0;
        timesAbsent += Math.max(0, (attendance[m].classDays || 0) - (attendance[m].daysPresent || 0));
      }
    });
    return { classDays, daysPresent, timesAbsent };
  }, [attendance]);

  const triggerPrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    if (!selectedLearner) return;
    try {
      setIsExportingPDF(true);
      
      // Save original page selection
      const originalSelection = printPageSelection;
      
      // Force both pages to be rendered/visible in DOM for html2canvas
      setPrintPageSelection('both');
      // Wait for React to re-render the DOM
      await new Promise(resolve => setTimeout(resolve, 350));

      const page1 = document.getElementById('progress-report-page-1');
      const page2 = document.getElementById('progress-report-page-2');

      if (!page1 || !page2) {
        throw new Error("Could not find the report card pages to render PDF.");
      }

      const isLandscape = orientation === 'landscape';
      const format = paperSize === 'letter' ? 'letter' : 'a4';
      const pdfOrientation = isLandscape ? 'landscape' : 'portrait';

      const pdf = new jsPDF({
        orientation: pdfOrientation,
        unit: 'mm',
        format: format
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const addPageToPdf = async (element: HTMLElement, isFirstPage: boolean) => {
        if (!isFirstPage) {
          pdf.addPage(format, pdfOrientation);
        }
        
        const canvas = await html2canvas(element, {
          scale: 2, // High resolution capture
          useCORS: true,
          logging: false,
          allowTaint: true,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      };

      if (originalSelection === 'both' || originalSelection === 'page1') {
        await addPageToPdf(page1, true);
      }
      
      if (originalSelection === 'both' || originalSelection === 'page2') {
        const isFirst = originalSelection === 'page2';
        await addPageToPdf(page2, isFirst);
      }

      pdf.save(`Kindergarten_Progress_Report_${selectedLearner.name.replace(/\s+/g, '_')}.pdf`);
      
      // Restore user page selection
      setPrintPageSelection(originalSelection);
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("Failed to export PDF. Please try again.");
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleExportExcel = async () => {
    if (!selectedLearner) return;
    try {
      setIsExportingExcel(true);
      await new Promise(resolve => setTimeout(resolve, 100));

      const rows: any[][] = [];

      // School Headers
      rows.push(["REPUBLIC OF THE PHILIPPINES RULES"]);
      rows.push(["DEPARTMENT OF EDUCATION"]);
      rows.push(["REGION II - CAGAYAN VALLEY"]);
      rows.push([`${user.district || 'District monitoring station'}`.toUpperCase()]);
      rows.push([`${user.schoolName || 'Kindergarten School'}`.toUpperCase()]);
      rows.push(["KINDERGARTEN PROGRESS REPORT CARD"]);
      rows.push([`School Year: ${selectedLearner.schoolYear}`]);
      rows.push([]);

      // Student metadata
      rows.push(["LEARNER PROFILE INFORMATION"]);
      rows.push(["NAME OF PUPIL", selectedLearner.name.toUpperCase(), "LRN", selectedLearner.lrn]);
      rows.push(["SECTION", (selectedLearner.section || '---').toUpperCase(), "GENDER", selectedLearner.gender.toUpperCase()]);
      rows.push(["BIRTHDATE", selectedLearner.birthday, "AGE AT BEGINNING OF SY", `${selectedLearner.age} Years Old`]);
      rows.push(["TEACHER/ADVISER", user.fullName.toUpperCase(), "SCHOOL ID", user.schoolId || '---']);
      rows.push(["SCHOOL HEAD", (user.schoolHeadName || '---').toUpperCase(), "DISTRICT", (user.district || '---').toUpperCase()]);
      rows.push([]);

      // Competencies Header
      rows.push(["DEVELOPMENTAL DOMAINS & COMPETENCY RATINGS"]);
      rows.push(["Item Code", "Competency/Attainment Target", "Term 1 (T1)", "Term 2 (T2)", "Term 3 (T3)"]);

      COMPETENCY_GROUPS.forEach(group => {
        rows.push([group.title.toUpperCase(), "", "", "", ""]);
        
        // Items under group
        group.items.forEach(comp => {
          const val1 = ratings[comp.id]?.[0] || '';
          const val2 = ratings[comp.id]?.[1] || '';
          const val3 = ratings[comp.id]?.[2] || '';
          rows.push([`${group.id.toUpperCase()}-${comp.num}`, comp.text, val1, val2, val3]);
        });

        // Subgroups (e.g., Language section)
        group.subgroups?.forEach(sub => {
          rows.push([`  ${sub.title.toUpperCase()}`, "", "", "", ""]);
          sub.items.forEach(comp => {
            const val1 = ratings[comp.id]?.[0] || '';
            const val2 = ratings[comp.id]?.[1] || '';
            const val3 = ratings[comp.id]?.[2] || '';
            rows.push([`${group.id.toUpperCase()}-${comp.num}`, comp.text, val1, val2, val3]);
          });
        });
      });

      rows.push([]);

      // Attendance Table
      rows.push(["ATTENDANCE RECORD"]);
      rows.push(["Month", "No. of Class Days", "No. of Days Present", "No. of Times Absent"]);
      MONTHS_LIST.forEach(month => {
        const mData = attendance[month] || { classDays: 0, daysPresent: 0, timesAbsent: 0 };
        const abs = mData.classDays ? Math.max(0, mData.classDays - mData.daysPresent) : 0;
        rows.push([month.toUpperCase(), mData.classDays || 0, mData.daysPresent || 0, abs || 0]);
      });
      rows.push([
        "TOTAL", 
        totalAttendance.classDays, 
        totalAttendance.daysPresent, 
        totalAttendance.timesAbsent
      ]);
      rows.push([]);

      // Comments and remarks
      rows.push(["TEACHER'S COMMENTS & PROGRESS REMARKS"]);
      rows.push(["TERM 1 (UNANG TERMINO)", comments[0] || "---"]);
      rows.push(["TERM 2 (IKALAWANG TERMINO)", comments[1] || "---"]);
      rows.push(["TERM 3 (IKATLONG TERMINO)", comments[2] || "---"]);
      rows.push([]);

      // Transfer credentials
      rows.push(["CERTIFICATE OF TRANSFER DETAILS"]);
      rows.push(["Learner Wants to Transfer", isTransferring ? "YES" : "NO"]);
      rows.push(["Teacher / Adviser", isTransferring ? user.fullName : "N/A"]);
      rows.push(["School Head / Principal", isTransferring ? (user.schoolHeadName || "School Head") : "N/A"]);

      const worksheet = XLSX.utils.aoa_to_sheet(rows);
      
      // Set pristine spreadsheet column widths
      worksheet['!cols'] = [
        { wch: 20 }, // Item ID / Headings
        { wch: 70 }, // Competency description text
        { wch: 15 }, // T1 Val / Class days
        { wch: 15 }, // T2 Val / Present days
        { wch: 15 }  // T3 Val / Absent days
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Report Card");
      
      XLSX.writeFile(workbook, `Kindergarten_Progress_Report_${selectedLearner.name.replace(/\s+/g, '_')}.xlsx`);

    } catch (error) {
      console.error("Excel generation failed:", error);
      alert("Failed to export Excel. Please try again.");
    } finally {
      setIsExportingExcel(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] bg-white rounded-3xl border border-slate-200">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-xs text-slate-500 font-extrabold uppercase tracking-wider">Loading Learner Progress Reports...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none font-sans print:m-0 print:p-0 print:bg-white print:text-black">
      {/* 1. SELECTION & ACTION BAR */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-2xl flex flex-col xl:flex-row gap-4 justify-between items-stretch xl:items-center no-print">
        <div className="w-full xl:w-auto space-y-1.5 flex-1">
          <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Select Active Kindergarten Pupil</label>
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative shrink-0">
              <select
                value={selectedLearner?.id || ''}
                onChange={(e) => {
                  const target = learners.find(l => l.id === e.target.value);
                  if (target) setSelectedLearner(target);
                }}
                className="w-full md:w-[280px] bg-slate-800 text-xs font-bold rounded-xl py-2.5 px-4 pr-10 border border-slate-700 outline-none focus:border-blue-500 text-white transition-all appearance-none cursor-pointer"
              >
                <option value="" disabled>-- Choose a Learner --</option>
                {learners.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.lrn})
                  </option>
                ))}
              </select>
              <ChevronRight className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none rotate-90 text-slate-400" />
            </div>
            {selectedLearner && (
              <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <span className="py-0.5 px-2 bg-slate-800 text-blue-400 rounded-md text-[9px] font-black uppercase">S.Y. {selectedLearner.schoolYear}</span>
                <span>Section: <strong className="text-white">{selectedLearner.section || '---'}</strong></span>
                <span className="text-slate-600 hidden md:inline">•</span>
                <span>Adviser: <strong className="text-white">{user.fullName || selectedLearner.adviser || '---'}</strong></span>
              </div>
            )}
          </div>
        </div>

        {/* MODE SWITCHER & PRINT OPERATIONS */}
        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
          <button
            onClick={() => setActiveMode('grade')}
            className={`flex-1 xl:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeMode === 'grade'
                ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/30'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" /> Grade Entry
          </button>
          <button
            onClick={() => setActiveMode('preview')}
            className={`flex-1 xl:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeMode === 'preview'
                ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/30'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Eye className="w-3.5 h-3.5" /> Print Preview
          </button>

          <div className="w-px h-8 bg-slate-800 hidden xl:block" />

          {selectedLearner && (
            <button
              onClick={handleSaveReport}
              disabled={saving}
              className="w-full xl:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-700 shadow-xl shadow-emerald-500/20 active:scale-98 transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? 'Saving...' : 'Save Report'}
            </button>
          )}

          {activeMode === 'preview' && selectedLearner && (
            <button
              onClick={triggerPrint}
              className="w-full xl:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl text-xs font-black uppercase tracking-wider active:scale-98 transition-all shadow-xl cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Print Card
            </button>
          )}
        </div>
      </div>

      {/* Dynamic Success Prompt */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl px-6 py-4 text-sm font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-4 shadow-md no-print">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shadow-sm animate-bounce" />
          {successMsg}
        </div>
      )}

      {/* No Learner State */}
      {!selectedLearner && (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 no-print">
          <HelpCircle className="w-16 h-16 text-slate-300 mx-auto mb-4 animate-pulse" />
          <p className="text-base font-black text-slate-900 uppercase tracking-tight">No Learners Registered</p>
          <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto">Please enroll or click on imported student rosters under the 'Learners' page first in order to generate and log their official DepEd Progress Report Cards.</p>
        </div>
      )}

      {/* ======================================= */}
      {/* 2. MODE A - ACTIVE GRADING WORKBENCH    */}
      {/* ======================================= */}
      {selectedLearner && activeMode === 'grade' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 no-print">
          
          {/* LEFT COLUMN: COMPETENCIES TO GRADE */}
          <div className="xl:col-span-2 space-y-6">
            {COMPETENCY_GROUPS.map((group) => (
              <div key={group.id} className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    {group.id === 'motor' && <Activity className="w-4 h-4 text-blue-600" />}
                    {group.id === 'socio' && <Heart className="w-4 h-4 text-pink-600" />}
                    {group.id === 'cognitive' && <BookOpen className="w-4 h-4 text-violet-600" />}
                    {group.id === 'language' && <ListChecks className="w-4 h-4 text-emerald-600" />}
                    {group.title}
                  </h3>
                  <span className="text-[10px] bg-slate-200/50 text-slate-600 px-3 py-1 rounded-full font-extrabold uppercase tracking-wider">
                    {group.items.length + (group.subgroups?.reduce((acc, curr) => acc + curr.items.length, 0) || 0)} Competencies
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {/* Render standard items first */}
                  {group.items.map((comp) => (
                    <div key={comp.id} className="py-2 px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/55 border-b border-slate-100 last:border-b-0 transition-all group">
                      <div className="flex-1 space-y-0.5">
                        <p className="text-[9px] font-extrabold text-slate-400 group-hover:text-blue-600 transition-colors uppercase tracking-wider">Item #{comp.num}</p>
                        <p className="text-xs font-semibold text-slate-850 leading-snug">{comp.text}</p>
                      </div>

                      {/* Term Selectors */}
                      <div className="flex items-center gap-3">
                        {[0, 1, 2].map((termIdx) => (
                          <div key={termIdx} className="space-y-1 text-center">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Term {termIdx + 1}</span>
                            <div className="flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
                              {['BG', 'DV', 'CO'].map((rating) => {
                                const isSelected = ratings[comp.id]?.[termIdx] === rating;
                                return (
                                  <button
                                    key={rating}
                                    onClick={() => handleRatingChange(comp.id, termIdx, isSelected ? '' : rating)}
                                    className={`px-2.5 py-1 text-[10px] font-black rounded-md uppercase tracking-tight transition-all cursor-pointer ${
                                      isSelected
                                        ? rating === 'CO' ? 'bg-emerald-600 text-white shadow' :
                                          rating === 'DV' ? 'bg-amber-500 text-white shadow' :
                                          'bg-red-500 text-white shadow'
                                        : 'text-slate-400 hover:text-slate-700'
                                    }`}
                                    title={rating === 'BG' ? 'Beginning' : rating === 'DV' ? 'Developing' : 'Consistent'}
                                  >
                                    {rating}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Render subgroups if any */}
                  {group.subgroups?.map((sub) => (
                    <div key={sub.title} className="bg-slate-50/20 divide-y divide-slate-100">
                      <div className="bg-slate-100/40 px-6 py-2.5 border-y border-slate-100">
                        <p className="text-[11px] font-black uppercase text-slate-600 tracking-wider font-mono">{sub.title}</p>
                      </div>
                      {sub.items.map((comp) => (
                        <div key={comp.id} className="py-2 px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/55 border-b border-slate-100 last:border-b-0 transition-all group pl-8">
                          <div className="flex-1 space-y-0.5">
                            <p className="text-[9px] font-extrabold text-slate-400 group-hover:text-blue-600 transition-colors uppercase tracking-wider">Item #{comp.num}</p>
                            <p className="text-xs font-semibold text-slate-850 leading-snug">{comp.text}</p>
                          </div>

                          {/* Term Selectors */}
                          <div className="flex items-center gap-3">
                            {[0, 1, 2].map((termIdx) => (
                              <div key={termIdx} className="space-y-1 text-center">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Term {termIdx + 1}</span>
                                <div className="flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
                                  {['BG', 'DV', 'CO'].map((rating) => {
                                    const isSelected = ratings[comp.id]?.[termIdx] === rating;
                                    return (
                                      <button
                                        key={rating}
                                        onClick={() => handleRatingChange(comp.id, termIdx, isSelected ? '' : rating)}
                                        className={`px-2.5 py-1 text-[10px] font-black rounded-md uppercase tracking-tight transition-all cursor-pointer ${
                                          isSelected
                                            ? rating === 'CO' ? 'bg-emerald-600 text-white shadow' :
                                              rating === 'DV' ? 'bg-amber-500 text-white shadow' :
                                              'bg-red-500 text-white shadow'
                                            : 'text-slate-400 hover:text-slate-700'
                                        }`}
                                        title={rating === 'BG' ? 'Beginning' : rating === 'DV' ? 'Developing' : 'Consistent'}
                                      >
                                        {rating}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* RIGHT COLUMN: ATTENDANCE & REMARKS REMAINING PANEL */}
          <div className="space-y-6">
            
            {/* 1. ATTENDANCE WORKBENCH */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Attendance Logs</h3>
              </div>
              <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-100 pr-1 select-none scrollbar-hide">
                {MONTHS_LIST.map((m) => {
                  const mData = attendance[m] || { classDays: 0, daysPresent: 0, timesAbsent: 0 };
                  return (
                    <div key={m} className="py-3 flex items-center justify-between gap-4">
                      <p className="text-xs font-extrabold uppercase tracking-wide text-slate-800 w-20 shrink-0">{m}</p>
                      <div className="flex items-center gap-1.5 flex-1 justify-end">
                        <div className="space-y-0.5 text-center">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Class</span>
                          <input
                            type="number"
                            min="0"
                            max="31"
                            value={mData.classDays}
                            onChange={(e) => handleAttendanceChange(m, 'classDays', parseInt(e.target.value))}
                            className="w-12 bg-slate-50 border border-slate-200 text-center text-xs font-bold p-1 rounded-md focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div className="space-y-0.5 text-center">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Present</span>
                          <input
                            type="number"
                            min="0"
                            max="31"
                            value={mData.daysPresent}
                            onChange={(e) => handleAttendanceChange(m, 'daysPresent', parseInt(e.target.value))}
                            className="w-12 bg-slate-50 border border-slate-200 text-center text-xs font-bold p-1 rounded-md focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div className="space-y-0.5 text-center">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Absent</span>
                          <input
                            type="number"
                            readOnly
                            disabled
                            value={Math.max(0, (mData.classDays || 0) - (mData.daysPresent || 0))}
                            className="w-12 bg-slate-100 text-slate-500 border border-slate-200 text-center text-xs font-black p-1 rounded-md outline-none cursor-not-allowed select-none"
                            title="Automatically calculated: Class Days minus Days Present"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between bg-slate-50 p-3 rounded-2xl text-xs font-black uppercase text-slate-600 tracking-wide">
                <span>TOTAL:</span>
                <div className="flex gap-4">
                  <span>Class: <strong className="text-slate-900">{totalAttendance.classDays}</strong></span>
                  <span>Present: <strong className="text-slate-950">{totalAttendance.daysPresent}</strong></span>
                  <span>Absent: <strong className="text-rose-600">{totalAttendance.timesAbsent}</strong></span>
                </div>
              </div>
            </div>

            {/* 2. ADVISER OBSERVATIONS & COMMENST */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Comments & Remarks</h3>
              </div>
              <div className="space-y-4">
                {[0, 1, 2].map((termIdx) => (
                  <div key={termIdx} className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center justify-between">
                      <span>Term {termIdx + 1} Comments</span>
                      <span className="text-[8px] font-medium text-slate-400">UNANG/IKALAWANG/IKATLONG TERMINO</span>
                    </label>
                    <textarea
                      rows={3}
                      value={comments[termIdx] || ''}
                      onChange={(e) => handleCommentChange(termIdx, e.target.value)}
                      placeholder={`Observations, strengths, and suggested developmental support for Term ${termIdx + 1}...`}
                      className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all text-xs outline-none resize-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* QUICK ACTIONS SAVE PROMPT */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-6 shadow-xl space-y-4 border border-slate-800">
              <h4 className="text-xs font-black uppercase tracking-widest text-blue-400">Quick Guide & Indicators</h4>
              <ul className="space-y-2 text-[10.5px] font-bold text-slate-400 leading-normal">
                <li className="flex gap-2">
                  <span className="w-6 shrink-0 font-extrabold text-white text-center bg-emerald-950 text-emerald-400 border border-emerald-900 rounded">CO</span>
                  <span><strong>Consistent</strong> - Always demonstrates the expected competency autonomously.</span>
                </li>
                <li className="flex gap-2">
                  <span className="w-6 shrink-0 font-extrabold text-white text-center bg-amber-950 text-amber-400 border border-amber-900 rounded">DV</span>
                  <span><strong>Developing</strong> - Sometimes demonstrates expected competency with minimal supervision.</span>
                </li>
                <li className="flex gap-2">
                  <span className="w-6 shrink-0 font-extrabold text-white text-center bg-rose-950 text-rose-400 border border-rose-900 rounded">BG</span>
                  <span><strong>Beginning</strong> - Rarely demonstrates expected competency; requires close assistance.</span>
                </li>
              </ul>
              <div className="h-px bg-slate-800" />
              <button
                onClick={handleSaveReport}
                disabled={saving}
                className="w-full py-4 text-center text-xs font-black uppercase tracking-widest text-white bg-blue-600 rounded-2xl hover:bg-blue-700 active:scale-98 transition-all shadow-xl shadow-blue-900/50 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? 'Processing DB Save...' : 'Commit Report Changes'}
              </button>
            </div>

          </div>

        </div>
      )}

      {/* ======================================= */}
      {/* 3. MODE B - PRINT CARD HIGH FIDELITY LAYOUT */}
      {/* ======================================= */}
      {selectedLearner && activeMode === 'preview' && (
        <div className="flex flex-col items-center justify-center space-y-8 select-all p-0">
          
          {/* Dynamic @page and margin prints stylesheet */}
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page {
                size: ${paperSize === 'letter' ? 'letter' : 'a4'} ${orientation};
                margin: ${marginInch}in !important;
              }
              body {
                background-color: white !important;
                color: black !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              /* Hide everything except the print cards */
              .no-print {
                display: none !important;
              }
              .print-card-page {
                width: ${widthVal} !important;
                height: ${heightVal} !important;
                margin: 0 auto !important;
                box-shadow: none !important;
                border: none !important;
                page-break-after: always;
                break-after: page;
                transform: scale(${printScale / 100}) !important;
                transform-origin: top center !important;
              }
            }
          ` }} />

          {/* DYNAMIC PAGE CALIBRATION AND SETTINGS PANEL */}
          <div className="w-full max-w-[1200px] no-print bg-slate-900 border border-slate-800 p-6 rounded-3xl text-white shadow-2xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600/15 text-blue-400 rounded-xl">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase tracking-wider text-slate-100">Page Layout & Print Calibration</h4>
                  <p className="text-[10px] text-slate-400 font-medium">Configure margins, size, scaling, and orientation settings. Click Save to persist them.</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 font-sans">
                <button
                  onClick={() => setActiveMode('grade')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-200 border border-slate-700 rounded-xl text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Exit Preview
                </button>
                <button
                  onClick={handleSavePrintSettings}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 cursor-pointer animate-in fade-in"
                >
                  <Save className="w-3.5 h-3.5" /> Save settings
                </button>
                <button
                  type="button"
                  onClick={handleExportPDF}
                  disabled={isExportingPDF || isExportingExcel}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center gap-1.5 shadow-lg shadow-rose-950/40 cursor-pointer disabled:opacity-50"
                >
                  {isExportingPDF ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                  {isExportingPDF ? 'PDF...' : 'Export PDF'}
                </button>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  disabled={isExportingPDF || isExportingExcel}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 cursor-pointer disabled:opacity-50"
                >
                  {isExportingExcel ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
                  {isExportingExcel ? 'Excel...' : 'Export Excel'}
                </button>
                <button
                  onClick={triggerPrint}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center gap-1.5 shadow-lg shadow-blue-950/40 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Now
                </button>
              </div>
            </div>

            {/* Quick alert feedback for saved settings */}
            {settingsSavedMsg && (
              <div className="bg-emerald-950/40 border border-emerald-900/60 text-emerald-300 rounded-xl p-3 text-[11px] font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 shadow-inner">
                <Check className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
                {settingsSavedMsg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-xs">
              {/* Paper Size Control */}
              <div className="bg-slate-950/40 border border-slate-800 p-3 rounded-2xl space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Paper Size</label>
                <select
                  value={paperSize}
                  onChange={(e) => setPaperSize(e.target.value as 'a4' | 'letter')}
                  className="w-full bg-slate-900 text-slate-100 border border-slate-800 text-xs font-bold rounded-lg p-2 outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="a4">A4 (8.27" x 11.69")</option>
                  <option value="letter">US Letter (8.50" x 11.00")</option>
                </select>
              </div>

              {/* Orientation Control */}
              <div className="bg-slate-950/40 border border-slate-800 p-3 rounded-2xl space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Orientation</label>
                <select
                  value={orientation}
                  onChange={(e) => setOrientation(e.target.value as 'landscape' | 'portrait')}
                  className="w-full bg-slate-900 text-slate-100 border border-slate-800 text-xs font-bold rounded-lg p-2 outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="landscape">Landscape</option>
                  <option value="portrait">Portrait</option>
                </select>
              </div>

              {/* Margins Control */}
              <div className="bg-slate-950/40 border border-slate-800 p-3 rounded-2xl space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Print Margins</label>
                <select
                  value={marginSize}
                  onChange={(e) => setMarginSize(e.target.value as 'none' | 'narrow' | 'normal' | 'wide')}
                  className="w-full bg-slate-900 text-slate-100 border border-slate-800 text-xs font-bold rounded-lg p-2 outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="none">None (0.0 in)</option>
                  <option value="narrow">Narrow (0.15 in)</option>
                  <option value="normal">Normal (0.40 in)</option>
                  <option value="wide">Wide (0.75 in)</option>
                </select>
              </div>

              {/* Page print range Selection Control */}
              <div className="bg-slate-950/40 border border-slate-800 p-3 rounded-2xl space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 block">Pages to Print/Show</label>
                <select
                  value={printPageSelection}
                  onChange={(e) => setPrintPageSelection(e.target.value as 'both' | 'page1' | 'page2')}
                  className="w-full bg-slate-900 text-slate-100 border border-slate-800 text-xs font-bold rounded-lg p-2 outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="both">Page 1 & Page 2 (Both)</option>
                  <option value="page1">Page 1 Only</option>
                  <option value="page2">Page 2 Only</option>
                </select>
              </div>

              {/* Scale / Calibration Slider */}
              <div className="bg-slate-950/40 border border-slate-800 p-3 rounded-2xl space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Scale Calibration</label>
                  <span className="text-[9px] font-black text-blue-400 px-1.5 py-0.5 bg-blue-500/10 rounded-md">{printScale}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPrintScale(prev => Math.max(60, prev - 5))}
                    className="p-1 bg-slate-900 rounded-lg border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all text-xs font-bold w-7 cursor-pointer"
                    title="Shrink"
                  >
                    -
                  </button>
                  <input
                    type="range"
                    min="60"
                    max="110"
                    value={printScale}
                    onChange={(e) => setPrintScale(parseInt(e.target.value, 10))}
                    className="flex-1 accent-blue-500 h-1 bg-slate-900 rounded-lg cursor-pointer outline-none"
                  />
                  <button
                    onClick={() => setPrintScale(prev => Math.min(110, prev + 5))}
                    className="p-1 bg-slate-900 rounded-lg border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all text-xs font-bold w-7 cursor-pointer"
                    title="Grow"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Certificate of Transfer options */}
            <div className="bg-slate-950/20 border border-slate-800/80 p-3.5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-sans max-w-full">
              <div>
                <h5 className="text-xs font-black text-slate-200 uppercase tracking-wide">Certificate of Transfer options</h5>
                <p className="text-[10px] text-slate-400 font-medium">Toggle whether the learner wants to transfer. Only when active, the template populates their name and signature lines.</p>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <input
                  type="checkbox"
                  id="layoutIsTransferringOpt"
                  checked={isTransferring}
                  onChange={(e) => setIsTransferring(e.target.checked)}
                  className="w-4.5 h-4.5 bg-slate-900 border-slate-700 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="layoutIsTransferringOpt" className="text-xs font-bold text-slate-200 select-none cursor-pointer">
                  Learner Wants to Transfer
                </label>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 font-medium leading-normal italic select-none">
              💡 Quick Calibration Info: To guarantee that Page 1 fits completely in 1 page without running over, use a Scale of around <strong>90% - 95%</strong> and select <strong>Margins: None</strong> inside browser print settings.
            </p>
          </div>

          {/* REPORT CARD ROOT LAYOUT (STACKED PAGES INDIVIDUALLY FORMATTED FOR PRINT) */}
          <div 
            className="flex flex-col items-center gap-12 print:w-full print:bg-white print:m-0 print:p-0"
            style={{ width: widthVal }}
          >
            
            {/* ============================== */}
            {/* PAGE 1: LEFT & RIGHT SIDE-BY-SIDE PANELS */}
            {/* ============================== */}
            <div 
              id="progress-report-page-1"
              className={`bg-white text-black p-8 border border-slate-300 rounded shadow-2xl print:border-none print:shadow-none print:p-0 print:m-0 flex gap-6 overflow-hidden shrink-0 print:break-after-page print-card-page ${printPageSelection === 'page2' ? 'hidden print:hidden' : ''}`}
              style={{
                width: widthVal,
                height: heightVal,
                transform: `scale(${printScale / 100})`,
                transformOrigin: 'top center',
                marginBottom: printScale < 100 ? `calc(${heightVal} * ${(printScale / 100) - 1})` : undefined,
              }}
            >
              
              {/* PAGE 1 - LEFT COLUMN (ATTENDANCE & RULES) */}
              <div className="w-1/2 flex flex-col justify-between border-r border-slate-200 pr-6 h-full font-serif">
                
                {/* 1. Attendance Record Table */}
                <div>
                  <h4 className="text-[10px] font-black text-center font-sans tracking-widest uppercase mb-1 border-b-2 border-black pb-0.5">ATTENDANCE RECORD</h4>
                  <table className="w-full text-center text-[8px] border-collapse border border-black font-sans">
                    <thead>
                      <tr className="bg-slate-100 font-extrabold uppercase text-[6px] tracking-wide">
                        <th className="border border-black py-0.5 px-0.5 font-sans w-12 text-center">Term</th>
                        <th className="border border-black py-0.5 px-1 font-sans text-left">Month</th>
                        <th className="border border-black py-0.5 px-0.5 font-sans">No. of Class Days</th>
                        <th className="border border-black py-0.5 px-0.5 font-sans">No. of Days Present</th>
                        <th className="border border-black py-0.5 px-0.5 font-sans">No. of Times Absent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MONTHS_LIST.map((m, idx) => {
                        const mData = attendance[m] || { classDays: 0, daysPresent: 0, timesAbsent: 0 };
                        let termLabel = '';
                        if (idx === 0) termLabel = '1';
                        if (idx === 4) termLabel = '2';
                        if (idx === 7) termLabel = '3';
                        
                        return (
                          <tr key={m} className="font-semibold text-[7.5px] hover:bg-slate-50">
                            {/* Term merged mock borders */}
                            {idx === 0 && <td rowSpan={4} className="border border-black font-black text-[9px] align-middle text-center bg-slate-50/50">1</td>}
                            {idx === 4 && <td rowSpan={3} className="border border-black font-black text-[9px] align-middle text-center bg-slate-50/50">2</td>}
                            {idx === 7 && <td rowSpan={4} className="border border-black font-black text-[9px] align-middle text-center bg-slate-50/50">3</td>}
                            <td className="border border-black text-left px-1.5 py-0.25 uppercase font-sans tracking-wider text-[7px]">{m}</td>
                            <td className="border border-black py-0.25 font-bold font-mono text-[7.5px]">{mData.classDays || ''}</td>
                            <td className="border border-black py-0.25 font-bold font-mono text-[7.5px]">{mData.daysPresent || ''}</td>
                            <td className="border border-black py-0.25 font-bold font-mono text-[7.5px]">{mData.classDays ? Math.max(0, (mData.classDays || 0) - (mData.daysPresent || 0)) : ''}</td>
                          </tr>
                        );
                      })}
                      <tr className="bg-slate-100 font-black uppercase text-[7px]">
                        <td colSpan={2} className="border border-black py-0.5 px-1.5 text-right">TOTAL</td>
                        <td className="border border-black py-0.5 font-mono text-[7.5px]">{totalAttendance.classDays || ''}</td>
                        <td className="border border-black py-0.5 font-mono text-[7.5px]">{totalAttendance.daysPresent || ''}</td>
                        <td className="border border-black py-0.5 font-mono text-[7.5px]">{totalAttendance.timesAbsent || ''}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 2. Rating Scales Legend */}
                <div className="border border-black p-3 my-2 text-[9px] leading-relaxed">
                  <h5 className="font-black text-center font-sans tracking-wider uppercase mb-1.5 text-[10px]">IMPORTANT NOTE TO PARENTS/GUARDIANS</h5>
                  <p className="text-[8.5px] mb-2 leading-tight">This rating scale is used to record the learner's level of attainment for each competency across the developmental domains. It guides teachers in assigning ratings based on observed performance and assessment results for each term.</p>
                  
                  <table className="w-full border-collapse border border-black font-sans text-[8.5px]">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-black px-2 py-1 font-black uppercase w-20">Rating</th>
                        <th className="border border-black px-2 py-1 font-black uppercase text-left">Indicators</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-black px-2 py-1.5 text-center font-black">Consistent (CO)</td>
                        <td className="border border-black px-2 py-1 px-1.5 space-y-0.5 leading-tight">
                          <p>• Always demonstrates the expected competency</p>
                          <p>• Always participates in different activities, works independently</p>
                          <p>• Always performs tasks, advanced in some aspects</p>
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-black px-2 py-1.5 text-center font-black">Developing (DV)</td>
                        <td className="border border-black px-2 py-1 px-1.5 space-y-0.5 leading-tight">
                          <p>• Sometimes demonstrates the expected competency</p>
                          <p>• Sometimes participates, minimal supervision</p>
                          <p>• Progresses continuously in doing assigned tasks</p>
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-black px-2 py-1.5 text-center font-black">Beginning (BG)</td>
                        <td className="border border-black px-2 py-1 px-1.5 space-y-0.5 leading-tight">
                          <p>• Rarely demonstrates the expected competency</p>
                          <p>• Rarely participates in class activities; seeks teacher assistance</p>
                          <p>• Shows interest in doing tasks but needs close supervision</p>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 3. Certificate Of Transfer */}
                <div className="border border-dashed border-black/40 p-4 text-[9px] relative group/transfer">
                  <div className="absolute top-1.5 right-1.5 no-print">
                    <label className="flex items-center gap-1.5 cursor-pointer bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-[8px] font-bold text-slate-600 hover:bg-slate-100 select-none">
                      <input
                        type="checkbox"
                        checked={isTransferring}
                        onChange={(e) => setIsTransferring(e.target.checked)}
                        className="w-3 h-3 text-blue-600 rounded"
                      />
                      Show Transfer Info
                    </label>
                  </div>
                  <h5 className="font-black text-center font-sans tracking-wide uppercase mb-1 pb-0.5 border-b text-[9.5px]">CERTIFICATE OF TRANSFER</h5>
                  <p className="indent-4 leading-normal font-sans italic text-slate-800 text-[8.5px]">
                    This is to certify that {isTransferring ? (
                      <strong className="font-extrabold uppercase not-italic border-b border-black font-serif text-[9.5px] px-1">{selectedLearner.name}</strong>
                    ) : (
                      <span className="font-serif text-[9.5px] text-slate-300 font-normal border-b border-black select-none tracking-[0.2em] px-4">__________________________</span>
                    )} has developed the general competencies based on the Kindergarten Curriculum Guide.
                  </p>
                  <div className="flex justify-between items-end gap-6 mt-8">
                    <div className="text-center w-40 shrink-0">
                      <div className="border-b border-black py-0.5 font-bold uppercase text-[9px] font-sans h-5 flex items-end justify-center">
                        {isTransferring ? (user.fullName || selectedLearner.adviser) : ''}
                      </div>
                      <p className="text-[7.5px] uppercase font-bold text-slate-500 font-sans mt-0.5">Adviser / Teacher</p>
                    </div>
                    <div className="text-center w-40 shrink-0">
                      <div className="border-b border-black py-0.5 font-bold uppercase text-[9px] font-sans h-5 flex items-end justify-center">
                        {isTransferring ? (user.schoolHeadName || 'School Head') : ''}
                      </div>
                      <p className="text-[7.5px] uppercase font-bold text-slate-500 font-sans mt-0.5">School Principal</p>
                    </div>
                  </div>
                </div>

              </div>

              {/* PAGE 1 - RIGHT COLUMN (CORE GRADES & REPORT DETAILS) */}
              <div className="w-1/2 flex flex-col justify-between h-full overflow-hidden">
                
                {/* School division headers */}
                <div className="flex items-center justify-center gap-4 pb-1.5 border-b-2 border-black px-2">
                  <div className="w-9 h-9 overflow-hidden flex items-center justify-center shrink-0">
                     <img src={formBranding.depedLogo} className="max-h-full object-contain" alt="DepEd Logo" onError={(e) => e.currentTarget.src='eccd.jpg'} />
                  </div>
                  <div className="text-center tracking-wide font-sans leading-none max-w-[210px]">
                    <p className="text-[7px] uppercase font-semibold text-slate-600">Republic of the Philippines</p>
                    <p className="text-[8px] uppercase font-black">Department of Education</p>
                    <p className="text-[7px] uppercase italic text-slate-500 leading-tight">Region II - Cagayan Valley</p>
                    <p className="text-[8px] uppercase font-black text-blue-900 mt-0.5 leading-none">{user.district || 'District monitoring station'}</p>
                    <p className="text-[8px] uppercase font-semibold text-slate-700 leading-tight mt-0.5">{user.schoolName || 'Kindergarten Division'}</p>
                  </div>
                  <div className="w-9 h-9 border border-slate-200 bg-slate-50 text-slate-400 rounded-sm font-sans flex items-center justify-center text-[6px] uppercase shrink-0 font-bold leading-none text-center">
                    {formBranding.schoolLogo ? (
                      <img src={formBranding.schoolLogo} alt="School Logo" className="max-h-full object-contain" />
                    ) : (
                      <span>School<br />Logo</span>
                    )}
                  </div>
                </div>

                <div className="text-center my-1">
                  <h3 className="text-[11.5px] font-black uppercase tracking-widest font-sans leading-none text-slate-900">KINDERGARTEN PROGRESS REPORT</h3>
                  <p className="text-[9.5px] font-black uppercase text-slate-600 font-serif leading-tight mt-0.5">S.Y. {selectedLearner.schoolYear}</p>
                </div>

                {/* Student metadata table */}
                <div className="border border-black/30 p-2 bg-slate-50/50 rounded-lg text-[8px] font-sans my-1.5 leading-none space-y-1.5">
                  {/* Row 1: Name and LRN */}
                  <div className="flex gap-4 w-full items-end">
                    <div className="flex-1 flex items-end">
                      <span className="font-bold text-slate-800 shrink-0 mr-1 select-none">Name:</span>
                      <span className="border-b border-black flex-1 text-center font-black uppercase text-[10px] pb-[1px] px-1 text-slate-900 leading-none">{selectedLearner.name}</span>
                    </div>
                    <div className="w-[160px] flex items-end shrink-0">
                      <span className="font-bold text-slate-800 shrink-0 mr-1 select-none">LRN:</span>
                      <span className="border-b border-black flex-1 text-center font-mono font-bold text-[9px] pb-[1px] px-1 text-slate-900 leading-none">{selectedLearner.lrn}</span>
                    </div>
                  </div>

                  {/* Row 2: Section, Teacher, and Birthdate */}
                  <div className="flex gap-4 w-full items-end">
                    <div className="w-[130px] flex items-end shrink-0">
                      <span className="font-bold text-slate-800 shrink-0 mr-1 select-none">Section:</span>
                      <span className="border-b border-black flex-1 text-center font-bold uppercase text-[9px] pb-[1px] px-1 text-slate-900 leading-none">{selectedLearner.section || '---'}</span>
                    </div>
                    <div className="flex-1 flex items-end">
                      <span className="font-bold text-slate-800 shrink-0 mr-1 select-none">Teacher:</span>
                      <span className="border-b border-black flex-1 text-center font-bold uppercase text-[9px] pb-[1px] px-1 text-slate-900 leading-none">{user.fullName || selectedLearner.adviser || '---'}</span>
                    </div>
                    <div className="w-[110px] flex items-end shrink-0">
                      <span className="font-bold text-slate-800 shrink-0 mr-1 select-none">Birthdate:</span>
                      <span className="border-b border-black flex-1 text-center font-bold text-[9px] pb-[1px] px-1 text-slate-900 leading-none">{selectedLearner.birthday}</span>
                    </div>
                  </div>

                  {/* Row 3: Age of Child (Beginning & End of SY) */}
                  <div className="flex justify-between w-full items-end text-[7.5px] pt-0.5">
                    <div className="flex items-end gap-0.5 shrink-0">
                      <span className="font-bold text-slate-800 select-none">Age of the Child (Beginning of SY):</span>
                      <span className="text-slate-600">Years</span>
                      <span className="border-b border-black w-6 text-center font-black text-[9px] pb-[1px]">{begAge.y}</span>
                      <span className="text-slate-600">; Months</span>
                      <span className="border-b border-black w-6 text-center font-black text-[9px] pb-[1px]">{begAge.m}</span>
                    </div>
                    <div className="flex items-end gap-0.5 shrink-0">
                      <span className="font-bold text-slate-800 select-none">Age of the Child (End of SY):</span>
                      <span className="text-slate-600">Years</span>
                      <span className="border-b border-black w-6 text-center font-black text-[9px] pb-[1px]">{endAge.y}</span>
                      <span className="text-slate-600">; Months</span>
                      <span className="border-b border-black w-6 text-center font-black text-[9px] pb-[1px]">{endAge.m}</span>
                    </div>
                  </div>
                </div>

                {/* Mini Intro description */}
                <p className="text-[7.2px] text-justify text-slate-600 leading-snug font-sans my-1 pb-1 border-b border-dashed">
                  This progress report informs parents about their child's learning achievements based on the Kindergarten Curriculum Guide. It provides a summary of the child's performance and indicators of their level of progress across different developmental domains every term. Each competency is marked as: <strong>BG</strong> - Beginning, <strong>DV</strong> - Developing, and <strong>CO</strong> - Consistent.
                </p>

                {/* Sub Competencies Table group (I, II, III) */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 select-none scrollbar-hide shrink-0 min-h-[300px]">
                  {COMPETENCY_GROUPS.slice(0, 3).map((group) => (
                    <div key={group.id} className="text-[8.5px]">
                      <div className="bg-slate-900 text-white font-sans font-black uppercase text-[8px] px-2 py-0.5 tracking-wider flex justify-between items-center mb-0.5">
                        <span>{group.title}</span>
                        <div className="flex gap-4 pr-1 text-[7px] text-slate-300">
                          <span className="w-4 font-black text-center">T1</span>
                          <span className="w-4 font-black text-center">T2</span>
                          <span className="w-4 font-black text-center">T3</span>
                        </div>
                      </div>
                      <div className="divide-y divide-black/30 border border-black overflow-hidden bg-white">
                        {group.items.map((comp) => {
                          const val1 = ratings[comp.id]?.[0] || '';
                          const val2 = ratings[comp.id]?.[1] || '';
                          const val3 = ratings[comp.id]?.[2] || '';
                          return (
                            <div key={comp.id} className="flex hover:bg-slate-50 items-center min-h-[13px] print:min-h-[11px] leading-none">
                              <span className="w-4 font-bold border-r border-black font-sans text-[7.5px] py-0.5 text-center shrink-0">{comp.num}</span>
                              <p className="flex-1 px-1.5 py-[1px] font-medium font-sans text-[7.5px] print:text-[7.1px] text-slate-900 leading-none">{comp.text}</p>
                              <div className="flex shrink-0 font-sans">
                                <span className={`w-6 border-l border-black font-black text-center text-[7.5px] py-[1px] ${val1 === 'CO' ? 'bg-emerald-50 text-emerald-800' : val1 === 'DV' ? 'bg-amber-50 text-amber-800' : ''}`}>{val1}</span>
                                <span className={`w-6 border-l border-black font-black text-center text-[7.5px] py-[1px] ${val2 === 'CO' ? 'bg-emerald-50 text-emerald-800' : val2 === 'DV' ? 'bg-amber-50 text-amber-800' : ''}`}>{val2}</span>
                                <span className={`w-6 border-l border-black font-black text-center text-[7.5px] py-[1px] ${val3 === 'CO' ? 'bg-emerald-50 text-emerald-800' : val3 === 'DV' ? 'bg-amber-50 text-amber-800' : ''}`}>{val3}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

              </div>

            </div>

            {/* ============================== */}
            {/* PAGE 2: MAIN LANGUAGE DOMAIN & REMARKS */}
            {/* ============================== */}
            <div 
              id="progress-report-page-2"
              className={`bg-white text-black p-8 border border-slate-300 rounded shadow-2xl print:border-none print:shadow-none print:p-0 print:m-0 flex gap-6 overflow-hidden shrink-0 print:break-after-page print-card-page ${printPageSelection === 'page1' ? 'hidden print:hidden' : ''}`}
              style={{
                width: widthVal,
                height: heightVal,
                transform: `scale(${printScale / 100})`,
                transformOrigin: 'top center',
                marginBottom: printScale < 100 ? `calc(${heightVal} * ${(printScale / 100) - 1})` : undefined,
              }}
            >
              
              {/* PAGE 2 - LEFT COLUMN (LANGUAGE, LITERACY PART IV) */}
              <div className="w-1/2 flex flex-col justify-between border-r border-slate-200 pr-6 h-full overflow-hidden">
                
                <div className="bg-slate-900 text-white font-sans font-black uppercase text-[8px] px-2 py-0.5 tracking-wider flex justify-between items-center mb-0.5">
                  <span>IV. Language, Literacy, and Communication Development</span>
                  <div className="flex gap-4 pr-1 text-[7px] text-slate-300">
                    <span className="w-4 font-black text-center">T1</span>
                    <span className="w-4 font-black text-center">T2</span>
                    <span className="w-4 font-black text-center">T3</span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 text-[8px] font-sans scrollbar-hide divide-y divide-black/35 border border-black">
                  {COMPETENCY_GROUPS[3].subgroups?.map((sub) => (
                    <div key={sub.title} className="divide-y divide-black/30">
                      <div className="bg-slate-50 font-black p-1 text-[7.5px] tracking-wide text-slate-700 font-mono italic uppercase">
                        {sub.title}
                      </div>
                      {sub.items.map((comp) => {
                        const val1 = ratings[comp.id]?.[0] || '';
                        const val2 = ratings[comp.id]?.[1] || '';
                        const val3 = ratings[comp.id]?.[2] || '';
                        return (
                          <div key={comp.id} className="flex hover:bg-slate-50 items-center min-h-[13px] print:min-h-[11px] leading-none">
                            <span className="w-4 font-bold border-r border-black font-sans text-[7.5px] text-center shrink-0 py-[1px]">{comp.num}</span>
                            <p className="flex-1 px-1.5 font-medium font-sans text-[7.5px] print:text-[7.1px] text-slate-900 py-[1px] leading-none">{comp.text}</p>
                            <div className="flex shrink-0 font-sans">
                              <span className={`w-6 border-l border-black font-black text-center text-[7.5px] py-[1px] ${val1 === 'CO' ? 'bg-emerald-50 text-emerald-800' : val1 === 'DV' ? 'bg-amber-50 text-amber-800' : ''}`}>{val1}</span>
                              <span className={`w-6 border-l border-black font-black text-center text-[7.5px] py-[1px] ${val2 === 'CO' ? 'bg-emerald-50 text-emerald-800' : val2 === 'DV' ? 'bg-amber-50 text-amber-800' : ''}`}>{val2}</span>
                              <span className={`w-6 border-l border-black font-black text-center text-[7.5px] py-[1px] ${val3 === 'CO' ? 'bg-emerald-50 text-emerald-800' : val3 === 'DV' ? 'bg-amber-50 text-amber-800' : ''}`}>{val3}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>

              </div>

              {/* PAGE 2 - RIGHT COLUMN (TEACHER'S COMMENTS/REMARKS) */}
              <div className="w-1/2 flex flex-col justify-between h-full font-sans pl-2">
                
                <div className="pb-1 border-b-2 border-black">
                  <h4 className="text-[12px] font-black text-center font-sans tracking-widest uppercase text-slate-900">TEACHER'S COMMENTS/REMARKS</h4>
                  <p className="text-[8.5px] italic text-center text-slate-500 font-sans mt-0.5 leading-none">(Provide specific observations, strengths, and suggested interventions.)</p>
                </div>

                {/* 3 Comment blocks for T1, T2, T3 closely packed together */}
                <div className="flex-1 flex flex-col justify-between py-2 space-y-4 font-serif">
                  
                  {[0, 1, 2].map((termIdx) => {
                    const label = termIdx === 0 ? 'TERM 1 (UNANG TERMINO)' : termIdx === 1 ? 'TERM 2 (IKALAWANG TERMINO)' : 'TERM 3 (IKATLONG TERMINO)';
                    return (
                      <div key={termIdx} className="flex-1 flex flex-col border border-black/80 rounded-sm p-2.5 bg-slate-50/10 hover:bg-slate-50 relative">
                        <span className="text-[8.5px] font-black uppercase text-slate-800 tracking-wider font-sans border-b border-black pb-0.5 mb-1 bg-slate-100 flex justify-between px-1 rounded-sm">
                          <span>{label}</span>
                          <span className="text-[7.5px] text-slate-400 font-mono">T{termIdx + 1}</span>
                        </span>
                        
                        {/* Fake remarks line design layout */}
                        <div className="flex-1 text-[10px] font-medium leading-relaxed overflow-hidden text-slate-900 italic font-serif p-1 select-text">
                          {comments[termIdx] || (
                            <div className="flex flex-col gap-1.5 text-slate-300 print:hidden justify-center select-none pt-4">
                              <p className="border-b border-slate-200 h-4"></p>
                              <p className="border-b border-slate-200 h-4"></p>
                              <p className="border-b border-slate-200 h-4"></p>
                            </div>
                          )}
                        </div>

                        {/* Signature line for Parent */}
                        <div className="flex justify-end mt-2 animate-in fade-in">
                          <div className="text-right w-52 pt-1">
                            <span className="border-b border-black block w-full h-4 font-serif text-[9px]"></span>
                            <p className="text-[7.5px] uppercase font-semibold text-slate-500 font-sans mt-0.5 tracking-tighter">Parent's/Guardian's Signature</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                </div>

              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};
