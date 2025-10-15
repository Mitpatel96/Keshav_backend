import express from 'express';
import { addInventory, confirmInventory, getInventory, updateInventoryQty } from '../controllers/inventoryController';
import { protect, adminOnly } from '../middleware/auth';
const router = express.Router();
router.post('/', protect, adminOnly, addInventory);
router.post('/:id/confirm', protect, adminOnly, confirmInventory);
router.get('/', protect, adminOnly, getInventory);
router.put('/:id', protect, adminOnly, updateInventoryQty);
export default router;
