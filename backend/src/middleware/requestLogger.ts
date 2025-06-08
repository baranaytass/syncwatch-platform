import { Request, Response, NextFunction } from 'express';
import { logger } from '@/config/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  // Add request ID
  req.headers['x-request-id'] = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  
  // Log request
  logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: req.headers['x-request-id'],
  });
  
  // Override res.end to log response
  const originalEnd = res.end.bind(res);
  res.end = ((chunk?: any, encoding?: any): Response => {
    const duration = Date.now() - startTime;
    
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      requestId: req.headers['x-request-id'],
    });
    
    return originalEnd(chunk, encoding);
  }) as any;
  
  next();
}; 