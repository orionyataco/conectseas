import pool from '../db.js';

export const getMessengerUsers = async (req, res) => {
    try {
        const { userId } = req.query;
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
        const { userId, contactId } = req.query;
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
        const { userId } = req.query;
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
