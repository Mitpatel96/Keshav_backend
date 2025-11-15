// controllers/paymentController.ts
import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import Stripe from 'stripe';
import { Types } from 'mongoose';
import Payment from '../models/Payment';
import { buildCheckoutSummary, CheckoutItemInput } from '../services/orderService';
import { stripe, stripeWebhookSecret } from '../config/stripe';
import { validatePromoForCheckout } from '../services/promoService';

const mapStripeStatus = (status: string): 'pending' | 'requires_action' | 'succeeded' | 'failed' | 'cancelled' => {
  switch (status) {
    case 'requires_action':
    case 'requires_confirmation':
    case 'requires_payment_method':
      return 'requires_action';
    case 'succeeded':
      return 'succeeded';
    case 'canceled':
      return 'cancelled';
    case 'processing':
    case 'requires_capture':
      return 'pending';
    default:
      return 'pending';
  }
};

const syncPaymentFromStripeIntent = async (intent: Stripe.PaymentIntent) => {
  const payment = await Payment.findOne({ stripePaymentIntentId: intent.id });
  if (!payment) {
    return;
  }

  payment.status = mapStripeStatus(intent.status);

  const charges = (intent as Stripe.PaymentIntent & { charges?: { data?: Array<{ receipt_url?: string | null }> } }).charges?.data;
  if (charges?.length) {
    payment.receiptUrl = charges[0]?.receipt_url || payment.receiptUrl;
  }

  await payment.save();
};

export const createPaymentIntent = asyncHandler(async (req: Request, res: Response) => {
  const { userId, vendorId, items, promoCode, currency } = req.body;

  if (!userId) {
    res.status(400).json({ message: 'userId is required' });
    return;
  }

  if (!vendorId) {
    res.status(400).json({ message: 'vendorId is required' });
    return;
  }

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ message: 'items array is required' });
    return;
  }

  const checkoutItems: CheckoutItemInput[] = items.map((item: any) => ({
    productId: item.productId,
    quantity: item.quantity || 1
  }));

  const summary = await buildCheckoutSummary(checkoutItems, vendorId);

  let discountAmount = 0;
  let promoDetails:
    | {
      code: string;
      promoCodeId: Types.ObjectId;
      promoBatchId: Types.ObjectId;
      discountType: 'PERCENTAGE' | 'FLAT';
      discountValue: number;
    }
    | undefined;

  if (promoCode) {
    const validation = await validatePromoForCheckout(promoCode, new Types.ObjectId(userId), summary.items);
    discountAmount = validation.discountAmount;
    promoDetails = {
      code: validation.promoCode.code,
      promoCodeId: validation.promoCode._id,
      promoBatchId: validation.batch._id,
      discountType: validation.batch.discountType,
      discountValue: validation.batch.discountValue
    };
  }

  const subtotal = summary.subtotal;
  const totalAmount = Math.max(0, subtotal - discountAmount);
  const stripeCurrency = (currency || 'aud').toLowerCase();
  const amountInSmallestUnit = Math.round(totalAmount * 100);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInSmallestUnit,
    currency: stripeCurrency,
    metadata: {
      userId,
      vendorId
    }
  });

  const payment = await Payment.create({
    user: new Types.ObjectId(userId),
    vendor: summary.vendor,
    items: summary.items.map((item) => ({
      product: item.product,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
      components: item.components.map((component) => ({
        sku: component.sku,
        quantityPerBundle: component.quantityPerBundle
      }))
    })),
    subtotal,
    discountAmount,
    totalAmount,
    currency: stripeCurrency,
    status: mapStripeStatus(paymentIntent.status),
    stripePaymentIntentId: paymentIntent.id,
    promoCode: promoDetails?.code,
    promoCodeId: promoDetails?.promoCodeId,
    promoBatchId: promoDetails?.promoBatchId,
    promoDiscountType: promoDetails?.discountType,
    promoDiscountValue: promoDetails?.discountValue
  });

  res.json({
    paymentId: payment._id,
    clientSecret: paymentIntent.client_secret,
    subtotal,
    discount: discountAmount,
    total: totalAmount,
    currency: stripeCurrency
  });
});

export const confirmPayment = asyncHandler(async (req: Request, res: Response) => {
  const { paymentIntentId } = req.body;
  if (!paymentIntentId) {
    res.status(400).json({ message: 'paymentIntentId is required' });
    return;
  }

  const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
  if (!intent) {
    res.status(404).json({ message: 'Payment Intent not found' });
    return;
  }

  const payment = await Payment.findOne({ stripePaymentIntentId: paymentIntentId });
  if (!payment) {
    res.status(404).json({ message: 'Payment record not found' });
    return;
  }

  payment.status = mapStripeStatus(intent.status);

  // For Stripe typesafety: retrieve full PaymentIntent w/expansion for charges
  let receiptUrl;
  if (intent.status === 'succeeded') {
    // Get charges by re-fetching the payment intent with expanded charges
    const intentWithCharges = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ['charges.data.balance_transaction']
    });

    const charges = (intentWithCharges as any).charges;
    if (charges?.data?.length) {
      const charge = charges.data[0];
      receiptUrl = charge.receipt_url;
    }
  }
  if (receiptUrl) {
    payment.receiptUrl = receiptUrl;
  }

  await payment.save();

  res.json({
    message: payment.status === 'succeeded' ? 'Payment successful' : 'Payment status updated',
    status: payment.status,
    payment
  });
});

export const getAllPayments = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limitRaw = parseInt(req.query.limit as string, 10);
  const limit = Math.min(100, Math.max(1, Number.isNaN(limitRaw) ? 20 : limitRaw));
  const skip = (page - 1) * limit;

  const [payments, total] = await Promise.all([
    Payment.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    Payment.countDocuments()
  ]);

  res.json({
    data: payments,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit)
  });
});

export const getSinglePayment = asyncHandler(async (req: Request, res: Response) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) {
    res.status(404).json({ message: 'Payment not found' });
    return;
  }
  res.json(payment);
});

export const handleStripeWebhook = asyncHandler(async (req: Request, res: Response) => {
  if (!stripeWebhookSecret) {
    res.status(500).json({ message: 'Stripe webhook secret is not configured on the server' });
    return;
  }

  const signature = req.headers['stripe-signature'];
  if (!signature) {
    res.status(400).json({ message: 'Missing Stripe signature header' });
    return;
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body as Buffer,
      signature,
      stripeWebhookSecret
    );
  } catch (err: any) {
    console.error('Stripe webhook signature verification failed', err?.message);
    res.status(400).send(`Webhook Error: ${err?.message}`);
    return;
  }

  const intent = event.data.object as Stripe.PaymentIntent;

  switch (event.type) {
    case 'payment_intent.succeeded':
    case 'payment_intent.payment_failed':
    case 'payment_intent.canceled':
    case 'payment_intent.processing':
      await syncPaymentFromStripeIntent(intent);
      break;
    default:
      break;
  }

  res.json({ received: true });
});
