import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { FilterQuery, Types } from 'mongoose';
import XLSX from 'xlsx';
import PromoBatch, { IPromoBatch, PromoDiscountType, PromoUsageScope } from '../models/PromoBatch';
import PromoCode, { IPromoCode, PromoCodeStatus } from '../models/PromoCode';

interface AuthenticatedRequest<T = any> extends Request {
  user?: {
    _id: Types.ObjectId | string;
    role?: string;
    email?: string;
    name?: string;
  };
  body: T;
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
const BASE_INPUT_REGEX = /^[A-Z]+$/;

const randomLetter = () => LETTERS[Math.floor(Math.random() * LETTERS.length)];
const randomDigit = () => DIGITS[Math.floor(Math.random() * DIGITS.length)];
const shuffleArray = <T>(input: T[]): T[] => {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const buildPromoCode = (basePrefix: string) => {
  const digits = [randomDigit(), randomDigit()];
  const letters = [randomLetter(), randomLetter(), randomLetter()];
  const suffix = shuffleArray([...digits, ...letters]).join('');
  return `${basePrefix}${suffix}`;
};

const formatDescriptor = (baseLength: number) =>
  `Base length = ${baseLength} → ${baseLength} letters + 5 mixed (2 digits, 3 letters)`;

const parsePromoScope = (scope?: string): PromoUsageScope => {
  if (!scope) {
    return 'PER_USER';
  }
  const upper = scope.toUpperCase();
  if (upper === 'GLOBAL') return 'GLOBAL';
  return 'PER_USER';
};

const parseDiscountType = (type?: string): PromoDiscountType => {
  if (!type) return 'FLAT';
  const upper = type.toUpperCase();
  return upper === 'PERCENTAGE' ? 'PERCENTAGE' : 'FLAT';
};

const ensureObjectIdArray = (ids: string[]): Types.ObjectId[] => {
  if (!Array.isArray(ids)) {
    return [];
  }
  return ids
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id));
};

const normalizeBaseInput = (baseInput: string): string => {
  const trimmed = (baseInput || '').trim().toUpperCase();
  if (!BASE_INPUT_REGEX.test(trimmed)) {
    throw new Error('Base input must contain letters only (A-Z)');
  }
  return trimmed;
};

const ensureDateOrder = (startDate: Date, endDate: Date) => {
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new Error('startDate and endDate must be valid ISO date strings');
  }
  if (startDate >= endDate) {
    throw new Error('startDate must be earlier than endDate');
  }
};

const generateUniqueCodes = async (basePrefix: string, count: number): Promise<string[]> => {
  const codes = new Set<string>();
  const MAX_ATTEMPTS = count * 50;
  let attempts = 0;

  while (codes.size < count) {
    if (attempts >= MAX_ATTEMPTS) {
      throw new Error('Unable to generate unique promo codes. Please try again.');
    }
    const candidate = buildPromoCode(basePrefix);
    attempts += 1;

    if (codes.has(candidate)) {
      continue;
    }

    const exists = await PromoCode.exists({ code: candidate });
    if (exists) {
      continue;
    }

    codes.add(candidate);
  }

  return Array.from(codes);
};

export const createPromoBatch = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const {
      title,
      baseInput,
      count,
      discountValue,
      startDate,
      endDate,
      products,
      usageScope,
      discountType
    } = req.body;

    if (!title || typeof title !== 'string') {
      res.status(400).json({ message: 'Promo Title is required' });
      return;
    }

    const normalizedBase = normalizeBaseInput(baseInput);
    const baseLength = normalizedBase.length;

    const numericCount = Number(count);
    if (!Number.isInteger(numericCount) || numericCount <= 0) {
      res.status(400).json({ message: 'Count must be a positive integer' });
      return;
    }

    const parsedDiscount = Number(discountValue);
    if (Number.isNaN(parsedDiscount) || parsedDiscount <= 0) {
      res.status(400).json({ message: 'Discount value must be a positive number' });
      return;
    }

    const discountKind = parseDiscountType(discountType);
    const scope = parsePromoScope(usageScope);

    const start = new Date(startDate);
    const end = new Date(endDate);

    try {
      ensureDateOrder(start, end);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
      return;
    }

    const productIds = ensureObjectIdArray(Array.isArray(products) ? products : []);
    if (productIds.length === 0) {
      res.status(400).json({ message: 'At least one product is required' });
      return;
    }

    const basePrefix = normalizedBase;
    const codesToGenerate = scope === 'PER_USER' ? 1 : numericCount;
    const codes = await generateUniqueCodes(basePrefix, codesToGenerate);

    const batch = await PromoBatch.create({
      title: title.trim(),
      baseInput: normalizedBase,
      baseLength,
      usageScope: scope,
      count: numericCount,
      discountType: discountKind,
      discountValue: parsedDiscount,
      startDate: start,
      endDate: end,
      products: productIds,
      createdBy: req.user?._id
    });

    const usageLimitPerCode = scope === 'PER_USER' ? numericCount : 1;

    const codeDocuments = codes.map((code) => ({
      batch: batch._id,
      code,
      usageLimit: usageLimitPerCode
    }));

    await PromoCode.insertMany(codeDocuments);

    res.status(201).json({
      batch,
      codes,
      format: formatDescriptor(baseLength),
      usageLimitPerCode
    });
  }
);

export const listPromoBatches = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
  const limit = Number(req.query.limit) > 0 ? Number(req.query.limit) : 20;
  const skip = (page - 1) * limit;

  const { search, status, scope } = req.query;

  const filter: FilterQuery<IPromoBatch> = {};

  if (search && typeof search === 'string') {
    filter.title = { $regex: search.trim(), $options: 'i' };
  }

  if (status && typeof status === 'string') {
    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;
  }

  if (scope && typeof scope === 'string') {
    filter.usageScope = parsePromoScope(scope);
  }

  const [items, total] = await Promise.all([
    PromoBatch.find(filter)
      .populate('products', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    PromoBatch.countDocuments(filter)
  ]);

  const batchIds = items.map((item) => item._id);

  const stats: Array<{
    _id: Types.ObjectId;
    totalCodes: number;
    totalUsageLimit: number;
    totalUsageCount: number;
    fullyUsedCodes: number;
    activeCodes: number;
  }> =
    batchIds.length === 0
      ? []
      : await PromoCode.aggregate([
        { $match: { batch: { $in: batchIds } } },
        {
          $group: {
            _id: '$batch',
            totalCodes: { $sum: 1 },
            totalUsageLimit: {
              $sum: {
                $ifNull: ['$usageLimit', 1]
              }
            },
            totalUsageCount: {
              $sum: {
                $ifNull: ['$usageCount', 0]
              }
            },
            fullyUsedCodes: {
              $sum: {
                $cond: [{ $eq: ['$status', 'USED'] }, 1, 0]
              }
            },
            activeCodes: {
              $sum: {
                $cond: [
                  {
                    $eq: ['$status', 'UNUSED']
                  },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]);

  const statsMap = new Map<
    string,
    {
      totalCodes: number;
      totalUsageLimit: number;
      totalUsageCount: number;
      fullyUsedCodes: number;
      activeCodes: number;
    }
  >();
  stats.forEach((entry) => {
    statsMap.set(entry._id.toString(), {
      totalCodes: entry.totalCodes,
      totalUsageLimit: entry.totalUsageLimit,
      totalUsageCount: entry.totalUsageCount,
      fullyUsedCodes: entry.fullyUsedCodes,
      activeCodes: entry.activeCodes
    });
  });

  const data = items.map((item) => {
    const stat =
      statsMap.get(item._id.toString()) || {
        totalCodes: 0,
        totalUsageLimit: 0,
        totalUsageCount: 0,
        fullyUsedCodes: 0,
        activeCodes: 0
      };
    return {
      ...item,
      format: formatDescriptor(item.baseLength),
      stats: {
        ...stat,
        remainingUsage: Math.max(0, stat.totalUsageLimit - stat.totalUsageCount)
      },
      products: Array.isArray(item.products)
        ? item.products.map((product: any) => ({
          _id: product?._id?.toString?.() || product?._id || product,
          title: product?.title || ''
        }))
        : []
    };
  });

  res.json({
    data,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalCount: total,
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1
    }
  });
});

export const getPromoBatchById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) {
    res.status(400).json({ message: 'Invalid batch id' });
    return;
  }

  const batch = await PromoBatch.findById(id).populate('products', 'title');

  if (!batch) {
    res.status(404).json({ message: 'Promo batch not found' });
    return;
  }

  const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
  const limit = Number(req.query.limit) > 0 ? Number(req.query.limit) : 50;
  const skip = (page - 1) * limit;

  const codeStatus = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : undefined;

  const codeFilter: FilterQuery<IPromoCode> = { batch: batch._id };
  if (codeStatus && ['UNUSED', 'USED', 'EXPIRED', 'DEACTIVATED'].includes(codeStatus)) {
    codeFilter.status = codeStatus as PromoCodeStatus;
  }

  const [codes, totalCodes] = await Promise.all([
    PromoCode.find(codeFilter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    PromoCode.countDocuments(codeFilter)
  ]);

  res.json({
    batch,
    codes,
    format: formatDescriptor(batch.baseLength),
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalCodes / limit),
      totalCount: totalCodes,
      hasNextPage: page < Math.ceil(totalCodes / limit),
      hasPrevPage: page > 1
    }
  });
});

export const deactivatePromoBatch = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) {
    res.status(400).json({ message: 'Invalid batch id' });
    return;
  }

  const batch = await PromoBatch.findById(id);
  if (!batch) {
    res.status(404).json({ message: 'Promo batch not found' });
    return;
  }

  if (!batch.isActive) {
    res.json({ message: 'Promo batch already inactive', batch });
    return;
  }

  batch.isActive = false;
  await batch.save();

  await PromoCode.updateMany(
    { batch: batch._id, status: { $in: ['UNUSED'] } },
    { $set: { status: 'DEACTIVATED' as PromoCodeStatus } }
  );

  res.json({ message: 'Promo batch deactivated successfully', batch });
});

export const redeemPromoCode = asyncHandler(
  async (req: AuthenticatedRequest<{ code: string; productIds?: string[] }>, res: Response): Promise<void> => {
    const { code, productIds } = req.body;
    if (!code || typeof code !== 'string') {
      res.status(400).json({ message: 'Code is required' });
      return;
    }

    const normalizedCode = code.trim().toUpperCase();

    const promoCode = await PromoCode.findOne({ code: normalizedCode }).populate<{
      batch: IPromoBatch;
    }>('batch');

    if (!promoCode) {
      res.status(404).json({ message: 'Promo code not found' });
      return;
    }

    const batch = promoCode.batch;
    const now = new Date();

    if (!batch.isActive) {
      res.status(400).json({ message: 'Promo is not active' });
      return;
    }

    if (now < batch.startDate) {
      res.status(400).json({ message: 'Promo not active yet' });
      return;
    }

    if (now > batch.endDate) {
      if (promoCode.status === 'UNUSED') {
        promoCode.status = 'EXPIRED';
        await promoCode.save();
      }
      res.status(400).json({ message: 'Promo expired' });
      return;
    }

    const usageLimit = promoCode.usageLimit ?? 1;
    if (promoCode.status === 'USED' || promoCode.usageCount >= usageLimit) {
      res.status(400).json({ message: 'Promo usage limit reached' });
      return;
    }

    if (promoCode.status === 'DEACTIVATED') {
      res.status(400).json({ message: 'Promo deactivated' });
      return;
    }

    const requestedProductIds = ensureObjectIdArray(Array.isArray(productIds) ? productIds : []);
    if (requestedProductIds.length > 0) {
      const batchProductSet = new Set(batch.products.map((id) => id.toString()));
      const intersects = requestedProductIds.some((id) => batchProductSet.has(id.toString()));
      if (!intersects) {
        res.status(400).json({ message: 'Promo not applicable on selected products' });
        return;
      }
    }

    if (batch.usageScope === 'PER_USER') {
      if (!req.user?._id) {
        res.status(401).json({ message: 'Authentication required for this promo' });
        return;
      }

      const userIdentifier =
        typeof req.user._id === 'string'
          ? new Types.ObjectId(req.user._id)
          : (req.user._id as Types.ObjectId);

      const alreadyRedeemed =
        Array.isArray(promoCode.usedBy) &&
        promoCode.usedBy.some((id) => id.toString() === userIdentifier.toString());
      if (alreadyRedeemed) {
        res.status(400).json({ message: 'Promo already redeemed by the current user' });
        return;
      }

      promoCode.usedBy = Array.isArray(promoCode.usedBy) ? promoCode.usedBy : [];
      promoCode.usedBy.push(userIdentifier);
    } else if (req.user?._id) {
      const userIdentifier =
        typeof req.user._id === 'string'
          ? new Types.ObjectId(req.user._id)
          : (req.user._id as Types.ObjectId);
      promoCode.usedBy = [userIdentifier];
    }

    promoCode.usageCount = (promoCode.usageCount || 0) + 1;
    const hasHitLimit = promoCode.usageCount >= usageLimit;
    if (hasHitLimit) {
      promoCode.status = 'USED';
    } else if (promoCode.status !== 'UNUSED') {
      promoCode.status = 'UNUSED';
    }
    promoCode.usedAt = now;
    await promoCode.save();

    res.json({
      message: 'Promo applied successfully',
      code: promoCode.code,
      discountType: batch.discountType,
      discountValue: batch.discountValue,
      title: batch.title,
      usageScope: batch.usageScope,
      usage: {
        count: promoCode.usageCount,
        limit: promoCode.usageLimit
      },
      validity: {
        startDate: batch.startDate,
        endDate: batch.endDate
      },
      products: batch.products
    });
  }
);

// not using
export const exportPromoBatch = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) {
    res.status(400).json({ message: 'Invalid batch id' });
    return;
  }

  const batch = await PromoBatch.findById(id).populate('products', 'title');
  if (!batch) {
    res.status(404).json({ message: 'Promo batch not found' });
    return;
  }

  const codes = (await PromoCode.find({ batch: batch._id })
    .populate('usedBy', 'email name')
    .lean()) as Array<{
      code: string;
      status: PromoCodeStatus;
      usedBy?: Array<Types.ObjectId | { _id?: Types.ObjectId | string; email?: string; name?: string }>;
      usedAt?: Date;
      usageLimit: number;
      usageCount: number;
    }>;

  const productsDisplay =
    Array.isArray(batch.products) && batch.products.length > 0
      ? batch.products
        .map((product: any) => (product?.title ? product.title : product?.toString() || ''))
        .filter(Boolean)
        .join(', ')
      : '';

  const rows = codes.map((entry) => ({
    Code: entry.code,
    Title: batch.title,
    BaseLength: batch.baseLength,
    Status: entry.status,
    UsageCount: entry.usageCount,
    UsageLimit: entry.usageLimit,
    RemainingUsage: Math.max(0, entry.usageLimit - entry.usageCount),
    UsedBy: (() => {
      const usedBy = entry.usedBy;
      if (!Array.isArray(usedBy) || usedBy.length === 0) return '';
      const stringify = (value: Types.ObjectId | { _id?: Types.ObjectId | string; email?: string; name?: string }) => {
        if (typeof value === 'object' && value !== null && !('toHexString' in (value as any))) {
          const email = (value as any).email;
          const name = (value as any).name;
          const id = (value as any)._id;
          return email || name || (typeof id === 'string' ? id : id?.toString() || '');
        }
        if (typeof value === 'object' && value !== null && 'toHexString' in (value as any)) {
          return (value as Types.ObjectId).toHexString();
        }
        return '';
      };
      return usedBy.map((item) => stringify(item)).filter(Boolean).join(', ');
    })(),
    LastUsedAt: entry.usedAt ? entry.usedAt.toISOString() : '',
    Products: productsDisplay
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Promo Codes');
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  const safeTitle = batch.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=${safeTitle || 'promo_codes'}_${batch._id.toString()}.xlsx`
  );
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.send(buffer);
});