import pool from '../db.js';

export const sendNotification = async (userId, type, title, message, link) => {
    try {
        await pool.query(
            'INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)',
            [userId, type, title, message, link || null]
        );
    } catch (error) {
        console.error('Error sending notification:', error);
    }
};

export const processMentions = async (content, senderId, senderName) => {
    const mentionRegex = /@(\w+)/g;
    const matches = [...content.matchAll(mentionRegex)];
    if (matches.length > 0) {
        const usernames = [...new Set(matches.map(m => m[1]))];
        for (const username of usernames) {
            // Search by name since users are mentioned by their first name
            const [users] = await pool.query('SELECT id FROM users WHERE LOWER(name) LIKE ?', [`%${username.toLowerCase()}%`]);
            if (users.length > 0 && users[0].id !== parseInt(senderId)) {
                await sendNotification(
                    users[0].id,
                    'mural_mention',
                    'Você foi mencionado',
                    `${senderName} mencionou você no Mural`,
                    'mural'
                );
            }
        }
    }
};
