import React from 'react';
import {
  Bell,
  Search,
  LogOut,
  User as UserIcon,
  Menu,
  X,
  HelpCircle,
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead, getSidebarItems, globalSearch } from '../services/api';
import { User, UserRole } from '../types';
import {
  Check,
  CheckCheck,
  Inbox,
  Clock,
  LayoutDashboard,
  MessageSquare,
  Calendar,
  FolderOpen,
  Briefcase,
  Headphones,
  Database,
  Bot,
  Settings,
  Users,
  Shield,
  Monitor,
  FileText,
  Globe,
  BarChart3,
  Layout as LayoutIcon,
  Plus
} from 'lucide-react';
import SearchOverlay from './SearchOverlay';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  link: string;
  is_read: boolean;
  created_at: string;
}

interface LayoutProps {
  user: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  setTargetUserId: (id: string | null) => void;
  onLogout: () => void;
  setSearchContext: (context: { type: string; id: string | number } | null) => void;
  onOpenTicket: () => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ user, activeTab, setActiveTab, setTargetUserId, onLogout, setSearchContext, onOpenTicket, children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState({ users: [], events: [], documents: [] });
  const [isSearching, setIsSearching] = React.useState(false);
  const [showSearchOverlay, setShowSearchOverlay] = React.useState(false);
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [sidebarItems, setSidebarItems] = React.useState<any[]>([]);
  const [sidebarLoading, setSidebarLoading] = React.useState(true);
  const searchRef = React.useRef<HTMLDivElement>(null);
  const notificationRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchOverlay(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  React.useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowSearchOverlay(false);
        setShowNotifications(false);
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, []);

  React.useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults({ users: [], events: [], documents: [] });
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await globalSearch(searchQuery, user.id, user.role);
        setSearchResults(results);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, user.id, user.role]);

  const fetchNotifications = async () => {
    try {
      const data = await getNotifications(user.id);
      setNotifications(data);
      setUnreadCount(data.filter((n: Notification) => !n.is_read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchSidebar = async () => {
    try {
      setSidebarLoading(true);
      const items = await getSidebarItems();
      setSidebarItems(items);
    } catch (error) {
      console.error('Error fetching sidebar items:', error);
    } finally {
      setSidebarLoading(false);
    }
  };

  React.useEffect(() => {
    fetchNotifications();
    fetchSidebar();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user.id]);

  const ICON_MAP: Record<string, any> = {
    'LayoutDashboard': LayoutDashboard,
    'MessageSquare': MessageSquare,
    'Calendar': Calendar,
    'FolderOpen': FolderOpen,
    'Briefcase': Briefcase,
    'Headphones': Headphones,
    'Database': Database,
    'Bot': Bot,
    'Settings': Settings,
    'Users': Users,
    'Shield': Shield,
    'Monitor': Monitor,
    'FileText': FileText,
    'Globe': Globe,
    'BarChart3': BarChart3,
    'Layers': LayoutIcon,
    'Plus': Plus,
    'Search': Search
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.is_read) {
      await markNotificationAsRead(notif.id);
      fetchNotifications();
    }
    setShowNotifications(false);
    if (notif.link) {
      setActiveTab(notif.link);
      setTargetUserId(null);
    }
  };

  const handleReadAll = async () => {
    try {
      await markAllNotificationsAsRead(user.id);
      fetchNotifications();
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInMin = Math.floor((now.getTime() - date.getTime()) / 60000);

    if (diffInMin < 1) return 'Agora mesmo';
    if (diffInMin < 60) return `${diffInMin}m atrás`;
    const diffInHours = Math.floor(diffInMin / 60);
    if (diffInHours < 24) return `${diffInHours}h atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  const handleSelectSearchResult = (item: any) => {
    setShowSearchOverlay(false);
    setSearchQuery('');

    switch (item.type) {
      case 'user':
        setTargetUserId(item.id.toString());
        setActiveTab('profile');
        break;
      case 'event':
        setSearchContext({ type: 'event', id: item.id });
        setActiveTab('calendario');
        break;
      case 'folder':
        setSearchContext({ type: 'folder', id: item.id });
        setActiveTab('diretorio');
        break;
      case 'file':
        setSearchContext({ type: 'file', id: item.id });
        setActiveTab('diretorio');
        break;
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-200 transition-all duration-300 flex flex-col
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static
        ${isCollapsed ? 'w-20' : 'w-64'}
      `}>
        <div className="h-full flex flex-col">
          <div className={`p-4 border-b border-slate-100 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} gap-3`}>
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 min-w-[40px] bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                C
              </div>
              {!isCollapsed && (
                <div className="whitespace-nowrap">
                  <h1 className="font-bold text-slate-800 leading-none text-lg">CONECTSEAS</h1>
                  <p className="text-xs text-slate-500 mt-1">Governo do Amapá</p>
                </div>
              )}
            </div>
            {!isCollapsed && (
              <button onClick={() => setIsCollapsed(true)} className="hidden lg:block p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
                <ChevronLeft size={20} />
              </button>
            )}
          </div>

          {isCollapsed && (
            <div className="hidden lg:flex justify-center py-2 border-b border-slate-100">
              <button onClick={() => setIsCollapsed(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
                <ChevronRight size={20} />
              </button>
            </div>
          )}

          <nav className="flex-1 p-3 space-y-1 overflow-y-auto overflow-x-hidden">
            {sidebarLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 size={24} className="animate-spin text-slate-300" />
              </div>
            ) : (
              sidebarItems
                .filter(item => {
                  if (!item.is_active) return false;
                  if (!item.required_role) return true;

                  const userRole = user.role === 'SERVIDOR' ? UserRole.USER : user.role;

                  if (item.required_role === 'ADMIN') return userRole === UserRole.ADMIN;
                  if (item.required_role === 'USER') return userRole === UserRole.USER || userRole === UserRole.ADMIN;
                  return true;
                })
                .map((item) => {
                  const IconComponent = ICON_MAP[item.icon] || Globe;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.path);
                        setTargetUserId(null);
                      }}
                      title={isCollapsed ? item.label : ''}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${activeTab === item.path
                        ? 'bg-blue-50 text-blue-600 font-medium'
                        : 'text-slate-600 hover:bg-slate-50'
                        } ${isCollapsed ? 'justify-center' : ''}`}
                    >
                      <IconComponent size={20} />
                      {!isCollapsed && <span>{item.label}</span>}
                    </button>
                  );
                })
            )}
          </nav>


          {!isCollapsed && (
            <div className="p-4 border-t border-slate-100">
              <div className="bg-blue-600 rounded-2xl p-4 text-white relative overflow-hidden">
                <div className="relative z-10">
                  <p className="text-xs opacity-80 mb-1 font-medium">Precisa de Ajuda?</p>
                  <p className="text-sm font-semibold mb-3">Suporte técnico disponível para você.</p>
                  <button onClick={onOpenTicket} className="bg-white text-blue-600 text-xs font-bold px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors">
                    Abrir Chamado
                  </button>
                </div>
                <div className="absolute -bottom-4 -right-4 opacity-20 transform rotate-12">
                  <HelpCircle size={80} />
                </div>
              </div>
            </div>
          )}

          <div className="p-4 border-t border-slate-100">
            <button
              onClick={() => {
                setActiveTab('profile');
                setTargetUserId(null);
              }}
              title={isCollapsed ? user.name : ""}
              className={`flex items-center gap-3 w-full text-left hover:bg-slate-50 p-2 ${isCollapsed ? 'justify-center rounded-lg' : '-ml-2 rounded-xl'} transition-colors group`}
            >
              <img
                src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`}
                alt={user.name}
                className="w-10 h-10 min-w-[40px] rounded-full border border-slate-200 group-hover:border-blue-200 transition-colors object-cover"
              />
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-blue-700 transition-colors">{user.name}</p>
                  <p className="text-xs text-slate-500 truncate">{user.position}</p>
                </div>
              )}
            </button>
            <div className={`flex ${isCollapsed ? 'justify-center' : 'justify-end'} mt-2`}>
              <button
                onClick={onLogout}
                title={isCollapsed ? "Sair do Sistema" : ""}
                className={`flex items-center gap-2 text-xs font-bold text-red-500 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors ${isCollapsed ? '' : 'w-full justify-center'}`}
              >
                <LogOut size={16} />
                {!isCollapsed && "Sair do Sistema"}
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-4 flex-1">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden p-2 text-slate-500">
              <Menu size={20} />
            </button>
            <div className="max-w-md w-full relative hidden md:block" ref={searchRef}>
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${isSearching ? 'text-blue-500' : 'text-slate-400'}`} size={18} />
              <input
                type="text"
                placeholder="Buscar processos, circulares ou pessoas..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchOverlay(true);
                }}
                onFocus={() => searchQuery.length >= 2 && setShowSearchOverlay(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.length >= 2) {
                    setShowSearchOverlay(true);
                  }
                }}
                className="w-full pl-10 pr-12 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {isSearching ? (
                  <Loader2 className="text-blue-500 animate-spin" size={16} />
                ) : (
                  <button
                    onClick={() => searchQuery.length >= 2 && setShowSearchOverlay(true)}
                    className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    <Search size={16} />
                  </button>
                )}
              </div>

              {showSearchOverlay && searchQuery.length >= 2 && (
                <SearchOverlay
                  results={searchResults}
                  isLoading={isSearching}
                  searchQuery={searchQuery}
                  onClose={() => setShowSearchOverlay(false)}
                  onSelect={handleSelectSearchResult}
                />
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('rocket-chat')}
              className={`p-2 hover:bg-slate-100 rounded-full flex items-center gap-2 border border-slate-200 px-4 transition-colors ${activeTab === 'rocket-chat' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'text-slate-500'}`}
            >
              <MessageSquare size={20} className={activeTab === 'rocket-chat' ? 'text-blue-600' : 'text-blue-500'} />
              <span className="hidden sm:inline text-xs font-semibold text-slate-700">Rocket.Chat</span>
            </button>

            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2 hover:bg-slate-100 rounded-full relative transition-colors ${showNotifications ? 'bg-slate-100 text-blue-600' : 'text-slate-500'}`}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                      <Bell size={16} className="text-blue-600" />
                      Notificações
                    </h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleReadAll}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider flex items-center gap-1"
                      >
                        <CheckCheck size={12} />
                        Ler tudo
                      </button>
                    )}
                  </div>

                  <div className="max-h-[400px] overflow-y-auto">
                    {notifications.length > 0 ? (
                      <div className="divide-y divide-slate-50">
                        {notifications.map((notif) => (
                          <div
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif)}
                            className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors relative group ${!notif.is_read ? 'bg-blue-50/30' : ''}`}
                          >
                            {!notif.is_read && (
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600"></div>
                            )}
                            <div className="flex gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${notif.type === 'mural_mention' ? 'bg-purple-100 text-purple-600' :
                                notif.type === 'drive_share' ? 'bg-blue-100 text-blue-600' :
                                  notif.type === 'calendar_invite' ? 'bg-emerald-100 text-emerald-600' :
                                    'bg-orange-100 text-orange-600'
                                }`}>
                                <Inbox size={14} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-800 truncate">{notif.title}</p>
                                <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{notif.message}</p>
                                <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-400">
                                  <Clock size={10} />
                                  {formatTime(notif.created_at)}
                                </div>
                              </div>
                              {!notif.is_read && (
                                <div className="w-2 h-2 bg-blue-600 rounded-full mt-1"></div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center">
                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Bell size={24} className="text-slate-300" />
                        </div>
                        <p className="text-sm text-slate-500 font-medium">Nenhuma notificação por aqui.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
