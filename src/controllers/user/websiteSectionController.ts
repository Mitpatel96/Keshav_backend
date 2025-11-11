import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import WebsiteSection from '../../models/user/WebsiteSection';
import Trader from '../../models/user/Trader';
import Product from '../../models/Product';
import Category from '../../models/Category';

// Create Website Section
export const createWebsiteSection = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { sectionType, title, trader, product, categoryId, images, order, isNeedToShowTree, tags } = req.body;

    // const isSectionTypeExist = await WebsiteSection.findOne({ sectionType: sectionType, active: true, isDeleted: false });
    // if (isSectionTypeExist) {
    //     res.status(404).json({ message: 'Section type already exist' });
    //     return;
    // }

    if (!sectionType) {
        res.status(400).json({ message: 'Section type is required' });
        return;
    }

    if (sectionType === 'HERO_PRODUCT') {
        if (!trader || !product) {
            res.status(400).json({ message: 'Trader and Product are required for HERO_PRODUCT section' });
            return;
        }
        const traderExists = await Trader.findOne({ _id: trader, isDeleted: false });
        const productExists = await Product.findById(product);
        if (!traderExists || !productExists) {
            res.status(404).json({ message: 'Trader or Product not found' });
            return;
        }
    }

    if (sectionType === 'PRODUCT_DETAIL') {
        if (!product || !trader) {
            res.status(400).json({ message: 'Product, Trader is required for PRODUCT_DETAIL section' });
            return;
        }
        const productExists = await Product.findById(product);
        if (!productExists) {
            res.status(404).json({ message: 'Product not found' });
            return;
        }
    }

    if (sectionType === 'SELECT_CATEGORY') {
        if (!trader || !title || !images || images.length === 0) {
            res.status(400).json({ message: 'Trader, title, and images are required for SELECT_CATEGORY section' });
            return;
        }
        const traderExists = await Trader.findOne({ _id: trader, isDeleted: false });
        if (!traderExists) {
            res.status(404).json({ message: 'Trader not found' });
            return;
        }
    }

    if (sectionType === 'HERO_IMAGE') {
        if (!trader || !images || images.length === 0) {
            res.status(400).json({ message: 'Images and trader are required for HERO_IMAGE section' });
            return;
        }
    }

    if (sectionType === 'SHOP_BY_CATEGORY') {
        if (!trader || !product || !categoryId) {
            res.status(400).json({ message: 'categoryId, product or trader are required for SHOP_BY_CATEGORY section' });
            return;
        }
    }

    if (sectionType === 'BUSINESS_GALLERY') {
        if (!trader || !images || images.length === 0) {
            res.status(400).json({ message: 'Images or trader are required for BUSINESS_GALLERY section' });
            return;
        }
    }

    if (sectionType === 'HASHTAG_SECTION') {
        if (!trader || !images || images.length === 0) {
            res.status(400).json({ message: 'Images or trader are required for HASHTAG_SECTION' });
            return;
        }
    }

    const section = await WebsiteSection.create({
        sectionType,
        title,
        trader,
        product,
        categoryId,
        images,
        isNeedToShowTree: isNeedToShowTree ?? false,
        tags: tags || [],
        order: order || 0
    });

    const populatedSection = await WebsiteSection.findById(section._id)
        .populate('trader', 'name phone email')
        .populate('product', 'title price images strikeThroughPrice description')
        .populate('categoryId', 'name');

    res.status(201).json(populatedSection);
});

// Get All Website Sections (excluding soft deleted)
export const getWebsiteSections = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const sectionType = req.query.sectionType as string;
    const trader = req.query.trader as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const filter: any = { isDeleted: false };

    if (sectionType) {
        filter.sectionType = sectionType;
    }

    if (trader) {
        filter.trader = trader;
    }

    const sections = await WebsiteSection.find(filter)
        .populate('trader', 'name phone email')
        .populate('product', 'title price images strikeThroughPrice description')
        .populate('categoryId', 'name')
        .skip(skip)
        .limit(limit)
        .sort({ order: 1, createdAt: -1 });

    const totalCount = await WebsiteSection.countDocuments(filter);

    res.json({
        data: sections,
        pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit),
            totalCount,
            hasNextPage: page < Math.ceil(totalCount / limit),
            hasPrevPage: page > 1
        }
    });
});

// Get Website Section by ID
export const getWebsiteSectionById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const section = await WebsiteSection.findOne({ _id: req.params.id, isDeleted: false })
        .populate('trader', 'name phone email')
        .populate('product', 'title price images')
        .populate('categoryId', 'name');

    if (!section) {
        res.status(404).json({ message: 'Website section not found' });
        return;
    }

    res.json(section);
});

// Update Website Section
export const updateWebsiteSection = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { title, trader, product, categoryId, images, order, active, isNeedToShowTree, tags } = req.body;

    const section: any = await WebsiteSection.findOne({ _id: req.params.id, isDeleted: false });

    if (!section) {
        res.status(404).json({ message: 'Website section not found' });
        return;
    }

    if (trader) {
        const traderExists = await Trader.findOne({ _id: trader, isDeleted: false });
        if (!traderExists) {
            res.status(404).json({ message: 'Trader not found' });
            return;
        }
    }

    if (product) {
        const productExists = await Product.findById(product);
        if (!productExists) {
            res.status(404).json({ message: 'Product not found' });
            return;
        }
    }



    section.title = title ?? section.title;
    section.trader = trader ?? section.trader;
    section.product = product ?? section.product;
    section.categoryId = categoryId ?? section.categoryId;
    section.images = images ?? section.images;
    section.isNeedToShowTree = isNeedToShowTree ?? section.isNeedToShowTree;
    section.tags = tags ?? section.tags;
    section.order = order ?? section.order;
    section.active = active ?? section.active;

    await section.save();

    const updatedSection = await WebsiteSection.findById(section._id)
        .populate('trader', 'name phone email')
        .populate('product', 'title price images')
        .populate('categoryId', 'name');

    res.json(updatedSection);
});

// Soft Delete Website Section
export const deleteWebsiteSection = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const section = await WebsiteSection.findOne({ _id: req.params.id, isDeleted: false });

    if (!section) {
        res.status(404).json({ message: 'Website section not found' });
        return;
    }

    section.isDeleted = true;
    section.deletedAt = new Date();
    section.active = false;
    await section.save();

    res.json({ message: 'Website section deleted successfully' });
});
