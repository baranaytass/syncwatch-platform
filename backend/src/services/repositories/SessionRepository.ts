import { Pool } from 'pg';
// Type compatibility issue between @redis/client and redis packages
// Using any for Redis client to avoid type conflicts
import { v4 as uuidv4 } from 'uuid';
import { BaseRepository } from './BaseRepository';
import { SessionData } from '../../types';
import { Result, Ok, Err } from '../../utils/result';
import { DatabaseError, SessionNotFoundError, BaseError } from '../../utils/errors';

export class SessionRepository extends BaseRepository<SessionData> {
  constructor(pool: Pool, redis: any) {
    super(pool, redis, 'sessions');
  }

  async findById(id: string): Promise<Result<SessionData | null, BaseError>> {
    // Try cache first
    const cacheKey = this.getCacheKey(id);
    const cached = await this.getCache(cacheKey);
    if (cached) {
      return Ok(cached);
    }

    // Query database
    const query = `
      SELECT id, user_id, status, participants, video_url, video_state, created_at, updated_at
      FROM sessions 
      WHERE id = $1
    `;
    
    const result = await this.executeQuery<any[]>('find session by id', query, [id]);
    
    if (!result.success) {
      return result;
    }

    if (result.data.length === 0) {
      return Ok(null);
    }

    const row = result.data[0];
    const session: SessionData = {
      id: row.id,
      userId: row.user_id,
      status: row.status,
      participants: Array.isArray(row.participants) ? row.participants : [],
      videoUrl: row.video_url || undefined,
      videoState: row.video_state || undefined,
      createdAt: new Date(row.created_at),
      ...(row.updated_at && { updatedAt: new Date(row.updated_at) }),
    };
    
    // Cache the result
    await this.setCache(cacheKey, session);

    return Ok(session);
  }

  async create(data: Omit<SessionData, 'id' | 'createdAt' | 'updatedAt'>): Promise<Result<SessionData, BaseError>> {
    const sessionId = uuidv4();
    const now = new Date();
    
    const query = `
      INSERT INTO sessions (id, user_id, status, participants, video_url, video_state, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, user_id, status, participants, video_url, video_state, created_at, updated_at
    `;

    const params = [
      sessionId,
      data.userId,
      data.status,
      JSON.stringify(data.participants),
      data.videoUrl || null,
      data.videoState ? JSON.stringify(data.videoState) : null,
      now,
      now
    ];

    const result = await this.executeQuery<any[]>('create session', query, params);
    
    if (!result.success) {
      return result;
    }

    const row = result.data[0];
    const session: SessionData = {
      id: row.id,
      userId: row.user_id,
      status: row.status,
      participants: Array.isArray(row.participants) ? row.participants : [],
      videoUrl: row.video_url || undefined,
      videoState: row.video_state || undefined,
      createdAt: new Date(row.created_at),
      ...(row.updated_at && { updatedAt: new Date(row.updated_at) }),
    };
    
    // Cache the new session
    const cacheKey = this.getCacheKey(session.id);
    await this.setCache(cacheKey, session);

    return Ok(session);
  }

  async update(id: string, data: Partial<SessionData>): Promise<Result<SessionData, BaseError>> {
    const now = new Date();
    
    // Build dynamic update query
    const updateFields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.status) {
      updateFields.push(`status = $${paramIndex++}`);
      params.push(data.status);
    }
    
    if (data.participants) {
      updateFields.push(`participants = $${paramIndex++}`);
      params.push(JSON.stringify(data.participants));
    }
    
    if (data.videoUrl !== undefined) {
      updateFields.push(`video_url = $${paramIndex++}`);
      params.push(data.videoUrl);
    }
    
    if (data.videoState !== undefined) {
      updateFields.push(`video_state = $${paramIndex++}`);
      params.push(data.videoState ? JSON.stringify(data.videoState) : null);
    }

    updateFields.push(`updated_at = $${paramIndex++}`);
    params.push(now);
    
    params.push(id); // WHERE clause parameter

    const query = `
      UPDATE sessions 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, user_id, status, participants, video_url, video_state, created_at, updated_at
    `;

    const result = await this.executeQuery<any[]>('update session', query, params);
    
    if (!result.success) {
      return result;
    }

    if (result.data.length === 0) {
      return Err(new SessionNotFoundError(id));
    }

    const row = result.data[0];
    const session: SessionData = {
      id: row.id,
      userId: row.user_id,
      status: row.status,
      participants: Array.isArray(row.participants) ? row.participants : [],
      videoUrl: row.video_url || undefined,
      videoState: row.video_state || undefined,
      createdAt: new Date(row.created_at),
      ...(row.updated_at && { updatedAt: new Date(row.updated_at) }),
    };
    
    // Update cache
    const cacheKey = this.getCacheKey(id);
    await this.setCache(cacheKey, session);

    return Ok(session);
  }

  async delete(id: string): Promise<Result<boolean, BaseError>> {
    const query = 'DELETE FROM sessions WHERE id = $1';
    
    const result = await this.executeQuery<any[]>('delete session', query, [id]);
    
    if (!result.success) {
      return result;
    }

    // Remove from cache
    const cacheKey = this.getCacheKey(id);
    await this.deleteCache(cacheKey);

    return Ok(true);
  }

  // Additional session-specific methods
  async findActiveSessionsByUser(userId: string): Promise<Result<SessionData[], BaseError>> {
    const query = `
      SELECT id, user_id, status, participants, video_url, video_state, created_at, updated_at
      FROM sessions 
      WHERE user_id = $1 AND status IN ('WAITING', 'ACTIVE')
      ORDER BY created_at DESC
    `;
    
    const result = await this.executeQuery<any[]>('find active sessions by user', query, [userId]);
    
    if (!result.success) {
      return result;
    }

    const sessions: SessionData[] = result.data.map(row => ({
      id: row.id,
      userId: row.user_id,
      status: row.status,
      participants: Array.isArray(row.participants) ? row.participants : [],
      videoUrl: row.video_url || undefined,
      videoState: row.video_state || undefined,
      createdAt: new Date(row.created_at),
      ...(row.updated_at && { updatedAt: new Date(row.updated_at) }),
    }));
    
    return Ok(sessions);
  }

  async addParticipant(sessionId: string, userId: string): Promise<Result<SessionData, BaseError>> {
    // Get current session
    const sessionResult = await this.findById(sessionId);
    if (!sessionResult.success) {
      return sessionResult;
    }

    if (!sessionResult.data) {
      return Err(new SessionNotFoundError(sessionId));
    }

    const session = sessionResult.data;
    const updatedParticipants = [...new Set([...session.participants, userId])];

    return this.update(sessionId, { participants: updatedParticipants });
  }

  async removeParticipant(sessionId: string, userId: string): Promise<Result<SessionData, BaseError>> {
    // Get current session
    const sessionResult = await this.findById(sessionId);
    if (!sessionResult.success) {
      return sessionResult;
    }

    if (!sessionResult.data) {
      return Err(new SessionNotFoundError(sessionId));
    }

    const session = sessionResult.data;
    const updatedParticipants = session.participants.filter(id => id !== userId);

    return this.update(sessionId, { participants: updatedParticipants });
  }
} 