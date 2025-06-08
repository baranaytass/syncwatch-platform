import { Request, Response, NextFunction } from 'express';
import { ISessionService } from '../services/SessionService';
import { BaseError } from '../utils/errors';
import { isErr } from '../utils/result';

export class SessionController {
  constructor(
    private readonly sessionService: ISessionService
  ) {}

  async createSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.body;

      const result = await this.sessionService.createSession(userId);

      if (isErr(result)) {
        const error = result.error;
        
        console.error('Session creation failed', {
          error: error.toJSON ? error.toJSON() : error,
          requestId: req.headers['x-request-id'],
          userAgent: req.headers['user-agent'],
          ip: req.ip,
          method: req.method,
          url: req.url,
        });

        res.status(error.statusCode).json({
          success: false,
          error: error.message,
          errorCode: error.errorCode,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(201).json({
        success: true,
        data: {
          sessionId: result.data,
          userId,
          status: 'WAITING',
        },
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Unhandled error in createSession', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        requestId: req.headers['x-request-id'],
      });

      next(error);
    }
  }

  async joinSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { userId } = req.body;

      const result = await this.sessionService.joinSession(sessionId, userId);

      if (isErr(result)) {
        const error = result.error;
        
        console.error('Join session failed', {
          error: error.toJSON ? error.toJSON() : error,
          sessionId,
          userId,
          requestId: req.headers['x-request-id'],
        });

        res.status(error.statusCode).json({
          success: false,
          error: error.message,
          errorCode: error.errorCode,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.json({
        success: true,
        data: {
          session: result.data,
          message: 'Joined session successfully',
        },
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Unhandled error in joinSession', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        sessionId: req.params.sessionId,
        requestId: req.headers['x-request-id'],
      });

      next(error);
    }
  }

  async leaveSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { userId } = req.body;

      const result = await this.sessionService.leaveSession(sessionId, userId);

      if (isErr(result)) {
        const error = result.error;
        
        console.error('Leave session failed', {
          error: error.toJSON ? error.toJSON() : error,
          sessionId,
          userId,
          requestId: req.headers['x-request-id'],
        });

        res.status(error.statusCode).json({
          success: false,
          error: error.message,
          errorCode: error.errorCode,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.json({
        success: true,
        data: {
          session: result.data,
          message: 'Left session successfully',
        },
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Unhandled error in leaveSession', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        sessionId: req.params.sessionId,
        requestId: req.headers['x-request-id'],
      });

      next(error);
    }
  }

  async getSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = req.params;

      const result = await this.sessionService.getSession(sessionId);

      if (isErr(result)) {
        const error = result.error;
        
        console.error('Get session failed', {
          error: error.toJSON ? error.toJSON() : error,
          sessionId,
          requestId: req.headers['x-request-id'],
        });

        res.status(error.statusCode).json({
          success: false,
          error: error.message,
          errorCode: error.errorCode,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.json({
        success: true,
        data: result.data,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Unhandled error in getSession', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        sessionId: req.params.sessionId,
        requestId: req.headers['x-request-id'],
      });

      next(error);
    }
  }

  async setVideoUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { url } = req.body;

      const result = await this.sessionService.setVideoUrl(sessionId, url);

      if (isErr(result)) {
        const error = result.error;
        
        console.error('Set video URL failed', {
          error: error.toJSON ? error.toJSON() : error,
          sessionId,
          url,
          requestId: req.headers['x-request-id'],
        });

        res.status(error.statusCode).json({
          success: false,
          error: error.message,
          errorCode: error.errorCode,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.json({
        success: true,
        data: {
          session: result.data,
          message: 'Video URL set successfully',
        },
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Unhandled error in setVideoUrl', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        sessionId: req.params.sessionId,
        requestId: req.headers['x-request-id'],
      });

      next(error);
    }
  }

  async endSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = req.params;

      const result = await this.sessionService.endSession(sessionId);

      if (isErr(result)) {
        const error = result.error;
        
        console.error('End session failed', {
          error: error.toJSON ? error.toJSON() : error,
          sessionId,
          requestId: req.headers['x-request-id'],
        });

        res.status(error.statusCode).json({
          success: false,
          error: error.message,
          errorCode: error.errorCode,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.json({
        success: true,
        data: {
          message: 'Session ended successfully',
        },
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Unhandled error in endSession', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        sessionId: req.params.sessionId,
        requestId: req.headers['x-request-id'],
      });

      next(error);
    }
  }
} 