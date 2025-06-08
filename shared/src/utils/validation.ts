export const isValidUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
};

export const isValidSessionId = (sessionId: string): boolean => {
  return typeof sessionId === 'string' && sessionId.length > 0 && sessionId.length <= 100;
};

export const isValidUserId = (userId: string): boolean => {
  return typeof userId === 'string' && userId.trim().length > 0 && userId.length <= 50;
};

export const isYouTubeUrl = (url: string): boolean => {
  return url.includes('youtube.com') || url.includes('youtu.be');
};

export const isVimeoUrl = (url: string): boolean => {
  return url.includes('vimeo.com');
};

export const isSupportedVideoUrl = (url: string): boolean => {
  if (!isValidUrl(url)) return false;
  
  const lowerUrl = url.toLowerCase();
  return (
    isYouTubeUrl(lowerUrl) ||
    isVimeoUrl(lowerUrl) ||
    lowerUrl.endsWith('.mp4') ||
    lowerUrl.endsWith('.webm') ||
    lowerUrl.endsWith('.ogg')
  );
};

export const sanitizeUserId = (userId: string): string => {
  return userId.trim().substring(0, 50);
};

export const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}; 