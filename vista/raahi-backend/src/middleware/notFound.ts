import { Request, Response } from 'express';
import { logger } from '../utils/logger';

export const notFound = (req: Request, res: Response): void => {
  logger.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
};
