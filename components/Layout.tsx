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
import { NAV_ITEMS } from '../constants';
import { User, UserRole } from '../types';
import { globalSearch } from '../services/api';
import SearchOverlay from './SearchOverlay';

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
  const searchRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchOverlay(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  React.useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowSearchOverlay(false);
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
            {NAV_ITEMS.filter(item => item.id !== 'admin' || user.role === 'ADMIN').map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setTargetUserId(null);
                }}
                title={isCollapsed ? item.label : ''}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${activeTab === item.id
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-slate-600 hover:bg-slate-50'
                  } ${isCollapsed ? 'justify-center' : ''}`}
              >
                {item.icon}
                {!isCollapsed && <span>{item.label}</span>}
              </button>
            ))}
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
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>

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
