import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import Product from '../models/Product';
import Sku from '../models/Sku';

// Helper function to format unit display
const formatUnitDisplay = (unitValue: number | undefined, unit: string | undefined): string => {
    if (!unitValue || !unit) return '';

    // Convert to standard format
    if (unit.toLowerCase() === 'litre' || unit.toLowerCase() === 'liter') {
        if (unitValue >= 1000) {
            return `${unitValue / 1000}L`;
        }
        return `${unitValue}ml`;
    }

    return `${unitValue}${unit}`;
};

// if isCombo : false then - price should come sku'sId mrp  otherwise there should be a text field
export const createProduct = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { title, description, isCombo, skus, price, images, strikeThroughPrice } = req.body;

    for (const item of skus) {
        const sku = await Sku.findById(item.sku);
        if (!sku) {
            res.status(404).json({ message: `SKU with id ${item.sku} not found` });
            return;
        }
    }

    const product = await Product.create({
        title,
        description,
        isCombo,
        skus,
        price,
        images: images ?? [],
        strikeThroughPrice
    });

    const populatedProduct = await Product.findById(product._id)
        .populate({
            path: 'skus.sku',
            populate: { path: 'category', select: 'name' }
        });

    res.status(201).json(populatedProduct);
});

export const getProducts = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const isCombo = req.query.isCombo;

    try {
        const filter: any = {};
        if (isCombo !== undefined) {
            filter.isCombo = isCombo === 'true';
        }
        const products = await Product.find(filter)
            .populate({
                path: 'skus.sku',
                populate: { path: 'category', select: 'name' }
            })
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        // Transform products for frontend - add variants array for solo products
        const transformedProducts = products.map((product: any) => {
            const productObj = product.toObject();

            // If product is NOT a combo and has multiple SKUs, create variants array
            if (!product.isCombo && product.skus && product.skus.length > 0) {
                productObj.variants = product.skus.map((skuEntry: any, index: number) => {
                    const sku = skuEntry.sku;
                    const display = formatUnitDisplay(sku.unitValue, sku.unit) || sku.title;

                    return {
                        index,
                        skuId: sku._id.toString(),
                        display,
                        unit: sku.unit || '',
                        unitValue: sku.unitValue || 0,
                        price: sku.mrp || 0,
                        title: sku.title
                    };
                });
            }

            return productObj;
        });

        const totalCount = await Product.countDocuments(filter);

        res.json({
            data: transformedProducts,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalCount / limit),
                totalCount,
                hasNextPage: page < Math.ceil(totalCount / limit),
                hasPrevPage: page > 1
            }
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ message: 'Internal server error while fetching products' });
    }
});

export const getProductById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const product = await Product.findById(req.params.id)
        .populate({
            path: 'skus.sku',
            populate: { path: 'category', select: 'name' }
        });

    if (!product) {
        res.status(404).json({ message: 'Product not found' });
        return;
    }

    // Transform product for frontend - add variants array for solo products
    const productObj: any = product.toObject();

    // If product is NOT a combo and has multiple SKUs, create variants array
    if (!product.isCombo && product.skus && product.skus.length > 0) {
        productObj.variants = product.skus.map((skuEntry: any, index: number) => {
            const sku = skuEntry.sku;
            const display = formatUnitDisplay(sku.unitValue, sku.unit) || sku.title;

            return {
                index,
                skuId: sku._id.toString(),
                display,
                unit: sku.unit || '',
                unitValue: sku.unitValue || 0,
                price: sku.mrp || 0,
                title: sku.title
            };
        });
    }

    res.json(productObj);
});

export const updateProduct = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { title, description, isCombo, skus, price, active, images, strikeThroughPrice } = req.body;

    const product: any = await Product.findById(req.params.id);
    if (!product) {
        res.status(404).json({ message: 'Product not found' });
        return;
    }

    if (skus) {
        for (const item of skus) {
            const sku = await Sku.findById(item.sku);
            if (!sku) {
                res.status(404).json({ message: `SKU with id ${item.sku} not found` });
                return;
            }
        }
    }

    product.title = title ?? product.title;
    product.description = description ?? product.description;
    product.isCombo = isCombo ?? product.isCombo;
    product.skus = skus ?? product.skus;
    product.price = price ?? product.price;
    product.images = images ?? product.images;
    product.active = active ?? product.active;
    product.strikeThroughPrice = strikeThroughPrice ?? product.strikeThroughPrice;

    await product.save();

    const updatedProduct = await Product.findById(product._id)
        .populate({
            path: 'skus.sku',
            populate: { path: 'category', select: 'name' }
        });

    res.json(updatedProduct);
});

export const deleteProduct = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const product = await Product.findById(req.params.id);

    if (!product) {
        res.status(404).json({ message: 'Product not found' });
        return;
    }

    product.active = false;
    await product.save();

    res.json({ message: 'Product deleted successfully' });
});
