import pool from '../db.js';
import ogs from 'open-graph-scraper';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getMessengerUsers = async (req, res) => {
    try {
        const userId = req.user.id;
        // Fetch all users except the current one, including unread message count
        const [users] = await pool.query(
            `SELECT u.id, u.name, u.username, u.department, u.position, u.avatar, u.last_seen,
                (SELECT COUNT(*) FROM messenger_messages WHERE sender_id = u.id AND receiver_id = ? AND is_read = 0) as unread_count
             FROM users u
             WHERE u.id != ? 
             ORDER BY u.department ASC, u.name ASC`,
            [userId, userId]
        );

        // Group by department
        const grouped = users.reduce((acc, user) => {
            const dept = user.department || 'Sem Departamento';
            if (!acc[dept]) acc[dept] = [];

            // Determine online status (active in last 5 minutes)
            const isOnline = user.last_seen && (new Date() - new Date(user.last_seen)) < 5 * 60 * 1000;
            acc[dept].push({ ...user, isOnline });
            return acc;
        }, {});

        res.json(grouped);
    } catch (error) {
        console.error('Error fetching messenger users:', error);
        res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
};

export const getMessageHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const { contactId } = req.query;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoIso = thirtyDaysAgo.toISOString();

        const [messages] = await pool.query(
            `SELECT * FROM messenger_messages 
             WHERE ((sender_id = ? AND receiver_id = ?) 
                OR (sender_id = ? AND receiver_id = ?))
               AND is_deleted = 0
               AND created_at >= ?
             ORDER BY created_at ASC`,
            [userId, contactId, contactId, userId, thirtyDaysAgoIso]
        );

        // Mark messages as read
        await pool.query(
            `UPDATE messenger_messages SET is_read = 1 
             WHERE sender_id = ? AND receiver_id = ? AND is_read = 0`,
            [contactId, userId]
        );

        // Format timestamps to ISO with UTC context
        const formattedMessages = messages.map(msg => ({
            ...msg,
            created_at: msg.created_at ? new Date(msg.created_at + ' UTC').toISOString() : new Date().toISOString()
        }));

        res.json(formattedMessages);
    } catch (error) {
        console.error('Error fetching message history:', error);
        res.status(500).json({ error: 'Erro ao buscar histórico de mensagens' });
    }
};

export const getUnreadCount = async (req, res) => {
    try {
        const userId = req.user.id;
        const [rows] = await pool.query(
            'SELECT COUNT(*) as count FROM messenger_messages WHERE receiver_id = ? AND is_read = 0',
            [userId]
        );
        res.json({ count: rows[0].count });
    } catch (error) {
        console.error('Error fetching unread count:', error);
        res.status(500).json({ error: 'Erro ao buscar contagem de mensagens pendentes' });
    }
};

export const getLinkPreview = async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL é obrigatória' });

    try {
        const options = { url, timeout: 5000 };
        const { result, error } = await ogs(options);

        if (error) {
            console.error('Erro ao buscar preview:', result);
            return res.status(400).json({ error: 'Não foi possível buscar a prévia do link' });
        }

        const previewData = {
            title: result.ogTitle || result.twitterTitle || '',
            description: result.ogDescription || result.twitterDescription || '',
            image: result.ogImage?.[0]?.url || result.twitterImage?.[0]?.url || '',
            url: result.ogUrl || url,
            siteName: result.ogSiteName || ''
        };

        res.json(previewData);
    } catch (error) {
        console.error('Erro ao buscar preview (catch):', error);
        res.status(500).json({ error: 'Erro interno ao buscar prévia' });
    }
};

export const uploadMessengerFile = async (req, res) => {
    const userId = req.user.id;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });

    try {
        const fileData = {
            url: `/uploads/${file.filename}`,
            name: file.originalname,
            type: file.mimetype,
            size: file.size
        };
        res.json(fileData);
    } catch (error) {
        console.error('Erro ao processar upload no messenger:', error);
        res.status(500).json({ error: 'Erro ao processar upload' });
    }
};

export const saveMessengerFileToDrive = async (req, res) => {
    const userId = req.user.id;
    const { fileName, fileUrl, fileType, fileSize, folderId } = req.body;

    if (!fileUrl) return res.status(400).json({ error: 'URL do arquivo é obrigatória' });

    try {
        // fileUrl is usually /uploads/filename
        const filename = path.basename(fileUrl);
        const sourcePath = path.join(__dirname, '../uploads', filename);
        const newFilename = `${Date.now()}-${filename}`;
        const destPath = path.join(__dirname, '../uploads', newFilename);
        
        try {
            await fs.copyFile(sourcePath, destPath);
        } catch (cpErr) {
            console.error('Erro ao copiar arquivo:', cpErr);
            throw cpErr;
        }
        
        await pool.query(
            'INSERT INTO user_files (user_id, folder_id, filename, original_name, file_type, file_size, updated_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
            [userId, folderId || null, newFilename, fileName, fileType, fileSize]
        );

        res.json({ success: true, message: 'Arquivo salvo no seu drive com sucesso!' });
    } catch (error) {
        console.error('Erro ao salvar arquivo no drive:', error);
        res.status(500).json({ error: 'Erro ao salvar arquivo no drive' });
    }
};
