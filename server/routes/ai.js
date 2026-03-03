import express from 'express';
import { askAI } from '../services/aiService.js';

import authMiddleware from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);

router.post('/chat', async (req, res) => {
    const { prompt } = req.body;
    try {
        const response = await askAI(prompt);
        res.json({ text: response });
    } catch (error) {
        console.error("ERRO NA ROTA AI (/chat):", error.message);
        res.status(500).json({ error: 'Erro ao processar solicitação de IA' });
    }
});

export default router;
