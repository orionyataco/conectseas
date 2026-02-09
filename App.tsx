
import React from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Mural from './components/Mural';
import Calendar from './components/Calendar';
import Directory from './components/Directory';
import ProjectManager from './components/ProjectManager';
import AIAssistant from './components/AIAssistant';
import Profile from './components/Profile';
import AdminPanel from './components/AdminPanel';
import ServiceDesk, { CreateTicketModal } from './components/ServiceDesk';
import RocketChat from './components/RocketChat';
import { User, UserRole } from './types';
import { LogIn, ShieldCheck, Database, Key, Eye, EyeOff } from 'lucide-react';
import { checkDbConnection, login } from './services/api';
import { useAuth } from './context/AuthContext';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState('dashboard');
  const [targetUserId, setTargetUserId] = React.useState<string | null>(null);
  const { user, isAuthenticated, login: authLogin, logout: authLogout, loading: authLoading } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [searchContext, setSearchContext] = React.useState<{ type: string; id: string | number } | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = React.useState(false);


  // Login form states
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [dbStatus, setDbStatus] = React.useState<{ connected: boolean; message: string } | null>(null);
  const [loginError, setLoginError] = React.useState('');

  React.useEffect(() => {
    checkDbConnection()
      .then((data) => setDbStatus({ connected: true, message: data.message }))
      .catch(() => setDbStatus({ connected: false, message: 'Erro ao conectar ao banco de dados' }));
  }, []);

  // Fetch dynamic login screen settings and theme
  const [loginSettings, setLoginSettings] = React.useState({
    title: 'Login Administrativo',
    subtitle: 'Entre com as credenciais locais ou de rede.',
    welcome_text: 'Gestão Administrativa Integrada',
    background_url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1000',
    description_text: ''
  });
  const [themeConfig, setThemeConfig] = React.useState({
    primary_color: '#2563eb'
  });

  const generateShades = (hex: string) => {
    const hexToRgb = (h: string) => {
      const r = parseInt(h.slice(1, 3), 16);
      const g = parseInt(h.slice(3, 5), 16);
      const b = parseInt(h.slice(5, 7), 16);
      return [r, g, b];
    };

    const rgbToHex = (arr: number[]) => {
      return "#" + arr.map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
    };

    const mix = (rgb: number[], target: number[], weight: number) => {
      return rgb.map((c, i) => c * (1 - weight) + target[i] * weight);
    };

    const rgb = hexToRgb(hex);
    const white = [255, 255, 255];
    const black = [0, 0, 0];

    return {
      50: rgbToHex(mix(rgb, white, 0.95)),
      100: rgbToHex(mix(rgb, white, 0.9)),
      200: rgbToHex(mix(rgb, white, 0.7)),
      300: rgbToHex(mix(rgb, white, 0.5)),
      400: rgbToHex(mix(rgb, white, 0.3)),
      500: hex,
      600: rgbToHex(mix(rgb, black, 0.1)),
      700: rgbToHex(mix(rgb, black, 0.25)),
      800: rgbToHex(mix(rgb, black, 0.45)),
      900: rgbToHex(mix(rgb, black, 0.65)),
      950: rgbToHex(mix(rgb, black, 0.85)),
    };
  };

  const applyTheme = (color: string) => {
    const shades = generateShades(color);
    const root = document.documentElement;
    Object.entries(shades).forEach(([sh, hex]) => {
      root.style.setProperty(`--color-primary-${sh}`, hex as string);
    });
  };

  React.useEffect(() => {
    import('./services/api').then(({ getPublicSetting }) => {
      // Load Login UI
      getPublicSetting('login_ui')
        .then(data => {
          if (data) setLoginSettings(data);
        })
        .catch(err => console.error('Erro ao carregar configurações de login:', err));

      // Load Theme
      getPublicSetting('theme_config')
        .then(data => {
          if (data && data.primary_color) {
            setThemeConfig(data);
            applyTheme(data.primary_color);
          }
        })
        .catch(err => console.error('Erro ao carregar tema:', err));
    });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError('');

    try {
      const response = await login({ username, password });
      if (response.success && response.user && response.token) {
        authLogin(response.user, response.token);
      } else {
        setLoginError(response.message || 'Falha no login');
      }
    } catch (err) {
      setLoginError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authLogout();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
        <div className="bg-white w-full max-w-5xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px] border border-slate-200">
          {/* Left Side: Form */}
          <div className="flex-1 p-12 lg:p-16 flex flex-col justify-center">
            <div className="mb-10">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-blue-200">
                <Key size={28} />
              </div>
              <h1 className="text-3xl font-extrabold text-slate-800 mb-2">{loginSettings.title}</h1>
              <p className="text-slate-500">{loginSettings.subtitle}</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Usuário ou Matrícula</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Digite seu usuário de rede"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-sm font-bold text-slate-700">Senha</label>
                  <a href="#" className="text-xs font-bold text-blue-600 hover:underline">Esqueceu a senha?</a>
                </div>

                {loginError && (
                  <div className="p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 flex items-center gap-2">
                    <span className="font-bold">Erro:</span> {loginError}
                  </div>
                )}
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite sua senha institucional"
                    className="w-full px-5 py-4 pr-12 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 px-1">
                <input type="checkbox" id="remember" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                <label htmlFor="remember" className="text-sm text-slate-500 font-medium">Lembrar-me neste computador</label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-100 disabled:opacity-70"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    Acessar Sistema
                    <LogIn size={20} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-12 flex flex-col gap-3 text-center md:text-left">
              <p className="text-xs text-slate-400">Problemas com LDAP? <a href="#" className="text-blue-600 font-bold hover:underline">Contate o suporte TI</a></p>
              <p className="text-xs text-slate-300">© {new Date().getFullYear()} Governo do Estado do Amapá. Todos os direitos reservados.</p>
              {dbStatus && (
                <div className={`flex items-center gap-2 text-xs font-bold ${dbStatus.connected ? 'text-green-600' : 'text-red-500'}`}>
                  <Database size={14} />
                  <span>{dbStatus.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Visual */}
          <div className="hidden md:block md:w-5/12 lg:w-1/2 relative">
            <div className="absolute inset-0 bg-blue-900 overflow-hidden">
              <img
                src={loginSettings.background_url}
                className="w-full h-full object-cover mix-blend-overlay transition-opacity duration-700"
                style={{ opacity: (loginSettings.overlay_opacity || 70) / 100 }}
                alt="Workspace"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-blue-900 via-transparent to-transparent"></div>
            </div>

            <div className="absolute inset-0 flex flex-col justify-end p-12 text-white">
              <div className="w-16 h-1 bg-white mb-8 rounded-full"></div>
              <h2 className="text-4xl font-extrabold mb-4 leading-tight">{loginSettings.welcome_text}</h2>
              <p className="text-blue-100/80 text-lg leading-relaxed max-w-md">
                {loginSettings.description_text}
              </p>

              <div className="mt-12 flex gap-2">
                <div className="w-2 h-2 rounded-full bg-white"></div>
                <div className="w-2 h-2 rounded-full bg-white/30"></div>
                <div className="w-2 h-2 rounded-full bg-white/30"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard user={user} />;
      case 'mural': return <Mural user={user} />;
      case 'calendario': return <Calendar user={user} searchContext={searchContext} onClearContext={() => setSearchContext(null)} />;
      case 'projetos': return <ProjectManager user={user} />;
      case 'diretorio': return <Directory user={user} searchContext={searchContext} onClearContext={() => setSearchContext(null)} />;
      case 'assistente':
      case 'ai': return <AIAssistant />;
      case 'profile':
        return <Profile user={user!} targetUserId={targetUserId} onUpdate={(updatedUser) => authLogin(updatedUser, localStorage.getItem('token') || '')} />;
      case 'admin':
        if (user?.role !== UserRole.ADMIN) return <Dashboard user={user} />;
        return <AdminPanel />;
      case 'tectic':
        if (user?.role !== UserRole.ADMIN) return <Dashboard user={user} />;
        return <ServiceDesk />;
      case 'rocket-chat': return <RocketChat />;
      default: return <Dashboard user={user} />;
    }
  };

  return (
    <Layout
      user={user!}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      setTargetUserId={setTargetUserId}
      onLogout={handleLogout}
      setSearchContext={setSearchContext}
      onOpenTicket={() => setIsTicketModalOpen(true)}
    >
      {renderContent()}
      {isTicketModalOpen && (
        <CreateTicketModal
          onClose={() => setIsTicketModalOpen(false)}
          onCreated={() => setIsTicketModalOpen(false)}
        />
      )}
    </Layout>
  );
};

export default App;
