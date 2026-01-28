import pool from '../db.js';

export const globalSearch = async (req, res) => {
    const { q, userId, userRole } = req.query;

    if (!q || q.length < 2) {
        return res.json({ users: [], events: [], documents: [] });
    }

    const searchQuery = `%${q}%`;

    try {
        // 1. Search Users
        const [users] = await pool.query(
            `SELECT id, name, department, position, avatar, 'user' as type 
             FROM users 
             WHERE name LIKE ? OR department LIKE ? OR position LIKE ? 
             LIMIT 10`,
            [searchQuery, searchQuery, searchQuery]
        );

        // 2. Search Events
        let eventsQuery = `
            SELECT DISTINCT e.id, e.title as name, e.event_date as date, 'event' as type 
            FROM calendar_events e
            LEFT JOIN event_shares es ON e.id = es.event_id
            WHERE (e.title LIKE ? OR e.description LIKE ?)
        `;
        const eventsParams = [searchQuery, searchQuery];

        if (userRole !== 'ADMIN') {
            eventsQuery += ` AND (e.visibility = 'public' OR e.user_id = ? OR es.user_id = ?)`;
            eventsParams.push(userId, userId);
        }
        eventsQuery += ` LIMIT 10`;
        const [events] = await pool.query(eventsQuery, eventsParams);

        // 3. Search Documents (Files and Folders)
        const [folders] = await pool.query(
            `SELECT f.id, f.name, 'folder' as type, f.user_id
             FROM user_folders f
             LEFT JOIN folder_shares fs ON f.id = fs.folder_id
             WHERE f.name LIKE ? AND f.is_deleted = 0 AND (f.user_id = ? OR fs.user_id = ? OR ? = 'ADMIN')
             LIMIT 5`,
            [searchQuery, userId, userId, userRole]
        );

        const [files] = await pool.query(
            `SELECT fi.id, fi.original_name as name, 'file' as type, fi.user_id, fi.folder_id
             FROM user_files fi
             JOIN user_folders fo ON fi.folder_id = fo.id
             LEFT JOIN folder_shares fs ON fo.id = fs.folder_id
             WHERE fi.original_name LIKE ? AND fi.is_deleted = 0 AND (fi.user_id = ? OR fs.user_id = ? OR ? = 'ADMIN')
             LIMIT 10`,
            [searchQuery, userId, userId, userRole]
        );

        res.json({
            users,
            events,
            documents: [...folders, ...files]
        });
    } catch (error) {
        console.error('Erro na busca global:', error);
        res.status(500).json({ error: 'Erro ao realizar busca' });
    }
};
