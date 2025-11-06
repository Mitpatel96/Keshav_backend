import express from 'express';
import {
    addInventory,
    transferInventoryToVendor,
    getInventory,
    getInventoryById,
    updateInventoryQty,
    respondToPendingTransfer,
    getPendingTransfers
} from '../controllers/inventoryController';
import { protect, adminOnly } from '../middleware/auth';
const router = express.Router();

router.post('/', protect, adminOnly, addInventory);
router.post('/transfer-to-vendor', protect, adminOnly, transferInventoryToVendor);
router.get('/pending-transfers', protect, getPendingTransfers);
router.put('/pending-transfers/:transferId/respond', protect, respondToPendingTransfer);
router.get('/', protect, getInventory);
router.get('/:id', protect, getInventoryById);
router.put('/:id', protect, adminOnly, updateInventoryQty);

export default router;