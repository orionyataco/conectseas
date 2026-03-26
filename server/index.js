import './polyfills.js';
import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { initSocket } from './socket.js';

// DB and Initialization
import pool from './db.js';
import initDB from './init.js';

// Route Modules
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import adminRoutes from './routes/admin.js';
import driveRoutes from './routes/drive.js';
import muralRoutes from './routes/mural.js';
import dashboardRoutes from './routes/dashboard.js';
import projectRoutes from './routes/projects.js';
import eventRoutes from './routes/events.js';
import aiRoutes from './routes/ai.js';
import holidayRoutes from './routes/holidays.js';
import searchRoutes from './routes/search.js';
import tecticRoutes from './routes/tectic.js';
import messengerRoutes from './routes/messenger.js';

// Middleware
import authMiddleware from './middleware/auth.js';
import adminMiddleware from './middleware/admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = initSocket(server);
const PORT = process.env.PORT || 3002;

// Basic Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            "default-src": ["'self'"],
            "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
            "img-src": ["'self'", "data:", "blob:", "https://cdn.jsdelivr.net", "https://ui-avatars.com", "https://images.unsplash.com"],
            "connect-src": ["'self'", "ws:", "wss:"],
            "media-src": ["'self'", "blob:"],
            "upgrade-insecure-requests": null,
        },
    },
    crossOriginOpenerPolicy: false,
    originAgentCluster: false,
}));
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '../dist')));

// --- API Routes ---

// Public Routes
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, message: 'Muitas tentativas de login por este IP, tente novamente após 15 minutos' }
});
app.use('/api/login', loginLimiter);
app.use('/api', authRoutes); // /api/login

// Public Settings Route
app.get('/api/public/settings/:key', async (req, res) => {
    const { key } = req.params;
    const publicKeys = ['login_ui', 'theme_config', 'visual_identity'];
    if (!publicKeys.includes(key)) return res.status(403).json({ error: 'Acesso negado' });
    try {
        const [rows] = await pool.query('SELECT value FROM system_settings WHERE key = ?', [key]);
        if (rows.length === 0) return res.status(404).json({ error: 'Configuração não encontrada' });
        res.json(JSON.parse(rows[0].value));
    } catch (error) {
        console.error(`Erro ao buscar configuração pública ${key}:`, error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

// Authenticated Routes
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/drive', driveRoutes);
app.use('/api/mural', muralRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/tectic', tecticRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/messenger', messengerRoutes);

// Custom routes that were scattered in index.js and didn't fit perfectly in the new modules
// or were forgotten in the initial modularization plan.

// Notifications
app.get('/api/notifications', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    try {
        const [rows] = await pool.query('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50', [userId]);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Erro ao buscar notificações' });
    }
});

app.put('/api/notifications/:id/read', authMiddleware, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    try {
        await pool.query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [id, userId]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Erro ao ler notificação' });
    }
});

app.put('/api/notifications/read-all', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    try {
        await pool.query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ error: 'Erro ao ler notificações' });
    }
});

// Sidebar Items (Common)
app.get('/api/sidebar-items', authMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM sidebar_items ORDER BY order_index ASC');
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar itens da sidebar:', error);
        res.status(500).json({ error: 'Erro ao buscar itens da sidebar' });
    }
});

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

// Initialize DB
initDB();

// Basic Error Handler
app.use((err, req, res, next) => {
    console.error('SERVER ERROR:', err);
    const isProduction = process.env.NODE_ENV === 'production';
    res.status(500).json({
        error: 'Erro interno do servidor',
        details: isProduction ? 'Ocorreu um erro inesperado. Entre em contato com o suporte.' : err.message
    });
});

// Catch-all handler
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

server.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
