// Video Provider Types
export type VideoProvider = 'html5' | 'youtube' | 'vimeo' | 'ownmedia';

export interface VideoState {
  readonly currentTime: number;
  readonly isPlaying: boolean;
  readonly duration: number;
  readonly url: string;
  readonly provider: VideoProvider;
  readonly playbackRate?: number;
  readonly volume?: number;
  readonly lastUpdated: number;
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

export interface VideoProviderConfig {
  provider: VideoProvider;
  url: string;
  videoId?: string;
  metadata?: {
    title?: string;
    duration?: number;
    thumbnail?: string;
  };
}

export interface VideoProviderCapabilities {
  canPlay: boolean;
  canPause: boolean;
  canSeek: boolean;
  canSetVolume: boolean;
  canSetPlaybackRate: boolean;
  supportsFullscreen: boolean;
}

export interface VideoProviderInfo {
  name: string;
  displayName: string;
  icon: string;
  supportedUrls: RegExp[];
  capabilities: VideoProviderCapabilities;
  description: string;
}

export interface ProviderDetectionResult {
  provider: VideoProvider;
  providerInfo: {
    name: string;
    displayName: string;
    icon: string;
  };
}

// Session Types
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