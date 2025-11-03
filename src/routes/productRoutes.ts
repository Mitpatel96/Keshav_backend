import express from 'express';
import { createProduct, getProducts, getProductById, updateProduct, deleteProduct } from '../controllers/productController';
import { protect, adminOnly } from '../middleware/auth';

const router = express.Router();

router.post('/', protect, adminOnly, createProduct);
router.get('/', protect, getProducts);
router.get('/:id', protect, getProductById);
router.put('/:id', protect, adminOnly, updateProduct);
router.delete('/:id', protect, adminOnly, deleteProduct);

export default router;
