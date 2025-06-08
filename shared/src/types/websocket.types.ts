import { VideoEvent, VideoSyncData } from './video.types';
import { SessionData } from './session.types';

export interface SocketEvents {
  // Connection events
  'connect': () => void;
  'disconnect': (reason: string) => void;
  
  // Session events
  'join-session': (data: { sessionId: string; userId: string }) => void;
  'leave-session': (data: { sessionId: string; userId: string }) => void;
  'session-joined': (data: { session: SessionData; participants: string[] }) => void;
  'session-left': (data: { sessionId: string; userId: string }) => void;
  'user-joined': (data: { sessionId: string; userId: string }) => void;
  'user-left': (data: { sessionId: string; userId: string }) => void;
  
  // Video events
  'video-event': (event: VideoEvent) => void;
  'video-sync': (data: VideoSyncData) => void;
  'video-url-changed': (data: { sessionId: string; url: string; userId: string }) => void;
  
  // Error events
  'error': (error: { message: string; code?: string; details?: any }) => void;
}

export type SocketEventName = keyof SocketEvents;

export interface SocketResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
} 