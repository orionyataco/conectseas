import express from 'express';
import pool from '../db.js';
import upload from '../middleware/upload.js';
import authMiddleware from '../middleware/auth.js';
import { processMentions } from '../services/notificationService.js';

const router = express.Router();

// Apply auth middleware to all routes in this file
router.use(authMiddleware);

// Get Posts
router.post('/posts', upload.array('attachments'), async (req, res) => {
    const { userId, content, isUrgent } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO posts (user_id, content, is_urgent) VALUES (?, ?, ?)',
            [userId, content, isUrgent === 'true' || isUrgent === true ? 1 : 0]
        );
        const postId = result.insertId;
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const isImage = file.mimetype.startsWith('image/');
                await pool.query(
                    'INSERT INTO post_attachments (post_id, filename, original_name, file_type, file_size, is_image) VALUES (?, ?, ?, ?, ?, ?)',
                    [postId, file.filename, file.originalname, file.mimetype, file.size, isImage]
                );
            }
        }
        const [author] = await pool.query('SELECT name FROM users WHERE id = ?', [userId]);
        await processMentions(content, userId, author[0]?.name || 'Alguém');
        res.json({ success: true, postId });
    } catch (error) {
        console.error('Erro ao criar post:', error);
        res.status(500).json({ error: 'Erro ao criar post' });
    }
});

router.put('/posts/:id', async (req, res) => {
    const { id } = req.params;
    const { content, userId, userRole } = req.body;
    try {
        const [posts] = await pool.query('SELECT user_id FROM posts WHERE id = ?', [id]);
        if (posts.length === 0) return res.status(404).json({ error: 'Post não encontrado' });
        if (userRole !== 'ADMIN' && posts[0].user_id != userId) return res.status(403).json({ error: 'Não autorizado' });
        await pool.query('UPDATE posts SET content = ? WHERE id = ?', [content, id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao editar post:', error);
        res.status(500).json({ error: 'Erro ao editar post' });
    }
});

router.delete('/posts/:id', async (req, res) => {
    const { id } = req.params;
    const { userId, userRole } = req.query;
    try {
        const [posts] = await pool.query('SELECT user_id FROM posts WHERE id = ?', [id]);
        if (posts.length === 0) return res.status(404).json({ error: 'Post não encontrado' });
        if (userRole !== 'ADMIN' && posts[0].user_id != userId) return res.status(403).json({ error: 'Não autorizado' });
        await pool.query('DELETE FROM posts WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao deletar post:', error);
        res.status(500).json({ error: 'Erro ao deletar post' });
    }
});

// Likes
router.post('/posts/:id/like', async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;
    try {
        const [existing] = await pool.query('SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?', [id, userId]);
        if (existing.length > 0) {
            await pool.query('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?', [id, userId]);
            res.json({ success: true, liked: false });
        } else {
            await pool.query('INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)', [id, userId]);
            res.json({ success: true, liked: true });
        }
    } catch (error) {
        console.error('Erro ao curtir post:', error);
        res.status(500).json({ error: 'Erro ao curtir post' });
    }
});

router.get('/posts/liked/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const [likes] = await pool.query('SELECT post_id FROM post_likes WHERE user_id = ?', [userId]);
        res.json(likes.map(l => l.post_id));
    } catch (error) {
        console.error('Erro ao buscar likes:', error);
        res.status(500).json({ error: 'Erro ao buscar likes' });
    }
});

// Comments
router.get('/posts/:id/comments', async (req, res) => {
    const { id } = req.params;
    try {
        const [comments] = await pool.query(`
            SELECT c.*, u.name as author_name, u.position as author_role, u.avatar as author_avatar
            FROM post_comments c JOIN users u ON c.user_id = u.id WHERE c.post_id = ? ORDER BY c.created_at ASC
        `, [id]);

        const formattedComments = comments.map(c => ({
            ...c,
            created_at: c.created_at ? new Date(c.created_at + ' UTC').toISOString() : new Date().toISOString()
        }));
        res.json(formattedComments);
    } catch (error) {
        console.error('Erro ao buscar comentários:', error);
        res.status(500).json({ error: 'Erro ao buscar comentários' });
    }
});

router.post('/posts/:id/comments', async (req, res) => {
    const { id } = req.params;
    const { userId, content } = req.body;
    try {
        await pool.query('INSERT INTO post_comments (post_id, user_id, content) VALUES (?, ?, ?)', [id, userId, content]);
        const [author] = await pool.query('SELECT name FROM users WHERE id = ?', [userId]);
        await processMentions(content, userId, author[0]?.name || 'Alguém');
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao adicionar comentário:', error);
        res.status(500).json({ error: 'Erro ao adicionar comentário' });
    }
});

router.put('/comments/:id', async (req, res) => {
    const { id } = req.params;
    const { userId, userRole, content } = req.body;
    try {
        const [comments] = await pool.query('SELECT user_id FROM post_comments WHERE id = ?', [id]);
        if (comments.length === 0) return res.status(404).json({ error: 'Comentário não encontrado' });
        if (userRole !== 'ADMIN' && comments[0].user_id != userId) return res.status(403).json({ error: 'Não autorizado' });
        await pool.query('UPDATE post_comments SET content = ? WHERE id = ?', [content, id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao editar comentário:', error);
        res.status(500).json({ error: 'Erro ao editar comentário' });
    }
});

router.delete('/comments/:id', async (req, res) => {
    const { id } = req.params;
    const { userId, userRole } = req.query;
    try {
        const [comments] = await pool.query('SELECT user_id FROM post_comments WHERE id = ?', [id]);
        if (comments.length === 0) return res.status(404).json({ error: 'Comentário não encontrado' });
        if (userRole !== 'ADMIN' && comments[0].user_id != userId) return res.status(403).json({ error: 'Não autorizado' });
        await pool.query('DELETE FROM post_comments WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao deletar comentário:', error);
        res.status(500).json({ error: 'Erro ao deletar comentário' });
    }
});

// Feed
router.get('/feed', async (req, res) => {
    const { userId } = req.query;
    try {
        const [posts] = await pool.query(`
            SELECT p.id, p.user_id, 'post' as type, p.content, p.created_at, u.name as author_name, u.position as author_role, u.avatar as author_avatar, p.is_urgent,
                   (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count,
                   (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) as comment_count
            FROM posts p JOIN users u ON p.user_id = u.id
        `);
        for (let post of posts) {
            const [attachments] = await pool.query('SELECT * FROM post_attachments WHERE post_id = ? ORDER BY id', [post.id]);
            post.attachments = attachments;
        }
        const [events] = await pool.query(`
            SELECT e.id, e.user_id, 'event' as type, e.title as content, e.description, e.event_date, e.event_end_date, e.event_time, e.event_end_time, e.event_type, e.meeting_link, e.created_at, u.name as author_name, u.position as author_role, u.avatar as author_avatar
            FROM calendar_events e JOIN users u ON e.user_id = u.id LEFT JOIN event_shares es ON e.id = es.event_id
            WHERE e.visibility = 'public' OR e.user_id = ? OR es.user_id = ?
        `, [userId, userId]);

        const formattedPosts = posts.map(p => ({
            ...p,
            created_at: p.created_at ? new Date(p.created_at + ' UTC').toISOString() : new Date().toISOString()
        }));
        const formattedEvents = events.map(e => ({
            ...e,
            created_at: e.created_at ? new Date(e.created_at + ' UTC').toISOString() : new Date().toISOString()
        }));

        const feed = [...formattedPosts, ...formattedEvents].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        res.json(feed);
    } catch (error) {
        console.error('Erro ao buscar feed:', error);
        res.status(500).json({ error: 'Erro ao buscar feed' });
    }
});

export default router;
