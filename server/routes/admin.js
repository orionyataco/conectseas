import express from 'express';
import pool from '../db.js';
import upload from '../middleware/upload.js';
import authMiddleware from '../middleware/auth.js';
import adminMiddleware from '../middleware/admin.js';

const router = express.Router();

// Apply admin middleware to all routes in this file
router.use([authMiddleware, adminMiddleware]);

// Get System Settings
router.get('/settings', async (req, res) => {
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
// Fixed version of Update System Setting
router.put('/settings/visual-identity', upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'favicon', maxCount: 1 }
]), async (req, res) => {
    const { app_name, app_description, primary_color } = req.body;
    try {
        const [rows] = await pool.query('SELECT value FROM system_settings WHERE key = ?', ['visual_identity']);
        let visualIdentity = rows.length > 0 ? JSON.parse(rows[0].value) : {};

        if (app_name) visualIdentity.app_name = app_name;
        if (app_description) visualIdentity.app_description = app_description;
        if (primary_color) visualIdentity.primary_color = primary_color;

        if (req.files && req.files['logo']) {
            visualIdentity.app_logo = `/uploads/${req.files['logo'][0].filename}`;
        }
        if (req.files && req.files['favicon']) {
            visualIdentity.app_favicon = `/uploads/${req.files['favicon'][0].filename}`;
        }

        await pool.query(
            'INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP',
            ['visual_identity', JSON.stringify(visualIdentity)]
        );
        res.json({ success: true, settings: visualIdentity });
    } catch (error) {
        console.error('Erro ao atualizar identidade visual:', error);
        res.status(500).json({ error: 'Erro ao atualizar identidade visual' });
    }
});

router.put('/settings/:key', async (req, res) => {
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

// Upload Setting Image
router.post('/settings/upload/:key', upload.single('file'), async (req, res) => {
    const { key } = req.params;
    const { field } = req.body;

    if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    try {
        const filePath = `/uploads/${req.file.filename}`;

        const [rows] = await pool.query('SELECT value FROM system_settings WHERE key = ?', [key]);
        if (rows.length === 0) return res.status(404).json({ error: 'Configuração não encontrada' });

        const settingValue = JSON.parse(rows[0].value);
        settingValue[field] = filePath;

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

// Sidebar Items
router.post('/sidebar-items', async (req, res) => {
    const { key, label, icon, path, order_index, required_role, is_active, open_in_iframe } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO sidebar_items (key, label, icon, path, order_index, required_role, is_active, open_in_iframe) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [key, label, icon, path, order_index || 0, required_role || null, is_active === undefined ? 1 : is_active, open_in_iframe ? 1 : 0]
        );
        res.json({ id: result.insertId, success: true });
    } catch (error) {
        console.error('Erro ao criar item da sidebar:', error);
        res.status(500).json({ error: 'Erro ao criar item da sidebar' });
    }
});

router.put('/sidebar-items/:id', async (req, res) => {
    const { id } = req.params;
    const { label, icon, path, order_index, required_role, is_active, open_in_iframe } = req.body;
    try {
        await pool.query(
            'UPDATE sidebar_items SET label = ?, icon = ?, path = ?, order_index = ?, required_role = ?, is_active = ?, open_in_iframe = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [label, icon, path, order_index, required_role || null, is_active, open_in_iframe ? 1 : 0, id]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao atualizar item da sidebar:', error);
        res.status(500).json({ error: 'Erro ao atualizar item da sidebar' });
    }
});

router.delete('/sidebar-items/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [item] = await pool.query('SELECT is_system FROM sidebar_items WHERE id = ?', [id]);
        if (item[0]?.is_system) {
            return res.status(403).json({ error: 'Não é possível excluir itens do sistema' });
        }
        await pool.query('DELETE FROM sidebar_items WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao excluir item da sidebar:', error);
        res.status(500).json({ error: 'Erro ao excluir item da sidebar' });
    }
});

router.put('/sidebar-items/reorder', async (req, res) => {
    const { items } = req.body;
    try {
        for (const item of items) {
            await pool.query('UPDATE sidebar_items SET order_index = ? WHERE id = ?', [item.order_index, item.id]);
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao reordenar itens da sidebar:', error);
        res.status(500).json({ error: 'Erro ao reordenar itens da sidebar' });
    }
});

// Stats
router.get('/stats', async (req, res) => {
    try {
        const [userCount] = await pool.query('SELECT COUNT(*) as total FROM users');
        const [adminCount] = await pool.query("SELECT COUNT(*) as total FROM users WHERE role = 'ADMIN'");
        const [postCount] = await pool.query('SELECT COUNT(*) as total FROM posts');
        const [fileCount] = await pool.query('SELECT COUNT(*) as total FROM user_files');

        res.json({
            users: userCount[0].total,
            activeUsers: userCount[0].total - adminCount[0].total,
            posts: postCount[0].total,
            files: fileCount[0].total
        });
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
});

// User Management
router.get('/users', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, username, name, email, role, department, position, avatar, storage_quota FROM users ORDER BY name ASC');
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar usuários (admin):', error);
        res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
});

router.put('/users/:id/role', async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    if (!['USER', 'ADMIN'].includes(role)) return res.status(400).json({ error: 'Role inválida' });
    try {
        await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, id]);
        res.json({ success: true });
    } catch (error) {
        console.error(`Erro ao atualizar role do usuário ${id}:`, error);
        res.status(500).json({ error: 'Erro ao atualizar permissão' });
    }
});

router.put('/users/:id/quota', async (req, res) => {
    const { id } = req.params;
    const { quota } = req.body;
    if (quota < 1073741824 || quota > 5368709120) return res.status(400).json({ error: 'Cota inválida (deve ser entre 1GB e 5GB)' });
    try {
        await pool.query('UPDATE users SET storage_quota = ? WHERE id = ?', [quota, id]);
        res.json({ success: true });
    } catch (error) {
        console.error(`Erro ao atualizar cota do usuário ${id}:`, error);
        res.status(500).json({ error: 'Erro ao atualizar cota' });
    }
});

// LDAP Test
router.post('/ldap/test', async (req, res) => {
    try {
        let ldapConfig;
        if (req.body && Object.keys(req.body).length > 0) {
            ldapConfig = req.body;
        } else {
            const [ldapSettings] = await pool.query('SELECT value FROM system_settings WHERE key = ?', ['ldap_config']);
            ldapConfig = ldapSettings.length > 0 ? JSON.parse(ldapSettings[0].value) : { enabled: false };
        }

        const { testLDAPConnection } = await import('../ldapTest.js');
        const result = await testLDAPConnection(ldapConfig);
        res.json(result);
    } catch (error) {
        console.error('Erro ao testar LDAP:', error);
        res.status(500).json({ success: false, error: 'Erro ao testar conexão LDAP', details: error.message });
    }
});

export default router;
