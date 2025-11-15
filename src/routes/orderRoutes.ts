import express from 'express';
import { adminOnly, protect } from '../middleware/auth';
import {
    adminUpdatePickupAddress,
    createWalkInOrder,
    deductVendorCash,
    generateBill,
    getOrders,
    getOrderById,
    getOrdersByUserId,
    getOrdersByVendorId,
    getPartiallyRejectedOrders,
    getVendorCashBalance,
    verifyOrderWithVFC,
    getCashDeductionHistory,
    getVendorCashDeductionHistory,
    createComboProductOrder,
    confirmComboProductOrder,
    getUserPreviousOrders
} from '../controllers/orderController';

const router = express.Router();

router.post('/combo-product-order', createComboProductOrder);
router.post('/verify-order-vfc', verifyOrderWithVFC);
router.post('/confirm-combo-order', confirmComboProductOrder);
router.get('/partially-rejected', protect, adminOnly, getPartiallyRejectedOrders);
router.put('/admin-update-pickup', adminUpdatePickupAddress);

router.post('/walk-in-order', createWalkInOrder);
router.get('/vendor/:vendorId', protect, getOrdersByVendorId);
router.post('/generate-bill', generateBill);
router.get('/vendor-cash-balance/:vendorId', protect, getVendorCashBalance);
router.post('/deduct-vendor-cash', protect, adminOnly, deductVendorCash);
router.get('/vendor/:vendorId/cash-deduction-history', protect, getVendorCashDeductionHistory);
router.get('/cash-deduction-history', protect, adminOnly, getCashDeductionHistory);

router.get('/', protect, getOrders);
router.get('/user/:userId/previous', protect, getUserPreviousOrders);
router.get('/user/:userId', protect, getOrdersByUserId);
router.get('/:id', protect, getOrderById);

export default router;