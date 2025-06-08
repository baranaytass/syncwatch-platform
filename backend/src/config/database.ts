import { Pool } from 'pg';
import { createClient } from 'redis';
import { logger } from './logger';

// PostgreSQL connection
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/syncwatch',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Redis connection
export const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

export const connectDatabase = async (): Promise<void> => {
  try {
    // Test PostgreSQL connection
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    
    logger.info('✅ PostgreSQL connected successfully', {
      timestamp: result.rows[0].now,
    });
  } catch (error) {
    logger.error('❌ PostgreSQL connection failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
};

export const connectRedis = async (): Promise<void> => {
  try {
    await redis.connect();
    
    // Test Redis connection
    await redis.ping();
    
    logger.info('✅ Redis connected successfully');
  } catch (error) {
    logger.error('❌ Redis connection failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
};

// Graceful shutdown
export const closeConnections = async (): Promise<void> => {
  try {
    await redis.quit();
    await pool.end();
    logger.info('Database connections closed');
  } catch (error) {
    logger.error('Error closing database connections', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}; 