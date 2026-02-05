import React, { useState, useEffect } from 'react';
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
    Trash2
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

    getTriageSuggestions,
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
    const [activeSubTab, setActiveSubTab] = useState('painel');
    const [stats, setStats] = useState<any>(null);
    const [tickets, setTickets] = useState<TecticTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState<TecticTicket | null>(null);
    const [isDossierOpen, setIsDossierOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    useEffect(() => {
        loadStats();
        loadTickets();
    }, []);

    const loadStats = async () => {
        try {
            const data = await getTecticStats();
            setStats(data);
        } catch (err) {
            console.error('Erro ao carregar stats:', err);
        }
    };

    const loadTickets = async () => {
        setLoading(true);
        try {
            const data = await getTecticTickets();
            setTickets(data);
        } catch (err) {
            console.error('Erro ao carregar chamados:', err);
        } finally {
            setLoading(false);
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
        <div className="flex flex-col h-full bg-slate-50">
            {/* Header / Sub-nav */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10 transition-all duration-300">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
                        <Monitor size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">TEC-TIC</h1>
                        <p className="text-sm text-slate-500 font-medium">Suporte Especializado de TI</p>
                    </div>
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
                    <SubNavLink icon={<LayoutDashboard size={18} />} label="Painel" active={activeSubTab === 'painel'} onClick={() => setActiveSubTab('painel')} />
                    <SubNavLink icon={<Ticket size={18} />} label="Chamados" active={activeSubTab === 'chamados'} onClick={() => setActiveSubTab('chamados')} />
                    <SubNavLink icon={<HardDrive size={18} />} label="TEC-Drive" active={activeSubTab === 'drive'} onClick={() => setActiveSubTab('drive')} />
                    <SubNavLink icon={<BookOpen size={18} />} label="Base" active={activeSubTab === 'base'} onClick={() => setActiveSubTab('base')} />
                    <SubNavLink icon={<Terminal size={18} />} label="Remoto" active={activeSubTab === 'remoto'} onClick={() => setActiveSubTab('remoto')} />
                    <SubNavLink icon={<Users size={18} />} label="Equipe" active={activeSubTab === 'equipe'} onClick={() => setActiveSubTab('equipe')} />
                </div>

                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold transition-all shadow-md active:scale-95"
                >
                    <Plus size={20} />
                    Novo Chamado
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 lg:p-10">
                {activeSubTab === 'painel' && <DashboardPanel stats={stats} />}
                {activeSubTab === 'chamados' && <TicketManagement tickets={tickets} loading={loading} onView={handleViewDossier} onRefresh={loadTickets} />}
                {activeSubTab === 'drive' && <TECDrive />}
                {activeSubTab === 'base' && <KnowledgeBase />}

                {['remoto', 'equipe'].includes(activeSubTab) && <PlaceholderTab label={activeSubTab} />}
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
        } catch (err) {
            alert('Erro ao salvar artigo');
        }
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Deseja realmente excluir este artigo?')) {
            try {
                await deleteTecticKnowledge(id);
                loadArticles();
            } catch (err) {
                alert('Erro ao excluir artigo');
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <BookOpen className="text-blue-600" size={32} />
                        Base de Conhecimento
                    </h2>
                    <p className="text-slate-500 font-medium font-bold uppercase tracking-widest text-[10px]">Documentação técnica e resoluções históricas</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-black transition-all shadow-lg shadow-blue-200 active:scale-95"
                >
                    <Plus size={20} />
                    Novo Artigo
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    Array(6).fill(0).map((_, i) => (
                        <div key={i} className="h-48 bg-slate-100 rounded-[2rem] animate-pulse" />
                    ))
                ) : articles.length > 0 ? articles.map((article) => (
                    <div
                        key={article.id}
                        className="bg-white p-8 rounded-[2rem] border border-slate-200 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/5 transition-all cursor-pointer group flex flex-col h-full relative"
                    >
                        <div onClick={() => setSelectedArticle(article)} className="absolute inset-0 z-0"></div>
                        <div className="relative z-10 pointer-events-none mb-4 flex items-start justify-between">
                            <div className="flex flex-wrap gap-2">
                                <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase rounded-full tracking-widest">
                                    {article.category}
                                </span>
                                {article.tags && article.tags.split(',').map((tag, idx) => (
                                    <span key={idx} className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full">
                                        #{tag.trim()}
                                    </span>
                                ))}
                            </div>
                            <div className="flex gap-2 pointer-events-auto">
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleOpenModal(article); }}
                                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                                >
                                    <Plus className="rotate-45" size={16} /> {/* Using icons from types above, Lucide Plus used as X/Edit elsewhere */}
                                    <Settings size={16} />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(article.id); }}
                                    className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                                >
                                    <AlertCircle size={16} />
                                </button>
                            </div>
                        </div>
                        <div onClick={() => setSelectedArticle(article)} className="relative z-10">
                            <h3 className="text-lg font-black text-slate-800 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                                {article.title}
                            </h3>
                            <p className="text-xs text-slate-500 line-clamp-3 mb-6 font-medium leading-relaxed">
                                {article.content}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 pt-4 border-t border-slate-50 mt-auto relative z-10 pointer-events-none">
                            <img src={`https://ui-avatars.com/api/?name=${article.author_name}`} className="w-6 h-6 rounded-full" alt="" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{article.author_name}</span>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-full py-24 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                        <BookOpen className="mx-auto text-slate-300 mb-4" size={48} />
                        <h3 className="text-xl font-black text-slate-400">Nenhum artigo encontrado</h3>
                        <p className="text-slate-400 text-sm font-medium">Crie um novo artigo ou resolva chamados para alimentar a base.</p>
                    </div>
                )}
            </div>

            {/* View Article Modal */}
            {selectedArticle && (
                <div className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-4xl max-h-[85vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden border border-slate-200 text-slate-800">
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200">
                                    <BookOpen size={24} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">{selectedArticle.title}</h3>
                                    <div className="flex gap-2">
                                        <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest">{selectedArticle.category}</p>
                                        {selectedArticle.tags && <p className="text-[10px] text-slate-400 font-bold">| {selectedArticle.tags}</p>}
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setSelectedArticle(null)} className="p-3 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                                <Plus className="rotate-45" size={24} />
                            </button>
                        </div>
                        <div className="p-10 overflow-y-auto whitespace-pre-wrap text-slate-600 font-medium leading-relaxed text-sm">
                            {selectedArticle.content}
                        </div>
                        <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between mt-auto">
                            <div className="flex items-center gap-3">
                                <img src={`https://ui-avatars.com/api/?name=${selectedArticle.author_name}`} className="w-10 h-10 rounded-full border-2 border-white shadow-sm" alt="" />
                                <div>
                                    <p className="text-xs font-black text-slate-800 uppercase tracking-widest">{selectedArticle.author_name}</p>
                                    <p className="text-[10px] text-slate-400 font-bold">{new Date(selectedArticle.created_at).toLocaleString('pt-BR')}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400">
                                <Eye size={16} />
                                <span className="text-xs font-black uppercase tracking-widest">{selectedArticle.views} visualizações</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl flex flex-col overflow-hidden border border-slate-200">
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                                {editingArticle ? 'Editar Artigo' : 'Novo Artigo'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-slate-100 rounded-full text-slate-400">
                                <Plus className="rotate-45" size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-8 space-y-4 overflow-y-auto max-h-[60vh]">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Título</label>
                                    <input
                                        required
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                                        placeholder="Ex: Como configurar VPN"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Categoria</label>
                                    <select
                                        value={category}
                                        onChange={e => setCategory(e.target.value)}
                                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
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
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Tags (separadas por vírgula)</label>
                                <input
                                    value={tags}
                                    onChange={e => setTags(e.target.value)}
                                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                                    placeholder="vpn, acesso remoto, redes"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Conteúdo da Solução</label>
                                <textarea
                                    required
                                    value={content}
                                    onChange={e => setContent(e.target.value)}
                                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none h-48 transition-all font-medium"
                                    placeholder="Descreva detalhadamente a solução..."
                                />
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-2xl text-sm font-black text-slate-400 hover:bg-slate-50 transition-all uppercase tracking-widest">
                                    Cancelar
                                </button>
                                <button type="submit" className="px-10 py-3 bg-blue-600 text-white rounded-2xl text-sm font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 uppercase tracking-widest">
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
        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all font-bold text-sm ${active ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'
            }`}
    >
        {icon}
        {label}
    </button>
);

const DashboardPanel: React.FC<{ stats: any }> = ({ stats }) => {
    const [chartView, setChartView] = useState<'categoria' | 'semana' | 'mes' | 'ano'>('categoria');
    const [deptView, setDeptView] = useState<'total' | 'semana' | 'mes' | 'ano'>('total');

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
            case 'total':
            default:
                return stats.byDept || [];
        }
    };

    const chartData = getChartData();
    const maxVal = Math.max(...(chartData.map(d => d.count) || [0]), 1);
    const deptData = getDeptData();
    const maxDeptVal = Math.max(...(deptData.map((d: any) => d.count) || [0]), 1);

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard label="Total de Chamados" value={stats?.cards?.total || 0} icon={<Ticket className="text-blue-500" />} trend="+12%" color="bg-blue-50" />
                <StatCard label="Chamados Ativos" value={stats?.cards?.active || 0} icon={<Clock className="text-orange-500" />} trend="-5%" color="bg-orange-50" />
                <StatCard label="Resolvidos Hoje" value={stats?.cards?.resolved || 0} icon={<CheckCircle2 className="text-green-500" />} trend="+3%" color="bg-green-50" />
                <StatCard label="Urgentes" value={stats?.cards?.urgent || 0} icon={<AlertCircle className="text-red-500" />} color="bg-red-50" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Charts Area Placeholder */}
                <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm transition-all hover:shadow-md">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">Volume de Atendimentos</h3>
                            <p className="text-sm text-slate-500 font-medium">Distribuição histórica de chamados</p>
                        </div>
                        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
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
                                        ? 'bg-white text-blue-600 shadow-sm'
                                        : 'text-slate-400 hover:text-slate-600'
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
                                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{data.count}</span>
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
                <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm transition-all hover:shadow-md">
                    <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <Users className="text-blue-600" size={22} />
                        Top Resolutores
                    </h3>
                    <div className="space-y-4">
                        {(stats?.topResolvers || []).map((tec: any, i: number) => (
                            <div key={i} className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-100 transition-all hover:bg-blue-50/50">
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
                                    <p className="text-sm font-bold text-slate-800">{tec.technician_name.split(' ')[0]}</p>
                                    <div className="w-full h-1.5 bg-slate-200 rounded-full mt-1.5 overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                                            style={{ width: `${(tec.count / (stats?.topResolvers[0]?.count || 1)) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-black text-blue-600">{tec.count}</p>
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

                {/* Chamados por Departamento */}
                <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm transition-all hover:shadow-md">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <HardDrive className="text-blue-600" size={22} />
                            Chamados por Departamento
                        </h3>
                        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
                            {[
                                { id: 'total', label: 'Total' },
                                { id: 'semana', label: 'Semana' },
                                { id: 'mes', label: 'Mês' },
                                { id: 'ano', label: 'Ano' }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setDeptView(tab.id as any)}
                                    className={`px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${deptView === tab.id
                                        ? 'bg-white text-blue-600 shadow-sm'
                                        : 'text-slate-400 hover:text-slate-600'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-4">
                        {deptData.map((dept: any, i: number) => (
                            <div key={i} className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-100 transition-all hover:bg-blue-50/50">
                                <div className="flex-1">
                                    <p className="text-xs font-black text-slate-700 uppercase tracking-wider">{dept.department || 'N/A'}</p>
                                    <div className="w-full h-2 bg-slate-200 rounded-full mt-2 overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                                            style={{ width: `${(dept.count / maxDeptVal) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-black text-blue-600">{dept.count}</p>
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
    <div className={`bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-4 transition-all hover:shadow-lg hover:-translate-y-1`}>
        <div className="flex items-center justify-between">
            <div className={`p-3 rounded-2xl ${color}`}>
                {icon}
            </div>
            {trend && (
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${trend.startsWith('+') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {trend}
                </span>
            )}
        </div>
        <div>
            <p className="text-3xl font-black text-slate-900 leading-none">{value}</p>
            <p className="text-sm font-bold text-slate-400 mt-2 uppercase tracking-wide">{label}</p>
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
        } catch (error) {
            console.error('Error deleting tickets:', error);
            alert('Erro ao deletar chamados');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-700">
            <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 tracking-tight">Gestão de Chamados</h3>
                        <p className="text-sm text-slate-500 font-medium">Fila de atendimento em tempo real</p>
                    </div>
                    {selectedTickets.length > 0 && (
                        <button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 hover:bg-red-100 transition-all animate-in zoom-in-95 duration-200"
                        >
                            <Trash2 size={16} />
                            Deletar ({selectedTickets.length})
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por ID, usuário..."
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 p-3 pr-10 focus:ring-2 focus:ring-blue-500"
                    >
                        <option>Todos</option>
                        <option>Aberto</option>
                        <option>Em Atendimento</option>
                        <option>Resolvido</option>
                    </select>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50/50">
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
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            Array(5).fill(0).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan={9} className="px-8 py-6 h-16 bg-slate-50/20"></td>
                                </tr>
                            ))
                        ) : filteredTickets.length > 0 ? filteredTickets.map((ticket) => (
                            <tr key={ticket.id} className={`hover:bg-blue-50/30 transition-colors group ${selectedTickets.includes(ticket.id) ? 'bg-blue-50/50' : ''}`}>
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
                                        <img src={ticket.requester_avatar || `https://ui-avatars.com/api/?name=${ticket.requester_name}`} className="w-9 h-9 rounded-full border border-slate-200" alt="" />
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">{ticket.requester_name}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{ticket.requester_dept || 'N/A'}</span>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="max-w-[200px]">
                                        <p className="text-sm font-bold text-slate-700 truncate">{ticket.title}</p>
                                        <p className="text-xs text-slate-400 truncate">{ticket.category}</p>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <PriorityBadge priority={ticket.priority} />
                                </td>
                                <td className="px-8 py-6">
                                    {ticket.status === 'Resolvido' ? (
                                        <div className="flex items-center gap-2">
                                            <img src={`https://ui-avatars.com/api/?name=${ticket.resolver_name || 'TI'}`} className="w-6 h-6 rounded-full border border-slate-200" alt="" />
                                            <span className="text-xs font-bold text-slate-600">{ticket.resolver_name || 'Técnico'}</span>
                                        </div>
                                    ) : (
                                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">Aguardando...</span>
                                    )}
                                </td>
                                <td className="px-8 py-6">
                                    <StatusBadge status={ticket.status} />
                                </td>
                                <td className="px-8 py-6 text-right">
                                    <button
                                        onClick={() => onView(ticket.id)}
                                        className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:border-blue-300 text-blue-600 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:shadow-sm"
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
        'Baixa': 'bg-slate-100 text-slate-600',
        'Média': 'bg-blue-100 text-blue-600',
        'Alta': 'bg-orange-100 text-orange-600',
        'Crítica': 'bg-red-100 text-red-600'
    };
    return <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${colors[priority] || colors['Baixa']}`}>{priority}</span>;
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const colors: any = {
        'Aberto': 'bg-blue-100 text-blue-600',
        'Em Atendimento': 'bg-purple-100 text-purple-600',
        'Resolvido': 'bg-green-100 text-green-600',
        'Pendente': 'bg-yellow-100 text-yellow-600',
        'Cancelado': 'bg-red-100 text-red-600'
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-6xl h-[90vh] rounded-[3rem] shadow-2xl flex overflow-hidden border border-slate-200">
                {/* Left: Info */}
                <div className="w-1/3 bg-slate-50 p-10 border-r border-slate-200 flex flex-col gap-8 overflow-y-auto">
                    <div>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 mb-6 font-bold flex items-center gap-2">
                            Sair do Dossiê
                        </button>
                        <h2 className="text-2xl font-black text-slate-900 mb-2">#{ticket.id} - {ticket.title}</h2>
                        <StatusBadge status={ticket.status} />
                    </div>

                    <div className="space-y-8">
                        <section>
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Solicitante</h4>
                            <div className="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
                                <img src={ticket.requester_avatar || `https://ui-avatars.com/api/?name=${ticket.requester_name}`} className="w-12 h-12 rounded-full border border-slate-200" alt="" />
                                <div>
                                    <p className="font-bold text-slate-800">{ticket.requester_name}</p>
                                    <p className="text-xs text-slate-500">{ticket.requester_email}</p>
                                    <p className="text-xs font-bold text-blue-600 mt-1">{ticket.requester_dept}</p>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Descrição do Problema</h4>
                            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
                                <p className="text-sm text-slate-600 leading-relaxed italic">{ticket.description}</p>
                            </div>
                        </section>

                        <section>
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Classificação Técnica</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-white rounded-xl border border-slate-100 text-center">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Prioridade</p>
                                    <p className="text-xs font-black text-slate-800 mt-1">{ticket.priority}</p>
                                </div>
                                <div className="p-3 bg-white rounded-xl border border-slate-100 text-center">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Nível</p>
                                    <p className="text-xs font-black text-blue-600 mt-1">{ticket.support_level}</p>
                                </div>
                            </div>
                        </section>

                        {ticket.status === 'Resolvido' && ticket.resolver_name && (
                            <section>
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Resolvido por</h4>
                                <div className="flex items-center gap-4 p-4 bg-green-50 rounded-2xl border border-green-100 shadow-sm">
                                    <img src={`https://ui-avatars.com/api/?name=${ticket.resolver_name}`} className="w-12 h-12 rounded-full border border-white" alt="" />
                                    <div>
                                        <p className="font-bold text-green-800">{ticket.resolver_name}</p>
                                        <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Técnico Responsável</p>
                                    </div>
                                </div>
                            </section>
                        )}
                    </div>

                    {ticket.status !== 'Resolvido' && (
                        <div className="mt-auto space-y-3">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Solução do Chamado</h4>
                            <textarea
                                value={solution}
                                onChange={(e) => setSolution(e.target.value)}
                                placeholder="Descreva como resolveu o problema..."
                                className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-green-500 outline-none h-24 transition-all"
                            />
                            <div className="flex items-center gap-3 px-2">
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
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
                <div className="flex-1 flex flex-col">
                    <div className="p-10 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-xl font-bold text-slate-900">Histórico e Interações</h3>
                        <div className="flex gap-2">
                            {['Aberto', 'Em Atendimento', 'Pendente'].map(s => (
                                <button
                                    key={s}
                                    onClick={() => handleUpdateStatus(s)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${ticket.status === s ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-10 space-y-8 bg-slate-50/30">
                        {ticket.comments?.map((c, i) => (
                            <div key={i} className={`flex gap-4 ${c.user_role === 'ADMIN' ? 'flex-row-reverse' : ''}`}>
                                <img src={c.user_avatar} className="w-9 h-9 rounded-full shadow-sm" alt="" />
                                <div className={`max-w-[80%] flex flex-col ${c.user_role === 'ADMIN' ? 'items-end' : ''}`}>
                                    <div className={`p-4 rounded-2xl shadow-sm border ${c.is_internal ? 'bg-amber-50 border-amber-100 italic' :
                                        c.user_role === 'ADMIN' ? 'bg-blue-600 text-white border-blue-500' : 'bg-white border-slate-100'
                                        }`}>
                                        {c.is_internal && <span className="block text-[8px] font-bold uppercase mb-2">Comentário Interno</span>}
                                        <p className="text-sm leading-relaxed">{c.comment}</p>
                                    </div>
                                    <span className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-wider">
                                        {c.user_name} • {new Date(c.created_at).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-8 bg-white border-t border-slate-100">
                        <form onSubmit={handleSendComment} className="flex flex-col gap-4">
                            <div className="flex items-center gap-3 px-2">
                                <label className="flex items-center gap-2 text-xs font-bold text-amber-600 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isInternal}
                                        onChange={e => setIsInternal(e.target.checked)}
                                        className="rounded text-amber-600 focus:ring-amber-500"
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
                                    className="w-full pl-6 pr-20 py-5 bg-slate-100 border-none rounded-[2rem] text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all outline-none"
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
    const [isTriaging, setIsTriaging] = useState(false);
    const [triageResult, setTriageResult] = useState<any>(null);

    const handleTriage = async () => {
        if (!formData.description) return;
        setIsTriaging(true);
        try {
            const result = await getTriageSuggestions(formData.description);
            setTriageResult(result);
            setFormData(prev => ({
                ...prev,
                category: result.category,
                priority: result.priority,
                support_level: result.support_level
            }));
        } catch (err) {
            console.error(err);
        } finally {
            setIsTriaging(false);
        }
    };

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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in zoom-in-95 duration-300">
            <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden border border-slate-300">
                <div className="p-10 border-b border-slate-100 flex items-center gap-4">
                    <div className="p-3 bg-blue-600 rounded-2xl text-white">
                        <Ticket size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Novo Chamado Técnico</h2>
                        <p className="text-sm text-slate-500 font-medium">Abertura de ticket no TEC-TIC</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-10 space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 ml-1">Assunto / Título</label>
                        <input
                            required
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Ex: Impressora do RH não está funcionando"
                            className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between ml-1">
                            <label className="text-sm font-bold text-slate-700">Descrição do Problema</label>
                            <button
                                type="button"
                                onClick={handleTriage}
                                disabled={isTriaging || !formData.description}
                                className="text-xs font-black text-blue-600 flex items-center gap-2 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                            >
                                <Bot size={16} />
                                {isTriaging ? 'Analisando...' : 'Triagem Inteligente'}
                            </button>
                        </div>
                        <textarea
                            required
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            rows={4}
                            placeholder="Descreva o problema com o máximo de detalhes possível..."
                            className="w-full p-6 bg-slate-50 border border-slate-200 rounded-3xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                    </div>

                    {triageResult && (
                        <div className="p-5 bg-blue-50 border border-blue-100 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-500">
                            <div className="flex gap-3 text-blue-800">
                                <Bot size={20} className="shrink-0 mt-1" />
                                <div>
                                    <p className="text-[11px] font-black uppercase mb-1">Sugestão de Triagem IA</p>
                                    <p className="text-sm italic leading-relaxed font-medium">"{triageResult.reasoning}"</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 ml-1">Categoria</label>
                            <select
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500"
                            >
                                <option>Hardware</option>
                                <option>Software</option>
                                <option>Rede</option>
                                <option>Sistemas</option>
                                <option>Telefonia</option>
                                <option>Outros</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 ml-1">Prioridade</label>
                            <select
                                value={formData.priority}
                                onChange={e => setFormData({ ...formData, priority: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500"
                            >
                                <option>Baixa</option>
                                <option>Média</option>
                                <option>Alta</option>
                                <option>Crítica</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 ml-1">Nível</label>
                            <select
                                value={formData.support_level}
                                onChange={e => setFormData({ ...formData, support_level: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500"
                            >
                                <option>L1</option>
                                <option>L2</option>
                                <option>L3</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-8 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-[2] px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black shadow-xl shadow-blue-100 transition-all flex items-center justify-center gap-2 active:scale-95"
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
            } catch (err) {
                alert('Erro ao excluir arquivo');
            }
        }
    };

    const handleRename = async (id: number, currentName: string) => {
        const newName = prompt('Novo nome do arquivo:', currentName);
        if (newName && newName !== currentName) {
            try {
                await renameTecticFile(id, newName);
                loadFiles();
            } catch (err) {
                alert('Erro ao renomear arquivo');
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
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
                <div className="p-8 lg:p-10 border-b border-slate-100 bg-slate-50/50 flex flex-col xl:flex-row items-center justify-between gap-8">
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 mb-1">TEC-Drive</h3>
                        <p className="text-sm text-slate-500 font-medium">Repositório de Ferramentas e Documentos</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar arquivos..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                            />
                        </div>

                        <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
                            {['Todos', 'Instalador', 'Documento', 'Script'].map(t => (
                                <button
                                    key={t}
                                    onClick={() => setFilter(t)}
                                    className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${filter === t ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-slate-100 text-blue-600' : 'text-slate-400 hover:bg-slate-50'}`}
                            >
                                <LayoutGrid size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-slate-100 text-blue-600' : 'text-slate-400 hover:bg-slate-50'}`}
                            >
                                <List size={18} />
                            </button>
                        </div>


                        <label className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-[1.25rem] flex items-center gap-2 font-black transition-all shadow-lg shadow-blue-50 cursor-pointer active:scale-95">
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
                        <div className="px-10 py-6 border-b border-slate-100 flex items-center gap-6">
                            <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
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
                            <p className="text-xs font-black text-slate-500 whitespace-nowrap uppercase tracking-widest">
                                {formatSize(totalSize)} <span className="text-slate-300">/ 50 GB Utilizado</span>
                            </p>
                        </div>
                    );
                })()}


                <div className="flex-1 p-10 overflow-y-auto max-h-[600px]">
                    {loading ? (
                        <div className={viewMode === 'grid' ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8" : "space-y-4"}>
                            {Array(8).fill(0).map((_, i) => (
                                <div key={i} className={viewMode === 'grid' ? "aspect-square bg-slate-50 rounded-3xl animate-pulse" : "h-16 bg-slate-50 rounded-2xl animate-pulse"}></div>
                            ))}
                        </div>
                    ) : filteredFiles.length > 0 ? (
                        viewMode === 'grid' ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
                                {filteredFiles.map((file) => (
                                    <div key={file.id} className="group bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all flex flex-col items-center text-center relative overflow-hidden">
                                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                            <button
                                                onClick={() => handleRename(file.id, file.original_name)}
                                                className="p-2 bg-white/80 backdrop-blur-sm shadow-sm rounded-xl text-slate-400 hover:text-blue-600 transition-colors"
                                            >
                                                <Settings size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(file.id)}
                                                className="p-2 bg-white/80 backdrop-blur-sm shadow-sm rounded-xl text-slate-400 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                        <div className={`p-6 rounded-3xl mb-5 transition-transform group-hover:scale-110 ${file.file_type === 'Instalador' ? 'bg-blue-50 text-blue-600' :
                                            file.file_type === 'Documento' ? 'bg-purple-50 text-purple-600' : 'bg-emerald-50 text-emerald-600'
                                            }`}>
                                            <FileIcon type={file.file_type} />
                                        </div>
                                        <h4 className="text-sm font-bold text-slate-800 mb-1 truncate w-full px-2" title={file.original_name}>
                                            {file.original_name}
                                        </h4>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">{(file.file_size / 1024 / 1024).toFixed(1)} MB</p>
                                        <button
                                            onClick={() => window.open(`http://localhost:3002/uploads/tectic/${file.name}`)}
                                            className="w-full bg-slate-50 group-hover:bg-blue-600 group-hover:text-white text-slate-500 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 group-hover:shadow-lg group-hover:shadow-blue-200"
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
                                    <div key={file.id} className="group bg-white p-4 rounded-2xl border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all flex items-center gap-6">
                                        <div className={`p-3 rounded-xl ${file.file_type === 'Instalador' ? 'bg-blue-50 text-blue-600' :
                                            file.file_type === 'Documento' ? 'bg-purple-50 text-purple-600' : 'bg-emerald-50 text-emerald-600'
                                            }`}>
                                            <FileIcon type={file.file_type} size={24} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-bold text-slate-800 truncate" title={file.original_name}>{file.original_name}</h4>
                                            <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                                <span>{file.file_type}</span>
                                                <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                                                <span>{(file.file_size / 1024 / 1024).toFixed(1)} MB</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => window.open(`http://localhost:3002/uploads/tectic/${file.name}`)}
                                                className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                                title="Baixar"
                                            >
                                                <Download size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleRename(file.id, file.original_name)}
                                                className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-xl transition-all"
                                                title="Renomear"
                                            >
                                                <Settings size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(file.id)}
                                                className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
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

const PlaceholderTab: React.FC<{ label: string }> = ({ label }) => (
    <div className="flex flex-col items-center justify-center py-32 text-slate-300">
        <Monitor size={80} className="opacity-10 mb-8" />
        <h3 className="text-3xl font-black italic uppercase tracking-tighter mb-2">{label}</h3>
        <p className="font-bold text-slate-400">Funcionalidade em desenvolvimento pela equipe core.</p>
    </div>
);

export default ServiceDesk;
