import React, { useState, useEffect } from 'react';
import { BookOpen, ChevronDown, ChevronUp, Search, Eye } from 'lucide-react';
import { getTecticKnowledge } from '../services/api';
import { TecticKnowledge } from '../types';

const PublicFAQ: React.FC = () => {
    const [articles, setArticles] = useState<TecticKnowledge[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedArticleId, setExpandedArticleId] = useState<number | null>(null);

    useEffect(() => {
        const loadArticles = async () => {
            setLoading(true);
            try {
                const data = await getTecticKnowledge();
                setArticles(data);
            } catch (err) {
                console.error('Erro ao buscar base de conhecimento', err);
            } finally {
                setLoading(false);
            }
        };
        loadArticles();
    }, []);

    const filteredArticles = articles.filter(article =>
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (article.tags && article.tags.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const toggleArticle = (id: number) => {
        setExpandedArticleId(prev => prev === id ? null : id);
    };

    return (
        <div className="animate-in fade-in slide-in-from-right-4 duration-700 min-h-screen p-8 lg:p-12">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="text-center space-y-4 mb-12">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 mx-auto mb-6">
                        <BookOpen size={32} />
                    </div>
                    <h1 className="text-4xl font-black text-slate-800 tracking-tight">Base de Conhecimento</h1>
                    <p className="text-slate-500 font-medium">Encontre respostas para as dúvidas mais frequentes (FAQ).</p>
                </div>

                <div className="relative w-full shadow-sm">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
                    <input
                        type="text"
                        placeholder="Pesquisar por assunto ou palavra-chave..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-16 pr-6 py-5 bg-white border border-slate-200 rounded-[2rem] text-lg font-medium focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                    />
                </div>

                <div className="space-y-4">
                    {loading ? (
                        Array(4).fill(0).map((_, i) => (
                            <div key={i} className="h-24 bg-white/60 border border-slate-100 rounded-[1.5rem] animate-pulse" />
                        ))
                    ) : filteredArticles.length > 0 ? filteredArticles.map((article) => (
                        <div
                            key={article.id}
                            className={`bg-white rounded-[1.5rem] border transition-all duration-300 overflow-hidden ${expandedArticleId === article.id ? 'border-blue-300 shadow-xl shadow-blue-500/5' : 'border-slate-200 hover:border-blue-200 shadow-sm'
                                }`}
                        >
                            <button
                                onClick={() => toggleArticle(article.id)}
                                className="w-full px-8 py-6 flex items-center justify-between text-left focus:outline-none"
                            >
                                <div className="pr-8">
                                    <h3 className={`text-xl font-black transition-colors ${expandedArticleId === article.id ? 'text-blue-600' : 'text-slate-800'}`}>
                                        {article.title}
                                    </h3>
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase rounded-full tracking-widest">
                                            {article.category}
                                        </span>
                                        {article.tags && article.tags.split(',').map((tag, idx) => (
                                            <span key={idx} className="px-3 py-1 bg-slate-50 text-slate-500 text-[10px] font-bold rounded-full">
                                                #{tag.trim()}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className={`p-3 rounded-full transition-colors flex-shrink-0 ${expandedArticleId === article.id ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'}`}>
                                    {expandedArticleId === article.id ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                                </div>
                            </button>

                            {expandedArticleId === article.id && (
                                <div className="px-8 pb-8 pt-2 animate-in slide-in-from-top-2 duration-300">
                                    <div className="w-full h-px bg-slate-100 mb-6"></div>
                                    <div className="text-slate-600 text-base leading-relaxed whitespace-pre-wrap font-medium">
                                        {article.content}
                                    </div>
                                    <div className="mt-8 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <img src={`https://ui-avatars.com/api/?name=${article.author_name}`} className="w-8 h-8 rounded-full border border-slate-200" alt="" />
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Autor</p>
                                                <p className="text-xs font-bold text-slate-800">{article.author_name}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-400">
                                            <Eye size={16} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">{article.views} visualizações</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )) : (
                        <div className="py-24 text-center bg-white/50 rounded-[3rem] border-2 border-dashed border-slate-200">
                            <BookOpen className="mx-auto text-slate-300 mb-4" size={48} />
                            <h3 className="text-xl font-black text-slate-400">Nenhum artigo encontrado</h3>
                            <p className="text-slate-400 text-sm font-medium mt-2">Tente buscar por outras palavras-chave.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PublicFAQ;
