import { io, Socket } from 'socket.io-client';
import { SessionData } from '../types/session.types';

export interface WebSocketEvents {
  // Session events
  'session-joined': (data: { sessionId: string; sessionData: SessionData }) => void;
  'user-joined': (data: { sessionId: string; userId: string; sessionData: SessionData }) => void;
  'user-left': (data: { sessionId: string; userId: string; sessionData: SessionData }) => void;
  'session-refreshed': (data: { sessionId: string; sessionData: SessionData }) => void;
  'session-error': (data: { message: string; errorCode?: string }) => void;
  
  // Video events
  'video-url-updated': (data: { 
    sessionId: string; 
    videoUrl: string; 
    updatedBy: string; 
    sessionData: SessionData 
  }) => void;
  'video-sync': (data: {
    type: 'PLAY' | 'PAUSE' | 'SEEK' | 'LOAD';
    currentTime?: number;
    timestamp: number;
  }) => void;
}

class WebSocketService {
  private socket: Socket | null = null;
  private currentSessionId: string | null = null;
  private currentUserId: string | null = null;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor() {
    this.connect();
  }

  // ✅ Socket.IO connection
  private connect(): void {
    const serverUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    
    this.socket = io(serverUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('🔌 WebSocket connected:', this.socket?.id);
      console.log('🔌 WebSocket connection status:', this.socket?.connected);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('🚨 WebSocket connection error:', error);
    });

    // Register all event listeners
    this.setupEventListeners();
  }

  // ✅ Event listeners setup
  private setupEventListeners(): void {
    if (!this.socket) return;

    // Session events
    this.socket.on('session-joined', (data) => {
      console.log('📥 WebSocket received session-joined:', data);
      this.emit('session-joined', data);
    });

    this.socket.on('user-joined', (data) => {
      console.log('📥 WebSocket received user-joined:', data);
      this.emit('user-joined', data);
    });

    this.socket.on('user-left', (data) => {
      console.log('📥 WebSocket received user-left:', data);
      this.emit('user-left', data);
    });

    this.socket.on('session-refreshed', (data) => {
      console.log('🔄 Session refreshed:', data);
      this.emit('session-refreshed', data);
    });

    this.socket.on('session-error', (data) => {
      console.error('❌ Session error:', data);
      this.emit('session-error', data);
    });

    // Video events
    this.socket.on('video-url-updated', (data) => {
      console.log('📺 Video URL updated:', data);
      this.emit('video-url-updated', data);
    });

    this.socket.on('video-sync', (data) => {
      console.log('📹 Video sync event:', data);
      this.emit('video-sync', data);
    });
  }

  // ✅ Event emitter for internal use
  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error(`Error in WebSocket event listener for ${event}:`, error);
      }
    });
  }

  // ✅ Subscribe to events
  on<K extends keyof WebSocketEvents>(event: K, listener: WebSocketEvents[K]): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  // ✅ Unsubscribe from events
  off<K extends keyof WebSocketEvents>(event: K, listener: WebSocketEvents[K]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // ✅ Join session via WebSocket
  joinSession(sessionId: string, userId: string): void {
    if (!this.socket) {
      console.error('WebSocket not connected');
      return;
    }

    console.log(`🔗 Joining session via WebSocket: ${sessionId}`);
    
    this.currentSessionId = sessionId;
    this.currentUserId = userId;
    
    this.socket.emit('join-session', { sessionId, userId });
  }

  // ✅ Leave session via WebSocket
  leaveSession(): void {
    if (!this.socket || !this.currentSessionId || !this.currentUserId) {
      return;
    }

    console.log(`👋 Leaving session via WebSocket: ${this.currentSessionId}`);
    
    this.socket.emit('leave-session', {
      sessionId: this.currentSessionId,
      userId: this.currentUserId,
    });

    this.currentSessionId = null;
    this.currentUserId = null;
  }

  // ✅ Refresh session data
  refreshSession(sessionId: string): void {
    if (!this.socket) {
      console.error('WebSocket not connected');
      return;
    }

    console.log(`🔄 Refreshing session via WebSocket: ${sessionId}`);
    this.socket.emit('refresh-session', { sessionId });
  }

  // ✅ Update video URL
  updateVideoUrl(sessionId: string, videoUrl: string, userId: string): void {
    if (!this.socket) {
      console.error('WebSocket not connected');
      return;
    }

    console.log(`📺 Updating video URL via WebSocket: ${videoUrl}`);
    this.socket.emit('video-url-update', { sessionId, videoUrl, userId });
  }

  // ✅ Send video events
  sendVideoEvent(event: {
    type: 'PLAY' | 'PAUSE' | 'SEEK' | 'LOAD';
    currentTime?: number;
  }): void {
    if (!this.socket || !this.currentSessionId) {
      console.error('WebSocket not connected or not in session');
      return;
    }

    console.log(`📹 Sending video event:`, event);
    this.socket.emit('video-event', event);
  }

  // ✅ Get connection status
  get isConnected(): boolean {
    return this.socket?.connected || false;
  }

  get sessionId(): string | null {
    return this.currentSessionId;
  }

  get userId(): string | null {
    return this.currentUserId;
  }

  // ✅ Cleanup
  disconnect(): void {
    if (this.socket) {
      this.leaveSession();
      this.socket.disconnect();
      this.socket = null;
    }
    this.eventListeners.clear();
    this.currentSessionId = null;
    this.currentUserId = null;
  }
}

// Singleton instance
export const webSocketService = new WebSocketService();
export default webSocketService; 