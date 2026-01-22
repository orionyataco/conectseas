import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';
import initDB from './init.js';
import eventRoutes from './routes/events.js';
import aiRoutes from './routes/ai.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import authMiddleware from './middleware/auth.js';
import adminMiddleware from './middleware/admin.js';

dotenv.config();

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

// Routes
app.use('/api/events', eventRoutes);
app.use('/api/ai', aiRoutes);

// Routes with authentication
app.use('/api/users', authMiddleware);
app.use('/api/warnings', authMiddleware);
app.use('/api/notes', authMiddleware);
app.use('/api/shortcuts', authMiddleware);
app.use('/api/system-shortcuts', authMiddleware);
app.use('/api/todos', authMiddleware);
app.use('/api/posts', authMiddleware);
app.use('/api/mural/feed', authMiddleware);
app.use('/api/drive', authMiddleware);

// Admin routes
app.use('/api/admin', [authMiddleware, adminMiddleware]);

// Public Settings Route (No auth needed)
app.get('/api/public/settings/:key', async (req, res) => {
    const { key } = req.params;
    // Only allow specific keys to be public
    const publicKeys = ['login_ui'];
    if (!publicKeys.includes(key)) {
        return res.status(403).json({ error: 'Acesso negado' });
    }

    try {
        const [rows] = await pool.query('SELECT value FROM system_settings WHERE key = ?', [key]);
        if (rows.length === 0) return res.status(404).json({ error: 'Configuração não encontrada' });
        res.json(JSON.parse(rows[0].value));
    } catch (error) {
        console.error(`Erro ao buscar configuração pública ${key}:`, error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

// Initialize DB
initDB();

// Test Connection Route
app.get('/api/test-db', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT 1 + 1 AS solution');
        res.json({ message: 'Conectado ao banco de dados com sucesso!', result: rows[0].solution });
    } catch (error) {
        console.error('Erro ao conectar no banco:', error);
        res.status(500).json({ error: 'Erro ao conectar no banco de dados', details: error.message });
    }
});

// Login Route
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Check LDAP configuration
        const [ldapSettings] = await pool.query('SELECT value FROM system_settings WHERE key = ?', ['ldap_config']);
        const ldapConfig = ldapSettings.length > 0 ? JSON.parse(ldapSettings[0].value) : { enabled: false };

        // Try LDAP authentication if enabled
        if (ldapConfig.enabled) {
            try {
                const { authenticateLDAP } = await import('./ldapAuth.js');
                const ldapResult = await authenticateLDAP(username, password, ldapConfig);

                if (ldapResult.success) {
                    // LDAP authentication successful - create or update local user
                    let [users] = await pool.query('SELECT * FROM users WHERE username = ?', [ldapResult.userInfo.username]);

                    if (users.length === 0) {
                        // Create new user from LDAP
                        const randomPassword = await bcrypt.hash(Math.random().toString(36), 10);
                        await pool.query(
                            'INSERT INTO users (username, name, email, password, role, department, position) VALUES (?, ?, ?, ?, ?, ?, ?)',
                            [ldapResult.userInfo.username, ldapResult.userInfo.name, ldapResult.userInfo.email, randomPassword, 'USER', ldapResult.userInfo.department, ldapResult.userInfo.position]
                        );
                        [users] = await pool.query('SELECT * FROM users WHERE username = ?', [ldapResult.userInfo.username]);
                        console.log(`✓ Created new user from LDAP: ${ldapResult.userInfo.username}`);
                    }

                    const user = users[0];
                    const token = jwt.sign(
                        { id: user.id, username: user.username, role: user.role },
                        process.env.JWT_SECRET || 'secret',
                        { expiresIn: '24h' }
                    );

                    return res.json({
                        success: true,
                        token,
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
                } else {
                    console.log(`LDAP auth failed for ${username}: ${ldapResult.reason}`);
                }
            } catch (ldapError) {
                console.error('LDAP authentication error:', ldapError.message);
            }
        }

        // Fallback to local authentication
        const [rows] = await pool.query(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );

        if (rows.length > 0) {
            const user = rows[0];

            // Verify password
            const isMatch = await bcrypt.compare(password, user.password);

            if (!isMatch) {
                return res.status(401).json({ success: false, message: 'Credenciais inválidas' });
            }

            // Generate JWT
            const token = jwt.sign(
                { id: user.id, username: user.username, role: user.role },
                process.env.JWT_SECRET || 'secret',
                { expiresIn: '24h' }
            );

            res.json({
                success: true,
                token,
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
        } else {
            res.status(401).json({ success: false, message: 'Credenciais inválidas' });
        }
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ success: false, message: 'Erro interno no servidor' });
    }
});

// GET Users (for sharing)
app.get('/api/users', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, name, email, avatar FROM users ORDER BY name ASC');
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        res.status(500).json({ error: 'Erro ao buscar usuários' });
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

// Event routes removed (now in ./routes/events.js)

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

        // Get events (public + shared + own)
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
            LEFT JOIN event_shares es ON e.id = es.event_id
            WHERE e.visibility = 'public' OR e.user_id = ? OR es.user_id = ?
        `, [userId, userId]);

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
        let folders;
        if (parentId && parentId !== 'null') {
            // Verify access to subfolder
            const [access] = await pool.query(`
                SELECT f.*, COALESCE(s.permission, 'OWNER') as permission
                FROM user_folders f
                LEFT JOIN folder_shares s ON f.id = s.folder_id AND s.user_id = ?
            WHERE f.id = ? AND(f.user_id = ? OR s.user_id = ?)
                `, [userId, parentId, userId, userId]);

            if (access.length === 0) {
                return res.status(403).json({ error: 'Acesso negado' });
            }

            const [rows] = await pool.query(
                `SELECT f.*, 'WRITE' as permission 
                 FROM user_folders f 
                 WHERE f.parent_id = ?
            ORDER BY name ASC`,
                [parentId]
            );
            folders = rows;
        } else {
            // Root level: My folders + folders shared with me
            const [rows] = await pool.query(`
                SELECT f.*, 'OWNER' as permission, NULL as share_id
                FROM user_folders f
                WHERE f.user_id = ? AND f.parent_id IS NULL
                UNION ALL
                SELECT f.*, s.permission, s.id as share_id
                FROM user_folders f
                JOIN folder_shares s ON f.id = s.folder_id
                WHERE s.user_id = ?
            ORDER BY name ASC
                `, [userId, userId]);
            folders = rows;
        }

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
        if (parentId) {
            // Verify WRITE permission to parent folder
            const [access] = await pool.query(`
                SELECT f.id 
                FROM user_folders f
                LEFT JOIN folder_shares s ON f.id = s.folder_id AND s.user_id = ?
            WHERE f.id = ? AND(f.user_id = ? OR s.permission = 'WRITE')
                `, [userId, parentId, userId]);

            if (access.length === 0) {
                return res.status(403).json({ error: 'Acesso negado para criação de pastas' });
            }
        }

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
        if (folderId && folderId !== 'null') {
            // Verify access to folder
            const [access] = await pool.query(`
                SELECT f.id 
                FROM user_folders f
                LEFT JOIN folder_shares s ON f.id = s.folder_id AND s.user_id = ?
            WHERE f.id = ? AND(f.user_id = ? OR s.user_id = ?)
                `, [userId, folderId, userId, userId]);

            if (access.length === 0) {
                return res.status(403).json({ error: 'Acesso negado' });
            }

            const [files] = await pool.query(
                'SELECT * FROM user_files WHERE folder_id = ? ORDER BY created_at DESC',
                [folderId]
            );
            res.json(files);
        } else {
            // Root level files (only owner's files)
            const [files] = await pool.query(
                'SELECT * FROM user_files WHERE user_id = ? AND folder_id IS NULL ORDER BY created_at DESC',
                [userId]
            );
            res.json(files);
        }
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
        if (folderId && folderId !== 'null') {
            // Verify WRITE permission
            const [access] = await pool.query(`
                SELECT f.id 
                FROM user_folders f
                LEFT JOIN folder_shares s ON f.id = s.folder_id AND s.user_id = ?
            WHERE f.id = ? AND(f.user_id = ? OR s.permission = 'WRITE')
                `, [userId, folderId, userId]);

            if (access.length === 0) {
                return res.status(403).json({ error: 'Acesso negado para upload' });
            }
        }

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

// SHARING ENDPOINTS
app.post('/api/drive/folders/:id/share', async (req, res) => {
    const { id } = req.params;
    const { userId, targetUserId, permission } = req.body;

    try {
        // Verify ownership
        const [owner] = await pool.query('SELECT user_id FROM user_folders WHERE id = ?', [id]);
        if (owner.length === 0) return res.status(404).json({ error: 'Pasta não encontrada' });
        if (owner[0].user_id != userId) return res.status(403).json({ error: 'Apenas o dono pode compartilhar' });

        await pool.query(
            'INSERT INTO folder_shares (folder_id, user_id, permission) VALUES (?, ?, ?) ON CONFLICT(folder_id, user_id) DO UPDATE SET permission = EXCLUDED.permission',
            [id, targetUserId, permission]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao compartilhar:', error);
        res.status(500).json({ error: 'Erro ao compartilhar pasta' });
    }
});

app.get('/api/drive/folders/:id/shares', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query(`
            SELECT s.*, u.name as user_name, u.email as user_email, u.avatar as user_avatar
            FROM folder_shares s
            JOIN users u ON s.user_id = u.id
            WHERE s.folder_id = ?
            `, [id]);
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar compartilhamentos:', error);
        res.status(500).json({ error: 'Erro ao buscar compartilhamentos' });
    }
});

app.delete('/api/drive/folders/:id/shares/:targetUserId', async (req, res) => {
    const { id, targetUserId } = req.params;
    const { userId } = req.query;

    try {
        // Verify ownership or self-unshare
        const [owner] = await pool.query('SELECT user_id FROM user_folders WHERE id = ?', [id]);
        if (owner[0].user_id != userId && targetUserId != userId) {
            return res.status(403).json({ error: 'Não autorizado' });
        }

        await pool.query('DELETE FROM folder_shares WHERE folder_id = ? AND user_id = ?', [id, targetUserId]);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao remover compartilhamento:', error);
        res.status(500).json({ error: 'Erro ao remover compartilhamento' });
    }
});

// ============= ADMIN API =============
// Note: These routes are prefixed with /api/admin by the middleware on line 60

// Get System Settings
app.get('/api/admin/settings', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM system_settings');
        const settings = {};
        rows.forEach(row => {
            settings[row.key] = JSON.parse(row.value);
        });
        res.json(settings);
    } catch (error) {
        console.error('Erro ao buscar configurações:', error);
        res.status(500).json({ error: 'Erro ao buscar configurações' });
    }
});

// Update System Setting
app.put('/api/admin/settings/:key', async (req, res) => {
    const { key } = req.params;
    const { value } = req.body;
    try {
        await pool.query(
            'INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP',
            [key, JSON.stringify(value)]
        );
        res.json({ success: true });
    } catch (error) {
        console.error(`Erro ao atualizar configuração ${key}:`, error);
        res.status(500).json({ error: `Erro ao atualizar configuração ${key}` });
    }
});

// Upload Setting Image (e.g. login background)
app.post('/api/admin/settings/upload/:key', upload.single('file'), async (req, res) => {
    const { key } = req.params;
    const { field } = req.body; // Sub-field within the setting JSON

    if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    try {
        const protocol = req.protocol;
        const host = req.get('host');
        const filePath = `${protocol}://${host}/uploads/${req.file.filename}`;

        // Get current setting
        const [rows] = await pool.query('SELECT value FROM system_settings WHERE key = ?', [key]);
        if (rows.length === 0) return res.status(404).json({ error: 'Configuração não encontrada' });

        const settingValue = JSON.parse(rows[0].value);
        settingValue[field] = filePath;

        // Update with new file path
        await pool.query(
            'UPDATE system_settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?',
            [JSON.stringify(settingValue), key]
        );

        res.json({ success: true, url: filePath });
    } catch (error) {
        console.error(`Erro ao fazer upload para configuração ${key}:`, error);
        res.status(500).json({ error: 'Erro ao salvar arquivo' });
    }
});

// Admin Dashboard stats
app.get('/api/admin/stats', async (req, res) => {
    try {
        const [userCount] = await pool.query('SELECT COUNT(*) as total FROM users');
        const [adminCount] = await pool.query('SELECT COUNT(*) as total FROM users WHERE role = "ADMIN"');
        const [postCount] = await pool.query('SELECT COUNT(*) as total FROM posts');
        const [fileCount] = await pool.query('SELECT COUNT(*) as total FROM user_files');

        res.json({
            users: userCount[0].total,
            activeUsers: userCount[0].total - adminCount[0].total, // Non-admins
            posts: postCount[0].total,
            files: fileCount[0].total
        });
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
});

// Update User Role (Admin only)
app.put('/api/admin/users/:id/role', async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;

    if (!['USER', 'ADMIN'].includes(role)) {
        return res.status(400).json({ error: 'Role inválida' });
    }

    try {
        await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, id]);
        res.json({ success: true });
    } catch (error) {
        console.error(`Erro ao atualizar role do usuário ${id}:`, error);
        res.status(500).json({ error: 'Erro ao atualizar permissão' });
    }
});

// Manage Users (Admin only)
app.get('/api/admin/users', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, username, name, email, role, department, position, avatar FROM users ORDER BY name ASC');
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar usuários (admin):', error);
        res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
});


// Test LDAP Connection (Admin only)
app.post('/api/admin/ldap/test', async (req, res) => {
    try {
        const [ldapSettings] = await pool.query('SELECT value FROM system_settings WHERE key = ?', ['ldap_config']);
        const ldapConfig = ldapSettings.length > 0 ? JSON.parse(ldapSettings[0].value) : { enabled: false };

        const { testLDAPConnection } = await import('./ldapTest.js');
        const result = await testLDAPConnection(ldapConfig);

        res.json(result);
    } catch (error) {
        console.error('Erro ao testar LDAP:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao testar conexão LDAP',
            details: error.message
        });
    }
});


app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
