
import React from 'react';
import { Send, Bot, Sparkles, FileText, Scale } from 'lucide-react';
import { askAI } from '../services/gemini';

const AIAssistant: React.FC = () => {
  const [input, setInput] = React.useState('');
  const [messages, setMessages] = React.useState<{role: 'user' | 'assistant', text: string}[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsLoading(true);

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
              <div className={`max-w-[80%] p-4 rounded-2xl ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-white border border-slate-200 text-slate-700 shadow-sm rounded-tl-none'
              }`}>
                <div className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</div>
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
        <div className="p-4 bg-white border-t border-slate-100">
          <div className="relative flex items-center gap-2 max-w-5xl mx-auto">
            <div className="flex-1 relative">
              <input 
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Pergunte sobre legislação ou peça uma redação de documento..."
                className="w-full pl-4 pr-12 py-4 bg-slate-100 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
              <Sparkles className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500 opacity-50" size={18} />
            </div>
            <button 
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="p-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
