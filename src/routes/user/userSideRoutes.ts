import express from 'express';
import { getProductById, getProducts } from '../../controllers/productController';
import { getTraders } from '../../controllers/user/traderController';
import { getWebsiteSections } from '../../controllers/user/websiteSectionController';
import { getCategory } from '../../controllers/categoryController';
import { getProductsByCategory } from '../../controllers/user/userSideController';
import { getUserPreviousOrders } from '../../controllers/orderController';
import { protect } from '../../middleware/auth';

const router = express.Router();

router.get('/products', getProducts);
router.get('/product/:id', getProductById);
router.get('/traders', getTraders);
router.get('/website-sections', getWebsiteSections);
router.get('/category', getCategory);

router.get('/categories/:categoryId/products', getProductsByCategory);
router.get('/:userId/previous-orders', protect, getUserPreviousOrders);

export default router;
