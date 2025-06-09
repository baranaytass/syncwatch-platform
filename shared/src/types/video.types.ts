export type VideoEventType = 'PLAY' | 'PAUSE' | 'SEEK' | 'LOAD' | 'SYNC';

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
  provider?: VideoProvider;
}

export interface VideoProviderConfig {
  provider: VideoProvider;
  url: string;
  videoId?: string; // For YouTube, Vimeo etc.
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

export interface VideoMetadata {
  url: string;
  title?: string;
  duration?: number;
  thumbnail?: string;
  platform?: 'youtube' | 'vimeo' | 'direct' | 'other';
}

export interface ProviderDetectionResult {
  provider: VideoProvider;
  providerInfo: {
    name: string;
    displayName: string;
    icon: string;
  };
} 