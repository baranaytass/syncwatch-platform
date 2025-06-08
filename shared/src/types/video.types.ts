export type VideoEventType = 'PLAY' | 'PAUSE' | 'SEEK' | 'LOAD' | 'SYNC';

export interface VideoState {
  readonly currentTime: number;
  readonly isPlaying: boolean;
  readonly duration: number;
  readonly url: string;
  readonly playbackRate?: number;
  readonly volume?: number;
}

export interface VideoEvent {
  type: VideoEventType;
  sessionId: string;
  userId: string;
  timestamp: number;
  data: Partial<VideoState>;
}

export interface VideoSyncData {
  currentTime: number;
  isPlaying: boolean;
  timestamp: number;
  url?: string;
}

export interface VideoMetadata {
  url: string;
  title?: string;
  duration?: number;
  thumbnail?: string;
  platform?: 'youtube' | 'vimeo' | 'direct' | 'other';
} 