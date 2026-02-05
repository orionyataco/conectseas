import express from 'express';
import pool from '../db.js';
import authMiddleware from '../middleware/auth.js';
import adminMiddleware from '../middleware/admin.js';
import { askAI } from '../services/aiService.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Multer for TEC-Drive
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads/tectic'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// Admin only routes for management, but some for ticket creation might be public/auth
router.use(authMiddleware);

// Dashboard Stats
router.get('/stats', adminMiddleware, async (req, res) => {
    try {
        const [total] = await pool.query('SELECT COUNT(*) as count FROM tectic_tickets');
        const [active] = await pool.query("SELECT COUNT(*) as count FROM tectic_tickets WHERE status NOT IN ('Resolvido', 'Cancelado')");
        const [resolved] = await pool.query("SELECT COUNT(*) as count FROM tectic_tickets WHERE status = 'Resolvido'");
        const [urgent] = await pool.query("SELECT COUNT(*) as count FROM tectic_tickets WHERE priority IN ('Alta', 'Crítica') AND status != 'Resolvido'");

        const [categories] = await pool.query('SELECT category, COUNT(*) as count FROM tectic_tickets GROUP BY category');
        const [byWeekday] = await pool.query("SELECT strftime('%w', created_at) as day, COUNT(*) as count FROM tectic_tickets GROUP BY day ORDER BY day");
        const [byMonth] = await pool.query("SELECT strftime('%m', created_at) as month, COUNT(*) as count FROM tectic_tickets GROUP BY month ORDER BY month");
        const [byYear] = await pool.query("SELECT strftime('%Y', created_at) as year, COUNT(*) as count FROM tectic_tickets GROUP BY year ORDER BY year");

        const [byDept] = await pool.query(`
            SELECT u.department, COUNT(t.id) as count 
            FROM tectic_tickets t 
            JOIN users u ON t.user_id = u.id 
            GROUP BY u.department 
            ORDER BY count DESC
        `);
        const [byDeptWeek] = await pool.query(`
            SELECT u.department, COUNT(t.id) as count 
            FROM tectic_tickets t 
            JOIN users u ON t.user_id = u.id 
            WHERE t.created_at >= date('now', '-7 days')
            GROUP BY u.department 
            ORDER BY count DESC
        `);
        const [byDeptMonth] = await pool.query(`
            SELECT u.department, COUNT(t.id) as count 
            FROM tectic_tickets t 
            JOIN users u ON t.user_id = u.id 
            WHERE t.created_at >= date('now', 'start of month')
            GROUP BY u.department 
            ORDER BY count DESC
        `);
        const [byDeptYear] = await pool.query(`
            SELECT u.department, COUNT(t.id) as count 
            FROM tectic_tickets t 
            JOIN users u ON t.user_id = u.id 
            WHERE t.created_at >= date('now', 'start of year')
            GROUP BY u.department 
            ORDER BY count DESC
        `);

        const [levels] = await pool.query('SELECT support_level, COUNT(*) as count FROM tectic_tickets GROUP BY support_level');
        const [topResolvers] = await pool.query(`
            SELECT u.name as technician_name, u.avatar as technician_avatar, COUNT(t.id) as count 
            FROM tectic_tickets t 
            JOIN users u ON t.resolved_by = u.id 
            WHERE t.status = 'Resolvido' 
            GROUP BY t.resolved_by 
            ORDER BY count DESC 
            LIMIT 5
        `);

        res.json({
            cards: {
                total: total[0].count,
                active: active[0].count,
                resolved: resolved[0].count,
                urgent: urgent[0].count
            },
            categories,
            byWeekday,
            byMonth,
            byYear,
            byDept,
            byDeptWeek,
            byDeptMonth,
            byDeptYear,
            levels,
            topResolvers
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
});

// Tickets List
router.get('/tickets', async (req, res) => {
    try {
        let query = `
            SELECT t.*, u.name as requester_name, u.avatar as requester_avatar, u.department as requester_dept, a.name as technician_name, r.name as resolver_name
            FROM tectic_tickets t
            JOIN users u ON t.user_id = u.id
            LEFT JOIN users a ON t.assigned_to = a.id
            LEFT JOIN users r ON t.resolved_by = r.id
        `;

        // Non-admins only see their own tickets
        if (req.user.role !== 'ADMIN') {
            query += ' WHERE t.user_id = ?';
        }

        query += ' ORDER BY t.created_at DESC';

        const [rows] = await pool.query(query, req.user.role !== 'ADMIN' ? [req.user.id] : []);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar chamados' });
    }
});

// Bulk Delete Tickets
router.delete('/bulk', adminMiddleware, async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'IDs inválidos ou ausentes' });
        }

        const placeholders = ids.map(() => '?').join(',');

        // Delete tickets (cascading comments if DB schema supports it, otherwise delete them too)
        await pool.query(`DELETE FROM tectic_ticket_comments WHERE ticket_id IN (${placeholders})`, ids);
        await pool.query(`DELETE FROM tectic_tickets WHERE id IN (${placeholders})`, ids);

        res.json({ message: 'Chamados deletados com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar chamados:', error);
        res.status(500).json({ error: 'Erro ao deletar chamados' });
    }
});




// Single Ticket Dossier
router.get('/tickets/:id', adminMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT t.*, u.name as requester_name, u.avatar as requester_avatar, u.email as requester_email, u.department as requester_dept, a.name as technician_name, r.name as resolver_name
            FROM tectic_tickets t
            JOIN users u ON t.user_id = u.id
            LEFT JOIN users a ON t.assigned_to = a.id
            LEFT JOIN users r ON t.resolved_by = r.id
            WHERE t.id = ?
        `, [req.params.id]);

        if (rows.length === 0) return res.status(404).json({ error: 'Chamado não encontrado' });

        const [comments] = await pool.query(`
            SELECT c.*, u.name as user_name, u.avatar as user_avatar, u.role as user_role
            FROM tectic_ticket_comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.ticket_id = ?
            ORDER BY c.created_at ASC
        `, [req.params.id]);

        res.json({ ...rows[0], comments });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar detalhes do chamado' });
    }
});

// Create Ticket
router.post('/tickets', async (req, res) => {
    const { title, description, category, priority, support_level } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO tectic_tickets (user_id, title, description, category, priority, support_level) VALUES (?, ?, ?, ?, ?, ?)',
            [req.user.id, title, description, category, priority, support_level || 'L1']
        );
        res.json({ success: true, id: result.insertId });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar chamado' });
    }
});

// Update Ticket (Assign, Status, Solution)
router.put('/tickets/:id', adminMiddleware, async (req, res) => {
    const { assigned_to, status, solution, priority, support_level, add_to_kb } = req.body;
    try {
        let updateQuery = 'UPDATE tectic_tickets SET updated_at = CURRENT_TIMESTAMP';
        const params = [];

        if (assigned_to !== undefined) { updateQuery += ', assigned_to = ?'; params.push(assigned_to); }
        if (status !== undefined) {
            updateQuery += ', status = ?'; params.push(status);
            if (status === 'Resolvido') {
                updateQuery += ', resolved_at = CURRENT_TIMESTAMP, resolved_by = ?';
                params.push(req.user.id);
            }
        }
        if (solution !== undefined) { updateQuery += ', solution = ?'; params.push(solution); }
        if (priority !== undefined) { updateQuery += ', priority = ?'; params.push(priority); }
        if (support_level !== undefined) { updateQuery += ', support_level = ?'; params.push(support_level); }

        updateQuery += ' WHERE id = ?';
        params.push(req.params.id);

        await pool.query(updateQuery, params);

        // Add to Knowledge Base if requested
        if (add_to_kb && status === 'Resolvido') {
            const [ticket] = await pool.query('SELECT title, description, category, solution FROM tectic_tickets WHERE id = ?', [req.params.id]);
            if (ticket.length > 0) {
                await pool.query(
                    'INSERT INTO tectic_knowledge (title, content, category, tags, author_id) VALUES (?, ?, ?, ?, ?)',
                    [ticket[0].title, `DESCRIÇÃO: ${ticket[0].description}\n\nSOLUÇÃO: ${solution || ticket[0].solution}`, ticket[0].category, 'Resolvido via Chamado', req.user.id]
                );
            }
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error updating ticket:', error);
        res.status(500).json({ error: 'Erro ao atualizar chamado' });
    }
});

// Add Comment
router.post('/tickets/:id/comments', async (req, res) => {
    const { comment, is_internal } = req.body;
    try {
        await pool.query(
            'INSERT INTO tectic_ticket_comments (ticket_id, user_id, comment, is_internal) VALUES (?, ?, ?, ?)',
            [req.params.id, req.user.id, comment, is_internal ? 1 : 0]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao adicionar comentário' });
    }
});

// AI Triage
router.post('/triage', async (req, res) => {
    const { description } = req.body;
    if (!description) return res.status(400).json({ error: 'Descrição necessária' });

    const prompt = `
        Analise a seguinte descrição de um problema técnico de TI e sugira:
        1. Categoria (Hardware, Software, Rede, Sistemas, Telefonia, Outros)
        2. Prioridade (Baixa, Média, Alta, Crítica)
        3. Nível de Suporte (L1 - Básico, L2 - Técnico Especializado, L3 - Infraestrutura/Desenvolvimento)
        
        Descrição: "${description}"
        
        Responda APENAS em formato JSON como no exemplo:
        {"category": "Hardware", "priority": "Alta", "support_level": "L2", "reasoning": "Breve justificativa"}
    `;

    try {
        const response = await askAI(prompt);
        // Clean up markdown if present
        const jsonStr = response.replace(/```json|```/g, '').trim();
        res.json(JSON.parse(jsonStr));
    } catch (error) {
        console.warn('IA indisponível, usando triagem baseada em regras...');

        // Simple fallback logic
        let category = 'Outros';
        let priority = 'Média';
        let support_level = 'L1';
        let reasoning = 'Triagem realizada por regras automáticas (IA indisponível).';

        const desc = description.toLowerCase();
        if (desc.includes('impressora') || desc.includes('monitor') || desc.includes('teclado') || desc.includes('mouse') || desc.includes('computador') || desc.includes('hardware')) {
            category = 'Hardware';
        } else if (desc.includes('senha') || desc.includes('acesso') || desc.includes('login') || desc.includes('permissão')) {
            category = 'Sistemas';
            priority = 'Alta';
        } else if (desc.includes('internet') || desc.includes('rede') || desc.includes('wifi') || desc.includes('lento') || desc.includes('conexão')) {
            category = 'Rede';
            priority = 'Alta';
            support_level = 'L2';
        } else if (desc.includes('parou') || desc.includes('não liga') || desc.includes('urgente') || desc.includes('crítico')) {
            priority = 'Crítica';
            support_level = 'L2';
        }

        res.json({ category, priority, support_level, reasoning });
    }
});

// TEC-Drive: List Files
router.get('/drive', adminMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT f.*, u.name as uploader_name 
            FROM tectic_files f
            JOIN users u ON f.uploaded_by = u.id
            ORDER BY f.created_at DESC
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar arquivos' });
    }
});

// TEC-Drive: Upload
router.post('/drive/upload', adminMiddleware, upload.single('file'), async (req, res) => {
    const { file_type } = req.body;
    try {
        await pool.query(
            'INSERT INTO tectic_files (name, original_name, file_path, file_type, file_size, mimetype, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [req.file.filename, req.file.originalname, req.file.path, file_type, req.file.size, req.file.mimetype, req.user.id]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao salvar arquivo' });
    }
});

// TEC-Drive: Delete File
router.delete('/drive/:id', adminMiddleware, async (req, res) => {
    try {
        const [file] = await pool.query('SELECT file_path FROM tectic_files WHERE id = ?', [req.params.id]);
        if (file.length > 0) {
            const fs = await import('fs/promises');
            try {
                await fs.unlink(file[0].file_path);
            } catch (fsErr) {
                console.warn('Physical file not found or could not be deleted:', fsErr.message);
            }
            await pool.query('DELETE FROM tectic_files WHERE id = ?', [req.params.id]);
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Arquivo não encontrado' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Erro ao excluir arquivo' });
    }
});

// TEC-Drive: Rename File
router.put('/drive/:id', adminMiddleware, async (req, res) => {
    const { original_name } = req.body;
    try {
        await pool.query('UPDATE tectic_files SET original_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [original_name, req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao renomear arquivo' });
    }
});

// Notices (Mural de Avisos TI)
router.get('/notices', adminMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM tectic_notices ORDER BY created_at DESC LIMIT 5');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar avisos' });
    }
});

router.post('/notices', adminMiddleware, async (req, res) => {
    const { title, content, urgency } = req.body;
    try {
        await pool.query(
            'INSERT INTO tectic_notices (title, content, urgency, created_by) VALUES (?, ?, ?, ?)',
            [title, content, urgency, req.user.id]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar aviso' });
    }
});

// Knowledge Base List
router.get('/knowledge', adminMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT k.*, u.name as author_name 
            FROM tectic_knowledge k
            JOIN users u ON k.author_id = u.id
            ORDER BY k.created_at DESC
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar base de conhecimento' });
    }
});

// Create KB Article
router.post('/knowledge', adminMiddleware, async (req, res) => {
    const { title, content, category, tags } = req.body;
    try {
        await pool.query(
            'INSERT INTO tectic_knowledge (title, content, category, tags, author_id) VALUES (?, ?, ?, ?, ?)',
            [title, content, category, tags, req.user.id]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar artigo na base de conhecimento' });
    }
});

// Update KB Article
router.put('/knowledge/:id', adminMiddleware, async (req, res) => {
    const { title, content, category, tags } = req.body;
    try {
        await pool.query(
            'UPDATE tectic_knowledge SET title = ?, content = ?, category = ?, tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [title, content, category, tags, req.params.id]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar artigo na base de conhecimento' });
    }
});

// Delete KB Article
router.delete('/knowledge/:id', adminMiddleware, async (req, res) => {
    try {
        await pool.query('DELETE FROM tectic_knowledge WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao excluir artigo na base de conhecimento' });
    }
});

export default router;
