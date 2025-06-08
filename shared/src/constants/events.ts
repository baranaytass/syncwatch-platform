export const SOCKET_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  
  // Session management
  JOIN_SESSION: 'join-session',
  LEAVE_SESSION: 'leave-session',
  SESSION_JOINED: 'session-joined',
  SESSION_LEFT: 'session-left',
  USER_JOINED: 'user-joined',
  USER_LEFT: 'user-left',
  
  // Video controls
  VIDEO_EVENT: 'video-event',
  VIDEO_SYNC: 'video-sync',
  VIDEO_URL_CHANGED: 'video-url-changed',
  
  // Error handling
  ERROR: 'error',
} as const;

export const VIDEO_EVENTS = {
  PLAY: 'PLAY',
  PAUSE: 'PAUSE',
  SEEK: 'SEEK',
  LOAD: 'LOAD',
  SYNC: 'SYNC',
} as const;

export const SESSION_STATUS = {
  WAITING: 'WAITING',
  ACTIVE: 'ACTIVE',
  ENDED: 'ENDED',
} as const; 