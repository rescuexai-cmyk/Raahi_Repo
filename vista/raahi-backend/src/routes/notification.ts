import express, { Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = express.Router();

// Placeholder notification routes
router.get('/', authenticate, asyncHandler(async (req: Request, res: Response) => {
  res.json({ message: 'Notifications endpoint' });
}));

export default router;
