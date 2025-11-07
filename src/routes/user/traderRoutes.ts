import express from 'express';
import { createTrader, getTraders, getTraderById, updateTrader, deleteTrader } from '../../controllers/user/traderController';
import { protect, adminOnly } from '../../middleware/auth';

const router = express.Router();

router.post('/', protect, adminOnly, createTrader);
router.get('/', protect, getTraders);
router.get('/:id', protect, getTraderById);
router.put('/:id', protect, adminOnly, updateTrader);
router.delete('/:id', protect, adminOnly, deleteTrader);

export default router;
