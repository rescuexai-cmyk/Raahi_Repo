import express, { Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = express.Router();

// Placeholder user routes
router.get('/profile', authenticate, asyncHandler(async (req: Request, res: Response) => {
  res.json({ message: 'User profile endpoint' });
}));

export default router;
