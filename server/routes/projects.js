import express from 'express';
import pool from '../db.js';
import upload from '../middleware/upload.js';
import authMiddleware from '../middleware/auth.js';
import { sendNotification } from '../services/notificationService.js';

const router = express.Router();

// Apply auth middleware to all routes in this file
router.use(authMiddleware);

// Helper: verifica se o usuário autenticado tem acesso ao projeto (público, owner ou membro)
async function assertProjectAccess(projectId, userId, res) {
    const [rows] = await pool.query(
        `SELECT 1 FROM projects p 
         WHERE p.id = ? AND (p.visibility = 'public' OR p.owner_id = ? 
         OR EXISTS (SELECT 1 FROM project_members WHERE project_id = p.id AND user_id = ?))`,
        [projectId, userId, userId]
    );
    if (rows.length === 0) {
        res.status(403).json({ error: 'Acesso negado ao projeto' });
        return false;
    }
    return true;
}

// Helper: verifica se o usuário autenticado é owner ou manager do projeto
async function assertProjectOwnerOrManager(projectId, userId, res) {
    const [rows] = await pool.query(
        'SELECT p.owner_id, pm.role FROM projects p LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ? WHERE p.id = ?',
        [userId, projectId]
    );
    if (rows.length === 0) {
        res.status(404).json({ error: 'Projeto não encontrado' });
        return false;
    }
    const { owner_id, role } = rows[0];
    if (owner_id !== userId && role !== 'owner' && role !== 'manager') {
        res.status(403).json({ error: 'Não autorizado (requer permissão de gestor ou dono)' });
        return false;
    }
    return true;
}

// Projects
router.get('/', async (req, res) => {
    // Usa o userId do token JWT — nunca de req.query
    const userId = req.user.id;
    try {
        const [projects] = await pool.query(`
            SELECT p.*, u.name as owner_name, u.avatar as owner_avatar,
                (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count,
                (SELECT COUNT(*) FROM project_tasks WHERE project_id = p.id) as task_count,
                (SELECT COUNT(*) FROM project_tasks WHERE project_id = p.id AND status = 'done') as completed_tasks
            FROM projects p JOIN users u ON p.owner_id = u.id
            WHERE p.visibility = 'public' OR p.owner_id = ?
               OR EXISTS (SELECT 1 FROM project_members WHERE project_id = p.id AND user_id = ?)
            ORDER BY p.created_at DESC
        `, [userId, userId]);
        res.json(projects);
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ error: 'Erro ao buscar projetos' });
    }
});

router.get('/:id', async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    try {
        const hasAccess = await assertProjectAccess(parseInt(id), userId, res);
        if (!hasAccess) return;

        const [projects] = await pool.query(`
            SELECT p.*, u.name as owner_name, u.avatar as owner_avatar
            FROM projects p JOIN users u ON p.owner_id = u.id WHERE p.id = ?
        `, [id]);
        if (projects.length === 0) return res.status(404).json({ error: 'Projeto não encontrado' });
        res.json(projects[0]);
    } catch (error) {
        console.error('Error fetching project:', error);
        res.status(500).json({ error: 'Erro ao buscar projeto' });
    }
});

router.post('/', upload.array('attachments'), async (req, res) => {
    // ownerId sempre vem do token JWT autenticado
    const ownerId = req.user.id;
    const { name, description, status, priority, startDate, endDate, visibility, color, members } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO projects (name, description, owner_id, status, priority, start_date, end_date, visibility, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [name, description, ownerId, status || 'active', priority || 'medium', startDate || null, endDate || null, visibility || 'public', color || '#3B82F6']
        );
        const projectId = result.insertId;
        await pool.query('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)', [projectId, ownerId, 'owner']);
        if (members) {
            const parsedMembers = typeof members === 'string' ? JSON.parse(members) : members;
            if (Array.isArray(parsedMembers)) {
                for (const memberId of parsedMembers) {
                    if (parseInt(memberId) === parseInt(ownerId)) continue;
                    await pool.query('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)', [projectId, memberId, 'member']);
                }
            }
        }
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                let type = file.mimetype.startsWith('image/') ? 'image' : (file.mimetype === 'application/pdf' ? 'pdf' : 'other');
                const [fileResult] = await pool.query('INSERT INTO user_files (user_id, name, type, path, size, is_public) VALUES (?, ?, ?, ?, ?, ?)', [ownerId, file.originalname, type, `/uploads/${file.filename}`, file.size, visibility === 'public' ? 1 : 0]);
                await pool.query('INSERT INTO project_attachments (project_id, file_id, uploaded_by) VALUES (?, ?, ?)', [projectId, fileResult.insertId, ownerId]);
            }
        }
        res.json({ success: true, id: projectId });
    } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({ error: 'Erro ao criar projeto' });
    }
});

router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const requesterId = req.user.id;
    const { name, description, status, priority, startDate, endDate, visibility, color } = req.body;
    try {
        // Verifica se o usuário autenticado é owner ou manager antes de permitir edição
        const ok = await assertProjectOwnerOrManager(parseInt(id), requesterId, res);
        if (!ok) return;
        await pool.query('UPDATE projects SET name = ?, description = ?, status = ?, priority = ?, start_date = ?, end_date = ?, visibility = ?, color = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [name, description, status, priority, startDate, endDate, visibility, color, id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({ error: 'Erro ao atualizar projeto' });
    }
});

router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    // userId e role vêm do token JWT — nunca de req.query
    const requesterId = req.user.id;
    const requesterRole = req.user.role;
    try {
        const [projects] = await pool.query('SELECT owner_id FROM projects WHERE id = ?', [id]);
        if (projects.length === 0) return res.status(404).json({ error: 'Projeto não encontrado' });
        if (projects[0].owner_id !== requesterId && requesterRole !== 'ADMIN') {
            return res.status(403).json({ error: 'Não autorizado' });
        }
        await pool.query('DELETE FROM projects WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ error: 'Erro ao deletar projeto' });
    }
});

router.post('/:id/duplicate', async (req, res) => {
    const { id } = req.params;
    // userId sempre do token JWT
    const userId = req.user.id;
    const { newName } = req.body;
    try {
        const hasAccess = await assertProjectAccess(parseInt(id), userId, res);
        if (!hasAccess) return;

        const [projects] = await pool.query('SELECT * FROM projects WHERE id = ?', [id]);
        if (projects.length === 0) return res.status(404).json({ error: 'Projeto não encontrado' });
        const originalProject = projects[0];
        const [result] = await pool.query('INSERT INTO projects (name, description, owner_id, status, start_date, end_date, visibility, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [newName || `${originalProject.name} (Cópia)`, originalProject.description, userId, 'active', originalProject.start_date, originalProject.end_date, originalProject.visibility, originalProject.color]);
        const newProjectId = result.insertId;
        await pool.query('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)', [newProjectId, userId, 'owner']);
        const [tasks] = await pool.query('SELECT * FROM project_tasks WHERE project_id = ?', [id]);
        for (const task of tasks) {
            const [taskResult] = await pool.query(`INSERT INTO project_tasks (project_id, title, description, created_by, status, priority, due_date, estimated_hours) VALUES (?, ?, ?, ?, 'todo', ?, ?, ?)`, [newProjectId, task.title, task.description, userId, task.priority, task.due_date, task.estimated_hours]);
            const [subtasks] = await pool.query('SELECT * FROM task_subtasks WHERE task_id = ?', [task.id]);
            for (const subtask of subtasks) {
                await pool.query('INSERT INTO task_subtasks (task_id, title) VALUES (?, ?)', [taskResult.insertId, subtask.title]);
            }
        }
        res.json({ success: true, id: newProjectId });
    } catch (error) {
        console.error('Error duplicating project:', error);
        res.status(500).json({ error: 'Erro ao duplicar projeto' });
    }
});

router.patch('/:id/archive', async (req, res) => {
    const { id } = req.params;
    const requesterId = req.user.id;
    const { is_archived } = req.body;
    try {
        // Verifica ownership antes de arquivar
        const ok = await assertProjectOwnerOrManager(parseInt(id), requesterId, res);
        if (!ok) return;
        await pool.query('UPDATE projects SET is_archived = ? WHERE id = ?', [is_archived ? 1 : 0, id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error archiving project:', error);
        res.status(500).json({ error: 'Erro ao arquivar projeto' });
    }
});

router.get('/:id/stats', async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    try {
        const hasAccess = await assertProjectAccess(parseInt(id), userId, res);
        if (!hasAccess) return;

        const [stats] = await pool.query(`
            SELECT COUNT(*) as total_tasks, SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as completed_tasks,
                   SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks,
                   SUM(CASE WHEN status = 'todo' THEN 1 ELSE 0 END) as todo_tasks,
                   SUM(CASE WHEN status = 'review' THEN 1 ELSE 0 END) as review_tasks
            FROM project_tasks WHERE project_id = ?
        `, [id]);
        res.json(stats[0]);
    } catch (error) {
        console.error('Error fetching project stats:', error);
        res.status(500).json({ error: 'Erro ao buscar estatísticas do projeto' });
    }
});

// Members
router.get('/:id/members', async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    try {
        const hasAccess = await assertProjectAccess(parseInt(id), userId, res);
        if (!hasAccess) return;

        const [members] = await pool.query(`
            SELECT pm.*, u.name as user_name, u.avatar as user_avatar, u.position as user_position
            FROM project_members pm JOIN users u ON pm.user_id = u.id WHERE pm.project_id = ? ORDER BY pm.role DESC, u.name ASC
        `, [id]);
        res.json(members);
    } catch (error) {
        console.error('Error fetching project members:', error);
        res.status(500).json({ error: 'Erro ao buscar membros do projeto' });
    }
});

router.post('/:id/members', async (req, res) => {
    const { id } = req.params;
    const requesterId = req.user.id;
    const { userId, role } = req.body;
    try {
        // Apenas owner ou manager pode adicionar membros
        const ok = await assertProjectOwnerOrManager(parseInt(id), requesterId, res);
        if (!ok) return;
        await pool.query('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)', [id, userId, role || 'member']);
        const [project] = await pool.query('SELECT name FROM projects WHERE id = ?', [id]);
        await sendNotification(userId, 'project_invite', 'Convite de Projeto', `Você foi adicionado ao projeto: ${project[0]?.name || 'um projeto'}`, 'projetos');
        res.json({ success: true });
    } catch (error) {
        console.error('Error adding project member:', error);
        res.status(500).json({ error: 'Erro ao adicionar membro ao projeto' });
    }
});

router.put('/:projectId/members/:userId', async (req, res) => {
    const { projectId, userId } = req.params;
    const requesterId = req.user.id;
    const { role } = req.body;
    try {
        // Apenas owner ou manager pode alterar roles
        const ok = await assertProjectOwnerOrManager(parseInt(projectId), requesterId, res);
        if (!ok) return;
        await pool.query('UPDATE project_members SET role = ? WHERE project_id = ? AND user_id = ?', [role, projectId, userId]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating member role:', error);
        res.status(500).json({ error: 'Erro ao atualizar role do membro' });
    }
});

router.delete('/:projectId/members/:userId', async (req, res) => {
    const { projectId, userId } = req.params;
    const requesterId = req.user.id;
    try {
        // Apenas owner/manager pode remover membros, ou o próprio usuário pode sair
        const isOwnRemoval = String(requesterId) === String(userId);
        if (!isOwnRemoval) {
            const ok = await assertProjectOwnerOrManager(parseInt(projectId), requesterId, res);
            if (!ok) return;
        }
        await pool.query('DELETE FROM project_members WHERE project_id = ? AND user_id = ?', [projectId, userId]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error removing project member:', error);
        res.status(500).json({ error: 'Erro ao remover membro do projeto' });
    }
});

// Tasks
router.get('/:id/tasks', async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    try {
        const hasAccess = await assertProjectAccess(parseInt(id), userId, res);
        if (!hasAccess) return;

        const [tasks] = await pool.query(`
            SELECT t.*, u1.name as assigned_name, u1.avatar as assigned_avatar, u2.name as creator_name,
                (SELECT COUNT(*) FROM task_comments WHERE task_id = t.id) as comment_count,
                (SELECT COUNT(*) FROM task_attachments WHERE task_id = t.id) as attachment_count,
                COALESCE((SELECT json_agg(json_build_object('id', u.id, 'name', u.name, 'avatar', u.avatar)) FROM task_assignees ta JOIN users u ON ta.user_id = u.id WHERE ta.task_id = t.id), '[]'::json) as assignees,
                COALESCE((SELECT json_agg(json_build_object('id', ts.id, 'title', ts.title, 'is_completed', ts.is_completed)) FROM task_subtasks ts WHERE ts.task_id = t.id), '[]'::json) as subtasks
            FROM project_tasks t LEFT JOIN users u1 ON t.assigned_to = u1.id JOIN users u2 ON t.created_by = u2.id
            WHERE t.project_id = ? ORDER BY t.order_index ASC, t.created_at DESC
        `, [id]);
        // pg retorna JSON já parseado como objeto JS — sem necessidade de JSON.parse
        res.json(tasks.map(t => ({ ...t, assignees: t.assignees || [], subtasks: t.subtasks || [] })));
    } catch (error) {
        console.error('Error fetching project tasks:', error);
        res.status(500).json({ error: 'Erro ao buscar tarefas do projeto' });
    }
});

router.get('/tasks/:id', async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    try {
        const [tasks] = await pool.query(`
            SELECT t.*, u1.name as assigned_name, u1.avatar as assigned_avatar, u2.name as creator_name,
                COALESCE((SELECT json_agg(json_build_object('id', u.id, 'name', u.name, 'avatar', u.avatar)) FROM task_assignees ta JOIN users u ON ta.user_id = u.id WHERE ta.task_id = t.id), '[]'::json) as assignees,
                COALESCE((SELECT json_agg(json_build_object('id', ts.id, 'title', ts.title, 'is_completed', ts.is_completed)) FROM task_subtasks ts WHERE ts.task_id = t.id), '[]'::json) as subtasks
            FROM project_tasks t LEFT JOIN users u1 ON t.assigned_to = u1.id JOIN users u2 ON t.created_by = u2.id WHERE t.id = ?
        `, [id]);
        if (tasks.length === 0) return res.status(404).json({ error: 'Tarefa não encontrada' });

        const hasAccess = await assertProjectAccess(tasks[0].project_id, userId, res);
        if (!hasAccess) return;
        res.json({ ...tasks[0], assignees: tasks[0].assignees || [], subtasks: tasks[0].subtasks || [] });
    } catch (error) {
        console.error('Error fetching task:', error);
        res.status(500).json({ error: 'Erro ao buscar tarefa' });
    }
});

router.post('/:id/tasks', async (req, res) => {
    const { id } = req.params;
    // createdBy sempre do token JWT
    const createdBy = req.user.id;
    try {
        const hasAccess = await assertProjectAccess(parseInt(id), createdBy, res);
        if (!hasAccess) return;

        const { title, description, assignees, status, priority, dueDate, subtasks } = req.body;
        const [result] = await pool.query('INSERT INTO project_tasks (project_id, title, description, assigned_to, created_by, status, priority, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [id, title, description, (assignees && assignees.length > 0) ? assignees[0] : null, createdBy, status || 'todo', priority || 'medium', dueDate]);
        const taskId = result.insertId;
        if (assignees && Array.isArray(assignees)) {
            for (const userId of assignees) {
                await pool.query('INSERT INTO task_assignees (task_id, user_id) VALUES (?, ?)', [taskId, userId]);
                if (userId !== createdBy) await sendNotification(userId, 'project_task_assignment', 'Nova tarefa atribuída', `Você foi atribuído à tarefa: ${title}`, 'projetos');
            }
        }
        if (subtasks && Array.isArray(subtasks)) {
            for (const subItem of subtasks) await pool.query('INSERT INTO task_subtasks (task_id, title) VALUES (?, ?)', [taskId, typeof subItem === 'string' ? subItem : subItem.title]);
        }
        res.json({ success: true, id: taskId });
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ error: 'Erro ao criar tarefa' });
    }
});

router.put('/tasks/:id', async (req, res) => {
    const { id } = req.params;
    const requesterId = req.user.id;
    const requesterRole = req.user.role;
    const { title, description, assignedTo, status, priority, dueDate, estimatedHours, actualHours, subtasks, assignees } = req.body;
    try {
        // Verifica se o solicitante é membro do projeto da tarefa ou admin
        const [taskRows] = await pool.query('SELECT project_id FROM project_tasks WHERE id = ?', [id]);
        if (taskRows.length === 0) return res.status(404).json({ error: 'Tarefa não encontrada' });
        if (requesterRole !== 'ADMIN') {
            const [membership] = await pool.query('SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?', [taskRows[0].project_id, requesterId]);
            if (membership.length === 0) return res.status(403).json({ error: 'Não autorizado' });
        }
        await pool.query(`UPDATE project_tasks SET title = ?, description = ?, assigned_to = ?, status = ?, priority = ?, due_date = ?, estimated_hours = ?, actual_hours = ?, completed_at = ${status === 'done' ? 'CURRENT_TIMESTAMP' : 'NULL'}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [title, description, assignedTo, status, priority, dueDate, estimatedHours, actualHours, id]);
        if (assignees && Array.isArray(assignees)) {
            const [prev] = await pool.query('SELECT user_id FROM task_assignees WHERE task_id = ?', [id]);
            const prevIds = prev.map(a => a.user_id);
            await pool.query('DELETE FROM task_assignees WHERE task_id = ?', [id]);
            for (const userId of assignees) {
                await pool.query('INSERT INTO task_assignees (task_id, user_id) VALUES (?, ?)', [id, userId]);
                if (!prevIds.includes(userId)) await sendNotification(userId, 'project_task_assignment', 'Nova tarefa atribuída', `Você foi atribuído à tarefa: ${title}`, 'projetos');
            }
        }
        if (subtasks && Array.isArray(subtasks)) {
            await pool.query('DELETE FROM task_subtasks WHERE task_id = ?', [id]);
            for (const subItem of subtasks) await pool.query('INSERT INTO task_subtasks (task_id, title) VALUES (?, ?)', [id, typeof subItem === 'string' ? subItem : subItem.title]);
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ error: 'Erro ao atualizar tarefa' });
    }
});

router.patch('/tasks/:id/status', async (req, res) => {
    const { id } = req.params;
    const requesterId = req.user.id;
    const requesterRole = req.user.role;
    const { status, orderIndex } = req.body;
    try {
        // Verifica membership no projeto da tarefa
        const [taskRows] = await pool.query('SELECT project_id FROM project_tasks WHERE id = ?', [id]);
        if (taskRows.length === 0) return res.status(404).json({ error: 'Tarefa não encontrada' });
        if (requesterRole !== 'ADMIN') {
            const [membership] = await pool.query('SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?', [taskRows[0].project_id, requesterId]);
            if (membership.length === 0) return res.status(403).json({ error: 'Não autorizado' });
        }
        await pool.query(`UPDATE project_tasks SET status = ?, order_index = ?, completed_at = ${status === 'done' ? 'CURRENT_TIMESTAMP' : 'NULL'}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [status, orderIndex, id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating task status:', error);
        res.status(500).json({ error: 'Erro ao atualizar status da tarefa' });
    }
});

router.delete('/tasks/:id', async (req, res) => {
    const { id } = req.params;
    const requesterId = req.user.id;
    const requesterRole = req.user.role;
    try {
        // Verifica se solicitante é owner/manager do projeto ou admin
        const [taskRows] = await pool.query('SELECT project_id, created_by FROM project_tasks WHERE id = ?', [id]);
        if (taskRows.length === 0) return res.status(404).json({ error: 'Tarefa não encontrada' });
        if (requesterRole !== 'ADMIN') {
            const ok = await assertProjectOwnerOrManager(taskRows[0].project_id, requesterId, res);
            if (!ok) return;
        }
        await pool.query('DELETE FROM project_tasks WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ error: 'Erro ao deletar tarefa' });
    }
});

router.patch('/subtasks/:id/toggle', async (req, res) => {
    const { id } = req.params;
    const { is_completed } = req.body;
    try {
        await pool.query('UPDATE task_subtasks SET is_completed = ? WHERE id = ?', [is_completed ? 1 : 0, id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error toggling subtask:', error);
        res.status(500).json({ error: 'Erro ao atualizar subtarefa' });
    }
});

// Task Comments
router.get('/tasks/:id/comments', async (req, res) => {
    const { id } = req.params;
    try {
        const [comments] = await pool.query(`
            SELECT tc.*, u.name as author_name, u.avatar as author_avatar, u.role as author_role
            FROM task_comments tc JOIN users u ON tc.user_id = u.id WHERE tc.task_id = ? ORDER BY tc.created_at ASC
        `, [id]);
        res.json(comments);
    } catch (error) {
        console.error('Error fetching task comments:', error);
        res.status(500).json({ error: 'Erro ao buscar comentários da tarefa' });
    }
});

router.post('/tasks/:id/comments', async (req, res) => {
    const { id } = req.params;
    // userId do comentário sempre do token JWT
    const userId = req.user.id;
    const { content } = req.body;
    try {
        const [result] = await pool.query('INSERT INTO task_comments (task_id, user_id, content) VALUES (?, ?, ?)', [id, userId, content]);
        res.json({ success: true, id: result.insertId });
    } catch (error) {
        console.error('Error adding task comment:', error);
        res.status(500).json({ error: 'Erro ao adicionar comentário' });
    }
});

router.put('/task-comments/:id', async (req, res) => {
    const { id } = req.params;
    const requesterId = req.user.id;
    const requesterRole = req.user.role;
    const { content } = req.body;
    try {
        const [comments] = await pool.query('SELECT user_id FROM task_comments WHERE id = ?', [id]);
        if (comments.length === 0) return res.status(404).json({ error: 'Comentário não encontrado' });
        if (requesterRole !== 'ADMIN' && comments[0].user_id !== requesterId) {
            return res.status(403).json({ error: 'Não autorizado' });
        }
        await pool.query('UPDATE task_comments SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [content, id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating task comment:', error);
        res.status(500).json({ error: 'Erro ao atualizar comentário' });
    }
});

router.delete('/task-comments/:id', async (req, res) => {
    const { id } = req.params;
    const requesterId = req.user.id;
    const requesterRole = req.user.role;
    try {
        const [comments] = await pool.query('SELECT user_id FROM task_comments WHERE id = ?', [id]);
        if (comments.length === 0) return res.status(404).json({ error: 'Comentário não encontrado' });
        if (requesterRole !== 'ADMIN' && comments[0].user_id !== requesterId) {
            return res.status(403).json({ error: 'Não autorizado' });
        }
        await pool.query('DELETE FROM task_comments WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting task comment:', error);
        res.status(500).json({ error: 'Erro ao deletar comentário' });
    }
});

export default router;
