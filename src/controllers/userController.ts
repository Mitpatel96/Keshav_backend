import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import User from '../models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { generatePermanentId } from '../utils/idGenerator';

// REGISTER USER
export const registerUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name, email, phone, password, role } = req.body;

  if (!name || !email) {
    res.status(400).json({ message: 'Name and email required' });
    return;
  }

  const existing = await User.findOne({ email });
  if (existing) {
    res.status(400).json({ message: 'Email already used' });
    return;
  }

  const count = await User.countDocuments();
  const permanentId = generatePermanentId('U', count + 1);
  const hashed = password ? await bcrypt.hash(password, 10) : undefined;

  const user = await User.create({
    permanentId,
    name,
    email,
    phone,
    password: hashed,
    role: role || 'user',
  });

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET as any, { expiresIn: '7d' });
  res.status(201).json({ user, token });
});

// LOGIN USER
export const loginUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    res.status(401).json({ message: 'Invalid credentials' });
    return;
  }

  if (!user.password) {
    res.status(400).json({ message: 'No password set for this user' });
    return;
  }

  // TypeScript knows user.password is string here
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    res.status(401).json({ message: 'Invalid credentials' });
    return;
  }

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
  res.json({ user, token });
});

// GET ALL USERS
export const getUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const users = await User.find().select('-password');
  res.json(users);
});
