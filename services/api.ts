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

export default api;
