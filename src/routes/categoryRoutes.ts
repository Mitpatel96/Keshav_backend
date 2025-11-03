import express from 'express';
import { addCategory, getCategory } from '../controllers/categoryController';
import { protect, adminOnly } from '../middleware/auth';

const router = express.Router();

router.post('/', protect, adminOnly, addCategory);
router.get('/', protect, getCategory);

export default router;
