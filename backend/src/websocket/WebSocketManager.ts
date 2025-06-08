import { Server, Socket } from 'socket.io';
import { SOCKET_EVENTS } from '@syncwatch/shared';
import { logger } from '@/config/logger';

export class WebSocketManager {
  private io: Server;
  private sessions: Map<string, Set<string>> = new Map(); // sessionId -> Set of socketIds

  constructor(io: Server) {
    this.io = io;
  }

  public initialize(): void {
    this.io.on('connection', (socket: Socket) => {
      logger.info('Client connected', { socketId: socket.id });

      socket.on(SOCKET_EVENTS.JOIN_SESSION, (data) => {
        this.handleJoinSession(socket, data);
      });

      socket.on(SOCKET_EVENTS.LEAVE_SESSION, (data) => {
        this.handleLeaveSession(socket, data);
      });

      socket.on(SOCKET_EVENTS.VIDEO_EVENT, (data) => {
        this.handleVideoEvent(socket, data);
      });

      socket.on('disconnect', (reason) => {
        this.handleDisconnect(socket, reason);
      });
    });
  }

  private handleJoinSession(socket: Socket, data: { sessionId: string; userId: string }): void {
    const { sessionId, userId } = data;

    logger.info('User joining session via WebSocket', { sessionId, userId, socketId: socket.id });

    // Join the socket room
    socket.join(sessionId);

    // Add to sessions map
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, new Set());
    }
    this.sessions.get(sessionId)!.add(socket.id);

    // Store user info on socket
    socket.data = { sessionId, userId };

    // Notify other users in the session
    socket.to(sessionId).emit(SOCKET_EVENTS.USER_JOINED, {
      sessionId,
      userId,
    });

    // Send confirmation to the joining user
    socket.emit(SOCKET_EVENTS.SESSION_JOINED, {
      sessionId,
      participants: Array.from(this.sessions.get(sessionId) || []),
    });

    logger.info('User joined session successfully', { 
      sessionId, 
      userId, 
      participantCount: this.sessions.get(sessionId)?.size || 0 
    });
  }

  private handleLeaveSession(socket: Socket, data: { sessionId: string; userId: string }): void {
    const { sessionId, userId } = data;

    logger.info('User leaving session', { sessionId, userId, socketId: socket.id });

    socket.leave(sessionId);

    // Remove from sessions map
    if (this.sessions.has(sessionId)) {
      this.sessions.get(sessionId)!.delete(socket.id);
      
      if (this.sessions.get(sessionId)!.size === 0) {
        this.sessions.delete(sessionId);
      }
    }

    // Notify other users
    socket.to(sessionId).emit(SOCKET_EVENTS.USER_LEFT, {
      sessionId,
      userId,
    });

    socket.emit(SOCKET_EVENTS.SESSION_LEFT, { sessionId });
  }

  private handleVideoEvent(socket: Socket, event: any): void {
    const { sessionId } = socket.data || {};

    if (!sessionId) {
      socket.emit(SOCKET_EVENTS.ERROR, {
        message: 'Not in a session',
        code: 'NOT_IN_SESSION',
      });
      return;
    }

    logger.info('Video event received', { 
      sessionId, 
      userId: socket.data.userId,
      eventType: event.type,
      socketId: socket.id 
    });

    // Broadcast to all other users in the session
    socket.to(sessionId).emit(SOCKET_EVENTS.VIDEO_SYNC, {
      ...event.data,
      timestamp: Date.now(),
    });
  }

  private handleDisconnect(socket: Socket, reason: string): void {
    const { sessionId, userId } = socket.data || {};

    logger.info('Client disconnected', { 
      socketId: socket.id, 
      reason,
      sessionId,
      userId
    });

    if (sessionId) {
      // Remove from sessions map
      if (this.sessions.has(sessionId)) {
        this.sessions.get(sessionId)!.delete(socket.id);
        
        if (this.sessions.get(sessionId)!.size === 0) {
          this.sessions.delete(sessionId);
        }
      }

      // Notify other users if user was in a session
      if (userId) {
        socket.to(sessionId).emit(SOCKET_EVENTS.USER_LEFT, {
          sessionId,
          userId,
        });
      }
    }
  }

  public getSessionParticipants(sessionId: string): number {
    return this.sessions.get(sessionId)?.size || 0;
  }

  public getAllSessions(): string[] {
    return Array.from(this.sessions.keys());
  }
} 