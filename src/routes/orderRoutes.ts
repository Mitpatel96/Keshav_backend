import express from 'express';
import { adminOnly, protect } from '../middleware/auth';
import { adminUpdatePickupAddress, createOnlineOrder, createWalkInOrder, deductVendorCash, generateBill, getOrders, getOrderById, getOrdersByUserId, getOrdersByVendorId, getPartiallyRejectedOrders, getVendorCashBalance, updateOrderStatus, verifyOrderWithVFC, getCashDeductionHistory, getVendorCashDeductionHistory } from '../controllers/orderController';

const router = express.Router();

router.post('/online-order', createOnlineOrder);
router.post('/verify-order-vfc', verifyOrderWithVFC);
router.put('/update-order-status', updateOrderStatus);
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
router.get('/:id', protect, getOrderById);
router.get('/user/:userId', protect, getOrdersByUserId);

export default router;