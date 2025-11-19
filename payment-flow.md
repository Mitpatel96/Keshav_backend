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
   - **Important statuses:**
     - `"requires_action"`: Payment needs additional authentication (e.g., 3D Secure). Wait for user to complete it, then call `confirmPayment` again once Stripe.js confirms the payment.
     - `"succeeded"`: Payment completed successfully. **Only proceed to step 5 when you get this status.**
     - `"failed"` or `"cancelled"`: Payment failed. Show error to user.
   - **Save the `payment._id`** from the response - this is the `paymentId` you'll use in step 5.
     - `payment._id`: MongoDB payment ID (use this as `paymentId` when creating order)
     - `payment.stripePaymentIntentId`: Stripe payment intent ID (use this for `confirmPayment` calls)

5. **Create the order (only after payment succeeded)**
   - **IMPORTANT**: Only call `createComboProductOrder` **after** `confirmPayment` returns `status: "succeeded"`.
   - The order creation will fail if payment status is not `"succeeded"`.
   - **DO NOT** call this API if status is `"requires_action"` - wait until payment succeeds.
   - Call:
     ```
     POST /api/orders/combo-product-order
     {
       "paymentId": "payment._id"  // Use the MongoDB _id from the payment object (e.g., "691b66dae837fefa713ce701")
     }
     ```
   - **Example**: If `confirmPayment` returned `payment._id: "691b66dae837fefa713ce701"`, use that value.
   - **Note**: The API accepts other parameters (`userId`, `vendorId`, `items`, `productId`, `quantity`, `paymentMethod`), but when `paymentId` is provided:
     - The backend **automatically extracts** `userId`, `vendorId`, `items`, `discountAmount`, and `promoCode` from the payment record
     - You only need to pass `paymentId` - other parameters are ignored if `paymentId` is present
   - The backend will:
     - Verify payment status is `"succeeded"`
     - Verify payment doesn't already have an order linked
     - Extract order details from the payment record (user, vendor, items, discount, promo)
     - Validate order amount matches payment amount
     - Reserve inventory for the order
     - Create order with status `"pending_verification"`
     - Link the order to the payment
     - Send order verification code via email
   - Response includes the created order with `orderVFC` (verification code).

6. **Mark order as paid**
   - After `createComboProductOrder` succeeds, the order is created and linked to the payment.
   - Save `paymentId`/order info as needed for your UI (receipts, order confirmation, etc.).

7. **Optional: Webhook redundancy**
   - Configure Stripe to call `POST {BASE_URL}/api/payment/stripe-webhook` for events like `payment_intent.succeeded`, `payment_intent.payment_failed`, and `payment_intent.canceled`. The server now updates Mongo automatically when Stripe sends those events.
   - Set `STRIPE_WEBHOOK_SECRET` (from Stripe Dashboard) in your backend environment so the handler can verify signatures.

