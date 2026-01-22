
import React from 'react';
import {
  Bell,
  Search,
  LogOut,
  User as UserIcon,
  Menu,
  X,
  MessageCircle,
  HelpCircle
} from 'lucide-react';
import { NAV_ITEMS } from '../constants';
import { User, UserRole } from '../types';

interface LayoutProps {
  user: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ user, activeTab, setActiveTab, onLogout, children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static`}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
              C
            </div>
            <div>
              <h1 className="font-bold text-slate-800 leading-none text-lg">CONECTSEAS</h1>
              <p className="text-xs text-slate-500 mt-1">Governo do Amapá</p>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {NAV_ITEMS.filter(item => item.id !== 'admin' || user.role === 'ADMIN').map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === item.id
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-slate-600 hover:bg-slate-50'
                  }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-100">
            <div className="bg-blue-600 rounded-2xl p-4 text-white relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-xs opacity-80 mb-1 font-medium">Precisa de Ajuda?</p>
                <p className="text-sm font-semibold mb-3">Suporte técnico disponível para você.</p>
                <button onClick={() => setActiveTab('ti')} className="bg-white text-blue-600 text-xs font-bold px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors">
                  Abrir Chamado
                </button>
              </div>
              <div className="absolute -bottom-4 -right-4 opacity-20 transform rotate-12">
                {/* Fixed: HelpCircle was not imported */}
                <HelpCircle size={80} />
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-slate-100">
            <button
              onClick={() => setActiveTab('profile')}
              className="flex items-center gap-3 w-full text-left hover:bg-slate-50 p-2 -ml-2 rounded-xl transition-colors group"
            >
              <img
                src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`}
                alt={user.name}
                className="w-10 h-10 rounded-full border border-slate-200 group-hover:border-blue-200 transition-colors object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-blue-700 transition-colors">{user.name}</p>
                <p className="text-xs text-slate-500 truncate">{user.position}</p>
              </div>
            </button>
            <div className="flex justify-end mt-2">
              <button
                onClick={onLogout}
                className="flex items-center gap-2 text-xs font-bold text-red-500 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors w-full justify-center"
              >
                <LogOut size={16} />
                Sair do Sistema
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
            <div className="max-w-md w-full relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Buscar processos, circulares ou pessoas..."
                className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <button
              onClick={() => window.open('https://chat.institucional.ap.gov.br', '_blank')}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-full flex items-center gap-2 border border-slate-200 px-4"
            >
              <MessageCircle size={20} className="text-blue-500" />
              <span className="hidden sm:inline text-xs font-semibold text-slate-700">Rocket.Chat</span>
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
