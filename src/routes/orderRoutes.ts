import express from 'express';
import { createOrder, getOrders, verifyPickup } from '../controllers/orderController';
import { protect } from '../middleware/auth';
const router = express.Router();

router.post('/', protect, createOrder);
router.get('/', protect, getOrders);
router.post('/verify', protect, verifyPickup);

export default router;

