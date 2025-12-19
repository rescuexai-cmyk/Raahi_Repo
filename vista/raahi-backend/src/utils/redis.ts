import { createClient, RedisClientType } from 'redis';
import { logger } from './logger';

let redisClient: RedisClientType | null = null;

export const connectRedis = async (): Promise<void> => {
  // Skip Redis connection in development if not available
  if (process.env.NODE_ENV === 'development' && !process.env.REDIS_URL) {
    logger.info('Redis connection skipped in development mode');
    return;
  }

  // Only attempt Redis connection if explicitly configured
  if (!process.env.REDIS_URL) {
    logger.info('No Redis URL configured, skipping Redis connection');
    return;
  }

  try {
    redisClient = createClient({
      url: process.env.REDIS_URL
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis Client Connected');
    });

    await redisClient.connect();
  } catch (error) {
    logger.error('Redis connection failed:', error);
    if (process.env.NODE_ENV === 'development') {
      logger.info('Continuing without Redis in development mode');
      redisClient = null;
    } else {
      throw error;
    }
  }
};

export const getRedisClient = (): RedisClientType | null => {
  return redisClient;
};

export const setCache = async (key: string, value: any, ttl: number = 3600): Promise<void> => {
  try {
    const client = getRedisClient();
    if (!client) {
      logger.info('Redis not available, skipping cache set');
      return;
    }
    await client.setEx(key, ttl, JSON.stringify(value));
  } catch (error) {
    logger.error('Redis set error:', error);
  }
};

export const getCache = async (key: string): Promise<any> => {
  try {
    const client = getRedisClient();
    if (!client) {
      logger.info('Redis not available, returning null from cache');
      return null;
    }
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    logger.error('Redis get error:', error);
    return null;
  }
};

export const deleteCache = async (key: string): Promise<void> => {
  try {
    const client = getRedisClient();
    if (!client) {
      logger.info('Redis not available, skipping cache delete');
      return;
    }
    await client.del(key);
  } catch (error) {
    logger.error('Redis delete error:', error);
  }
};

export const clearPattern = async (pattern: string): Promise<void> => {
  try {
    const client = getRedisClient();
    if (!client) {
      logger.info('Redis not available, skipping cache clear pattern');
      return;
    }
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
    }
  } catch (error) {
    logger.error('Redis clear pattern error:', error);
  }
};
