import { Pool, PoolClient } from 'pg';
import { RedisClientType } from 'redis';
import { Result } from '../../utils/result';
import { DatabaseError, BaseError } from '../../utils/errors';

// Abstract repository interface
export interface IRepository<T> {
  findById(id: string): Promise<Result<T | null, BaseError>>;
  create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<Result<T, BaseError>>;
  update(id: string, data: Partial<T>): Promise<Result<T, BaseError>>;
  delete(id: string): Promise<Result<boolean, BaseError>>;
}

// Base repository implementation
export abstract class BaseRepository<T> implements IRepository<T> {
  constructor(
    protected readonly pool: Pool,
    protected readonly redis: RedisClientType,
    protected readonly tableName: string
  ) {}

  abstract findById(id: string): Promise<Result<T | null, BaseError>>;
  abstract create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<Result<T, BaseError>>;
  abstract update(id: string, data: Partial<T>): Promise<Result<T, BaseError>>;
  abstract delete(id: string): Promise<Result<boolean, BaseError>>;

  // Helper method for database operations
  protected async executeQuery<R>(
    operation: string,
    query: string,
    params: any[] = []
  ): Promise<Result<R, DatabaseError>> {
    let client: PoolClient | null = null;
    
    try {
      client = await this.pool.connect();
      const result = await client.query(query, params);
      return { success: true, data: result.rows as R };
    } catch (error) {
      return {
        success: false,
        error: new DatabaseError(operation, error as Error)
      };
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  // Helper method for Redis operations
  protected async executeRedisOperation<R>(
    operation: string,
    redisOp: () => Promise<R>
  ): Promise<Result<R, DatabaseError>> {
    try {
      const result = await redisOp();
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: new DatabaseError(`Redis ${operation}`, error as Error)
      };
    }
  }

  // Cache helpers
  protected getCacheKey(id: string): string {
    return `${this.tableName}:${id}`;
  }

  protected async setCache(key: string, data: T, ttl = 3600): Promise<void> {
    try {
      await this.redis.setEx(key, ttl, JSON.stringify(data));
    } catch (error) {
      // Log error but don't fail the operation
      console.warn(`Cache set failed for key ${key}:`, error);
    }
  }

  protected async getCache(key: string): Promise<T | null> {
    try {
      const cached = await this.redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      // Log error but don't fail the operation
      console.warn(`Cache get failed for key ${key}:`, error);
      return null;
    }
  }

  protected async deleteCache(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      // Log error but don't fail the operation
      console.warn(`Cache delete failed for key ${key}:`, error);
    }
  }
} 