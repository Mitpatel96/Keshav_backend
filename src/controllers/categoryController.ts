import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import Category from '../models/category';

export const addCategory = asyncHandler(async (req: Request, res: Response): Promise<any> => {
    const { name, description } = req.body;
    const findCategoryName = await Category.findOne({ name });
    if (findCategoryName) return res.status(400).json({ message: "Category already exists" });

    const category = await Category.create({ name, description });
    res.status(201).json(category);
});

export const getCategory = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    try {
        const categories = await Category.find()
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        const totalCount = await Category.countDocuments();

        res.json({
            data: categories,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalCount / limit),
                totalCount,
                hasNextPage: page < Math.ceil(totalCount / limit),
                hasPrevPage: page > 1
            }
        });
    } catch (error) {
        console.error('Error fetching SKUs:', error);
        res.status(500).json({ message: 'Internal server error while fetching SKUs' });
    }
});