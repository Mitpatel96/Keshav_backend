import { Request, Response } from "express";
import axios from "axios";
import Vendor from "../models/Vendor";
import User from "../models/User";

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
        const { pincode, lat, lng } = req.body;
        let userLat: number;
        let userLng: number;

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

        const vendors = await Vendor.find({
            active: true,
            location: {
                $nearSphere: {
                    $geometry: { type: "Point", coordinates: [userLng, userLat] },
                    $maxDistance: 10000 // 10km in meters
                },
            },
        }).lean();

        return res.json({
            userLocation: { lat: userLat, lng: userLng },
            nearest: vendors,
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
        const { longitude, latitude } = req.body;

        if (longitude === undefined || latitude === undefined) {
            return res.status(400).json({ error: "longitude and latitude are required" });
        }

        const lng = parseFloat(longitude);
        const lat = parseFloat(latitude);

        if (isNaN(lng) || isNaN(lat)) {
            return res.status(400).json({ error: "Invalid longitude or latitude format" });
        }

        const user = await User.findByIdAndUpdate(
            userId,
            {
                location: {
                    type: "Point",
                    coordinates: [lng, lat]
                }
            },
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