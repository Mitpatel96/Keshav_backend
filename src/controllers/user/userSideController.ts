import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import Product from '../../models/Product';
import Category from '../../models/Category';

// Get Products by Category for User Side
export const getProductsByCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { categoryId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const categoryExists = await Category.findById(categoryId);
    if (!categoryExists) {
        res.status(404).json({ message: 'Category not found' });
        return;
    }

    const filter: any = { category: categoryId, active: true };

    const products = await Product.find(filter)
        .populate('category', 'name')
        .populate({
            path: 'skus.sku',
            populate: { path: 'category', select: 'name' }
        })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

    const totalCount = await Product.countDocuments(filter);

    res.json({
        category: categoryExists,
        data: products,
        pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit),
            totalCount,
            hasNextPage: page < Math.ceil(totalCount / limit),
            hasPrevPage: page > 1
        }
    });
});

// Get All Categories with Product Count
export const getCategoriesWithProductCount = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const categories = await Category.find();

    const categoriesWithCount = await Promise.all(
        categories.map(async (category) => {
            const productCount = await Product.countDocuments({
                category: category._id,
                active: true
            });
            return {
                _id: category._id,
                name: category.name,
                description: category.description,
                productCount
            };
        })
    );

    res.json(categoriesWithCount);
});
