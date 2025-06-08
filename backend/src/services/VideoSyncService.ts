import { VideoState, VideoEvent, SessionData } from '../types';
import { Result, Ok, Err } from '../utils/result';
import { BaseError, ValidationError, SyncFailedError } from '../utils/errors';
import { SessionRepository } from './repositories/SessionRepository';
import { ISessionService } from './SessionService';

export interface IVideoSyncService {
  syncVideoState(sessionId: string, videoState: VideoState, excludeUserId?: string): Promise<Result<boolean, BaseError>>;
  handleVideoEvent(sessionId: string, event: VideoEvent, userId: string): Promise<Result<VideoState, BaseError>>;
  validateVideoSync(currentState: VideoState, newState: VideoState): boolean;
  resolveConflict(sessionId: string, conflictingStates: VideoState[]): Promise<Result<VideoState, BaseError>>;
}

export class VideoSyncService implements IVideoSyncService {
  private static readonly SYNC_TOLERANCE_MS = 1000; // 1 second tolerance
  private static readonly MAX_TIME_DRIFT_MS = 5000; // 5 seconds max drift

  constructor(
    private readonly sessionService: ISessionService,
    private readonly sessionRepository: SessionRepository
  ) {}

  async syncVideoState(
    sessionId: string, 
    videoState: VideoState, 
    excludeUserId?: string
  ): Promise<Result<boolean, BaseError>> {
    try {
      // Input validation
      if (!sessionId) {
        return Err(new ValidationError('Session ID is required', 'sessionId'));
      }

      if (!videoState) {
        return Err(new ValidationError('Video state is required', 'videoState'));
      }

      console.log('Syncing video state', { 
        sessionId, 
        videoState, 
        excludeUserId,
        timestamp: Date.now()
      });

      // Get current session
      const sessionResult = await this.sessionService.getSession(sessionId);
      if (!sessionResult.success) {
        return sessionResult;
      }

      const session = sessionResult.data;

      // Validate session is active
      if (session.status !== 'ACTIVE') {
        return Err(new SyncFailedError(sessionId, 'Session is not active'));
      }

      // Validate video state
      if (!this.isValidVideoState(videoState)) {
        return Err(new ValidationError('Invalid video state', 'videoState'));
      }

      // Update session with new video state
      const updateResult = await this.sessionService.updateVideoState(sessionId, {
        ...videoState,
        lastUpdated: Date.now()
      });

      if (!updateResult.success) {
        return Err(new SyncFailedError(sessionId, 'Failed to update video state'));
      }

      console.log('Video state synced successfully', { 
        sessionId,
        currentTime: videoState.currentTime,
        isPlaying: videoState.isPlaying
      });

      return Ok(true);

    } catch (error) {
      console.error('Failed to sync video state', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return Err(new SyncFailedError(sessionId, 'Sync operation failed'));
    }
  }

  async handleVideoEvent(
    sessionId: string, 
    event: VideoEvent, 
    userId: string
  ): Promise<Result<VideoState, BaseError>> {
    try {
      // Input validation
      if (!sessionId || !event || !userId) {
        return Err(new ValidationError('Session ID, event, and user ID are required', 'sessionId,event,userId'));
      }

      console.log('Handling video event', { 
        sessionId, 
        eventType: event.type, 
        userId,
        eventData: event.data
      });

      // Get current session state
      const sessionResult = await this.sessionService.getSession(sessionId);
      if (!sessionResult.success) {
        return sessionResult;
      }

      const session = sessionResult.data;
      const currentVideoState = session.videoState;

      // Create new video state based on event
      const newVideoState = this.applyVideoEvent(currentVideoState, event);

      // Validate the new state
      if (currentVideoState && !this.validateVideoSync(currentVideoState, newVideoState)) {
        console.warn('Video sync validation failed', {
          sessionId,
          currentState: currentVideoState,
          newState: newVideoState
        });
        
        // For now, allow the change but log the validation failure
        // In production, you might want stricter validation
      }

      // Sync the new state
      const syncResult = await this.syncVideoState(sessionId, newVideoState, userId);
      
      if (!syncResult.success) {
        return Err(syncResult.error);
      }

      console.log('Video event handled successfully', { 
        sessionId, 
        eventType: event.type,
        newVideoState
      });

      return Ok(newVideoState);

    } catch (error) {
      console.error('Failed to handle video event', {
        sessionId,
        eventType: event.type,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return Err(new SyncFailedError(sessionId, 'Failed to handle video event'));
    }
  }

  validateVideoSync(currentState: VideoState, newState: VideoState): boolean {
    try {
      // URL must match
      if (currentState.url !== newState.url) {
        console.warn('Video sync validation failed: URL mismatch', {
          currentUrl: currentState.url,
          newUrl: newState.url
        });
        return false;
      }

      // Check time drift
      const timeDrift = Math.abs(newState.currentTime - currentState.currentTime);
      if (timeDrift > VideoSyncService.MAX_TIME_DRIFT_MS / 1000) {
        console.warn('Video sync validation failed: excessive time drift', {
          timeDrift,
          maxDrift: VideoSyncService.MAX_TIME_DRIFT_MS / 1000,
          currentTime: currentState.currentTime,
          newTime: newState.currentTime
        });
        // Allow large time drift for seek operations
        // return false;
      }

      // Duration should be consistent (allowing some tolerance)
      if (currentState.duration > 0 && newState.duration > 0) {
        const durationDiff = Math.abs(newState.duration - currentState.duration);
        if (durationDiff > 5) { // 5 seconds tolerance
          console.warn('Video sync validation failed: duration mismatch', {
            currentDuration: currentState.duration,
            newDuration: newState.duration,
            difference: durationDiff
          });
          return false;
        }
      }

      return true;

    } catch (error) {
      console.error('Error in video sync validation', error);
      return false;
    }
  }

  async resolveConflict(
    sessionId: string, 
    conflictingStates: VideoState[]
  ): Promise<Result<VideoState, BaseError>> {
    try {
      if (!conflictingStates || conflictingStates.length === 0) {
        return Err(new ValidationError('Conflicting states are required', 'conflictingStates'));
      }

      console.log('Resolving video sync conflict', { 
        sessionId, 
        stateCount: conflictingStates.length 
      });

      // Simple conflict resolution: use the most recent state
      const mostRecentState = conflictingStates.reduce((latest, current) => {
        return current.lastUpdated > latest.lastUpdated ? current : latest;
      });

      console.log('Conflict resolved using most recent state', {
        sessionId,
        selectedState: mostRecentState,
        timestamp: mostRecentState.lastUpdated
      });

      // Apply the resolved state
      const syncResult = await this.syncVideoState(sessionId, mostRecentState);
      
      if (!syncResult.success) {
        return Err(syncResult.error);
      }

      return Ok(mostRecentState);

    } catch (error) {
      console.error('Failed to resolve video sync conflict', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return Err(new SyncFailedError(sessionId, 'Failed to resolve sync conflict'));
    }
  }

  // Private helper methods
  private applyVideoEvent(currentState: VideoState | undefined, event: VideoEvent): VideoState {
    const baseState: VideoState = currentState || {
      currentTime: 0,
      isPlaying: false,
      duration: 0,
      url: '',
      lastUpdated: 0
    };

    switch (event.type) {
      case 'PLAY':
        return {
          ...baseState,
          currentTime: event.data.currentTime,
          isPlaying: true,
          lastUpdated: event.timestamp
        };

      case 'PAUSE':
        return {
          ...baseState,
          currentTime: event.data.currentTime,
          isPlaying: false,
          lastUpdated: event.timestamp
        };

      case 'SEEK':
        return {
          ...baseState,
          currentTime: event.data.currentTime,
          lastUpdated: event.timestamp
        };

      case 'LOAD':
        return {
          ...baseState,
          url: event.data.url || baseState.url,
          currentTime: 0,
          isPlaying: false,
          lastUpdated: event.timestamp
        };

      case 'ENDED':
        return {
          ...baseState,
          currentTime: baseState.duration,
          isPlaying: false,
          lastUpdated: event.timestamp
        };

      default:
        console.warn('Unknown video event type', { eventType: event.type });
        return baseState;
    }
  }

  private isValidVideoState(videoState: VideoState): boolean {
    // Basic validation
    if (typeof videoState.currentTime !== 'number' || videoState.currentTime < 0) {
      return false;
    }

    if (typeof videoState.isPlaying !== 'boolean') {
      return false;
    }

    if (typeof videoState.duration !== 'number' || videoState.duration < 0) {
      return false;
    }

    if (typeof videoState.url !== 'string') {
      return false;
    }

    if (typeof videoState.lastUpdated !== 'number' || videoState.lastUpdated <= 0) {
      return false;
    }

    // Duration should be greater than or equal to current time
    if (videoState.duration > 0 && videoState.currentTime > videoState.duration) {
      return false;
    }

    return true;
  }

  // Utility method for calculating sync accuracy
  calculateSyncAccuracy(state1: VideoState, state2: VideoState): number {
    const timeDiff = Math.abs(state1.currentTime - state2.currentTime);
    return Math.max(0, 1 - (timeDiff / VideoSyncService.SYNC_TOLERANCE_MS * 1000));
  }
} 