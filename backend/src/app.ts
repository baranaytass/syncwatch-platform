import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Infrastructure
import { initializeDatabase, pool, redisClient, closeDatabase } from './config/database';

// Services
import { SessionRepository } from './services/repositories/SessionRepository';
import { SessionService } from './services/SessionService';
import { VideoSyncService } from './services/VideoSyncService';
import { WebSocketManager } from './websocket/WebSocketManager';

// Controllers
import { SessionController } from './controllers/SessionController';

// Routes
import videoRoutes from './routes/video.routes';

// Middleware
import { BaseError } from './utils/errors';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
});

const PORT = process.env.PORT || 3001;

// Dependency Injection Container
class Container {
  // Repositories
  private _sessionRepository?: SessionRepository;

  // Services  
  private _sessionService?: SessionService;
  private _videoSyncService?: VideoSyncService;
  private _webSocketManager?: WebSocketManager;

  // Controllers
  private _sessionController?: SessionController;

  get sessionRepository(): SessionRepository {
    if (!this._sessionRepository) {
      this._sessionRepository = new SessionRepository(pool, redisClient);
    }
    return this._sessionRepository;
  }

  get sessionService(): SessionService {
    if (!this._sessionService) {
      this._sessionService = new SessionService(this.sessionRepository);
    }
    return this._sessionService;
  }

  get videoSyncService(): VideoSyncService {
    if (!this._videoSyncService) {
      this._videoSyncService = new VideoSyncService(
        this.sessionService,
        this.sessionRepository
      );
    }
    return this._videoSyncService;
  }

  get webSocketManager(): WebSocketManager {
    if (!this._webSocketManager) {
      this._webSocketManager = new WebSocketManager(
        io,
        this.sessionService,
        this.videoSyncService
      );
    }
    return this._webSocketManager;
  }

  get sessionController(): SessionController {
    if (!this._sessionController) {
      this._sessionController = new SessionController(this.sessionService);
    }
    return this._sessionController;
  }
}

const container = new Container();

// Basic middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));
app.use(express.json());

// Request ID middleware
app.use((req, res, next) => {
  req.headers['x-request-id'] = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  next();
});

// Health check route
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'syncwatch-api',
    version: '1.0.0',
  });
});

// Session routes
const sessionController = container.sessionController;

app.post('/api/sessions', (req, res, next) => {
  sessionController.createSession(req, res, next);
});

app.post('/api/sessions/:sessionId/join', (req, res, next) => {
  sessionController.joinSession(req, res, next);
});

app.post('/api/sessions/:sessionId/leave', (req, res, next) => {
  sessionController.leaveSession(req, res, next);
});

app.get('/api/sessions/:sessionId', (req, res, next) => {
  sessionController.getSession(req, res, next);
});

app.post('/api/sessions/:sessionId/video-url', (req, res, next) => {
  sessionController.setVideoUrl(req, res, next);
});

app.post('/api/sessions/:sessionId/end', (req, res, next) => {
  sessionController.endSession(req, res, next);
});

app.use('/api/video', videoRoutes);

// 404 handler
app.use((req, res) => {
  console.log(`❌ 404 - Route not found: ${req.method} ${req.url}`);
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.url} not found`,
    errorCode: 'ROUTE_NOT_FOUND',
    timestamp: new Date().toISOString(),
  });
});

// Global Error Handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error('💥 Global Error Handler:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: req.headers['x-request-id'],
  });

  // Handle known application errors
  if (err instanceof BaseError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      errorCode: err.errorCode,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      errorCode: 'VALIDATION_ERROR',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (err.name === 'UnauthorizedError') {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      errorCode: 'UNAUTHORIZED',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Default error response
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    errorCode: 'INTERNAL_SERVER_ERROR',
    timestamp: new Date().toISOString(),
  });
});

// Initialize application
const initializeApp = async (): Promise<void> => {
  try {
    // Initialize database connections
    await initializeDatabase();
    console.log('✅ Database initialized');

    // Initialize WebSocket manager
    container.webSocketManager.initialize();
    console.log('✅ WebSocket manager initialized');

    console.log('🚀 Application initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize application:', error);
    process.exit(1);
  }
};

// Start server
const startServer = async (): Promise<void> => {
  await initializeApp();

  server.listen(PORT, () => {
    console.log(`🎬 SyncWatch API server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 CORS origins: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`);
  });
};

// Process-level error handling
process.on('uncaughtException', (error: Error) => {
  console.error('🚨 Uncaught Exception:', {
    error: error.message,
    stack: error.stack,
  });
  
  // Graceful shutdown
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('🚨 Unhandled Rejection:', {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined,
    promise: promise.toString(),
  });
  
  // Graceful shutdown
  gracefulShutdown('unhandledRejection');
});

// Graceful shutdown
const gracefulShutdown = async (signal: string): Promise<void> => {
  console.log(`🛑 Graceful shutdown initiated by ${signal}`);
  
  try {
    // Close server
    server.close(() => {
      console.log('✅ HTTP server closed');
    });

    // Close database connections
    await closeDatabase();
    
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start the application
if (require.main === module) {
  startServer().catch((error) => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  });
}

export { app, server, container }; 