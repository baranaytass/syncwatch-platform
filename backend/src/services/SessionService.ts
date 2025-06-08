import { SessionData, VideoState } from '../types';
import { Result, Ok, Err } from '../utils/result';
import { BaseError, ValidationError, SessionNotFoundError } from '../utils/errors';
import { SessionRepository } from './repositories/SessionRepository';

export interface ISessionService {
  createSession(userId: string): Promise<Result<string, BaseError>>;
  joinSession(sessionId: string, userId: string): Promise<Result<SessionData, BaseError>>;
  leaveSession(sessionId: string, userId: string): Promise<Result<SessionData, BaseError>>;
  getSession(sessionId: string): Promise<Result<SessionData, BaseError>>;
  updateVideoState(sessionId: string, videoState: VideoState): Promise<Result<SessionData, BaseError>>;
  setVideoUrl(sessionId: string, url: string): Promise<Result<SessionData, BaseError>>;
  endSession(sessionId: string): Promise<Result<boolean, BaseError>>;
}

export class SessionService implements ISessionService {
  constructor(
    private readonly sessionRepository: SessionRepository
  ) {}

  async createSession(userId: string): Promise<Result<string, BaseError>> {
    try {
      // Input validation
      if (!userId || userId.trim().length === 0) {
        return Err(new ValidationError('User ID is required', 'userId'));
      }

      console.log('Creating new session', { userId });

      // Create session data
      const sessionData = {
        userId: userId.trim(),
        status: 'WAITING' as const,
        participants: [userId.trim()],
      };

      // Create session in repository
      const result = await this.sessionRepository.create(sessionData);
      
      if (!result.success) {
        return result;
      }

      const sessionId = result.data.id;

      console.log('Session created successfully', { 
        sessionId, 
        userId,
        timestamp: new Date().toISOString()
      });

      return Ok(sessionId);

    } catch (error) {
      console.error('Failed to create session', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      return Err(error as BaseError);
    }
  }

  async joinSession(sessionId: string, userId: string): Promise<Result<SessionData, BaseError>> {
    try {
      // Input validation
      if (!sessionId || !userId) {
        return Err(new ValidationError('Session ID and User ID are required', 'sessionId,userId'));
      }

      console.log('User joining session', { sessionId, userId });

      // Check if session exists
      const sessionResult = await this.sessionRepository.findById(sessionId);
      if (!sessionResult.success) {
        return sessionResult;
      }

      if (!sessionResult.data) {
        return Err(new SessionNotFoundError(sessionId));
      }

      // Add participant to session
      const result = await this.sessionRepository.addParticipant(sessionId, userId);
      
      if (!result.success) {
        return result;
      }

      // Activate session if it was waiting
      if (result.data.status === 'WAITING' && result.data.participants.length > 1) {
        const activateResult = await this.sessionRepository.update(sessionId, { 
          status: 'ACTIVE' 
        });
        
        if (!activateResult.success) {
          return activateResult;
        }

        console.log('Session activated', { 
          sessionId, 
          participantCount: activateResult.data.participants.length
        });

        return Ok(activateResult.data);
      }

      console.log('User joined session successfully', { 
        sessionId, 
        userId,
        participantCount: result.data.participants.length
      });

      return Ok(result.data);

    } catch (error) {
      console.error('Failed to join session', {
        sessionId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      return Err(error as BaseError);
    }
  }

  async leaveSession(sessionId: string, userId: string): Promise<Result<SessionData, BaseError>> {
    // Input validation
    if (!sessionId || !userId) {
      return Err(new ValidationError('Session ID and User ID are required', 'sessionId,userId'));
    }

    console.log('User leaving session', { sessionId, userId });

    // Remove participant from session
    const result = await this.sessionRepository.removeParticipant(sessionId, userId);
    
    if (!result.success) {
      return result;
    }

    // End session if no participants left
    if (result.data.participants.length === 0) {
      const endResult = await this.sessionRepository.update(sessionId, { 
        status: 'ENDED' 
      });
      
      if (!endResult.success) {
        return endResult;
      }

      console.log('Session ended - no participants left', { sessionId });
      return Ok(endResult.data);
    }

    console.log('User left session successfully', { 
      sessionId, 
      userId,
      remainingParticipants: result.data.participants.length
    });

    return Ok(result.data);
  }

  async getSession(sessionId: string): Promise<Result<SessionData, BaseError>> {
    // Input validation
    if (!sessionId) {
      return Err(new ValidationError('Session ID is required', 'sessionId'));
    }

    const result = await this.sessionRepository.findById(sessionId);
    
    if (!result.success) {
      return result;
    }

    if (!result.data) {
      return Err(new SessionNotFoundError(sessionId));
    }

    return Ok(result.data);
  }

  async updateVideoState(sessionId: string, videoState: VideoState): Promise<Result<SessionData, BaseError>> {
    // Input validation
    if (!sessionId) {
      return Err(new ValidationError('Session ID is required', 'sessionId'));
    }

    if (!videoState) {
      return Err(new ValidationError('Video state is required', 'videoState'));
    }

    console.log('Updating video state', { sessionId, videoState });

    // Update session with new video state
    const result = await this.sessionRepository.update(sessionId, { 
      videoState: {
        ...videoState,
        lastUpdated: Date.now()
      }
    });

    if (!result.success) {
      return result;
    }

    console.log('Video state updated successfully', { sessionId });

    return Ok(result.data);
  }

  async setVideoUrl(sessionId: string, url: string): Promise<Result<SessionData, BaseError>> {
    // Input validation
    if (!sessionId || !url) {
      return Err(new ValidationError('Session ID and URL are required', 'sessionId,url'));
    }

    console.log('Setting video URL', { sessionId, url });

    // Update session with video URL
    const result = await this.sessionRepository.update(sessionId, { 
      videoUrl: url.trim(),
      status: 'ACTIVE' // Activate session when video is set
    });

    if (!result.success) {
      return result;
    }

    console.log('Video URL set successfully', { sessionId, url });

    return Ok(result.data);
  }

  async endSession(sessionId: string): Promise<Result<boolean, BaseError>> {
    // Input validation
    if (!sessionId) {
      return Err(new ValidationError('Session ID is required', 'sessionId'));
    }

    console.log('Ending session', { sessionId });

    // Update session status to ended
    const result = await this.sessionRepository.update(sessionId, { 
      status: 'ENDED' 
    });

    if (!result.success) {
      return Err(result.error);
    }

    console.log('Session ended successfully', { sessionId });

    return Ok(true);
  }
} 