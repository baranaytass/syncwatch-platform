import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { SessionData, SessionContextType } from '../types/session.types';
import { apiService } from '../services/api.service';
import webSocketService from '../services/websocket.service';
import { toast } from 'react-toastify';
import { v4 as uuidv4 } from 'uuid';

// Session State Types
interface SessionState {
  currentSession: SessionData | null;
  isLoading: boolean;
  error: string | null;
  userId: string;
}

type SessionAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SESSION'; payload: SessionData }
  | { type: 'CLEAR_SESSION' }
  | { type: 'SET_USER_ID'; payload: string };

// Initialize userId - sayfayı her açtığımızda sağlam bir userId olsun
const initializeUserId = (): string => {
  let userId = localStorage.getItem('syncwatch_user_id');
  if (!userId) {
    userId = uuidv4();
    localStorage.setItem('syncwatch_user_id', userId);
    console.log('🆔 New user ID created:', userId.substring(0, 8) + '...');
  } else {
    console.log('🆔 Existing user ID loaded:', userId.substring(0, 8) + '...');
  }
  return userId;
};

// Initial State
const initialState: SessionState = {
  currentSession: null,
  isLoading: false,
  error: null,
  userId: initializeUserId(),
};

// Reducer
function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload, error: null };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'SET_SESSION':
      return { ...state, currentSession: action.payload, isLoading: false, error: null };
    case 'CLEAR_SESSION':
      return { ...state, currentSession: null, isLoading: false, error: null };
    case 'SET_USER_ID':
      localStorage.setItem('syncwatch_user_id', action.payload);
      return { ...state, userId: action.payload };
    default:
      return state;
  }
}

// Context
const SessionContext = createContext<SessionContextType | undefined>(undefined);

// Provider Props
interface SessionProviderProps {
  children: ReactNode;
}

// Provider Component
export const SessionProvider: React.FC<SessionProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(sessionReducer, initialState);

  // Ensure user has an ID
  useEffect(() => {
    if (!state.userId) {
      const newUserId = uuidv4();
      dispatch({ type: 'SET_USER_ID', payload: newUserId });
    }
  }, [state.userId]);

  // ✅ WebSocket Event Listeners Setup
  useEffect(() => {
    console.log('🔌 Setting up WebSocket event listeners');

    // Session events
    const handleSessionJoined = (data: { sessionId: string; sessionData: SessionData }) => {
      console.log('🎯 WebSocket: Session joined successfully', data);
      dispatch({ type: 'SET_SESSION', payload: data.sessionData });
      dispatch({ type: 'SET_LOADING', payload: false });
    };

    const handleUserJoined = (data: { sessionId: string; userId: string; sessionData: SessionData }) => {
      console.log('🎯 WebSocket: User joined session', data);
      dispatch({ type: 'SET_SESSION', payload: data.sessionData });
      toast.info(`User ${data.userId.substring(0, 8)}... joined the session`);
    };

    const handleUserLeft = (data: { sessionId: string; userId: string; sessionData: SessionData }) => {
      console.log('🎯 WebSocket: User left session', data);
      dispatch({ type: 'SET_SESSION', payload: data.sessionData });
      toast.info(`User ${data.userId.substring(0, 8)}... left the session`);
    };

    const handleSessionRefreshed = (data: { sessionId: string; sessionData: SessionData }) => {
      console.log('🎯 WebSocket: Session refreshed', data);
      dispatch({ type: 'SET_SESSION', payload: data.sessionData });
    };

    const handleSessionError = (data: { message: string; errorCode?: string }) => {
      console.error('🎯 WebSocket: Session error', data);
      dispatch({ type: 'SET_ERROR', payload: data.message });
      toast.error(data.message);
    };

    const handleVideoUrlUpdated = (data: { 
      sessionId: string; 
      videoUrl: string; 
      updatedBy: string; 
      sessionData: SessionData 
    }) => {
      console.log('🎯 WebSocket: Video URL updated', data);
      dispatch({ type: 'SET_SESSION', payload: data.sessionData });
      if (data.updatedBy !== state.userId) {
        toast.success(`Video URL updated by ${data.updatedBy.substring(0, 8)}...`);
      }
    };

    // Register event listeners
    webSocketService.on('session-joined', handleSessionJoined);
    webSocketService.on('user-joined', handleUserJoined);
    webSocketService.on('user-left', handleUserLeft);
    webSocketService.on('session-refreshed', handleSessionRefreshed);
    webSocketService.on('session-error', handleSessionError);
    webSocketService.on('video-url-updated', handleVideoUrlUpdated);

    // Cleanup on unmount
    return () => {
      console.log('🔌 Cleaning up WebSocket event listeners');
      webSocketService.off('session-joined', handleSessionJoined);
      webSocketService.off('user-joined', handleUserJoined);
      webSocketService.off('user-left', handleUserLeft);
      webSocketService.off('session-refreshed', handleSessionRefreshed);
      webSocketService.off('session-error', handleSessionError);
      webSocketService.off('video-url-updated', handleVideoUrlUpdated);
    };
  }, [state.userId]);

  // Create Session - WebSocket entegrasyonlu
  const createSession = async (userId: string): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      console.log('🎬 Creating session for user:', userId.substring(0, 8) + '...');

      const response = await apiService.createSession({ userId });

      if (response.success && response.data) {
        const sessionData: SessionData = {
          id: response.data.sessionId,
          userId: response.data.userId,
          status: response.data.status as 'WAITING',
          createdAt: new Date(),
          participants: [userId],
        };

        console.log('✅ Session created via REST API:', sessionData);

        // WebSocket ile kendi session'ına join ol (real-time updates için)
        webSocketService.joinSession(response.data.sessionId, userId);

        dispatch({ type: 'SET_SESSION', payload: sessionData });
        toast.success(`Session created successfully! ID: ${response.data.sessionId}`);
      } else {
        throw new Error(response.error || 'Failed to create session');
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to create session';
      console.error('💥 Create session error:', error);
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      dispatch({ type: 'SET_LOADING', payload: false });
      toast.error(errorMessage);
    }
  };

  // Join Session - WebSocket entegrasyonlu
  const joinSession = async (sessionId: string, userId: string): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      console.log('🔗 Attempting to join session:', { sessionId, userId: userId.substring(0, 8) + '...' });
      
      // 1. Önce REST API ile session'a join ol
      const response = await apiService.joinSession({ sessionId, userId });

      console.log('📥 Join session response:', response);

      if (response.success && response.data) {
        console.log('✅ Join session successful via REST API:', response.data);
        
        // 2. WebSocket ile session'a bağlan
        webSocketService.joinSession(sessionId, userId);
        
        // Initial session data'yı set et (WebSocket'ten gelen data ile güncellenecek)
        dispatch({ type: 'SET_SESSION', payload: response.data });
        
        toast.success(`Successfully joined session: ${sessionId}`);
      } else {
        console.error('❌ Join session failed:', response.error);
        throw new Error(response.error || 'Failed to join session');
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to join session';
      console.error('💥 Join session error:', error);
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      dispatch({ type: 'SET_LOADING', payload: false });
      toast.error(errorMessage);
    }
  };

  // ✅ Session bilgisini yenile - WebSocket ile
  const refreshSession = async (sessionId: string): Promise<void> => {
    try {
      console.log('🔄 Refreshing session data via WebSocket:', sessionId);
      
      // WebSocket ile refresh (gerçek zamanlı)
      webSocketService.refreshSession(sessionId);
      
      // Fallback: REST API ile de refresh yap
      const response = await apiService.getSession(sessionId);
      if (response.success && response.data) {
        console.log('🔄 Fallback refresh from REST API:', response.data);
        dispatch({ type: 'SET_SESSION', payload: response.data });
      }
    } catch (error: any) {
      console.error('💥 Session refresh error:', error);
    }
  };

  // Update Video URL - WebSocket entegrasyonlu
  const updateVideoUrl = async (videoUrl: string): Promise<void> => {
    if (!state.currentSession) {
      toast.error('No active session');
      return;
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      // WebSocket ile video URL güncelle (real-time)
      webSocketService.updateVideoUrl(state.currentSession.id, videoUrl, state.userId);
      
      // Fallback: REST API ile de güncelle
      const response = await apiService.updateVideoUrl({
        sessionId: state.currentSession.id,
        videoUrl,
      });

      if (response.success) {
        console.log('📺 Video URL updated via REST API fallback');
        dispatch({ type: 'SET_LOADING', payload: false });
        toast.success('Video URL updated successfully!');
      } else {
        throw new Error(response.error || 'Failed to update video URL');
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to update video URL';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      dispatch({ type: 'SET_LOADING', payload: false });
      toast.error(errorMessage);
    }
  };

  // Leave Session - WebSocket entegrasyonlu
  const leaveSession = (): void => {
    console.log('👋 Leaving session via WebSocket');
    
    // WebSocket ile session'dan ayrıl
    webSocketService.leaveSession();
    
    // Local state'i temizle
    dispatch({ type: 'CLEAR_SESSION' });
    toast.info('Left session');
  };

  const contextValue: SessionContextType = {
    currentSession: state.currentSession,
    isLoading: state.isLoading,
    error: state.error,
    userId: state.userId, // Current user ID'yi expose ediyoruz
    createSession: () => createSession(state.userId), // Otomatik olarak mevcut userId kullan
    joinSession: (sessionId: string, userId?: string) => joinSession(sessionId, userId || state.userId),
    refreshSession, // ✅ Session refresh functionality
    updateVideoUrl,
    leaveSession,
  };

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  );
};

// Custom Hook
export const useSession = (): SessionContextType => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}; 