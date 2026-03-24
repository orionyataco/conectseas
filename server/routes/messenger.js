import express from 'express';
import { getMessengerUsers, getMessageHistory, getUnreadCount, getLinkPreview } from '../controllers/messengerController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

router.get('/users', authMiddleware, getMessengerUsers);
router.get('/history', authMiddleware, getMessageHistory);
router.get('/unread-count', authMiddleware, getUnreadCount);
router.get('/link-preview', authMiddleware, getLinkPreview);

export default router;
