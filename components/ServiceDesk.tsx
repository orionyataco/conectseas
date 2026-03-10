import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
    LayoutDashboard,
    Ticket,
    HardDrive,
    BookOpen,
    Terminal,
    Users,
    Plus,
    Search,
    Filter,
    Clock,
    AlertCircle,
    CheckCircle2,
    ChevronRight,
    ArrowUpRight,
    Eye,
    Send,
    Bot,
    Download,
    FileText,
    Settings,
    MoreHorizontal,
    Monitor,
    LayoutGrid,
    List,
    Trash2,
    Volume2,
    VolumeX
} from 'lucide-react';
import { TecticTicket, TecticComment, TecticFile, TecticKnowledge, User } from '../types';
import {
    getTecticStats,
    getTecticTickets,
    getTecticDossier,
    createTecticTicket,
    updateTecticTicket,
    deleteTecticTickets,
    addTecticComment,
    getTecticDrive,
    uploadTecticFile,
    createTecticNotice,
    getTecticKnowledge,
    createTecticKnowledge,
    updateTecticKnowledge,
    deleteTecticKnowledge,
    deleteTecticFile,
    renameTecticFile
} from '../services/api';

const ServiceDesk: React.FC = () => {
    const queryParams = new URLSearchParams(window.location.search);
    const initialSubTab = queryParams.get('subtab') || 'painel';
    const [activeSubTab, setActiveSubTab] = useState(initialSubTab);
    const [stats, setStats] = useState<any>(null);
    const [tickets, setTickets] = useState<TecticTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState<TecticTicket | null>(null);
    const [isDossierOpen, setIsDossierOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isSoundEnabled, setIsSoundEnabled] = useState(() => {
        const saved = localStorage.getItem('tectic_sound_enabled');
        return saved === null ? true : saved === 'true';
    });
    const [lastSeenTicketId, setLastSeenTicketId] = useState<number | null>(null);

    const playAlert = () => {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.volume = 0.5;
        audio.play().catch(e => console.warn('Erro ao reproduzir áudio:', e));
    };

    useEffect(() => {
        loadStats();
        loadTickets();

        const interval = setInterval(() => {
            loadTickets(true);
            loadStats();
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        localStorage.setItem('tectic_sound_enabled', String(isSoundEnabled));
    }, [isSoundEnabled]);

    const loadStats = async () => {
        try {
            const data = await getTecticStats();
            setStats(data);
        } catch (err) {
            console.error('Erro ao carregar stats:', err);
        }
    };

    const loadTickets = async (isPoll = false) => {
        if (!isPoll) setLoading(true);
        try {
            const data = await getTecticTickets();
            if (Array.isArray(data)) {
                if (isPoll && data.length > 0 && lastSeenTicketId !== null) {
                    const newest = data[0].id;
                    if (newest > lastSeenTicketId) {
                        if (isSoundEnabled) playAlert();
                        toast.success('Novo chamado recebido!', { icon: '🔔' });
                    }
                }

                if (data.length > 0) {
                    const currentMax = Math.max(...data.map(t => t.id));
                    setLastSeenTicketId(prev => (prev === null || currentMax > prev) ? currentMax : prev);
                }

                setTickets(data);
            } else {
                console.warn('getTecticTickets did not return an array:', data);
                setTickets([]);
            }
        } catch (err) {
            console.error('Erro ao carregar chamados:', err);
        } finally {
            if (!isPoll) setLoading(false);
        }
    };

    const handleViewDossier = async (id: number) => {
        try {
            const data = await getTecticDossier(id);
            setSelectedTicket(data);
            setIsDossierOpen(true);
        } catch (err) {
            console.error('Erro ao carregar dossiê:', err);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            {/* Header / Sub-nav */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10 transition-all duration-300">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100 dark:shadow-blue-900/20">
                        <Monitor size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">ServiceDesk</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Suporte Especializado de TI</p>
                    </div>
                </div>

                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl overflow-x-auto no-scrollbar scroll-smooth w-full md:w-auto">
                    <SubNavLink icon={<LayoutDashboard size={18} />} label="Painel" active={activeSubTab === 'painel'} onClick={() => setActiveSubTab('painel')} />
                    <SubNavLink icon={<Ticket size={18} />} label="Chamados" active={activeSubTab === 'chamados'} onClick={() => setActiveSubTab('chamados')} />
                    <SubNavLink icon={<HardDrive size={18} />} label="TEC-Drive" active={activeSubTab === 'drive'} onClick={() => setActiveSubTab('drive')} />
                    <SubNavLink icon={<BookOpen size={18} />} label="Base" active={activeSubTab === 'base'} onClick={() => setActiveSubTab('base')} />
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsSoundEnabled(!isSoundEnabled)}
                        className={`p-2.5 rounded-xl transition-all ${isSoundEnabled ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'} hover:scale-105 active:scale-95`}
                        title={isSoundEnabled ? 'Desativar som de alerta' : 'Ativar som de alerta'}
                    >
                        {isSoundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                    </button>

                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold transition-all shadow-md dark:shadow-blue-900/30 active:scale-95"
                    >
                        <Plus size={20} />
                        Novo Chamado
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 lg:p-10">
                {activeSubTab === 'painel' && <DashboardPanel stats={stats} />}
                {activeSubTab === 'chamados' && <TicketManagement tickets={tickets} loading={loading} onView={handleViewDossier} onRefresh={loadTickets} />}
                {activeSubTab === 'drive' && <TECDrive />}
                {activeSubTab === 'base' && <KnowledgeBase />}
            </div>

            {isDossierOpen && selectedTicket && (
                <TicketDossierModal
                    ticket={selectedTicket}
                    onClose={() => setIsDossierOpen(false)}
                    onUpdate={async () => {
                        await Promise.all([loadTickets(), loadStats()]);
                        handleViewDossier(selectedTicket.id);
                    }}
                />
            )}

            {isCreateModalOpen && (
                <CreateTicketModal
                    onClose={() => setIsCreateModalOpen(false)}
                    onCreated={async () => {
                        await Promise.all([loadTickets(), loadStats()]);
                        setIsCreateModalOpen(false);
                    }}
                />
            )}
        </div>
    );
};

const KnowledgeBase = () => {
    const [articles, setArticles] = useState<TecticKnowledge[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedArticle, setSelectedArticle] = useState<TecticKnowledge | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingArticle, setEditingArticle] = useState<TecticKnowledge | null>(null);

    // Form state
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('Geral');
    const [tags, setTags] = useState('');
    const [content, setContent] = useState('');

    const loadArticles = async () => {
        setLoading(true);
        try {
            const data = await getTecticKnowledge();
            setArticles(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadArticles();
    }, []);

    const handleOpenModal = (article: TecticKnowledge | null = null) => {
        if (article) {
            setEditingArticle(article);
            setTitle(article.title);
            setCategory(article.category);
            setTags(article.tags || '');
            setContent(article.content);
        } else {
            setEditingArticle(null);
            setTitle('');
            setCategory('Geral');
            setTags('');
            setContent('');
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingArticle) {
                await updateTecticKnowledge(editingArticle.id, { title, content, category, tags });
            } else {
                await createTecticKnowledge({ title, content, category, tags });
            }
            setIsModalOpen(false);
            loadArticles();
            toast.success(editingArticle ? 'Artigo atualizado com sucesso!' : 'Artigo criado com sucesso!');
        } catch (err) {
            toast.error('Erro ao salvar artigo');
        }
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Deseja realmente excluir este artigo?')) {
            try {
                await deleteTecticKnowledge(id);
                loadArticles();
                toast.success('Artigo excluído com sucesso!');
            } catch (err) {
                toast.error('Erro ao excluir artigo');
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-3">
                        <BookOpen className="text-blue-600" size={32} />
                        Base de Conhecimento
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium font-bold uppercase tracking-widest text-[10px]">Documentação técnica e resoluções históricas</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-black transition-all shadow-lg shadow-blue-200 dark:shadow-blue-900/20 active:scale-95"
                >
                    <Plus size={20} />
                    Novo Artigo
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {loading ? (
                    Array(6).fill(0).map((_, i) => (
                        <div key={i} className="h-48 bg-slate-100 rounded-[2rem] animate-pulse" />
                    ))
                ) : articles.length > 0 ? articles.map((article) => (
                    <div
                        key={article.id}
                        className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/5 transition-all cursor-pointer group flex flex-col h-full relative"
                    >
                        <div onClick={() => setSelectedArticle(article)} className="absolute inset-0 z-0"></div>
                        <div className="relative z-10 pointer-events-none mb-4 flex items-start justify-between">
                            <div className="flex flex-wrap gap-2">
                                <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase rounded-full tracking-widest">
                                    {article.category}
                                </span>
                                {article.tags && article.tags.split(',').map((tag, idx) => (
                                    <span key={idx} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold rounded-full">
                                        #{tag.trim()}
                                    </span>
                                ))}
                            </div>
                            <div className="flex gap-2 pointer-events-auto">
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleOpenModal(article); }}
                                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                >
                                    <Settings size={16} />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(article.id); }}
                                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                >
                                    <AlertCircle size={16} />
                                </button>
                            </div>
                        </div>
                        <div onClick={() => setSelectedArticle(article)} className="relative z-10">
                            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                                {article.title}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 mb-6 font-medium leading-relaxed">
                                {article.content}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 pt-4 border-t border-slate-50 dark:border-slate-800 mt-auto relative z-10 pointer-events-none">
                            <img src={`https://ui-avatars.com/api/?name=${article.author_name}`} className="w-6 h-6 rounded-full border border-slate-200 dark:border-slate-700" alt="" />
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{article.author_name}</span>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-full py-24 text-center bg-slate-50 dark:bg-slate-800/50 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                        <BookOpen className="mx-auto text-slate-300 dark:text-slate-700 mb-4" size={48} />
                        <h3 className="text-xl font-black text-slate-400 dark:text-slate-500">Nenhum artigo encontrado</h3>
                        <p className="text-slate-400 dark:text-slate-600 text-sm font-medium">Crie um novo artigo ou resolva chamados para alimentar a base.</p>
                    </div>
                )}
            </div>

            {/* View Article Modal */}
            {selectedArticle && (
                <div className="fixed inset-0 z-[75] flex items-center justify-center p-0 md:p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-4xl h-full md:max-h-[85vh] md:rounded-[3rem] shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 sticky top-0 z-10">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-900/20">
                                    <BookOpen size={24} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{selectedArticle.title}</h3>
                                    <div className="flex gap-2">
                                        <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest">{selectedArticle.category}</p>
                                        {selectedArticle.tags && <p className="text-[10px] text-slate-400 font-bold">| {selectedArticle.tags}</p>}
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setSelectedArticle(null)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400">
                                <Plus className="rotate-45 dark:text-slate-500" size={24} />
                            </button>
                        </div>
                        <div className="p-10 overflow-y-auto whitespace-pre-wrap text-slate-600 dark:text-slate-300 font-medium leading-relaxed text-sm">
                            {selectedArticle.content}
                        </div>
                        <div className="p-8 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between mt-auto">
                            <div className="flex items-center gap-3">
                                <img src={`https://ui-avatars.com/api/?name=${selectedArticle.author_name}`} className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-700 shadow-sm" alt="" />
                                <div>
                                    <p className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">{selectedArticle.author_name}</p>
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">{new Date(selectedArticle.created_at).toLocaleString('pt-BR')}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                                <Eye size={16} />
                                <span className="text-xs font-black uppercase tracking-widest">{selectedArticle.views} visualizações</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-0 md:p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl h-full md:h-auto md:max-h-[90vh] md:rounded-[3rem] shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                                {editingArticle ? 'Editar Artigo' : 'Novo Artigo'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400">
                                <Plus className="rotate-45 dark:text-slate-500" size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-8 space-y-4 overflow-y-auto max-h-[60vh]">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Título</label>
                                    <input
                                        required
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold dark:text-slate-100 dark:placeholder:text-slate-500"
                                        placeholder="Ex: Como configurar VPN"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Categoria</label>
                                    <select
                                        value={category}
                                        onChange={e => setCategory(e.target.value)}
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold dark:text-slate-100"
                                    >
                                        <option>Geral</option>
                                        <option>Hardware</option>
                                        <option>Software</option>
                                        <option>Rede</option>
                                        <option>Sistemas</option>
                                        <option>Segurança</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Tags (separadas por vírgula)</label>
                                <input
                                    value={tags}
                                    onChange={e => setTags(e.target.value)}
                                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold dark:text-slate-100 dark:placeholder:text-slate-500"
                                    placeholder="vpn, acesso remoto, redes"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Conteúdo da Solução</label>
                                <textarea
                                    required
                                    value={content}
                                    onChange={e => setContent(e.target.value)}
                                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none h-48 transition-all font-medium dark:text-slate-100 dark:placeholder:text-slate-500"
                                    placeholder="Descreva detalhadamente a solução..."
                                />
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-2xl text-sm font-black text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all uppercase tracking-widest">
                                    Cancelar
                                </button>
                                <button type="submit" className="px-10 py-3 bg-blue-600 text-white rounded-2xl text-sm font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 dark:shadow-blue-900/20 uppercase tracking-widest">
                                    {editingArticle ? 'Salvar Alterações' : 'Criar Artigo'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const SubNavLink: React.FC<{ icon: any, label: string, active: boolean, onClick: () => void }> = ({ icon, label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all font-bold text-sm whitespace-nowrap ${active ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700/50'
            }`}
    >
        {icon}
        {label}
    </button>
);

const DashboardPanel: React.FC<{ stats: any }> = ({ stats }) => {
    const [chartView, setChartView] = useState<'categoria' | 'semana' | 'mes' | 'ano'>('categoria');
    const [deptView, setDeptView] = useState<'semana' | 'mes' | 'ano'>('semana');
    const [requesterView, setRequesterView] = useState<'semana' | 'mes' | 'ano'>('semana');

    const getChartData = () => {
        if (!stats) return [];
        switch (chartView) {
            case 'semana':
                const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                const weekData = Array(7).fill(0).map((_, i) => ({ label: weekdays[i], count: 0 }));
                (stats.byWeekday || []).forEach((row: any) => {
                    const day = parseInt(row.day);
                    if (weekData[day]) weekData[day].count = row.count;
                });
                return weekData;
            case 'mes':
                const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                const monthData = Array(12).fill(0).map((_, i) => ({ label: months[i], count: 0 }));
                (stats.byMonth || []).forEach((row: any) => {
                    const m = parseInt(row.month) - 1;
                    if (monthData[m]) monthData[m].count = row.count;
                });
                return monthData;
            case 'ano':
                return (stats.byYear || []).map((row: any) => ({ label: row.year, count: row.count }));
            case 'categoria':
            default:
                return (stats.categories || []).map((cat: any) => ({ label: cat.category, count: cat.count }));
        }
    };

    const getDeptData = () => {
        if (!stats) return [];
        switch (deptView) {
            case 'semana': return stats.byDeptWeek || [];
            case 'mes': return stats.byDeptMonth || [];
            case 'ano': return stats.byDeptYear || [];
            default: return stats.byDeptWeek || [];
        }
    };

    const getRequestersData = () => {
        if (!stats) return [];
        switch (requesterView) {
            case 'semana': return stats.topRequestersWeek || [];
            case 'mes': return stats.topRequestersMonth || [];
            case 'ano': return stats.topRequestersYear || [];
            default: return stats.topRequestersWeek || [];
        }
    };

    const chartData = getChartData();
    const maxVal = Math.max(...(chartData.map(d => d.count) || [0]), 1);
    const deptData = getDeptData();
    const maxDeptVal = Math.max(...(deptData.map((d: any) => d.count) || [0]), 1);
    const requesterData = getRequestersData();
    const maxReqVal = Math.max(...(requesterData.map((d: any) => d.count) || [0]), 1);

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <StatCard label="Total de Chamados" value={stats?.cards?.total || 0} icon={<Ticket className="text-blue-500" />} color="bg-blue-50 dark:bg-blue-900/20" />
                <StatCard label="Chamados Ativos" value={stats?.cards?.active || 0} icon={<Clock className="text-orange-500" />} color="bg-orange-50 dark:bg-orange-900/20" />
                <StatCard label="Resolvidos Hoje" value={stats?.cards?.resolved || 0} icon={<CheckCircle2 className="text-green-500" />} color="bg-green-50 dark:bg-green-900/20" />
                <StatCard label="Urgentes" value={stats?.cards?.urgent || 0} icon={<AlertCircle className="text-red-500" />} color="bg-red-50 dark:bg-red-900/20" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Charts Area Placeholder */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Top de Atendimentos</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Distribuição histórica de chamados</p>
                        </div>
                        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-100 dark:border-slate-700">
                            {[
                                { id: 'categoria', label: 'Categoria' },
                                { id: 'semana', label: 'Semana' },
                                { id: 'mes', label: 'Mês' },
                                { id: 'ano', label: 'Ano' }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setChartView(tab.id as any)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${chartView === tab.id
                                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    {/* Category Chart with visible values */}
                    <div className="h-64 flex items-end justify-between gap-2 px-4">
                        {chartData.map((data, i) => (
                            <div key={i} className="flex-1 h-full flex flex-col items-center justify-end gap-2 group">
                                <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{data.count}</span>
                                <div
                                    className="w-full bg-blue-500 rounded-t-xl transition-all duration-500 group-hover:bg-blue-600 group-hover:scale-x-105 relative"
                                    style={{ height: `${(data.count / maxVal) * 80}%`, minHeight: '4px' }}
                                >
                                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-black text-slate-400 lg:group-hover:hidden">
                                        {data.count > 0 ? data.count : ''}
                                    </div>
                                </div>
                                <span className={`text-[9px] font-bold text-slate-400 mt-2 truncate w-full text-center transition-all ${chartView === 'categoria' ? 'rotate-45 lg:rotate-0' : ''}`}>
                                    {data.label}
                                </span>
                            </div>
                        ))}
                        {(!chartData || chartData.length === 0) && (
                            <div className="w-full h-full flex items-center justify-center text-slate-300 font-bold italic">Aguardando dados...</div>
                        )}
                    </div>
                </div>

                {/* Ranking de Técnicos */}
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
                        <Users className="text-blue-600 dark:text-blue-400" size={22} />
                        Top Resolutores
                    </h3>
                    <div className="space-y-4">
                        {(stats?.topResolvers || []).map((tec: any, i: number) => (
                            <div key={i} className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 transition-all hover:bg-blue-50/50 dark:hover:bg-blue-900/20">
                                <div className="relative">
                                    <img
                                        src={tec.technician_avatar || `https://ui-avatars.com/api/?name=${tec.technician_name}`}
                                        className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
                                        alt=""
                                    />
                                    <div className="absolute -top-1 -left-1 w-5 h-5 bg-blue-600 text-[10px] font-black text-white rounded-full flex items-center justify-center border-2 border-white">
                                        {i + 1}
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{tec.technician_name.split(' ')[0]}</p>
                                    <div className="w-full h-1.5 bg-slate-200 rounded-full mt-1.5 overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                                            style={{ width: `${(tec.count / (stats?.topResolvers[0]?.count || 1)) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-black text-blue-600 dark:text-blue-400">{tec.count}</p>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase">Resolvidos</p>
                                </div>
                            </div>
                        ))}

                        {(!stats?.topResolvers || stats.topResolvers.length === 0) && (
                            <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-3">
                                <Users size={40} className="opacity-10" />
                                <p className="text-xs font-bold italic">Nenhum chamado resolvido ainda</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Top Solicitantes */}
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <Users className="text-blue-600 dark:text-blue-400" size={22} />
                            Top Solicitantes
                        </h3>
                        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-100 dark:border-slate-700 scale-90 md:scale-100">
                            {[
                                { id: 'semana', label: 'Semana' },
                                { id: 'mes', label: 'Mês' },
                                { id: 'ano', label: 'Ano' }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setRequesterView(tab.id as any)}
                                    className={`px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${requesterView === tab.id
                                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-4">
                        {requesterData.map((req: any, i: number) => (
                            <div key={i} className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 transition-all hover:bg-blue-50/50 dark:hover:bg-blue-900/20">
                                <div className="relative">
                                    <img
                                        src={req.requester_avatar || `https://ui-avatars.com/api/?name=${req.requester_name}`}
                                        className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
                                        alt=""
                                    />
                                    <div className="absolute -top-1 -left-1 w-5 h-5 bg-blue-600 text-[10px] font-black text-white rounded-full flex items-center justify-center border-2 border-white">
                                        {i + 1}
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{req.requester_name.split(' ')[0]}</p>
                                    <div className="w-full h-1.5 bg-slate-200 rounded-full mt-1.5 overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                                            style={{ width: `${(req.count / maxReqVal) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-black text-blue-600 dark:text-blue-400">{req.count}</p>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase">Abertos</p>
                                </div>
                            </div>
                        ))}

                        {(!requesterData || requesterData.length === 0) && (
                            <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-3">
                                <Users size={40} className="opacity-10" />
                                <p className="text-xs font-bold italic">Nenhum chamado aberto ainda</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Chamados por Departamento */}
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <HardDrive className="text-blue-600 dark:text-blue-400" size={22} />
                            Top Departamento
                        </h3>
                        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-100 dark:border-slate-700 scale-90 md:scale-100">
                            {[
                                { id: 'semana', label: 'Semana' },
                                { id: 'mes', label: 'Mês' },
                                { id: 'ano', label: 'Ano' }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setDeptView(tab.id as any)}
                                    className={`px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${deptView === tab.id
                                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-4">
                        {deptData.map((dept: any, i: number) => (
                            <div key={i} className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 transition-all hover:bg-blue-50/50 dark:hover:bg-blue-900/20">
                                <div className="flex-1">
                                    <p className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">{dept.department || 'N/A'}</p>
                                    <div className="w-full h-2 bg-slate-200 rounded-full mt-2 overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                                            style={{ width: `${(dept.count / maxDeptVal) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-black text-blue-600 dark:text-blue-400">{dept.count}</p>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase">Chamados</p>
                                </div>
                            </div>
                        ))}

                        {(deptData.length === 0) && (
                            <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-3">
                                <HardDrive size={40} className="opacity-10" />
                                <p className="text-xs font-bold italic">Nenhum chamado neste período</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

const StatCard: React.FC<{ label: string, value: any, icon: any, trend?: string, color: string }> = ({ label, value, icon, trend, color }) => (
    <div className={`bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-4 transition-all hover:shadow-lg hover:-translate-y-1`}>
        <div className="flex items-center justify-between">
            <div className={`p-3 rounded-2xl ${color}`}>
                {icon}
            </div>
            {trend && (
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${trend.startsWith('+') ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                    {trend}
                </span>
            )}
        </div>
        <div>
            <p className="text-3xl font-black text-slate-900 dark:text-slate-100 leading-none">{value}</p>
            <p className="text-sm font-bold text-slate-400 dark:text-slate-500 mt-2 uppercase tracking-wide">{label}</p>
        </div>
    </div>
);

const TicketManagement: React.FC<{ tickets: TecticTicket[], loading: boolean, onView: (id: number) => void, onRefresh: () => void }> = ({ tickets, loading, onView, onRefresh }) => {
    const [filter, setFilter] = useState('Todos');
    const [selectedTickets, setSelectedTickets] = useState<number[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);

    const filteredTickets = filter === 'Todos' ? tickets : tickets.filter(t => t.status === filter);

    const toggleSelectAll = () => {
        if (selectedTickets.length === filteredTickets.length) {
            setSelectedTickets([]);
        } else {
            setSelectedTickets(filteredTickets.map(t => t.id));
        }
    };

    const toggleSelectTicket = (id: number) => {
        if (selectedTickets.includes(id)) {
            setSelectedTickets(selectedTickets.filter(tid => tid !== id));
        } else {
            setSelectedTickets([...selectedTickets, id]);
        }
    };

    const handleDelete = async () => {
        if (selectedTickets.length === 0) return;
        if (!confirm(`Tem certeza que deseja deletar ${selectedTickets.length} chamado(s)?`)) return;

        setIsDeleting(true);
        try {
            await deleteTecticTickets(selectedTickets);
            setSelectedTickets([]);
            onRefresh();
            toast.success(`${selectedTickets.length} chamado(s) deletado(s)`);
        } catch (error) {
            console.error('Error deleting tickets:', error);
            toast.error('Erro ao deletar chamados');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900 md:rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in duration-700">
            <div className="p-4 md:p-8 border-b border-slate-100 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
                <div className="flex items-center justify-between w-full xl:w-auto gap-6">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Gestão de Chamados</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Fila de atendimento em tempo real</p>
                    </div>
                    {selectedTickets.length > 0 && (
                        <button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all animate-in zoom-in-95 duration-200"
                        >
                            <Trash2 size={16} />
                            <span className="hidden sm:inline">Deletar </span>({selectedTickets.length})
                        </button>
                    )}
                </div>

                <div className="flex flex-col md:flex-row items-center gap-4 w-full xl:w-auto">
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por ID, usuário..."
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500 dark:text-slate-100 dark:placeholder:text-slate-500"
                        />
                    </div>
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="w-full md:w-auto bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-300 p-3 pr-10 focus:ring-2 focus:ring-blue-500"
                    >
                        <option>Todos</option>
                        <option>Aberto</option>
                        <option>Em Atendimento</option>
                        <option>Resolvido</option>
                    </select>
                </div>
            </div>

            <div className="overflow-x-auto">
                {/* Mobile/Card View */}
                <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                    {loading ? (
                        Array(3).fill(0).map((_, i) => (
                            <div key={i} className="p-4 animate-pulse space-y-3">
                                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/4"></div>
                                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-full"></div>
                                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/2"></div>
                            </div>
                        ))
                    ) : filteredTickets.length > 0 ? filteredTickets.map((ticket) => (
                        <div key={ticket.id} className="p-4 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 dark:bg-slate-800"
                                        checked={selectedTickets.includes(ticket.id)}
                                        onChange={() => toggleSelectTicket(ticket.id)}
                                    />
                                    <span className="text-sm font-black text-blue-600 dark:text-blue-400">#{ticket.id}</span>
                                </div>
                                <StatusBadge status={ticket.status} />
                            </div>
                            <div className="flex items-center gap-3 mb-4">
                                <img src={ticket.requester_avatar || `https://ui-avatars.com/api/?name=${ticket.requester_name}`} className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700" alt="" />
                                <div>
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{ticket.requester_name}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">{ticket.requester_dept || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="mb-4">
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{ticket.title}</p>
                                <p className="text-xs text-slate-400 dark:text-slate-500">{ticket.category} • <PriorityBadge priority={ticket.priority} /></p>
                            </div>
                            <button
                                onClick={() => onView(ticket.id)}
                                className="w-full flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500 text-blue-600 dark:text-blue-400 py-3 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                            >
                                Ver Dossiê
                                <ArrowUpRight size={14} />
                            </button>
                        </div>
                    )) : (
                        <div className="p-10 text-center text-slate-400 font-bold">
                            Nenhum chamado encontrado
                        </div>
                    )}
                </div>

                {/* Desktop/Table View */}
                <table className="hidden md:table w-full text-left">
                    <thead>
                        <tr className="bg-slate-50/50 dark:bg-slate-800/50">
                            <th className="px-8 py-5">
                                <input
                                    type="checkbox"
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    checked={selectedTickets.length === filteredTickets.length && filteredTickets.length > 0}
                                    onChange={toggleSelectAll}
                                />
                            </th>
                            <th className="px-4 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">ID</th>
                            <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Solicitante</th>
                            <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Departamento</th>
                            <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Assunto</th>
                            <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Prioridade</th>
                            <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Resolvido por</th>
                            <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                            <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {loading ? (
                            Array(5).fill(0).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan={9} className="px-8 py-6 h-16 bg-slate-50/20 dark:bg-slate-800/20"></td>
                                </tr>
                            ))
                        ) : filteredTickets.length > 0 ? filteredTickets.map((ticket) => (
                            <tr key={ticket.id} className={`hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors group ${selectedTickets.includes(ticket.id) ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}>
                                <td className="px-8 py-6">
                                    <input
                                        type="checkbox"
                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        checked={selectedTickets.includes(ticket.id)}
                                        onChange={() => toggleSelectTicket(ticket.id)}
                                    />
                                </td>
                                <td className="px-4 py-6">
                                    <span className="text-sm font-black text-slate-400 group-hover:text-blue-600 transition-colors">#{ticket.id}</span>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-3">
                                        <img src={ticket.requester_avatar || `https://ui-avatars.com/api/?name=${ticket.requester_name}`} className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-700" alt="" />
                                        <div>
                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{ticket.requester_name}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{ticket.requester_dept || 'N/A'}</span>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="max-w-[200px]">
                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{ticket.title}</p>
                                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{ticket.category}</p>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <PriorityBadge priority={ticket.priority} />
                                </td>
                                <td className="px-8 py-6">
                                    {ticket.status === 'Resolvido' ? (
                                        <div className="flex items-center gap-2">
                                            <img src={`https://ui-avatars.com/api/?name=${ticket.resolver_name || 'TI'}`} className="w-6 h-6 rounded-full border border-slate-200 dark:border-slate-700" alt="" />
                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{ticket.resolver_name || 'Técnico'}</span>
                                        </div>
                                    ) : (
                                        <span className="text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest italic">Aguardando...</span>
                                    )}
                                </td>
                                <td className="px-8 py-6">
                                    <StatusBadge status={ticket.status} />
                                </td>
                                <td className="px-8 py-6 text-right">
                                    <button
                                        onClick={() => onView(ticket.id)}
                                        className="inline-flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:shadow-sm"
                                    >
                                        Ver Dossiê
                                        <ArrowUpRight size={14} />
                                    </button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={9} className="px-8 py-20 text-center text-slate-400 font-bold">
                                    <Ticket size={48} className="mx-auto opacity-20 mb-4" />
                                    Nenhum chamado encontrado
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};


const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => {
    const colors: any = {
        'Baixa': 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
        'Média': 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
        'Alta': 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
        'Crítica': 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
    };
    return <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${colors[priority] || colors['Baixa']}`}>{priority}</span>;
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const colors: any = {
        'Aberto': 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
        'Em Atendimento': 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
        'Resolvido': 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
        'Pendente': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
        'Cancelado': 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
    };
    return <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${colors[status] || colors['Aberto']}`}>{status}</span>;
}

const TicketDossierModal: React.FC<{ ticket: TecticTicket, onClose: () => void, onUpdate: () => void }> = ({ ticket, onClose, onUpdate }) => {
    const [newComment, setNewComment] = useState('');
    const [isInternal, setIsInternal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [solution, setSolution] = useState(ticket.solution || '');
    const [addToKB, setAddToKB] = useState(false);

    const handleSendComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        setIsSubmitting(true);
        try {
            await addTecticComment(ticket.id, newComment, isInternal);
            setNewComment('');
            onUpdate();
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateStatus = async (newStatus: string) => {
        try {
            await updateTecticTicket(ticket.id, {
                status: newStatus,
                solution: newStatus === 'Resolvido' ? solution : undefined,
                add_to_kb: newStatus === 'Resolvido' ? addToKB : false
            });
            onUpdate();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 md:p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 w-full max-w-6xl h-full md:h-[90vh] md:rounded-[3rem] shadow-2xl flex flex-col md:flex-row overflow-hidden border border-slate-200 dark:border-slate-800">
                {/* Left: Info */}
                <div className="w-full md:w-1/3 bg-slate-50 dark:bg-slate-800/50 p-6 md:p-10 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 flex flex-col gap-6 md:gap-8 overflow-y-auto">
                    <div>
                        <button onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 mb-6 font-bold flex items-center gap-2">
                            Sair do Dossiê
                        </button>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-2">#{ticket.id} - {ticket.title}</h2>
                        <StatusBadge status={ticket.status} />
                    </div>

                    <div className="space-y-8">
                        <section>
                            <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Solicitante</h4>
                            <div className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                                <img src={ticket.requester_avatar || `https://ui-avatars.com/api/?name=${ticket.requester_name}`} className="w-12 h-12 rounded-full border border-slate-200 dark:border-slate-700" alt="" />
                                <div>
                                    <p className="font-bold text-slate-800 dark:text-slate-100">{ticket.requester_name}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{ticket.requester_email}</p>
                                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-1">{ticket.requester_dept}</p>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Descrição do Problema</h4>
                            <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed italic">{ticket.description}</p>
                            </div>
                        </section>

                        <section>
                            <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Classificação Técnica</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 text-center flex flex-col items-center">
                                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Categoria</label>
                                    <select
                                        value={ticket.category}
                                        onChange={(e) => {
                                            updateTecticTicket(ticket.id, { category: e.target.value }).then(onUpdate);
                                        }}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-black rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500 transition-all outline-none cursor-pointer hover:border-blue-300 dark:hover:border-blue-500"
                                    >
                                        <option>Hardware</option>
                                        <option>Software</option>
                                        <option>Rede</option>
                                        <option>Sistemas</option>
                                        <option>Telefonia</option>
                                        <option>Outros</option>
                                    </select>
                                </div>
                                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 text-center flex flex-col items-center">
                                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Prioridade</label>
                                    <select
                                        value={ticket.priority}
                                        onChange={(e) => {
                                            updateTecticTicket(ticket.id, { priority: e.target.value }).then(onUpdate);
                                        }}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-black rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500 transition-all outline-none text-center appearance-none cursor-pointer hover:border-blue-300 dark:hover:border-blue-500"
                                    >
                                        <option>Baixa</option>
                                        <option>Média</option>
                                        <option>Alta</option>
                                        <option>Crítica</option>
                                    </select>
                                </div>
                                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 text-center flex flex-col items-center">
                                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Nível</label>
                                    <select
                                        value={ticket.support_level}
                                        onChange={(e) => {
                                            updateTecticTicket(ticket.id, { support_level: e.target.value }).then(onUpdate);
                                        }}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 text-xs font-black rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500 transition-all outline-none text-center appearance-none cursor-pointer hover:border-blue-300 dark:hover:border-blue-500"
                                    >
                                        <option>L1</option>
                                        <option>L2</option>
                                        <option>L3</option>
                                    </select>
                                </div>
                            </div>
                        </section>

                        {ticket.status === 'Resolvido' && ticket.resolver_name && (
                            <section>
                                <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Resolvido por</h4>
                                <div className="flex items-center gap-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-100 dark:border-green-800/50 shadow-sm">
                                    <img src={`https://ui-avatars.com/api/?name=${ticket.resolver_name}`} className="w-12 h-12 rounded-full border border-white dark:border-slate-700" alt="" />
                                    <div>
                                        <p className="font-bold text-green-800 dark:text-green-100">{ticket.resolver_name}</p>
                                        <p className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-widest">Técnico Responsável</p>
                                    </div>
                                </div>
                            </section>
                        )}
                    </div>

                    {ticket.status !== 'Resolvido' && (
                        <div className="mt-auto space-y-3">
                            <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Solução do Chamado</h4>
                            <textarea
                                value={solution}
                                onChange={(e) => setSolution(e.target.value)}
                                placeholder="Descreva como resolveu o problema..."
                                className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:ring-2 focus:ring-green-500 outline-none h-24 transition-all dark:text-slate-100"
                            />
                            <div className="flex items-center gap-3 px-2">
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={addToKB}
                                        onChange={e => setAddToKB(e.target.checked)}
                                        className="rounded text-blue-600 focus:ring-blue-500"
                                    />
                                    Transformar em Base de Conhecimento
                                </label>
                            </div>
                            <button
                                onClick={() => handleUpdateStatus('Resolvido')}
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-green-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <CheckCircle2 size={20} />
                                Finalizar Chamado
                            </button>
                        </div>
                    )}
                </div>

                {/* Right: Timeline/Chat */}
                <div className="flex-1 flex flex-col bg-white dark:bg-slate-900">
                    <div className="p-10 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Histórico e Interações</h3>
                        <div className="flex gap-2">
                            {['Aberto', 'Em Atendimento', 'Pendente'].map(s => (
                                <button
                                    key={s}
                                    onClick={() => handleUpdateStatus(s)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${ticket.status === s ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-10 space-y-8 bg-slate-50/30 dark:bg-slate-800/10">
                        {ticket.comments?.map((c, i) => (
                            <div key={i} className={`flex gap-4 ${c.user_role === 'ADMIN' ? 'flex-row-reverse' : ''}`}>
                                <img src={c.user_avatar} className="w-9 h-9 rounded-full shadow-sm border border-slate-100 dark:border-slate-700" alt="" />
                                <div className={`max-w-[80%] flex flex-col ${c.user_role === 'ADMIN' ? 'items-end' : ''}`}>
                                    <div className={`p-4 rounded-2xl shadow-sm border ${c.is_internal ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/30 italic dark:text-amber-200' :
                                        c.user_role === 'ADMIN' ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-900/10' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 dark:text-slate-200'
                                        }`}>
                                        {c.is_internal && <span className="block text-[8px] font-bold uppercase mb-2 dark:text-amber-400">Comentário Interno</span>}
                                        <p className="text-sm leading-relaxed">{c.comment}</p>
                                    </div>
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-bold uppercase tracking-wider">
                                        {c.user_name} • {new Date(c.created_at).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-8 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                        <form onSubmit={handleSendComment} className="flex flex-col gap-4">
                            <div className="flex items-center gap-3 px-2">
                                <label className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isInternal}
                                        onChange={e => setIsInternal(e.target.checked)}
                                        className="rounded text-amber-600 focus:ring-amber-500 dark:bg-slate-800 dark:border-slate-700"
                                    />
                                    Modo Interno (Apenas Equipe T.I)
                                </label>
                            </div>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={newComment}
                                    onChange={e => setNewComment(e.target.value)}
                                    placeholder="Digite sua mensagem ou observação..."
                                    className="w-full pl-6 pr-20 py-5 bg-slate-100 dark:bg-slate-800 border-none rounded-[2rem] text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
                                />
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !newComment.trim()}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 transition-all disabled:opacity-50 shadow-md active:scale-90"
                                >
                                    <Send size={20} />
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const CreateTicketModal: React.FC<{ onClose: () => void, onCreated: () => void }> = ({ onClose, onCreated }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'Hardware',
        priority: 'Baixa',
        support_level: 'L1'
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createTecticTicket(formData);
            onCreated();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 md:p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in zoom-in-95 duration-300">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl h-full md:h-auto md:max-h-[90vh] md:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border border-slate-300 dark:border-slate-800">
                <div className="p-6 md:p-10 border-b border-slate-100 dark:border-slate-800 flex items-center gap-4">
                    <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-900/20">
                        <Ticket size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Chamado Técnico</h2>
                        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium">Abertura de ticket no ServiceDesk</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 md:p-10 space-y-6 overflow-y-auto">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Assunto / Título</label>
                        <input
                            required
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Ex: Impressora do RH não está funcionando"
                            className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-slate-100 dark:placeholder:text-slate-500"
                        />
                    </div>

                    <div className="space-y-4">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Descrição do Problema</label>
                        <textarea
                            required
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            rows={4}
                            placeholder="Descreva o problema com o máximo de detalhes possível..."
                            className="w-full p-6 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-slate-100 dark:placeholder:text-slate-500"
                        />
                    </div>


                    <div className="pt-2">
                        <button
                            type="button"
                            onClick={() => {
                                window.open(window.location.pathname + '?tab=faq', '_blank');
                            }}
                            className="w-full h-12 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider transition-all"
                        >
                            <BookOpen size={18} />
                            Consultar Base de Conhecimento
                        </button>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-8 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-2xl font-black transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-[2] px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black shadow-xl shadow-blue-100 dark:shadow-blue-900/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                        >
                            <ArrowUpRight size={20} />
                            Abrir Chamado
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const TECDrive: React.FC = () => {
    const [files, setFiles] = useState<TecticFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('Todos');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadFiles();
    }, []);

    const loadFiles = async () => {
        setLoading(true);
        try {
            const data = await getTecticDrive();
            setFiles(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        const file = e.target.files[0];
        const type = prompt('Tipo de arquivo (Instalador, Documento, Script)?') || 'Outros';

        try {
            await uploadTecticFile(file, type);
            loadFiles();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Deseja excluir este arquivo permanentemente?')) {
            try {
                await deleteTecticFile(id);
                loadFiles();
                toast.success('Arquivo excluído');
            } catch (err) {
                toast.error('Erro ao excluir arquivo');
            }
        }
    };

    const handleRename = async (id: number, currentName: string) => {
        const newName = prompt('Novo nome do arquivo:', currentName);
        if (newName && newName !== currentName) {
            try {
                await renameTecticFile(id, newName);
                loadFiles();
                toast.success('Arquivo renomeado');
            } catch (err) {
                toast.error('Erro ao renomear arquivo');
            }
        }
    };

    const filteredFiles = files.filter(f => {
        const matchesType = filter === 'Todos' || f.file_type === filter;
        const matchesSearch = f.original_name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesType && matchesSearch;
    });


    const FileIcon = ({ type, size = 48 }: { type: string, size?: number }) => {
        if (type === 'Instalador') return <Monitor size={size} strokeWidth={1.5} />;
        if (type === 'Documento') return <FileText size={size} strokeWidth={1.5} />;
        return <Terminal size={size} strokeWidth={1.5} />;
    };

    return (
        <div className="animate-in fade-in slide-in-from-right-4 duration-700">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
                <div className="p-8 lg:p-10 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col xl:flex-row items-center justify-between gap-8">
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-1">TEC-Drive</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Repositório de Ferramentas e Documentos</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar arquivos..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500 dark:text-slate-100 outline-none transition-all shadow-sm"
                            />
                        </div>

                        <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            {['Todos', 'Instalador', 'Documento', 'Script'].map(t => (
                                <button
                                    key={t}
                                    onClick={() => setFilter(t)}
                                    className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${filter === t ? 'bg-blue-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-slate-100 dark:bg-slate-700 text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                            >
                                <LayoutGrid size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-slate-100 dark:bg-slate-700 text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                            >
                                <List size={18} />
                            </button>
                        </div>


                        <label className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-[1.25rem] flex items-center gap-2 font-black transition-all shadow-lg shadow-blue-50 dark:shadow-blue-900/20 cursor-pointer active:scale-95">
                            <Plus size={20} />
                            Upload
                            <input type="file" className="hidden" onChange={handleUpload} />
                        </label>
                    </div>
                </div>

                {/* Storage Capacity Bar */}
                {(() => {
                    const totalSize = files.reduce((acc, f) => acc + f.file_size, 0);
                    const QUOTA = 50 * 1024 * 1024 * 1024; // 50 GB

                    const installerSize = files.filter(f => f.file_type === 'Instalador').reduce((acc, f) => acc + f.file_size, 0);
                    const docSize = files.filter(f => f.file_type === 'Documento').reduce((acc, f) => acc + f.file_size, 0);
                    const otherSize = totalSize - installerSize - docSize;

                    const installerPct = (installerSize / QUOTA) * 100;
                    const docPct = (docSize / QUOTA) * 100;
                    const otherPct = (otherSize / QUOTA) * 100;

                    const formatSize = (bytes: number) => {
                        if (bytes === 0) return '0 B';
                        const k = 1024;
                        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
                        const i = Math.floor(Math.log(bytes) / Math.log(k));
                        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
                    };

                    return (
                        <div className="px-10 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-6">
                            <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
                                <div
                                    className="bg-blue-500 h-full rounded-l-full shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-1000"
                                    style={{ width: `${installerPct}%` }}
                                ></div>
                                <div
                                    className="bg-purple-500 h-full border-l-2 border-white transition-all duration-1000"
                                    style={{ width: `${docPct}%` }}
                                ></div>
                                <div
                                    className="bg-emerald-500 h-full border-l-2 border-white transition-all duration-1000"
                                    style={{ width: `${otherPct}%` }}
                                ></div>
                            </div>
                            <p className="text-xs font-black text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-widest">
                                {formatSize(totalSize)} <span className="text-slate-300 dark:text-slate-600">/ 50 GB Utilizado</span>
                            </p>
                        </div>
                    );
                })()}


                <div className="flex-1 p-10 overflow-y-auto max-h-[600px]">
                    {loading ? (
                        <div className={viewMode === 'grid' ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8" : "space-y-4"}>
                            {Array(8).fill(0).map((_, i) => (
                                <div key={i} className={viewMode === 'grid' ? "aspect-square bg-slate-50 dark:bg-slate-800 rounded-3xl animate-pulse" : "h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl animate-pulse"}></div>
                            ))}
                        </div>
                    ) : filteredFiles.length > 0 ? (
                        viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-8">
                                {filteredFiles.map((file) => (
                                    <div key={file.id} className="group bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all flex flex-col items-center text-center relative overflow-hidden">
                                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                            <button
                                                onClick={() => handleRename(file.id, file.original_name)}
                                                className="p-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-sm rounded-xl text-slate-400 hover:text-blue-600 transition-colors"
                                            >
                                                <Settings size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(file.id)}
                                                className="p-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-sm rounded-xl text-slate-400 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                        <div className={`p-6 rounded-3xl mb-5 transition-transform group-hover:scale-110 ${file.file_type === 'Instalador' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                                            file.file_type === 'Documento' ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                            }`}>
                                            <FileIcon type={file.file_type} />
                                        </div>
                                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1 truncate w-full px-2" title={file.original_name}>
                                            {file.original_name}
                                        </h4>
                                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">{(file.file_size / 1024 / 1024).toFixed(1)} MB</p>
                                        <button
                                            onClick={() => window.open(`http://localhost:3002/uploads/tectic/${file.name}`)}
                                            className="w-full bg-slate-50 dark:bg-slate-700 group-hover:bg-blue-600 dark:group-hover:bg-blue-600 group-hover:text-white text-slate-500 dark:text-slate-400 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 group-hover:shadow-lg group-hover:shadow-blue-200"
                                        >
                                            <Download size={14} />
                                            Baixar
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {filteredFiles.map((file) => (
                                    <div key={file.id} className="group bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-500 hover:shadow-md transition-all flex items-center gap-6">
                                        <div className={`p-3 rounded-xl ${file.file_type === 'Instalador' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                                            file.file_type === 'Documento' ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                            }`}>
                                            <FileIcon type={file.file_type} size={24} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate" title={file.original_name}>{file.original_name}</h4>
                                            <div className="flex items-center gap-3 text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                                                <span>{file.file_type}</span>
                                                <span className="w-1 h-1 bg-slate-200 dark:bg-slate-700 rounded-full"></span>
                                                <span>{(file.file_size / 1024 / 1024).toFixed(1)} MB</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => window.open(`http://localhost:3002/uploads/tectic/${file.name}`)}
                                                className="p-2.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-all"
                                                title="Baixar"
                                            >
                                                <Download size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleRename(file.id, file.original_name)}
                                                className="p-2.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-all"
                                                title="Renomear"
                                            >
                                                <Settings size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(file.id)}
                                                className="p-2.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all"
                                                title="Excluir"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : (
                        <div className="col-span-full py-20 text-center text-slate-300">
                            <HardDrive size={64} className="mx-auto opacity-10 mb-6" />
                            <p className="text-xl font-black italic tracking-tight">Vazio, por enquanto...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};



export default ServiceDesk;
