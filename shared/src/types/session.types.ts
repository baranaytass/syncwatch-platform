export type SessionStatus = 'WAITING' | 'ACTIVE' | 'ENDED';

export interface SessionData {
  id: string;
  userId: string;
  status: SessionStatus;
  participants: string[];
  videoUrl?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface CreateSessionRequest {
  userId: string;
}

export interface JoinSessionRequest {
  sessionId: string;
  userId: string;
}

export interface SessionParticipant {
  userId: string;
  joinedAt: Date;
  isHost: boolean;
} 