
import React from 'react';
import { User, Calendar, Folder, File, Search, X, ChevronRight, User as UserIcon } from 'lucide-react';

interface SearchResult {
    id: string | number;
    name: string;
    type: 'user' | 'event' | 'folder' | 'file';
    avatar?: string;
    department?: string;
    position?: string;
    date?: string;
    folder_id?: number;
}

interface SearchOverlayProps {
    results: {
        users: any[];
        events: any[];
        documents: any[];
    };
    isLoading: boolean;
    onClose: () => void;
    onSelect: (item: any) => void;
    searchQuery: string;
}

const SearchOverlay: React.FC<SearchOverlayProps> = ({ results, isLoading, onClose, onSelect, searchQuery }) => {
    const hasResults = results.users.length > 0 || results.events.length > 0 || results.documents.length > 0;

    if (!searchQuery && !isLoading) return null;

    const renderSection = (title: string, items: any[], icon: React.ReactNode, type: string) => {
        if (items.length === 0) return null;

        return (
            <div className="mb-6 last:mb-0">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    {icon}
                    {title}
                </h3>
                <div className="space-y-1">
                    {items.map((item) => (
                        <button
                            key={`${type}-${item.id}`}
                            onClick={() => onSelect(item)}
                            className="w-full flex items-center gap-3 p-3 hover:bg-blue-50 rounded-xl transition-all group text-left"
                        >
                            {item.type === 'user' ? (
                                <img
                                    src={item.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=random`}
                                    className="w-10 h-10 rounded-full border border-slate-200 group-hover:border-blue-200"
                                    alt={item.name}
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                    {item.type === 'event' ? <Calendar size={20} /> : item.type === 'folder' ? <Folder size={20} /> : <File size={20} />}
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-slate-700 truncate group-hover:text-blue-700">{item.name}</p>
                                <p className="text-xs text-slate-500 truncate">
                                    {item.type === 'user' ? `${item.position} • ${item.department}` :
                                        item.type === 'event' ? new Date(item.date).toLocaleDateString('pt-BR') :
                                            item.type === 'folder' ? 'Pasta' : 'Arquivo'}
                                </p>
                            </div>
                            <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-400" />
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-3xl shadow-2xl border border-slate-200 z-50 overflow-hidden max-h-[80vh] flex flex-col animate-slideDown">
            <div className="p-6 overflow-y-auto">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-sm font-medium">Buscando informações...</p>
                    </div>
                ) : !hasResults ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mb-4">
                            <Search size={32} />
                        </div>
                        <h3 className="font-bold text-slate-700 mb-1">Nenhum resultado encontrado</h3>
                        <p className="text-sm text-slate-500 max-w-[240px]">
                            Não encontramos nada para "{searchQuery}". Tente outros termos.
                        </p>
                    </div>
                ) : (
                    <>
                        {renderSection('Colegas de Trabalho', results.users, <UserIcon size={14} />, 'user')}
                        {renderSection('Eventos e Agenda', results.events, <Calendar size={14} />, 'event')}
                        {renderSection('Documentos e Pastas', results.documents, <Folder size={14} />, 'doc')}
                    </>
                )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Pressione ESC para sair</p>
                <button onClick={onClose} className="text-xs font-bold text-blue-600 hover:text-blue-700">Fechar busca</button>
            </div>
        </div>
    );
};

export default SearchOverlay;
