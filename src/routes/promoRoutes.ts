import express from 'express';
import { createPromo, getPromos, updatePromo } from '../controllers/promoController';
import { protect, adminOnly } from '../middleware/auth';
const router = express.Router();

router.post('/', protect, adminOnly, createPromo);
router.get('/', protect, adminOnly, getPromos);
router.put('/:id', protect, adminOnly, updatePromo);

export default router;
