import React from 'react';
import { Loader2, ExternalLink, RefreshCw } from 'lucide-react';

interface IframeViewerProps {
    url: string;
    title: string;
    icon?: React.ReactNode;
    subtitle?: string;
}

const IframeViewer: React.FC<IframeViewerProps> = ({ url, title, icon, subtitle }) => {
    const [loading, setLoading] = React.useState(true);
    const [iframeKey, setIframeKey] = React.useState(0);

    const handleRefresh = () => {
        setLoading(true);
        setIframeKey(prev => prev + 1);
    };

    return (
        <div className="h-full flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                    {icon && (
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                            {icon}
                        </div>
                    )}
                    <div>
                        <h2 className="text-sm font-bold text-slate-800">{title}</h2>
                        {subtitle && <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{subtitle}</p>}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleRefresh}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Recarregar"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={() => window.open(url, '_blank')}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                        <ExternalLink size={14} />
                        Abrir em nova aba
                    </button>
                </div>
            </div>

            {/* Iframe Container */}
            <div className="flex-1 relative bg-slate-50">
                {loading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 bg-slate-50/80 backdrop-blur-sm">
                        <Loader2 size={32} className="animate-spin text-blue-600" />
                        <p className="text-sm font-medium text-slate-500">Carregando conteúdo...</p>
                    </div>
                )}
                <iframe
                    key={iframeKey}
                    src={url}
                    className="w-full h-full border-none"
                    onLoad={() => setLoading(false)}
                    title={title}
                    allow="camera; microphone; display-capture; clipboard-read; clipboard-write; fullscreen"
                />
            </div>
        </div>
    );
};

export default IframeViewer;
