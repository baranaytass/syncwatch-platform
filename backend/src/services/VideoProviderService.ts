import { VideoProvider, VideoProviderConfig, VideoProviderInfo, ProviderDetectionResult } from '../types';
import { Result, Ok, Err } from '../utils/result';
import { ValidationError } from '../utils/errors';

export interface IVideoProviderService {
  detectProvider(url: string): ProviderDetectionResult;
  validateUrl(url: string, provider: VideoProvider): Promise<Result<VideoProviderConfig, ValidationError>>;
  getProviderInfo(provider: VideoProvider): VideoProviderInfo;
  getSupportedProviders(): VideoProviderInfo[];
  extractVideoId(url: string, provider: VideoProvider): string | null;
}

export class VideoProviderService implements IVideoProviderService {
  private readonly providers: Map<VideoProvider, VideoProviderInfo>;

  constructor() {
    this.providers = new Map();
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // HTML5 Provider (MP4, WebM, etc.)
    this.providers.set('html5', {
      name: 'html5',
      displayName: 'Direct Video',
      icon: '🎬',
      supportedUrls: [
        /\.(mp4|webm|ogg|mov|avi)(\?.*)?$/i,
        /\.(mp4|webm|ogg|mov|avi)$/i
      ],
      capabilities: {
        canPlay: true,
        canPause: true,
        canSeek: true,
        canSetVolume: true,
        canSetPlaybackRate: true,
        supportsFullscreen: true
      },
      description: 'Direct video file (MP4, WebM, OGG)'
    });

    // YouTube Provider
    this.providers.set('youtube', {
      name: 'youtube',
      displayName: 'YouTube',
      icon: '📺',
      supportedUrls: [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
        /youtu\.be\/([a-zA-Z0-9_-]{11})/
      ],
      capabilities: {
        canPlay: true,
        canPause: true,
        canSeek: true,
        canSetVolume: true,
        canSetPlaybackRate: false,
        supportsFullscreen: true
      },
      description: 'YouTube videos'
    });

    // Vimeo Provider (future)
    this.providers.set('vimeo', {
      name: 'vimeo',
      displayName: 'Vimeo',
      icon: '🎭',
      supportedUrls: [
        /vimeo\.com\/(\d+)/,
        /player\.vimeo\.com\/video\/(\d+)/
      ],
      capabilities: {
        canPlay: true,
        canPause: true,
        canSeek: true,
        canSetVolume: true,
        canSetPlaybackRate: false,
        supportsFullscreen: true
      },
      description: 'Vimeo videos (coming soon)'
    });

    // OwnMedia Provider (future)
    this.providers.set('ownmedia', {
      name: 'ownmedia',
      displayName: 'Upload Video',
      icon: '📤',
      supportedUrls: [],
      capabilities: {
        canPlay: true,
        canPause: true,
        canSeek: true,
        canSetVolume: true,
        canSetPlaybackRate: true,
        supportsFullscreen: true
      },
      description: 'Upload your own video files'
    });
  }

  detectProvider(url: string): ProviderDetectionResult {
    let provider = 'html5'; // default

    if (url.match(/(?:youtube\.com|youtu\.be)/)) {
      provider = 'youtube';
    } else if (url.match(/vimeo\.com/)) {
      provider = 'vimeo';
    } else if (/\.(mp4|webm|ogg|mov|avi)(\?.*)?$/i.test(url)) {
      provider = 'html5';
    }

    const providerInfo = this.providers.get(provider as VideoProvider);

    return {
      provider: provider as VideoProvider,
      providerInfo: providerInfo || {
        name: 'html5',
        displayName: 'Direct Video',
        icon: '🎬',
        supportedUrls: [
          /\.(mp4|webm|ogg|mov|avi)(\?.*)?$/i,
          /\.(mp4|webm|ogg|mov|avi)$/i
        ],
        capabilities: {
          canPlay: true,
          canPause: true,
          canSeek: true,
          canSetVolume: true,
          canSetPlaybackRate: true,
          supportsFullscreen: true
        },
        description: 'Direct video file (MP4, WebM, OGG)'
      },
    };
  }

  async validateUrl(url: string, provider: VideoProvider): Promise<Result<VideoProviderConfig, ValidationError>> {
    try {
      if (!url || url.trim().length === 0) {
        return Err(new ValidationError('URL is required', 'url'));
      }

      const trimmedUrl = url.trim();
      
      // Basic URL format validation
      if (!this.isValidUrl(trimmedUrl)) {
        return Err(new ValidationError('Invalid URL format', 'url'));
      }

      const providerInfo = this.providers.get(provider);

      if (!providerInfo) {
        return Err(new ValidationError(`Unsupported provider: ${provider}`, 'provider'));
      }

      const isValidFormat = provider === 'ownmedia' || 
        providerInfo.supportedUrls.some(regex => regex.test(trimmedUrl));

      if (!isValidFormat) {
        return Err(new ValidationError(
          `Invalid URL format for ${providerInfo.displayName}`, 
          'url'
        ));
      }

      const videoId = this.extractVideoId(trimmedUrl, provider);
      
      const config: VideoProviderConfig = {
        provider,
        url: trimmedUrl
      };

      if (videoId) {
        config.videoId = videoId;
      }

      const metadata = await this.extractMetadata(trimmedUrl, provider);
      if (metadata) {
        config.metadata = metadata;
      }

      return Ok(config);

    } catch (error) {
      return Err(new ValidationError(
        `Failed to validate URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'url'
      ));
    }
  }

  getProviderInfo(provider: VideoProvider): VideoProviderInfo {
    const info = this.providers.get(provider);
    if (!info) {
      throw new Error(`Unknown provider: ${provider}`);
    }
    return info;
  }

  getSupportedProviders(): VideoProviderInfo[] {
    return Array.from(this.providers.values());
  }

  extractVideoId(url: string, provider: VideoProvider): string | null {
    const providerInfo = this.providers.get(provider);
    if (!providerInfo) return null;

    for (const regex of providerInfo.supportedUrls) {
      const match = url.match(regex);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  private async extractMetadata(url: string, provider: VideoProvider): Promise<{
    title?: string;
    duration?: number;
    thumbnail?: string;
  } | null> {
    switch (provider) {
    case 'youtube':
      const videoId = this.extractVideoId(url, provider);
      if (videoId) {
        return {
          thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
        };
      }
      return null;

    case 'html5':
      return {
        title: url.split('/').pop()?.split('.')[0] || 'Video'
      };

    default:
      return null;
    }
  }

  isProviderImplemented(provider: VideoProvider): boolean {
    const implementedProviders: VideoProvider[] = ['html5', 'youtube'];
    return implementedProviders.includes(provider);
  }

  private isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }
} 