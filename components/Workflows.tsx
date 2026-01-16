
import React from 'react';
import { WORKFLOWS } from '../constants';
import { ClipboardList, Clock, CheckCircle, AlertCircle, Send } from 'lucide-react';

const Workflows: React.FC = () => {
  const [selectedWf, setSelectedWf] = React.useState('ti');

  return (
    <div className="space-y-8 animate-fadeIn">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">Módulos de Solicitação</h1>
        <p className="text-slate-500">Abra chamados e acompanhe o fluxo de suas requisições administrativas.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1 space-y-2">
          {WORKFLOWS.map(wf => (
            <button
              key={wf.id}
              onClick={() => setSelectedWf(wf.id)}
              className={`w-full text-left p-4 rounded-2xl border transition-all ${
                selectedWf === wf.id 
                  ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' 
                  : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${selectedWf === wf.id ? 'bg-white/20' : 'bg-slate-100'}`}>
                  {React.cloneElement(wf.icon as React.ReactElement, { size: 20 })}
                </div>
                <div>
                  <p className="font-bold text-sm">{wf.title}</p>
                  <p className={`text-xs ${selectedWf === wf.id ? 'text-blue-100' : 'text-slate-500'}`}>{wf.desc}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3 space-y-8">
          {/* Active Requests */}
          <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Clock size={20} className="text-blue-500" />
              Suas Solicitações Recentes
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <th className="pb-3 px-2">ID</th>
                    <th className="pb-3 px-2">Assunto</th>
                    <th className="pb-3 px-2">Data</th>
                    <th className="pb-3 px-2">Status</th>
                    <th className="pb-3 px-2">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="text-sm">
                    <td className="py-4 px-2 font-medium text-slate-500">#4452</td>
                    <td className="py-4 px-2 font-semibold text-slate-800">Manutenção Monitor</td>
                    <td className="py-4 px-2 text-slate-500">12/10/2023</td>
                    <td className="py-4 px-2">
                      <span className="flex items-center gap-1.5 text-amber-600 font-bold text-[10px] bg-amber-50 px-2 py-1 rounded-full w-max uppercase">
                        <Clock size={10} /> Em Fila
                      </span>
                    </td>
                    <td className="py-4 px-2">
                      <button className="text-blue-600 hover:underline font-semibold">Ver detalhes</button>
                    </td>
                  </tr>
                  <tr className="text-sm">
                    <td className="py-4 px-2 font-medium text-slate-500">#4410</td>
                    <td className="py-4 px-2 font-semibold text-slate-800">Solicitação de Férias 2024</td>
                    <td className="py-4 px-2 text-slate-500">01/10/2023</td>
                    <td className="py-4 px-2">
                      <span className="flex items-center gap-1.5 text-green-600 font-bold text-[10px] bg-green-50 px-2 py-1 rounded-full w-max uppercase">
                        <CheckCircle size={10} /> Concluído
                      </span>
                    </td>
                    <td className="py-4 px-2">
                      <button className="text-blue-600 hover:underline font-semibold">Ver detalhes</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* New Request Form */}
          <section className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Nova Solicitação: {selectedWf.toUpperCase()}</h2>
            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Setor Solicitante</label>
                  <input type="text" defaultValue="ASCOM" readOnly className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Categoria da Urgência</label>
                  <select className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option>Normal (72h)</option>
                    <option>Urgente (24h)</option>
                    <option>Crítico (Imediato)</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Descrição do Problema / Solicitação</label>
                <textarea 
                  rows={4}
                  placeholder="Descreva detalhadamente sua necessidade..."
                  className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>
              <div className="flex items-center justify-between pt-4">
                <p className="text-xs text-slate-500 flex items-center gap-2">
                  <AlertCircle size={14} className="text-amber-500" />
                  Sua solicitação será validada pelo gestor do setor.
                </p>
                <button className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors flex items-center gap-2">
                  Enviar Solicitação
                  <Send size={18} />
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Workflows;
