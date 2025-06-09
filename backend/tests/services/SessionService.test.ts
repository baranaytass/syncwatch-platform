import { SessionService } from '../../src/services/SessionService';
import { SessionRepository } from '../../src/services/repositories/SessionRepository';
import { ValidationError, SessionNotFoundError } from '../../src/utils/errors';
import { testPool, testRedis } from '../setup';
import { isOk, isErr } from '../../src/utils/result';
import { VideoState } from '../../src/types';

describe('SessionService', () => {
  let sessionService: SessionService;
  let sessionRepository: SessionRepository;

  beforeEach(() => {
    sessionRepository = new SessionRepository(testPool, testRedis);
    sessionService = new SessionService(sessionRepository);
  });

  describe('createSession', () => {
    it('should create a new session successfully', async () => {
      // Arrange
      const userId = 'user123';

      // Act
      const result = await sessionService.createSession(userId);

      // Assert
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(typeof result.data).toBe('string');
        expect(result.data.length).toBeGreaterThan(0);
      }

      // Verify session was created in database
      if (isOk(result)) {
        const sessionResult = await sessionRepository.findById(result.data);
        expect(isOk(sessionResult)).toBe(true);
        if (isOk(sessionResult) && sessionResult.data) {
          expect(sessionResult.data.userId).toBe(userId);
          expect(sessionResult.data.status).toBe('WAITING');
          expect(sessionResult.data.participants).toContain(userId);
        }
      }
    });

    it('should handle empty userId', async () => {
      // Arrange
      const userId = '';

      // Act
      const result = await sessionService.createSession(userId);

      // Assert
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toBe('User ID is required');
      }
    });

    it('should handle whitespace-only userId', async () => {
      // Arrange
      const userId = '   ';

      // Act
      const result = await sessionService.createSession(userId);

      // Assert
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(ValidationError);
      }
    });

    it('should trim userId before creating session', async () => {
      // Arrange
      const userId = '  user123  ';
      const trimmedUserId = 'user123';

      // Act
      const result = await sessionService.createSession(userId);

      // Assert
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        const sessionResult = await sessionRepository.findById(result.data);
        if (isOk(sessionResult) && sessionResult.data) {
          expect(sessionResult.data.userId).toBe(trimmedUserId);
          expect(sessionResult.data.participants).toContain(trimmedUserId);
        }
      }
    });
  });

  describe('joinSession', () => {
    let sessionId: string;
    const hostUserId = 'host123';

    beforeEach(async () => {
      // Create a session first
      const createResult = await sessionService.createSession(hostUserId);
      if (isOk(createResult)) {
        sessionId = createResult.data;
      }
    });

    it('should join an existing session successfully', async () => {
      // Arrange
      const joiningUserId = 'joiner456';

      // Act
      const result = await sessionService.joinSession(sessionId, joiningUserId);

      // Assert
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data.participants).toContain(hostUserId);
        expect(result.data.participants).toContain(joiningUserId);
        expect(result.data.participants.length).toBe(2);
        expect(result.data.status).toBe('ACTIVE'); // Should be activated with 2 participants
      }
    });

    it('should handle non-existent session', async () => {
      // Arrange
      const nonExistentSessionId = '00000000-0000-0000-0000-000000000000';
      const userId = 'user123';

      // Act
      const result = await sessionService.joinSession(nonExistentSessionId, userId);

      // Assert
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(SessionNotFoundError);
      }
    });

    it('should handle empty sessionId', async () => {
      // Arrange
      const userId = 'user123';

      // Act
      const result = await sessionService.joinSession('', userId);

      // Assert
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(ValidationError);
      }
    });

    it('should handle empty userId', async () => {
      // Act
      const result = await sessionService.joinSession(sessionId, '');

      // Assert
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(ValidationError);
      }
    });

    it('should not duplicate participants when joining twice', async () => {
      // Arrange
      const joiningUserId = 'joiner456';

      // Act - Join twice
      await sessionService.joinSession(sessionId, joiningUserId);
      const result = await sessionService.joinSession(sessionId, joiningUserId);

      // Assert
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        const participantCount = result.data.participants.filter(p => p === joiningUserId).length;
        expect(participantCount).toBe(1); // Should appear only once
      }
    });
  });

  describe('leaveSession', () => {
    let sessionId: string;
    const hostUserId = 'host123';
    const joinerUserId = 'joiner456';

    beforeEach(async () => {
      // Create a session and add a participant
      const createResult = await sessionService.createSession(hostUserId);
      if (isOk(createResult)) {
        sessionId = createResult.data;
        await sessionService.joinSession(sessionId, joinerUserId);
      }
    });

    it('should leave session successfully', async () => {
      // Act
      const result = await sessionService.leaveSession(sessionId, joinerUserId);

      // Assert
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data.participants).toContain(hostUserId);
        expect(result.data.participants).not.toContain(joinerUserId);
        expect(result.data.participants.length).toBe(1);
      }
    });

    it('should end session when last participant leaves', async () => {
      // Arrange - Remove joiner first
      await sessionService.leaveSession(sessionId, joinerUserId);

      // Act - Remove host (last participant)
      const result = await sessionService.leaveSession(sessionId, hostUserId);

      // Assert
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data.participants.length).toBe(0);
        expect(result.data.status).toBe('ENDED');
      }
    });

    it('should handle non-existent session', async () => {
      // Arrange
      const nonExistentSessionId = '00000000-0000-0000-0000-000000000001';

      // Act
      const result = await sessionService.leaveSession(nonExistentSessionId, hostUserId);

      // Assert
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(SessionNotFoundError);
      }
    });
  });

  describe('getSession', () => {
    let sessionId: string;
    const userId = 'user123';

    beforeEach(async () => {
      const createResult = await sessionService.createSession(userId);
      if (isOk(createResult)) {
        sessionId = createResult.data;
      }
    });

    it('should get existing session successfully', async () => {
      // Act
      const result = await sessionService.getSession(sessionId);

      // Assert
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data.id).toBe(sessionId);
        expect(result.data.userId).toBe(userId);
        expect(result.data.status).toBe('WAITING');
      }
    });

    it('should handle non-existent session', async () => {
      // Arrange
      const nonExistentSessionId = '00000000-0000-0000-0000-000000000002';

      // Act
      const result = await sessionService.getSession(nonExistentSessionId);

      // Assert
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(SessionNotFoundError);
      }
    });

    it('should handle empty sessionId', async () => {
      // Act
      const result = await sessionService.getSession('');

      // Assert
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(ValidationError);
      }
    });
  });

  describe('setVideoUrl', () => {
    let sessionId: string;
    const userId = 'user123';

    beforeEach(async () => {
      const createResult = await sessionService.createSession(userId);
      if (isOk(createResult)) {
        sessionId = createResult.data;
      }
    });

    it('should set video URL successfully', async () => {
      // Arrange
      const videoUrl = 'https://example.com/video.mp4';

      // Act
      const result = await sessionService.setVideoUrl(sessionId, videoUrl);

      // Assert
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data.videoUrl).toBe(videoUrl);
        expect(result.data.status).toBe('ACTIVE'); // Should activate session
      }
    });

    it('should handle empty URL', async () => {
      // Act
      const result = await sessionService.setVideoUrl(sessionId, '');

      // Assert
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(ValidationError);
      }
    });

    it('should trim video URL', async () => {
      // Arrange
      const videoUrl = '  https://example.com/video.mp4  ';
      const trimmedUrl = 'https://example.com/video.mp4';

      // Act
      const result = await sessionService.setVideoUrl(sessionId, videoUrl);

      // Assert
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data.videoUrl).toBe(trimmedUrl);
      }
    });
  });

  describe('updateVideoState', () => {
    let sessionId: string;
    const userId = 'user123';

    beforeEach(async () => {
      const createResult = await sessionService.createSession(userId);
      if (isOk(createResult)) {
        sessionId = createResult.data;
        // Set video URL first
        await sessionService.setVideoUrl(sessionId, 'https://example.com/video.mp4');
      }
    });

    it('should update video state successfully', async () => {
      // Arrange
      const videoState: VideoState = {
        currentTime: 30,
        isPlaying: true,
        duration: 120,
        url: 'https://example.com/video.mp4',
        provider: 'html5',
        lastUpdated: Date.now(),
      };

      // Act
      const result = await sessionService.updateVideoState(sessionId, videoState);

      // Assert
      expect(isOk(result)).toBe(true);
      if (isOk(result) && result.data.videoState) {
        expect(result.data.videoState.currentTime).toBe(30);
        expect(result.data.videoState.isPlaying).toBe(true);
        expect(result.data.videoState.duration).toBe(120);
      }
    });

    it('should handle empty session ID', async () => {
      // Arrange
      const videoState: VideoState = {
        currentTime: 30,
        isPlaying: true,
        duration: 120,
        url: 'https://example.com/video.mp4',
        provider: 'html5',
        lastUpdated: Date.now(),
      };

      // Act
      const result = await sessionService.updateVideoState('', videoState);

      // Assert
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(ValidationError);
      }
    });
  });

  describe('endSession', () => {
    let sessionId: string;
    const userId = 'user123';

    beforeEach(async () => {
      const createResult = await sessionService.createSession(userId);
      if (isOk(createResult)) {
        sessionId = createResult.data;
      }
    });

    it('should end session successfully', async () => {
      // Act
      const result = await sessionService.endSession(sessionId);

      // Assert
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data).toBe(true);
      }

      // Verify session status is ENDED
      const sessionResult = await sessionService.getSession(sessionId);
      if (isOk(sessionResult)) {
        expect(sessionResult.data.status).toBe('ENDED');
      }
    });

    it('should handle non-existent session', async () => {
      // Arrange
      const nonExistentSessionId = '00000000-0000-0000-0000-000000000003';

      // Act
      const result = await sessionService.endSession(nonExistentSessionId);

      // Assert
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(SessionNotFoundError);
      }
    });

    it('should handle empty sessionId', async () => {
      // Act
      const result = await sessionService.endSession('');

      // Assert
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(ValidationError);
      }
    });
  });
}); 