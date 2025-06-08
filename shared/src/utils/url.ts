export const extractYouTubeVideoId = (url: string): string | null => {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

export const extractVimeoVideoId = (url: string): string | null => {
  const regex = /vimeo\.com\/(?:.*\/)?(\d+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

export const getVideoThumbnail = (url: string): string | null => {
  const youtubeId = extractYouTubeVideoId(url);
  if (youtubeId) {
    return `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;
  }
  
  const vimeoId = extractVimeoVideoId(url);
  if (vimeoId) {
    // Vimeo thumbnail requires API call, return placeholder for now
    return `https://vumbnail.com/${vimeoId}.jpg`;
  }
  
  return null;
};

export const getEmbedUrl = (url: string, origin = 'localhost'): string | null => {
  const youtubeId = extractYouTubeVideoId(url);
  if (youtubeId) {
    return `https://www.youtube.com/embed/${youtubeId}?enablejsapi=1&origin=${origin}`;
  }
  
  const vimeoId = extractVimeoVideoId(url);
  if (vimeoId) {
    return `https://player.vimeo.com/video/${vimeoId}?api=1`;
  }
  
  return url; // Direct video URL
};

export const isDirectVideoUrl = (url: string): boolean => {
  const lowerUrl = url.toLowerCase();
  return (
    lowerUrl.endsWith('.mp4') ||
    lowerUrl.endsWith('.webm') ||
    lowerUrl.endsWith('.ogg') ||
    lowerUrl.endsWith('.mov') ||
    lowerUrl.endsWith('.avi')
  );
};

export const normalizeUrl = (url: string): string => {
  return url.trim().toLowerCase();
}; 