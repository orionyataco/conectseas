
import React, { useState, useEffect } from 'react';
import {
    Users,
    Settings,
    Shield,
    Upload,
    Database,
    Layout,
    Save,
    RefreshCw,
    CheckCircle2,
    AlertCircle,
    BarChart3,
    Globe,
    Lock,
    FileText,
    Monitor,
    MessageSquare
} from 'lucide-react';
import {
    getAdminSettings,
    updateAdminSetting,
    uploadAdminFile,
    getAdminStats,
    getAdminUsers,
    testLDAPConnection
} from '../services/api';

const AdminPanel: React.FC = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    const [stats, setStats] = useState({
        users: 0,
        activeUsers: 0,
        posts: 0,
        files: 0
    });

    const [usersList, setUsersList] = useState<any[]>([]);
    const [ldapTestResult, setLdapTestResult] = useState<any>(null);
    const [testingLdap, setTestingLdap] = useState(false);

    const [settings, setSettings] = useState({
        ldap_config: {
            enabled: false,
            host: '',
            port: 389,
            baseDn: '',
            bindDn: '',
            bindPassword: ''
        },
        login_ui: {
            title: 'Login Administrativo',
            subtitle: 'Entre com as credenciais locais ou de rede.',
            logo_url: '',
            background_url: '',
            welcome_text: 'Gestão Administrativa Integrada',
            description_text: 'Plataforma unificada para serviços de assistência social e ferramentas internas do Estado.'
        },
        security_policy: {
            min_password_length: 8,
            require_special_chars: true,
            session_timeout: 1440
        },
        upload_config: {
            max_file_size: 10485760,
            allowed_types: []
        }
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [settingsData, statsData, usersData] = await Promise.all([
                getAdminSettings(),
                getAdminStats(),
                getAdminUsers()
            ]);

            // Deep merge received settings with defaults to avoid crashes
            setSettings(prev => ({
                ...prev,
                ...settingsData,
                ldap_config: { ...prev.ldap_config, ...(settingsData.ldap_config || {}) },
                login_ui: { ...prev.login_ui, ...(settingsData.login_ui || {}) },
                security_policy: { ...prev.security_policy, ...(settingsData.security_policy || {}) },
                upload_config: { ...prev.upload_config, ...(settingsData.upload_config || {}) }
            }));

            setStats(statsData);
            setUsersList(usersData);
        } catch (err) {
            setError('Erro ao carregar dados do painel admin.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (key: string, value: any) => {
        setSaving(true);
        setError('');
        setSuccess('');
        try {
            console.log(`Saving ${key}:`, value);
            await updateAdminSetting(key, value);
            console.log(`✓ ${key} saved successfully`);
            setSuccess('Configuração salva com sucesso!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            console.error(`Error saving ${key}:`, err);
            const errorMsg = err.response?.data?.error || err.message || 'Erro desconhecido';
            setError(`Erro ao salvar ${key}: ${errorMsg}`);
            setTimeout(() => setError(''), 5000);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
        );
    }

    const renderOverview = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Usuários Totais</p>
                        <h3 className="text-2xl font-bold text-slate-800">{stats.users}</h3>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
                        <CheckCircle2 size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Usuários Ativos</p>
                        <h3 className="text-2xl font-bold text-slate-800">{stats.activeUsers}</h3>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                        <MessageSquare size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Posts no Mural</p>
                        <h3 className="text-2xl font-bold text-slate-800">{stats.posts}</h3>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
                        <Database size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Arquivos no Drive</p>
                        <h3 className="text-2xl font-bold text-slate-800">{stats.files}</h3>
                    </div>
                </div>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <BarChart3 className="text-blue-600" size={20} />
                    Desempenho do Sistema
                </h3>
                <p className="text-slate-500 mb-6">O sistema está operando normalmente com 100% de disponibilidade nas últimas 24 horas.</p>
                <div className="h-4 bg-slate-50 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 w-full"></div>
                </div>
            </div>
        </div>
    );

    const renderLDAP = () => (
        <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Globe className="text-indigo-600" size={20} />
                    Configuração de Rede (LDAP / Active Directory)
                </h3>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-500">Habilitar LDAP</span>
                    <button
                        onClick={() => {
                            const newValue = !settings.ldap_config.enabled;
                            setSettings({ ...settings, ldap_config: { ...settings.ldap_config, enabled: newValue } });
                        }}
                        className={`w-12 h-6 rounded-full transition-colors relative ${settings.ldap_config.enabled ? 'bg-blue-600' : 'bg-slate-300'}`}
                    >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.ldap_config.enabled ? 'right-1' : 'left-1'}`}></div>
                    </button>
                </div>
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-opacity ${settings.ldap_config.enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Host do Servidor</label>
                    <input
                        type="text"
                        value={settings.ldap_config.host}
                        onChange={(e) => setSettings({ ...settings, ldap_config: { ...settings.ldap_config, host: e.target.value } })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="ldap.empresa.com"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Porta</label>
                    <input
                        type="number"
                        value={settings.ldap_config.port}
                        onChange={(e) => setSettings({ ...settings, ldap_config: { ...settings.ldap_config, port: parseInt(e.target.value) } })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="389"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Base DN</label>
                    <input
                        type="text"
                        value={settings.ldap_config.baseDn}
                        onChange={(e) => setSettings({ ...settings, ldap_config: { ...settings.ldap_config, baseDn: e.target.value } })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="dc=empresa,dc=com"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Bind DN (Usuário Service)</label>
                    <input
                        type="text"
                        value={settings.ldap_config.bindDn}
                        onChange={(e) => setSettings({ ...settings, ldap_config: { ...settings.ldap_config, bindDn: e.target.value } })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="cn=admin,dc=empresa,dc=com"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Bind Password (Senha do Service)</label>
                    <input
                        type="password"
                        value={settings.ldap_config.bindPassword}
                        onChange={(e) => setSettings({ ...settings, ldap_config: { ...settings.ldap_config, bindPassword: e.target.value } })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Senha do usuário de serviço LDAP"
                    />
                </div>
            </div>

            <div className="flex justify-between items-center pt-4">
                <button
                    onClick={async () => {
                        setTestingLdap(true);
                        setLdapTestResult(null);
                        try {
                            const result = await testLDAPConnection();
                            setLdapTestResult(result);
                        } catch (err: any) {
                            setLdapTestResult({
                                success: false,
                                error: err.response?.data?.error || err.message
                            });
                        } finally {
                            setTestingLdap(false);
                        }
                    }}
                    disabled={testingLdap}
                    className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-100 disabled:opacity-50"
                >
                    {testingLdap ? <RefreshCw className="animate-spin" size={18} /> : <Database size={18} />}
                    Testar Conexão LDAP
                </button>
                <button
                    onClick={() => handleSave('ldap_config', settings.ldap_config)}
                    disabled={saving}
                    className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100 disabled:opacity-50"
                >
                    {saving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                    Salvar Configurações LDAP
                </button>
            </div>

            {ldapTestResult && (
                <div className={`p-6 rounded-2xl border-2 ${ldapTestResult.success
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                    }`}>
                    <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                        {ldapTestResult.success ? (
                            <><CheckCircle2 className="text-green-600" size={20} /> Teste de Conexão: Sucesso</>
                        ) : (
                            <><AlertCircle className="text-red-600" size={20} /> Teste de Conexão: Falhou</>
                        )}
                    </h4>

                    {ldapTestResult.url && (
                        <p className="text-sm mb-3"><strong>URL:</strong> {ldapTestResult.url}</p>
                    )}

                    {ldapTestResult.steps && ldapTestResult.steps.length > 0 && (
                        <div className="space-y-2">
                            <p className="font-bold text-sm">Etapas do Teste:</p>
                            {ldapTestResult.steps.map((step: any, idx: number) => (
                                <div key={idx} className={`p-3 rounded-lg ${step.status === 'success' ? 'bg-green-100' :
                                    step.status === 'warning' ? 'bg-yellow-100' :
                                        'bg-red-100'
                                    }`}>
                                    <p className="font-bold text-sm">{idx + 1}. {step.step}</p>
                                    <p className="text-xs mt-1">{step.message}</p>
                                    {step.bindDn && <p className="text-xs text-slate-600 mt-1">Bind DN: {step.bindDn}</p>}
                                    {step.baseDn && <p className="text-xs text-slate-600 mt-1">Base DN: {step.baseDn}</p>}
                                    {step.entries && step.entries.length > 0 && (
                                        <details className="mt-2">
                                            <summary className="text-xs font-bold cursor-pointer">Ver {step.entries.length} registros encontrados</summary>
                                            <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                                                {step.entries.map((entry: any, i: number) => (
                                                    <div key={i} className="bg-white p-2 rounded text-xs">
                                                        <p className="font-bold">{entry.dn}</p>
                                                        <pre className="text-[10px] mt-1 overflow-x-auto">{JSON.stringify(entry.attributes, null, 2)}</pre>
                                                    </div>
                                                ))}
                                            </div>
                                        </details>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {ldapTestResult.error && (
                        <p className="text-red-700 font-bold mt-3">{ldapTestResult.error}</p>
                    )}
                </div>
            )}

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex gap-2 items-start">
                <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={16} />
                <p className="text-[11px] text-amber-700 leading-relaxed">
                    <strong>Importante:</strong> Após preencher os campos acima, clique em "Salvar Configurações LDAP" para aplicar as mudanças.
                    Verifique o console do navegador (F12) se houver erros.
                </p>
            </div>
        </div>
    );

    const renderLoginUI = () => (
        <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Monitor className="text-blue-600" size={20} />
                Personalização da Tela de Login
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Título da Tela</label>
                    <input
                        type="text"
                        value={settings.login_ui.title}
                        onChange={(e) => setSettings({ ...settings, login_ui: { ...settings.login_ui, title: e.target.value } })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Subtítulo</label>
                    <input
                        type="text"
                        value={settings.login_ui.subtitle}
                        onChange={(e) => setSettings({ ...settings, login_ui: { ...settings.login_ui, subtitle: e.target.value } })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-bold text-slate-700">Texto de Boas-vindas (Destaque)</label>
                    <input
                        type="text"
                        value={settings.login_ui.welcome_text}
                        onChange={(e) => setSettings({ ...settings, login_ui: { ...settings.login_ui, welcome_text: e.target.value } })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-bold text-slate-700 block">Imagem de Fundo da Tela de Login</label>
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                        {settings.login_ui.background_url && (
                            <div className="relative group w-48 h-28 rounded-xl overflow-hidden border border-slate-200">
                                <img
                                    src={settings.login_ui.background_url}
                                    className="w-full h-full object-cover"
                                    alt="Preview"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <p className="text-white text-[10px] font-bold">Imagem Atual</p>
                                </div>
                            </div>
                        )}
                        <div className="flex-1 space-y-3">
                            <div className="relative">
                                <input
                                    type="file"
                                    id="bg-upload"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            try {
                                                setSaving(true);
                                                setError('');
                                                console.log('Uploading file:', file.name, 'Size:', file.size);
                                                const res = await uploadAdminFile('login_ui', 'background_url', file);
                                                console.log('Upload response:', res);
                                                setSettings({
                                                    ...settings,
                                                    login_ui: { ...settings.login_ui, background_url: res.url }
                                                });
                                                setSuccess('Imagem de fundo atualizada!');
                                                setTimeout(() => setSuccess(''), 3000);
                                            } catch (err: any) {
                                                console.error('Upload error:', err);
                                                const errorMsg = err.response?.data?.error || err.message || 'Erro ao enviar imagem.';
                                                setError(`Erro no upload: ${errorMsg}`);
                                                setTimeout(() => setError(''), 5000);
                                            } finally {
                                                setSaving(false);
                                            }
                                        }
                                    }}
                                />
                                <label
                                    htmlFor="bg-upload"
                                    className="flex items-center justify-center gap-2 w-full md:w-auto px-6 py-4 bg-slate-100 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:bg-slate-200 transition-all text-slate-600 font-bold text-sm"
                                >
                                    <Upload size={20} />
                                    Selecionar Nova Imagem
                                </label>
                            </div>
                            {/* Recomendação técnica: 1920x1080 pixels (Full HD) para melhor visualização em desktops e notebooks */}
                            <p className="text-xs text-slate-400 font-medium italic">
                                * Recomendado: 1920x1080 pixels (Proporção 16:9). Formatos: JPG, PNG, WEBP.
                            </p>
                            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 flex gap-2 items-start">
                                <Monitor className="text-blue-600 shrink-0 mt-0.5" size={16} />
                                <p className="text-[11px] text-blue-700 leading-relaxed">
                                    <strong>Onde aparece:</strong> Esta imagem será exibida no lado direito da tela de login,
                                    ao lado dos campos de usuário e senha. É a imagem de fundo azul com o texto "Gestão Administrativa Integrada".
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <button
                    onClick={() => handleSave('login_ui', settings.login_ui)}
                    disabled={saving}
                    className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100 disabled:opacity-50"
                >
                    {saving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                    Aplicar Design
                </button>
            </div>
        </div>
    );

    const renderSecurity = () => (
        <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Lock className="text-red-600" size={20} />
                Políticas de Segurança e Convívio
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Tamanho Mínimo da Senha</label>
                    <input
                        type="number"
                        value={settings.security_policy.min_password_length}
                        onChange={(e) => setSettings({ ...settings, security_policy: { ...settings.security_policy, min_password_length: parseInt(e.target.value) } })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Expiração de Sessão (minutos)</label>
                    <input
                        type="number"
                        value={settings.security_policy.session_timeout}
                        onChange={(e) => setSettings({ ...settings, security_policy: { ...settings.security_policy, session_timeout: parseInt(e.target.value) } })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                <div className="flex items-center gap-3">
                    <input
                        type="checkbox"
                        id="special_chars"
                        checked={settings.security_policy.require_special_chars}
                        onChange={(e) => setSettings({ ...settings, security_policy: { ...settings.security_policy, require_special_chars: e.target.checked } })}
                        className="w-5 h-5 text-blue-600 rounded border-slate-300"
                    />
                    <label htmlFor="special_chars" className="text-sm font-medium text-slate-700">Exigir caracteres especiais nas senhas</label>
                </div>
            </div>

            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3">
                <AlertCircle className="text-amber-600 shrink-0" size={20} />
                <p className="text-xs text-amber-700 leading-relaxed">
                    <strong>Regras de Convívio:</strong> Esta seção também aplica as diretrizes de comportamento automatizadas no Mural e na IA Assistant.
                </p>
            </div>

            <div className="flex justify-end pt-4">
                <button
                    onClick={() => handleSave('security_policy', settings.security_policy)}
                    disabled={saving}
                    className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100 disabled:opacity-50"
                >
                    {saving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                    Salvar Políticas
                </button>
            </div>
        </div>
    );

    const renderUploads = () => (
        <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Upload className="text-purple-600" size={20} />
                Gestão de Arquivos e Uploads
            </h3>

            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Tamanho Máximo de Arquivo (Bytes)</label>
                    <div className="flex gap-4 items-center">
                        <input
                            type="number"
                            value={settings.upload_config.max_file_size}
                            onChange={(e) => setSettings({ ...settings, upload_config: { ...settings.upload_config, max_file_size: parseInt(e.target.value) } })}
                            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <span className="text-sm font-bold text-slate-500">
                            ({(settings.upload_config.max_file_size / (1024 * 1024)).toFixed(0)} MB)
                        </span>
                    </div>
                </div>

                <div className="space-y-4">
                    <label className="text-sm font-bold text-slate-700">Tipos de Arquivos Permitidos</label>
                    <div className="flex flex-wrap gap-2">
                        {['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.ms-excel'].map(type => (
                            <button
                                key={type}
                                onClick={() => {
                                    const current = settings.upload_config.allowed_types || [];
                                    const next = current.includes(type) ? current.filter(t => t !== type) : [...current, type];
                                    setSettings({ ...settings, upload_config: { ...settings.upload_config, allowed_types: next } });
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${(settings.upload_config.allowed_types || []).includes(type)
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                            >
                                {type.split('/')[1].toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <button
                    onClick={() => handleSave('upload_config', settings.upload_config)}
                    disabled={saving}
                    className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100 disabled:opacity-50"
                >
                    {saving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                    Atualizar Limites
                </button>
            </div>
        </div>
    );

    const renderUsers = () => (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Users className="text-blue-600" size={20} />
                    Gerenciamento de Usuários
                </h3>
                <span className="text-xs font-bold px-3 py-1 bg-blue-50 text-blue-600 rounded-full">
                    {usersList.length} Usuários Registrados
                </span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50">
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Usuário</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Departamento</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cargo</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Permissão</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cota (GB)</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {usersList.map(user => (
                            <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden shrink-0">
                                            {user.avatar ? (
                                                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">
                                                    {user.name.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">{user.name}</p>
                                            <p className="text-xs text-slate-500">@{user.username}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600">{user.department || 'N/A'}</td>
                                <td className="px-6 py-4 text-sm text-slate-600 font-medium">{user.position || 'N/A'}</td>
                                <td className="px-6 py-4">
                                    <span className={`text-[10px] font-extrabold px-2 py-1 rounded-md ${user.role === 'ADMIN'
                                        ? 'bg-red-50 text-red-600 border border-red-100'
                                        : 'bg-green-50 text-green-600 border border-green-100'
                                        }`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min="1"
                                            max="5"
                                            value={Math.round((user.storage_quota || 1073741824) / (1024 * 1024 * 1024))}
                                            onChange={async (e) => {
                                                const newGB = parseInt(e.target.value);
                                                if (newGB >= 1 && newGB <= 5) {
                                                    const newBytes = newGB * 1024 * 1024 * 1024;
                                                    try {
                                                        setSaving(true);
                                                        const { updateUserQuota } = await import('../services/api');
                                                        await updateUserQuota(user.id, newBytes);
                                                        setUsersList(usersList.map(u => u.id === user.id ? { ...u, storage_quota: newBytes } : u));
                                                        setSuccess('Cota atualizada!');
                                                        setTimeout(() => setSuccess(''), 3000);
                                                    } catch (err) {
                                                        setError('Erro ao atualizar cota.');
                                                    } finally {
                                                        setSaving(false);
                                                    }
                                                }
                                            }}
                                            className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                        <span className="text-xs font-bold text-slate-400">GB</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={async () => {
                                            const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
                                            if (confirm(`Deseja alterar as permissões de ${user.name} para ${newRole}?`)) {
                                                try {
                                                    setSaving(true);
                                                    const { updateUserRole } = await import('../services/api');
                                                    await updateUserRole(user.id, newRole);
                                                    setUsersList(usersList.map(u => u.id === user.id ? { ...u, role: newRole } : u));
                                                    setSuccess('Permissão atualizada!');
                                                    setTimeout(() => setSuccess(''), 3000);
                                                } catch (err) {
                                                    setError('Erro ao atualizar permissão.');
                                                } finally {
                                                    setSaving(false);
                                                }
                                            }
                                        }}
                                        disabled={saving}
                                        className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline disabled:opacity-50"
                                    >
                                        Alterar Permissão
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div >
    );

    const tabs = [
        { id: 'overview', label: 'Métricas e Status', icon: <BarChart3 size={18} /> },
        { id: 'users', label: 'Usuários', icon: <Users size={18} /> },
        { id: 'ldap', label: 'LDAP / Rede', icon: <Globe size={18} /> },
        { id: 'login', label: 'Tela de Login', icon: <Monitor size={18} /> },
        { id: 'security', label: 'Segurança e Regras', icon: <Shield size={18} /> },
        { id: 'uploads', label: 'Uploads e Drive', icon: <Upload size={18} /> },
    ];

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-extrabold text-slate-800">Painel de Controle do Administrador</h2>
                    <p className="text-slate-500">Configure o ecossistema CONECTSEAS para toda a instituição.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchData}
                        className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {success && (
                <div className="p-4 bg-green-50 text-green-700 rounded-2xl border border-green-100 flex items-center gap-3 animate-bounce">
                    <CheckCircle2 size={20} />
                    <span className="font-bold">{success}</span>
                </div>
            )}

            {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-2xl border border-red-100 flex items-center gap-3">
                    <AlertCircle size={20} />
                    <span className="font-bold">{error}</span>
                </div>
            )}

            <div className="flex flex-col md:flex-row gap-8">
                {/* Sub-navigation */}
                <div className="md:w-64 shrink-0 space-y-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === tab.id
                                ? 'bg-white text-blue-600 font-bold shadow-sm border border-slate-200'
                                : 'text-slate-500 hover:bg-white/50 hover:text-slate-800'
                                }`}
                        >
                            {tab.icon}
                            <span className="text-sm">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="flex-1 min-w-0">
                    {activeTab === 'overview' && renderOverview()}
                    {activeTab === 'users' && renderUsers()}
                    {activeTab === 'ldap' && renderLDAP()}
                    {activeTab === 'login' && renderLoginUI()}
                    {activeTab === 'security' && renderSecurity()}
                    {activeTab === 'uploads' && renderUploads()}
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;
