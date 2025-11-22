import express from 'express';
import { adminOnly, protect } from '../middleware/auth';
import {
  addOrUpdateVendorWarehouseTiming,
  getWarehouseTimings,
} from '../controllers/warehouseTimingController';

const router = express.Router();

router.post('/', protect, addOrUpdateVendorWarehouseTiming);
router.get('/vendor/:vendorId', getWarehouseTimings);

export default router;

