import React, { useState, useEffect } from 'react';
import { Search, Users, Circle, ChevronRight, Loader2, MessageCircle } from 'lucide-react';
import { getMessengerUsers } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useMessenger } from './MessengerContext';
import ChatWindow from './ChatWindow';

interface MessengerPopupProps {
    onClose: () => void;
}

const MessengerPopup: React.FC<MessengerPopupProps> = ({ onClose }) => {
    const { user } = useAuth();
    const { socket, openChat, unreadPerUser, setUnreadPerUser, clearUserUnread } = useMessenger();
    const [groupedUsers, setGroupedUsers] = useState<Record<string, any[]>>({});
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showOnlineOnly, setShowOnlineOnly] = useState(true);

    useEffect(() => {
        if (user) {
            getMessengerUsers().then(data => {
                setGroupedUsers(data || {});

                // Extract unread counts and update context
                const unreadMap: Record<number, number> = {};
                Object.values(data || {}).forEach((deptUsers: any) => {
                    deptUsers.forEach((u: any) => {
                        if (u.unread_count > 0) {
                            unreadMap[u.id] = u.unread_count;
                        }
                    });
                });
                setUnreadPerUser(unreadMap);
                setLoading(false);
            });
        }
    }, [user, setUnreadPerUser]);

    useEffect(() => {
        if (!socket) return;

        const handleUserStatusChange = (userId: number, isOnline: boolean) => {
            setGroupedUsers(prev => {
                const newState = { ...prev };
                let found = false;
                
                for (const dept in newState) {
                    newState[dept] = newState[dept].map(u => {
                        if (Number(u.id) === Number(userId)) {
                            found = true;
                            return { ...u, isOnline };
                        }
                        return u;
                    });
                    if (found) break;
                }
                
                return newState;
            });
        };

        socket.on('user_online', (userId) => handleUserStatusChange(userId, true));
        socket.on('user_offline', (userId) => handleUserStatusChange(userId, false));

        return () => {
            socket.off('user_online');
            socket.off('user_offline');
        };
    }, [socket]);

    const filteredGroups = Object.entries(groupedUsers).reduce((acc, [dept, users]) => {
        const filtered = (users as any[]).filter(u => {
            const nameStr = String(u.name || '').toLowerCase();
            const deptStr = String(u.department || '').toLowerCase();
            const searchStr = searchQuery.toLowerCase();
            
            const matchesSearch = nameStr.includes(searchStr) || deptStr.includes(searchStr);
            const matchesOnline = !showOnlineOnly || !!u.isOnline;
            
            return matchesSearch && matchesOnline;
        });
        if (filtered.length > 0) acc[dept] = filtered;
        return acc;
    }, {} as Record<string, any[]>);

    return (
        <>
            <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-[60] animate-in fade-in slide-in-from-top-2">
                {/* Header */}
                <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                        <MessageCircle size={16} className="text-blue-600" />
                        Messenger
                    </h3>
                </div>

                {/* Search & Filter */}
                <div className="p-3 space-y-2">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar contatos..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 bg-slate-100 border-none rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                    </div>
                    <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Apenas Online</span>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setShowOnlineOnly(prev => !prev);
                            }}
                            className={`w-8 h-4 rounded-full relative transition-all duration-300 ${showOnlineOnly ? 'bg-blue-600' : 'bg-slate-300'}`}
                        >
                            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-all duration-300 ${showOnlineOnly ? 'left-[18px]' : 'left-0.5'}`}></div>
                        </button>
                    </div>
                </div>

                {/* User List */}
                <div className="max-h-[400px] overflow-y-auto">
                    {loading ? (
                        <div className="p-8 text-center">
                            <Loader2 size={24} className="animate-spin text-slate-300 mx-auto" />
                            <p className="text-xs text-slate-500 mt-2 font-medium">Carregando contatos...</p>
                        </div>
                    ) : Object.keys(filteredGroups).length > 0 ? (
                        Object.entries(filteredGroups).map(([dept, users]) => (
                            <div key={dept} className="mb-2">
                                <div className="px-4 py-1.5 bg-slate-50/80 text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <Users size={10} />
                                    {dept}
                                </div>
                                <div className="divide-y divide-slate-50">
                                    {users.map((u) => (
                                        <div
                                            key={u.id}
                                            onClick={() => {
                                                clearUserUnread(u.id);
                                                openChat(u);
                                                onClose();
                                            }}
                                            className={`px-4 py-2.5 hover:bg-blue-50 cursor-pointer transition-all flex items-center justify-between group ${!u.isOnline ? 'opacity-60' : ''}`}
                                        >
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="relative shrink-0">
                                                    <img
                                                        src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random`}
                                                        alt={u.name}
                                                        className="w-8 h-8 rounded-full object-cover border border-slate-100"
                                                    />
                                                    {u.isOnline && (
                                                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></div>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-blue-700 transition-colors">{typeof u.name === 'string' ? u.name : JSON.stringify(u.name)}</p>
                                                    <p className="text-[10px] text-slate-400 truncate">{typeof u.position === 'string' ? u.position : JSON.stringify(u.position)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 pr-1">
                                                {unreadPerUser[u.id] > 0 && (
                                                    <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-sm">
                                                        {unreadPerUser[u.id]}
                                                    </span>
                                                )}
                                                <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-400 transform group-hover:translate-x-0.5 transition-all" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-8 text-center">
                            <p className="text-xs text-slate-500 font-medium italic">Nenhum contato encontrado.</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default MessengerPopup;
