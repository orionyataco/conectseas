import React, { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    Filter,
    Grid3x3,
    List,
    Kanban,
    Calendar as CalendarIcon,
    Users,
    MoreVertical,
    Edit2,
    Trash2,
    UserPlus,
    CheckCircle2,
    Circle,
    Clock,
    AlertCircle,
    MessageSquare,
    Paperclip,
    Archive,
    Copy
} from 'lucide-react';
import { User, Project, ProjectTask, ProjectMember } from '../types';
import {
    getProjects,
    createProject,
    updateProject,
    deleteProject,
    duplicateProject,
    archiveProject,
    getProjectTasks,
    createTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
    getProjectMembers,
    addProjectMember,
    removeProjectMember,
    getUsers,
    toggleSubtask
} from '../services/api';

interface ProjectManagerProps {
    user: User;
}

const ProjectManager: React.FC<ProjectManagerProps> = ({ user }) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [tasks, setTasks] = useState<ProjectTask[]>([]);
    const [members, setMembers] = useState<ProjectMember[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [view, setView] = useState<'grid' | 'list' | 'kanban'>('grid');
    const [showNewProjectModal, setShowNewProjectModal] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [showNewTaskModal, setShowNewTaskModal] = useState(false);
    const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
    const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
    const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

    // Permission helpers
    const getCurrentUserRole = () => {
        if (selectedProject?.owner_id === parseInt(user.id)) return 'owner';
        const member = members.find(m => m.user_id === parseInt(user.id));
        return member?.role || (user.role === 'ADMIN' ? 'admin' : null);
    };

    const canEditTask = (task: ProjectTask) => {
        const role = getCurrentUserRole();
        if (role === 'owner' || role === 'admin') return true;
        if (task.created_by === parseInt(user.id)) return true;
        // Check if user is an assignee
        if (task.assignees?.some(a => a.id === parseInt(user.id))) return true;
        return false;
    };

    const canDeleteTask = (task: ProjectTask) => {
        const role = getCurrentUserRole();
        if (role === 'owner' || role === 'admin') return true;
        if (task.created_by === parseInt(user.id)) return true;
        return false;
    };

    // Drag and Drop handlers
    const handleDragStart = (e: React.DragEvent, taskId: number) => {
        setDraggedTaskId(taskId);
        e.dataTransfer.setData('text/plain', taskId.toString());
        e.dataTransfer.effectAllowed = 'move';
        // Adiciona um timeout curto para mudar a opacidade do elemento original sem quebrar o ghost image
        setTimeout(() => {
            const el = document.getElementById(`task-card-${taskId}`);
            if (el) el.style.opacity = '0.4';
        }, 0);
    };

    const handleDragEnd = (e: React.DragEvent, taskId: number) => {
        setDraggedTaskId(null);
        setDragOverColumn(null);
        const el = document.getElementById(`task-card-${taskId}`);
        if (el) el.style.opacity = '1';
    };

    const handleDragOver = (e: React.DragEvent, columnKey: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverColumn !== columnKey) {
            setDragOverColumn(columnKey);
        }
    };

    const handleDragEnter = (e: React.DragEvent, columnKey: string) => {
        e.preventDefault();
        setDragOverColumn(columnKey);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        // Não limpamos aqui para evitar flicker, deixamos pro drop ou dragend
    };

    const handleDrop = async (e: React.DragEvent, status: string) => {
        e.preventDefault();
        setDragOverColumn(null);
        const taskIdStr = e.dataTransfer.getData('text/plain');
        const taskId = parseInt(taskIdStr) || draggedTaskId;

        if (taskId) {
            const task = tasks.find(t => t.id === taskId);
            if (task && task.status !== status) {
                // Optimistic update
                setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: status as any } : t));
                await handleTaskStatusChange(taskId, status, 0);
            }
        }
        setDraggedTaskId(null);
    };


    useEffect(() => {
        loadProjects();
        loadAllUsers();
    }, [user.id]);

    useEffect(() => {
        if (selectedProject) {
            loadProjectDetails(selectedProject.id);
        }
    }, [selectedProject]);

    const loadProjects = async () => {
        try {
            setLoading(true);
            const data = await getProjects();
            setProjects(data);
        } catch (error) {
            console.error('Error loading projects:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadAllUsers = async () => {
        try {
            const data = await getUsers();
            setAllUsers(data);
        } catch (error) {
            console.error('Error loading users:', error);
        }
    };

    const loadProjectDetails = async (projectId: number) => {
        try {
            const [tasksData, membersData] = await Promise.all([
                getProjectTasks(projectId),
                getProjectMembers(projectId)
            ]);
            setTasks(tasksData);
            setMembers(membersData);
        } catch (error) {
            console.error('Error loading project details:', error);
        }
    };

    const handleCreateProject = async (projectData: any) => {
        try {
            const formData = new FormData();
            formData.append('name', projectData.name);
            formData.append('description', projectData.description || '');
            formData.append('ownerId', user.id);
            formData.append('status', projectData.status || 'active');
            formData.append('priority', projectData.priority);
            formData.append('startDate', projectData.startDate);
            formData.append('endDate', projectData.endDate);
            formData.append('visibility', projectData.visibility);
            formData.append('color', projectData.color);

            if (projectData.members && projectData.members.length > 0) {
                formData.append('members', JSON.stringify(projectData.members));
            }

            if (projectData.attachments && projectData.attachments.length > 0) {
                projectData.attachments.forEach((file: File) => {
                    formData.append('attachments', file);
                });
            }

            await createProject(formData);
            await loadProjects();
            setShowNewProjectModal(false);
        } catch (error) {
            console.error('Error creating project:', error);
        }
    };

    const handleUpdateProject = async (projectData: any) => {
        if (!editingProject) return;
        try {
            const formData = new FormData();
            Object.keys(projectData).forEach(key => {
                if (key === 'members') {
                    formData.append(key, JSON.stringify(projectData[key]));
                } else if (key === 'attachments') {
                    projectData[key].forEach((file: File) => formData.append('attachments', file));
                } else {
                    formData.append(key, projectData[key] || '');
                }
            });

            await updateProject(editingProject.id, formData);
            await loadProjects();
            setEditingProject(null);
        } catch (error) {
            console.error('Error updating project:', error);
        }
    };

    const handleCreateTask = async (taskData: any) => {
        if (!selectedProject) return;
        try {
            const formData = new FormData();
            Object.keys(taskData).forEach(key => {
                if (key === 'assignees' || key === 'subtasks') {
                    formData.append(key, JSON.stringify(taskData[key]));
                } else if (key === 'attachments') {
                    taskData[key].forEach((file: File) => formData.append('attachments', file));
                } else {
                    formData.append(key, taskData[key] || '');
                }
            });

            await createTask(selectedProject.id, formData);
            await loadProjectDetails(selectedProject.id);
            setShowNewTaskModal(false);
        } catch (error) {
            console.error('Error creating task:', error);
        }
    };

    const handleUpdateTask = async (taskData: any) => {
        if (!editingTask || !selectedProject) return;
        try {
            const formData = new FormData();
            Object.keys(taskData).forEach(key => {
                if (key === 'assignees' || key === 'subtasks') {
                    formData.append(key, JSON.stringify(taskData[key]));
                } else if (key === 'attachments') {
                    taskData[key].forEach((file: File) => formData.append('attachments', file));
                } else {
                    formData.append(key, taskData[key] || '');
                }
            });

            await updateTask(editingTask.id, formData);
            await loadProjectDetails(selectedProject.id);
            setEditingTask(null);
        } catch (error) {
            console.error('Error updating task:', error);
        }
    };

    const handleDeleteProject = async (projectId: number) => {
        if (!confirm('Tem certeza que deseja excluir este projeto? Todas as tarefas também serão excluídas.')) return;

        try {
            await deleteProject(projectId);
            setProjects(projects.filter(p => p.id !== projectId));
            if (selectedProject?.id === projectId) {
                setSelectedProject(null);
            }
        } catch (error) {
            console.error('Error deleting project:', error);
        }
    };

    const handleDuplicateProject = async (projectId: number) => {
        if (!confirm('Deseja duplicar este projeto?')) return;
        try {
            await duplicateProject(projectId);
            await loadProjects();
        } catch (error) {
            console.error('Error duplicating project:', error);
        }
    };

    const handleArchiveProject = async (projectId: number, isArchived: boolean) => {
        const action = isArchived ? 'arquivar' : 'desarquivar';
        if (!confirm(`Deseja ${action} este projeto?`)) return;
        try {
            await archiveProject(projectId, isArchived);
            await loadProjects();
        } catch (error) {
            console.error('Error archiving project:', error);
        }
    };


    const handleDeleteTask = async (taskId: number) => {
        if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return;
        try {
            await deleteTask(taskId);
            if (selectedProject) {
                await loadProjectDetails(selectedProject.id);
            }
        } catch (error) {
            console.error('Error deleting task:', error);
        }
    };


    const handleTaskStatusChange = async (taskId: number, newStatus: string, orderIndex: number) => {
        try {
            await updateTaskStatus(taskId, newStatus, orderIndex);
            if (selectedProject) {
                await loadProjectDetails(selectedProject.id);
            }
        } catch (error) {
            console.error('Error updating task status:', error);
        }
    };

    const handleToggleSubtask = async (subtaskId: number, isCompleted: boolean) => {
        try {
            await toggleSubtask(subtaskId, isCompleted);

            // Lógica para mover automaticamente para 'done' se for a última subtask
            if (isCompleted && selectedProject) {
                const task = tasks.find(t => t.subtasks?.some(s => s.id === subtaskId));
                if (task) {
                    const otherSubtasks = task.subtasks?.filter(s => s.id !== subtaskId) || [];
                    const allOthersDone = otherSubtasks.every(s => s.is_completed);
                    if (allOthersDone && task.status !== 'done') {
                        // Move para done otimisticamente
                        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'done' } : t));
                        await handleTaskStatusChange(task.id, 'done', 0);
                    }
                }
            }

            if (selectedProject) {
                await loadProjectDetails(selectedProject.id);
            }
        } catch (error) {
            console.error('Error toggling subtask:', error);
        }
    };

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = () => setActiveDropdown(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent': return 'bg-red-100 text-red-700';
            case 'high': return 'bg-orange-100 text-orange-700';
            case 'medium': return 'bg-yellow-100 text-yellow-700';
            case 'low': return 'bg-green-100 text-green-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'done': return <CheckCircle2 size={16} className="text-green-600" />;
            case 'in_progress': return <Clock size={16} className="text-blue-600" />;
            case 'review': return <AlertCircle size={16} className="text-purple-600" />;
            default: return <Circle size={16} className="text-gray-400" />;
        }
    };

    const filteredProjects = projects.filter(p => {
        const name = p.name || '';
        const desc = p.description || '';
        const search = searchQuery || '';
        return name.toLowerCase().includes(search.toLowerCase()) ||
            desc.toLowerCase().includes(search.toLowerCase());
    });

    const tasksByStatus = {
        todo: tasks.filter(t => t.status === 'todo'),
        in_progress: tasks.filter(t => t.status === 'in_progress'),
        review: tasks.filter(t => t.status === 'review'),
        done: tasks.filter(t => t.status === 'done')
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-slate-600">Carregando projetos...</p>
                </div>
            </div>
        );
    }

    const renderKanban = () => (
        <div className="flex flex-col h-full bg-white dark:bg-slate-900">
            <header className="flex items-center justify-between p-4 border-b border-b-slate-200 dark:border-b-slate-800 shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setSelectedProject(null)}
                        className="text-slate-600 hover:text-slate-400 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                    >
                        ← Voltar
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{selectedProject?.name}</h2>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Quadro de Tarefas</p>
                    </div>
                </div>

                <button
                    onClick={() => setShowNewTaskModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-md active:scale-95"
                >
                    <Plus size={18} />
                    Nova Tarefa
                </button>
            </header>

            <div className="flex-1 overflow-x-auto p-6 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex gap-6 h-full min-h-[500px]">
                    {[
                        { id: 'todo', title: 'Pendente', count: tasks.filter(t => t.status === 'todo').length, color: 'bg-slate-100 dark:bg-slate-800' },
                        { id: 'in_progress', title: 'Em Progresso', count: tasks.filter(t => t.status === 'in_progress').length, color: 'bg-blue-100 dark:bg-blue-900/30' },
                        { id: 'review', title: 'Em Revisão', count: tasks.filter(t => t.status === 'review').length, color: 'bg-purple-100 dark:bg-purple-900/30' },
                        { id: 'done', title: 'Concluído', count: tasks.filter(t => t.status === 'done').length, color: 'bg-green-100 dark:bg-green-900/30' }
                    ].map(column => (
                        <div
                            key={column.id}
                            className="flex flex-col w-80 shrink-0"
                            onDragOver={(e) => handleDragOver(e, column.id)}
                            onDrop={(e) => handleDrop(e, column.id)}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${column.id === 'todo' ? 'bg-slate-400' :
                                        column.id === 'in_progress' ? 'bg-blue-500' :
                                            column.id === 'review' ? 'bg-purple-500' : 'bg-green-500'}`} />
                                    <h3 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-xs">{column.title}</h3>
                                    <span className="text-xs font-bold text-slate-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                                        {column.count}
                                    </span>
                                </div>
                            </div>
                            <div className="flex-1 bg-slate-100/50 dark:bg-slate-800/50 rounded-xl p-4 space-y-3 overflow-y-auto">
                                {tasksByStatus[column.id as keyof typeof tasksByStatus].map(task => (
                                    <div
                                        key={task.id}
                                        id={`task-card-${task.id}`}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, task.id)}
                                        onDragEnd={(e) => handleDragEnd(e, task.id)}
                                        onDoubleClick={() => { setEditingTask(task); setShowNewTaskModal(true); }}
                                        className="group bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all cursor-move active:scale-[0.98] relative"
                                    >
                                        <div className="flex items-start justify-between gap-4 mb-2">
                                            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight group-hover:text-blue-600 transition-colors truncate">{task.title}</h4>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setEditingTask(task); setShowNewTaskModal(true); }}
                                                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-400"
                                                >
                                                    <Edit2 size={12} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}
                                                    className="p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-slate-400 hover:text-red-600"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </div>

                                        {task.description && (
                                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 leading-relaxed">{task.description}</p>
                                        )}

                                        <div className="flex items-center justify-between flex-wrap gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                                                    {task.priority}
                                                </span>
                                                {task.due_date && (
                                                    <span className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 rounded-md">
                                                        <CalendarIcon size={10} />
                                                        {new Date(task.due_date).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex -space-x-2">
                                                {task.assignees && task.assignees.slice(0, 2).map(assignee => (
                                                    assignee.avatar ? (
                                                        <img
                                                            key={assignee.id}
                                                            src={assignee.avatar}
                                                            alt={assignee.name}
                                                            className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-800"
                                                            title={assignee.name}
                                                        />
                                                    ) : (
                                                        <div key={assignee.id} className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 border-2 border-white dark:border-slate-800 flex items-center justify-center text-[10px] text-blue-600 dark:text-blue-300 font-bold" title={assignee.name}>
                                                            {assignee.name.charAt(0)}
                                                        </div>
                                                    )
                                                ))}
                                                {task.assignees && task.assignees.length > 2 && (
                                                    <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 border-2 border-white dark:border-slate-800 flex items-center justify-center -ml-2">
                                                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">+{task.assignees.length - 2}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                                            {task.comment_count > 0 && (
                                                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 rounded-md">
                                                    <MessageSquare size={10} />
                                                    {task.comment_count}
                                                </span>
                                            )}
                                            {task.subtasks && task.subtasks.length > 0 && (
                                                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 rounded-md">
                                                    <CheckCircle2 size={10} />
                                                    {task.subtasks.filter(s => s.is_completed).length}/{task.subtasks.length}
                                                </span>
                                            )}
                                            {task.attachment_count > 0 && (
                                                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 rounded-md">
                                                    <Paperclip size={10} />
                                                    {task.attachment_count}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                </div>
            </div>
            {(showNewTaskModal || editingTask) && (
                <NewTaskModal
                    onClose={() => {
                        setShowNewTaskModal(false);
                        setEditingTask(null);
                    }}
                    onSave={editingTask ? handleUpdateTask : handleCreateTask}
                    users={allUsers}
                    initialData={editingTask}
                    isEditing={!!editingTask}
                />
            )}
        </div>
    );

    if (selectedProject && view === 'kanban') {
        return renderKanban();
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Projetos</h1>
                    <p className="text-slate-600 mt-1">Gerencie seus projetos e tarefas</p>
                </div>
                <button
                    onClick={() => setShowNewProjectModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                    <Plus size={20} />
                    Novo Projeto
                </button>
            </div>

            {/* Search and Filters */}
            <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar projetos..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg p-1">
                    <button
                        onClick={() => setView('grid')}
                        className={`p-2 rounded ${view === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                        <Grid3x3 size={20} />
                    </button>
                    <button
                        onClick={() => setView('list')}
                        className={`p-2 rounded ${view === 'list' ? 'bg-blue-100 text-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                        <List size={20} />
                    </button>
                </div>
            </div>

            {/* Projects Grid */}
            <div className={view === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
                {filteredProjects.map(project => (
                    <div
                        key={project.id}
                        className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => {
                            setSelectedProject(project);
                            setView('kanban');
                        }}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">{project.name}</h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{project.description}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: project.color }}
                                ></div>
                                <div className="relative">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveDropdown(activeDropdown === project.id ? null : project.id);
                                        }}
                                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                                    >
                                        <MoreVertical size={16} />
                                    </button>

                                    {activeDropdown === project.id && (
                                        <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-10 py-1">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveDropdown(null);
                                                    setEditingProject(project);
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2"
                                            >
                                                <Edit2 size={14} />
                                                Editar
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveDropdown(null);
                                                    handleDuplicateProject(project.id);
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                            >
                                                <Copy size={14} />
                                                Duplicar
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveDropdown(null);
                                                    handleArchiveProject(project.id, !project.is_archived);
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                            >
                                                <Archive size={14} />
                                                {project.is_archived ? 'Desarquivar' : 'Arquivar'}
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveDropdown(null);
                                                    handleDeleteProject(project.id);
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                            >
                                                <Trash2 size={14} />
                                                Excluir
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400 mb-4">
                            <span className="flex items-center gap-1">
                                <Users size={16} />
                                {project.member_count || 0}
                            </span>
                            <span className="flex items-center gap-1">
                                <CheckCircle2 size={16} />
                                {project.completed_tasks || 0}/{project.task_count || 0}
                            </span>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {project.owner_avatar ? (
                                    <img
                                        src={project.owner_avatar}
                                        alt={project.owner_name}
                                        className="w-6 h-6 rounded-full border border-slate-200"
                                    />
                                ) : (
                                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                                        {project.owner_name?.charAt(0) || 'U'}
                                    </div>
                                )}
                                <span className="text-xs text-slate-600 dark:text-slate-400">
                                    Criado por <span className="font-medium text-slate-900 dark:text-slate-200">{project.owner_name || 'Desconhecido'}</span>
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${project.status === 'active' ? 'bg-green-100 text-green-700' :
                                    project.status === 'on_hold' ? 'bg-yellow-100 text-yellow-700' :
                                        project.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                            'bg-gray-100 text-gray-700'
                                    }`}>
                                    {project.status === 'active' ? 'Ativo' :
                                        project.status === 'on_hold' ? 'Pausado' :
                                            project.status === 'completed' ? 'Concluído' : 'Arquivado'}
                                </span>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(project.priority)}`}>
                                    {project.priority}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {filteredProjects.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-slate-600">Nenhum projeto encontrado</p>
                </div>
            )}

            {/* New/Edit Project Modal */}
            {(showNewProjectModal || editingProject) && (
                <NewProjectModal
                    onClose={() => {
                        setShowNewProjectModal(false);
                        setEditingProject(null);
                    }}
                    onCreate={editingProject ? handleUpdateProject : handleCreateProject}
                    users={allUsers}
                    initialData={editingProject}
                    isEditing={!!editingProject}
                />
            )}

            {/* New/Edit Task Modal */}
            {(showNewTaskModal || editingTask) && (
                <NewTaskModal
                    onClose={() => {
                        setShowNewTaskModal(false);
                        setEditingTask(null);
                    }}
                    onSave={editingTask ? handleUpdateTask : handleCreateTask}
                    users={allUsers}
                    initialData={editingTask}
                    isEditing={!!editingTask}
                />
            )}
        </div>
    );
};

// New Project Modal Component
const NewProjectModal: React.FC<{
    onClose: () => void;
    onCreate: (data: any) => void;
    users: User[];
    initialData?: Project | null;
    isEditing?: boolean;
}> = ({ onClose, onCreate, users, initialData, isEditing }) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        priority: 'medium',
        visibility: 'public',
        status: 'active',
        color: '#3B82F6',
        startDate: '',
        endDate: ''
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name,
                description: initialData.description || '',
                priority: initialData.priority,
                visibility: initialData.visibility || 'public',
                status: initialData.status || 'active',
                color: initialData.color || '#3B82F6',
                startDate: initialData.start_date ? initialData.start_date.split('T')[0] : '',
                endDate: initialData.end_date ? initialData.end_date.split('T')[0] : ''
            });
        }
    }, [initialData]);

    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const [attachments, setAttachments] = useState<File[]>([]);
    const [userSearch, setUserSearch] = useState('');
    const [showUserDropdown, setShowUserDropdown] = useState(false);

    const filteredUsers = users.filter(u => {
        const name = u.name || '';
        const position = u.position || '';
        const search = userSearch || '';
        return name.toLowerCase().includes(search.toLowerCase()) ||
            position.toLowerCase().includes(search.toLowerCase());
    });

    const handleUserToggle = (userId: string) => {
        if (selectedMembers.includes(userId)) {
            setSelectedMembers(selectedMembers.filter(id => id !== userId));
        } else {
            setSelectedMembers([...selectedMembers, userId]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setAttachments([...attachments, ...Array.from(e.target.files)]);
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments(attachments.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onCreate({
            ...formData,
            members: selectedMembers,
            attachments
        });
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-xl max-w-xl w-full p-6 my-8 shadow-2xl border border-slate-200 dark:border-slate-800">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">{isEditing ? 'Editar Projeto' : 'Novo Projeto'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="projectName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Nome do Projeto *</label>
                        <input
                            id="projectName"
                            name="projectName"
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
                            placeholder="Ex: Novo Website"
                        />
                    </div>
                    <div>
                        <label htmlFor="projectDescription" className="block text-sm font-medium text-slate-700 mb-2">Descrição</label>
                        <textarea
                            id="projectDescription"
                            name="projectDescription"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                            className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
                            placeholder="Descreva o objetivo do projeto"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="projectPriority" className="block text-sm font-medium text-slate-700 mb-2">Prioridade</label>
                            <select
                                id="projectPriority"
                                name="projectPriority"
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
                            >
                                <option value="low">Baixa</option>
                                <option value="medium">Média</option>
                                <option value="high">Alta</option>
                                <option value="urgent">Urgente</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="projectStatus" className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                            <select
                                id="projectStatus"
                                name="projectStatus"
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="active">Ativo</option>
                                <option value="on_hold">Pausado</option>
                                <option value="completed">Concluído</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="projectVisibility" className="block text-sm font-medium text-slate-700 mb-2">Visibilidade</label>
                            <select
                                id="projectVisibility"
                                name="projectVisibility"
                                value={formData.visibility}
                                onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="public">Público</option>
                                <option value="private">Privado (Somente equipe selecionada)</option>
                            </select>
                        </div>
                    </div>

                    {formData.visibility === 'private' && (
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-700">Selecionar Equipe</label>
                            <div className="relative">
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {selectedMembers.map(id => {
                                        const u = users.find(user => user.id.toString() === id);
                                        return u ? (
                                            <span key={id} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-medium">
                                                {u.name}
                                                <button type="button" onClick={() => handleUserToggle(id)} className="hover:text-blue-900">×</button>
                                            </span>
                                        ) : null;
                                    })}
                                </div>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        id="projectUserSearch"
                                        name="projectUserSearch"
                                        type="text"
                                        value={userSearch}
                                        onChange={(e) => {
                                            setUserSearch(e.target.value);
                                            setShowUserDropdown(true);
                                        }}
                                        onFocus={() => setShowUserDropdown(true)}
                                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="Buscar usuários..."
                                    />
                                    {showUserDropdown && userSearch && (
                                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                            {filteredUsers.length > 0 ? (
                                                filteredUsers.map(u => (
                                                    <button
                                                        key={u.id}
                                                        type="button"
                                                        onClick={() => {
                                                            handleUserToggle(u.id.toString());
                                                            setUserSearch('');
                                                            setShowUserDropdown(false);
                                                        }}
                                                        className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2 border-b last:border-0"
                                                    >
                                                        {u.avatar ? (
                                                            <img src={u.avatar} className="w-6 h-6 rounded-full" />
                                                        ) : (
                                                            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px]">
                                                                {u.name.charAt(0)}
                                                            </div>
                                                        )}
                                                        <span className="text-sm">{u.name}</span>
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="px-4 py-2 text-sm text-slate-500">Nenhum usuário encontrado</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="projectStartDate" className="block text-sm font-medium text-slate-700 mb-2">Data de Início</label>
                            <input
                                id="projectStartDate"
                                name="projectStartDate"
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
                            />
                        </div>
                        <div>
                            <label htmlFor="projectEndDate" className="block text-sm font-medium text-slate-700 mb-2">Previsão de Entrega</label>
                            <input
                                id="projectEndDate"
                                name="projectEndDate"
                                type="date"
                                value={formData.endDate}
                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Anexos</label>
                        <div className="space-y-2">
                            <label htmlFor="projectAttachments" className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-colors">
                                <Paperclip size={18} className="text-slate-500" />
                                <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">Anexar arquivos</span>
                                <input id="projectAttachments" name="projectAttachments" type="file" multiple onChange={handleFileChange} className="hidden" />
                            </label>
                            {attachments.length > 0 && (
                                <div className="grid grid-cols-1 gap-1">
                                    {attachments.map((file, index) => (
                                        <div key={index} className="flex items-center justify-between px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <Paperclip size={14} className="text-slate-400 shrink-0" />
                                                <span className="text-xs text-slate-700 truncate">{file.name}</span>
                                            </div>
                                            <button type="button" onClick={() => removeAttachment(index)} className="text-slate-400 hover:text-red-600 p-1">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2 text-slate-700 hover:bg-slate-100 rounded-lg font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 shadow-sm"
                        >
                            {isEditing ? <Edit2 size={18} /> : <Plus size={18} />}
                            {isEditing ? 'Salvar Alterações' : 'Criar Projeto'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// New/Edit Task Modal Component
const NewTaskModal: React.FC<{
    onClose: () => void;
    onSave: (data: any) => void;
    users: User[];
    initialData?: ProjectTask | null;
    isEditing?: boolean;
}> = ({ onClose, onSave, users, initialData, isEditing }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        assignees: [] as string[],
        priority: 'medium',
        status: 'todo',
        dueDate: ''
    });

    const [subtasks, setSubtasks] = useState<string[]>([]);
    const [newSubtask, setNewSubtask] = useState('');
    const [attachments, setAttachments] = useState<File[]>([]);
    const [userSearch, setUserSearch] = useState('');
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState<User[]>([]);

    useEffect(() => {
        if (initialData) {
            setFormData({
                title: initialData.title,
                description: initialData.description || '',
                assignees: initialData.assignees ? initialData.assignees.map(a => a.id.toString()) : [],
                priority: initialData.priority,
                status: initialData.status,
                dueDate: initialData.due_date ? initialData.due_date.split('T')[0] : ''
            });

            if (initialData.subtasks) {
                setSubtasks(initialData.subtasks.map(s => s.title));
            }

            if (initialData.assignees) {
                // Map assignees to Users (assuming full user object is needed for display)
                // We only have limited info in initialData.assignees, but `users` prop has all details.
                const initialSelected = users.filter(u =>
                    initialData.assignees?.some(a => a.id === parseInt(u.id))
                );
                setSelectedUsers(initialSelected);
            }
        }
    }, [initialData, users]);

    const filteredUsers = users.filter(u => {
        const name = u.name || '';
        const position = u.position || '';
        const search = userSearch || '';
        return name.toLowerCase().includes(search.toLowerCase()) ||
            position.toLowerCase().includes(search.toLowerCase());
    });

    const handleUserSelect = (user: User) => {
        if (!selectedUsers.find(u => u.id === user.id)) {
            const newSelected = [...selectedUsers, user];
            setSelectedUsers(newSelected);
            setFormData({ ...formData, assignees: newSelected.map(u => u.id.toString()) });
        }
        setUserSearch('');
        setShowUserDropdown(false);
    };

    const handleRemoveUser = (userId: string) => {
        const newSelected = selectedUsers.filter(u => u.id.toString() !== userId);
        setSelectedUsers(newSelected);
        setFormData({ ...formData, assignees: newSelected.map(u => u.id.toString()) });
    };

    const handleAddSubtask = () => {
        if (newSubtask.trim()) {
            setSubtasks([...subtasks, newSubtask.trim()]);
            setNewSubtask('');
        }
    };

    const handleRemoveSubtask = (index: number) => {
        setSubtasks(subtasks.filter((_, i) => i !== index));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setAttachments([...attachments, ...Array.from(e.target.files)]);
        }
    };

    const handleRemoveAttachment = (index: number) => {
        setAttachments(attachments.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...formData,
            subtasks,
            attachments
        });
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-xl max-w-xl w-full p-6 my-8 shadow-2xl border border-slate-200 dark:border-slate-800">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">{isEditing ? 'Editar Tarefa' : 'Nova Tarefa'}</h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Título */}
                    <div>
                        <label htmlFor="taskTitle" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Título *</label>
                        <input
                            id="taskTitle"
                            name="taskTitle"
                            type="text"
                            required
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
                            placeholder="O que precisa ser feito?"
                        />
                    </div>

                    {/* Descrição */}
                    <div>
                        <label htmlFor="taskDescription" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Descrição</label>
                        <textarea
                            id="taskDescription"
                            name="taskDescription"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                            className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
                            placeholder="Descreva os detalhes da tarefa"
                        />
                    </div>

                    {/* Responsável com busca */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Responsável</label>
                        <div className="relative">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                {selectedUsers.map(user => (
                                    <div key={user.id} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-full border border-blue-200">
                                        {user.avatar ? (
                                            <img src={user.avatar} alt={user.name} className="w-5 h-5 rounded-full" />
                                        ) : (
                                            <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-[10px] font-semibold">
                                                {user.name.charAt(0)}
                                            </div>
                                        )}
                                        <span className="text-sm font-medium text-slate-900">{user.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveUser(user.id.toString())}
                                            className="ml-1 text-slate-400 hover:text-red-600"
                                        >
                                            <span className="sr-only">Remover</span>
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="relative w-full">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        id="taskUserSearch"
                                        name="taskUserSearch"
                                        type="text"
                                        value={userSearch}
                                        onChange={(e) => {
                                            setUserSearch(e.target.value);
                                            setShowUserDropdown(true);
                                        }}
                                        onFocus={() => setShowUserDropdown(true)}
                                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
                                        placeholder="Buscar usuário..."
                                    />
                                </div>
                            </div>
                            {showUserDropdown && userSearch && (
                                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                    {filteredUsers.length > 0 ? (
                                        filteredUsers.map(user => (
                                            <button
                                                key={user.id}
                                                type="button"
                                                onClick={() => handleUserSelect(user)}
                                                className="w-full px-4 py-3 text-left hover:bg-blue-50 flex items-center gap-3 border-b border-slate-100 last:border-b-0"
                                            >
                                                {user.avatar ? (
                                                    <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                                                        {user.name.charAt(0)}
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="font-medium text-slate-900">{user.name}</div>
                                                    {user.position && (
                                                        <div className="text-xs text-slate-500">{user.position}</div>
                                                    )}
                                                </div>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="px-4 py-3 text-slate-500 text-sm">Nenhum usuário encontrado</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Prioridade e Prazo */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="taskPriority" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Prioridade</label>
                            <select
                                id="taskPriority"
                                name="taskPriority"
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
                            >
                                <option value="low" className="dark:bg-slate-800">🟢 Baixa</option>
                                <option value="medium" className="dark:bg-slate-800">🟡 Média</option>
                                <option value="high" className="dark:bg-slate-800">🟠 Alta</option>
                                <option value="urgent" className="dark:bg-slate-800">🔴 Urgente</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="taskDueDate" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Prazo</label>
                            <input
                                id="taskDueDate"
                                name="taskDueDate"
                                type="date"
                                value={formData.dueDate}
                                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
                            />
                        </div>
                    </div>

                    {/* Horas Estimadas removido */}

                    {/* Subtarefas */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Subtarefas</label>
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <input
                                    id="taskNewSubtask"
                                    name="taskNewSubtask"
                                    type="text"
                                    value={newSubtask}
                                    onChange={(e) => setNewSubtask(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSubtask())}
                                    className="flex-1 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
                                    placeholder="Digite uma subtarefa e pressione Enter"
                                />
                                <button
                                    type="button"
                                    onClick={handleAddSubtask}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 font-medium border border-slate-200 dark:border-slate-700"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>
                            {subtasks.length > 0 && (
                                <div className="space-y-1 mt-3">
                                    {subtasks.map((subtask, index) => (
                                        <div key={index} className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
                                            <Circle size={14} className="text-slate-400" />
                                            <span className="flex-1 text-sm text-slate-700">{subtask}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveSubtask(index)}
                                                className="text-slate-400 hover:text-red-600"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Anexos */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Anexos</label>
                        <div className="space-y-2">
                            <label htmlFor="taskAttachments" className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors">
                                <Paperclip size={18} className="text-slate-500" />
                                <span className="text-sm text-slate-600 dark:text-slate-400">Clique para adicionar arquivos</span>
                                <input
                                    id="taskAttachments"
                                    name="taskAttachments"
                                    type="file"
                                    multiple
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </label>
                            {/* Existing attachments from server */}
                            {initialData?.attachments && initialData.attachments.length > 0 && (
                                <div className="grid grid-cols-1 gap-1">
                                    {initialData.attachments.map((file: any) => (
                                        <div key={file.id} className="flex items-center justify-between px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <Paperclip size={14} className="text-blue-400 shrink-0" />
                                                <a href={file.path} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-700 hover:underline truncate">
                                                    {file.name}
                                                </a>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-blue-400">{(file.size / 1024).toFixed(1)} KB</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {/* New attachments locally added */}
                            {attachments.length > 0 && (
                                <div className="grid grid-cols-1 gap-1">
                                    {attachments.map((file, index) => (
                                        <div key={index} className="flex items-center justify-between px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <Paperclip size={14} className="text-slate-400 shrink-0" />
                                                <span className="text-xs text-slate-700 truncate">{file.name}</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveAttachment(index)}
                                                className="text-slate-400 hover:text-red-600 p-1"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Botões */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2 text-slate-700 hover:bg-slate-100 rounded-lg font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
                        >
                            {isEditing ? <Edit2 size={18} /> : <Plus size={18} />}
                            {isEditing ? 'Salvar Alterações' : 'Criar Tarefa'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProjectManager;

