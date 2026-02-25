import express from 'express';
import { getMessengerUsers, getMessageHistory, getUnreadCount } from '../controllers/messengerController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

router.get('/users', authMiddleware, getMessengerUsers);
router.get('/history', authMiddleware, getMessageHistory);
router.get('/unread-count', authMiddleware, getUnreadCount);

export default router;
