import express from 'express';
import { protect, adminOnly } from '../middleware/auth';
import { getProductSalesList } from '../controllers/dashboard/admin';

const router = express.Router();

router.get('/product-sales-list', protect, adminOnly, getProductSalesList);

export default router;

