import { Types } from 'mongoose';
import PromoCode, { IPromoCode } from '../models/PromoCode';
import PromoBatch, { IPromoBatch } from '../models/PromoBatch';
import { PreparedCheckoutItem } from './orderService';

export interface PromoValidationResult {
  promoCode: IPromoCode;
  batch: IPromoBatch;
  discountAmount: number;
}

const normalizeCode = (code: string) => (code || '').trim().toUpperCase();

export async function validatePromoForCheckout(
  code: string,
  userId: Types.ObjectId | string | undefined,
  checkoutItems: PreparedCheckoutItem[]
): Promise<PromoValidationResult> {
  const normalizedCode = normalizeCode(code);
  if (!normalizedCode) {
    throw new Error('Promo code is required');
  }

  const promoCode = await PromoCode.findOne({ code: normalizedCode }).populate('batch');
  if (!promoCode) {
    throw new Error('Promo code not found');
  }

  const batch = await PromoBatch.findById(promoCode.batch);
  if (!batch) {
    throw new Error('Promo batch not found');
  }

  if (!batch.isActive) {
    throw new Error('Promo is not active');
  }

  const now = new Date();
  if (now < batch.startDate) {
    throw new Error('Promo not active yet');
  }
  if (now > batch.endDate) {
    throw new Error('Promo expired');
  }

  if (promoCode.status === 'DEACTIVATED') {
    throw new Error('Promo deactivated');
  }

  if (promoCode.status === 'EXPIRED') {
    throw new Error('Promo expired');
  }

  const usageLimit = promoCode.usageLimit ?? 1;
  if (promoCode.usageCount >= usageLimit) {
    throw new Error('Promo usage limit reached');
  }

  const productIds = new Set(batch.products.map((id) => id.toString()));
  const applicableItems = checkoutItems.filter((item) => productIds.has(item.product.toString()));

  if (applicableItems.length === 0) {
    throw new Error('Promo not applicable on selected products');
  }

  const applicableSubtotal = applicableItems.reduce((sum, item) => sum + item.subtotal, 0);
  if (applicableSubtotal <= 0) {
    throw new Error('Promo not applicable on zero value products');
  }

  if (batch.usageScope === 'PER_USER') {
    if (!userId) {
      throw new Error('Authentication required for this promo');
    }
    const userIdentifier = userId.toString();
    const alreadyUsed =
      Array.isArray(promoCode.usedBy) &&
      promoCode.usedBy.some((entry) => entry.toString() === userIdentifier);
    if (alreadyUsed) {
      throw new Error('Promo already redeemed by the current user');
    }
  }

  const discountValue = batch.discountValue;
  let discountAmount = 0;
  if (batch.discountType === 'PERCENTAGE') {
    discountAmount = (applicableSubtotal * discountValue) / 100;
  } else {
    discountAmount = discountValue;
  }

  discountAmount = Math.min(discountAmount, applicableSubtotal);

  if (discountAmount <= 0) {
    throw new Error('Promo does not provide any discount for selected items');
  }

  return {
    promoCode,
    batch,
    discountAmount
  };
}

export async function consumePromoCode(
  promoCodeId: Types.ObjectId,
  userId?: Types.ObjectId
): Promise<void> {
  const promoCode = await PromoCode.findById(promoCodeId).populate('batch');
  if (!promoCode) {
    throw new Error('Promo code not found');
  }

  const batch = await PromoBatch.findById(promoCode.batch);
  if (!batch) {
    throw new Error('Promo batch missing');
  }

  const usageLimit = promoCode.usageLimit ?? 1;
  if (promoCode.usageCount >= usageLimit) {
    throw new Error('Promo usage limit reached');
  }

  const update: any = {
    $inc: { usageCount: 1 }
  };

  const newUsageCount = promoCode.usageCount + 1;
  if (newUsageCount >= usageLimit) {
    update.$set = { status: 'USED', usedAt: new Date() };
  } else {
    update.$set = { status: 'UNUSED', usedAt: new Date() };
  }

  if (batch.usageScope === 'PER_USER' && userId) {
    update.$addToSet = { usedBy: userId };
  }

  const result = await PromoCode.findOneAndUpdate(
    { _id: promoCodeId, usageCount: { $lt: usageLimit } },
    update,
    { new: true }
  );

  if (!result) {
    throw new Error('Failed to mark promo as used');
  }
}


