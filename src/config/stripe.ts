import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
export const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

if (!stripeSecretKey) {
  console.warn('STRIPE_SECRET_KEY is not defined. Stripe operations will fail.');
}

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-09-30.clover',
});

if (!stripeWebhookSecret) {
  console.warn('STRIPE_WEBHOOK_SECRET is not defined. Stripe webhooks cannot be verified.');
}
