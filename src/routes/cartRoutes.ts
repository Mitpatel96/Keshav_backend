import express from 'express';
import { protect } from '../middleware/auth';
import {
    addCartItem,
    clearCart,
    getCart,
    removeCartItem,
    updateCartItemQuantity,
    validateCartAvailability
} from '../controllers/cartController';

const router = express.Router();

router.get('/', protect, getCart);
router.post('/items', protect, addCartItem);
router.patch('/items/:itemId', protect, updateCartItemQuantity);
router.delete('/items/:itemId', protect, removeCartItem);
router.delete('/', protect, clearCart);
router.post('/validate', protect, validateCartAvailability);

export default router;

