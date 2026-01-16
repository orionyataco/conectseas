import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';
import initDB from './init.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3002;

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Initialize DB
initDB();

// Test Connection Route
app.get('/api/test-db', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT 1 + 1 AS solution');
        res.json({ message: 'Conectado ao MySQL com sucesso!', result: rows[0].solution });
    } catch (error) {
        console.error('Erro ao conectar no banco:', error);
        res.status(500).json({ error: 'Erro ao conectar no banco de dados', details: error.message });
    }
});

// Login Route
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const [rows] = await pool.query(
            'SELECT * FROM users WHERE username = ? AND password = ?',
            [username, password]
        );

        if (rows.length > 0) {
            const user = rows[0];
            res.json({
                success: true,
                user: {
                    id: user.id.toString(),
                    name: user.name,
                    email: user.email,
                    role: user.role, // Ensure this matches UserRole enum values roughly
                    department: user.department,
                    position: user.position,
                    avatar: user.avatar,
                    nickname: user.nickname,
                    bio: user.bio,
                    birth_date: user.birth_date,
                    mobile_phone: user.mobile_phone,
                    registration_number: user.registration_number,
                    appointment_date: user.appointment_date
                }
            });
        } else {
            res.status(401).json({ success: false, message: 'Credenciais inválidas' });
        }
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ success: false, message: 'Erro interno no servidor' });
    }
});

// Update User Profile
app.put('/api/users/:id', upload.single('avatar'), async (req, res) => {
    const { id } = req.params;
    const { nickname, bio, birthDate, mobilePhone, registrationNumber, appointmentDate } = req.body;
    let avatarPath = null;

    if (req.file) {
        // Construct public URL for the file
        // user.avatar usually expects a full URL or relative path. 
        // frontend prepends server URL or it expects full http...
        // Let's store relative path for now or construct full if host is known, 
        // but 'uploads/...' is standard. 
        // Our static serve is at /uploads, so path should be http://localhost:PORT/uploads/filename
        // To be safe and simple, let's store the filename or full URL.
        const protocol = req.protocol;
        const host = req.get('host');
        avatarPath = `${protocol}://${host}/uploads/${req.file.filename}`;
    }

    try {
        // Construct update query dynamically
        let query = 'UPDATE users SET ';
        const params = [];
        const updates = [];

        if (nickname !== undefined) { updates.push('nickname = ?'); params.push(nickname); }
        if (bio !== undefined) { updates.push('bio = ?'); params.push(bio); }
        if (birthDate !== undefined) { updates.push('birth_date = ?'); params.push(birthDate); }
        if (mobilePhone !== undefined) { updates.push('mobile_phone = ?'); params.push(mobilePhone); }
        if (registrationNumber !== undefined) { updates.push('registration_number = ?'); params.push(registrationNumber); }
        if (appointmentDate !== undefined) { updates.push('appointment_date = ?'); params.push(appointmentDate); }

        if (avatarPath) {
            updates.push('avatar = ?');
            params.push(avatarPath);
        }

        if (updates.length === 0) {
            return res.json({ success: true, message: 'Nada para atualizar' });
        }

        query += updates.join(', ') + ' WHERE id = ?';
        params.push(id);

        await pool.query(query, params);

        // Return updated user data
        const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
        const user = rows[0];

        res.json({
            success: true,
            user: {
                id: user.id.toString(),
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department,
                position: user.position,
                avatar: user.avatar,
                nickname: user.nickname,
                bio: user.bio,
                birth_date: user.birth_date,
                mobile_phone: user.mobile_phone,
                registration_number: user.registration_number,
                appointment_date: user.appointment_date
            }
        });
    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar perfil' });
    }
});

// Get Active Warning
app.get('/api/warnings', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM warnings WHERE active = TRUE ORDER BY created_at DESC LIMIT 1'
        );
        res.json(rows[0] || null);
    } catch (error) {
        console.error('Erro ao buscar aviso:', error);
        res.status(500).json({ error: 'Erro ao buscar aviso' });
    }
});

// Create Warning
app.post('/api/warnings', async (req, res) => {
    const { title, message, urgency, targetAudience } = req.body;
    try {
        await pool.query('UPDATE warnings SET active = FALSE WHERE active = TRUE');
        const [result] = await pool.query(
            'INSERT INTO warnings (title, message, urgency, target_audience) VALUES (?, ?, ?, ?)',
            [title, message, urgency, targetAudience]
        );
        res.json({ success: true, id: result.insertId });
    } catch (error) {
        console.error('Erro ao criar aviso:', error);
        res.status(500).json({ error: 'Erro ao criar aviso' });
    }
});

app.put('/api/warnings/:id', async (req, res) => {
    const { id } = req.params;
    const { title, message, urgency, targetAudience } = req.body;
    try {
        await pool.query(
            'UPDATE warnings SET title = ?, message = ?, urgency = ?, target_audience = ? WHERE id = ?',
            [title, message, urgency, targetAudience, id]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao editar aviso:', error);
        res.status(500).json({ error: 'Erro ao editar aviso' });
    }
});

app.delete('/api/warnings/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM warnings WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao excluir aviso:', error);
        res.status(500).json({ error: 'Erro ao excluir aviso' });
    }
});


// ============= DASHBOARD WIDGETS API =============

// Get User Note
app.get('/api/notes/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const [rows] = await pool.query('SELECT content FROM user_notes WHERE user_id = ?', [userId]);
        res.json({ content: rows.length > 0 ? rows[0].content : '' });
    } catch (error) {
        console.error('Erro ao buscar nota:', error);
        res.status(500).json({ error: 'Erro ao buscar nota' });
    }
});

// Save User Note
app.post('/api/notes', async (req, res) => {
    const { userId, content } = req.body;
    try {
        const [rows] = await pool.query('SELECT id FROM user_notes WHERE user_id = ?', [userId]);
        if (rows.length > 0) {
            await pool.query('UPDATE user_notes SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', [content, userId]);
        } else {
            await pool.query('INSERT INTO user_notes (user_id, content) VALUES (?, ?)', [userId, content]);
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao salvar nota:', error);
        res.status(500).json({ error: 'Erro ao salvar nota' });
    }
});

// Get User Shortcuts
app.get('/api/shortcuts/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const [rows] = await pool.query('SELECT * FROM user_shortcuts WHERE user_id = ? ORDER BY is_favorite DESC, created_at DESC', [userId]);
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar atalhos:', error);
        res.status(500).json({ error: 'Erro ao buscar atalhos' });
    }
});

// Add Shortcut
app.post('/api/shortcuts', async (req, res) => {
    const { userId, name, description, url, iconName, color } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO user_shortcuts (user_id, name, description, url, icon_name, color) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, name, description, url, iconName, color]
        );
        res.json({ success: true, id: result.insertId });
    } catch (error) {
        console.error('Erro ao criar atalho:', error);
        res.status(500).json({ error: 'Erro ao criar atalho' });
    }
});

// Update Shortcut
app.put('/api/shortcuts/:id', async (req, res) => {
    const { id } = req.params;
    const { userId, name, description, url, iconName, color } = req.body;
    try {
        await pool.query(
            'UPDATE user_shortcuts SET name = ?, description = ?, url = ?, icon_name = ?, color = ? WHERE id = ? AND user_id = ?',
            [name, description, url, iconName, color, id, userId]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao editar atalho:', error);
        res.status(500).json({ error: 'Erro ao editar atalho' });
    }
});

// Delete Shortcut
app.delete('/api/shortcuts/:id', async (req, res) => {
    const { id } = req.params;
    const { userId } = req.query;
    try {
        await pool.query('DELETE FROM user_shortcuts WHERE id = ? AND user_id = ?', [id, userId]);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao excluir atalho:', error);
        res.status(500).json({ error: 'Erro ao excluir atalho' });
    }
});

// Toggle Shortcut Favorite
app.patch('/api/shortcuts/:id/favorite', async (req, res) => {
    const { id } = req.params;
    const { userId, isFavorite } = req.body;
    try {
        await pool.query(
            'UPDATE user_shortcuts SET is_favorite = ? WHERE id = ? AND user_id = ?',
            [isFavorite ? 1 : 0, id, userId]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao favoritar atalho:', error);
        res.status(500).json({ error: 'Erro ao favoritar atalho' });
    }
});

// ============= SYSTEM SHORTCUTS API (SHARED) =============

// Get all system shortcuts
app.get('/api/system-shortcuts', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM system_shortcuts ORDER BY is_favorite DESC, id ASC');
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar atalhos do sistema:', error);
        res.status(500).json({ error: 'Erro ao buscar atalhos do sistema' });
    }
});

// Add System Shortcut
app.post('/api/system-shortcuts', async (req, res) => {
    const { name, description, url, iconName, color, userRole } = req.body;

    // Simple role check
    if (userRole !== 'ADMIN') {
        return res.status(403).json({ error: 'Não autorizado' });
    }

    try {
        const [result] = await pool.query(
            'INSERT INTO system_shortcuts (name, description, url, icon_name, color) VALUES (?, ?, ?, ?, ?)',
            [name, description, url, iconName, color]
        );
        res.json({ success: true, id: result.insertId });
    } catch (error) {
        console.error('Erro ao criar atalho do sistema:', error);
        res.status(500).json({ error: 'Erro ao criar atalho do sistema' });
    }
});

// Update System Shortcut
app.put('/api/system-shortcuts/:id', async (req, res) => {
    const { id } = req.params;
    const { name, description, url, iconName, color, userRole } = req.body;

    if (userRole !== 'ADMIN') {
        return res.status(403).json({ error: 'Não autorizado' });
    }

    try {
        await pool.query(
            'UPDATE system_shortcuts SET name = ?, description = ?, url = ?, icon_name = ?, color = ? WHERE id = ?',
            [name, description, url, iconName, color, id]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao editar atalho do sistema:', error);
        res.status(500).json({ error: 'Erro ao editar atalho do sistema' });
    }
});

// Delete System Shortcut
app.delete('/api/system-shortcuts/:id', async (req, res) => {
    const { id } = req.params;
    const { userRole } = req.query;

    if (userRole !== 'ADMIN') {
        return res.status(403).json({ error: 'Não autorizado' });
    }

    try {
        await pool.query('DELETE FROM system_shortcuts WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao excluir atalho do sistema:', error);
        res.status(500).json({ error: 'Erro ao excluir atalho do sistema' });
    }
});

// Toggle System Shortcut Favorite
app.patch('/api/system-shortcuts/:id/favorite', async (req, res) => {
    const { id } = req.params;
    const { userRole, isFavorite } = req.body;

    if (userRole !== 'ADMIN') {
        return res.status(403).json({ error: 'Não autorizado' });
    }

    try {
        await pool.query(
            'UPDATE system_shortcuts SET is_favorite = ? WHERE id = ?',
            [isFavorite ? 1 : 0, id]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao favoritar atalho do sistema:', error);
        res.status(500).json({ error: 'Erro ao favoritar atalho do sistema' });
    }
});

// ============= TODOS API =============

// Get all todos for a user
app.get('/api/todos/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const [rows] = await pool.query('SELECT * FROM todos WHERE user_id = ? ORDER BY created_at DESC', [userId]);
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar tarefas:', error);
        res.status(500).json({ error: 'Erro ao buscar tarefas' });
    }
});

// Add a todo
app.post('/api/todos', async (req, res) => {
    const { userId, text } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO todos (user_id, text) VALUES (?, ?)',
            [userId, text]
        );
        res.json({ success: true, id: result.insertId });
    } catch (error) {
        console.error('Erro ao criar tarefa:', error);
        res.status(500).json({ error: 'Erro ao criar tarefa' });
    }
});

// Toggle todo completion
app.patch('/api/todos/:id', async (req, res) => {
    const { id } = req.params;
    const { completed } = req.body;
    try {
        await pool.query('UPDATE todos SET completed = ? WHERE id = ?', [completed, id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao atualizar tarefa:', error);
        res.status(500).json({ error: 'Erro ao atualizar tarefa' });
    }
});

// Delete a todo
app.delete('/api/todos/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM todos WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao excluir tarefa:', error);
        res.status(500).json({ error: 'Erro ao excluir tarefa' });
    }
});

// ============= POSTS API =============

// Get all posts with user info, attachments, like/comment counts
app.get('/api/posts', async (req, res) => {
    try {
        const [posts] = await pool.query(`
            SELECT 
                p.*,
                u.name as author_name,
                u.position as author_role,
                u.avatar as author_avatar,
                (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count,
                (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) as comment_count
            FROM posts p
            JOIN users u ON p.user_id = u.id
            ORDER BY p.created_at DESC
        `);

        // Get attachments for each post
        for (let post of posts) {
            const [attachments] = await pool.query(
                'SELECT * FROM post_attachments WHERE post_id = ? ORDER BY id',
                [post.id]
            );
            post.attachments = attachments;
        }

        res.json(posts);
    } catch (error) {
        console.error('Erro ao buscar posts:', error);
        res.status(500).json({ error: 'Erro ao buscar posts' });
    }
});

// Create new post with file uploads  
app.post('/api/posts', upload.array('files', 10), async (req, res) => {
    const { content, isUrgent, userId } = req.body;

    try {
        // Insert post
        const [result] = await pool.query(
            'INSERT INTO posts (user_id, content, is_urgent) VALUES (?, ?, ?)',
            [userId, content, isUrgent === 'true' || isUrgent === true ? 1 : 0]
        );

        const postId = result.insertId;

        // Insert attachments if any
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const isImage = file.mimetype.startsWith('image/');
                await pool.query(
                    'INSERT INTO post_attachments (post_id, filename, original_name, file_type, file_size, is_image) VALUES (?, ?, ?, ?, ?, ?)',
                    [postId, file.filename, file.originalname, file.mimetype, file.size, isImage]
                );
            }
        }

        res.json({ success: true, postId });
    } catch (error) {
        console.error('Erro ao criar post:', error);
        res.status(500).json({ error: 'Erro ao criar post' });
    }
});

// Edit post
app.put('/api/posts/:id', async (req, res) => {
    const { id } = req.params;
    const { content, userId, userRole } = req.body;

    try {
        // Verify ownership or admin privilege
        const [posts] = await pool.query('SELECT user_id FROM posts WHERE id = ?', [id]);
        if (posts.length === 0) {
            return res.status(404).json({ error: 'Post não encontrado' });
        }
        if (userRole !== 'ADMIN' && posts[0].user_id != userId) {
            return res.status(403).json({ error: 'Não autorizado' });
        }

        await pool.query('UPDATE posts SET content = ? WHERE id = ?', [content, id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao editar post:', error);
        res.status(500).json({ error: 'Erro ao editar post' });
    }
});

// Delete post
app.delete('/api/posts/:id', async (req, res) => {
    const { id } = req.params;
    const { userId, userRole } = req.query;

    try {
        // Verify ownership or admin privilege
        const [posts] = await pool.query('SELECT user_id FROM posts WHERE id = ?', [id]);
        if (posts.length === 0) {
            return res.status(404).json({ error: 'Post não encontrado' });
        }
        if (userRole !== 'ADMIN' && posts[0].user_id != userId) {
            return res.status(403).json({ error: 'Não autorizado' });
        }

        await pool.query('DELETE FROM posts WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao deletar post:', error);
        res.status(500).json({ error: 'Erro ao deletar post' });
    }
});

// ============= LIKES API =============

// Toggle like on post
app.post('/api/posts/:id/like', async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;

    try {
        // Check if already liked
        const [existing] = await pool.query(
            'SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?',
            [id, userId]
        );

        if (existing.length > 0) {
            // Unlike
            await pool.query('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?', [id, userId]);
            res.json({ success: true, liked: false });
        } else {
            // Like
            await pool.query('INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)', [id, userId]);
            res.json({ success: true, liked: true });
        }
    } catch (error) {
        console.error('Erro ao curtir post:', error);
        res.status(500).json({ error: 'Erro ao curtir post' });
    }
});

// Get user's liked posts
app.get('/api/posts/liked/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const [likes] = await pool.query(
            'SELECT post_id FROM post_likes WHERE user_id = ?',
            [userId]
        );
        res.json(likes.map(l => l.post_id));
    } catch (error) {
        console.error('Erro ao buscar likes:', error);
        res.status(500).json({ error: 'Erro ao buscar likes' });
    }
});

// ============= COMMENTS API =============

// Get comments for a post
app.get('/api/posts/:id/comments', async (req, res) => {
    const { id } = req.params;

    try {
        const [comments] = await pool.query(`
            SELECT 
                c.*,
                u.name as author_name,
                u.position as author_role,
                u.avatar as author_avatar
            FROM post_comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.post_id = ?
            ORDER BY c.created_at ASC
        `, [id]);

        res.json(comments);
    } catch (error) {
        console.error('Erro ao buscar comentários:', error);
        res.status(500).json({ error: 'Erro ao buscar comentários' });
    }
});

// Add comment
app.post('/api/posts/:id/comments', async (req, res) => {
    const { id } = req.params;
    const { userId, content } = req.body;

    try {
        await pool.query(
            'INSERT INTO post_comments (post_id, user_id, content) VALUES (?, ?, ?)',
            [id, userId, content]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao adicionar comentário:', error);
        res.status(500).json({ error: 'Erro ao adicionar comentário' });
    }
});

// Edit comment
app.put('/api/comments/:id', async (req, res) => {
    const { id } = req.params;
    const { userId, userRole, content } = req.body;

    try {
        // Verify ownership or admin privilege
        const [comments] = await pool.query('SELECT user_id FROM post_comments WHERE id = ?', [id]);
        if (comments.length === 0) {
            return res.status(404).json({ error: 'Comentário não encontrado' });
        }
        if (userRole !== 'ADMIN' && comments[0].user_id != userId) {
            return res.status(403).json({ error: 'Não autorizado' });
        }

        await pool.query('UPDATE post_comments SET content = ? WHERE id = ?', [content, id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao editar comentário:', error);
        res.status(500).json({ error: 'Erro ao editar comentário' });
    }
});

// Delete comment
app.delete('/api/comments/:id', async (req, res) => {
    const { id } = req.params;
    const { userId, userRole } = req.query;

    try {
        // Verify ownership or admin privilege
        const [comments] = await pool.query('SELECT user_id FROM post_comments WHERE id = ?', [id]);
        if (comments.length === 0) {
            return res.status(404).json({ error: 'Comentário não encontrado' });
        }
        if (userRole !== 'ADMIN' && comments[0].user_id != userId) {
            return res.status(403).json({ error: 'Não autorizado' });
        }

        await pool.query('DELETE FROM post_comments WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao deletar comentário:', error);
        res.status(500).json({ error: 'Erro ao deletar comentário' });
    }
});

// ============= CALENDAR EVENTS API =============

// Get all events (filtered by visibility and user permissions)
app.get('/api/events', async (req, res) => {
    const { userId, userRole } = req.query;

    try {
        let query = `
            SELECT 
                e.*,
                u.name as author_name,
                u.position as author_role,
                u.avatar as author_avatar
            FROM calendar_events e
            JOIN users u ON e.user_id = u.id
        `;

        const conditions = [];
        const params = [];

        // If user is not admin, filter visibility
        if (userRole !== 'ADMIN') {
            if (userId) {
                conditions.push('(e.visibility = ? OR e.user_id = ?)');
                params.push('public', userId);
            } else {
                conditions.push('e.visibility = ?');
                params.push('public');
            }
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY e.event_date ASC, e.event_time ASC';

        const [events] = await pool.query(query, params);
        res.json(events);
    } catch (error) {
        console.error('Erro ao buscar eventos:', error);
        res.status(500).json({ error: 'Erro ao buscar eventos' });
    }
});

// Create new event
app.post('/api/events', async (req, res) => {
    const { userId, title, description, eventDate, eventEndDate, eventTime, eventEndTime, visibility, eventType, meetingLink } = req.body;

    try {
        const [result] = await pool.query(
            'INSERT INTO calendar_events (user_id, title, description, event_date, event_end_date, event_time, event_end_time, visibility, event_type, meeting_link) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [userId, title, description || null, eventDate, eventEndDate || null, eventTime || null, eventEndTime || null, visibility || 'public', eventType || 'other', meetingLink || null]
        );

        res.json({ success: true, eventId: result.insertId });
    } catch (error) {
        console.error('Erro ao criar evento:', error);
        res.status(500).json({ error: 'Erro ao criar evento' });
    }
});

// Edit event
app.put('/api/events/:id', async (req, res) => {
    const { id } = req.params;
    const { userId, userRole, title, description, eventDate, eventEndDate, eventTime, eventEndTime, visibility, eventType, meetingLink } = req.body;

    try {
        // Verify ownership or admin
        const [events] = await pool.query('SELECT user_id FROM calendar_events WHERE id = ?', [id]);
        if (events.length === 0) {
            return res.status(404).json({ error: 'Evento não encontrado' });
        }
        if (events[0].user_id != userId && userRole !== 'ADMIN') {
            return res.status(403).json({ error: 'Não autorizado' });
        }

        await pool.query(
            'UPDATE calendar_events SET title = ?, description = ?, event_date = ?, event_end_date = ?, event_time = ?, event_end_time = ?, visibility = ?, event_type = ?, meeting_link = ? WHERE id = ?',
            [title, description || null, eventDate, eventEndDate || null, eventTime || null, eventEndTime || null, visibility, eventType, meetingLink || null, id]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao editar evento:', error);
        res.status(500).json({ error: 'Erro ao editar evento' });
    }
});

// Delete event
app.delete('/api/events/:id', async (req, res) => {
    const { id } = req.params;
    const { userId, userRole } = req.query;

    try {
        // Verify ownership or admin
        const [events] = await pool.query('SELECT user_id FROM calendar_events WHERE id = ?', [id]);
        if (events.length === 0) {
            return res.status(404).json({ error: 'Evento não encontrado' });
        }
        if (events[0].user_id != userId && userRole !== 'ADMIN') {
            return res.status(403).json({ error: 'Não autorizado' });
        }

        await pool.query('DELETE FROM calendar_events WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao deletar evento:', error);
        res.status(500).json({ error: 'Erro ao deletar evento' });
    }
});

// Get unified mural feed (posts + public events)
app.get('/api/mural/feed', async (req, res) => {
    const { userId } = req.query;

    try {
        // Get posts
        const [posts] = await pool.query(`
            SELECT 
                p.id,
                p.user_id,
                'post' as type,
                p.content,
                p.created_at,
                u.name as author_name,
                u.position as author_role,
                u.avatar as author_avatar,
                p.is_urgent,
                (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count,
                (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) as comment_count
            FROM posts p
            JOIN users u ON p.user_id = u.id
        `);

        // Add attachments to posts
        for (let post of posts) {
            const [attachments] = await pool.query(
                'SELECT * FROM post_attachments WHERE post_id = ? ORDER BY id',
                [post.id]
            );
            post.attachments = attachments;
        }

        // Get public events
        const [events] = await pool.query(`
            SELECT 
                e.id,
                e.user_id,
                'event' as type,
                e.title as content,
                e.description,
                e.event_date,
                e.event_end_date,
                e.event_time,
                e.event_end_time,
                e.event_type,
                e.meeting_link,
                e.created_at,
                u.name as author_name,
                u.position as author_role,
                u.avatar as author_avatar
            FROM calendar_events e
            JOIN users u ON e.user_id = u.id
            WHERE e.visibility = 'public'
        `);

        // Combine and sort by created_at
        const feed = [...posts, ...events].sort((a, b) =>
            new Date(b.created_at) - new Date(a.created_at)
        );

        res.json(feed);
    } catch (error) {
        console.error('Erro ao buscar feed:', error);
        res.status(500).json({ error: 'Erro ao buscar feed' });
    }
});

// ============= DRIVE / DIRECTORY API =============

// Get Folders
app.get('/api/drive/folders', async (req, res) => {
    const { userId, parentId } = req.query;

    try {
        let query = 'SELECT * FROM user_folders WHERE user_id = ?';
        const params = [userId];

        if (parentId && parentId !== 'null') {
            query += ' AND parent_id = ?';
            params.push(parentId);
        } else {
            query += ' AND parent_id IS NULL';
        }

        query += ' ORDER BY name ASC';

        const [folders] = await pool.query(query, params);
        res.json(folders);
    } catch (error) {
        console.error('Erro ao buscar pastas:', error);
        res.status(500).json({ error: 'Erro ao buscar pastas' });
    }
});

// Create Folder
app.post('/api/drive/folders', async (req, res) => {
    const { userId, parentId, name } = req.body;

    try {
        await pool.query(
            'INSERT INTO user_folders (user_id, parent_id, name) VALUES (?, ?, ?)',
            [userId, parentId || null, name]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao criar pasta:', error);
        res.status(500).json({ error: 'Erro ao criar pasta' });
    }
});

// Delete Folder (and its content recursively - simplified for now to just folder)
app.delete('/api/drive/folders/:id', async (req, res) => {
    const { id } = req.params;
    const { userId } = req.query;

    try {
        // Verify ownership
        const [folders] = await pool.query('SELECT user_id FROM user_folders WHERE id = ?', [id]);
        if (folders.length === 0) return res.status(404).json({ error: 'Pasta não encontrada' });
        if (folders[0].user_id != userId) return res.status(403).json({ error: 'Não autorizado' });

        // Note: In a real app, we should recursively delete subfolders and files.
        // For simplicity here, CASCADE constraints on DB foreign keys should handle it if set up correctly.
        // We set ON DELETE CASCADE in init.js, so DB handles clean up!

        await pool.query('DELETE FROM user_folders WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao deletar pasta:', error);
        res.status(500).json({ error: 'Erro ao deletar pasta' });
    }
});

// Get Files
app.get('/api/drive/files', async (req, res) => {
    const { userId, folderId } = req.query;

    try {
        let query = 'SELECT * FROM user_files WHERE user_id = ?';
        const params = [userId];

        if (folderId && folderId !== 'null') {
            query += ' AND folder_id = ?';
            params.push(folderId);
        } else {
            query += ' AND folder_id IS NULL';
        }

        query += ' ORDER BY created_at DESC';

        const [files] = await pool.query(query, params);
        res.json(files);
    } catch (error) {
        console.error('Erro ao buscar arquivos:', error);
        res.status(500).json({ error: 'Erro ao buscar arquivos' });
    }
});

// Upload File
app.post('/api/drive/upload', upload.single('file'), async (req, res) => {
    const { userId, folderId } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });

    try {
        await pool.query(
            'INSERT INTO user_files (user_id, folder_id, filename, original_name, file_type, file_size) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, folderId || null, file.filename, file.originalname, file.mimetype, file.size]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao fazer upload:', error);
        res.status(500).json({ error: 'Erro ao fazer upload' });
    }
});

// Delete File
app.delete('/api/drive/files/:id', async (req, res) => {
    const { id } = req.params;
    const { userId } = req.query;

    try {
        // Verify ownership
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

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
