import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db.js';

const router = express.Router();

// Login Route
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Check LDAP configuration
        const [ldapSettings] = await pool.query('SELECT value FROM system_settings WHERE key = ?', ['ldap_config']);
        const ldapConfig = ldapSettings.length > 0 ? JSON.parse(ldapSettings[0].value) : { enabled: false };

        // Try LDAP authentication if enabled
        if (ldapConfig.enabled) {
            try {
                const { authenticateLDAP } = await import('../ldapAuth.js');
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

export default router;
