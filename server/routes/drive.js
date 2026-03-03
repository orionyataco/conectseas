import express from 'express';
import pool from '../db.js';
import upload from '../middleware/upload.js';
import authMiddleware from '../middleware/auth.js';
import { sendNotification } from '../services/notificationService.js';

const router = express.Router();

// Apply auth middleware to all routes in this file
router.use(authMiddleware);

// Folders
router.get('/folders', async (req, res) => {
    const userId = req.user.id;
    const { parentId } = req.query;
    try {
        let folders;
        if (parentId && parentId !== 'null') {
            const [access] = await pool.query(`
                SELECT f.*, COALESCE(s.permission, 'OWNER') as permission
                FROM user_folders f
                LEFT JOIN folder_shares s ON f.id = s.folder_id AND s.user_id = ?
                WHERE f.id = ? AND(f.user_id = ? OR s.user_id = ?)
            `, [userId, parentId, userId, userId]);

            if (access.length === 0) return res.status(403).json({ error: 'Acesso negado' });

            const [rows] = await pool.query(
                `SELECT f.*, 'WRITE' as permission FROM user_folders f WHERE f.parent_id = ? AND f.is_deleted = 0 ORDER BY is_favorite DESC, name ASC`,
                [parentId]
            );
            folders = rows;
        } else {
            const [rows] = await pool.query(`
                SELECT f.*, 'OWNER' as permission, NULL as share_id
                FROM user_folders f
                WHERE f.user_id = ? AND f.parent_id IS NULL AND f.is_deleted = 0
                UNION ALL
                SELECT f.*, s.permission, s.id as share_id
                FROM user_folders f
                JOIN folder_shares s ON f.id = s.folder_id
                WHERE s.user_id = ? AND f.is_deleted = 0
                ORDER BY is_favorite DESC, name ASC
            `, [userId, userId]);
            folders = rows;
        }
        res.json(folders);
    } catch (error) {
        console.error('Erro ao buscar pastas:', error);
        res.status(500).json({ error: 'Erro ao buscar pastas' });
    }
});

router.get('/folders/:id', async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    try {
        const [rows] = await pool.query(`
            SELECT f.* FROM user_folders f
            LEFT JOIN folder_shares s ON f.id = s.folder_id AND s.user_id = ?
            WHERE f.id = ? AND (f.user_id = ? OR s.user_id = ?)
        `, [userId, id, userId, userId]);

        if (rows.length === 0) return res.status(403).json({ error: 'Acesso negado ou pasta não encontrada' });
        res.json(rows[0]);
    } catch (error) {
        console.error('Erro ao buscar folder:', error);
        res.status(500).json({ error: 'Erro ao buscar folder' });
    }
});

router.post('/folders', async (req, res) => {
    const userId = req.user.id;
    const { parentId, name } = req.body;
    try {
        if (parentId) {
            const [access] = await pool.query(`
                SELECT f.id FROM user_folders f
                LEFT JOIN folder_shares s ON f.id = s.folder_id AND s.user_id = ?
                WHERE f.id = ? AND(f.user_id = ? OR s.permission = 'WRITE')
            `, [userId, parentId, userId]);
            if (access.length === 0) return res.status(403).json({ error: 'Acesso negado para criação de pastas' });
        }
        await pool.query('INSERT INTO user_folders (user_id, parent_id, name, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)', [userId, parentId || null, name]);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao criar pasta:', error);
        res.status(500).json({ error: 'Erro ao criar pasta' });
    }
});

router.put('/folders/:id', async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const { name } = req.body;
    try {
        await pool.query('UPDATE user_folders SET name = ? WHERE id = ? AND user_id = ?', [name, id, userId]);
        res.json({ success: true });
    } catch (error) {
        console.error(`Error renaming folder ${id}:`, error);
        res.status(500).json({ error: 'Erro ao renomear pasta' });
    }
});

router.delete('/folders/:id', async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    try {
        const [folders] = await pool.query('SELECT user_id FROM user_folders WHERE id = ?', [id]);
        if (folders.length === 0) return res.status(404).json({ error: 'Pasta não encontrada' });
        if (folders[0].user_id != userId) return res.status(403).json({ error: 'Não autorizado' });
        await pool.query('DELETE FROM user_folders WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao deletar pasta:', error);
        res.status(500).json({ error: 'Erro ao deletar pasta' });
    }
});

// Files
router.get('/files', async (req, res) => {
    const userId = req.user.id;
    const { folderId } = req.query;
    try {
        if (folderId && folderId !== 'null') {
            const [access] = await pool.query(`
                SELECT f.id FROM user_folders f
                LEFT JOIN folder_shares s ON f.id = s.folder_id AND s.user_id = ?
                WHERE f.id = ? AND(f.user_id = ? OR s.user_id = ?)
            `, [userId, folderId, userId, userId]);
            if (access.length === 0) return res.status(403).json({ error: 'Acesso negado' });
            const [files] = await pool.query('SELECT * FROM user_files WHERE folder_id = ? AND is_deleted = 0 ORDER BY is_favorite DESC, updated_at DESC', [folderId]);
            res.json(files);
        } else {
            const [files] = await pool.query('SELECT * FROM user_files WHERE user_id = ? AND folder_id IS NULL AND is_deleted = 0 ORDER BY is_favorite DESC, updated_at DESC', [userId]);
            res.json(files);
        }
    } catch (error) {
        console.error('Erro ao buscar arquivos:', error);
        res.status(500).json({ error: 'Erro ao buscar arquivos' });
    }
});

router.post('/upload', upload.single('file'), async (req, res) => {
    const userId = req.user.id;
    const { folderId } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    try {
        if (folderId && folderId !== 'null') {
            const [access] = await pool.query(`
                SELECT f.id FROM user_folders f
                LEFT JOIN folder_shares s ON f.id = s.folder_id AND s.user_id = ?
                WHERE f.id = ? AND(f.user_id = ? OR s.permission = 'WRITE')
            `, [userId, folderId, userId]);
            if (access.length === 0) return res.status(403).json({ error: 'Acesso negado para upload' });
        }
        await pool.query('INSERT INTO user_files (user_id, folder_id, filename, original_name, file_type, file_size, updated_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)', [userId, folderId || null, file.filename, file.originalname, file.mimetype, file.size]);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao fazer upload:', error);
        res.status(500).json({ error: 'Erro ao fazer upload' });
    }
});

router.put('/files/:id', async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const { name } = req.body;
    try {
        await pool.query('UPDATE user_files SET original_name = ? WHERE id = ? AND user_id = ?', [name, id, userId]);
        res.json({ success: true });
    } catch (error) {
        console.error(`Error renaming file ${id}:`, error);
        res.status(500).json({ error: 'Erro ao renomear arquivo' });
    }
});

router.delete('/files/:id', async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    try {
        const [files] = await pool.query('SELECT user_id FROM user_files WHERE id = ?', [id]);
        if (files.length === 0) return res.status(404).json({ error: 'Arquivo não encontrado' });
        if (files[0].user_id != userId) return res.status(403).json({ error: 'Não autorizado' });
        await pool.query('DELETE FROM user_files WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao deletar arquivo:', error);
        res.status(500).json({ error: 'Erro ao deletar arquivo' });
    }
});

// Favorites
router.post('/folders/:id/favorite', async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const { is_favorite } = req.body;
    try {
        await pool.query('UPDATE user_folders SET is_favorite = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?', [is_favorite ? 1 : 0, id, userId]);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao favoritar pasta:', error);
        res.status(500).json({ error: 'Erro ao favoritar pasta' });
    }
});

router.post('/files/:id/favorite', async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const { is_favorite } = req.body;
    try {
        await pool.query('UPDATE user_files SET is_favorite = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?', [is_favorite ? 1 : 0, id, userId]);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao favoritar arquivo:', error);
        res.status(500).json({ error: 'Erro ao favoritar arquivo' });
    }
});

// Unified views
router.get('/recent', async (req, res) => {
    const userId = req.user.id;
    try {
        const [folders] = await pool.query("SELECT *, 'folder' as item_type FROM user_folders WHERE user_id = ? AND is_deleted = 0 ORDER BY updated_at DESC LIMIT 10", [userId]);
        const [files] = await pool.query("SELECT *, 'file' as item_type FROM user_files WHERE user_id = ? AND is_deleted = 0 ORDER BY updated_at DESC LIMIT 20", [userId]);
        const recent = [...folders, ...files].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 30);
        res.json(recent);
    } catch (error) {
        console.error('Erro ao buscar recentes:', error);
        res.status(500).json({ error: 'Erro ao buscar recentes' });
    }
});

router.get('/favorites', async (req, res) => {
    const userId = req.user.id;
    try {
        const [folders] = await pool.query("SELECT *, 'folder' as item_type FROM user_folders WHERE user_id = ? AND is_favorite = 1 AND is_deleted = 0 ORDER BY updated_at DESC", [userId]);
        const [files] = await pool.query("SELECT *, 'file' as item_type FROM user_files WHERE user_id = ? AND is_favorite = 1 AND is_deleted = 0 ORDER BY updated_at DESC", [userId]);
        const favorites = [...folders, ...files].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
        res.json(favorites);
    } catch (error) {
        console.error('Erro ao buscar favoritos:', error);
        res.status(500).json({ error: 'Erro ao buscar favoritos' });
    }
});

router.get('/trash', async (req, res) => {
    const userId = req.user.id;
    try {
        const [folders] = await pool.query("SELECT *, 'folder' as item_type FROM user_folders WHERE user_id = ? AND is_deleted = 1 ORDER BY updated_at DESC", [userId]);
        const [files] = await pool.query("SELECT *, 'file' as item_type FROM user_files WHERE user_id = ? AND is_deleted = 1 ORDER BY updated_at DESC", [userId]);
        const trash = [...folders, ...files].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
        res.json(trash);
    } catch (error) {
        console.error('Erro ao buscar lixeira:', error);
        res.status(500).json({ error: 'Erro ao buscar lixeira' });
    }
});

router.post('/:type/:id/trash', async (req, res) => {
    const { type, id } = req.params;
    const userId = req.user.id;
    const table = type === 'folders' ? 'user_folders' : 'user_files';
    try {
        await pool.query(`UPDATE ${table} SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`, [id, userId]);
        res.json({ success: true });
    } catch (error) {
        console.error(`Erro ao mover para lixeira (${type}):`, error);
        res.status(500).json({ error: 'Erro ao deletar item' });
    }
});

router.post('/:type/:id/restore', async (req, res) => {
    const { type, id } = req.params;
    const userId = req.user.id;
    const table = type === 'folders' ? 'user_folders' : 'user_files';
    try {
        await pool.query(`UPDATE ${table} SET is_deleted = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`, [id, userId]);
        res.json({ success: true });
    } catch (error) {
        console.error(`Erro ao restaurar da lixeira (${type}):`, error);
        res.status(500).json({ error: 'Erro ao restaurar item' });
    }
});

// Sharing
router.get('/shared', async (req, res) => {
    const userId = req.user.id;
    try {
        const [rows] = await pool.query(`
            SELECT f.*, s.permission, s.id as share_id, 'folder' as item_type
            FROM user_folders f
            JOIN folder_shares s ON f.id = s.folder_id
            WHERE s.user_id = ? AND f.is_deleted = 0
            ORDER BY f.updated_at DESC
        `, [userId]);
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar compartilhados:', error);
        res.status(500).json({ error: 'Erro ao buscar compartilhados' });
    }
});

router.post('/folders/:id/share', async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const { targetUserId, permission } = req.body;
    try {
        const [owner] = await pool.query('SELECT user_id FROM user_folders WHERE id = ?', [id]);
        if (owner.length === 0) return res.status(404).json({ error: 'Pasta não encontrada' });
        if (owner[0].user_id != userId) return res.status(403).json({ error: 'Apenas o dono pode compartilhar' });
        await pool.query('INSERT INTO folder_shares (folder_id, user_id, permission) VALUES (?, ?, ?) ON CONFLICT(folder_id, user_id) DO UPDATE SET permission = EXCLUDED.permission', [id, targetUserId, permission]);
        const [folder] = await pool.query('SELECT name FROM user_folders WHERE id = ?', [id]);
        await sendNotification(targetUserId, 'drive_share', 'Nova pasta compartilhada', `Uma pasta foi compartilhada com você: ${folder[0]?.name || 'uma pasta'}`, 'diretorio');
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao compartilhar:', error);
        res.status(500).json({ error: 'Erro ao compartilhar pasta' });
    }
});

router.get('/folders/:id/shares', async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    try {
        // Only owner or people with shared access can see shares? 
        // Usually only owner should see who else it's shared with.
        const [owner] = await pool.query('SELECT user_id FROM user_folders WHERE id = ?', [id]);
        if (owner.length === 0) return res.status(404).json({ error: 'Pasta não encontrada' });
        if (owner[0].user_id !== userId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        const [rows] = await pool.query(`
            SELECT s.*, u.name as user_name, u.email as user_email, u.avatar as user_avatar
            FROM folder_shares s JOIN users u ON s.user_id = u.id WHERE s.folder_id = ?
        `, [id]);
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar compartilhamentos:', error);
        res.status(500).json({ error: 'Erro ao buscar compartilhamentos' });
    }
});

router.delete('/folders/:id/shares/:targetUserId', async (req, res) => {
    const { id, targetUserId } = req.params;
    const userId = req.user.id;
    try {
        const [owner] = await pool.query('SELECT user_id FROM user_folders WHERE id = ?', [id]);
        if (owner[0].user_id != userId && targetUserId != userId) return res.status(403).json({ error: 'Não autorizado' });
        await pool.query('DELETE FROM folder_shares WHERE folder_id = ? AND user_id = ?', [id, targetUserId]);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao remover compartilhamento:', error);
        res.status(500).json({ error: 'Erro ao remover compartilhamento' });
    }
});

// Storage
router.get('/storage-stats', async (req, res) => {
    const userId = req.user.id;
    try {
        const [sumRows] = await pool.query('SELECT SUM(file_size) as used FROM user_files WHERE user_id = ? AND is_deleted = 0', [userId]);
        const [userRows] = await pool.query('SELECT storage_quota FROM users WHERE id = ?', [userId]);
        res.json({ used: sumRows[0].used || 0, quota: userRows[0].storage_quota || 1073741824 });
    } catch (error) {
        console.error('Error fetching storage stats:', error);
        res.status(500).json({ error: 'Erro ao buscar estatísticas de armazenamento' });
    }
});

export default router;
