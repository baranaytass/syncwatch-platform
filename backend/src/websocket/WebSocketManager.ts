import { Server, Socket } from 'socket.io';
import { VideoEvent, SessionData } from '../types';
import { ISessionService } from '../services/SessionService';
import { IVideoSyncService } from '../services/VideoSyncService';
import { BaseError } from '../utils/errors';

interface SocketData {
  sessionId?: string;
  userId?: string;
}

export interface IWebSocketManager {
  initialize(): void;
  broadcastToSession(sessionId: string, event: string, data: any, excludeSocketId?: string): void;
  getSessionParticipants(sessionId: string): number;
}

export class WebSocketManager implements IWebSocketManager {
  private readonly connectedUsers = new Map<string, Set<string>>(); // sessionId -> Set of socketIds

  constructor(
    private readonly io: Server,
    private readonly sessionService: ISessionService,
    private readonly videoSyncService: IVideoSyncService
  ) {}

  initialize(): void {
    this.io.on('connection', (socket: Socket) => {
      this.handleConnection(socket);
    });

    console.log('🔌 WebSocket manager initialized');
  }

  private handleConnection(socket: Socket): void {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Set up event handlers
    socket.on('join-session', (data) => this.handleJoinSession(socket, data));
    socket.on('leave-session', (data) => this.handleLeaveSession(socket, data));
    socket.on('video-event', (data) => this.handleVideoEvent(socket, data));
    socket.on('video-url-update', (data) => this.handleVideoUrlUpdate(socket, data));
    socket.on('refresh-session', (data) => this.handleRefreshSession(socket, data));
    socket.on('disconnect', (reason) => this.handleDisconnection(socket, reason));

    // Send welcome message
    socket.emit('connected', {
      socketId: socket.id,
      timestamp: Date.now()
    });
  }

  private async handleJoinSession(socket: Socket, data: any): Promise<void> {
    try {
      const { sessionId, userId } = data;

      if (!sessionId || !userId) {
        socket.emit('session-error', {
          message: 'Session ID and User ID are required',
          errorCode: 'VALIDATION_ERROR'
        });
        return;
      }

      console.log(`🎭 User ${userId} joining session ${sessionId} via WebSocket`);

      // Join the session using session service
      const joinResult = await this.sessionService.joinSession(sessionId, userId);
      
      if (!joinResult.success) {
        socket.emit('session-error', {
          message: joinResult.error.message,
          errorCode: joinResult.error.errorCode
        });
        return;
      }

      const session = joinResult.data;

      // Join socket room
      socket.join(sessionId);
      socket.data = { sessionId, userId } as SocketData;

      // Track connected users
      if (!this.connectedUsers.has(sessionId)) {
        this.connectedUsers.set(sessionId, new Set());
      }
      this.connectedUsers.get(sessionId)!.add(socket.id);

      // Prepare session data to send
      const sessionDataToSend = {
        id: session.id,
        userId: session.userId,
        status: session.status,
        createdAt: session.createdAt,
        participants: session.participants,
        videoUrl: session.videoUrl,
      };

      // Notify user they joined successfully
      console.log(`📤 Sending session-joined to ${socket.id}:`, sessionDataToSend);
      socket.emit('session-joined', {
        sessionId,
        sessionData: sessionDataToSend
      });

      // Notify other users in the session
      console.log(`📤 Broadcasting user-joined to room ${sessionId} (excluding ${socket.id})`);
      socket.to(sessionId).emit('user-joined', {
        sessionId,
        userId,
        sessionData: sessionDataToSend
      });

      // Send current video state if available
      if (session.videoState) {
        socket.emit('video-sync', {
          sessionId,
          videoState: session.videoState,
          timestamp: Date.now()
        });
      }

      console.log(`✅ User ${userId} joined session ${sessionId} successfully`);

    } catch (error) {
      console.error('💥 Error handling join session:', error);
      socket.emit('session-error', {
        message: 'Failed to join session',
        errorCode: 'INTERNAL_ERROR'
      });
    }
  }

  private async handleLeaveSession(socket: Socket, data: any): Promise<void> {
    try {
      const { sessionId, userId } = data || socket.data || {};
      
      if (!sessionId || !userId) {
        return;
      }

      console.log(`👋 User ${userId} leaving session ${sessionId}`);

      // Leave the session using session service
      const leaveResult = await this.sessionService.leaveSession(sessionId, userId);
      
      if (!leaveResult.success) {
        socket.emit('session-error', {
          message: leaveResult.error.message,
          errorCode: leaveResult.error.errorCode
        });
        return;
      }

      const session = leaveResult.data;

      // Leave socket room
      socket.leave(sessionId);
      socket.data = {};

      // Remove from connected users tracking
      if (this.connectedUsers.has(sessionId)) {
        this.connectedUsers.get(sessionId)!.delete(socket.id);
        if (this.connectedUsers.get(sessionId)!.size === 0) {
          this.connectedUsers.delete(sessionId);
        }
      }

      // Prepare session data to send
      const sessionDataToSend = {
        id: session.id,
        userId: session.userId,
        status: session.status,
        createdAt: session.createdAt,
        participants: session.participants,
        videoUrl: session.videoUrl,
      };

      // Notify other users in the session
      socket.to(sessionId).emit('user-left', {
        sessionId,
        userId,
        sessionData: sessionDataToSend
      });

      console.log(`✅ User ${userId} left session ${sessionId} successfully`);

    } catch (error) {
      console.error('💥 Error handling leave session:', error);
    }
  }

  private async handleVideoUrlUpdate(socket: Socket, data: any): Promise<void> {
    try {
      const { sessionId, videoUrl, userId } = data;

      if (!sessionId || !videoUrl || !userId) {
        socket.emit('session-error', {
          message: 'Session ID, Video URL and User ID are required',
          errorCode: 'VALIDATION_ERROR'
        });
        return;
      }

      console.log(`📺 Video URL update request: ${videoUrl} in session ${sessionId} by ${userId}`);

      // Update video URL using session service
      const updateResult = await this.sessionService.setVideoUrl(sessionId, videoUrl);
      
      if (!updateResult.success) {
        socket.emit('session-error', {
          message: updateResult.error.message,
          errorCode: updateResult.error.errorCode
        });
        return;
      }

      const session = updateResult.data;

      console.log(`📺 Video URL updated in session ${sessionId}: ${videoUrl}`);

      // Prepare session data to send
      const sessionDataToSend = {
        id: session.id,
        userId: session.userId,
        status: session.status,
        createdAt: session.createdAt,
        participants: session.participants,
        videoUrl: session.videoUrl,
      };

      // Notify all participants (including sender)
      this.io.to(sessionId).emit('video-url-updated', {
        sessionId,
        videoUrl,
        updatedBy: userId,
        sessionData: sessionDataToSend
      });

    } catch (error) {
      console.error('💥 Error handling video URL update:', error);
      socket.emit('session-error', {
        message: 'Failed to update video URL',
        errorCode: 'INTERNAL_ERROR'
      });
    }
  }

  private async handleRefreshSession(socket: Socket, data: any): Promise<void> {
    try {
      const { sessionId } = data;

      if (!sessionId) {
        socket.emit('session-error', {
          message: 'Session ID is required',
          errorCode: 'VALIDATION_ERROR'
        });
        return;
      }

      // Get session using session service
      const sessionResult = await this.sessionService.getSession(sessionId);
      
      if (!sessionResult.success) {
        socket.emit('session-error', {
          message: sessionResult.error.message,
          errorCode: sessionResult.error.errorCode
        });
        return;
      }

      const session = sessionResult.data;

      // Prepare session data to send
      const sessionDataToSend = {
        id: session.id,
        userId: session.userId,
        status: session.status,
        createdAt: session.createdAt,
        participants: session.participants,
        videoUrl: session.videoUrl,
      };

      socket.emit('session-refreshed', {
        sessionId,
        sessionData: sessionDataToSend
      });

    } catch (error) {
      console.error('💥 Error handling refresh session:', error);
      socket.emit('session-error', {
        message: 'Failed to refresh session',
        errorCode: 'INTERNAL_ERROR'
      });
    }
  }

  private async handleVideoEvent(socket: Socket, eventData: any): Promise<void> {
    try {
      const socketData = socket.data as SocketData;
      const { sessionId, userId } = socketData;

      if (!sessionId || !userId) {
        socket.emit('session-error', {
          message: 'Not in a session',
          errorCode: 'NOT_IN_SESSION'
        });
        return;
      }

      console.log(`📹 Video event in session ${sessionId}:`, eventData);

      // Transform frontend event format to backend expected format
      const transformedEvent = {
        type: eventData.type,
        sessionId: sessionId,
        userId: userId,
        timestamp: eventData.timestamp || Date.now(),
        data: {
          currentTime: eventData.currentTime || 0,
          isPlaying: eventData.type === 'PLAY',
          url: eventData.url,
          duration: eventData.duration,
        }
      };

      // Use video sync service to handle the event
      const syncResult = await this.videoSyncService.handleVideoEvent(
        sessionId, 
        transformedEvent, 
        userId
      );

      if (!syncResult.success) {
        socket.emit('session-error', {
          message: syncResult.error.message,
          errorCode: syncResult.error.errorCode
        });
        return;
      }

      // Broadcast to all other users in the session (excluding sender)
      socket.to(sessionId).emit('video-sync', {
        ...eventData,
        timestamp: Date.now(),
      });

    } catch (error) {
      console.error('💥 Error handling video event:', error);
      socket.emit('session-error', {
        message: 'Failed to handle video event',
        errorCode: 'INTERNAL_ERROR'
      });
    }
  }

  private handleDisconnection(socket: Socket, reason: string): void {
    const socketData = socket.data as SocketData;
    const { sessionId, userId } = socketData || {};
    
    console.log(`🔌 Client disconnected: ${socket.id}, reason: ${reason}`);
    
    if (sessionId && userId) {
      // Auto-leave session on disconnect
      this.handleUserDisconnection(sessionId, userId, socket.id);
    }
  }

  private async handleUserDisconnection(sessionId: string, userId: string, socketId: string): Promise<void> {
    try {
      console.log(`🔌 Auto-leaving session ${sessionId} for disconnected user ${userId}`);

      // Leave the session using session service
      const leaveResult = await this.sessionService.leaveSession(sessionId, userId);
      
      if (leaveResult.success) {
        const session = leaveResult.data;

        // Remove from connected users tracking
        if (this.connectedUsers.has(sessionId)) {
          this.connectedUsers.get(sessionId)!.delete(socketId);
          if (this.connectedUsers.get(sessionId)!.size === 0) {
            this.connectedUsers.delete(sessionId);
          }
        }

        // Prepare session data to send
        const sessionDataToSend = {
          id: session.id,
          userId: session.userId,
          status: session.status,
          createdAt: session.createdAt,
          participants: session.participants,
          videoUrl: session.videoUrl,
        };

        // Notify other users in the session
        this.io.to(sessionId).emit('user-left', {
          sessionId,
          userId,
          sessionData: sessionDataToSend
        });

        console.log(`✅ User ${userId} auto-left session ${sessionId} on disconnect`);
      }

    } catch (error) {
      console.error('💥 Error handling user disconnection:', error);
    }
  }

  // Public methods
  broadcastToSession(sessionId: string, event: string, data: any, excludeSocketId?: string): void {
    if (excludeSocketId) {
      this.io.to(sessionId).except(excludeSocketId).emit(event, data);
    } else {
      this.io.to(sessionId).emit(event, data);
    }
  }

  getSessionParticipants(sessionId: string): number {
    return this.connectedUsers.get(sessionId)?.size || 0;
  }

  getActiveSessions(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  disconnectUser(userId: string): void {
    // Find and disconnect all sockets for this user
    this.io.sockets.sockets.forEach((socket) => {
      const socketData = socket.data as SocketData;
      if (socketData?.userId === userId) {
        socket.disconnect(true);
      }
    });
  }
} 