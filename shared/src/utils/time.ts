export const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const parseTimeString = (timeString: string): number => {
  const parts = timeString.split(':').map(part => parseInt(part, 10));
  
  if (parts.length === 2) {
    // MM:SS format
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    // HH:MM:SS format
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  
  return 0;
};

export const calculateTimeDrift = (localTime: number, remoteTime: number, tolerance = 1): number => {
  return Math.abs(localTime - remoteTime);
};

export const shouldSync = (localTime: number, remoteTime: number, tolerance = 1): boolean => {
  return calculateTimeDrift(localTime, remoteTime, tolerance) > tolerance;
};

export const getTimestamp = (): number => {
  return Date.now();
};

export const formatDuration = (milliseconds: number): string => {
  const seconds = Math.floor(milliseconds / 1000);
  return formatTime(seconds);
}; 