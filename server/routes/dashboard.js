import express from 'express';
import pool from '../db.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Apply auth middleware to all routes in this file
router.use(authMiddleware);

// Warnings
router.get('/warnings', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM warnings WHERE active = 1 ORDER BY created_at DESC');
        res.json(rows[0] || null);
    } catch (error) {
        console.error('Erro ao buscar avisos:', error);
        res.status(500).json({ error: 'Erro ao buscar avisos', details: error.message });
    }
});

router.post('/warnings', async (req, res) => {
    const { title, message, urgency, targetAudience } = req.body;
    try {
        await pool.query('INSERT INTO warnings (title, message, urgency, target_audience) VALUES (?, ?, ?, ?)', [title, message, urgency || 'low', targetAudience || 'all']);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao criar aviso:', error);
        res.status(500).json({ error: 'Erro ao criar aviso' });
    }
});

router.put('/warnings/:id', async (req, res) => {
    const { id } = req.params;
    const { title, message, urgency, targetAudience } = req.body;
    try {
        await pool.query('UPDATE warnings SET title = ?, message = ?, urgency = ?, target_audience = ? WHERE id = ?', [title, message, urgency, targetAudience, id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao atualizar aviso:', error);
        res.status(500).json({ error: 'Erro ao atualizar aviso' });
    }
});

router.delete('/warnings/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM warnings WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao deletar aviso:', error);
        res.status(500).json({ error: 'Erro ao deletar aviso' });
    }
});

// Notes — restrito ao próprio usuário autenticado
router.get('/notes', async (req, res) => {
    const userId = req.user.id;
    try {
        const [rows] = await pool.query('SELECT content FROM user_notes WHERE user_id = ?', [userId]);
        res.json({ content: rows[0]?.content || '' });
    } catch (error) {
        console.error('Erro ao buscar nota:', error);
        res.status(500).json({ error: 'Erro ao buscar nota' });
    }
});

router.post('/notes', async (req, res) => {
    // userId sempre do token JWT — nunca de req.body
    const userId = req.user.id;
    const { content } = req.body;
    try {
        await pool.query('INSERT INTO user_notes (user_id, content) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET content = EXCLUDED.content, updated_at = CURRENT_TIMESTAMP', [userId, content]);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao salvar nota:', error);
        res.status(500).json({ error: 'Erro ao salvar nota' });
    }
});

// Shortcuts — restrito ao próprio usuário autenticado
router.get('/shortcuts', async (req, res) => {
    const userId = req.user.id;
    try {
        const [rows] = await pool.query('SELECT *, name as label, icon_name as icon FROM user_shortcuts WHERE user_id = ? ORDER BY is_favorite DESC, name ASC', [userId]);
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar atalhos:', error);
        res.status(500).json({ error: 'Erro ao buscar atalhos' });
    }
});

router.post('/shortcuts', async (req, res) => {
    // userId sempre do token JWT
    const userId = req.user.id;
    const { name, url, iconName, color, description } = req.body;
    try {
        await pool.query('INSERT INTO user_shortcuts (user_id, name, url, icon_name, color, description) VALUES (?, ?, ?, ?, ?, ?)', [userId, name, url, iconName, color, description || '']);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao criar atalho:', error);
        res.status(500).json({ error: 'Erro ao criar atalho' });
    }
});

router.put('/shortcuts/:id', async (req, res) => {
    const { id } = req.params;
    const requesterId = req.user.id;
    const { name, url, iconName, color, description } = req.body;
    try {
        // Ownership check: garante que o atalho pertence ao usuário autenticado
        const [rows] = await pool.query('SELECT user_id FROM user_shortcuts WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Atalho não encontrado' });
        if (rows[0].user_id !== requesterId) return res.status(403).json({ error: 'Não autorizado' });
        await pool.query('UPDATE user_shortcuts SET name = ?, url = ?, icon_name = ?, color = ?, description = ? WHERE id = ?', [name, url, iconName, color, description, id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao atualizar atalho:', error);
        res.status(500).json({ error: 'Erro ao atualizar atalho' });
    }
});

router.delete('/shortcuts/:id', async (req, res) => {
    const { id } = req.params;
    const requesterId = req.user.id;
    try {
        // Ownership check
        const [rows] = await pool.query('SELECT user_id FROM user_shortcuts WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Atalho não encontrado' });
        if (rows[0].user_id !== requesterId) return res.status(403).json({ error: 'Não autorizado' });
        await pool.query('DELETE FROM user_shortcuts WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao deletar atalho:', error);
        res.status(500).json({ error: 'Erro ao deletar atalho' });
    }
});

router.patch('/shortcuts/:id/favorite', async (req, res) => {
    const { id } = req.params;
    const requesterId = req.user.id;
    const { isFavorite } = req.body;
    try {
        // Ownership check
        const [rows] = await pool.query('SELECT user_id FROM user_shortcuts WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Atalho não encontrado' });
        if (rows[0].user_id !== requesterId) return res.status(403).json({ error: 'Não autorizado' });
        await pool.query('UPDATE user_shortcuts SET is_favorite = ? WHERE id = ?', [isFavorite ? 1 : 0, id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao favoritar atalho:', error);
        res.status(500).json({ error: 'Erro ao favoritar atalho' });
    }
});

// System Shortcuts — leitura liberada, escrita requer verificação (mantida como estava, gerenciada por admin)
router.get('/system-shortcuts', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT *, name as label, icon_name as icon FROM system_shortcuts ORDER BY is_favorite DESC, name ASC');
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar atalhos do sistema:', error);
        res.status(500).json({ error: 'Erro ao buscar atalhos do sistema' });
    }
});

router.post('/system-shortcuts', async (req, res) => {
    const { name, url, iconName, color, description } = req.body;
    try {
        await pool.query('INSERT INTO system_shortcuts (name, url, icon_name, color, description) VALUES (?, ?, ?, ?, ?)', [name, url, iconName, color, description || '']);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao criar atalho do sistema:', error);
        res.status(500).json({ error: 'Erro ao criar atalho do sistema' });
    }
});

router.put('/system-shortcuts/:id', async (req, res) => {
    const { id } = req.params;
    const { name, url, iconName, color, description } = req.body;
    try {
        await pool.query('UPDATE system_shortcuts SET name = ?, url = ?, icon_name = ?, color = ?, description = ? WHERE id = ?', [name, url, iconName, color, description, id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao atualizar atalho do sistema:', error);
        res.status(500).json({ error: 'Erro ao atualizar atalho do sistema' });
    }
});

router.delete('/system-shortcuts/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM system_shortcuts WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao deletar atalho do sistema:', error);
        res.status(500).json({ error: 'Erro ao deletar atalho do sistema' });
    }
});

router.patch('/system-shortcuts/:id/favorite', async (req, res) => {
    const { id } = req.params;
    const { isFavorite } = req.body;
    try {
        await pool.query('UPDATE system_shortcuts SET is_favorite = ? WHERE id = ?', [isFavorite ? 1 : 0, id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao favoritar atalho do sistema:', error);
        res.status(500).json({ error: 'Erro ao favoritar atalho do sistema' });
    }
});

// Todos — restrito ao próprio usuário autenticado
router.get('/todos', async (req, res) => {
    const userId = req.user.id;
    try {
        const [rows] = await pool.query('SELECT id, user_id, text, completed, created_at FROM todos WHERE user_id = ? ORDER BY completed ASC, created_at DESC', [userId]);
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar todos:', error);
        res.status(500).json({ error: 'Erro ao buscar todos' });
    }
});

router.post('/todos', async (req, res) => {
    // userId sempre do token JWT — nunca de req.body
    const userId = req.user.id;
    const { title } = req.body;
    try {
        const [result] = await pool.query('INSERT INTO todos (user_id, text) VALUES (?, ?)', [userId, title]);
        res.json({ success: true, id: result.insertId });
    } catch (error) {
        console.error('Erro ao criar todo:', error);
        res.status(500).json({ error: 'Erro ao criar todo' });
    }
});

router.patch('/todos/:id', async (req, res) => {
    const { id } = req.params;
    const requesterId = req.user.id;
    const { completed } = req.body;
    try {
        // Ownership check: garante que o todo pertence ao usuário autenticado
        const [rows] = await pool.query('SELECT user_id FROM todos WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Todo não encontrado' });
        if (rows[0].user_id !== requesterId) return res.status(403).json({ error: 'Não autorizado' });
        await pool.query('UPDATE todos SET completed = ? WHERE id = ?', [completed ? 1 : 0, id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao atualizar todo:', error);
        res.status(500).json({ error: 'Erro ao atualizar todo' });
    }
});

router.delete('/todos/:id', async (req, res) => {
    const { id } = req.params;
    const requesterId = req.user.id;
    try {
        // Ownership check
        const [rows] = await pool.query('SELECT user_id FROM todos WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Todo não encontrado' });
        if (rows[0].user_id !== requesterId) return res.status(403).json({ error: 'Não autorizado' });
        await pool.query('DELETE FROM todos WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao deletar todo:', error);
        res.status(500).json({ error: 'Erro ao deletar todo' });
    }
});

export default router;
