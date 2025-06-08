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
        socket.emit('error', {
          message: 'Session ID and User ID are required',
          code: 'VALIDATION_ERROR'
        });
        return;
      }

      console.log(`🎭 User ${userId} joining session ${sessionId} via WebSocket`);

      // Join the session using session service
      const joinResult = await this.sessionService.joinSession(sessionId, userId);
      
      if (!joinResult.success) {
        socket.emit('error', {
          message: joinResult.error.message,
          code: joinResult.error.errorCode
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

      // Notify user they joined successfully
      socket.emit('session-joined', {
        sessionId,
        session,
        participants: session.participants,
        participantCount: session.participants.length
      });

      // Notify other users in the session
      socket.to(sessionId).emit('user-joined', {
        sessionId,
        userId,
        participantCount: session.participants.length,
        participants: session.participants
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
      console.error('Error handling join session:', error);
      socket.emit('error', {
        message: 'Failed to join session',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  private async handleLeaveSession(socket: Socket, data: any): Promise<void> {
    try {
      const { sessionId, userId } = data;
      
      if (!sessionId || !userId) {
        socket.emit('error', {
          message: 'Session ID and User ID are required',
          code: 'VALIDATION_ERROR'
        });
        return;
      }

      console.log(`👋 User ${userId} leaving session ${sessionId}`);

      // Leave the session using session service
      const leaveResult = await this.sessionService.leaveSession(sessionId, userId);
      
      if (!leaveResult.success) {
        socket.emit('error', {
          message: leaveResult.error.message,
          code: leaveResult.error.errorCode
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

      // Notify user they left successfully
      socket.emit('session-left', {
        sessionId,
        message: 'Left session successfully'
      });

      // Notify other users in the session
      socket.to(sessionId).emit('user-left', {
        sessionId,
        userId,
        participantCount: session.participants.length,
        participants: session.participants
      });

      console.log(`✅ User ${userId} left session ${sessionId} successfully`);

    } catch (error) {
      console.error('Error handling leave session:', error);
      socket.emit('error', {
        message: 'Failed to leave session',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  private async handleVideoEvent(socket: Socket, eventData: any): Promise<void> {
    try {
      const socketData = socket.data as SocketData;
      const { sessionId, userId } = socketData;

      if (!sessionId || !userId) {
        socket.emit('error', {
          message: 'Not in a session',
          code: 'NOT_IN_SESSION'
        });
        return;
      }

      console.log(`📹 Video event in session ${sessionId}:`, {
        eventType: eventData.type,
        userId,
        currentTime: eventData.currentTime
      });

      // Create video event object
      const videoEvent: VideoEvent = {
        type: eventData.type,
        sessionId,
        userId,
        data: {
          currentTime: eventData.currentTime,
          url: eventData.url
        },
        timestamp: eventData.timestamp || Date.now()
      };

      // Handle the video event using video sync service
      const result = await this.videoSyncService.handleVideoEvent(sessionId, videoEvent, userId);
      
      if (!result.success) {
        socket.emit('error', {
          message: result.error.message,
          code: result.error.errorCode
        });
        return;
      }

      const newVideoState = result.data;

      // Broadcast the synchronized video state to all other users in the session
      this.broadcastToSession(sessionId, 'video-sync', {
        type: eventData.type,
        currentTime: newVideoState.currentTime,
        isPlaying: newVideoState.isPlaying,
        timestamp: Date.now(),
        triggeredBy: userId
      }, socket.id);

      // Confirm to the sender
      socket.emit('video-event-processed', {
        sessionId,
        eventType: eventData.type,
        videoState: newVideoState,
        timestamp: Date.now()
      });

      console.log(`✅ Video event processed successfully in session ${sessionId}`);

    } catch (error) {
      console.error('Error handling video event:', error);
      socket.emit('error', {
        message: 'Failed to process video event',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  private handleDisconnection(socket: Socket, reason: string): void {
    const socketData = socket.data as SocketData;
    const { sessionId, userId } = socketData;

    console.log(`🔌 Client disconnected: ${socket.id}, reason: ${reason}`);

    if (sessionId && userId) {
      // Handle disconnection asynchronously
      this.handleUserDisconnection(sessionId, userId, socket.id)
        .catch(error => {
          console.error('Error handling user disconnection:', error);
        });
    }
  }

  private async handleUserDisconnection(sessionId: string, userId: string, socketId: string): Promise<void> {
    try {
      // Remove from connected users tracking
      if (this.connectedUsers.has(sessionId)) {
        this.connectedUsers.get(sessionId)!.delete(socketId);
        
        // Check if user has other connections
        const sessionConnections = this.connectedUsers.get(sessionId)!;
        const userStillConnected = Array.from(sessionConnections).some(connSocketId => {
          const connSocket = this.io.sockets.sockets.get(connSocketId);
          const connSocketData = connSocket?.data as SocketData;
          return connSocketData?.userId === userId;
        });

        // If user has no more connections, remove them from session
        if (!userStillConnected) {
          console.log(`🚪 User ${userId} fully disconnected from session ${sessionId}`);
          
          const leaveResult = await this.sessionService.leaveSession(sessionId, userId);
          
          if (leaveResult.success) {
            // Notify other users in the session
            this.io.to(sessionId).emit('user-left', {
              sessionId,
              userId,
              participantCount: leaveResult.data.participants.length,
              participants: leaveResult.data.participants,
              reason: 'disconnected'
            });
          }
        }

        // Clean up empty session tracking
        if (sessionConnections.size === 0) {
          this.connectedUsers.delete(sessionId);
        }
      }
    } catch (error) {
      console.error('Error in handleUserDisconnection:', error);
    }
  }

  // Public methods for broadcasting
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

  // Method to get all active sessions
  getActiveSessions(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  // Method to force disconnect a user from all sessions
  disconnectUser(userId: string): void {
    for (const [sessionId, socketIds] of this.connectedUsers.entries()) {
      for (const socketId of socketIds) {
        const socket = this.io.sockets.sockets.get(socketId);
        const socketData = socket?.data as SocketData;
        
        if (socketData?.userId === userId) {
          socket?.disconnect(true);
          console.log(`🔌 Force disconnected user ${userId} from session ${sessionId}`);
        }
      }
    }
  }
} 