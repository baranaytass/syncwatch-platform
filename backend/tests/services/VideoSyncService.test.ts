import { VideoSyncService, IVideoSyncService } from '../../src/services/VideoSyncService';
import { ValidationError, SyncFailedError } from '../../src/utils/errors';
import { VideoState, VideoEvent } from '../../src/types';
import { Result, Ok, Err, isOk, isErr } from '../../src/utils/result';
import { ISessionService } from '../../src/services/SessionService';
import { SessionRepository } from '../../src/services/repositories/SessionRepository';

describe('VideoSyncService', () => {
  let videoSyncService: IVideoSyncService;
  let mockSessionService: jest.Mocked<ISessionService>;
  let mockSessionRepository: jest.Mocked<SessionRepository>;

  beforeEach(() => {
    mockSessionService = {
      createSession: jest.fn(),
      joinSession: jest.fn(),
      leaveSession: jest.fn(),
      getSession: jest.fn(),
      updateVideoState: jest.fn(),
      setVideoUrl: jest.fn(),
      endSession: jest.fn(),
    } as jest.Mocked<ISessionService>;

    mockSessionRepository = {} as jest.Mocked<SessionRepository>;

    videoSyncService = new VideoSyncService(mockSessionService, mockSessionRepository);
  });

  describe('syncVideoState', () => {
    const sessionId = 'test-session-123';
    const mockVideoState: VideoState = {
      currentTime: 30,
      isPlaying: true,
      duration: 120,
      url: 'https://example.com/video.mp4',
      lastUpdated: Date.now()
    };

    it('should sync video state successfully', async () => {
      // Arrange
      mockSessionService.getSession.mockResolvedValue(Ok({
        id: sessionId,
        userId: 'user123',
        status: 'ACTIVE',
        participants: ['user123'],
        videoState: mockVideoState,
        createdAt: new Date(),
      }));
      mockSessionService.updateVideoState.mockResolvedValue(Ok({
        id: sessionId,
        userId: 'user123',
        status: 'ACTIVE',
        participants: ['user123'],
        videoState: mockVideoState,
        createdAt: new Date(),
      }));

      // Act
      const result = await videoSyncService.syncVideoState(sessionId, mockVideoState);

      // Assert
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data).toBe(true);
      }
      expect(mockSessionService.getSession).toHaveBeenCalledWith(sessionId);
      expect(mockSessionService.updateVideoState).toHaveBeenCalled();
    });

    it('should handle empty sessionId', async () => {
      // Act
      const result = await videoSyncService.syncVideoState('', mockVideoState);

      // Assert
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('Session ID is required');
      }
    });

    it('should handle null video state', async () => {
      // Act
      const result = await videoSyncService.syncVideoState(sessionId, null as any);

      // Assert
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('Video state is required');
      }
    });

    it('should handle session not found', async () => {
      // Arrange
      mockSessionService.getSession.mockResolvedValue(Err(new ValidationError('Session not found', 'sessionId')));

      // Act
      const result = await videoSyncService.syncVideoState(sessionId, mockVideoState);

      // Assert
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(ValidationError);
      }
    });

    it('should handle inactive session', async () => {
      // Arrange
      mockSessionService.getSession.mockResolvedValue(Ok({
        id: sessionId,
        userId: 'user123',
        status: 'WAITING', // Not ACTIVE
        participants: ['user123'],
        createdAt: new Date(),
      }));

      // Act
      const result = await videoSyncService.syncVideoState(sessionId, mockVideoState);

      // Assert
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(SyncFailedError);
        expect(result.error.message).toContain('Video sync failed for session');
      }
    });
  });

  describe('handleVideoEvent', () => {
    const sessionId = 'test-session-123';
    const userId = 'user-123';
    const mockSession = {
      id: sessionId,
      userId: 'user123',
      status: 'ACTIVE' as const,
      participants: ['user123'],
      videoState: {
        currentTime: 30,
        isPlaying: false,
        duration: 120,
        url: 'https://example.com/video.mp4',
        lastUpdated: Date.now()
      },
      createdAt: new Date(),
    };

    it('should handle PLAY event', async () => {
      // Arrange
      const event: VideoEvent = {
        type: 'PLAY',
        sessionId,
        userId,
        timestamp: Date.now(),
        data: {
          currentTime: 45,
          url: 'https://example.com/video.mp4'
        }
      };

      mockSessionService.getSession.mockResolvedValue(Ok(mockSession));
      mockSessionService.updateVideoState.mockResolvedValue(Ok(mockSession));

      // Act
      const result = await videoSyncService.handleVideoEvent(sessionId, event, userId);

      // Assert
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data.currentTime).toBe(45);
        expect(result.data.isPlaying).toBe(true);
      }
    });

    it('should handle PAUSE event', async () => {
      // Arrange
      const event: VideoEvent = {
        type: 'PAUSE',
        sessionId,
        userId,
        timestamp: Date.now(),
        data: {
          currentTime: 67,
          url: 'https://example.com/video.mp4'
        }
      };

      mockSessionService.getSession.mockResolvedValue(Ok(mockSession));
      mockSessionService.updateVideoState.mockResolvedValue(Ok(mockSession));

      // Act
      const result = await videoSyncService.handleVideoEvent(sessionId, event, userId);

      // Assert
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data.currentTime).toBe(67);
        expect(result.data.isPlaying).toBe(false);
      }
    });

    it('should handle SEEK event', async () => {
      // Arrange
      const event: VideoEvent = {
        type: 'SEEK',
        sessionId,
        userId,
        timestamp: Date.now(),
        data: {
          currentTime: 90,
          url: 'https://example.com/video.mp4'
        }
      };

      mockSessionService.getSession.mockResolvedValue(Ok(mockSession));
      mockSessionService.updateVideoState.mockResolvedValue(Ok(mockSession));

      // Act
      const result = await videoSyncService.handleVideoEvent(sessionId, event, userId);

      // Assert
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data.currentTime).toBe(90);
      }
    });

    it('should reject empty sessionId', async () => {
      // Arrange
      const event: VideoEvent = {
        type: 'PLAY',
        sessionId,
        userId,
        timestamp: Date.now(),
        data: { currentTime: 30 }
      };

      // Act
      const result = await videoSyncService.handleVideoEvent('', event, userId);

      // Assert
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(ValidationError);
      }
    });

    it('should reject empty userId', async () => {
      // Arrange
      const event: VideoEvent = {
        type: 'PLAY',
        sessionId,
        userId: '',
        timestamp: Date.now(),
        data: { currentTime: 30 }
      };

      // Act
      const result = await videoSyncService.handleVideoEvent(sessionId, event, '');

      // Assert
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(ValidationError);
      }
    });
  });

  describe('validateVideoSync', () => {
    it('should validate matching video states', () => {
      // Arrange
      const currentState: VideoState = {
        currentTime: 30,
        isPlaying: true,
        duration: 120,
        url: 'https://example.com/video.mp4',
        lastUpdated: Date.now()
      };

      const newState: VideoState = {
        currentTime: 30.5, // Small difference
        isPlaying: true,
        duration: 120,
        url: 'https://example.com/video.mp4',
        lastUpdated: Date.now()
      };

      // Act
      const result = videoSyncService.validateVideoSync(currentState, newState);

      // Assert
      expect(result).toBe(true);
    });

    it('should detect URL conflicts', () => {
      // Arrange
      const currentState: VideoState = {
        currentTime: 30,
        isPlaying: true,
        duration: 120,
        url: 'https://example.com/video1.mp4',
        lastUpdated: Date.now()
      };

      const newState: VideoState = {
        currentTime: 30,
        isPlaying: true,
        duration: 120,
        url: 'https://example.com/video2.mp4', // Different URL
        lastUpdated: Date.now()
      };

      // Act
      const result = videoSyncService.validateVideoSync(currentState, newState);

      // Assert
      expect(result).toBe(false);
    });

    it('should detect duration conflicts', () => {
      // Arrange
      const currentState: VideoState = {
        currentTime: 30,
        isPlaying: true,
        duration: 120,
        url: 'https://example.com/video.mp4',
        lastUpdated: Date.now()
      };

      const newState: VideoState = {
        currentTime: 30,
        isPlaying: true,
        duration: 180, // Very different duration
        url: 'https://example.com/video.mp4',
        lastUpdated: Date.now()
      };

      // Act
      const result = videoSyncService.validateVideoSync(currentState, newState);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('resolveConflict', () => {
    const sessionId = 'test-session-123';

    it('should resolve conflict using most recent timestamp', async () => {
      // Arrange
      const olderState: VideoState = {
        currentTime: 30,
        isPlaying: true,
        duration: 120,
        url: 'https://example.com/video.mp4',
        lastUpdated: Date.now() - 5000 // 5 seconds ago
      };

      const newerState: VideoState = {
        currentTime: 35,
        isPlaying: false,
        duration: 120,
        url: 'https://example.com/video.mp4',
        lastUpdated: Date.now() // More recent
      };

      const conflictingStates = [olderState, newerState];

      // Mock successful session service calls for the syncVideoState in resolveConflict
      mockSessionService.getSession.mockResolvedValue(Ok({
        id: sessionId,
        userId: 'user123',
        status: 'ACTIVE',
        participants: ['user123'],
        videoState: newerState,
        createdAt: new Date(),
      }));
      mockSessionService.updateVideoState.mockResolvedValue(Ok({
        id: sessionId,
        userId: 'user123',
        status: 'ACTIVE',
        participants: ['user123'],
        videoState: newerState,
        createdAt: new Date(),
      }));

      // Act
      const result = await videoSyncService.resolveConflict(sessionId, conflictingStates);

      // Assert
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data.currentTime).toBe(35);
        expect(result.data.isPlaying).toBe(false);
        expect(result.data.lastUpdated).toBe(newerState.lastUpdated);
      }
    });

    it('should handle single state as no conflict', async () => {
      // Arrange
      const singleState: VideoState = {
        currentTime: 30,
        isPlaying: true,
        duration: 120,
        url: 'https://example.com/video.mp4',
        lastUpdated: Date.now()
      };

      // Mock successful session service calls for the syncVideoState in resolveConflict
      mockSessionService.getSession.mockResolvedValue(Ok({
        id: sessionId,
        userId: 'user123',
        status: 'ACTIVE',
        participants: ['user123'],
        videoState: singleState,
        createdAt: new Date(),
      }));
      mockSessionService.updateVideoState.mockResolvedValue(Ok({
        id: sessionId,
        userId: 'user123',
        status: 'ACTIVE',
        participants: ['user123'],
        videoState: singleState,
        createdAt: new Date(),
      }));

      // Act
      const result = await videoSyncService.resolveConflict(sessionId, [singleState]);

      // Assert
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data).toEqual(singleState);
      }
    });

    it('should handle empty states array', async () => {
      // Act
      const result = await videoSyncService.resolveConflict(sessionId, []);

      // Assert
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(ValidationError);
      }
    });
  });
}); 