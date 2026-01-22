import express from 'express';
import { askAI } from '../services/aiService.js';

const router = express.Router();

router.post('/chat', async (req, res) => {
    const { prompt } = req.body;
    try {
        const response = await askAI(prompt);
        res.json({ text: response });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao processar solicitação de IA' });
    }
});

export default router;
