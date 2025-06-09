import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';

// YouTube IFrame API types
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubePlayerProps {
  videoId: string;
  onPlay: (currentTime: number) => void;
  onPause: (currentTime: number) => void;
  onSeek: (currentTime: number) => void;
  onReady: (duration: number) => void;
  onError: (error: string) => void;
  className?: string;
}

interface VideoState {
  currentTime: number;
  isPlaying: boolean;
  duration: number;
}

export interface YouTubePlayerRef {
  _syncControls: {
    playVideo: () => Promise<void>;
    pauseVideo: () => void;
    seekTo: (time: number) => void;
    getCurrentTime: () => number;
    getDuration: () => number;
    isPlaying: () => boolean;
  };
}

export const YouTubePlayer = forwardRef<YouTubePlayerRef, YouTubePlayerProps>(({
  videoId,
  onPlay,
  onPause,
  onSeek,
  onReady,
  onError,
  className,
}, ref) => {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isApiReady, setIsApiReady] = useState(false);
  const [player, setPlayer] = useState<any>(null);
  const [videoState, setVideoState] = useState<VideoState>({
    currentTime: 0,
    isPlaying: false,
    duration: 0,
  });
  const [isSyncing, setIsSyncing] = useState(false);

  // Load YouTube IFrame API
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setIsApiReady(true);
      return;
    }

    // Load YouTube API script
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    document.head.appendChild(script);

    // Set up API ready callback
    window.onYouTubeIframeAPIReady = () => {
      console.log('📺 YouTube IFrame API ready');
      setIsApiReady(true);
    };

    return () => {
      // Cleanup
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  const handlePlayerReady = useCallback((event: any) => {
    console.log('✅ YouTube player ready');
    const duration = event.target.getDuration();
    setVideoState(prev => ({ ...prev, duration }));
    onReady(duration);
  }, [onReady]);

  const handlePlayerStateChange = useCallback((event: any) => {
    if (isSyncing) return; // Don't trigger events during sync

    const playerState = event.data;
    const currentTime = event.target.getCurrentTime();

    console.log('📹 YouTube player state change:', { playerState, currentTime });

    setVideoState(prev => ({ ...prev, currentTime }));

    switch (playerState) {
      case window.YT.PlayerState.PLAYING:
        setVideoState(prev => ({ ...prev, isPlaying: true }));
        onPlay(currentTime);
        break;
      
      case window.YT.PlayerState.PAUSED:
        setVideoState(prev => ({ ...prev, isPlaying: false }));
        onPause(currentTime);
        break;
      
      case window.YT.PlayerState.ENDED:
        setVideoState(prev => ({ ...prev, isPlaying: false }));
        onPause(currentTime);
        break;
    }
  }, [onPlay, onPause, isSyncing]);

  const handlePlayerError = useCallback((event: any) => {
    const errorCode = event.data;
    let errorMessage = 'YouTube player error';

    switch (errorCode) {
      case 2:
        errorMessage = 'Invalid video ID';
        break;
      case 5:
        errorMessage = 'HTML5 player error';
        break;
      case 100:
        errorMessage = 'Video not found';
        break;
      case 101:
      case 150:
        errorMessage = 'Video embedding disabled';
        break;
      default:
        errorMessage = `YouTube error code: ${errorCode}`;
    }

    console.error('❌ YouTube player error:', errorMessage);
    onError(errorMessage);
  }, [onError]);

  // Initialize YouTube player when API is ready
  useEffect(() => {
    if (!isApiReady || !containerRef.current || !videoId) return;

    console.log('🎬 Initializing YouTube player for video:', videoId);

    const ytPlayer = new window.YT.Player(containerRef.current, {
      width: '100%',
      height: '390',
      videoId: videoId,
      playerVars: {
        autoplay: 0,
        controls: 1,
        rel: 0,
        modestbranding: 1,
        fs: 1,
        cc_load_policy: 0,
        iv_load_policy: 3,
        enablejsapi: 1,
      },
      events: {
        onReady: handlePlayerReady,
        onStateChange: handlePlayerStateChange,
        onError: handlePlayerError,
      },
    });

    setPlayer(ytPlayer);
    playerRef.current = ytPlayer;

    return () => {
      if (ytPlayer && typeof ytPlayer.destroy === 'function') {
        ytPlayer.destroy();
      }
    };
  }, [isApiReady, videoId, handlePlayerReady, handlePlayerStateChange, handlePlayerError]);

  // External control methods
  const playVideo = useCallback(async () => {
    if (player && typeof player.playVideo === 'function') {
      console.log('▶️ Playing YouTube video');
      player.playVideo();
    }
  }, [player]);

  const pauseVideo = useCallback(() => {
    if (player && typeof player.pauseVideo === 'function') {
      console.log('⏸️ Pausing YouTube video');
      player.pauseVideo();
    }
  }, [player]);

  const seekTo = useCallback((time: number) => {
    if (player && typeof player.seekTo === 'function') {
      console.log('🎯 Seeking YouTube video to:', time);
      setIsSyncing(true);
      
      player.seekTo(time, true);
      
      // Reset syncing flag after a short delay
      setTimeout(() => {
        setIsSyncing(false);
      }, 500);
    }
  }, [player]);

  const getCurrentTime = useCallback((): number => {
    if (player && typeof player.getCurrentTime === 'function') {
      return player.getCurrentTime();
    }
    return 0;
  }, [player]);

  const getDuration = useCallback((): number => {
    if (player && typeof player.getDuration === 'function') {
      return player.getDuration();
    }
    return 0;
  }, [player]);

  const isPlaying = useCallback((): boolean => {
    if (player && typeof player.getPlayerState === 'function') {
      return player.getPlayerState() === window.YT.PlayerState.PLAYING;
    }
    return false;
  }, [player]);

  // Expose player controls via ref
  useImperativeHandle(ref, () => ({
    _syncControls: {
      playVideo,
      pauseVideo,
      seekTo,
      getCurrentTime,
      getDuration,
      isPlaying,
    },
  }), [playVideo, pauseVideo, seekTo, getCurrentTime, getDuration, isPlaying]);

  if (!isApiReady) {
    return (
      <div className={`w-full aspect-video bg-black rounded-lg flex items-center justify-center ${className || ''}`}>
        <div className="text-center text-white space-y-3">
          <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm">Loading YouTube player...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full aspect-video bg-black rounded-lg overflow-hidden ${className || ''}`}>
      <div 
        ref={containerRef}
        className="w-full h-full"
        data-testid="youtube-player"
      />
      
      {/* YouTube Info Panel - Optional overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
        <div className="flex items-center justify-between text-white text-sm">
          <span className="font-mono">
            {Math.floor(videoState.currentTime)}s / {Math.floor(videoState.duration)}s
          </span>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
              videoState.isPlaying 
                ? 'bg-green-600/80' 
                : 'bg-yellow-600/80'
            }`}>
              {videoState.isPlaying ? '▶️ Playing' : '⏸️ Paused'}
            </span>
            {isSyncing && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600/80 rounded text-xs">
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Syncing...
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default YouTubePlayer; 