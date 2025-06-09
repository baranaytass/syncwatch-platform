import React, { useState, useEffect } from 'react';
import { VideoProvider } from '../../../shared/src/types/video.types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { AlertCircle, ExternalLink, Upload, Youtube, Film, Video as VideoIcon } from 'lucide-react';

interface VideoProviderSelectorProps {
  onVideoSubmit: (provider: VideoProvider, url: string) => Promise<void>;
  isLoading?: boolean;
  className?: string;
}

interface ProviderInfo {
  name: VideoProvider;
  displayName: string;
  icon: React.ReactNode;
  placeholder: string;
  description: string;
  urlPattern?: RegExp;
  isImplemented: boolean;
}

const PROVIDERS: ProviderInfo[] = [
  {
    name: 'youtube',
    displayName: 'YouTube',
    icon: <Youtube className="h-4 w-4" />,
    placeholder: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'YouTube video URL - Fully supported with embed player',
    urlPattern: /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    isImplemented: true,
  },
  {
    name: 'html5',
    displayName: 'Direct Video',
    icon: <VideoIcon className="h-4 w-4" />,
    placeholder: 'https://example.com/video.mp4',
    description: 'Direct video file URL (MP4, WebM, OGG)',
    urlPattern: /\.(mp4|webm|ogg|mov|avi)(\?.*)?$/i,
    isImplemented: true,
  },
  {
    name: 'vimeo',
    displayName: 'Vimeo',
    icon: <Film className="h-4 w-4" />,
    placeholder: 'https://vimeo.com/123456789',
    description: 'Vimeo video URL',
    urlPattern: /vimeo\.com\/(\d+)/,
    isImplemented: false,
  },
  {
    name: 'ownmedia',
    displayName: 'Upload Video',
    icon: <Upload className="h-4 w-4" />,
    placeholder: 'Upload your own video file',
    description: 'Upload your own video files',
    isImplemented: false,
  },
];

export const VideoProviderSelector: React.FC<VideoProviderSelectorProps> = ({
  onVideoSubmit,
  isLoading = false,
  className,
}) => {
  const [selectedProvider, setSelectedProvider] = useState<VideoProvider>('youtube');
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [validationError, setValidationError] = useState<string>('');

  const currentProvider = PROVIDERS.find(p => p.name === selectedProvider);

  // Clear URL and validation when provider changes
  useEffect(() => {
    setVideoUrl('');
    setValidationError('');
  }, [selectedProvider]);

  const validateUrl = (url: string, provider: ProviderInfo): string | null => {
    if (!url.trim()) {
      return 'URL is required';
    }

    if (!provider.isImplemented) {
      return `${provider.displayName} is not implemented yet`;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      return 'Invalid URL format';
    }

    // Provider-specific validation
    if (provider.urlPattern && !provider.urlPattern.test(url)) {
      return `Invalid ${provider.displayName} URL format`;
    }

    return null;
  };

  const handleUrlChange = (value: string): void => {
    setVideoUrl(value);
    
    if (currentProvider) {
      const error = validateUrl(value, currentProvider);
      setValidationError(error || '');
    }
  };

  const handleSubmit = async (): Promise<void> => {
    if (!currentProvider) return;

    const error = validateUrl(videoUrl, currentProvider);
    if (error) {
      setValidationError(error);
      return;
    }

    try {
      // Provider prefix ekleyerek backend'e gönder
      const prefixedUrl = `${selectedProvider}:${videoUrl.trim()}`;
      console.log(`📺 Submitting video with provider prefix: ${prefixedUrl}`);
      
      await onVideoSubmit(selectedProvider, prefixedUrl);
      setVideoUrl('');
      setValidationError('');
    } catch (error) {
      setValidationError(
        error instanceof Error ? error.message : 'Failed to set video'
      );
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && !isLoading && !validationError && videoUrl.trim()) {
      handleSubmit();
    }
  };

  return (
    <Card className={`w-full ${className || ''}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <VideoIcon className="h-5 w-5" />
          Choose Video Source
        </CardTitle>
        <CardDescription>
          Select a video provider and enter the video URL
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Provider Selection */}
        <div className="space-y-3">
          <Label htmlFor="provider-select" className="text-sm font-medium">
            Video Provider
          </Label>
          <Select 
            value={selectedProvider} 
            onValueChange={(value) => setSelectedProvider(value as VideoProvider)}
            disabled={isLoading}
          >
            <SelectTrigger id="provider-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROVIDERS.map((provider) => (
                <SelectItem 
                  key={provider.name} 
                  value={provider.name}
                  disabled={!provider.isImplemented}
                  className="flex items-center gap-2"
                >
                  <div className="flex items-center gap-2">
                    {provider.icon}
                    <span>{provider.displayName}</span>
                    {!provider.isImplemented && (
                      <Badge variant="secondary" className="text-xs">
                        Coming Soon
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Provider Info */}
        {currentProvider && (
          <div className="p-4 bg-muted/30 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              {currentProvider.icon}
              <span className="font-medium text-sm">{currentProvider.displayName}</span>
              {currentProvider.isImplemented ? (
                <Badge variant="success" className="text-xs">Available</Badge>
              ) : (
                <Badge variant="warning" className="text-xs">Coming Soon</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {currentProvider.description}
            </p>
          </div>
        )}

        {/* URL Input */}
        {currentProvider && currentProvider.isImplemented && (
          <div className="space-y-3">
            <Label htmlFor="video-url" className="text-sm font-medium">
              Video URL
            </Label>
            <div className="space-y-2">
              <Input
                id="video-url"
                type="url"
                placeholder={currentProvider.placeholder}
                value={videoUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                data-testid="video-url-input"
                className={validationError ? 'border-destructive focus:ring-destructive' : ''}
              />
              
              {validationError && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {validationError}
                </div>
              )}
              
              {videoUrl && !validationError && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <ExternalLink className="h-4 w-4" />
                  Valid URL format
                </div>
              )}
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isLoading || !!validationError || !videoUrl.trim()}
              className="w-full"
              data-testid="submit-video-btn"
            >
              {isLoading ? 'Setting video...' : 'Set Video'}
            </Button>
          </div>
        )}

        {/* Not Implemented Message */}
        {currentProvider && !currentProvider.isImplemented && (
          <div className="text-center py-8">
            <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
              {currentProvider.icon}
            </div>
            <h4 className="font-medium text-lg mb-2">Coming Soon</h4>
            <p className="text-sm text-muted-foreground mb-4">
              {currentProvider.displayName} support is currently under development.
            </p>
            <p className="text-xs text-muted-foreground">
              Please select YouTube or Direct Video for now.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VideoProviderSelector; 