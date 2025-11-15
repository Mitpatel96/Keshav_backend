## Payment Flow for Frontend

1. **Collect checkout info**
   - Gather `userId`, `vendorId`, `items[]`, `promoCode` (optional), and `currency` (default `aud`).

2. **Create PaymentIntent**
   - Call `POST /api/payment/create-intent` with the checkout payload.
   - Response includes:
     - `paymentId`: Mongo payment record ID (internal reference).
     - `clientSecret`: Stripe client secret used on the frontend.
     - `subtotal`, `discount`, `total`, `currency`.

3. **Confirm payment with Stripe.js**
   - Initialize Stripe with your publishable key.
   - Call:
     ```js
     const stripe = Stripe(PUBLISHABLE_KEY);
     const result = await stripe.confirmCardPayment(clientSecret, {
       payment_method: {
         card: cardElement,
         billing_details: { /* optional */ },
       },
     });
     ```
   - Stripe handles 3‑D Secure or other bank challenges automatically.
   - If `result.error`, show the error and optionally notify backend (payment stays `requires_payment_method`).

4. **Notify backend of final status**
   - When `result.paymentIntent.status` resolves (e.g., `succeeded`), call:
     ```
     POST /api/payment/confirm
     {
       "paymentIntentId": result.paymentIntent.id  // looks like "pi_..."
     }
     ```
   - Backend fetches the latest status from Stripe, updates Mongo, and returns `{ message, status, payment }`.

5. **Mark order as paid**
   - Only treat the order as successful when the confirm API returns `status: "succeeded"`.
   - Save `paymentId`/order info as needed for your UI (receipts, order confirmation, etc.).

6. **Optional: Webhook redundancy**
   - Configure Stripe to call `POST {BASE_URL}/api/payment/stripe-webhook` for events like `payment_intent.succeeded`, `payment_intent.payment_failed`, and `payment_intent.canceled`. The server now updates Mongo automatically when Stripe sends those events.
   - Set `STRIPE_WEBHOOK_SECRET` (from Stripe Dashboard) in your backend environment so the handler can verify signatures.

