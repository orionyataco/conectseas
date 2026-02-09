import pool from '../db.js';
import { sendNotification } from '../services/notificationService.js';

export const getEvents = async (req, res) => {
    const { userId, userRole } = req.query;

    try {
        // Query logic: 
        // 1. Events author is the user
        // 2. Events are public
        // 3. Events are shared with the user specifically in event_shares
        // 4. User is ADMIN (sees everything)

        let query = `
            SELECT DISTINCT
                e.*,
                u.name as author_name,
                u.position as author_role,
                u.avatar as author_avatar,
                (SELECT GROUP_CONCAT(user_id) FROM event_shares WHERE event_id = e.id) as shared_with
            FROM calendar_events e
            JOIN users u ON e.user_id = u.id
            LEFT JOIN event_shares es ON e.id = es.event_id
            WHERE 1=1
        `;

        const params = [];

        if (userRole !== 'ADMIN') {
            query += ` AND (e.visibility = 'public' OR e.user_id = ? OR es.user_id = ?)`;
            params.push(userId, userId);
        }

        query += ' ORDER BY e.event_date ASC, e.event_time ASC';

        const [events] = await pool.query(query, params);
        res.json(events);
    } catch (error) {
        console.error('Erro ao buscar eventos:', error);
        res.status(500).json({ error: 'Erro ao buscar eventos' });
    }
};

export const createEvent = async (req, res) => {
    const { userId, title, description, eventDate, eventEndDate, eventTime, eventEndTime, visibility, eventType, meetingLink, sharedWith } = req.body;

    try {
        const [result] = await pool.query(
            'INSERT INTO calendar_events (user_id, title, description, event_date, event_end_date, event_time, event_end_time, visibility, event_type, meeting_link) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [userId, title, description || null, eventDate, eventEndDate || null, eventTime || null, eventEndTime || null, visibility || 'public', eventType || 'other', meetingLink || null]
        );

        const eventId = result.insertId;

        // Handle shares if visibility is 'shared' or simply if sharedWith is provided
        if (sharedWith && Array.isArray(sharedWith)) {
            for (const sharedUserId of sharedWith) {
                await pool.query(
                    'INSERT INTO event_shares (event_id, user_id) VALUES (?, ?)',
                    [eventId, sharedUserId]
                );

                // Notify user
                await sendNotification(
                    sharedUserId,
                    'calendar_invite',
                    'Convite de Calendário',
                    `Você foi convidado para o evento: ${title}`,
                    'calendario'
                );
            }
        }

        res.json({ success: true, eventId });
    } catch (error) {
        console.error('Erro ao criar evento:', error);
        res.status(500).json({ error: 'Erro ao criar evento' });
    }
};

export const updateEvent = async (req, res) => {
    const { id } = req.params;
    const { userId, userRole, title, description, eventDate, eventEndDate, eventTime, eventEndTime, visibility, eventType, meetingLink, sharedWith } = req.body;

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
            [title, description || null, eventDate, eventEndDate || null, eventTime || null, eventEndTime || null, visibility || 'public', eventType || 'other', meetingLink || null, id]
        );

        // Update shares: Simple approach - delete and re-insert
        await pool.query('DELETE FROM event_shares WHERE event_id = ?', [id]);
        if (sharedWith && Array.isArray(sharedWith)) {
            for (const sharedUserId of sharedWith) {
                await pool.query(
                    'INSERT INTO event_shares (event_id, user_id) VALUES (?, ?)',
                    [id, sharedUserId]
                );

                // Notify user
                await sendNotification(
                    sharedUserId,
                    'calendar_invite',
                    'Convite de Calendário',
                    `Você foi convidado para o evento: ${title}`,
                    'calendario'
                );
            }
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao editar evento:', error);
        res.status(500).json({ error: 'Erro ao editar evento' });
    }
};

export const deleteEvent = async (req, res) => {
    const { id } = req.params;
    const { userId, userRole } = req.query;

    try {
        const [events] = await pool.query('SELECT user_id FROM calendar_events WHERE id = ?', [id]);
        if (events.length === 0) return res.status(404).json({ error: 'Evento não encontrado' });
        if (events[0].user_id != userId && userRole !== 'ADMIN') return res.status(403).json({ error: 'Não autorizado' });

        await pool.query('DELETE FROM calendar_events WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao deletar evento:', error);
        res.status(500).json({ error: 'Erro ao deletar evento' });
    }
};
