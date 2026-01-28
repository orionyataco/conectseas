import express from 'express';
import { getHolidays } from '../controllers/holidayController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Publicly available or authenticated depends on project needs, 
// usually internal portal uses auth for everything.
router.get('/', authMiddleware, getHolidays);

export default router;
