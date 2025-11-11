import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import Product from '../../models/Product';
import Category from '../../models/Category';
import WebsiteSection from '../../models/user/WebsiteSection';
import { Types } from 'mongoose';

const ObjectId = Types.ObjectId;

// Get Products by Category for User Side
export const getProductsByCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { categoryId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const products = await WebsiteSection.aggregate([
        { $match: { categoryId: new ObjectId(categoryId), active: true } },
        {
            $lookup: {
                from: 'products',
                localField: 'product',
                foreignField: '_id',
                as: 'products'
            }
        },
        { $unwind: { path: "$products", preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: 'categories',
                localField: 'categoryId',
                foreignField: '_id',
                as: 'categoryId'
            }
        },
        { $unwind: { path: "$categoryId", preserveNullAndEmptyArrays: true } }
    ]);

    const totalCount = await WebsiteSection.countDocuments({ _id: new ObjectId(categoryId) });

    res.json({
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