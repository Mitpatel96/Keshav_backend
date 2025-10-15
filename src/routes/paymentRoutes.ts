// routes/paymentRoutes.ts
import express from 'express';
import {
  createPaymentIntent,
  confirmPayment,
  getAllPayments,
  getSinglePayment,
} from '../controllers/paymentController';

const router = express.Router();

router.post('/create-intent', createPaymentIntent);
router.post('/confirm', confirmPayment);
router.get('/', getAllPayments);
router.get('/:id', getSinglePayment);

export default router;
