import { Router, Request, Response } from 'express';
import { pool, redis } from '@/config/database';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    // Check database connections
    const dbPromise = pool.query('SELECT 1');
    const redisPromise = redis.ping();
    
    await Promise.all([dbPromise, redisPromise]);
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services: {
        database: 'connected',
        redis: 'connected',
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router; 