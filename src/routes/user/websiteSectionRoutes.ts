import express from 'express';
import {
    createWebsiteSection,
    getWebsiteSections,
    getWebsiteSectionById,
    updateWebsiteSection,
    deleteWebsiteSection
} from '../../controllers/user/websiteSectionController';
import { protect, adminOnly } from '../../middleware/auth';

const router = express.Router();

router.post('/', protect, adminOnly, createWebsiteSection);
router.get('/', getWebsiteSections);
router.get('/:id', getWebsiteSectionById);
router.put('/:id', protect, adminOnly, updateWebsiteSection);
router.delete('/:id', protect, adminOnly, deleteWebsiteSection);

export default router;
