import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    console.log('🔑 Token from localStorage:', token ? `${token.substring(0, 20)}...` : 'NOT FOUND');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('✓ Authorization header set');
    } else {
        console.warn('⚠️ No token found in localStorage');
    }
    return config;
});

export interface LoginCredentials {
    username: string;
    password?: string;
}

export interface LoginResponse {
    success: boolean;
    message?: string;
    user?: any; // Keeping 'any' as 'User' is not defined elsewhere and not explicitly requested to be added.
    token?: string;
}

export const checkDbConnection = async () => {
    try {
        const response = await api.get('/test-db');
        return response.data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

export const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
    try {
        const response = await api.post('/login', credentials);
        return response.data;
    } catch (error: any) {
        if (error.response && error.response.data) {
            return error.response.data;
        }
        return { success: false, message: 'Erro na conexão com o servidor' };
    }
};

export const updateProfile = async (id: string, formData: FormData): Promise<LoginResponse> => {
    try {
        const response = await api.put(`/users/${id}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    } catch (error: any) {
        if (error.response && error.response.data) {
            return error.response.data;
        }
        return { success: false, message: 'Erro na atualização do perfil' };
    }
};


export const getUserProfile = async (id: string) => {
    try {
        const response = await api.get(`/users/${id}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching user profile:', error);
        throw error;
    }
};

export const getUsers = async () => {
    try {
        const response = await api.get('/users');
        return response.data;
    } catch (error) {
        console.error('Error fetching users:', error);
        throw error;
    }
};


// Mural API
export const getMuralFeed = async () => {
    try {
        const response = await api.get('/mural/feed');
        return response.data;
    } catch (error) {
        console.error('Error fetching mural feed:', error);
        throw error;
    }
};

export const createPost = async (formData: FormData) => {
    try {
        const response = await api.post('/posts', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    } catch (error) {
        console.error('Error creating post:', error);
        throw error;
    }
};

export const deletePost = async (postId: number, userId: string, userRole: string = '') => {
    try {
        const response = await api.delete(`/posts/${postId}?userId=${userId}&userRole=${userRole}`);
        return response.data;
    } catch (error) {
        console.error('Error deleting post:', error);
        throw error;
    }
};

export const toggleLike = async (postId: number, userId: string) => {
    try {
        const response = await api.post(`/posts/${postId}/like`, { userId });
        return response.data;
    } catch (error) {
        console.error('Error toggling like:', error);
        throw error;
    }
};

export const getLikedPosts = async (userId: string) => {
    try {
        const response = await api.get(`/posts/liked/${userId}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching liked posts:', error);
        throw error;
    }
};

export const getComments = async (postId: number) => {
    try {
        const response = await api.get(`/posts/${postId}/comments`);
        return response.data;
    } catch (error) {
        console.error('Error fetching comments:', error);
        throw error;
    }
};

export const addComment = async (postId: number, userId: string, content: string) => {
    try {
        const response = await api.post(`/posts/${postId}/comments`, { userId, content });
        return response.data;
    } catch (error) {
        console.error('Error adding comment:', error);
        throw error;
    }
};

export const deleteComment = async (commentId: number, userId: string, userRole: string = '') => {
    try {
        const response = await api.delete(`/comments/${commentId}?userId=${userId}&userRole=${userRole}`);
        return response.data;
    } catch (error) {
        console.error('Error deleting comment:', error);
        throw error;
    }
};

export const editPost = async (postId: number, userId: string, content: string) => {
    try {
        const response = await api.put(`/posts/${postId}`, { userId, content });
        return response.data;
    } catch (error) {
        console.error('Error editing post:', error);
        throw error;
    }
};


export const editComment = async (commentId: number, userId: string, content: string) => {
    try {
        const response = await api.put(`/comments/${commentId}`, { userId, content });
        return response.data;
    } catch (error) {
        console.error('Error editing comment:', error);
        throw error;
    }
};

// Dashboard API

// Warnings
export const getActiveWarning = async () => {
    try {
        const response = await api.get('/warnings');
        return response.data;
    } catch (error) {
        console.error('Error fetching warning:', error);
        throw error;
    }
};

export const createWarning = async (data: any) => {
    try {
        const response = await api.post('/warnings', data);
        return response.data;
    } catch (error) {
        console.error('Error creating warning:', error);
        throw error;
    }
};

export const updateWarning = async (id: number, data: any) => {
    try {
        const response = await api.put(`/warnings/${id}`, data);
        return response.data;
    } catch (error) {
        console.error('Error updating warning:', error);
        throw error;
    }
};

export const deleteWarning = async (id: number) => {
    try {
        const response = await api.delete(`/warnings/${id}`);
        return response.data;
    } catch (error) {
        console.error('Error deleting warning:', error);
        throw error;
    }
};

// Notes
export const getNote = async (userId: string) => {
    try {
        const response = await api.get(`/notes/${userId}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching note:', error);
        throw error;
    }
};

export const saveNote = async (userId: string, content: string) => {
    try {
        const response = await api.post('/notes', { userId, content });
        return response.data;
    } catch (error) {
        console.error('Error saving note:', error);
        throw error;
    }
};

// Shortcuts
export const getShortcuts = async (userId: string) => {
    try {
        const response = await api.get(`/shortcuts/${userId}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching shortcuts:', error);
        throw error;
    }
};

export const createShortcut = async (data: any) => {
    try {
        const response = await api.post('/shortcuts', data);
        return response.data;
    } catch (error) {
        console.error('Error creating shortcut:', error);
        throw error;
    }
};

export const updateShortcut = async (id: number, data: any) => {
    try {
        const response = await api.put(`/shortcuts/${id}`, data);
        return response.data;
    } catch (error) {
        console.error('Error updating shortcut:', error);
        throw error;
    }
};

export const deleteShortcut = async (id: number, userId: string) => {
    try {
        const response = await api.delete(`/shortcuts/${id}?userId=${userId}`);
        return response.data;
    } catch (error) {
        console.error('Error deleting shortcut:', error);
        throw error;
    }
};

export const toggleShortcutFavorite = async (id: number, userId: string, isFavorite: boolean) => {
    try {
        const response = await api.patch(`/shortcuts/${id}/favorite`, { userId, isFavorite });
        return response.data;
    } catch (error) {
        console.error('Error toggling shortcut favorite:', error);
        throw error;
    }
};

// System Shortcuts (Shared)
export const getSystemShortcuts = async () => {
    try {
        const response = await api.get('/system-shortcuts');
        return response.data;
    } catch (error) {
        console.error('Error fetching system shortcuts:', error);
        throw error;
    }
};

export const createSystemShortcut = async (data: any) => {
    try {
        const response = await api.post('/system-shortcuts', data);
        return response.data;
    } catch (error) {
        console.error('Error creating system shortcut:', error);
        throw error;
    }
};

export const updateSystemShortcut = async (id: number, data: any) => {
    try {
        const response = await api.put(`/system-shortcuts/${id}`, data);
        return response.data;
    } catch (error) {
        console.error('Error updating system shortcut:', error);
        throw error;
    }
};

export const deleteSystemShortcut = async (id: number, userRole: string) => {
    try {
        const response = await api.delete(`/system-shortcuts/${id}?userRole=${userRole}`);
        return response.data;
    } catch (error) {
        console.error('Error deleting system shortcut:', error);
        throw error;
    }
};

export const toggleSystemShortcutFavorite = async (id: number, userRole: string, isFavorite: boolean) => {
    try {
        const response = await api.patch(`/system-shortcuts/${id}/favorite`, { userRole, isFavorite });
        return response.data;
    } catch (error) {
        console.error('Error toggling system shortcut favorite:', error);
        throw error;
    }
};

// Todos
export const getTodos = async (userId: number) => {
    try {
        const response = await api.get(`/todos/${userId}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching todos:', error);
        throw error;
    }
};

export const createTodo = async (userId: number, text: string) => {
    try {
        const response = await api.post('/todos', { userId, text });
        return response.data;
    } catch (error) {
        console.error('Error creating todo:', error);
        throw error;
    }
};

export const updateTodo = async (id: number, completed: boolean) => {
    try {
        const response = await api.patch(`/todos/${id}`, { completed });
        return response.data;
    } catch (error) {
        console.error('Error updating todo:', error);
        throw error;
    }
};

export const deleteTodo = async (id: number) => {
    try {
        const response = await api.delete(`/todos/${id}`);
        return response.data;
    } catch (error) {
        console.error('Error deleting todo:', error);
        throw error;
    }
};


// Events
export const getEvents = async (userId: string, userRole: string) => {
    try {
        const response = await api.get(`/events?userId=${userId}&userRole=${userRole}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching events:', error);
        throw error;
    }
};

export const createEvent = async (data: any) => {
    try {
        const response = await api.post('/events', data);
        return response.data;
    } catch (error) {
        console.error('Error creating event:', error);
        throw error;
    }
};

export const updateEvent = async (id: number, data: any) => {
    try {
        const response = await api.put(`/events/${id}`, data);
        return response.data;
    } catch (error) {
        console.error('Error updating event:', error);
        throw error;
    }
};

export const deleteEvent = async (id: number, userId: string, userRole: string) => {
    try {
        const response = await api.delete(`/events/${id}?userId=${userId}&userRole=${userRole}`);
        return response.data;
    } catch (error) {
        console.error('Error deleting event:', error);
        throw error;
    }
};

export const getHolidays = async (year: number) => {
    try {
        const response = await api.get(`/holidays?year=${year}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching holidays:', error);
        throw error;
    }
};

export const globalSearch = async (query: string, userId: string, userRole: string) => {
    try {
        const response = await api.get(`/search?q=${query}&userId=${userId}&userRole=${userRole}`);
        return response.data;
    } catch (error) {
        console.error('Error in global search:', error);
        throw error;
    }
};

// Admin API
export const getAdminSettings = async () => {
    try {
        const response = await api.get('/admin/settings');
        return response.data;
    } catch (error) {
        console.error('Error fetching admin settings:', error);
        throw error;
    }
};

export const updateAdminSetting = async (key: string, value: any) => {
    try {
        const response = await api.put(`/admin/settings/${key}`, { value });
        return response.data;
    } catch (error) {
        console.error(`Error updating admin setting ${key}:`, error);
        throw error;
    }
};

export const uploadAdminFile = async (key: string, field: string, file: File) => {
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('field', field);
        const response = await api.post(`/admin/settings/upload/${key}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    } catch (error) {
        console.error(`Error uploading admin file for ${key}:`, error);
        throw error;
    }
};

export const getAdminStats = async () => {
    try {
        const response = await api.get('/admin/stats');
        return response.data;
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        throw error;
    }
};

export const getAdminUsers = async () => {
    try {
        const response = await api.get('/admin/users');
        return response.data;
    } catch (error) {
        console.error('Error fetching admin users:', error);
        throw error;
    }
};

export const updateUserRole = async (userId: number, role: string) => {
    try {
        const response = await api.put(`/admin/users/${userId}/role`, { role });
        return response.data;
    } catch (error) {
        console.error(`Error updating user role for ${userId}:`, error);
        throw error;
    }
};

export const updateUserQuota = async (userId: number, quota: number) => {
    try {
        const response = await api.put(`/admin/users/${userId}/quota`, { quota });
        return response.data;
    } catch (error) {
        console.error(`Error updating user quota for ${userId}:`, error);
        throw error;
    }
};

export const testLDAPConnection = async () => {
    try {
        const response = await api.post('/admin/ldap/test');
        return response.data;
    } catch (error) {
        console.error('Error testing LDAP connection:', error);
        throw error;
    }
};

// Public API
export const getPublicSetting = async (key: string) => {
    try {
        const response = await api.get(`/public/settings/${key}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching public setting ${key}:`, error);
        throw error;
    }
};

export const renameFolder = async (id: number, userId: string, name: string) => {
    try {
        const response = await api.put(`/drive/folders/${id}`, { userId, name });
        return response.data;
    } catch (error) {
        console.error(`Error renaming folder ${id}:`, error);
        throw error;
    }
};

export const renameFile = async (id: number, userId: string, name: string) => {
    try {
        const response = await api.put(`/drive/files/${id}`, { userId, name });
        return response.data;
    } catch (error) {
        console.error(`Error renaming file ${id}:`, error);
        throw error;
    }
};

export const getStorageStats = async (userId: string) => {
    try {
        const response = await api.get(`/drive/storage-stats/${userId}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching storage stats:', error);
        throw error;
    }
};

// Projects API
export const getProjects = async (userId: string, filters?: any) => {
    try {
        const params = new URLSearchParams({ userId, ...filters });
        const response = await api.get(`/projects?${params}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching projects:', error);
        throw error;
    }
};

export const getProjectById = async (id: number) => {
    try {
        const response = await api.get(`/projects/${id}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching project:', error);
        throw error;
    }
};

export const createProject = async (data: any) => {
    try {
        const response = await api.post('/projects', data);
        return response.data;
    } catch (error) {
        console.error('Error creating project:', error);
        throw error;
    }
};

export const updateProject = async (id: number, data: any) => {
    try {
        const response = await api.put(`/projects/${id}`, data);
        return response.data;
    } catch (error) {
        console.error('Error updating project:', error);
        throw error;
    }
};

export const deleteProject = async (id: number, userId: string) => {
    try {
        const response = await api.delete(`/projects/${id}?userId=${userId}`);
        return response.data;
    } catch (error) {
        console.error('Error deleting project:', error);
        throw error;
    }
};

export const duplicateProject = async (id: number, userId: string, newName?: string) => {
    try {
        const response = await api.post(`/projects/${id}/duplicate`, { userId, newName });
        return response.data;
    } catch (error) {
        console.error('Error duplicating project:', error);
        throw error;
    }
};

export const archiveProject = async (id: number, is_archived: boolean) => {
    try {
        const response = await api.patch(`/projects/${id}/archive`, { is_archived });
        return response.data;
    } catch (error) {
        console.error('Error archiving project:', error);
        throw error;
    }
};

export const getProjectStats = async (id: number) => {
    try {
        const response = await api.get(`/projects/${id}/stats`);
        return response.data;
    } catch (error) {
        console.error('Error fetching project stats:', error);
        throw error;
    }
};

// Project Members API
export const getProjectMembers = async (projectId: number) => {
    try {
        const response = await api.get(`/projects/${projectId}/members`);
        return response.data;
    } catch (error) {
        console.error('Error fetching project members:', error);
        throw error;
    }
};

export const addProjectMember = async (projectId: number, userId: number, role: string) => {
    try {
        const response = await api.post(`/projects/${projectId}/members`, { userId, role });
        return response.data;
    } catch (error) {
        console.error('Error adding project member:', error);
        throw error;
    }
};

export const updateMemberRole = async (projectId: number, userId: number, role: string) => {
    try {
        const response = await api.put(`/projects/${projectId}/members/${userId}`, { role });
        return response.data;
    } catch (error) {
        console.error('Error updating member role:', error);
        throw error;
    }
};

export const removeProjectMember = async (projectId: number, userId: number) => {
    try {
        const response = await api.delete(`/projects/${projectId}/members/${userId}`);
        return response.data;
    } catch (error) {
        console.error('Error removing project member:', error);
        throw error;
    }
};

// Project Tasks API
export const getProjectTasks = async (projectId: number) => {
    try {
        const response = await api.get(`/projects/${projectId}/tasks`);
        return response.data;
    } catch (error) {
        console.error('Error fetching project tasks:', error);
        throw error;
    }
};

export const getTaskById = async (id: number) => {
    try {
        const response = await api.get(`/tasks/${id}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching task:', error);
        throw error;
    }
};

export const createTask = async (projectId: number, data: any) => {
    try {
        const response = await api.post(`/projects/${projectId}/tasks`, data);
        return response.data;
    } catch (error) {
        console.error('Error creating task:', error);
        throw error;
    }
};

export const updateTask = async (id: number, data: any) => {
    try {
        const response = await api.put(`/tasks/${id}`, data);
        return response.data;
    } catch (error) {
        console.error('Error updating task:', error);
        throw error;
    }
};

export const updateTaskStatus = async (id: number, status: string, orderIndex: number) => {
    try {
        const response = await api.patch(`/tasks/${id}/status`, { status, orderIndex });
        return response.data;
    } catch (error) {
        console.error('Error updating task status:', error);
        throw error;
    }
};

export const toggleSubtask = async (id: number, is_completed: boolean) => {
    try {
        const response = await api.patch(`/subtasks/${id}/toggle`, { is_completed });
        return response.data;
    } catch (error) {
        console.error('Error toggling subtask:', error);
        throw error;
    }
};

export const deleteTask = async (id: number) => {
    try {
        const response = await api.delete(`/tasks/${id}`);
        return response.data;
    } catch (error) {
        console.error('Error deleting task:', error);
        throw error;
    }
};

// Task Comments API
export const getTaskComments = async (taskId: number) => {
    try {
        const response = await api.get(`/tasks/${taskId}/comments`);
        return response.data;
    } catch (error) {
        console.error('Error fetching task comments:', error);
        throw error;
    }
};

export const addTaskComment = async (taskId: number, userId: string, content: string) => {
    try {
        const response = await api.post(`/tasks/${taskId}/comments`, { userId, content });
        return response.data;
    } catch (error) {
        console.error('Error adding task comment:', error);
        throw error;
    }
};

export const updateTaskComment = async (id: number, content: string) => {
    try {
        const response = await api.put(`/task-comments/${id}`, { content });
        return response.data;
    } catch (error) {
        console.error('Error updating task comment:', error);
        throw error;
    }
};

export const deleteTaskComment = async (id: number) => {
    try {
        const response = await api.delete(`/task-comments/${id}`);
        return response.data;
    } catch (error) {
        console.error('Error deleting task comment:', error);
        throw error;
    }
};

// ServiceDesk
export const getTecticStats = async () => {
    const response = await api.get('/tectic/stats');
    return response.data;
};

export const getTecticTickets = async () => {
    const response = await api.get('/tectic/tickets');
    return response.data;
};

export const deleteTecticTickets = async (ids: number[]) => {
    const response = await api.delete('/tectic/bulk', { data: { ids } });
    return response.data;
};


export const getTecticDossier = async (id: number) => {
    const response = await api.get(`/tectic/tickets/${id}`);
    return response.data;
};

export const createTecticTicket = async (data: any) => {
    const response = await api.post('/tectic/tickets', data);
    return response.data;
};

export const updateTecticTicket = async (id: number, data: any) => {
    const response = await api.put(`/tectic/tickets/${id}`, data);
    return response.data;
};

export const addTecticComment = async (ticketId: number, comment: string, isInternal: boolean) => {
    const response = await api.post(`/tectic/tickets/${ticketId}/comments`, { comment, is_internal: isInternal });
    return response.data;
};

export const getTriageSuggestions = async (description: string) => {
    const response = await api.post('/tectic/triage', { description });
    return response.data;
};

export const getTecticDrive = async () => {
    const response = await api.get('/tectic/drive');
    return response.data;
};

export const uploadTecticFile = async (file: File, type: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('file_type', type);
    const response = await api.post('/tectic/drive/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

export const deleteTecticFile = async (id: number) => {
    const response = await api.delete(`/tectic/drive/${id}`);
    return response.data;
};

export const renameTecticFile = async (id: number, newName: string) => {
    const response = await api.put(`/tectic/drive/${id}`, { original_name: newName });
    return response.data;
};

export const getTecticNotices = async () => {
    const response = await api.get('/tectic/notices');
    return response.data;
};

export const createTecticNotice = async (data: any) => {
    const response = await api.post('/tectic/notices', data);
    return response.data;
};

export const getTecticKnowledge = async () => {
    const response = await api.get('/tectic/knowledge');
    return response.data;
};

export const createTecticKnowledge = async (data: any) => {
    const response = await api.post('/tectic/knowledge', data);
    return response.data;
};

export const updateTecticKnowledge = async (id: number, data: any) => {
    const response = await api.put(`/tectic/knowledge/${id}`, data);
    return response.data;
};

export const deleteTecticKnowledge = async (id: number) => {
    const response = await api.delete(`/tectic/knowledge/${id}`);
    return response.data;
};

// Notifications API
export const getNotifications = async (userId: string) => {
    try {
        const response = await api.get(`/notifications?userId=${userId}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching notifications:', error);
        throw error;
    }
};

export const markNotificationAsRead = async (id: number) => {
    try {
        const response = await api.put(`/notifications/${id}/read`);
        return response.data;
    } catch (error) {
        console.error('Error marking notification as read:', error);
        throw error;
    }
};

export const markAllNotificationsAsRead = async (userId: string) => {
    try {
        const response = await api.put('/notifications/read-all', { userId });
        return response.data;
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        throw error;
    }
};

// Sidebar Configuration API
export const getSidebarItems = async () => {
    const response = await api.get('/sidebar-items');
    return response.data;
};

export const createSidebarItem = async (data: any) => {
    const response = await api.post('/admin/sidebar-items', data);
    return response.data;
};

export const updateSidebarItem = async (id: number, data: any) => {
    const response = await api.put(`/admin/sidebar-items/${id}`, data);
    return response.data;
};

export const deleteSidebarItem = async (id: number) => {
    const response = await api.delete(`/admin/sidebar-items/${id}`);
    return response.data;
};

export const reorderSidebarItems = async (items: { id: number, order_index: number }[]) => {
    const response = await api.put('/admin/sidebar-items/reorder', { items });
    return response.data;
};

// Settings
export const getVisualIdentity = async () => {
    const response = await api.get('/public/settings/visual_identity');
    return response.data;
};

export const updateVisualIdentity = async (formData: FormData) => {
    const response = await api.put('/admin/settings/visual-identity', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export default api;

