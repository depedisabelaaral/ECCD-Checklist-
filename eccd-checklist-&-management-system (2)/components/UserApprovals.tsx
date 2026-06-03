import React, { useState, useEffect } from 'react';
import { User, UserRole, UserStatus } from '../types';
import { 
  Check, 
  X, 
  UserCheck, 
  ShieldAlert, 
  Building, 
  Landmark, 
  Trash2, 
  Mail, 
  MapPin, 
  Eye, 
  EyeOff,
  Lock,
  Key,
  Circle,
  Pencil,
  Save,
  ChevronDown,
  MessageCircle,
  CheckCircle2
} from 'lucide-react';

interface UserApprovalsProps {
  currentUser: User;
  users: User[];
  onUpdateUser: (userId: string, status: UserStatus) => void;
  onEditUser: (userId: string, updates: Partial<User>) => void;
  onDeleteUser: (userId: string) => void;
}

const UserApprovals: React.FC<UserApprovalsProps> = ({ currentUser, users, onUpdateUser, onEditUser, onDeleteUser }) => {
  const [revealedUsers, setRevealedUsers] = useState<Set<string>>(new Set());
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ username: '', password: '' });
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const isOnline = (lastActive?: number) => {
    if (!lastActive) return false;
    return now - lastActive < 5 * 60 * 1000;
  };

  const toggleReveal = (userId: string) => {
    setRevealedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const startEditing = (u: User) => {
    setEditingUserId(u.id);
    setEditForm({ username: u.username, password: u.password || '' });
    if (!revealedUsers.has(u.id)) {
      setRevealedUsers(prev => new Set(prev).add(u.id));
    }
  };

  const handleSaveEdit = () => {
    if (editingUserId) {
      onEditUser(editingUserId, { ...editForm, passwordRequest: undefined }); // Clear request when updated
      setEditingUserId(null);
    }
  };

  const handleResolveRequest = (userId: string) => {
    onEditUser(userId, { passwordRequest: undefined });
  };

  const relevantUsers = users.filter(u => {
    if (u.id === currentUser.id) return false;
    if (currentUser.role === UserRole.ADMIN) return true;
    if (currentUser.role === UserRole.COORDINATOR || currentUser.role === UserRole.CONSOLIDATOR) {
      return u.district === currentUser.district;
    }
    return false;
  }).sort((a, b) => {
    // Sort by pending status first, then by whether they have a password request
    if (a.status === UserStatus.PENDING && b.status !== UserStatus.PENDING) return -1;
    if (a.status !== UserStatus.PENDING && b.status === UserStatus.PENDING) return 1;
    if (a.passwordRequest && !b.passwordRequest) return -1;
    if (!a.passwordRequest && b.passwordRequest) return 1;
    return 0;
  });

  const pendingCount = relevantUsers.filter(u => u.status === UserStatus.PENDING).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-[32px] border border-gray-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-2xl">
            <UserCheck className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">District User Management</h2>
            <p className="text-xs text-gray-500 font-medium">Monitor activity and manage credentials for {currentUser.district || 'your district'}.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-6 py-2 bg-gray-50 rounded-xl border border-gray-100">
            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{pendingCount} Requests Pending</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">User Details & Credentials</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Alerts & Messages</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Role & Status</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Institution Info</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {relevantUsers.map((u) => {
                const online = isOnline(u.lastActive);
                const isRevealed = revealedUsers.has(u.id);
                const isEditing = editingUserId === u.id;
                const isApproved = u.status === UserStatus.APPROVED;
                const hasRequest = u.passwordRequest && !u.passwordRequest.resolved;

                return (
                  <tr key={u.id} className={`hover:bg-blue-50/20 transition-colors group ${hasRequest ? 'bg-rose-50/20' : ''}`}>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-400 text-sm shrink-0">
                            {u.fullName[0]?.toUpperCase() || 'U'}
                          </div>
                          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-4 border-white ${online ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`}></div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-black text-gray-900 truncate uppercase tracking-tight">{u.fullName}</p>
                          
                          <div className="flex flex-col gap-1.5 mt-2">
                            {/* USERNAME ROW */}
                            <div className="flex items-center gap-2 group/field">
                               <div className="w-4 h-4 flex items-center justify-center text-blue-400 shrink-0"><Mail className="w-3 h-3" /></div>
                               {isEditing ? (
                                  <input 
                                    className="bg-white border border-blue-200 rounded px-2 py-0.5 text-[10px] font-black uppercase text-blue-700 outline-none focus:ring-2 focus:ring-blue-100"
                                    value={editForm.username}
                                    onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                                  />
                               ) : (
                                  <p className="text-[10px] text-gray-400 font-bold tracking-tight">
                                    {isRevealed ? u.username : '••••••••'}
                                  </p>
                               )}
                               {!isEditing && isApproved && (
                                  <button onClick={() => toggleReveal(u.id)} className="p-1 opacity-0 group-hover/field:opacity-100 transition-opacity text-gray-400 hover:text-blue-500">
                                    {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                  </button>
                               )}
                            </div>
                            {u.email && (
                               <div className="flex items-center gap-2 px-1 mt-0.5">
                                 <div className="w-4 h-4 flex items-center justify-center text-slate-400 shrink-0"><Mail className="w-3 h-3" /></div>
                                 <p className="text-[10px] text-slate-500 font-medium lowercase tracking-tight">{u.email}</p>
                               </div>
                            )}

                            {/* PASSWORD ROW */}
                            <div className="flex items-center gap-2 group/field">
                               <div className="w-4 h-4 flex items-center justify-center text-amber-500 shrink-0"><Key className="w-3 h-3" /></div>
                               {isEditing ? (
                                  <input 
                                    className="bg-white border border-blue-200 rounded px-2 py-0.5 text-[10px] font-black text-blue-700 outline-none focus:ring-2 focus:ring-blue-100"
                                    value={editForm.password}
                                    onChange={(e) => setEditForm({...editForm, password: e.target.value})}
                                  />
                               ) : (
                                  <p className="text-[10px] text-gray-400 font-bold tracking-tight">
                                    {isRevealed ? u.password : '••••••••'}
                                  </p>
                               )}
                               {isApproved && (
                                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                                    {isEditing ? (
                                      <>
                                        <button onClick={handleSaveEdit} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded" title="Save Changes">
                                          <Save className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => setEditingUserId(null)} className="p-1 text-rose-600 hover:bg-rose-50 rounded" title="Cancel">
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </>
                                    ) : (
                                      <button onClick={() => startEditing(u)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Edit Credentials">
                                        <Pencil className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                               )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      {hasRequest ? (
                         <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 space-y-2 animate-pulse hover:animate-none transition-all">
                            <div className="flex items-center gap-2 text-[10px] font-black text-rose-600 uppercase tracking-widest">
                               <MessageCircle className="w-3 h-3" /> Recovery Request
                            </div>
                            <p className="text-[11px] text-rose-500 font-medium leading-tight">"{u.passwordRequest!.message}"</p>
                            <button 
                              onClick={() => handleResolveRequest(u.id)}
                              className="text-[9px] font-black text-rose-700 uppercase tracking-tighter hover:underline flex items-center gap-1"
                            >
                               <CheckCircle2 className="w-3 h-3" /> Dismiss
                            </button>
                         </div>
                      ) : (
                         <span className="text-[9px] font-bold text-gray-300 uppercase italic">No active requests</span>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1.5">
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border w-fit ${
                          u.role === UserRole.COORDINATOR ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          u.role === UserRole.CONSOLIDATOR ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                          'bg-blue-50 text-blue-600 border-blue-100'
                        }`}>
                          {u.role.replace('_', ' ')}
                        </span>
                        <span className={`text-[8px] font-black uppercase tracking-[0.1em] ${
                          u.status === UserStatus.APPROVED ? 'text-emerald-500' :
                          u.status === UserStatus.PENDING ? 'text-amber-500' :
                          'text-rose-500'
                        }`}>
                          {u.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs font-black text-gray-700 uppercase tracking-tight">
                          <Building className="w-3.5 h-3.5 text-gray-400" />
                          {u.schoolName}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400 uppercase font-bold tracking-widest">
                          <MapPin className="w-3 h-3" />
                          {u.district} • ID: {u.schoolId}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {u.status === UserStatus.PENDING ? (
                          <>
                            <button 
                              onClick={() => onUpdateUser(u.id, UserStatus.APPROVED)}
                              className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                              title="Approve Account"
                            >
                              <Check className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => onUpdateUser(u.id, UserStatus.REJECTED)}
                              className="p-2 bg-rose-500 text-white rounded-xl hover:bg-rose-600 shadow-lg shadow-rose-500/20 transition-all active:scale-95"
                              title="Reject Account"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </>
                        ) : (
                          <div className="p-2 text-gray-300">
                            <UserCheck className="w-5 h-5 opacity-40" />
                          </div>
                        )}
                        <div className="w-px h-6 bg-gray-100 mx-2"></div>
                        <button 
                          onClick={() => onDeleteUser(u.id)}
                          className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {relevantUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center gap-4 text-gray-300">
                      <ShieldAlert className="w-16 h-16 opacity-10" />
                      <div className="space-y-1">
                        <p className="text-sm font-black text-gray-400 uppercase tracking-widest">No Active Users Found</p>
                        <p className="text-xs font-medium">Verify district filters if you expect to see accounts here.</p>
                      </div>
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

export default UserApprovals;