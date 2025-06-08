// Common types for the backend
export interface SessionData {
  id: string;
  userId: string;
  status: 'WAITING' | 'ACTIVE' | 'ENDED';
  participants: string[];
  videoUrl?: string;
  videoState?: VideoState;
  createdAt: Date;
  updatedAt?: Date;
}

export interface VideoState {
  currentTime: number;
  isPlaying: boolean;
  duration: number;
  url: string;
  lastUpdated: number;
}

export interface VideoEvent {
  type: 'PLAY' | 'PAUSE' | 'SEEK' | 'LOAD' | 'ENDED';
  sessionId: string;
  userId: string;
  data: {
    currentTime: number;
    url?: string;
    isPlaying?: boolean;
  };
  timestamp: number;
}

export interface AppError extends Error {
  statusCode: number;
  errorCode: string;
  isOperational: boolean;
  context?: Record<string, any>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
  timestamp: string;
}

export type Result<T, E = string> = 
  | { success: true; data: T }
  | { success: false; error: E };

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
} 