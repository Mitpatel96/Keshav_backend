import express from 'express';
import { addInventory, transferInventoryToVendor, getInventory, getInventoryById, updateInventoryQty, approveOrRejectInventory } from '../controllers/inventoryController';
import { protect, adminOnly } from '../middleware/auth';
const router = express.Router();

router.post('/', protect, adminOnly, addInventory);
router.post('/transfer-to-vendor', protect, adminOnly, transferInventoryToVendor);
router.get('/', protect, getInventory);
router.get('/:id', protect, getInventoryById);
router.put('/:id', protect, adminOnly, updateInventoryQty);
router.put('/:id/approve-or-reject', protect, approveOrRejectInventory);

export default router;