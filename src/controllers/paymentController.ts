// controllers/paymentController.ts
import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import Stripe from 'stripe';
import Payment from '../models/Payment';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const createPaymentIntent = asyncHandler(async (req: Request, res: Response) => {
  const { userId, orderId, amount, currency } = req.body;

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Stripe uses smallest currency unit (paise)
    currency: currency || 'inr',
    metadata: { orderId, userId },
  });

  const payment = await Payment.create({
    userId,
    orderId,
    amount,
    currency,
    stripePaymentIntentId: paymentIntent.id,
    status: 'pending',
  });

  res.json({
    clientSecret: paymentIntent.client_secret,
    paymentId: payment._id,
  });
});

export const confirmPayment = asyncHandler(async (req: Request, res: Response) => {
  const { paymentIntentId } = req.body;
  const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (intent.status === 'succeeded') {
    const payment = await Payment.findOneAndUpdate(
      { stripePaymentIntentId: paymentIntentId },
      { status: 'succeeded' },
      { new: true }
    );
    return res.json({ message: 'Payment successful', payment });
  }

  res.json({ message: 'Payment not yet completed', status: intent.status });
});

export const getAllPayments = asyncHandler(async (_req: Request, res: Response) => {
  const payments = await Payment.find().sort({ createdAt: -1 });
  res.json(payments);
});

export const getSinglePayment = asyncHandler(async (req: Request, res: Response) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) return res.status(404).json({ message: 'Payment not found' });
  res.json(payment);
});
