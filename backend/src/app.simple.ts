import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// ✅ In-Memory Session Store
interface SessionData {
  id: string;
  userId: string; // session creator
  status: 'WAITING' | 'ACTIVE' | 'ENDED';
  participants: string[];
  videoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const sessionStore = new Map<string, SessionData>();

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
    
    // ✅ Session store'a kaydet
    const sessionData: SessionData = {
      id: sessionId,
      userId,
      status: 'WAITING',
      participants: [userId], // Creator otomatik participant
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    sessionStore.set(sessionId, sessionData);
    
    console.log(`🎬 Session created and stored: ${sessionId} for user: ${userId}`);
    console.log(`📊 Session data:`, sessionData);
    
    return res.status(201).json({
      success: true,
      data: {
        sessionId,
        userId,
        status: 'WAITING',
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
    
    // ✅ Session store'dan session getir
    const session = sessionStore.get(sessionId);
    
    if (!session) {
      console.log(`❌ Session not found: ${sessionId}`);
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        errorCode: 'SESSION_NOT_FOUND',
      });
    }
    
    // ✅ User'ı participants'a ekle (duplicate check)
    if (!session.participants.includes(userId)) {
      session.participants.push(userId);
    }
    
    // ✅ Session'ı aktif yap ve güncelle
    session.status = 'ACTIVE';
    session.updatedAt = new Date();
    sessionStore.set(sessionId, session);
    
    console.log(`✅ User ${userId} joined session: ${sessionId}`);
    console.log(`📊 Updated session data:`, session);
    console.log(`👥 Current participants:`, session.participants);
    
    // ✅ Güncel session data'yı dön
    return res.json({
      success: true,
      data: {
        id: session.id,
        userId: session.userId, // Session creator'ı
        status: session.status,
        createdAt: session.createdAt,
        participants: session.participants, // ✅ Tüm katılımcılar
        videoUrl: session.videoUrl,
      },
      message: 'Joined session successfully',
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

// ✅ Session bilgisi getirme endpoint'i
app.get('/api/sessions/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = sessionStore.get(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        errorCode: 'SESSION_NOT_FOUND',
      });
    }
    
    console.log(`📊 Session info requested: ${sessionId}`);
    console.log(`👥 Current participants:`, session.participants);
    
    return res.json({
      success: true,
      data: {
        id: session.id,
        userId: session.userId,
        status: session.status,
        createdAt: session.createdAt,
        participants: session.participants,
        videoUrl: session.videoUrl,
      },
    });
  } catch (error) {
    console.error('💥 Error getting session:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      errorCode: 'INTERNAL_SERVER_ERROR',
    });
  }
});

// ✅ Advanced WebSocket Session Management
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // ✅ Session'a WebSocket ile join olma
  socket.on('join-session', (data) => {
    const { sessionId, userId } = data;
    console.log(`🎭 User ${userId} joining session ${sessionId} via WebSocket`);
    
    // Session'ın var olup olmadığını kontrol et
    const session = sessionStore.get(sessionId);
    if (!session) {
      socket.emit('session-error', { 
        message: 'Session not found',
        errorCode: 'SESSION_NOT_FOUND' 
      });
      return;
    }

    // Socket'i session room'una ekle
    socket.join(sessionId);
    socket.data = { sessionId, userId };
    
    // User'ı participants'a ekle (eğer yoksa)
    if (!session.participants.includes(userId)) {
      session.participants.push(userId);
      session.status = 'ACTIVE';
      session.updatedAt = new Date();
      sessionStore.set(sessionId, session);
      
      console.log(`✅ User ${userId} added to session ${sessionId}`);
      console.log(`👥 Updated participants:`, session.participants);
    }

    // Güncel session data'yı gönder
    const sessionDataToSend = {
      id: session.id,
      userId: session.userId,
      status: session.status,
      createdAt: session.createdAt,
      participants: session.participants,
      videoUrl: session.videoUrl,
    };

    console.log(`📤 Sending session-joined to ${socket.id}:`, sessionDataToSend);
    socket.emit('session-joined', { 
      sessionId,
      sessionData: sessionDataToSend
    });

    // Diğer katılımcılara bildir
    console.log(`📤 Broadcasting user-joined to room ${sessionId} (excluding ${socket.id})`);
    socket.to(sessionId).emit('user-joined', { 
      sessionId, 
      userId,
      sessionData: sessionDataToSend
    });
  });

  // ✅ Session'dan ayrılma
  socket.on('leave-session', (data) => {
    const { sessionId, userId } = data || socket.data || {};
    
    if (!sessionId || !userId) return;
    
    console.log(`👋 User ${userId} leaving session ${sessionId}`);
    
    const session = sessionStore.get(sessionId);
    if (session) {
      // User'ı participants'tan çıkar
      session.participants = session.participants.filter(p => p !== userId);
      session.updatedAt = new Date();
      
      // Eğer kimse kalmadıysa session'ı sonlandır
      if (session.participants.length === 0) {
        session.status = 'ENDED';
        console.log(`🏁 Session ${sessionId} ended - no participants left`);
      }
      
      sessionStore.set(sessionId, session);
      
      // Room'dan çık
      socket.leave(sessionId);
      
      // Diğer katılımcılara bildir
      socket.to(sessionId).emit('user-left', { 
        sessionId, 
        userId,
        sessionData: {
          id: session.id,
          userId: session.userId,
          status: session.status,
          createdAt: session.createdAt,
          participants: session.participants,
          videoUrl: session.videoUrl,
        }
      });
    }
  });

  // ✅ Video URL güncelleme
  socket.on('video-url-update', (data) => {
    const { sessionId, videoUrl, userId } = data;
    const session = sessionStore.get(sessionId);
    
    if (!session) {
      socket.emit('session-error', { 
        message: 'Session not found',
        errorCode: 'SESSION_NOT_FOUND' 
      });
      return;
    }

    // Video URL'i güncelle
    session.videoUrl = videoUrl;
    session.status = 'ACTIVE';
    session.updatedAt = new Date();
    sessionStore.set(sessionId, session);

    console.log(`📺 Video URL updated in session ${sessionId}: ${videoUrl}`);

    // Tüm katılımcılara bildir (kendisi dahil)
    io.to(sessionId).emit('video-url-updated', {
      sessionId,
      videoUrl,
      updatedBy: userId,
      sessionData: {
        id: session.id,
        userId: session.userId,
        status: session.status,
        createdAt: session.createdAt,
        participants: session.participants,
        videoUrl: session.videoUrl,
      }
    });
  });

  // ✅ Video events (play, pause, seek)
  socket.on('video-event', (event) => {
    const { sessionId } = socket.data || {};
    
    if (!sessionId) {
      socket.emit('session-error', { message: 'Not in a session' });
      return;
    }
    
    console.log(`📹 Video event in session ${sessionId}:`, event);
    
    // Broadcast to all other users in the session (excluding sender)
    socket.to(sessionId).emit('video-sync', {
      ...event,
      timestamp: Date.now(),
    });
  });

  // ✅ Session bilgisi refresh request
  socket.on('refresh-session', (data) => {
    const { sessionId } = data;
    const session = sessionStore.get(sessionId);
    
    if (!session) {
      socket.emit('session-error', { 
        message: 'Session not found',
        errorCode: 'SESSION_NOT_FOUND' 
      });
      return;
    }

    socket.emit('session-refreshed', {
      sessionId,
      sessionData: {
        id: session.id,
        userId: session.userId,
        status: session.status,
        createdAt: session.createdAt,
        participants: session.participants,
        videoUrl: session.videoUrl,
      }
    });
  });

  // ✅ Disconnect handling
  socket.on('disconnect', (reason) => {
    const { sessionId, userId } = socket.data || {};
    console.log(`🔌 Client disconnected: ${socket.id}, reason: ${reason}`);
    
    if (sessionId && userId) {
      // Auto-leave session on disconnect
      const session = sessionStore.get(sessionId);
      if (session) {
        session.participants = session.participants.filter(p => p !== userId);
        session.updatedAt = new Date();
        
        if (session.participants.length === 0) {
          session.status = 'ENDED';
          console.log(`🏁 Session ${sessionId} ended - last user disconnected`);
        }
        
        sessionStore.set(sessionId, session);
        
        // Diğer katılımcılara bildir
        socket.to(sessionId).emit('user-left', { 
          sessionId, 
          userId,
          sessionData: {
            id: session.id,
            userId: session.userId,
            status: session.status,
            createdAt: session.createdAt,
            participants: session.participants,
            videoUrl: session.videoUrl,
          }
        });
      }
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