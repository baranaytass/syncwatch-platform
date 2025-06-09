export interface VideoState {
  currentTime: number;
  isPlaying: boolean;
  duration: number;
  url: string;
  provider: string;
  lastUpdated: number;
}

export interface SessionData {
  id: string;
  userId: string;
  status: 'WAITING' | 'ACTIVE' | 'ENDED';
  createdAt: Date;
  participants: string[];
  videoUrl?: string;
  videoState?: VideoState;
  currentVideoTime?: number;
  isPlaying?: boolean;
}

export interface CreateSessionRequest {
  userId: string;
}

export interface CreateSessionResponse {
  success: boolean;
  data?: {
    sessionId: string;
    userId: string;
    status: string;
  };
  error?: string;
}

export interface JoinSessionRequest {
  sessionId: string;
  userId: string;
}

export interface JoinSessionResponse {
  success: boolean;
  data?: SessionData;
  error?: string;
}

export interface VideoUrlUpdateRequest {
  sessionId: string;
  videoUrl: string;
}

export interface VideoUrlUpdateResponse {
  success: boolean;
  error?: string;
}

export interface SessionContextType {
  currentSession: SessionData | null;
  isLoading: boolean;
  error: string | null;
  userId: string; // Current user ID'yi expose ediyoruz
  createSession: () => Promise<void>; // Artık parametre almıyor, otomatik userId kullanıyor
  joinSession: (sessionId: string, userId?: string) => Promise<void>; // userId opsiyonel
  refreshSession: (sessionId: string) => Promise<void>; // ✅ Session yenileme
  updateVideoUrl: (videoUrl: string) => Promise<void>;
  leaveSession: () => void;
} 