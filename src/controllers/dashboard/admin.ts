import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { Types } from 'mongoose';
import Inventory from '../../models/Inventory';
import InventoryHistory from '../../models/InventoryHistory';
import Sku from '../../models/Sku';
import Product from '../../models/Product';

interface AuthenticatedRequest extends Request {
    user?: {
        _id: Types.ObjectId | string;
        role?: string;
    };
}

// Helper function to get financial year dates (Apr 01 to Mar 31)
const getFinancialYearDates = (): { startDate: Date; endDate: Date } => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11 (Jan = 0, Apr = 3)

    let startYear: number;
    let endYear: number;

    // If current month is Jan-Mar (0-2), financial year started in previous year
    if (currentMonth < 3) {
        startYear = currentYear - 1;
        endYear = currentYear;
    } else {
        startYear = currentYear;
        endYear = currentYear + 1;
    }

    const startDate = new Date(startYear, 3, 1); // April 1
    const endDate = new Date(endYear, 2, 31, 23, 59, 59, 999); // March 31

    return { startDate, endDate };
};

// GET ADMIN DASHBOARD - Inventory Statistics
export const getProductSalesList = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const adminUser = req.user;

        if (!adminUser || adminUser.role !== 'admin') {
            res.status(403).json({ message: 'Access denied. Admin access only.' });
            return;
        }

        const adminId = new Types.ObjectId(adminUser._id);
        const { startDate, endDate } = getFinancialYearDates();

        try {
            // Get all SKUs with their products
            const skus = await Sku.find({ active: true }).lean();

            // Get all products to map SKUs to products
            const products = await Product.find({ active: true })
                .populate('skus.sku')
                .lean();

            // Create a map of SKU ID to Product
            const skuToProductMap = new Map<string, any>();
            products.forEach((product) => {
                product.skus.forEach((skuEntry: any) => {
                    const skuId = skuEntry.sku?._id?.toString() || skuEntry.sku?.toString();
                    if (skuId) {
                        skuToProductMap.set(skuId, product);
                    }
                });
            });

            // Get all inventory records for this admin
            const adminInventories = await Inventory.find({
                admin: adminId
            }).lean();

            // Get all inventory history records for calculations
            const allHistoryRecords = await InventoryHistory.find({
                $or: [
                    { fromAdmin: adminId },
                    { toVendor: { $exists: true } },
                    { type: 'deduct_from_order' }
                ]
            }).lean();

            const dashboardData = [];

            for (const sku of skus) {
                const skuId = sku._id.toString();
                const product = skuToProductMap.get(skuId);

                // Skip if SKU is not associated with any product
                if (!product) continue;

                // 1. In house stock - Admin inventory where vendor is null
                const inHouseStock = adminInventories
                    .filter((inv) => inv.sku.toString() === skuId && !inv.vendor)
                    .reduce((sum, inv) => sum + (inv.quantity || 0), 0);

                // 2. Total Stock-out (warehouse) - Stock transferred from admin to vendor
                // Count transfer_accepted records where fromAdmin matches (within financial year)
                const stockOut = allHistoryRecords
                    .filter((hist: any) => {
                        const histDate = new Date(hist.createdAt || hist.updatedAt || Date.now());
                        return (
                            hist.sku.toString() === skuId &&
                            hist.type === 'transfer_accepted' &&
                            hist.fromAdmin?.toString() === adminId.toString() &&
                            hist.toVendor &&
                            histDate >= startDate &&
                            histDate <= endDate
                        );
                    })
                    .reduce((sum, hist) => sum + (hist.quantity || 0), 0);

                // 3. Live stock - Total stock at all vendors for this SKU
                const liveStock = await Inventory.aggregate([
                    {
                        $match: {
                            sku: new Types.ObjectId(skuId),
                            vendor: { $ne: null }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: '$quantity' }
                        }
                    }
                ]);
                const liveStockTotal = liveStock.length > 0 ? liveStock[0].total : 0;

                // 4. Stock-sell - Total sold stock (deduct_from_order)
                const stockSell = allHistoryRecords
                    .filter(
                        (hist) =>
                            hist.sku.toString() === skuId &&
                            hist.type === 'deduct_from_order'
                    )
                    .reduce((sum, hist) => sum + (hist.quantity || 0), 0);

                // 5. Damage - Only Admin damage (deduct_damage and deduct_lost where fromAdmin exists)
                // Filter by financial year
                const damage = allHistoryRecords
                    .filter((hist: any) => {
                        const histDate = new Date(hist.createdAt || hist.updatedAt || Date.now());
                        return (
                            hist.sku.toString() === skuId &&
                            (hist.type === 'deduct_damage' || hist.type === 'deduct_lost') &&
                            hist.fromAdmin?.toString() === adminId.toString() &&
                            histDate >= startDate &&
                            histDate <= endDate
                        );
                    })
                    .reduce((sum, hist) => sum + (hist.quantity || 0), 0);

                // 6. Total In-stock - Apr 01 to Mar 31 stock only
                // Calculate from inventory additions during financial year
                // For now, we'll use: current in-house stock + stock-out + damage (all within financial year)
                // This represents all stock that was available during the financial year
                const totalInStock = inHouseStock + stockOut + damage;

                dashboardData.push({
                    skuId: sku._id,
                    productName: product.title || 'N/A',
                    skuName: sku.title || 'N/A',
                    totalInStock: totalInStock,
                    inHouseStock: inHouseStock,
                    totalStockOut: stockOut,
                    liveStock: liveStockTotal,
                    stockSell: stockSell,
                    damage: damage
                });
            }

            res.json({
                success: true,
                financialYear: {
                    start: startDate,
                    end: endDate
                },
                data: dashboardData,
                summary: {
                    totalSkus: dashboardData.length,
                    totalInStock: dashboardData.reduce((sum, item) => sum + item.totalInStock, 0),
                    totalInHouseStock: dashboardData.reduce((sum, item) => sum + item.inHouseStock, 0),
                    totalStockOut: dashboardData.reduce((sum, item) => sum + item.totalStockOut, 0),
                    totalLiveStock: dashboardData.reduce((sum, item) => sum + item.liveStock, 0),
                    totalStockSell: dashboardData.reduce((sum, item) => sum + item.stockSell, 0),
                    totalDamage: dashboardData.reduce((sum, item) => sum + item.damage, 0)
                }
            });
        } catch (error: any) {
            console.error('Error fetching admin dashboard:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while fetching dashboard data',
                error: error.message
            });
        }
    }
);

