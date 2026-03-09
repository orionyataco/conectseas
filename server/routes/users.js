import express from 'express';
import pool from '../db.js';
import upload from '../middleware/upload.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// GET Users (for sharing)
router.get('/', authMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, name, email, avatar, birth_date, appointment_date FROM users ORDER BY name ASC');
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
});

// GET Single User Profile
router.get('/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query('SELECT id, name, email, avatar, role, position, department, nickname, bio, birth_date, mobile_phone, registration_number, appointment_date, vacation_status, vacation_message, vacation_start_date, vacation_end_date FROM users WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
        res.json(rows[0]);
    } catch (error) {
        console.error('Erro ao buscar perfil do usuário:', error);
        res.status(500).json({ error: 'Erro ao buscar perfil do usuário' });
    }
});

// Update User Profile
router.put('/:id', [authMiddleware, upload.single('avatar')], async (req, res) => {
    const { id } = req.params;
    const requesterId = req.user.id;
    const requesterRole = req.user.role;

    // Security: Only the user themselves or an ADMIN can update the profile
    if (String(id) !== String(requesterId) && requesterRole !== 'ADMIN') {
        console.warn(`Tentativa não autorizada de edição de perfil: Usuário ${requesterId} tentou editar perfil ${id}`);
        return res.status(403).json({ error: 'Não autorizado a editar este perfil' });
    }

    const { nickname, email, bio, birthDate, mobilePhone, registrationNumber, appointmentDate, department, position } = req.body;
    let avatarPath = null;

    if (req.file) {
        avatarPath = `/uploads/${req.file.filename}`;
    }

    try {
        let query = 'UPDATE users SET ';
        const params = [];
        const updates = [];

        if (nickname !== undefined) { updates.push('nickname = ?'); params.push(nickname); }
        if (email !== undefined) { updates.push('email = ?'); params.push(email); }
        if (bio !== undefined) { updates.push('bio = ?'); params.push(bio); }
        if (birthDate !== undefined) { updates.push('birth_date = ?'); params.push(birthDate === '' ? null : birthDate); }
        if (mobilePhone !== undefined) { updates.push('mobile_phone = ?'); params.push(mobilePhone); }
        if (registrationNumber !== undefined) { updates.push('registration_number = ?'); params.push(registrationNumber); }
        if (appointmentDate !== undefined) { updates.push('appointment_date = ?'); params.push(appointmentDate === '' ? null : appointmentDate); }
        if (department !== undefined) { updates.push('department = ?'); params.push(department); }
        if (position !== undefined) { updates.push('position = ?'); params.push(position); }

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

        const [rows] = await pool.query('SELECT id, username, name, email, role, department, position, avatar, nickname, bio, birth_date, mobile_phone, registration_number, appointment_date FROM users WHERE id = ?', [id]);
        const user = rows[0];

        res.json({
            success: true,
            user: {
                ...user,
                id: user.id.toString()
            }
        });
    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar perfil' });
    }
});

// Update User Vacation Status
router.put('/:id/vacation-status', authMiddleware, async (req, res) => {
    const { id } = req.params;
    const requesterId = req.user.id;
    const requesterRole = req.user.role;

    // Security check
    if (String(id) !== String(requesterId) && requesterRole !== 'ADMIN') {
        return res.status(403).json({ error: 'Não autorizado' });
    }

    const { vacationStatus, vacationMessage, vacationStartDate, vacationEndDate, publishToMural } = req.body;

    try {
        await pool.query(
            'UPDATE users SET vacation_status = ?, vacation_message = ?, vacation_start_date = ?, vacation_end_date = ? WHERE id = ?',
            [vacationStatus ? 1 : 0, vacationMessage || null, vacationStartDate || null, vacationEndDate || null, id]
        );

        if (publishToMural && vacationStatus && vacationMessage) {
            const [userRows] = await pool.query('SELECT name FROM users WHERE id = ?', [id]);
            if (userRows.length > 0) {
                const postContent = `🏖️ ${userRows[0].name} está de férias!\n\n${vacationMessage}`;
                await pool.query(
                    'INSERT INTO posts (user_id, content, is_urgent) VALUES (?, ?, ?)',
                    [id, postContent, 0]
                );
            }
        }

        const [rows] = await pool.query('SELECT id, username, name, email, role, department, position, avatar, nickname, bio, birth_date, mobile_phone, registration_number, appointment_date, vacation_status, vacation_message, vacation_start_date, vacation_end_date FROM users WHERE id = ?', [id]);
        const user = rows[0];

        res.json({
            success: true,
            user: {
                ...user,
                id: user.id.toString()
            }
        });
    } catch (error) {
        console.error('Erro ao atualizar status de férias:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar status de férias' });
    }
});

export default router;
