import express from 'express';
import { registerUser, loginUser, getUsers } from '../controllers/userController';
import { protect, adminOnly } from '../middleware/auth';
const router = express.Router();
router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/', protect, adminOnly, getUsers);
export default router;
