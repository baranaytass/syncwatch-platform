import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useSession } from '../context/SessionContext';
import webSocketService from '../services/websocket.service';
import YouTubePlayer, { YouTubePlayerRef } from './providers/YouTubePlayer';
import { toast } from 'react-toastify';
import { VideoProvider } from '../../../shared/src/types/video.types';

interface VideoPlayerProps {
  className?: string;
}

interface VideoState {
  currentTime: number;
  isPlaying: boolean;
  duration: number;
  volume: number;
  muted: boolean;
  provider: VideoProvider;
  lastSyncTime: number; // Son sync zamanı
}

interface ParsedVideoData {
  provider: VideoProvider;
  url: string;
  videoId?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ className }) => {
  const { currentSession } = useSession();
  const htmlVideoRef = useRef<HTMLVideoElement>(null);
  const youtubePlayerRef = useRef<YouTubePlayerRef>(null);
  
  const [videoState, setVideoState] = useState<VideoState>({
    currentTime: 0,
    isPlaying: false,
    duration: 0,
    volume: 1,
    muted: false,
    provider: 'html5',
    lastSyncTime: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [parsedVideo, setParsedVideo] = useState<ParsedVideoData | null>(null);
  const [hasJustJoined, setHasJustJoined] = useState(true); // Session'a yeni katıldı mı?

  // Parse video URL with provider info
  const parseVideoUrl = useCallback((videoUrl: string): ParsedVideoData | null => {
    if (!videoUrl) return null;

    // Check if URL contains provider prefix (provider:url)
    const providerMatch = videoUrl.match(/^(\w+):(.+)$/);
    
    if (providerMatch) {
      const [, provider, url] = providerMatch;
      
      // Extract video ID for YouTube
      if (provider === 'youtube') {
        const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
        const videoId = youtubeMatch ? youtubeMatch[1] : null;
        
        if (videoId) {
          return {
            provider: provider as VideoProvider,
            url,
            videoId,
          };
        }
      }
      
      return {
        provider: provider as VideoProvider,
        url,
      };
    }

    // Fallback: auto-detect provider from URL
    if (videoUrl.match(/(?:youtube\.com|youtu\.be)/)) {
      const youtubeMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
      const videoId = youtubeMatch ? youtubeMatch[1] : null;
      
      if (videoId) {
        return {
          provider: 'youtube',
          url: videoUrl,
          videoId,
        };
      }
    }

    // Default to HTML5
    return {
      provider: 'html5',
      url: videoUrl,
    };
  }, []);

  // Parse video URL when it changes
  useEffect(() => {
    if (currentSession?.videoUrl) {
      const parsed = parseVideoUrl(currentSession.videoUrl);
      setParsedVideo(parsed);
      setVideoState(prev => ({ 
        ...prev, 
        provider: parsed?.provider || 'html5',
        currentTime: 0,
        isPlaying: false,
        duration: 0,
        lastSyncTime: Date.now(),
      }));
      setError(null);
      setHasJustJoined(true); // Yeni video yüklendiğinde sync bekle
      console.log('🎬 Parsed video:', parsed);
    } else {
      setParsedVideo(null);
    }
  }, [currentSession?.videoUrl, parseVideoUrl]);

  // Session'a katıldıktan sonra mevcut video state'ini sync et
  useEffect(() => {
    if (hasJustJoined && currentSession?.videoState && parsedVideo) {
      console.log('🔄 Auto-syncing with session video state on join:', currentSession.videoState);
      
      const sessionVideoState = currentSession.videoState;
      
      // Session'daki state ile sync yap
      syncWithRemote({
        type: sessionVideoState.isPlaying ? 'PLAY' : 'PAUSE',
        currentTime: sessionVideoState.currentTime,
        timestamp: sessionVideoState.lastUpdated || Date.now()
      });
      
      setHasJustJoined(false);
    }
  }, [hasJustJoined, currentSession?.videoState, parsedVideo]);

  // Video event handlers - Send to WebSocket
  const handlePlay = useCallback((currentTime: number) => {
    if (isSyncing) return;
    
    console.log('🎬 Video play triggered by user', { currentTime, provider: parsedVideo?.provider });
    
    webSocketService.sendVideoEvent({
      type: 'PLAY',
      currentTime,
    });
    
    setVideoState(prev => ({ 
      ...prev, 
      isPlaying: true, 
      currentTime,
      lastSyncTime: Date.now(),
    }));
  }, [isSyncing, parsedVideo?.provider]);

  const handlePause = useCallback((currentTime: number) => {
    if (isSyncing) return;
    
    console.log('⏸️ Video pause triggered by user', { currentTime, provider: parsedVideo?.provider });
    
    webSocketService.sendVideoEvent({
      type: 'PAUSE',
      currentTime,
    });
    
    setVideoState(prev => ({ 
      ...prev, 
      isPlaying: false, 
      currentTime,
      lastSyncTime: Date.now(),
    }));
  }, [isSyncing, parsedVideo?.provider]);

  const handleSeek = useCallback((currentTime: number) => {
    if (isSyncing) return;
    
    console.log('🎯 Video seek triggered by user', { currentTime, provider: parsedVideo?.provider });
    
    webSocketService.sendVideoEvent({
      type: 'SEEK',
      currentTime,
    });
    
    setVideoState(prev => ({ 
      ...prev, 
      currentTime,
      lastSyncTime: Date.now(),
    }));
  }, [isSyncing, parsedVideo?.provider]);

  const handleReady = useCallback((duration: number) => {
    console.log('📺 Video ready', { duration, provider: parsedVideo?.provider });
    setVideoState(prev => ({ ...prev, duration }));
    setIsLoading(false);
  }, [parsedVideo?.provider]);

  const handleError = useCallback((errorMessage: string) => {
    console.error('❌ Video error:', errorMessage);
    setError(errorMessage);
    setIsLoading(false);
    toast.error(`Video error: ${errorMessage}`);
  }, []);

  // Sync with remote video events - IMPROVED
  const syncWithRemote = useCallback(async (remoteState: {
    type: 'PLAY' | 'PAUSE' | 'SEEK' | 'LOAD';
    currentTime?: number;
    timestamp: number;
  }) => {
    if (!parsedVideo) return;
    
    console.log('🔄 Syncing with remote video event:', remoteState);
    setIsSyncing(true);
    
    try {
      const targetTime = remoteState.currentTime || 0;
      const timeDifference = Math.abs((videoState.currentTime || 0) - targetTime);
      
      // Büyük zaman farkı varsa sync yap (1 saniyeden fazla)
      const shouldSeek = timeDifference > 1;
      
      if (parsedVideo.provider === 'youtube' && youtubePlayerRef.current?._syncControls) {
        const controls = youtubePlayerRef.current._syncControls;
        
        // Seek if necessary
        if (shouldSeek) {
          console.log(`🎯 YouTube: Seeking from ${videoState.currentTime}s to ${targetTime}s`);
          controls.seekTo(targetTime);
        }
        
        // Apply play/pause state
        switch (remoteState.type) {
          case 'PLAY':
            if (!controls.isPlaying()) {
              console.log('▶️ YouTube: Starting playback');
              await controls.playVideo();
            }
            break;
          case 'PAUSE':
            if (controls.isPlaying()) {
              console.log('⏸️ YouTube: Pausing playback');
              controls.pauseVideo();
            }
            break;
        }
      } else if (parsedVideo.provider === 'html5' && htmlVideoRef.current) {
        const video = htmlVideoRef.current;
        
        // Seek if necessary
        if (shouldSeek) {
          console.log(`🎯 HTML5: Seeking from ${video.currentTime}s to ${targetTime}s`);
          video.currentTime = targetTime;
        }
        
        // Apply play/pause state
        switch (remoteState.type) {
          case 'PLAY':
            if (video.paused) {
              console.log('▶️ HTML5: Starting playback');
              await video.play();
            }
            break;
          case 'PAUSE':
            if (!video.paused) {
              console.log('⏸️ HTML5: Pausing playback');
              video.pause();
            }
            break;
        }
      }
      
      // Update local state
      setVideoState(prev => ({
        ...prev,
        currentTime: targetTime,
        isPlaying: remoteState.type === 'PLAY',
        lastSyncTime: remoteState.timestamp,
      }));
      
      // Show sync notification
      if (shouldSeek) {
        toast.info(`Video synced to ${Math.floor(targetTime)}s`, {
          autoClose: 2000,
          position: "bottom-right"
        });
      }
      
    } catch (error) {
      console.error('❌ Error syncing video:', error);
      toast.error('Video senkronizasyonunda hata oluştu');
    } finally {
      // Sync indicator'ı kısa süre sonra kapat
      setTimeout(() => setIsSyncing(false), 1000);
    }
  }, [parsedVideo, videoState.currentTime]);

  // Set up WebSocket video sync listeners
  useEffect(() => {
    const handleVideoSync = (data: {
      type: 'PLAY' | 'PAUSE' | 'SEEK' | 'LOAD';
      currentTime?: number;
      timestamp: number;
    }) => {
      console.log('📥 Received video sync event:', data);
      syncWithRemote(data);
    };

    webSocketService.on('video-sync', handleVideoSync);

    return () => {
      webSocketService.off('video-sync', handleVideoSync);
    };
  }, [syncWithRemote]);

  // HTML5 Video Event Handlers
  const handleHtmlPlay = useCallback(() => {
    if (!htmlVideoRef.current || isSyncing) return;
    handlePlay(htmlVideoRef.current.currentTime);
  }, [handlePlay, isSyncing]);

  const handleHtmlPause = useCallback(() => {
    if (!htmlVideoRef.current || isSyncing) return;
    handlePause(htmlVideoRef.current.currentTime);
  }, [handlePause, isSyncing]);

  const handleHtmlSeeked = useCallback(() => {
    if (!htmlVideoRef.current || isSyncing) return;
    handleSeek(htmlVideoRef.current.currentTime);
  }, [handleSeek, isSyncing]);

  const handleHtmlTimeUpdate = useCallback(() => {
    if (!htmlVideoRef.current || isSyncing) return;
    setVideoState(prev => ({
      ...prev,
      currentTime: htmlVideoRef.current!.currentTime,
    }));
  }, [isSyncing]);

  const handleHtmlLoadedMetadata = useCallback(() => {
    if (!htmlVideoRef.current) return;
    handleReady(htmlVideoRef.current.duration);
  }, [handleReady]);

  // Set up HTML5 video event listeners
  useEffect(() => {
    const video = htmlVideoRef.current;
    if (!video || parsedVideo?.provider !== 'html5') return;

    video.addEventListener('play', handleHtmlPlay);
    video.addEventListener('pause', handleHtmlPause);
    video.addEventListener('seeked', handleHtmlSeeked);
    video.addEventListener('timeupdate', handleHtmlTimeUpdate);
    video.addEventListener('loadedmetadata', handleHtmlLoadedMetadata);
    video.addEventListener('error', () => handleError('HTML5 video error'));

    return () => {
      video.removeEventListener('play', handleHtmlPlay);
      video.removeEventListener('pause', handleHtmlPause);
      video.removeEventListener('seeked', handleHtmlSeeked);
      video.removeEventListener('timeupdate', handleHtmlTimeUpdate);
      video.removeEventListener('loadedmetadata', handleHtmlLoadedMetadata);
      video.removeEventListener('error', () => handleError('HTML5 video error'));
    };
  }, [parsedVideo?.provider, handleHtmlPlay, handleHtmlPause, handleHtmlSeeked, handleHtmlTimeUpdate, handleHtmlLoadedMetadata, handleError]);

  // Format time for display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!currentSession?.videoUrl || !parsedVideo) {
    return (
      <div className={`w-full ${className || ''}`}>
        <div className="flex flex-col items-center justify-center p-8 bg-muted/50 rounded-lg border-2 border-dashed">
          <div className="text-center space-y-4">
            <div className="text-6xl">📺</div>
            <h3 className="text-xl font-semibold">Video Player</h3>
            <p className="text-muted-foreground">
              Henüz video yüklenmedi. Önce bir video kaynağı seçin.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full space-y-4 ${className || ''}`}>
      {/* Video Player Container */}
      <div className="relative bg-black rounded-lg overflow-hidden shadow-lg">
        {/* YouTube Player */}
        {parsedVideo.provider === 'youtube' && parsedVideo.videoId && (
          <YouTubePlayer
            ref={youtubePlayerRef}
            videoId={parsedVideo.videoId}
            onPlay={handlePlay}
            onPause={handlePause}
            onSeek={handleSeek}
            onReady={handleReady}
            onError={handleError}
            className="w-full aspect-video"
          />
        )}

        {/* HTML5 Video Player */}
        {parsedVideo.provider === 'html5' && (
          <video
            ref={htmlVideoRef}
            src={parsedVideo.url}
            controls
            preload="metadata"
            data-testid="html5-video-player"
            className="w-full aspect-video"
          >
            Tarayıcınız video etiketini desteklemiyor.
          </video>
        )}

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <div className="text-center text-white space-y-3">
              <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-sm">Video yükleniyor...</p>
            </div>
          </div>
        )}
        
        {/* Error Overlay */}
        {error && (
          <div className="absolute inset-0 bg-destructive/90 backdrop-blur-sm flex items-center justify-center">
            <div className="text-center text-white space-y-3 p-4">
              <div className="text-4xl">❌</div>
              <p className="text-sm font-medium">{error}</p>
              <button 
                onClick={() => setError(null)}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-xs transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
        
        {/* Sync Indicator */}
        {isSyncing && (
          <div className="absolute top-4 right-4 bg-blue-600/90 backdrop-blur-sm text-white px-3 py-2 rounded-lg shadow-lg">
            <div className="flex items-center gap-2 text-sm font-medium">
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Senkronize ediliyor...</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Video Info Panel */}
      <div className="bg-card border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md font-medium">
              {parsedVideo.provider === 'youtube' ? '📺 YouTube' : '🎬 Direct Video'}
            </span>
            <span className="text-muted-foreground">
              {formatTime(videoState.currentTime)} / {formatTime(videoState.duration)}
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
              videoState.isPlaying 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
            }`}>
              {videoState.isPlaying ? '▶️ Oynatılıyor' : '⏸️ Durduruldu'}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-muted-foreground rounded-md text-xs font-medium">
              👥 {currentSession.participants?.length || 0} kişi izliyor
            </span>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>İlerleme</span>
            <span>{videoState.duration > 0 ? Math.round((videoState.currentTime / videoState.duration) * 100) : 0}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${videoState.duration > 0 ? (videoState.currentTime / videoState.duration) * 100 : 0}%` 
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer; 