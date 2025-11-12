import express from 'express';
import {
  createPromoBatch,
  listPromoBatches,
  getPromoBatchById,
  deactivatePromoBatch,
  redeemPromoCode,
  exportPromoBatch
} from '../controllers/promoController';
import { protect, adminOnly } from '../middleware/auth';

const router = express.Router();

router.post('/batches', protect, adminOnly, createPromoBatch);
router.get('/batches', protect, adminOnly, listPromoBatches);
router.get('/batches/:id', protect, adminOnly, getPromoBatchById);
router.patch('/batches/:id/deactivate', protect, adminOnly, deactivatePromoBatch);
router.get('/batches/:id/export', protect, adminOnly, exportPromoBatch);
router.post('/redeem', protect, redeemPromoCode);

export default router;
