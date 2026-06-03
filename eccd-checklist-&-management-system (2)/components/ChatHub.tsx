import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { User, UserRole, ChatMessage, UserStatus } from '../types';
import { 
  Send, 
  X, 
  Minus,
  MessageCircle, 
  ChevronLeft,
  HelpCircle,
  ShieldCheck,
  GripHorizontal,
  Users as UsersIcon,
  Search,
  ChevronRight,
  Landmark,
  Video,
  Mic,
  MicOff,
  VideoOff,
  PhoneOff,
  PhoneMissed,
  Phone,
  User as UserIcon
} from 'lucide-react';

interface ChatHubProps {
  user: User;
  users: User[];
  messages: ChatMessage[];
  onSendMessage: (text: string, receiverId?: string) => void;
  onMarkAsRead: (messageIds: string[]) => void;
  onClose: (e: React.MouseEvent) => void;
  onMinimize: (e: React.MouseEvent) => void;
  onHeaderMouseDown?: (e: React.MouseEvent) => void;
}

type ChatTab = 'chats' | 'online';
type CallStatus = 'idle' | 'calling' | 'active';
type CallType = 'audio' | 'video' | null;

const ChatHub: React.FC<ChatHubProps> = ({ 
  user, 
  users, 
  messages, 
  onSendMessage, 
  onMarkAsRead, 
  onClose, 
  onMinimize,
  onHeaderMouseDown 
}) => {
  const [activeTab, setActiveTab] = useState<ChatTab>('chats');
  const [activeChatId, setActiveChatId] = useState<string | 'group'>('group'); 
  const [inputText, setInputText] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [callType, setCallType] = useState<CallType>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const selfVideoRef = useRef<HTMLVideoElement>(null);
  // Fix: Changed NodeJS.Timeout to ReturnType<typeof setTimeout> to resolve type error in browser environment
  const callTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [now, setNow] = useState(() => Date.now());
  
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const isAdmin = user.role === UserRole.ADMIN;
  const isConsolidator = user.role === UserRole.CONSOLIDATOR;
  const userDistrict = user.district || 'Global';

  const isOnline = useCallback((lastActive?: number) => {
    if (!lastActive) return false;
    return now - lastActive < 5 * 60 * 1000;
  }, [now]);

  const currentMessages = useMemo(() => {
    return messages.filter(m => {
      if (activeChatId === 'group') {
        return m.targetDistrict === userDistrict && !m.receiverId;
      } else {
        return (m.senderId === user.id && m.receiverId === activeChatId) ||
               (m.senderId === activeChatId && m.receiverId === user.id);
      }
    });
  }, [messages, activeChatId, user.id, userDistrict]);

  const onlineDirectory = useMemo(() => {
    let filtered = users.filter(u => u.id !== user.id && u.status === UserStatus.APPROVED);
    
    if (userSearch) {
      filtered = filtered.filter(u => u.fullName.toLowerCase().includes(userSearch.toLowerCase()));
    }

    if (isAdmin || isConsolidator) {
      const grouped: any = {};
      filtered.forEach(u => {
        const ld = u.legislativeDistrict || 'Regional/Other';
        const dist = u.district || 'Unassigned';
        if (!grouped[ld]) grouped[ld] = {};
        if (!grouped[ld][dist]) grouped[ld][dist] = [];
        grouped[ld][dist].push(u);
      });
      return grouped;
    } else {
      return filtered.filter(u => u.district === user.district);
    }
  }, [users, user.id, user.district, isAdmin, isConsolidator, userSearch]);

  const conversationList = useMemo(() => {
    const list: any[] = [];
    const groupMsgs = messages.filter(m => m.targetDistrict === userDistrict && !m.receiverId);
    const lastGrp = groupMsgs[groupMsgs.length - 1];
    list.push({
      id: 'group',
      name: `${userDistrict} Hub`,
      sub: 'District Communication',
      lastText: lastGrp?.text || 'Start a conversation',
      lastTime: lastGrp?.timestamp || 0,
      unread: groupMsgs.filter(m => !m.read && m.senderId !== user.id).length,
      isGroup: true
    });

    const privateRecipients = new Set<string>();
    messages.forEach(m => {
      if (m.receiverId === user.id) privateRecipients.add(m.senderId);
      if (m.senderId === user.id && m.receiverId) privateRecipients.add(m.receiverId);
    });

    privateRecipients.forEach(rid => {
      const u = users.find(usr => usr.id === rid);
      if (!u) return;
      const chat = messages.filter(m => (m.senderId === user.id && m.receiverId === rid) || (m.senderId === rid && m.receiverId === user.id));
      const last = chat[chat.length - 1];
      list.push({
        id: rid,
        name: u.fullName,
        sub: u.schoolName || u.designation,
        lastText: last?.text || '',
        lastTime: last?.timestamp || 0,
        unread: chat.filter(m => !m.read && m.senderId === rid).length,
        isOnline: isOnline(u.lastActive)
      });
    });

    return list.sort((a, b) => b.lastTime - a.lastTime);
  }, [messages, user, users, userDistrict, isOnline]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    const unreadIds = currentMessages.filter(m => !m.read && m.senderId !== user.id).map(m => m.id);
    if (unreadIds.length > 0) onMarkAsRead(unreadIds);
  }, [currentMessages, user.id, onMarkAsRead]);

  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (callTimerRef.current) clearTimeout(callTimerRef.current);
    };
  }, [localStream]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText, activeChatId === 'group' ? undefined : activeChatId);
    setInputText('');
  };

  const startCall = async (type: 'audio' | 'video') => {
    setCallStatus('calling');
    setCallType(type);
    setIsVideoOff(type === 'audio');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: type === 'video', 
        audio: true 
      });
      setLocalStream(stream);
      
      if (type === 'video' && selfVideoRef.current) {
        selfVideoRef.current.srcObject = stream;
      }
      
      callTimerRef.current = setTimeout(() => {
        setCallStatus('active');
        if (type === 'video' && videoRef.current) {
          videoRef.current.srcObject = stream; 
        }
      }, 5000); 
    } catch (err) {
      console.error("Error accessing media devices:", err);
      setCallStatus('idle');
      setCallType(null);
      alert("Unable to access media hardware. Please check permissions.");
    }
  };

  const endCall = () => {
    if (callStatus === 'calling' && activeChatId !== 'group') {
      const typeLabel = callType === 'video' ? 'video call' : 'audio call';
      onSendMessage(`🔴 Missed ${typeLabel}`, activeChatId);
    }

    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    if (callTimerRef.current) {
      clearTimeout(callTimerRef.current);
      callTimerRef.current = null;
    }

    setCallStatus('idle');
    setCallType(null);
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(t => t.enabled = !t.enabled);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream && callType === 'video') {
      localStream.getVideoTracks().forEach(t => t.enabled = !t.enabled);
      setIsVideoOff(!isVideoOff);
    }
  };

  const currentRecipient = activeChatId === 'group' ? null : users.find(u => u.id === activeChatId);

  return (
    <div className="flex flex-col h-full bg-white shadow-2xl border border-slate-200 rounded-[20px] overflow-hidden relative">
      {/* CALL OVERLAY */}
      {callStatus !== 'idle' && (
        <div className="absolute inset-0 z-[80] bg-slate-900 flex flex-col animate-in fade-in duration-300">
          <div className="flex-1 relative overflow-hidden flex items-center justify-center">
            {callStatus === 'calling' ? (
              <div className="flex flex-col items-center justify-center text-white space-y-4">
                <div className="w-20 h-20 rounded-full bg-blue-600/20 flex items-center justify-center animate-pulse">
                   <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center">
                     {callType === 'video' ? <Video className="w-8 h-8" /> : <Phone className="w-8 h-8" />}
                   </div>
                </div>
                <div className="text-center">
                  <p className="text-xs font-black uppercase tracking-[0.2em]">Calling</p>
                  <p className="text-[10px] text-blue-400 font-bold uppercase truncate max-w-[150px]">{currentRecipient?.fullName}</p>
                </div>
              </div>
            ) : (
              <>
                {callType === 'video' ? (
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className={`w-full h-full object-cover transition-opacity duration-700 ${isVideoOff ? 'opacity-20 grayscale' : 'opacity-100'}`} 
                  />
                ) : (
                  <div className="flex flex-col items-center space-y-4">
                    <div className="w-24 h-24 rounded-full bg-slate-800 border-4 border-slate-700 flex items-center justify-center relative">
                      <UserIcon className="w-10 h-10 text-slate-500" />
                      <div className="absolute inset-0 rounded-full border-2 border-blue-500/50 animate-ping" />
                    </div>
                    <p className="text-white font-black text-sm uppercase tracking-widest">{currentRecipient?.fullName}</p>
                  </div>
                )}

                {callType === 'video' && (
                  <div className="absolute bottom-4 right-4 w-24 h-32 rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl bg-black">
                    <video ref={selfVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  </div>
                )}
                
                <div className="absolute top-4 left-4 p-2 bg-black/40 backdrop-blur-md rounded-lg border border-white/10">
                   <p className="text-[8px] font-black text-white uppercase tracking-widest">{currentRecipient?.fullName}</p>
                   <p className="text-[6px] text-emerald-400 font-bold uppercase">00:12 Live</p>
                </div>
              </>
            )}
          </div>
          
          <div className="p-4 bg-gradient-to-t from-slate-950 to-transparent flex items-center justify-center gap-4 shrink-0">
             <button 
               onClick={toggleMute}
               className={`p-3 rounded-full transition-all ${isMuted ? 'bg-rose-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
             >
               {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
             </button>
             <button 
               onClick={endCall}
               className="p-4 rounded-full bg-rose-500 text-white hover:bg-rose-600 shadow-xl shadow-rose-500/20 active:scale-90 transition-all"
             >
               <PhoneOff className="w-5 h-5" />
             </button>
             {callType === 'video' && (
               <button 
                 onClick={toggleVideo}
                 className={`p-3 rounded-full transition-all ${isVideoOff ? 'bg-rose-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
               >
                 {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
               </button>
             )}
          </div>
        </div>
      )}

      {/* HEADER */}
      <div 
        onMouseDown={onHeaderMouseDown}
        className="bg-slate-900 text-white p-2.5 shrink-0 flex items-center justify-between cursor-grab active:cursor-grabbing select-none"
      >
        <div className="flex items-center gap-2">
          {activeChatId !== 'group' || activeTab !== 'chats' ? (
            <button 
              onMouseDown={(e) => e.stopPropagation()} 
              onClick={() => { setActiveChatId('group'); setActiveTab('chats'); }} 
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="p-1 bg-blue-600 rounded">
              <MessageCircle className="w-3 h-3" />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-[9px] font-black uppercase tracking-tight truncate max-w-[80px]">
              {activeChatId === 'group' ? (activeTab === 'online' ? 'User Directory' : `${userDistrict} Hub`) : currentRecipient?.fullName}
            </h3>
            <p className="text-[6.5px] text-blue-100/40 font-black uppercase tracking-widest leading-none truncate max-w-[80px]">
              {activeChatId === 'group' ? 'District Hub' : (currentRecipient?.schoolName || currentRecipient?.designation)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-0.5">
          {activeChatId !== 'group' && (
            <div className="flex items-center gap-0.5 mr-1">
              <button 
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => startCall('audio')}
                className="p-1.5 hover:bg-white/10 rounded transition-colors text-blue-400"
                title="Audio Call"
              >
                <Phone className="w-3.5 h-3.5" />
              </button>
              <button 
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => startCall('video')}
                className="p-1.5 hover:bg-white/10 rounded transition-colors text-blue-400"
                title="Video Call"
              >
                <Video className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <GripHorizontal className="w-3 h-3 text-white/20 mr-1" />
          <button onMouseDown={(e) => e.stopPropagation()} onClick={onMinimize} className="p-1.5 hover:bg-white/10 rounded transition-colors text-slate-300" title="Minimize"><Minus className="w-3.5 h-3.5" /></button>
          <button onMouseDown={(e) => e.stopPropagation()} onClick={onClose} className="p-1.5 hover:bg-white/10 rounded transition-colors text-slate-400 hover:text-red-400" title="Close"><X className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {/* BODY */}
      <div className="flex-1 overflow-hidden flex flex-col bg-slate-50/50">
        {activeTab === 'chats' && activeChatId === 'group' ? (
          <div className="flex-1 overflow-y-auto p-1 custom-scrollbar">
            <div className="space-y-0.5">
              {conversationList.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => setActiveChatId(conv.id)}
                  className={`w-full flex items-center gap-2 p-1.5 rounded-lg border transition-all group ${activeChatId === conv.id ? 'bg-blue-600 border-blue-700' : 'hover:bg-white border-transparent hover:border-slate-100'}`}
                >
                  <div className="relative shrink-0">
                    <div className={`w-7 h-7 rounded flex items-center justify-center font-black text-[9px] ${activeChatId === conv.id ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'}`}>
                      {conv.isGroup ? <UsersIcon className="w-3.5 h-3.5" /> : conv.name[0]}
                    </div>
                    {conv.isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border-2 border-white" />
                    )}
                    {conv.unread > 0 && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 text-white text-[6px] font-black rounded-full flex items-center justify-center border-2 border-white">
                        {conv.unread}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-[8px] font-black uppercase truncate ${activeChatId === conv.id ? 'text-white' : 'text-slate-800'}`}>{conv.name}</p>
                      <p className={`text-[5.5px] font-bold ${activeChatId === conv.id ? 'text-white/60' : 'text-slate-400'}`}>{conv.lastTime ? new Date(conv.lastTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</p>
                    </div>
                    <p className={`text-[7.5px] truncate leading-tight ${activeChatId === conv.id ? 'text-white/80' : (conv.unread > 0 ? 'text-slate-800 font-bold' : 'text-slate-400 font-medium')}`}>
                      {conv.lastText}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : activeTab === 'online' ? (
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="p-1.5 border-b border-slate-100">
               <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search..." 
                    className="w-full pl-6 pr-2 py-1 bg-white border border-slate-200 rounded text-[8px] font-bold outline-none focus:ring-1 focus:ring-blue-500/10"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
               </div>
            </div>
            <div className="flex-1 overflow-y-auto p-1.5 custom-scrollbar space-y-2">
               {isAdmin || isConsolidator ? (
                 Object.entries(onlineDirectory).map(([ld, districts]: any) => (
                   <div key={ld} className="space-y-1">
                     <div className="flex items-center gap-1 px-1 py-0.5 border-b border-slate-100">
                       <Landmark className="w-2.5 h-2.5 text-slate-400" />
                       <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">{ld}</span>
                     </div>
                     {Object.entries(districts).map(([dist, dUsers]: any) => (
                       <div key={dist} className="pl-1 space-y-0.5">
                         <div className="flex items-center gap-1 px-1">
                            <span className="text-[6.5px] font-black text-blue-600 uppercase">{dist}</span>
                         </div>
                         {dUsers.map((u: User) => (
                            <button
                              key={u.id}
                              onClick={() => { setActiveChatId(u.id); setActiveTab('chats'); }}
                              className="w-full flex items-center gap-1.5 p-1 hover:bg-white rounded transition-all"
                            >
                               <div className="relative">
                                  <div className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center text-[7px] font-black text-slate-500">{u.fullName[0]}</div>
                                  <div className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-white ${isOnline(u.lastActive) ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                               </div>
                               <div className="text-left min-w-0">
                                  <p className="text-[8px] font-black text-slate-800 uppercase leading-none truncate">{u.fullName}</p>
                                  <p className="text-[6px] text-slate-400 font-bold uppercase truncate max-w-[110px]">{u.schoolName || u.designation}</p>
                               </div>
                            </button>
                         ))}
                       </div>
                     ))}
                   </div>
                 ))
               ) : (
                 Array.isArray(onlineDirectory) && onlineDirectory.map((u: User) => (
                   <button
                    key={u.id}
                    onClick={() => { setActiveChatId(u.id); setActiveTab('chats'); }}
                    className="w-full flex items-center gap-1.5 p-1.5 hover:bg-white rounded transition-all border border-transparent"
                   >
                      <div className="relative">
                        <div className="w-7 h-7 rounded bg-blue-50 flex items-center justify-center text-[9px] font-black text-blue-600">{u.fullName[0]}</div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-white ${isOnline(u.lastActive) ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      </div>
                      <div className="text-left min-w-0">
                        <p className="text-[8px] font-black text-slate-800 uppercase truncate">{u.fullName}</p>
                        <p className="text-[6px] text-slate-400 font-black uppercase tracking-tight truncate max-w-[130px]">{u.schoolName || u.designation}</p>
                      </div>
                      <ChevronRight className="w-2.5 h-2.5 text-slate-300 ml-auto shrink-0" />
                   </button>
                 ))
               )}
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2 custom-scrollbar">
              {currentMessages.length === 0 && (
                <div className="py-4 text-center space-y-1.5 max-w-[120px] mx-auto">
                   <div className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-100">
                      <HelpCircle className="w-4 h-4 text-blue-300 mx-auto" />
                   </div>
                   <p className="text-[7px] font-bold text-slate-400 leading-relaxed uppercase tracking-wider">
                     {activeChatId === 'group' ? `Connect with your peers.` : `Direct message with ${currentRecipient?.fullName}.`}
                   </p>
                </div>
              )}
              {currentMessages.map((m) => {
                const isMine = m.senderId === user.id;
                const isMissedCall = m.text.includes("Missed");
                
                return (
                  <div key={m.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    {!isMine && activeChatId === 'group' && (
                       <span className="text-[5.5px] font-black text-blue-600 uppercase mb-0.5 ml-1">{m.senderName}</span>
                    )}
                    <div className={`max-w-[95%] px-2 py-1 rounded-lg text-[9px] font-medium leading-tight shadow-sm flex items-center gap-1.5 ${
                      isMissedCall 
                        ? 'bg-rose-50 border border-rose-100 text-rose-600'
                        : isMine ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-slate-100 text-slate-700 rounded-bl-none'
                    }`}>
                      {isMissedCall && <PhoneMissed className="w-3 h-3" />}
                      {m.text}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5 px-0.5">
                      <span className="text-[5.5px] font-black text-slate-300 uppercase">
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isMine && m.read && (
                        <ShieldCheck className="w-1.5 h-1.5 text-emerald-400" />
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="p-1.5 bg-white border-t border-slate-100 shrink-0">
              <div className="relative flex items-center gap-1">
                <input
                  type="text"
                  placeholder="..."
                  className="flex-1 bg-slate-50 border border-slate-100 rounded px-2 py-1 text-[9px] font-bold focus:ring-1 focus:ring-blue-500/20 outline-none"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700 active:scale-95 disabled:opacity-50"
                >
                  <Send className="w-3 h-3" />
                </button>
              </div>
            </form>
          </>
        )}
      </div>

      <div className="bg-white border-t border-slate-100 p-1 flex items-center gap-0.5 shrink-0">
        <button 
          onClick={() => setActiveTab('chats')}
          className={`flex-1 flex items-center justify-center gap-1 py-1 rounded transition-all ${activeTab === 'chats' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-50'}`}
        >
          <MessageCircle className="w-3 h-3" />
          <span className="text-[7px] font-black uppercase tracking-tight">Chats</span>
        </button>
        <button 
          onClick={() => setActiveTab('online')}
          className={`flex-1 flex items-center justify-center gap-1 py-1 rounded transition-all ${activeTab === 'online' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-50'}`}
        >
          <UsersIcon className="w-3 h-3" />
          <span className="text-[7px] font-black uppercase tracking-tight">People</span>
        </button>
      </div>
    </div>
  );
};

export default ChatHub;