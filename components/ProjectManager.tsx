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
    const [showNewTaskModal, setShowNewTaskModal] = useState(false);
    const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeDropdown, setActiveDropdown] = useState<number | null>(null);

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
        e.dataTransfer.setData('taskId', taskId.toString());
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = async (e: React.DragEvent, status: string) => {
        e.preventDefault();
        const taskId = parseInt(e.dataTransfer.getData('taskId'));
        if (taskId) {
            const task = tasks.find(t => t.id === taskId);
            if (task && task.status !== status) {
                // Optimistic update
                setTasks(tasks.map(t => t.id === taskId ? { ...t, status: status as any } : t));
                await handleTaskStatusChange(taskId, status, 0);
            }
        }
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
            const data = await getProjects(user.id);
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
            formData.append('status', 'active');
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

    const handleCreateTask = async (taskData: any) => {
        if (!selectedProject) return;
        try {
            await createTask(selectedProject.id, { ...taskData, createdBy: user.id });
            await loadProjectDetails(selectedProject.id);
            setShowNewTaskModal(false);
        } catch (error) {
            console.error('Error creating task:', error);
        }
    };

    const handleUpdateTask = async (taskData: any) => {
        if (!editingTask || !selectedProject) return;
        try {
            // Update logic here
            await updateTask(editingTask.id, { ...taskData });
            await loadProjectDetails(selectedProject.id);
            setEditingTask(null);
        } catch (error) {
            console.error('Error updating task:', error);
        }
    };

    const handleDeleteProject = async (projectId: number) => {
        if (!confirm('Tem certeza que deseja excluir este projeto? Todas as tarefas também serão excluídas.')) return;
        try {
            await deleteProject(projectId, user.id);
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
            await duplicateProject(projectId, user.id);
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

    const filteredProjects = projects.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

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

    if (selectedProject && view === 'kanban') {
        return (
            <div className="h-full flex flex-col">
                {/* Header */}
                <div className="bg-white border-b border-slate-200 p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setSelectedProject(null)}
                                className="text-slate-600 hover:text-slate-900"
                            >
                                ← Voltar
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900">{selectedProject.name}</h1>
                                <p className="text-sm text-slate-600">{selectedProject.description}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowNewTaskModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            <Plus size={20} />
                            Nova Tarefa
                        </button>
                    </div>
                </div>

                {/* Kanban Board */}
                <div className="flex-1 overflow-x-auto p-6">
                    <div className="flex gap-4 h-full min-w-max">
                        {[
                            { key: 'todo', label: 'A Fazer', color: 'bg-slate-100' },
                            { key: 'in_progress', label: 'Em Progresso', color: 'bg-blue-100' },
                            { key: 'review', label: 'Em Revisão', color: 'bg-purple-100' },
                            { key: 'done', label: 'Concluído', color: 'bg-green-100' }
                        ].map(column => (
                            <div
                                key={column.key}
                                className="flex-1 min-w-[300px] flex flex-col"
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, column.key)}
                            >
                                <div className={`${column.color} rounded-t-xl p-4`}>
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold text-slate-900">{column.label}</h3>
                                        <span className="bg-white px-2 py-1 rounded-full text-xs font-medium">
                                            {tasksByStatus[column.key as keyof typeof tasksByStatus].length}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex-1 bg-slate-50 rounded-b-xl p-4 space-y-3 overflow-y-auto">
                                    {tasksByStatus[column.key as keyof typeof tasksByStatus].map(task => (
                                        <div
                                            key={task.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, task.id)}
                                            onDoubleClick={(e) => {
                                                e.stopPropagation();
                                                if (canEditTask(task)) {
                                                    setEditingTask(task);
                                                }
                                            }}
                                            className="bg-white rounded-lg p-4 shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer relative"
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <h4 className="font-medium text-slate-900 flex-1">{task.title}</h4>
                                                <div className="relative">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveDropdown(activeDropdown === task.id ? null : task.id);
                                                        }}
                                                        className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100"
                                                    >
                                                        <MoreVertical size={16} />
                                                    </button>

                                                    {activeDropdown === task.id && (
                                                        <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border border-slate-200 z-10 py-1">
                                                            {canEditTask(task) && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setActiveDropdown(null);
                                                                        setEditingTask(task);
                                                                    }}
                                                                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                                                >
                                                                    <Edit2 size={14} />
                                                                    Editar
                                                                </button>
                                                            )}
                                                            {canDeleteTask(task) && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setActiveDropdown(null);
                                                                        handleDeleteTask(task.id);
                                                                    }}
                                                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                                                >
                                                                    <Trash2 size={14} />
                                                                    Excluir
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {task.description && (
                                                <p className="text-sm text-slate-600 mb-3 line-clamp-2">{task.description}</p>
                                            )}

                                            {/* Subtasks List */}
                                            {task.subtasks && task.subtasks.length > 0 && (
                                                <div className="mb-3 space-y-1.5">
                                                    {task.subtasks.map(subtask => (
                                                        <div key={subtask.id} className="flex items-center gap-2 group">
                                                            <div
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleToggleSubtask(subtask.id, !subtask.is_completed);
                                                                }}
                                                                className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-colors ${subtask.is_completed
                                                                    ? 'bg-blue-500 border-blue-500 text-white'
                                                                    : 'border-slate-300 hover:border-blue-500'
                                                                    }`}
                                                            >
                                                                {subtask.is_completed && <CheckCircle2 size={10} />}
                                                            </div>
                                                            <span className={`text-xs ${subtask.is_completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                                                {subtask.title}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                                                        {task.priority}
                                                    </span>
                                                    <div className="flex -space-x-2">
                                                        {task.assignees && task.assignees.length > 0 ? (
                                                            task.assignees.map(assignee => (
                                                                assignee.avatar ? (
                                                                    <img
                                                                        key={assignee.id}
                                                                        src={assignee.avatar}
                                                                        alt={assignee.name}
                                                                        className="w-6 h-6 rounded-full border-2 border-white"
                                                                        title={assignee.name}
                                                                    />
                                                                ) : (
                                                                    <div key={assignee.id} className="w-6 h-6 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-[10px] text-blue-600 font-bold" title={assignee.name}>
                                                                        {assignee.name.charAt(0)}
                                                                    </div>
                                                                )
                                                            ))
                                                        ) : (
                                                            task.assigned_avatar && (
                                                                <img
                                                                    src={task.assigned_avatar}
                                                                    alt={task.assigned_name || ''}
                                                                    className="w-6 h-6 rounded-full border-2 border-white"
                                                                />
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 text-slate-500 text-xs">
                                                    {task.comment_count > 0 && (
                                                        <span className="flex items-center gap-1">
                                                            <MessageSquare size={14} />
                                                            {task.comment_count}
                                                        </span>
                                                    )}
                                                    {task.attachment_count > 0 && (
                                                        <span className="flex items-center gap-1">
                                                            <Paperclip size={14} />
                                                            {task.attachment_count}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

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
                        className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => {
                            setSelectedProject(project);
                            setView('kanban');
                        }}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-slate-900 mb-1">{project.name}</h3>
                                <p className="text-sm text-slate-600 line-clamp-2">{project.description}</p>
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
                                        className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100"
                                    >
                                        <MoreVertical size={16} />
                                    </button>

                                    {activeDropdown === project.id && (
                                        <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-slate-200 z-10 py-1">
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

                        <div className="flex items-center gap-4 text-sm text-slate-600 mb-4">
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
                ))}
            </div>

            {filteredProjects.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-slate-600">Nenhum projeto encontrado</p>
                </div>
            )}

            {/* New Project Modal */}
            {showNewProjectModal && (
                <NewProjectModal
                    onClose={() => setShowNewProjectModal(false)}
                    onCreate={handleCreateProject}
                    users={allUsers}
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
}> = ({ onClose, onCreate, users }) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        priority: 'medium',
        visibility: 'public',
        color: '#3B82F6',
        startDate: '',
        endDate: ''
    });

    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const [attachments, setAttachments] = useState<File[]>([]);
    const [userSearch, setUserSearch] = useState('');
    const [showUserDropdown, setShowUserDropdown] = useState(false);

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.position && u.position.toLowerCase().includes(userSearch.toLowerCase()))
    );

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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-xl max-w-2xl w-full p-6 my-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Novo Projeto</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Nome do Projeto *</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Ex: Novo Website"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Descrição</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Descreva o objetivo do projeto"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Prioridade</label>
                            <select
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="low">Baixa</option>
                                <option value="medium">Média</option>
                                <option value="high">Alta</option>
                                <option value="urgent">Urgente</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Visibilidade</label>
                            <select
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
                            <label className="block text-sm font-medium text-slate-700 mb-2">Data de Início</label>
                            <input
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Previsão de Entrega</label>
                            <input
                                type="date"
                                value={formData.endDate}
                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Anexos do Projeto</label>
                        <div className="space-y-2">
                            <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-colors">
                                <Paperclip size={18} className="text-slate-500" />
                                <span className="text-sm text-slate-600 font-medium">Anexar arquivos</span>
                                <input type="file" multiple onChange={handleFileChange} className="hidden" />
                            </label>
                            {attachments.length > 0 && (
                                <div className="space-y-1">
                                    {attachments.map((file, index) => (
                                        <div key={index} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
                                            <div className="flex items-center gap-2">
                                                <Paperclip size={14} className="text-slate-400" />
                                                <span className="text-sm text-slate-700 truncate max-w-[200px]">{file.name}</span>
                                            </div>
                                            <button type="button" onClick={() => removeAttachment(index)} className="text-slate-400 hover:text-red-600">
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
                            <Plus size={18} />
                            Criar Projeto
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

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.position?.toLowerCase().includes(userSearch.toLowerCase())
    );

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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-xl max-w-3xl w-full p-6 my-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">{isEditing ? 'Editar Tarefa' : 'Nova Tarefa'}</h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Título */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Título *</label>
                        <input
                            type="text"
                            required
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Digite o título da tarefa"
                        />
                    </div>

                    {/* Descrição */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Descrição</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Descreva os detalhes da tarefa"
                        />
                    </div>

                    {/* Responsável com busca */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Responsável</label>
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
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transform translate-y-2 opacity-0" size={18} />
                                {/* Adjusted Search Input */}
                                <div className="relative w-full">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        value={userSearch}
                                        onChange={(e) => {
                                            setUserSearch(e.target.value);
                                            setShowUserDropdown(true);
                                        }}
                                        onFocus={() => setShowUserDropdown(true)}
                                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Buscar usuário..."
                                    />
                                </div>
                            </div>
                            {showUserDropdown && userSearch && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
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
                            <label className="block text-sm font-medium text-slate-700 mb-2">Prioridade</label>
                            <select
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="low">🟢 Baixa</option>
                                <option value="medium">🟡 Média</option>
                                <option value="high">🟠 Alta</option>
                                <option value="urgent">🔴 Urgente</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Prazo</label>
                            <input
                                type="date"
                                value={formData.dueDate}
                                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Horas Estimadas removido */}

                    {/* Subtarefas */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Subtarefas</label>
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newSubtask}
                                    onChange={(e) => setNewSubtask(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSubtask())}
                                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Digite uma subtarefa e pressione Enter"
                                />
                                <button
                                    type="button"
                                    onClick={handleAddSubtask}
                                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium"
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
                            <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-colors">
                                <Paperclip size={18} className="text-slate-500" />
                                <span className="text-sm text-slate-600">Clique para adicionar arquivos</span>
                                <input
                                    type="file"
                                    multiple
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </label>
                            {attachments.length > 0 && (
                                <div className="space-y-1 mt-3">
                                    {attachments.map((file, index) => (
                                        <div key={index} className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
                                            <Paperclip size={14} className="text-slate-400" />
                                            <span className="flex-1 text-sm text-slate-700">{file.name}</span>
                                            <span className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveAttachment(index)}
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

