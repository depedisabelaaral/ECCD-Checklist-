
import React, { useState, useEffect } from 'react';
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
  Expand
} from 'lucide-react';
import { User, UserRole } from '../types';

interface LayoutProps {
  user: User;
  onLogout: () => void;
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

const Layout: React.FC<LayoutProps> = ({ user, onLogout, children, activeTab, setActiveTab }) => {
  const [reportExpanded, setReportExpanded] = useState(activeTab.startsWith('report'));
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isWideView, setIsWideView] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Sync fullscreen state with browser events
  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const menuItems: MenuItem[] = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: <LayoutDashboard className="w-5 h-5" />,
      roles: [UserRole.ADMIN, UserRole.CONSOLIDATOR, UserRole.SCHOOL_USER] 
    },
    { 
      id: 'learners', 
      label: 'Learners', 
      icon: <Users className="w-5 h-5" />,
      roles: [UserRole.ADMIN, UserRole.SCHOOL_USER] 
    },
    { 
      id: 'approvals', 
      label: 'User Approvals', 
      icon: <UserCheck className="w-5 h-5" />,
      roles: [UserRole.ADMIN, UserRole.CONSOLIDATOR] 
    },
    { 
      id: 'reports', 
      label: 'Master List', 
      icon: <Database className="w-5 h-5" />,
      roles: [UserRole.ADMIN, UserRole.CONSOLIDATOR, UserRole.SCHOOL_USER] 
    },
    { 
      id: 'assessment', 
      label: 'Assessment', 
      icon: <ClipboardCheck className="w-5 h-5" />,
      roles: [UserRole.ADMIN, UserRole.SCHOOL_USER] 
    },
    { 
      id: 'report', 
      label: 'Report', 
      icon: <BarChart4 className="w-5 h-5" />,
      roles: [UserRole.ADMIN, UserRole.CONSOLIDATOR, UserRole.SCHOOL_USER],
      subItems: [
        { id: 'report-all', label: 'Consolidated Summary' },
        { id: 'report-first', label: 'First Assessment Summary' },
        { id: 'report-mid', label: 'Mid-Assessment Summary' },
        { id: 'report-third', label: 'Third Assessment Summary' },
      ]
    },
    { 
      id: 'admin', 
      label: 'District Data', 
      icon: <School className="w-5 h-5" />,
      roles: [UserRole.ADMIN, UserRole.CONSOLIDATOR] 
    },
  ];

  const filteredMenuItems = menuItems.filter(item => item.roles.includes(user.role));

  const handleTabClick = (item: MenuItem) => {
    if (sidebarCollapsed) {
      setSidebarCollapsed(false);
    }
    if (item.subItems) {
      setReportExpanded(!reportExpanded);
      if (!activeTab.startsWith(item.id)) {
        setActiveTab(item.subItems[0].id);
      }
    } else {
      setActiveTab(item.id);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 no-print transition-all duration-300">
      <aside className={`${sidebarCollapsed ? 'w-20' : 'w-64'} bg-slate-900 text-white flex flex-col shrink-0 transition-all duration-300 relative`}>
        <div className="p-6 flex items-center justify-between">
          {!sidebarCollapsed && (
            <h1 className="text-xl font-bold flex items-center gap-2 animate-in fade-in duration-300">
              <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-900/50">
                 <School className="w-5 h-5" />
              </div>
              <span>ECCD <span className="text-blue-400">Pro</span></span>
            </h1>
          )}
          {sidebarCollapsed && (
            <div className="mx-auto p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-900/50">
              <School className="w-5 h-5" />
            </div>
          )}
        </div>

        <nav className="flex-1 px-4 py-4 overflow-y-auto">
          <ul className="space-y-1">
            {filteredMenuItems.map((item) => {
              const isActive = activeTab === item.id || (item.subItems?.some(s => s.id === activeTab));
              const isExpanded = item.id === 'report' ? reportExpanded : false;

              return (
                <li key={item.id} className="relative group">
                  <button
                    onClick={() => handleTabClick(item)}
                    className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} p-3 rounded-xl transition-all duration-200 ${
                      isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-gray-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      {!sidebarCollapsed && <span className="font-semibold text-sm animate-in fade-in duration-300">{item.label}</span>}
                    </div>
                    {!sidebarCollapsed && item.subItems && (
                      isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  
                  {sidebarCollapsed && (
                    <div className="absolute left-full top-0 ml-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded-md opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity whitespace-nowrap">
                      {item.label}
                    </div>
                  )}

                  {item.subItems && isExpanded && !sidebarCollapsed && (
                    <ul className="mt-1 ml-4 space-y-1 border-l border-slate-700 pl-4 animate-in slide-in-from-top-2 duration-200">
                      {item.subItems.map((sub) => (
                        <li key={sub.id}>
                          <button
                            onClick={() => setActiveTab(sub.id)}
                            className={`w-full text-left p-2.5 rounded-lg text-xs font-bold transition-all ${
                              activeTab === sub.id ? 'text-blue-400 bg-blue-500/10' : 'text-gray-500 hover:text-gray-200'
                            }`}
                          >
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

        <div className="p-4 border-t border-slate-800">
          <div className={`flex items-center gap-3 mb-4 ${sidebarCollapsed ? 'justify-center' : 'px-2'}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shrink-0 ${
              user.role === UserRole.ADMIN ? 'bg-gradient-to-br from-red-500 to-rose-600' :
              user.role === UserRole.CONSOLIDATOR ? 'bg-gradient-to-br from-emerald-500 to-teal-600' :
              'bg-gradient-to-br from-blue-500 to-indigo-600'
            }`}>
              {user.username[0].toUpperCase()}
            </div>
            {!sidebarCollapsed && (
              <div className="overflow-hidden animate-in fade-in duration-300">
                <p className="text-sm font-bold truncate">{user.username}</p>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{user.role.replace('_', ' ')}</p>
              </div>
            )}
          </div>
          <button
            onClick={onLogout}
            className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} p-3 rounded-xl text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all font-bold text-sm`}
          >
            <LogOut className="w-4 h-4" />
            {!sidebarCollapsed && <span className="animate-in fade-in duration-300">Sign Out</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto flex flex-col">
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 h-16 flex items-center justify-between px-8 sticky top-0 z-40 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
              title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {sidebarCollapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
            </button>
            <div className="h-6 w-px bg-gray-200 mx-2"></div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 capitalize tracking-tight leading-tight">
                {activeTab.includes('-') 
                  ? activeTab.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
                  : activeTab.charAt(0).toUpperCase() + activeTab.slice(1).replace('-', ' ')}
              </h2>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none">
                {user.schoolName || 'District Monitoring System'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsWideView(!isWideView)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                isWideView ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100'
              }`}
              title={isWideView ? "Constrain Width" : "Full Width View"}
            >
              <Expand className="w-4 h-4" />
              <span className="hidden sm:inline">{isWideView ? "Fluid Width" : "Standard"}</span>
            </button>
            
            <button 
              onClick={toggleFullscreen}
              className="p-2.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            
            <div className="h-8 w-px bg-gray-200 mx-2"></div>
            
            <button className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className={`p-8 w-full ${isWideView ? 'max-w-none' : 'max-w-7xl mx-auto'} transition-all duration-500`}>
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
