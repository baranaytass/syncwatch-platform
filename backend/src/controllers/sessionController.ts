import { Router, Request, Response } from 'express';
import { generateSessionId } from '@syncwatch/shared';
import { logger } from '@/config/logger';

const router = Router();

// Create new session
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
        errorCode: 'VALIDATION_ERROR',
      });
    }
    
    const sessionId = generateSessionId();
    
    logger.info('Session created', { sessionId, userId });
    
    res.status(201).json({
      success: true,
      data: {
        sessionId,
        userId,
        status: 'WAITING',
        participants: [userId],
        createdAt: new Date().toISOString(),
      },
    });
    
  } catch (error) {
    logger.error('Failed to create session', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      errorCode: 'INTERNAL_SERVER_ERROR',
    });
  }
});

// Join session
router.post('/:sessionId/join', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
        errorCode: 'VALIDATION_ERROR',
      });
    }
    
    logger.info('User joining session', { sessionId, userId });
    
    res.json({
      success: true,
      data: {
        sessionId,
        userId,
        message: 'Joined session successfully',
      },
    });
    
  } catch (error) {
    logger.error('Failed to join session', {
      error: error instanceof Error ? error.message : 'Unknown error',
      sessionId: req.params.sessionId,
    });
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      errorCode: 'INTERNAL_SERVER_ERROR',
    });
  }
});

export default router; 