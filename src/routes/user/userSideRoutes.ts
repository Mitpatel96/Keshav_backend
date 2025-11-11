import express from 'express';
import { getProductsByCategory, getCategoriesWithProductCount } from '../../controllers/user/userSideController';

const router = express.Router();

// Public routes for user side
router.get('/categories', getCategoriesWithProductCount);
router.get('/categories/:categoryId/products', getProductsByCategory);

export default router;
