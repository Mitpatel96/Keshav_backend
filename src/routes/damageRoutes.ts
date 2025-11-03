import express from 'express';
import { createDamageTicket, approvePendingDamageTicket, getDamageTickets, rejectDamageTicket, getInventoryHistory } from '../controllers/damageController';
import { protect, adminOnly } from '../middleware/auth';
const router = express.Router();

router.post('/', protect, createDamageTicket);
router.post('/:id/approve', protect, adminOnly, approvePendingDamageTicket);
router.post('/:id/reject', protect, adminOnly, rejectDamageTicket);
router.get('/', protect, getDamageTickets);
router.get('/history', protect, getInventoryHistory);

export default router;