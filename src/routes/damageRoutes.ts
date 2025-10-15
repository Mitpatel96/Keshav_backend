import express from 'express';
import { createDamageTicket, approveDamageTicket, getDamageTickets } from '../controllers/damageController';
import { protect, adminOnly } from '../middleware/auth';
const router = express.Router();
router.post('/', protect, createDamageTicket);
router.get('/', protect, adminOnly, getDamageTickets);
router.post('/:id/approve', protect, adminOnly, approveDamageTicket);
export default router;
