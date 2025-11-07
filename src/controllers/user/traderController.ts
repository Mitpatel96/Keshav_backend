import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import Trader from '../../models/user/Trader';

export const createTrader = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { name } = req.body;

    if (!name) {
        res.status(400).json({ message: 'Name are required' });
        return;
    }

    const nameExist = await Trader.findOne({ name: name })
    if (nameExist) {
        res.status(400).json({ message: "Name already exist" })
        return
    }

    const trader = await Trader.create({ name });
    res.status(201).json(trader);
});

export const getTraders = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search as string;

    const filter: any = { isDeleted: false };

    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
        ];
    }

    const traders = await Trader.find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

    const totalCount = await Trader.countDocuments(filter);

    res.json({
        data: traders,
        pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit),
            totalCount,
            hasNextPage: page < Math.ceil(totalCount / limit),
            hasPrevPage: page > 1
        }
    });
});

export const getTraderById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const trader = await Trader.findOne({ _id: req.params.id, isDeleted: false });

    if (!trader) {
        res.status(404).json({ message: 'Trader not found' });
        return;
    }

    res.json(trader);
});

export const updateTrader = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { name, email, phone, address, city, state, pincode, gstNumber, active } = req.body;

    const trader = await Trader.findOne({ _id: req.params.id, isDeleted: false });

    if (!trader) {
        res.status(404).json({ message: 'Trader not found' });
        return;
    }

    trader.name = name ?? trader.name;
    trader.active = active ?? trader.active;

    await trader.save();

    res.json(trader);
});

export const deleteTrader = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const trader = await Trader.findOne({ _id: req.params.id, isDeleted: false });

    if (!trader) {
        res.status(404).json({ message: 'Trader not found' });
        return;
    }

    trader.isDeleted = true;
    trader.deletedAt = new Date();
    trader.active = false;
    await trader.save();

    res.json({ message: 'Trader deleted successfully' });
});
