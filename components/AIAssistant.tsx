
import React from 'react';
import { Send, Bot, Sparkles, FileText, Scale, Copy, Check, History, Trash2 } from 'lucide-react';
import { askAI } from '../services/gemini';
import toast from 'react-hot-toast';

const AIAssistant: React.FC = () => {
  const [input, setInput] = React.useState('');
  const [messages, setMessages] = React.useState<{ role: 'user' | 'assistant', text: string }[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [history, setHistory] = React.useState<string[]>([]);
  const [copiedId, setCopiedId] = React.useState<number | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const savedHistory = localStorage.getItem('ai_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const saveToHistory = (query: string) => {
    const newHistory = [query, ...history.filter(h => h !== query)].slice(0, 5);
    setHistory(newHistory);
    localStorage.setItem('ai_history', JSON.stringify(newHistory));
  };

  const copyToClipboard = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(idx);
      toast.success('Copiado para a área de transferência!');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      toast.error('Erro ao copiar texto.');
    }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('ai_history');
    toast.success('Histórico limpo');
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsLoading(true);
    saveToHistory(userMsg);

    const response = await askAI(userMsg);
    setMessages(prev => [...prev, { role: 'assistant', text: response || 'Erro ao obter resposta.' }]);
    setIsLoading(false);
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col animate-fadeIn">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Assistente de Redação Institucional</h1>
          <p className="text-slate-500">Auxílio especializado em documentos e legislação da assistência social.</p>
        </div>
      </header>

      <div className="flex-1 flex flex-col bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Chat window */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                <Bot size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Como posso ajudar hoje?</h3>
              <p className="text-sm text-slate-500">Posso ajudar a redigir ofícios, explicar artigos da LOAS ou resumir circulares oficiais.</p>

              <div className="grid grid-cols-1 gap-2 w-full mt-4">
                <button
                  onClick={() => setInput('Redija um ofício para a prefeitura solicitando apoio para mutirão do CRAS.')}
                  className="p-3 text-left text-xs bg-white border border-slate-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all flex items-center gap-3"
                >
                  <FileText size={14} className="text-blue-500" />
                  Redigir ofício de solicitação de apoio
                </button>
                <button
                  onClick={() => setInput('Explique os principais pontos da Norma Operacional Básica (NOB-SUAS).')}
                  className="p-3 text-left text-xs bg-white border border-slate-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all flex items-center gap-3"
                >
                  <Scale size={14} className="text-blue-500" />
                  Dúvida sobre NOB-SUAS
                </button>
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`group relative max-w-[85%] p-5 rounded-3xl shadow-sm ${msg.role === 'user'
                  ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-tr-none'
                  : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'
                }`}>
                <div className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</div>

                {msg.role === 'assistant' && (
                  <button
                    onClick={() => copyToClipboard(msg.text, idx)}
                    className="absolute -right-12 top-0 p-2 bg-white border border-slate-200 rounded-xl text-slate-400 opacity-0 group-hover:opacity-100 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
                    title="Copiar resposta"
                  >
                    {copiedId === idx ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                  </button>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
                <span className="text-xs text-slate-400 font-medium">IA está pensando...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="p-6 bg-white border-t border-slate-100">
          {history.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2 max-w-5xl mx-auto">
              <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">
                <History size={12} />
                Recentes:
              </div>
              {history.map((h, i) => (
                <button
                  key={i}
                  onClick={() => setInput(h)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-500 rounded-full text-[10px] font-bold transition-all border border-transparent hover:border-blue-100 truncate max-w-[150px]"
                  title={h}
                >
                  {h}
                </button>
              ))}
              <button
                onClick={clearHistory}
                className="p-1.5 text-slate-300 hover:text-red-500 transition-colors ml-auto"
                title="Limpar histórico"
              >
                <Trash2 size={12} />
              </button>
            </div>
          )}

          <div className="relative flex items-center gap-3 max-w-5xl mx-auto">
            <div className="flex-1 relative group">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Pergunte sobre legislação ou peça uma redação de documento..."
                className="w-full pl-6 pr-14 py-5 bg-slate-50 border border-slate-200 rounded-[2rem] text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none transition-all shadow-inner"
              />
              <Sparkles className="absolute right-5 top-1/2 -translate-y-1/2 text-blue-500 opacity-40 group-focus-within:opacity-100 transition-opacity" size={20} />
            </div>
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="p-5 bg-blue-600 text-white rounded-[1.5rem] hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-blue-200 flex items-center justify-center translate-y-0 hover:-translate-y-1"
            >
              <Send size={22} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
