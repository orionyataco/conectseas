import express from 'express';
import pool from '../db.js';
import upload from '../middleware/upload.js';
import authMiddleware from '../middleware/auth.js';
import { sendNotification } from '../services/notificationService.js';

const router = express.Router();

// Apply auth middleware to all routes in this file
router.use(authMiddleware);

// Projects
router.get('/', async (req, res) => {
    const { userId } = req.query;
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
    try {
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
    const { name, description, ownerId, status, priority, startDate, endDate, visibility, color, members } = req.body;
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
    const { name, description, status, priority, startDate, endDate, visibility, color } = req.body;
    try {
        await pool.query('UPDATE projects SET name = ?, description = ?, status = ?, priority = ?, start_date = ?, end_date = ?, visibility = ?, color = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [name, description, status, priority, startDate, endDate, visibility, color, id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({ error: 'Erro ao atualizar projeto' });
    }
});

router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const { userId } = req.query;
    try {
        const [projects] = await pool.query('SELECT owner_id FROM projects WHERE id = ?', [id]);
        if (projects.length === 0) return res.status(404).json({ error: 'Projeto não encontrado' });
        const [users] = await pool.query('SELECT role FROM users WHERE id = ?', [userId]);
        if (projects[0].owner_id != userId && users[0].role !== 'ADMIN') return res.status(403).json({ error: 'Não autorizado' });
        await pool.query('DELETE FROM projects WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ error: 'Erro ao deletar projeto' });
    }
});

router.post('/:id/duplicate', async (req, res) => {
    const { id } = req.params;
    const { userId, newName } = req.body;
    try {
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
    const { is_archived } = req.body;
    try {
        await pool.query('UPDATE projects SET is_archived = ? WHERE id = ?', [is_archived ? 1 : 0, id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error archiving project:', error);
        res.status(500).json({ error: 'Erro ao arquivar projeto' });
    }
});

router.get('/:id/stats', async (req, res) => {
    const { id } = req.params;
    try {
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
    try {
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
    const { userId, role } = req.body;
    try {
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
    const { role } = req.body;
    try {
        await pool.query('UPDATE project_members SET role = ? WHERE project_id = ? AND user_id = ?', [role, projectId, userId]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating member role:', error);
        res.status(500).json({ error: 'Erro ao atualizar role do membro' });
    }
});

router.delete('/:projectId/members/:userId', async (req, res) => {
    const { projectId, userId } = req.params;
    try {
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
    try {
        const [tasks] = await pool.query(`
            SELECT t.*, u1.name as assigned_name, u1.avatar as assigned_avatar, u2.name as creator_name,
                (SELECT COUNT(*) FROM task_comments WHERE task_id = t.id) as comment_count,
                (SELECT COUNT(*) FROM task_attachments WHERE task_id = t.id) as attachment_count,
                (SELECT json_group_array(json_object('id', u.id, 'name', u.name, 'avatar', u.avatar)) FROM task_assignees ta JOIN users u ON ta.user_id = u.id WHERE ta.task_id = t.id) as assignees,
                (SELECT json_group_array(json_object('id', ts.id, 'title', ts.title, 'is_completed', ts.is_completed)) FROM task_subtasks ts WHERE ts.task_id = t.id) as subtasks
            FROM project_tasks t LEFT JOIN users u1 ON t.assigned_to = u1.id JOIN users u2 ON t.created_by = u2.id
            WHERE t.project_id = ? ORDER BY t.order_index ASC, t.created_at DESC
        `, [id]);
        res.json(tasks.map(t => ({ ...t, assignees: JSON.parse(t.assignees || '[]'), subtasks: JSON.parse(t.subtasks || '[]') })));
    } catch (error) {
        console.error('Error fetching project tasks:', error);
        res.status(500).json({ error: 'Erro ao buscar tarefas do projeto' });
    }
});

// Single task & task actions move here as well if prefixed correctly.
// For now, I'll keep the task routes in this file but mapped to /api/projects/:id/tasks or similar if possible.
// Actually, the frontend uses /api/tasks/:id for some calls. 
// I'll create a separate tasks.js if needed, or just include them here.
// Let's include everything related to projects/tasks in projects.js for now.

router.get('/tasks/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [tasks] = await pool.query(`
            SELECT t.*, u1.name as assigned_name, u1.avatar as assigned_avatar, u2.name as creator_name,
                (SELECT json_group_array(json_object('id', u.id, 'name', u.name, 'avatar', u.avatar)) FROM task_assignees ta JOIN users u ON ta.user_id = u.id WHERE ta.task_id = t.id) as assignees,
                (SELECT json_group_array(json_object('id', ts.id, 'title', ts.title, 'is_completed', ts.is_completed)) FROM task_subtasks ts WHERE ts.task_id = t.id) as subtasks
            FROM project_tasks t LEFT JOIN users u1 ON t.assigned_to = u1.id JOIN users u2 ON t.created_by = u2.id WHERE t.id = ?
        `, [id]);
        if (tasks.length === 0) return res.status(404).json({ error: 'Tarefa não encontrada' });
        res.json({ ...tasks[0], assignees: JSON.parse(tasks[0].assignees || '[]'), subtasks: JSON.parse(tasks[0].subtasks || '[]') });
    } catch (error) {
        console.error('Error fetching task:', error);
        res.status(500).json({ error: 'Erro ao buscar tarefa' });
    }
});

router.post('/:id/tasks', async (req, res) => {
    const { id } = req.params;
    const { title, description, assignees, createdBy, status, priority, dueDate, subtasks } = req.body;
    try {
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
    const { title, description, assignedTo, status, priority, dueDate, estimatedHours, actualHours, subtasks, assignees } = req.body;
    try {
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
    const { status, orderIndex } = req.body;
    try {
        await pool.query(`UPDATE project_tasks SET status = ?, order_index = ?, completed_at = ${status === 'done' ? 'CURRENT_TIMESTAMP' : 'NULL'}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [status, orderIndex, id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating task status:', error);
        res.status(500).json({ error: 'Erro ao atualizar status da tarefa' });
    }
});

router.delete('/tasks/:id', async (req, res) => {
    const { id } = req.params;
    try {
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
    const { userId, content } = req.body;
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
    const { content } = req.body;
    try {
        await pool.query('UPDATE task_comments SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [content, id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating task comment:', error);
        res.status(500).json({ error: 'Erro ao atualizar comentário' });
    }
});

router.delete('/task-comments/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM task_comments WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting task comment:', error);
        res.status(500).json({ error: 'Erro ao deletar comentário' });
    }
});

export default router;
