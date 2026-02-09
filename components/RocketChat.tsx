import React from 'react';
import { Loader2, MessageSquare, ExternalLink } from 'lucide-react';

const RocketChat: React.FC = () => {
    const [loading, setLoading] = React.useState(true);

    return (
        <div className="h-full flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                        <MessageSquare size={20} />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-800">Rocket.Chat</h2>
                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Comunicação Institucional</p>
                    </div>
                </div>
                <button
                    onClick={() => window.open('https://chat.institucional.ap.gov.br', '_blank')}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                    <ExternalLink size={14} />
                    Abrir em nova aba
                </button>
            </div>

            {/* Iframe Container */}
            <div className="flex-1 relative bg-slate-50">
                {loading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 bg-slate-50/80 backdrop-blur-sm">
                        <Loader2 size={32} className="animate-spin text-blue-600" />
                        <p className="text-sm font-medium text-slate-500">Carregando Chat...</p>
                    </div>
                )}
                <iframe
                    src="https://chat.institucional.ap.gov.br"
                    className="w-full h-full border-none"
                    onLoad={() => setLoading(false)}
                    title="Rocket.Chat"
                    allow="camera; microphone; display-capture; clipboard-read; clipboard-write; fullscreen"
                />
            </div>
        </div>
    );
};

export default RocketChat;
