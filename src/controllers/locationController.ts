import { Request, Response } from "express";
import axios from "axios";
import Vendor from "../models/Vendor";
import User from "../models/User";
import Sku from "../models/Sku";
import { Types } from "mongoose"

const ObjectId = Types.ObjectId;

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY!;

// Helper function — get lat/lng from pincode
async function getLatLngFromPincode(pincode: string) {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?components=postal_code:${pincode}|country:IN&key=${GOOGLE_API_KEY}`;
    const res = await axios.get(url);
    console.log("============>", res)
    if (!res.data.results?.length) throw new Error("Invalid pincode");

    const { lat, lng } = res.data.results[0].geometry.location;
    return { lat, lng };
}

// Get nearest vendors
export const getNearestVendors = async (req: Request, res: Response) => {
    try {
        const { pincode, lat, lng, skuIds } = req.body;
        let userLat: number;
        let userLng: number;

        const skuIdsArray = skuIds.map((skuId: string) => new ObjectId(skuId))
        const skuDocs = await Sku.find({ _id: { $in: skuIdsArray } });
        if (!skuDocs.length) throw new Error("Invalid skuIds");

        const skuMap = skuDocs.reduce((acc, sku) => {
            acc[sku._id.toString()] = sku.title;
            return acc;
        }, {} as Record<string, string>);

        if (lat && lng) {
            userLat = parseFloat(lat as string);
            userLng = parseFloat(lng as string);
        } else if (pincode) {
            const coords = await getLatLngFromPincode(pincode as string);
            console.log("coords==>", coords);
            userLat = coords.lat;
            userLng = coords.lng;
        } else {
            return res.status(400).json({ error: "pincode or lat/lng required" });
        }

        const vendors = await Vendor.aggregate([
            {
                $geoNear: {
                    near: { type: "Point", coordinates: [userLng, userLat] },
                    distanceField: "distance",
                    maxDistance: 10000,
                    spherical: true
                }
            },
            {
                $match: {
                    active: true
                }
            },
            {
                $lookup: {
                    from: "inventories",
                    localField: "_id",
                    foreignField: "vendor",
                    as: "inventoryDetails",
                    pipeline: [{
                        $match: {
                            sku: { $in: skuIdsArray },
                            quantity: { $gt: 0 },
                            status: 'confirmed'
                        }
                    }]
                }
            }
        ])

        const processedVendors = vendors.map(vendor => {
            const stockData = skuIdsArray.map(skuId => {
                const skuIdStr = skuId.toString();
                const inventoryItems = vendor.inventoryDetails.filter((item: any) =>
                    item.sku.toString() === skuIdStr
                );

                // Calculate available quantity considering reservations
                const totalQuantity = inventoryItems.reduce((sum: number, item: any) => {
                    const availableQty = item.quantity - (item.reservedQuantity || 0);
                    return sum + availableQty;
                }, 0);

                const isAvailable = totalQuantity > 0;

                return {
                    skuName: skuMap[skuIdStr] || "Unknown SKU",
                    quantity: totalQuantity,
                    available: isAvailable
                };
            });

            const isStockAvailable = stockData.every(item => item.available);
            const { inventoryDetails, distance, ...vendorInfo } = vendor;

            const limitedVendorInfo = {
                _id: vendorInfo._id,
                name: vendorInfo.name,
                phone: vendorInfo.phone,
                email: vendorInfo.email,
                address: vendorInfo.address,
                location: vendorInfo.location
            };

            return {
                ...limitedVendorInfo,
                stockData,
                isStockAvailable
            };
        });

        return res.json({
            userLocation: { lat: userLat, lng: userLng },
            nearest: processedVendors,
        });
    } catch (error: any) {
        console.error("Error finding nearest vendors:", error);
        res.status(500).json({ error: error.message || "Server error" });
    }
};

// Update user location by coordinates
export const updateUserLocationByCoordinates = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const { longitude, latitude, pincode } = req.body;

        const updateData: any = {};

        // If pincode is provided, only update pincode
        if (pincode !== undefined && pincode !== null) {
            updateData.pincode = pincode;
        }

        // If longitude and latitude are provided, only update location coordinates
        if (longitude !== undefined && latitude !== undefined) {
            const lng = parseFloat(longitude);
            const lat = parseFloat(latitude);

            if (isNaN(lng) || isNaN(lat)) {
                return res.status(400).json({ error: "Invalid longitude or latitude format" });
            }

            updateData.location = {
                type: "Point",
                coordinates: [lng, lat]
            };
        }

        // Check if at least one field is being updated
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: "Either pincode or longitude and latitude are required" });
        }

        const user = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, select: '-password' }
        );

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        return res.json({
            message: "User location updated successfully",
            user
        });
    } catch (error: any) {
        console.error("Error updating user location:", error.message);
        res.status(500).json({ error: error.message || "Server error" });
    }
};

// Get users by location
export const getUsersByLocation = async (req: Request, res: Response): Promise<void> => {
    const { longitude, latitude } = req.query;

    if (!longitude || !latitude) {
        res.status(400).json({ message: 'Longitude and latitude are required' });
        return;
    }

    const lng = parseFloat(longitude as string);
    const lat = parseFloat(latitude as string);

    if (isNaN(lng) || isNaN(lat)) {
        res.status(400).json({ message: 'Invalid longitude or latitude format' });
        return;
    }

    try {
        const users = await User.find({
            location: {
                $nearSphere: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [lng, lat]
                    },
                    $maxDistance: 10000
                }
            }
        }).select('-password');

        res.json({ users });
    } catch (error) {
        console.error('Error finding users by location:', error);
        res.status(500).json({ message: 'Internal server error while finding users by location' });
    }
};