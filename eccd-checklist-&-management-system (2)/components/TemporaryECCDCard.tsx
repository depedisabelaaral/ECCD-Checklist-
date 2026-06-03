import React, { useMemo, useCallback } from 'react';
import { User, Learner, Assessment } from '../types';
import { DOMAINS, ECCD_TASKS } from '../constants';
import { SCALED_SCORE_TABLES, STANDARD_SCORE_TABLE } from '../constants/scaledScores';
import { Printer, ChevronRight, UserCheck, Search, CheckCircle2, X, Settings, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface TemporaryECCDCardProps {
  user: User;
  learner: Learner;
  allLearners: Learner[];
  onSelectLearner: (l: Learner) => void;
  assessments: Assessment[];
}

const TemporaryECCDCard: React.FC<TemporaryECCDCardProps> = ({ user, learner, allLearners, onSelectLearner, assessments }) => {
  const [learnerSearch, setLearnerSearch] = React.useState('');
  const [selectedPeriod, setSelectedPeriod] = React.useState<string>('FIRST ASSESSMENT');
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);
  const [previewZoom, setPreviewZoom] = React.useState(0.6);
  const [showSettings, setShowSettings] = React.useState(true);
  const [printSettings, setPrintSettings] = React.useState({
    paperSize: 'A4',
    orientation: 'portrait',
    marginMm: 10,
    scale: 100,
    showBorder: false
  });

  const USER_FORM_LOGO_KEY = user ? `branding_form_logo_${user.id}` : '';
  const DEPED_LOGO_KEY = 'branding_deped_logo';

  const [logos, setLogos] = React.useState(() => ({
    deped: localStorage.getItem(DEPED_LOGO_KEY) || 'eccd.jpg',
    school: localStorage.getItem(USER_FORM_LOGO_KEY) || ''
  }));

  React.useEffect(() => {
    const deped = localStorage.getItem(DEPED_LOGO_KEY);
    const school = localStorage.getItem(USER_FORM_LOGO_KEY);
    setLogos({
      deped: deped || 'eccd.jpg',
      school: school || ''
    });
  }, [USER_FORM_LOGO_KEY]);

  const assessedLearners = useMemo(() => {
    return allLearners.filter(l => assessments.some(a => a.learnerId === l.id));
  }, [allLearners, assessments]);

  const filteredLearners = useMemo(() => {
    return assessedLearners.filter(l => 
      l.name.toLowerCase().includes(learnerSearch.toLowerCase()) || 
      l.lrn.includes(learnerSearch)
    );
  }, [assessedLearners, learnerSearch]);

  const currentAssessment = useMemo(() => {
    return assessments.find(a => a.learnerId === learner.id && a.period === selectedPeriod);
  }, [assessments, learner.id, selectedPeriod]);

  const calculateAgeDetails = useCallback((birthday: string, refDate: string) => {
    if (!birthday || !refDate) return { y: '-', m: '-', d: '-' };
    const b = new Date(birthday);
    const r = new Date(refDate);
    if (isNaN(b.getTime()) || isNaN(r.getTime())) return { y: '-', m: '-', d: '-' };
    
    let y = r.getFullYear() - b.getFullYear();
    let m = r.getMonth() - b.getMonth();
    let d = r.getDate() - b.getDate();
    
    if (d < 0) { m--; d += 30; }
    if (m < 0) { y--; m += 12; }
    
    return { y, m, d };
  }, []);

  const getScaledScore = useCallback((domainId: string, raw: number, birthday: string, refDate: string) => {
    const age = calculateAgeDetails(birthday, refDate);
    if (age.y === '-') return 0;
    const ageNum = parseFloat(`${age.y}.${age.m}`);
    let tableKey = "";
    if (ageNum >= 3.1 && ageNum <= 4.0) tableKey = '3.1-4.0';
    else if (ageNum >= 4.1 && ageNum <= 5.0) tableKey = '4.1-5.0';
    else if (ageNum >= 5.1) tableKey = '5.1-above';
    else return 0;
    return SCALED_SCORE_TABLES[tableKey]?.[domainId]?.[raw] ?? 0;
  }, [calculateAgeDetails]);

  const getStandardScore = useCallback((a: Assessment, l: Learner) => {
    let totalScaled = 0;
    DOMAINS.forEach(d => {
      totalScaled += getScaledScore(d.id, (a.scores as any)[d.id], l.birthday, a.date);
    });
    if (totalScaled < 29) return 37;
    if (totalScaled > 98) return 138;
    return STANDARD_SCORE_TABLE[totalScaled] || 0;
  }, [getScaledScore]);

  const getInterpretation = (score: number) => {
    if (score === 0) return "";
    if (score <= 69) return "Significant Delay";
    if (score <= 79) return "Slight Delay";
    if (score <= 119) return "Average";
    if (score <= 129) return "Slightly Adv.";
    return "Highly Adv.";
  };

  const handlePrint = () => {
    window.focus();
    setTimeout(() => window.print(), 200);
  };

  const graphData = useMemo(() => {
    return DOMAINS.map(d => {
      const raw = currentAssessment ? (currentAssessment.scores as any)[d.id] : 0;
      const scaled = currentAssessment ? getScaledScore(d.id, raw, learner.birthday, currentAssessment.date) : 0;
      return {
        name: d.label.toUpperCase(),
        scaled: scaled
      };
    });
  }, [currentAssessment, learner, getScaledScore]);

  return (
    <div className="bg-slate-100 min-h-screen p-8 flex flex-col items-center gap-6">
      <style>{`
        .printable-card {
          width: ${printSettings.paperSize === 'Letter' ? '215.9mm' : printSettings.paperSize === 'Legal' ? '215.9mm' : '210mm'};
          height: ${printSettings.paperSize === 'Letter' ? '279.4mm' : printSettings.paperSize === 'Legal' ? '355.6mm' : '297mm'};
          background: white;
          padding: ${printSettings.marginMm}mm;
          box-shadow: 0 0 20px rgba(0,0,0,0.1);
          border: 1px solid #e2e8f0;
          overflow: hidden;
          position: relative;
          transition: all 0.3s ease;
          transform: scale(${printSettings.scale / 100});
          transform-origin: top center;
        }
        @media print {
          @page {
            size: ${printSettings.paperSize === 'Letter' ? 'letter' : printSettings.paperSize === 'Legal' ? 'legal' : 'A4'} ${printSettings.orientation};
            margin: 0;
          }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; padding: 0 !important; margin: 0 !important; }
          .printable-card {
            width: ${printSettings.paperSize === 'Letter' ? '215.9mm' : printSettings.paperSize === 'Legal' ? '215.9mm' : '210mm'} !important;
            height: ${printSettings.paperSize === 'Letter' ? '279.4mm' : printSettings.paperSize === 'Legal' ? '355.6mm' : '297mm'} !important;
            box-shadow: none !important;
            border: none !important;
            padding: ${printSettings.marginMm}mm !important;
            margin: 0 !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            box-sizing: border-box !important;
            transform: scale(${printSettings.scale / 100}) !important;
            transform-origin: top center !important;
          }
          .print-only-area {
            display: block !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            z-index: 9999;
            background: white;
          }
          /* Hide everything else when printing */
          body > *:not(.print-only-area) {
            display: none !important;
          }
        }
        .temp-table th, .temp-table td {
          border: 1px solid black;
          padding: 0.5px 1.5px;
          font-size: 5.5pt;
          line-height: 1;
        }
        .temp-table th {
          background: #f8fafc;
          font-weight: 800;
          text-transform: uppercase;
        }
        .centered-header {
          text-align: center !important;
        }
      `}</style>

      {/* Print Preview Modal */}
      {isPreviewOpen && (
        <div 
          className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-md flex flex-col no-print"
          onClick={() => setIsPreviewOpen(false)}
        >
          {/* Fixed Header */}
          <div 
            className="w-full bg-white border-b border-slate-200 shadow-lg z-[110] px-6 py-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-200">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">ECCD Card Preview</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-2">
                    {printSettings.paperSize} {printSettings.orientation} • {printSettings.margins} Margins • {printSettings.scale}% Scale
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Zoom Controls */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button 
                    onClick={() => setPreviewZoom(Math.max(0.3, previewZoom - 0.1))}
                    className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm hover:bg-slate-50 text-slate-600 transition-all active:scale-90"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <div className="px-3 min-w-[60px] text-center">
                    <span className="text-[10px] font-black text-slate-600">{Math.round(previewZoom * 100)}%</span>
                  </div>
                  <button 
                    onClick={() => setPreviewZoom(Math.min(1.5, previewZoom + 0.1))}
                    className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm hover:bg-slate-50 text-slate-600 transition-all active:scale-90"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setPreviewZoom(0.6)}
                    className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm hover:bg-slate-50 text-slate-400 transition-all active:scale-90 ml-1"
                    title="Reset Zoom"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="h-8 w-px bg-slate-200"></div>

                {/* Settings Toggle */}
                <button 
                  onClick={() => setShowSettings(!showSettings)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border ${
                    showSettings 
                      ? 'bg-blue-50 border-blue-200 text-blue-600' 
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Settings className={`w-4 h-4 ${showSettings ? 'animate-spin-slow' : ''}`} />
                  Settings
                </button>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={handlePrint}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 active:scale-95"
                  >
                    <Printer className="w-4 h-4" /> Print Now
                  </button>
                  <button 
                    onClick={() => setIsPreviewOpen(false)}
                    className="p-2.5 bg-slate-100 text-slate-400 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-all border border-slate-200"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden relative">
            {/* Settings Sidebar */}
            {showSettings && (
              <div 
                className="w-72 bg-white border-r border-slate-200 p-6 overflow-y-auto animate-in slide-in-from-left duration-300"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="space-y-6">
                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Page Setup</h4>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold text-slate-500 uppercase">Paper Size</label>
                        <select 
                          value={printSettings.paperSize}
                          onChange={(e) => setPrintSettings({...printSettings, paperSize: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[10px] font-black outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="A4">A4 (210 x 297 mm)</option>
                          <option value="Letter">Letter (8.5 x 11 in)</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold text-slate-500 uppercase">Orientation</label>
                        <div className="grid grid-cols-2 gap-2">
                          {['portrait', 'landscape'].map(o => (
                            <button
                              key={o}
                              onClick={() => setPrintSettings({...printSettings, orientation: o})}
                              className={`py-2 rounded-lg text-[9px] font-black uppercase border transition-all ${
                                printSettings.orientation === o 
                                  ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                                  : 'bg-white border-slate-200 text-slate-400 hover:border-blue-300'
                              }`}
                            >
                              {o}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-slate-100"></div>

                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Layout Options</h4>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold text-slate-500 uppercase">Margins</label>
                        <select 
                          value={printSettings.margins}
                          onChange={(e) => setPrintSettings({...printSettings, margins: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[10px] font-black outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="0.2in">Narrow (0.2")</option>
                          <option value="0.4in">Normal (0.4")</option>
                          <option value="0.75in">Wide (0.75")</option>
                          <option value="0">None</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold text-slate-500 uppercase">Print Scale: {printSettings.scale}%</label>
                        <input 
                          type="range" 
                          min="50" 
                          max="150" 
                          value={printSettings.scale}
                          onChange={(e) => setPrintSettings({...printSettings, scale: parseInt(e.target.value)})}
                          className="w-full accent-blue-600"
                        />
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <label className="text-[9px] font-bold text-slate-500 uppercase">Show Border</label>
                        <button 
                          onClick={() => setPrintSettings({...printSettings, showBorder: !printSettings.showBorder})}
                          className={`w-10 h-5 rounded-full transition-all relative ${printSettings.showBorder ? 'bg-blue-600' : 'bg-slate-200'}`}
                        >
                          <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${printSettings.showBorder ? 'left-6' : 'left-1'}`}></div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Scrollable Preview Area */}
            <div className="flex-1 overflow-auto p-4 md:p-12 flex justify-center items-start bg-slate-800/50">
              <div 
                className="bg-white shadow-[0_0_100px_rgba(0,0,0,0.5)] rounded-sm origin-top mb-12 transition-transform duration-300"
                style={{ 
                  transform: `scale(${previewZoom})`,
                  width: printSettings.paperSize === 'A4' ? '210mm' : '8.5in',
                  minHeight: printSettings.paperSize === 'A4' ? '297mm' : '11in',
                  padding: printSettings.margins,
                  border: printSettings.showBorder ? '1px solid #e2e8f0' : 'none'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <PrintableCardContent 
                  user={user} 
                  learner={learner} 
                  assessments={assessments} 
                  selectedPeriod={selectedPeriod}
                  calculateAgeDetails={calculateAgeDetails}
                  getScaledScore={getScaledScore}
                  getStandardScore={getStandardScore}
                  getInterpretation={getInterpretation}
                  graphData={graphData}
                  logos={logos}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selector Sidebar for UI */}
      <div className="w-full max-w-7xl flex gap-8 no-print items-start justify-center">
        <div className="w-64 shrink-0 space-y-4 sticky top-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <UserCheck className="w-3.5 h-3.5" /> Select Learner
            </h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                value={learnerSearch}
                onChange={(e) => setLearnerSearch(e.target.value)}
              />
            </div>
            <div className="max-h-[350px] overflow-y-auto space-y-1 pr-1 scrollbar-thin">
              {filteredLearners.map(l => (
                <button
                  key={l.id}
                  onClick={() => onSelectLearner(l)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-all flex items-center justify-between group ${
                    l.id === learner.id ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <div className="min-w-0">
                    <p className={`text-[10px] font-black truncate uppercase tracking-tight ${l.id === learner.id ? 'text-white' : 'text-slate-900'}`}>{l.name}</p>
                    <p className={`text-[8px] font-bold ${l.id === learner.id ? 'text-blue-100' : 'text-slate-400'}`}>{l.lrn}</p>
                  </div>
                  {l.id === learner.id ? <CheckCircle2 className="w-3 h-3" /> : <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100" />}
                </button>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Settings className="w-3 h-3" /> Print Settings
                </label>
                <button 
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-1 hover:bg-slate-100 rounded-md transition-colors"
                >
                  <Maximize2 className={`w-3 h-3 text-slate-400 transition-transform ${showSettings ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {showSettings && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-bold text-slate-500 uppercase">Paper Size</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold outline-none focus:ring-2 focus:ring-blue-500"
                      value={printSettings.paperSize}
                      onChange={(e) => setPrintSettings(prev => ({ ...prev, paperSize: e.target.value }))}
                    >
                      <option value="A4">A4 (210 x 297mm)</option>
                      <option value="Letter">Letter (8.5 x 11in)</option>
                      <option value="Legal">Legal (8.5 x 14in)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[8px] font-bold text-slate-500 uppercase">Margin ({printSettings.marginMm}mm)</label>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="30" 
                      step="1"
                      value={printSettings.marginMm}
                      onChange={(e) => setPrintSettings(prev => ({ ...prev, marginMm: parseInt(e.target.value) }))}
                      className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[8px] font-bold text-slate-500 uppercase">Scale ({printSettings.scale}%)</label>
                    </div>
                    <input 
                      type="range" 
                      min="50" 
                      max="150" 
                      step="1"
                      value={printSettings.scale}
                      onChange={(e) => setPrintSettings(prev => ({ ...prev, scale: parseInt(e.target.value) }))}
                      className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Assessment Period</label>
                <div className="grid grid-cols-1 gap-1.5">
                  {['FIRST ASSESSMENT', 'MID-ASSESSMENT', 'THIRD ASSESSMENT'].map(p => (
                    <button
                      key={p}
                      onClick={() => setSelectedPeriod(p)}
                      className={`px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-tight transition-all border ${
                        selectedPeriod === p ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-400 hover:border-blue-300'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <button 
              onClick={handlePrint}
              className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-100"
            >
              <Printer className="w-3.5 h-3.5" /> Print Card
            </button>
            <button 
              onClick={() => setIsPreviewOpen(true)}
              className="w-full py-3 bg-white border border-slate-200 text-slate-900 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
            >
              <Search className="w-3.5 h-3.5" /> Print Preview
            </button>
          </div>
        </div>

        {/* Printable Area Preview in UI */}
        <div className="flex-1 flex justify-center no-print overflow-auto max-h-[calc(100vh-100px)] pt-4">
          <div className="origin-top">
            <PrintableCardContent 
              user={user} 
              learner={learner} 
              assessments={assessments} 
              selectedPeriod={selectedPeriod}
              calculateAgeDetails={calculateAgeDetails}
              getScaledScore={getScaledScore}
              getStandardScore={getStandardScore}
              getInterpretation={getInterpretation}
              graphData={graphData}
              logos={logos}
            />
          </div>
        </div>
      </div>

      {/* Actual Print-only Area */}
      <div className="print-only-area hidden print:block">
        <PrintableCardContent 
          user={user} 
          learner={learner} 
          assessments={assessments} 
          selectedPeriod={selectedPeriod}
          calculateAgeDetails={calculateAgeDetails}
          getScaledScore={getScaledScore}
          getStandardScore={getStandardScore}
          getInterpretation={getInterpretation}
          graphData={graphData}
          logos={logos}
        />
      </div>
    </div>
  );
};

const PrintableCardContent = ({ 
  user, 
  learner, 
  assessments, 
  selectedPeriod, 
  calculateAgeDetails, 
  getScaledScore, 
  getStandardScore, 
  getInterpretation,
  graphData,
  logos
}: any) => {
  const currentAssessment = assessments.find((a: any) => a.learnerId === learner.id && a.period === selectedPeriod);

  const getDomainInterpretation = (scaled: number) => {
    if (scaled === 0) return "";
    if (scaled <= 7) return "Significant Delay";
    if (scaled <= 9) return "Slight Delay";
    if (scaled <= 12) return "Average";
    if (scaled <= 15) return "Slightly Adv.";
    return "Highly Adv.";
  };

  return (
    <div className="printable-card flex flex-col">
      {/* Header */}
      <div className="grid grid-cols-[50px_1fr_50px] items-center gap-2 mb-1 border-b border-black pb-0.5">
        <div className="w-[50px] h-[50px] flex items-center justify-center shrink-0">
          <img src={logos?.deped || 'eccd.jpg'} className="max-h-full object-contain" alt="DepEd Logo" referrerPolicy="no-referrer" />
        </div>
        <div className="text-center flex flex-col justify-center">
          <p className="text-[5pt] uppercase font-bold leading-tight">Republic of the Philippines</p>
          <p className="text-[7pt] uppercase font-black leading-tight">Department of Education</p>
          <p className="text-[5pt] uppercase leading-tight">{user.legislativeDistrict || 'REGION II - CAGAYAN VALLEY'}</p>
          <p className="text-[5pt] uppercase leading-tight">SCHOOLS DIVISION OF ISABELA</p>
          <p className="text-[6pt] uppercase font-black leading-tight">{user.district || 'SAN MARIANO I DISTRICT'}</p>
          <p className="text-[8pt] uppercase font-black mt-0.5 leading-tight">TEMPORARY ECCD CHECKLIST CARD</p>
        </div>
        <div className="w-[50px] h-[50px] border border-dashed border-slate-300 flex items-center justify-center overflow-hidden shrink-0 rounded-sm">
          {logos?.school ? (
            <img src={logos.school} className="max-h-full object-contain" alt="School Logo" referrerPolicy="no-referrer" />
          ) : (
            <span className="text-[4px] text-slate-300 font-black text-center uppercase leading-tight">SCHOOL<br/>LOGO</span>
          )}
        </div>
      </div>

      {/* Socio-Demographic Profile */}
      <div className="mb-0.5">
        <h4 className="bg-slate-100 text-[5.5pt] font-black uppercase px-2 py-0.5 border border-black mb-0.5 text-center">SOCIODEMOGRAPHIC PROFILE</h4>
        <div className="grid grid-cols-4 border border-black divide-x divide-black text-[5pt]">
          <div className="p-0.25 col-span-2">
            <span className="font-bold block text-[3pt] text-slate-500">NAME:</span>
            <span className="font-black uppercase">{learner.name}</span>
          </div>
          <div className="p-0.25">
            <span className="font-bold block text-[3pt] text-slate-500">LRN:</span>
            <span className="font-black">{learner.lrn}</span>
          </div>
          <div className="p-0.25">
            <span className="font-bold block text-[3pt] text-slate-500">SEX:</span>
            <span className="font-black uppercase">{learner.gender}</span>
          </div>
          
          <div className="p-0.25 border-t border-black">
            <span className="font-bold block text-[3pt] text-slate-500">BIRTHDAY:</span>
            <span className="font-black">{learner.birthday}</span>
          </div>
          <div className="p-0.25 border-t border-black">
            <span className="font-bold block text-[3pt] text-slate-500">HANDEDNESS:</span>
            <span className="font-black uppercase">{learner.handedness}</span>
          </div>
          <div className="p-0.25 border-t border-black col-span-2">
            <span className="font-bold block text-[3pt] text-slate-500">ADDRESS:</span>
            <span className="font-black uppercase">{learner.address}</span>
          </div>

          <div className="p-0.25 border-t border-black">
            <span className="font-bold block text-[3pt] text-slate-500">FATHER'S NAME:</span>
            <span className="font-black uppercase">{learner.fathersName}</span>
          </div>
          <div className="p-0.25 border-t border-black">
            <span className="font-bold block text-[3pt] text-slate-500">AGE:</span>
            <span className="font-black">{learner.fathersAge || '---'}</span>
          </div>
          <div className="p-0.25 border-t border-black">
            <span className="font-bold block text-[3pt] text-slate-500">OCCUPATION:</span>
            <span className="font-black uppercase">{learner.fathersOccupation}</span>
          </div>
          <div className="p-0.25 border-t border-black">
            <span className="font-bold block text-[3pt] text-slate-500">EDUC. ATTAINMENT:</span>
            <span className="font-black uppercase">{learner.fathersEducation}</span>
          </div>

          <div className="p-0.25 border-t border-black">
            <span className="font-bold block text-[3pt] text-slate-500">MOTHER'S NAME:</span>
            <span className="font-black uppercase">{learner.mothersName}</span>
          </div>
          <div className="p-0.25 border-t border-black">
            <span className="font-bold block text-[3pt] text-slate-500">AGE:</span>
            <span className="font-black">{learner.mothersAge || '---'}</span>
          </div>
          <div className="p-0.25 border-t border-black">
            <span className="font-bold block text-[3pt] text-slate-500">OCCUPATION:</span>
            <span className="font-black uppercase">{learner.mothersOccupation}</span>
          </div>
          <div className="p-0.25 border-t border-black">
            <span className="font-bold block text-[3pt] text-slate-500">EDUC. ATTAINMENT:</span>
            <span className="font-black uppercase">{learner.mothersEducation}</span>
          </div>

          <div className="p-0.25 border-t border-black">
            <span className="font-bold block text-[3pt] text-slate-500">NO. OF SIBLINGS:</span>
            <span className="font-black">{learner.numSiblings}</span>
          </div>
          <div className="p-0.25 border-t border-black">
            <span className="font-bold block text-[3pt] text-slate-500">BIRTH ORDER:</span>
            <span className="font-black uppercase">{learner.birthOrder}</span>
          </div>
          <div className="p-0.25 border-t border-black">
            <span className="font-bold block text-[3pt] text-slate-500">SECTION:</span>
            <span className="font-black uppercase">{learner.section}</span>
          </div>
          <div className="p-0.25 border-t border-black">
            <span className="font-bold block text-[3pt] text-slate-500">SY:</span>
            <span className="font-black uppercase">{learner.schoolYear}</span>
          </div>
          <div className="p-0.25 border-t border-black col-span-2">
            <span className="font-bold block text-[3pt] text-slate-500">ADVISER:</span>
            <span className="font-black uppercase">{user.fullName || learner.adviser || '---'}</span>
          </div>
          <div className="p-0.25 border-t border-black col-span-2">
            <span className="font-bold block text-[3pt] text-slate-500">DATE OF BEGINNING OF CLASSES:</span>
            <span className="font-black uppercase">{learner.dateOfBeginningOfClasses || '---'}</span>
          </div>
        </div>
      </div>

      {/* Computation of Age */}
      <div className="mb-0.5">
        <h4 className="bg-slate-100 text-[5.5pt] font-black uppercase px-2 py-0.5 border border-black mb-0.5 centered-header">COMPUTATION OF CHILD’S AGE</h4>
        <table className="w-full temp-table text-center">
          <thead>
            <tr>
              <th className="text-[5pt]">Assessment Period</th>
              <th className="text-[5pt]">Date Tested</th>
              <th className="text-[5pt]">Year</th>
              <th className="text-[5pt]">Month</th>
              <th className="text-[5pt]">Day</th>
            </tr>
          </thead>
          <tbody>
            {[selectedPeriod].map(p => {
              const ast = assessments.find((a: any) => a.learnerId === learner.id && a.period === p);
              const age = ast ? calculateAgeDetails(learner.birthday, ast.date) : { y: '', m: '', d: '' };
              return (
                <tr key={p}>
                  <td className="font-bold text-[5pt]">{p}</td>
                  <td className="text-[5pt]">{ast?.date || '---'}</td>
                  <td className="text-[5pt]">{age.y}</td>
                  <td className="text-[5pt]">{age.m}</td>
                  <td className="text-[5pt]">{age.d}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary of Results and Graph */}
      <div className="grid grid-cols-[1fr_1.4fr] gap-2 mb-0.5">
        <div>
          <h4 className="bg-slate-100 text-[5.5pt] font-black uppercase px-2 py-0.5 border border-black mb-0.5 centered-header">SUMMARY OF RESULTS ({selectedPeriod})</h4>
          <table className="w-full temp-table text-center table-fixed">
            <thead>
              <tr>
                <th className="text-left w-[45%] text-[4.5pt]">Domain</th>
                <th className="w-[15%] leading-tight text-[4pt]">RAW<br/>SCORE</th>
                <th className="w-[15%] leading-tight text-[4pt]">SCALED<br/>SCORE</th>
                <th className="w-[25%] text-[4.5pt]">INTERP.</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const totalScaled = DOMAINS.reduce((sum, d) => {
                  const raw = currentAssessment ? (currentAssessment.scores as any)[d.id] : 0;
                  const scaled = currentAssessment ? getScaledScore(d.id, raw, learner.birthday, currentAssessment.date) : 0;
                  return sum + scaled;
                }, 0);

                return (
                  <>
                    {DOMAINS.map(d => {
                      const raw = currentAssessment ? (currentAssessment.scores as any)[d.id] : 0;
                      const scaled = currentAssessment ? getScaledScore(d.id, raw, learner.birthday, currentAssessment.date) : 0;
                      return (
                        <tr key={d.id}>
                          <td className="text-left font-bold uppercase text-[4.5pt]">{d.label}</td>
                          <td className="text-[4.5pt]">{raw || '---'}</td>
                          <td className="text-[4.5pt]">{scaled || '---'}</td>
                          <td className="text-[3.5pt]">{getDomainInterpretation(scaled)}</td>
                        </tr>
                      );
                    })}
                    <tr className="bg-slate-50 font-black">
                      <td className="text-right uppercase text-[4.5pt]">SUM OF SCALED SCORE:</td>
                      <td></td>
                      <td className="text-[4.5pt]">{totalScaled || '---'}</td>
                      <td></td>
                    </tr>
                    <tr className="bg-slate-50 font-black">
                      <td className="text-right uppercase text-[4.5pt]">STANDARD SCORE:</td>
                      <td></td>
                      <td className="text-[4.5pt]">{currentAssessment ? getStandardScore(currentAssessment, learner) : '---'}</td>
                      <td className="text-[3.5pt]">{currentAssessment ? getInterpretation(getStandardScore(currentAssessment, learner)) : '---'}</td>
                    </tr>
                  </>
                );
              })()}
            </tbody>
          </table>
        </div>

        <div className="border border-black p-1 flex flex-col">
          <h4 className="text-[5pt] font-black uppercase mb-0.5 text-center">DEVELOPMENTAL PROFILE</h4>
          <div className="flex-1 flex items-end justify-around px-1 border-b border-slate-200 pb-0.5 min-h-[50px]">
            {graphData.map((d: any, i: number) => {
              const colors = [
                'bg-blue-600',
                'bg-emerald-600',
                'bg-amber-600',
                'bg-rose-600',
                'bg-violet-600',
                'bg-cyan-600',
                'bg-orange-600'
              ];
              return (
                <div key={i} className="flex flex-col items-center gap-0.5 w-full">
                  <div className="relative w-2 bg-slate-100 rounded-t-sm overflow-hidden" style={{ height: '35px' }}>
                    <div 
                      className={`absolute bottom-0 left-0 w-full ${colors[i % colors.length]} transition-all duration-500`} 
                      style={{ height: `${(d.scaled / 19) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-[2.5pt] font-black uppercase tracking-tighter mt-0.5 text-center leading-[1] h-5 flex items-start justify-center">
                    {d.name.includes('-') ? (
                      <>{d.name.split('-')[0]}-<br/>{d.name.split('-')[1]}</>
                    ) : d.name.includes(' ') ? (
                      <>{d.name.split(' ')[0]}<br/>{d.name.split(' ').slice(1).join(' ')}</>
                    ) : (
                      d.name
                    )}
                  </span>
                  <span className="text-[3pt] font-black text-blue-700 mt-0.5">{d.scaled}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Domains and Tasks */}
      <div className="flex-1 overflow-hidden">
        <h4 className="bg-slate-100 text-[5.5pt] font-black uppercase px-2 py-0.5 border border-black mb-0.5 centered-header">DETAILED ASSESSMENT ({selectedPeriod})</h4>
        <div className="grid grid-cols-3 gap-x-1 gap-y-0.5">
          {Object.entries(ECCD_TASKS).map(([domainId, tasks]) => {
            const domain = DOMAINS.find(d => d.id === domainId);
            return (
              <div key={domainId} className="border border-black flex flex-col overflow-hidden">
                <div className="bg-slate-50 p-0.5 border-b border-black font-black text-[4pt] uppercase flex justify-between leading-none">
                  <span className="truncate">{domain?.label}</span>
                  <span className="text-blue-600 shrink-0 ml-1">ISKOR: {currentAssessment ? (currentAssessment.scores as any)[domainId] : '0'}</span>
                </div>
                <div className="p-0.5 space-y-0 flex-1 overflow-hidden">
                  {tasks.map((task, idx) => (
                    <div key={idx} className="flex items-start gap-0.5 text-[3.5pt] leading-[1.1]">
                      <div className="w-1.5 h-1.5 border border-black flex items-center justify-center shrink-0 mt-0.5 font-bold text-[2.5pt]">
                        {currentAssessment ? (currentAssessment.checklist?.[domainId]?.[idx] ? '✓' : '--') : ''}
                      </div>
                      <span className="text-slate-700 line-clamp-1">{idx + 1}. {task}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Signatures */}
      <div className="mt-auto pt-1">
        <div className="grid grid-cols-3 gap-8 text-center">
          <div>
            <div className="border-b border-black font-black uppercase text-[7pt]">{user.fullName}</div>
            <div className="text-[5pt] uppercase font-bold text-slate-500">Teacher / Examiner</div>
          </div>
          <div>
            <div className="border-b border-black font-black uppercase text-[7pt]">{user.schoolHeadName || learner.schoolHeadName || '---'}</div>
            <div className="text-[5pt] uppercase font-bold text-slate-500">School Head</div>
          </div>
          <div>
            <div className="border-b border-black font-black uppercase text-[7pt] h-5"></div>
            <div className="text-[5pt] uppercase font-bold text-slate-500">Parent / Guardian Signature</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemporaryECCDCard;
