// Base error class following SOLID principles
export abstract class BaseError extends Error {
  abstract readonly statusCode: number;
  abstract readonly isOperational: boolean;
  abstract readonly errorCode: string;

  constructor(
    message: string,
    public readonly context?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      errorCode: this.errorCode,
      context: this.context,
      stack: this.stack,
    };
  }
}

// Domain-specific error classes
export class ValidationError extends BaseError {
  readonly statusCode = 400;
  readonly isOperational = true;
  readonly errorCode = 'VALIDATION_ERROR';

  constructor(
    message: string,
    public readonly field: string,
    context?: Record<string, any>
  ) {
    super(message, { field, ...context });
  }
}

export class SessionNotFoundError extends BaseError {
  readonly statusCode = 404;
  readonly isOperational = true;
  readonly errorCode = 'SESSION_NOT_FOUND';

  constructor(sessionId: string) {
    super(`Session not found: ${sessionId}`, { sessionId });
  }
}

export class VideoNotAccessibleError extends BaseError {
  readonly statusCode = 422;
  readonly isOperational = true;
  readonly errorCode = 'VIDEO_NOT_ACCESSIBLE';

  constructor(url: string, reason?: string) {
    super(`Video not accessible: ${url}`, { url, reason });
  }
}

export class SyncFailedError extends BaseError {
  readonly statusCode = 500;
  readonly isOperational = true;
  readonly errorCode = 'SYNC_FAILED';

  constructor(sessionId: string, reason: string) {
    super(`Video sync failed for session: ${sessionId}`, { sessionId, reason });
  }
}

export class DatabaseError extends BaseError {
  readonly statusCode = 500;
  readonly isOperational = false;
  readonly errorCode = 'DATABASE_ERROR';

  constructor(operation: string, originalError: Error) {
    super(`Database operation failed: ${operation}`, {
      operation,
      originalError: originalError.message,
    });
  }
}

export class UnauthorizedError extends BaseError {
  readonly statusCode = 401;
  readonly isOperational = true;
  readonly errorCode = 'UNAUTHORIZED';

  constructor(message = 'Unauthorized access') {
    super(message);
  }
} 