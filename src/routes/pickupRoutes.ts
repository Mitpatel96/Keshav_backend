import express from 'express';
import { addPickup, getPickups, assignVendorToPickup } from '../controllers/pickupController';
import { protect, adminOnly } from '../middleware/auth';
const router = express.Router();
router.post('/', protect, adminOnly, addPickup);
router.get('/', protect, adminOnly, getPickups);
router.post('/:id/assign', protect, adminOnly, assignVendorToPickup);
export default router;
