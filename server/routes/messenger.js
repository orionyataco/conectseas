import express from 'express';
import { getMessengerUsers, getMessageHistory, getUnreadCount, getLinkPreview, uploadMessengerFile, saveMessengerFileToDrive } from '../controllers/messengerController.js';
import authMiddleware from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

router.get('/users', authMiddleware, getMessengerUsers);
router.get('/history', authMiddleware, getMessageHistory);
router.get('/unread-count', authMiddleware, getUnreadCount);
router.get('/link-preview', authMiddleware, getLinkPreview);
router.post('/upload', authMiddleware, upload.single('file'), uploadMessengerFile);
router.post('/save-to-drive', authMiddleware, saveMessengerFileToDrive);

export default router;
