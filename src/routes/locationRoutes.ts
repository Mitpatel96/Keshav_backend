import express from 'express';
import { getNearestVendors, getUsersByLocation, updateUserLocationByCoordinates } from '../controllers/locationController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Temporarily remove protect middleware for testing
router.post('/vendors/nearest', getNearestVendors);

router.put('/users/:userId/location', protect, updateUserLocationByCoordinates);
router.get('/nearby', protect, getUsersByLocation);

export default router;