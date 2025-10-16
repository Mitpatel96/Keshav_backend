import express from 'express';
import { addSku, getSkus, updateSku } from '../controllers/skuController';
import { protect, adminOnly } from '../middleware/auth';
const router = express.Router();

router.post('/', protect, adminOnly, addSku);
router.get('/', protect, adminOnly, getSkus);
router.put('/:id', protect, adminOnly, updateSku);

export default router;