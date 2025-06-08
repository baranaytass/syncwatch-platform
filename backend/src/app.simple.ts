import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

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

// Basic middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));
app.use(express.json());

// Simple routes
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'syncwatch-api',
  });
});

app.post('/api/sessions', (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
        errorCode: 'VALIDATION_ERROR',
      });
    }
    
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    console.log(`🎬 Session created: ${sessionId} for user: ${userId}`);
    
    return res.status(201).json({
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
    console.error('💥 Error creating session:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      errorCode: 'INTERNAL_SERVER_ERROR',
    });
  }
});

app.post('/api/sessions/:sessionId/join', (req, res) => {
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
    
    console.log(`👤 User ${userId} joining session: ${sessionId}`);
    
    return res.json({
      success: true,
      data: {
        sessionId,
        userId,
        message: 'Joined session successfully',
      },
    });
  } catch (error) {
    console.error('💥 Error joining session:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      errorCode: 'INTERNAL_SERVER_ERROR',
    });
  }
});

// Basic WebSocket handling
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  socket.on('join-session', (data) => {
    const { sessionId, userId } = data;
    console.log(`🎭 User ${userId} joining session ${sessionId} via WebSocket`);
    
    socket.join(sessionId);
    socket.data = { sessionId, userId };
    
    socket.to(sessionId).emit('user-joined', { sessionId, userId });
    socket.emit('session-joined', { sessionId });
  });

  socket.on('video-event', (event) => {
    const { sessionId } = socket.data || {};
    
    if (!sessionId) {
      socket.emit('error', { message: 'Not in a session' });
      return;
    }
    
    console.log(`📹 Video event in session ${sessionId}:`, event);
    
    // Broadcast to all other users in the session
    socket.to(sessionId).emit('video-sync', {
      ...event,
      timestamp: Date.now(),
    });
  });

  socket.on('disconnect', (reason) => {
    const { sessionId, userId } = socket.data || {};
    console.log(`🔌 Client disconnected: ${socket.id}, reason: ${reason}`);
    
    if (sessionId && userId) {
      socket.to(sessionId).emit('user-left', { sessionId, userId });
    }
  });
});

// Global Error Handling
app.use((req, res) => {
  console.log(`❌ 404 - Route not found: ${req.method} ${req.url}`);
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.url} not found`,
    errorCode: 'ROUTE_NOT_FOUND',
  });
});

app.use((err: any, req: any, res: any, next: any) => {
  console.error('💥 Global Error Handler:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      errorCode: 'VALIDATION_ERROR',
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      errorCode: 'UNAUTHORIZED',
    });
  }
  
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    errorCode: 'INTERNAL_SERVER_ERROR',
  });
});

// Process-level error handling
process.on('uncaughtException', (error: Error) => {
  console.error('🚨 Uncaught Exception:', {
    error: error.message,
    stack: error.stack,
  });
  // Graceful shutdown
  process.exit(1);
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('🚨 Unhandled Rejection:', {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined,
    promise: promise.toString(),
  });
  // Graceful shutdown
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('💤 HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('💤 HTTP server closed');
    process.exit(0);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 SyncWatch API server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS Origin: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`);
});

export { app, server, io }; 