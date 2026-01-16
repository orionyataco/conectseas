
import React from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Mural from './components/Mural';
import Calendar from './components/Calendar';
import Directory from './components/Directory';
import AIAssistant from './components/AIAssistant';
import Workflows from './components/Workflows';
import Profile from './components/Profile';
import { User, UserRole } from './types';
import { LogIn, ShieldCheck, Database, Key } from 'lucide-react';
import { checkDbConnection, login } from './services/api';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [user, setUser] = React.useState<User | null>(null);

  // Login form states
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [dbStatus, setDbStatus] = React.useState<{ connected: boolean; message: string } | null>(null);
  const [loginError, setLoginError] = React.useState('');

  React.useEffect(() => {
    checkDbConnection()
      .then((data) => setDbStatus({ connected: true, message: data.message }))
      .catch(() => setDbStatus({ connected: false, message: 'Erro ao conectar ao banco de dados' }));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError('');

    try {
      const response = await login({ username, password });
      if (response.success && response.user) {
        setIsAuthenticated(true);
        setUser(response.user);
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
    setIsAuthenticated(false);
    setUser(null);
  };

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
              <h1 className="text-3xl font-extrabold text-slate-800 mb-2">Login Administrativo</h1>
              <p className="text-slate-500">Entre com as credenciais locais ou de rede.</p>
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
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha institucional"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm"
                />
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
              <p className="text-xs text-slate-300">© 2024 Governo do Estado do Amapá. Todos os direitos reservados.</p>
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
                src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1000"
                className="w-full h-full object-cover opacity-40 mix-blend-overlay"
                alt="Workspace"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-blue-900 via-transparent to-transparent"></div>
            </div>

            <div className="absolute inset-0 flex flex-col justify-end p-12 text-white">
              <div className="w-16 h-1 bg-white mb-8 rounded-full"></div>
              <h2 className="text-4xl font-extrabold mb-4 leading-tight">Gestão Administrativa Integrada</h2>
              <p className="text-blue-100/80 text-lg leading-relaxed max-w-md">
                Plataforma unificada para serviços de assistência social e ferramentas internas do Estado.
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
      case 'calendario': return <Calendar user={user} />;
      case 'diretorio': return <Directory user={user} />;
      case 'ai': return <AIAssistant />;
      case 'ti':
      case 'urh':
      case 'patrimonio':
      case 'documentos':
        return <Workflows />;
      case 'profile':
        return <Profile user={user!} onUpdate={(updatedUser) => setUser(updatedUser)} />;
      default: return <Dashboard user={user} />;
    }
  };

  return (
    <Layout
      user={user!}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onLogout={handleLogout}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;
