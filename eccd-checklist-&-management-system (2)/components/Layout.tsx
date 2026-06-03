import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Database, 
  LogOut, 
  School,
  Settings,
  ChevronRight,
  ChevronDown,
  ClipboardCheck,
  BarChart4,
  UserCheck,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeft,
  Expand,
  MessageCircle,
  X,
  MoveDiagonal2
} from 'lucide-react';
import { User, UserRole, ChatMessage } from '../types.ts';
import ChatHub from './ChatHub.tsx';

export interface LayoutProps {
  user: User;
  users: User[];
  messages: ChatMessage[];
  onLogout: () => void;
  onSendMessage: (text: string, receiverId?: string) => void;
  onMarkAsRead: (messageIds: string[]) => void;
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  roles: UserRole[];
  subItems?: { id: string; label: string }[];
}

const Layout = ({ user, users, messages, onLogout, onSendMessage, onMarkAsRead, children, activeTab, setActiveTab }: LayoutProps) => {
  const [reportsExpanded, setReportsExpanded] = useState(
    activeTab.startsWith('report') || 
    activeTab === 'print-eccd' || 
    activeTab === 'print-temporary-eccd' || 
    activeTab === 'reports' ||
    activeTab === 'user-reports'
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // RESIZABLE CHAT STATE
  const [chatSize, setChatSize] = useState({ width: 280, height: 400 });
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartPos = useRef({ x: 0, y: 0, w: 0, h: 0 });

  const GLOBAL_SIDEBAR_KEY = 'branding_sidebar_logo';
  const [systemLogo, setSystemLogo] = useState(localStorage.getItem(GLOBAL_SIDEBAR_KEY) || '');

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    const handleGlobalLogoUpdate = () => setSystemLogo(localStorage.getItem(GLOBAL_SIDEBAR_KEY) || '');
    window.addEventListener('branding_sidebar_updated', handleGlobalLogoUpdate);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      window.removeEventListener('branding_sidebar_updated', handleGlobalLogoUpdate);
    };
  }, []);

  const unreadMessagesCount = useMemo(() => {
    if (user.role === UserRole.CONSOLIDATOR) {
      return messages.filter(m => !m.read && m.targetDistrict === user.district && !m.isFromConsolidator).length;
    }
    if (user.role === UserRole.SCHOOL_USER) {
      return messages.filter(m => !m.read && m.receiverId === user.id && m.isFromConsolidator).length;
    }
    if (user.role === UserRole.ADMIN) {
      return messages.filter(m => !m.read && m.receiverId === user.id).length;
    }
    return 0;
  }, [messages, user]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.error(err));
    } else {
      document.exitFullscreen();
    }
  };

  // RESIZE HANDLERS
  const onResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    resizeStartPos.current = {
      x: e.clientX,
      y: e.clientY,
      w: chatSize.width,
      h: chatSize.height
    };
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isResizing) {
        const deltaX = resizeStartPos.current.x - e.clientX;
        const deltaY = resizeStartPos.current.y - e.clientY;
        const newWidth = Math.min(Math.max(240, resizeStartPos.current.w + deltaX), 600);
        const newHeight = Math.min(Math.max(300, resizeStartPos.current.h + deltaY), 800);
        setChatSize({ width: newWidth, height: newHeight });
      }
    };
    const onMouseUp = () => {
      setIsResizing(false);
    };
    if (isResizing) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isResizing, chatSize]);

  const menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, roles: [UserRole.ADMIN, UserRole.CONSOLIDATOR, UserRole.COORDINATOR, UserRole.SCHOOL_USER] },
    { id: 'consolidation', label: 'Consolidation', icon: <Database className="w-5 h-5" />, roles: [UserRole.ADMIN, UserRole.CONSOLIDATOR, UserRole.COORDINATOR] },
    { id: 'learners', label: 'Learners', icon: <Users className="w-5 h-5" />, roles: [UserRole.SCHOOL_USER] },
    { id: 'approvals', label: 'User Approvals', icon: <UserCheck className="w-5 h-5" />, roles: [UserRole.ADMIN, UserRole.CONSOLIDATOR, UserRole.COORDINATOR] },
    { 
      id: 'reports', 
      label: 'Master List', 
      icon: <Database className="w-5 h-5" />, 
      roles: [UserRole.ADMIN, UserRole.CONSOLIDATOR, UserRole.COORDINATOR, UserRole.SCHOOL_USER],
      // For School User, we nest items under Master List but hide individual assessment summaries as requested
      subItems: user.role === UserRole.SCHOOL_USER ? [
        { id: 'reports', label: 'Master Database' },
        { id: 'report-all', label: 'Consolidated Summary' },
      ] : undefined
    },
    { id: 'assessment', label: 'Assessment', icon: <ClipboardCheck className="w-5 h-5" />, roles: [UserRole.SCHOOL_USER] },
    { 
      id: 'user-reports', 
      label: 'Reports', 
      icon: <BarChart4 className="w-5 h-5" />, 
      roles: [UserRole.SCHOOL_USER],
      subItems: [
        { id: 'progress-report-card', label: 'Progress Report Card' },
        { id: 'print-eccd', label: 'Print ECCD Card' },
        { id: 'print-temporary-eccd', label: 'Print Temporary ECCD Card' },
      ]
    },
    { 
      id: 'report', 
      label: 'Report', 
      icon: <BarChart4 className="w-5 h-5" />, 
      roles: [UserRole.CONSOLIDATOR, UserRole.COORDINATOR],
      subItems: [
        { id: 'report-all', label: 'Consolidated Summary' },
        { id: 'report-first', label: 'First Assessment Summary' },
        { id: 'report-mid', label: 'Mid-Assessment Summary' },
        { id: 'report-third', label: 'Third Assessment Summary' },
      ]
    },
    { id: 'admin', label: 'District Data', icon: <School className="w-5 h-5" />, roles: [UserRole.ADMIN, UserRole.CONSOLIDATOR, UserRole.COORDINATOR] },
  ];

  const filteredMenuItems = useMemo(() => {
    if (!user) return [];
    return menuItems.filter(item => item.roles.includes(user.role));
  }, [user]);

  const handleTabClick = (item: MenuItem) => {
    if (item.subItems) {
      setReportsExpanded(!reportsExpanded);
      if (!activeTab.startsWith(item.id) && activeTab !== 'print-eccd' && activeTab !== 'print-temporary-eccd' && !item.subItems.some(s => s.id === activeTab)) {
        setActiveTab(item.subItems[0].id);
      }
    } else {
      setActiveTab(item.id);
    }
  };

  const closeChat = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsChatOpen(false);
  };

  if (!user) return null;

  return (
    <div className="flex h-screen bg-gray-50 transition-all duration-300 overflow-hidden print:h-auto print:overflow-visible">
      <aside 
        onMouseEnter={() => setSidebarCollapsed(false)}
        onMouseLeave={() => setSidebarCollapsed(true)}
        className={`${sidebarCollapsed ? 'w-20' : 'w-72'} bg-slate-900 text-white flex flex-col shrink-0 transition-all duration-300 relative z-50 shadow-2xl no-print`}
      >
        <div className="p-6 flex items-center justify-between">
          {!sidebarCollapsed && (
            <h1 className="text-sm font-black flex items-center gap-3 animate-in fade-in duration-300">
              <div className="w-10 h-10 shrink-0 rounded-xl overflow-hidden border-2 border-white/10 bg-white shadow-xl">
                 <img src={systemLogo || "eccd.jpg"} className="w-full h-full object-cover" alt="System Logo" onError={(e) => e.currentTarget.src = "eccd.jpg"} />
              </div>
              <div className="leading-tight flex flex-col">
                <span className="text-blue-400 uppercase tracking-tighter text-[10px]">Portal System</span>
                <span className="uppercase tracking-tight text-white font-black text-xs">Early Childhood Care and Development</span>
              </div>
            </h1>
          )}
          {sidebarCollapsed && (
            <div className="mx-auto w-10 h-10 rounded-xl overflow-hidden border-2 border-white/10 bg-white shadow-xl">
               <img src={systemLogo || "eccd.jpg"} className="w-full h-full object-cover" alt="Logo" onError={(e) => e.currentTarget.src = "eccd.jpg"} />
            </div>
          )}
        </div>

        <nav className="flex-1 px-4 py-4 overflow-y-auto scrollbar-hide">
          <ul className="space-y-1">
            {filteredMenuItems.map((item) => {
              const isActive = activeTab === item.id || (item.subItems?.some(s => s.id === activeTab));
              const isExpanded = (item.id === 'reports' || item.id === 'report' || item.id === 'user-reports') ? reportsExpanded : false;

              return (
                <li key={item.id} className="relative group">
                  <button
                    onClick={() => handleTabClick(item)}
                    className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} p-3.5 rounded-2xl transition-all duration-300 ${
                      isActive ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/40 translate-x-1' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'} transition-colors`}>
                        {React.cloneElement(item.icon as React.ReactElement<any>, { className: "w-5 h-5" })}
                      </div>
                      {!sidebarCollapsed && <span className="font-bold text-[13px] tracking-tight animate-in fade-in duration-300">{item.label}</span>}
                    </div>
                    {!sidebarCollapsed && item.subItems && (
                      <div className={`${isExpanded ? 'rotate-180' : ''} transition-transform duration-300`}>
                        <ChevronDown className="w-3.5 h-3.5 opacity-40" />
                      </div>
                    )}
                  </button>

                  {item.subItems && isExpanded && !sidebarCollapsed && (
                    <ul className="mt-2 ml-4 space-y-1 border-l-2 border-slate-800 pl-4 animate-in slide-in-from-top-4 duration-300">
                      {item.subItems.map((sub) => (
                        <li key={sub.id}>
                          <button onClick={() => setActiveTab(sub.id)} className={`w-full text-left py-2.5 px-4 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === sub.id ? 'text-blue-400 bg-blue-50/10' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}>
                            {sub.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-slate-800/50 bg-slate-900/50 backdrop-blur-xl">
          <div className={`flex items-center gap-4 mb-4 ${sidebarCollapsed ? 'justify-center' : 'px-2'}`}>
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-white shadow-2xl shrink-0 transition-transform hover:scale-105 ${
              user.role === UserRole.ADMIN ? 'bg-gradient-to-br from-rose-500 to-red-700' :
              user.role === UserRole.COORDINATOR ? 'bg-gradient-to-br from-emerald-400 to-teal-600' :
              user.role === UserRole.CONSOLIDATOR ? 'bg-gradient-to-br from-indigo-500 to-indigo-800' :
              'bg-gradient-to-br from-blue-500 to-indigo-700'
            }`}>
              {user.username[0]?.toUpperCase() || 'U'}
            </div>
            {!sidebarCollapsed && (
              <div className="overflow-hidden animate-in fade-in duration-500">
                <p className="text-sm font-black text-white truncate tracking-tight">{user.fullName}</p>
                <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.1em]">{user.role.replace('_', ' ')}</p>
              </div>
            )}
          </div>
          <button onClick={onLogout} className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-4'} p-3.5 rounded-2xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all font-black text-xs uppercase tracking-widest group`}>
            <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            {!sidebarCollapsed && <span className="animate-in fade-in duration-500">Sign Out</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto flex flex-col scroll-smooth relative print:overflow-visible">
        <header className="bg-white/70 backdrop-blur-xl border-b border-slate-200/60 h-20 flex items-center justify-between px-10 sticky top-0 z-40 shrink-0 shadow-sm no-print">
          <div className="flex items-center gap-6">
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all border border-transparent hover:border-blue-100">
              {sidebarCollapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
            </button>
            <div className="h-8 w-px bg-slate-200"></div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tighter capitalize">
                {activeTab.replace('-', ' ')}
              </h2>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.15em] leading-none mt-1">{user.schoolName || 'District Monitoring Hub'}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={toggleFullscreen} className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all border border-transparent hover:border-blue-100">
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <div className="h-8 w-px bg-slate-200"></div>
            <button className="relative p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all border border-transparent hover:border-blue-100">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className={`p-10 w-full max-w-[1400px] mx-auto transition-all duration-700 print:p-0 print:m-0 print:max-w-none`}>
          {children}
        </div>

        {/* FIXED CHAT TRIGGER & ANCHORED CHAT HUB */}
        {(user.role === UserRole.ADMIN || user.role === UserRole.CONSOLIDATOR || user.role === UserRole.SCHOOL_USER) && (
          <div className="fixed bottom-8 right-8 z-[60] no-print">
             {isChatOpen ? (
                <div 
                  className="bg-white rounded-[20px] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.25)] border border-slate-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 group/chat"
                  style={{ 
                    width: `${chatSize.width}px`, 
                    height: `${chatSize.height}px`,
                    position: 'absolute',
                    bottom: '0',
                    right: '0',
                    transform: 'translate(5px, 5px)',
                    transformOrigin: 'bottom right'
                  }}
                >
                   {/* RESIZE HANDLE - TOP LEFT */}
                   <div 
                     onMouseDown={onResizeStart}
                     className="absolute top-0 left-0 w-6 h-6 z-[70] cursor-nwse-resize flex items-center justify-center group/resize opacity-0 group-hover/chat:opacity-100 transition-opacity"
                     title="Resize Chat"
                   >
                     <MoveDiagonal2 className="w-3 h-3 text-slate-300 group-hover/resize:text-blue-500 rotate-90" />
                   </div>

                   <ChatHub 
                      user={user} 
                      users={users} 
                      messages={messages} 
                      onSendMessage={onSendMessage} 
                      onMarkAsRead={onMarkAsRead}
                      onClose={closeChat} 
                      onMinimize={closeChat}
                   />
                </div>
             ) : (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsChatOpen(true);
                  }}
                  className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-2xl transition-all duration-300 relative group select-none cursor-pointer hover:bg-blue-600 hover:rotate-3 active:scale-95"
                >
                  <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  {unreadMessagesCount > 0 && (
                    <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-gray-50 animate-bounce">
                      {unreadMessagesCount}
                    </div>
                  )}
                </button>
             )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Layout;