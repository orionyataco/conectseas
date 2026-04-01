import express from 'express';
import pool from '../db.js';
import upload from '../middleware/upload.js';
import authMiddleware from '../middleware/auth.js';
import adminMiddleware from '../middleware/admin.js';
import { deleteFileFromDisk, deleteMultipleFilesFromDisk } from '../services/fileService.js';

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

router.put('/users/:id/department', async (req, res) => {
    const { id } = req.params;
    const { department } = req.body;
    try {
        await pool.query('UPDATE users SET department = ? WHERE id = ?', [department, id]);
        res.json({ success: true });
    } catch (error) {
        console.error(`Erro ao atualizar departamento do usuário ${id}:`, error);
        res.status(500).json({ error: 'Erro ao atualizar departamento' });
    }
});

router.put('/users/:id/position', async (req, res) => {
    const { id } = req.params;
    const { position } = req.body;
    try {
        await pool.query('UPDATE users SET position = ? WHERE id = ?', [position, id]);
        res.json({ success: true });
    } catch (error) {
        console.error(`Erro ao atualizar cargo do usuário ${id}:`, error);
        res.status(500).json({ error: 'Erro ao atualizar cargo' });
    }
});

// Delete user and all related records
router.delete('/users/:id', async (req, res) => {
    const { id } = req.params;

    // Prevent deleting itself
    if (String(id) === String(req.user.id)) {
        return res.status(400).json({ error: 'Você não pode excluir sua própria conta aqui.' });
    }

    try {
        console.log(`[ADMIN] Solicitando exclusão total do usuário ${id}`);

        // ANTES DE DELETAR DOS BANCO, PRECISAMOS COLETAR E DELETAR ARQUIVOS FÍSICOS
        const filesToDelete = [];

        // 0. Avatar do usuário
        const [userAvatar] = await pool.query('SELECT avatar FROM users WHERE id = ?', [id]);
        if (userAvatar[0]?.avatar && userAvatar[0].avatar.startsWith('/uploads/')) {
            filesToDelete.push(userAvatar[0].avatar);
        }

        // 1. Arquivos do Mural (Anexos de posts do usuário)
        const [muralFiles] = await pool.query('SELECT filename FROM post_attachments WHERE post_id IN (SELECT id FROM posts WHERE user_id = ?)', [id]);
        muralFiles.forEach(f => filesToDelete.push(f.filename));

        // 2. Arquivos do Drive (TEC-Drive)
        const [driveFiles] = await pool.query('SELECT filename FROM user_files WHERE user_id = ?', [id]);
        driveFiles.forEach(f => filesToDelete.push(f.filename));

        // 3. Arquivos do Tectic (Suporte)
        const [tecticFiles] = await pool.query('SELECT file_path FROM tectic_files WHERE uploaded_by = ?', [id]);
        tecticFiles.forEach(f => filesToDelete.push(f.file_path));

        // 4. Arquivos do Messenger
        const [msgFiles] = await pool.query('SELECT file_url FROM messenger_messages WHERE (sender_id = ? OR receiver_id = ?) AND file_url LIKE "/uploads/%"', [id, id]);
        msgFiles.forEach(f => filesToDelete.push(f.file_url));

        // Efetuar a deleção física
        if (filesToDelete.length > 0) {
            await deleteMultipleFilesFromDisk([...new Set(filesToDelete)]); // usar Set para evitar duplicatas
        }

        // Inicia a sequência de deleção (mantendo a lógica original do banco)
        // Usamos uma sequência que respeita dependências se possível, embora sem FK cascade ativado

        // 1. Mural
        await pool.query('DELETE FROM post_likes WHERE user_id = ?', [id]);
        await pool.query('DELETE FROM post_comments WHERE user_id = ?', [id]);
        await pool.query('DELETE FROM post_attachments WHERE post_id IN (SELECT id FROM posts WHERE user_id = ?)', [id]);
        await pool.query('DELETE FROM posts WHERE user_id = ?', [id]);

        // 2. Calendário
        await pool.query('DELETE FROM event_shares WHERE user_id = ?', [id]);
        await pool.query('DELETE FROM calendar_events WHERE user_id = ?', [id]);

        // 3. Drive (TEC-Drive)
        await pool.query('DELETE FROM user_files WHERE user_id = ?', [id]);
        await pool.query('DELETE FROM folder_shares WHERE user_id = ?', [id]);
        await pool.query('DELETE FROM user_folders WHERE user_id = ?', [id]);

        // 4. Projetos
        await pool.query('DELETE FROM project_members WHERE user_id = ?', [id]);
        await pool.query('DELETE FROM task_assignees WHERE user_id = ?', [id]);
        await pool.query('DELETE FROM task_comments WHERE user_id = ?', [id]);
        await pool.query('DELETE FROM task_subtasks WHERE task_id IN (SELECT id FROM project_tasks WHERE created_by = ?)', [id]);
        await pool.query('DELETE FROM project_tasks WHERE created_by = ? OR assigned_to = ?', [id, id]);
        await pool.query('DELETE FROM projects WHERE owner_id = ?', [id]);

        // 5. ServiceDesk
        await pool.query('DELETE FROM tectic_ticket_comments WHERE user_id = ?', [id]);
        await pool.query('DELETE FROM tectic_tickets WHERE user_id = ? OR assigned_to = ? OR resolved_by = ?', [id, id, id]);
        await pool.query('DELETE FROM tectic_files WHERE uploaded_by = ?', [id]);

        // 6. Mensagens e Notificações
        await pool.query('DELETE FROM messenger_messages WHERE sender_id = ? OR receiver_id = ?', [id, id]);
        await pool.query('DELETE FROM notifications WHERE user_id = ?', [id]);

        // 7. Dashboard e Geral
        await pool.query('DELETE FROM todos WHERE user_id = ?', [id]);
        await pool.query('DELETE FROM user_notes WHERE user_id = ?', [id]);
        await pool.query('DELETE FROM user_shortcuts WHERE user_id = ?', [id]);

        // 8. O Usuário em si
        const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        console.log(`[ADMIN] Usuário ${id} excluído com sucesso.`);
        res.json({ success: true, message: 'Usuário e todos os seus registros foram removidos permanentemente.' });
    } catch (error) {
        console.error(`Erro ao excluir usuário ${id}:`, error);
        res.status(500).json({ error: 'Erro interno ao processar a exclusão total do usuário.' });
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
