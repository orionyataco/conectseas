import React, { useRef } from 'react';
import { User, UserRole, Warning } from '../types';
import { getNote, saveNote, getShortcuts, createShortcut, updateShortcut, deleteShortcut, getActiveWarning, createWarning, updateWarning, deleteWarning, getSystemShortcuts, createSystemShortcut, updateSystemShortcut, deleteSystemShortcut, getTodos, createTodo, updateTodo, deleteTodo, toggleShortcutFavorite, toggleSystemShortcutFavorite } from '../services/api';
import { Info, ChevronRight, PenLine, X, Link, Globe, File, Box, Plus, Settings, AlertTriangle, Megaphone, ShieldAlert, CheckCircle, Trash2, Edit2, LayoutDashboard, MessageSquare, Users, Calendar, FileText, HelpCircle, ExternalLink, Laptop, UserPlus, Bot, Check, Circle, PlusCircle, Star } from 'lucide-react';

interface DashboardProps {
  user: User | null;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [note, setNote] = React.useState('');
  const [shortcuts, setShortcuts] = React.useState<any[]>([]);
  const [systemShortcuts, setSystemShortcuts] = React.useState<any[]>([]);
  const [showModal, setShowModal] = React.useState(false);
  const [isEditingSystem, setIsEditingSystem] = React.useState(false);
  const [editingShortcutId, setEditingShortcutId] = React.useState<number | null>(null);

  // Todo States
  const [todos, setTodos] = React.useState<any[]>([]);
  const [newTodoText, setNewTodoText] = React.useState('');

  // Warning States
  const [warning, setWarning] = React.useState<Warning | null>(null);
  const [showWarningModal, setShowWarningModal] = React.useState(false);
  const [editingWarningId, setEditingWarningId] = React.useState<number | null>(null);
  const [newWarning, setNewWarning] = React.useState({
    title: '',
    message: '',
    urgency: 'low' as 'low' | 'medium' | 'high',
    targetAudience: 'all' as 'all' | 'servers' | 'admin'
  });

  const [newShortcut, setNewShortcut] = React.useState({
    name: '',
    desc: '',
    url: '',
    iconName: 'Globe',
    color: 'bg-indigo-50'
  });

  // Autosave timer ref
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    fetchWarning();
    if (user?.id) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;
    try {
      // Load Note
      const noteData = await getNote(user.id);
      setNote(noteData.content || '');

      // Load System Shortcuts
      const sysData = await getSystemShortcuts();
      const formattedSys = sysData.map((s: any) => {
        const iconObj = availableIcons.find(i => i.name === s.icon_name) || availableIcons[0];
        return {
          id: s.id,
          name: s.name,
          desc: s.description,
          url: s.url,
          icon: React.cloneElement(iconObj.icon as React.ReactElement, { className: `w-8 h-8 ${s.color?.replace('bg-', 'text-')?.replace('-50', '-500')}` }),
          color: s.color,
          isSystem: true,
          iconName: s.icon_name,
          isFavorite: !!s.is_favorite
        };
      });
      setSystemShortcuts(formattedSys);

      // Load Custom Shortcuts
      const customShortcuts = await getShortcuts(user.id);

      // Transform custom shortcuts to match UI structure
      const formattedCustom = customShortcuts.map((s: any) => {
        const iconObj = availableIcons.find(i => i.name === s.icon_name) || availableIcons[0];
        return {
          id: s.id,
          name: s.name,
          desc: s.description,
          url: s.url,
          icon: React.cloneElement(iconObj.icon as React.ReactElement, { className: `w-8 h-8 ${s.color?.replace('bg-', 'text-')?.replace('-50', '-500')}` }),
          color: s.color,
          isCustom: true,
          iconName: s.icon_name,
          isFavorite: !!s.is_favorite
        };
      });

      setShortcuts(formattedCustom);

      // Load Todos
      const todosData = await getTodos(user.id);
      setTodos(todosData);
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const fetchWarning = async () => {
    try {
      const data = await getActiveWarning();
      setWarning(data || null);
    } catch (error) {
      console.error('Failed to fetch warning:', error);
    }
  };

  const handleSaveWarning = async () => {
    try {
      if (editingWarningId) {
        await updateWarning(editingWarningId, newWarning);
      } else {
        await createWarning(newWarning);
      }
      setShowWarningModal(false);
      setEditingWarningId(null);
      fetchWarning();
      setNewWarning({ title: '', message: '', urgency: 'low', targetAudience: 'all' });
    } catch (error) {
      console.error('Failed to save warning:', error);
    }
  };

  const handleEditWarning = () => {
    if (warning) {
      setNewWarning({
        title: warning.title,
        message: warning.message,
        urgency: warning.urgency,
        targetAudience: warning.target_audience as any || 'all'
      });
      setEditingWarningId(warning.id);
      setShowWarningModal(true);
    }
  };

  const handleDeleteWarning = async () => {
    if (warning && confirm('Tem certeza que deseja excluir este aviso?')) {
      try {
        await deleteWarning(warning.id);
        setWarning(null);
      } catch (error) {
        console.error('Failed to delete warning:', error);
      }
    }
  };

  const handleCreateWarning = () => {
    setNewWarning({ title: '', message: '', urgency: 'low', targetAudience: 'all' });
    setEditingWarningId(null);
    setShowWarningModal(true);
  };

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setNote(newValue);

    // Debounced Autosave
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      if (user?.id) {
        await saveNote(user.id, newValue);
      }
    }, 1000);
  };

  const availableIcons = [
    { name: 'Globe', icon: <Globe className="w-6 h-6 text-indigo-500" /> },
    { name: 'FileText', icon: <FileText className="w-6 h-6 text-indigo-500" /> },
    { name: 'Box', icon: <Box className="w-6 h-6 text-indigo-500" /> },
    { name: 'Users', icon: <Users className="w-6 h-6 text-indigo-500" /> },
    { name: 'MessageSquare', icon: <MessageSquare className="w-6 h-6 text-indigo-500" /> },
    { name: 'ExternalLink', icon: <ExternalLink className="w-6 h-6 text-indigo-500" /> },
    { name: 'Plus', icon: <Plus className="w-6 h-6 text-indigo-500" /> },
  ];

  const handleAddShortcut = async () => {
    if (!newShortcut.name || !newShortcut.url || !user) return;

    try {
      const payload = {
        userId: user.id,
        name: newShortcut.name,
        description: newShortcut.desc || 'Atalho',
        url: newShortcut.url,
        iconName: newShortcut.iconName,
        color: newShortcut.color,
        userRole: user.role
      };

      if (isEditingSystem) {
        if (editingShortcutId) {
          await updateSystemShortcut(editingShortcutId, payload);
        } else {
          await createSystemShortcut(payload);
        }
      } else {
        if (editingShortcutId) {
          await updateShortcut(editingShortcutId, payload);
        } else {
          await createShortcut(payload);
        }
      }

      setShowModal(false);
      setEditingShortcutId(null);
      setIsEditingSystem(false);
      setNewShortcut({ name: '', desc: '', url: '', iconName: 'Globe', color: 'bg-indigo-50' });
      await loadUserData();
      alert('Atalho salvo com sucesso!');
    } catch (error) {
      console.error('Failed to save shortcut:', error);
      alert('Erro ao salvar atalho. Tente novamente.');
    }
  };

  const handleEditShortcut = (e: React.MouseEvent, sys: any) => {
    e.preventDefault();
    e.stopPropagation();
    setNewShortcut({
      name: sys.name,
      desc: sys.desc,
      url: sys.url,
      iconName: sys.iconName || 'Globe',
      color: sys.color || 'bg-indigo-50'
    });
    setEditingShortcutId(sys.id);
    setIsEditingSystem(!!sys.isSystem);
    setShowModal(true);
  };

  const handleDeleteShortcut = async (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || !confirm('Excluir este atalho?')) return;

    try {
      await deleteShortcut(id, user.id);
      loadUserData();
    } catch (error) {
      console.error('Failed to delete shortcut:', error);
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent, sys: any) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;

    try {
      if (sys.isSystem) {
        await toggleSystemShortcutFavorite(sys.id, user.role, !sys.isFavorite);
      } else {
        await toggleShortcutFavorite(sys.id, user.id, !sys.isFavorite);
      }
      await loadUserData();
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleAddTodo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTodoText.trim() || !user) return;

    try {
      await createTodo(user.id, newTodoText.trim());
      setNewTodoText('');
      const todosData = await getTodos(user.id);
      setTodos(todosData);
    } catch (error) {
      console.error('Failed to add todo:', error);
    }
  };

  const handleToggleTodo = async (id: number, completed: boolean) => {
    try {
      await updateTodo(id, !completed);
      setTodos(todos.map(t => t.id === id ? { ...t, completed: !completed } : t));
    } catch (error) {
      console.error('Failed to toggle todo:', error);
    }
  };

  const handleDeleteTodo = async (id: number) => {
    try {
      await deleteTodo(id);
      setTodos(todos.filter(t => t.id !== id));
    } catch (error) {
      console.error('Failed to delete todo:', error);
    }
  };

  const handleOpenNewShortcutModal = () => {
    setNewShortcut({ name: '', desc: '', url: '', iconName: 'Globe', color: 'bg-indigo-50' });
    setEditingShortcutId(null);
    setIsEditingSystem(false);
    setShowModal(true);
  };

  const getUrgencyStyles = (urgency: string) => {
    switch (urgency) {
      case 'high': return {
        container: 'bg-red-50 border-red-500',
        iconBg: 'bg-red-100 text-red-600',
        gradient: 'from-red-400 to-red-600'
      };
      case 'medium': return {
        container: 'bg-amber-50 border-amber-500',
        iconBg: 'bg-amber-100 text-amber-600',
        gradient: 'from-amber-400 to-orange-500'
      };
      case 'low':
      default: return {
        container: 'bg-blue-50 border-blue-500',
        iconBg: 'bg-blue-100 text-blue-600',
        gradient: 'from-blue-400 to-indigo-500'
      };
    }
  };

  const urgencyStyles = warning ? getUrgencyStyles(warning.urgency) : getUrgencyStyles('medium');

  return (
    <div className="space-y-8 animate-fadeIn relative">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Olá, {user?.name.split(' ')[0] || 'Servidor'}</h1>
          <p className="text-slate-500">Acesse seus sistemas e ferramentas administrativas com facilidade.</p>
        </div>
        {user?.role === UserRole.ADMIN && (
          <button
            onClick={handleCreateWarning}
            className="text-xs font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-blue-300 transition-all"
          >
            <Megaphone size={14} />
            Gerenciar Aviso
          </button>
        )}
      </header>

      {/* Aviso Dinâmico */}
      {warning && (
        <div className={`border-l-4 rounded-xl p-6 shadow-sm flex items-start gap-4 relative overflow-hidden ${urgencyStyles.container}`}>
          <div className={`p-3 rounded-full ${urgencyStyles.iconBg} relative z-10`}>
            {warning.urgency === 'high' ? <ShieldAlert size={24} /> : <Info size={24} />}
          </div>
          <div className="flex-1 relative z-10">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              {warning.title}
              {warning.target_audience !== 'all' && (
                <span className="text-[10px] uppercase tracking-wider bg-white/50 px-2 py-0.5 rounded-full text-slate-600 border border-slate-200/50">
                  {warning.target_audience === 'admin' ? 'Apenas Admins' : 'Apenas Servidores'}
                </span>
              )}
            </h3>
            <p className="text-sm text-slate-700 mt-1 leading-relaxed">
              {warning.message}
            </p>
          </div>

          {/* Admin Controls for Notice */}
          {user?.role === UserRole.ADMIN && (
            <div className="relative z-20 flex flex-col gap-2">
              <button
                onClick={handleEditWarning}
                className="p-2 bg-white/50 hover:bg-white rounded-lg text-slate-600 hover:text-blue-600 transition-colors"
                title="Editar Aviso"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={handleDeleteWarning}
                className="p-2 bg-white/50 hover:bg-white rounded-lg text-slate-600 hover:text-red-600 transition-colors"
                title="Excluir Aviso"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}

          <div className={`hidden md:block w-64 h-64 absolute -top-10 -right-10 rounded-full bg-gradient-to-br ${urgencyStyles.gradient} opacity-10 blur-3xl pointer-events-none`}></div>
        </div>
      )}

      {/* Warning Management Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden scale-100 animate-slideUp">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <Megaphone size={20} className="text-blue-600" />
                {editingWarningId ? 'Editar Aviso' : 'Novo Aviso'}
              </h3>
              <button onClick={() => setShowWarningModal(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Título do Aviso</label>
                <input
                  value={newWarning.title}
                  onChange={(e) => setNewWarning({ ...newWarning, title: e.target.value })}
                  placeholder="Ex: Manutenção no Sistema SIGRH"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Mensagem</label>
                <textarea
                  value={newWarning.message}
                  onChange={(e) => setNewWarning({ ...newWarning, message: e.target.value })}
                  placeholder="Descreva o aviso detalhadamente..."
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Urgência / Cor</label>
                  <select
                    value={newWarning.urgency}
                    onChange={(e) => setNewWarning({ ...newWarning, urgency: e.target.value as any })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  >
                    <option value="low">Baixa (Azul)</option>
                    <option value="medium">Média (Amarelo)</option>
                    <option value="high">Alta (Vermelho)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Público Alvo</label>
                  <select
                    value={newWarning.targetAudience}
                    onChange={(e) => setNewWarning({ ...newWarning, targetAudience: e.target.value as any })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  >
                    <option value="all">Todos</option>
                    <option value="servers">Apenas Servidores</option>
                    <option value="admin">Apenas Admin</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end">
              <button
                onClick={() => setShowWarningModal(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-white hover:border-slate-300 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveWarning}
                disabled={!newWarning.title || !newWarning.message}
                className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                <CheckCircle size={16} />
                {editingWarningId ? 'Salvar Alterações' : 'Publicar Aviso'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Launcher */}
        <div className="xl:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">Meus Atalhos</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* System Shortcuts */}
            {systemShortcuts.map((sys, index) => (
              <a
                key={`system-${sys.name}-${index}`}
                href={sys.url || '#'}
                target="_blank"
                className="bg-white p-6 rounded-2xl border border-slate-100 hover:border-blue-200 hover:shadow-lg transition-all group relative block"
              >
                <div className={`${sys.color} w-14 h-14 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  {sys.icon}
                </div>
                <h3 className="font-bold text-slate-800 text-lg">{sys.name}</h3>
                <p className="text-sm text-slate-500 mt-1 leading-snug">{sys.desc}</p>

                {user?.role === UserRole.ADMIN && (
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button
                      onClick={(e) => handleToggleFavorite(e, sys)}
                      className={`p-1.5 rounded-lg transition-all ${sys.isFavorite ? 'bg-amber-50 text-amber-500 opacity-100' : 'bg-slate-50 text-slate-400 hover:text-amber-500 hover:bg-amber-50 opacity-0 group-hover:opacity-100'}`}
                      title={sys.isFavorite ? "Remover dos Favoritos" : "Favoritar"}
                    >
                      <Star size={12} fill={sys.isFavorite ? "currentColor" : "none"} />
                    </button>
                    <button
                      onClick={(e) => handleEditShortcut(e, sys)}
                      className="p-1.5 bg-slate-50 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-all"
                      title="Editar Sistema"
                    >
                      <Edit2 size={12} />
                    </button>
                  </div>
                )}
                {!sys.isSystem && (
                  <div className="absolute top-4 right-4">
                    <button
                      onClick={(e) => handleToggleFavorite(e, sys)}
                      className={`p-1.5 rounded-lg transition-all ${sys.isFavorite ? 'bg-amber-50 text-amber-500 opacity-100' : 'bg-slate-50 text-slate-400 hover:text-amber-500 hover:bg-amber-50 opacity-0 group-hover:opacity-100'}`}
                      title={sys.isFavorite ? "Remover dos Favoritos" : "Favoritar"}
                    >
                      <Star size={12} fill={sys.isFavorite ? "currentColor" : "none"} />
                    </button>
                  </div>
                )}
              </a>
            ))}

            {/* Custom Shortcuts */}
            {shortcuts.map((sys, index) => (
              <a
                key={`custom-${sys.name}-${index}`}
                href={sys.url || '#'}
                target="_blank"
                className="bg-white p-6 rounded-2xl border border-slate-100 hover:border-blue-200 hover:shadow-lg transition-all group relative block"
              >
                <div className={`${sys.color} w-14 h-14 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  {sys.icon}
                </div>
                <h3 className="font-bold text-slate-800 text-lg">{sys.name}</h3>
                <p className="text-sm text-slate-500 mt-1 leading-snug">{sys.desc}</p>

                <div className="absolute top-4 right-4 flex gap-2">
                  <button
                    onClick={(e) => handleToggleFavorite(e, sys)}
                    className={`p-1.5 rounded-lg transition-all ${sys.isFavorite ? 'bg-amber-50 text-amber-500 opacity-100' : 'bg-slate-50 text-slate-400 hover:text-amber-500 hover:bg-amber-50 opacity-0 group-hover:opacity-100'}`}
                    title={sys.isFavorite ? "Remover dos Favoritos" : "Favoritar"}
                  >
                    <Star size={12} fill={sys.isFavorite ? "currentColor" : "none"} />
                  </button>
                  <button
                    onClick={(e) => handleEditShortcut(e, sys)}
                    className="p-1.5 bg-slate-50 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-all"
                    title="Editar Atalho"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    onClick={(e) => handleDeleteShortcut(e, sys.id)}
                    className="p-1.5 bg-slate-50 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                    title="Remover Atalho"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </a>
            ))}

            <button
              onClick={handleOpenNewShortcutModal}
              className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all group flex flex-col items-center justify-center text-slate-400 hover:text-blue-500"
            >
              <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
                <Plus size={24} />
              </div>
              <span className="font-semibold">Novo Atalho</span>
            </button>
          </div>
        </div>

        {/* Sidebar widgets */}
        <div className="space-y-8">
          {/* Quick Note */}
          <section className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <PenLine size={20} className="text-blue-500" />
              <h2 className="text-lg font-bold text-slate-800">Bloco de Notas</h2>
            </div>
            <textarea
              value={note}
              onChange={handleNoteChange}
              placeholder="Escreva um lembrete rápido aqui..."
              className="w-full h-40 bg-slate-50 border-none rounded-xl p-4 text-sm resize-none focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
            <p className="text-[10px] text-slate-400 mt-2 italic text-right">Salvo automaticamente</p>
          </section>

          {/* Lista de Tarefas */}
          <section className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col h-[400px]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800">Lista de Tarefas</h2>
              <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-full">
                {todos.filter(t => !t.completed).length} pendentes
              </span>
            </div>

            <form onSubmit={handleAddTodo} className="flex gap-2 mb-4">
              <input
                type="text"
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                placeholder="Adicionar nova tarefa..."
                className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
              <button
                type="submit"
                disabled={!newTodoText.trim()}
                className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Plus size={20} />
              </button>
            </form>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {todos.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 opacity-60">
                  <div className="p-3 bg-slate-50 rounded-full">
                    <CheckCircle size={32} />
                  </div>
                  <p className="text-sm">Nenhuma tarefa pendente</p>
                </div>
              ) : (
                todos.map((todo) => (
                  <div
                    key={todo.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-50 bg-slate-50/30 hover:bg-slate-50 transition-colors group"
                  >
                    <button
                      onClick={() => handleToggleTodo(todo.id, todo.completed)}
                      className="flex items-center gap-3 flex-1 text-left"
                    >
                      <div className={`p-1 rounded-md transition-colors ${todo.completed ? 'bg-green-100 text-green-600' : 'bg-white border border-slate-200 text-transparent hover:border-blue-400'}`}>
                        <Check size={14} />
                      </div>
                      <span className={`text-sm font-medium transition-all ${todo.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                        {todo.text}
                      </span>
                    </button>
                    <button
                      onClick={() => handleDeleteTodo(todo.id)}
                      className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Add Shortcut Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden scale-100 animate-slideUp">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">
                {editingShortcutId ? 'Editar Atalho' : 'Novo Atalho'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Nome do Atalho</label>
                <input
                  type="text"
                  value={newShortcut.name}
                  onChange={(e) => setNewShortcut({ ...newShortcut, name: e.target.value })}
                  placeholder="Ex: Google, Portal RH"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">URL</label>
                <input
                  type="text"
                  value={newShortcut.url}
                  onChange={(e) => setNewShortcut({ ...newShortcut, url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Descrição Curta</label>
                <input
                  type="text"
                  value={newShortcut.desc}
                  onChange={(e) => setNewShortcut({ ...newShortcut, desc: e.target.value })}
                  placeholder="Ex: Acesso a documentos externos"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Ícone</label>
                <div className="flex gap-2">
                  {availableIcons.map((ic) => (
                    <button
                      key={ic.name}
                      onClick={() => setNewShortcut({ ...newShortcut, iconName: ic.name })}
                      className={`p-3 rounded-xl border-2 transition-all ${newShortcut.iconName === ic.name ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-slate-200'}`}
                    >
                      {React.cloneElement(ic.icon as React.ReactElement, { className: `w-5 h-5 ${newShortcut.iconName === ic.name ? 'text-blue-600' : 'text-slate-400'}` })}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-white hover:border-slate-300 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddShortcut}
                disabled={!newShortcut.name || !newShortcut.url}
                className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {editingShortcutId ? 'Salvar Alterações' : 'Adicionar Atalho'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
