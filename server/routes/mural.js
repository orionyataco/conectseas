import express from 'express';
import pool from '../db.js';
import upload from '../middleware/upload.js';
import authMiddleware from '../middleware/auth.js';
import { processMentions } from '../services/notificationService.js';
import { deleteMultipleFilesFromDisk } from '../services/fileService.js';

const router = express.Router();

// Apply auth middleware to all routes in this file
router.use(authMiddleware);

// Get Posts
router.post('/posts', upload.array('attachments'), async (req, res) => {
    // userId sempre do token JWT — nunca de req.body
    const userId = req.user.id;
    const { content, isUrgent } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO posts (user_id, content, is_urgent) VALUES (?, ?, ?)',
            [userId, content, isUrgent === 'true' || isUrgent === true ? 1 : 0]
        );
        const postId = result.insertId;
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const isImage = file.mimetype.startsWith('image/') ? 1 : 0;
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
    // userId e userRole sempre do token JWT — nunca de req.body
    const requesterId = req.user.id;
    const requesterRole = req.user.role;
    const { content } = req.body;
    try {
        const [posts] = await pool.query('SELECT user_id FROM posts WHERE id = ?', [id]);
        if (posts.length === 0) return res.status(404).json({ error: 'Post não encontrado' });
        if (requesterRole !== 'ADMIN' && posts[0].user_id !== requesterId) {
            return res.status(403).json({ error: 'Não autorizado' });
        }
        await pool.query('UPDATE posts SET content = ? WHERE id = ?', [content, id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao editar post:', error);
        res.status(500).json({ error: 'Erro ao editar post' });
    }
});

router.delete('/posts/:id', async (req, res) => {
    const { id } = req.params;
    // userId e userRole sempre do token JWT — nunca de req.query
    const requesterId = req.user.id;
    const requesterRole = req.user.role;
    try {
        const [posts] = await pool.query('SELECT user_id FROM posts WHERE id = ?', [id]);
        if (posts.length === 0) return res.status(404).json({ error: 'Post não encontrado' });
        if (requesterRole !== 'ADMIN' && posts[0].user_id !== requesterId) {
            return res.status(403).json({ error: 'Não autorizado' });
        }

        // Deletar arquivos físicos dos anexos vinculados a este post
        const [attachments] = await pool.query('SELECT filename FROM post_attachments WHERE post_id = ?', [id]);
        if (attachments && attachments.length > 0) {
            await deleteMultipleFilesFromDisk(attachments.map(a => a.filename));
        }

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
    // userId sempre do token JWT
    const userId = req.user.id;
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

router.get('/posts/liked', async (req, res) => {
    // userId sempre do token JWT
    const userId = req.user.id;
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
            created_at: c.created_at ? new Date(c.created_at).toISOString() : new Date().toISOString()
        }));
        res.json(formattedComments);
    } catch (error) {
        console.error('Erro ao buscar comentários:', error);
        res.status(500).json({ error: 'Erro ao buscar comentários' });
    }
});

router.post('/posts/:id/comments', async (req, res) => {
    const { id } = req.params;
    // userId sempre do token JWT — nunca de req.body
    const userId = req.user.id;
    const { content } = req.body;
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
    // userId e userRole sempre do token JWT — nunca de req.body
    const requesterId = req.user.id;
    const requesterRole = req.user.role;
    const { content } = req.body;
    try {
        const [comments] = await pool.query('SELECT user_id FROM post_comments WHERE id = ?', [id]);
        if (comments.length === 0) return res.status(404).json({ error: 'Comentário não encontrado' });
        if (requesterRole !== 'ADMIN' && comments[0].user_id !== requesterId) {
            return res.status(403).json({ error: 'Não autorizado' });
        }
        await pool.query('UPDATE post_comments SET content = ? WHERE id = ?', [content, id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao editar comentário:', error);
        res.status(500).json({ error: 'Erro ao editar comentário' });
    }
});

router.delete('/comments/:id', async (req, res) => {
    const { id } = req.params;
    // userId e userRole sempre do token JWT — nunca de req.query
    const requesterId = req.user.id;
    const requesterRole = req.user.role;
    try {
        const [comments] = await pool.query('SELECT user_id FROM post_comments WHERE id = ?', [id]);
        if (comments.length === 0) return res.status(404).json({ error: 'Comentário não encontrado' });
        if (requesterRole !== 'ADMIN' && comments[0].user_id !== requesterId) {
            return res.status(403).json({ error: 'Não autorizado' });
        }
        await pool.query('DELETE FROM post_comments WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao deletar comentário:', error);
        res.status(500).json({ error: 'Erro ao deletar comentário' });
    }
});

// Feed
router.get('/feed', async (req, res) => {
    // userId sempre do token JWT — nunca de req.query
    const userId = req.user.id;
    try {
        const [posts] = await pool.query(`
            SELECT p.id, p.user_id, 'post' as type, p.content, p.created_at, u.name as author_name, u.position as author_role, u.avatar as author_avatar, p.is_urgent,
                   COUNT(DISTINCT pl.id) as like_count,
                   COUNT(DISTINCT pc.id) as comment_count
            FROM posts p 
            JOIN users u ON p.user_id = u.id
            LEFT JOIN post_likes pl ON p.id = pl.post_id
            LEFT JOIN post_comments pc ON p.id = pc.post_id
            GROUP BY p.id, p.user_id, p.content, p.created_at, u.name, u.position, u.avatar, p.is_urgent
        `);

        if (posts.length > 0) {
            const postIds = posts.map(p => p.id);
            // Fetch all attachments for these posts in one query
            const [allAttachments] = await pool.query('SELECT * FROM post_attachments WHERE post_id IN (?) ORDER BY id', [postIds]);
            
            // Group attachments by post_id in memory
            const attachmentsByPost = allAttachments.reduce((acc, attachment) => {
                if (!acc[attachment.post_id]) {
                    acc[attachment.post_id] = [];
                }
                acc[attachment.post_id].push(attachment);
                return acc;
            }, {});

            for (let post of posts) {
                post.attachments = attachmentsByPost[post.id] || [];
            }
        }
        const [events] = await pool.query(`
            SELECT DISTINCT e.id, e.user_id, 'event' as type, e.title as content, e.description, e.event_date, e.event_end_date, e.event_time, e.event_end_time, e.event_type, e.meeting_link, e.created_at, u.name as author_name, u.position as author_role, u.avatar as author_avatar
            FROM calendar_events e JOIN users u ON e.user_id = u.id LEFT JOIN event_shares es ON e.id = es.event_id
            WHERE e.visibility = 'public' OR e.user_id = ? OR es.user_id = ?
        `, [userId, userId]);

        const formattedPosts = posts.map(p => ({
            ...p,
            created_at: p.created_at ? new Date(p.created_at).toISOString() : new Date().toISOString()
        }));
        const formattedEvents = events.map(e => ({
            ...e,
            created_at: e.created_at ? new Date(e.created_at).toISOString() : new Date().toISOString()
        }));

        const feed = [...formattedPosts, ...formattedEvents].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        res.json(feed);
    } catch (error) {
        console.error('Erro ao buscar feed:', error);
        res.status(500).json({ error: 'Erro ao buscar feed' });
    }
});

// Link Preview — custom lightweight OG parser (Node 18 compatible)
router.get('/link-preview', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL é obrigatória' });

    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6000);

        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
                'Accept': 'text/html'
            },
            redirect: 'follow'
        });
        clearTimeout(timer);

        if (!response.ok) return res.status(422).json({ error: 'Não foi possível acessar o link' });

        const html = await response.text();

        // Helper to extract meta tag content
        const getMeta = (property) => {
            const match = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*?)["']`, 'i'))
                || html.match(new RegExp(`<meta[^>]+content=["']([^"']*?)["'][^>]+(?:property|name)=["']${property}["']`, 'i'));
            return match ? match[1].trim() : null;
        };

        const title = getMeta('og:title') || getMeta('twitter:title')
            || (html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim()) || null;
        const description = getMeta('og:description') || getMeta('twitter:description')
            || getMeta('description') || null;
        const image = getMeta('og:image') || getMeta('twitter:image') || null;
        const siteName = getMeta('og:site_name') || null;

        // Resolve relative image URL
        let resolvedImage = image;
        if (image && !image.startsWith('http')) {
            try {
                resolvedImage = new URL(image, url).href;
            } catch {
                resolvedImage = null;
            }
        }

        res.json({ title, description, image: resolvedImage, siteName, url });
    } catch (err) {
        if (err.name === 'AbortError') {
            return res.status(504).json({ error: 'Tempo limite excedido ao acessar o link' });
        }
        console.error('Erro ao buscar link preview:', err);
        res.status(500).json({ error: 'Erro ao buscar prévia do link' });
    }
});

export default router;
