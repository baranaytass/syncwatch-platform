import { VideoProviderService } from '../../src/services/VideoProviderService';

describe('VideoProviderService', () => {
  let videoProviderService: VideoProviderService;

  beforeEach(() => {
    videoProviderService = new VideoProviderService();
  });

  describe('getProviders', () => {
    it('should return all available video providers', () => {
      const providers = videoProviderService.getProviders();
      
      expect(providers).toHaveLength(4);
      expect(providers.map(p => p.name)).toEqual(['html5', 'youtube', 'vimeo', 'ownmedia']);
      
      // Check each provider has required fields
      providers.forEach(provider => {
        expect(provider).toHaveProperty('name');
        expect(provider).toHaveProperty('displayName');
        expect(provider).toHaveProperty('icon');
        expect(provider).toHaveProperty('capabilities');
        expect(provider).toHaveProperty('description');
      });
    });

    it('should return providers with correct capabilities', () => {
      const providers = videoProviderService.getProviders();
      
      const youtubeProvider = providers.find(p => p.name === 'youtube');
      expect(youtubeProvider?.capabilities.canPlay).toBe(true);
      expect(youtubeProvider?.capabilities.canSetPlaybackRate).toBe(false);
      
      const html5Provider = providers.find(p => p.name === 'html5');
      expect(html5Provider?.capabilities.canSetPlaybackRate).toBe(true);
    });
  });

  describe('detectProvider', () => {
    it('should detect YouTube from youtube.com URLs', () => {
      const testUrls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtube.com/watch?v=dQw4w9WgXcQ',
        'http://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s',
      ];

      testUrls.forEach(url => {
        const result = videoProviderService.detectProvider(url);
        expect(result.provider).toBe('youtube');
        expect(result.providerInfo.name).toBe('youtube');
        expect(result.providerInfo.displayName).toBe('YouTube');
      });
    });

    it('should detect YouTube from youtu.be URLs', () => {
      const testUrls = [
        'https://youtu.be/dQw4w9WgXcQ',
        'http://youtu.be/dQw4w9WgXcQ',
        'https://youtu.be/dQw4w9WgXcQ?t=30',
      ];

      testUrls.forEach(url => {
        const result = videoProviderService.detectProvider(url);
        expect(result.provider).toBe('youtube');
      });
    });

    it('should detect Vimeo from vimeo.com URLs', () => {
      const testUrls = [
        'https://vimeo.com/123456789',
        'http://vimeo.com/987654321',
        'https://www.vimeo.com/123456789',
      ];

      testUrls.forEach(url => {
        const result = videoProviderService.detectProvider(url);
        expect(result.provider).toBe('vimeo');
        expect(result.providerInfo.displayName).toBe('Vimeo');
      });
    });

    it('should detect HTML5 from direct video URLs', () => {
      const testUrls = [
        'https://example.com/video.mp4',
        'http://test.com/movie.webm',
        'https://site.org/clip.ogg',
        'https://domain.com/video.mov',
        'https://server.net/file.avi',
        'https://cdn.com/video.mp4?quality=hd',
      ];

      testUrls.forEach(url => {
        const result = videoProviderService.detectProvider(url);
        expect(result.provider).toBe('html5');
        expect(result.providerInfo.displayName).toBe('Direct Video');
      });
    });

    it('should default to HTML5 for unknown URLs', () => {
      const testUrls = [
        'https://unknown-site.com/somepage',
        'https://example.org/random-url',
        'https://test.net/',
      ];

      testUrls.forEach(url => {
        const result = videoProviderService.detectProvider(url);
        expect(result.provider).toBe('html5');
      });
    });
  });

  describe('validateUrl', () => {
    describe('YouTube validation', () => {
      it('should validate correct YouTube URLs', async () => {
        const validUrls = [
          'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          'https://youtube.com/watch?v=dQw4w9WgXcQ',
          'https://youtu.be/dQw4w9WgXcQ',
          'https://www.youtube.com/embed/dQw4w9WgXcQ',
          'https://youtube.com/watch?v=dQw4w9WgXcQ&t=30s',
        ];

        for (const url of validUrls) {
          const result = await videoProviderService.validateUrl(url, 'youtube');
          expect(result.success).toBe(true);
          expect(result.data?.provider).toBe('youtube');
          expect(result.data?.videoId).toBe('dQw4w9WgXcQ');
          expect(result.data?.metadata?.thumbnail).toContain('dQw4w9WgXcQ');
        }
      });

      it('should reject invalid YouTube URLs', async () => {
        const invalidUrls = [
          'https://www.youtube.com/watch?v=invalid',
          'https://youtube.com/watch?v=',
          'https://youtu.be/',
          'https://vimeo.com/123456',
          'https://example.com/video.mp4',
        ];

        for (const url of invalidUrls) {
          const result = await videoProviderService.validateUrl(url, 'youtube');
          expect(result.success).toBe(false);
          expect(result.error).toContain('Invalid URL format for youtube');
        }
      });

      it('should extract correct video ID from different YouTube URL formats', async () => {
        const urlsWithIds = [
          { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', id: 'dQw4w9WgXcQ' },
          { url: 'https://youtu.be/abc123XYZ_-', id: 'abc123XYZ_-' },
          { url: 'https://youtube.com/embed/TEST123test', id: 'TEST123test' },
          { url: 'https://www.youtube.com/watch?v=9bZkp7q19f0&t=30s', id: '9bZkp7q19f0' },
        ];

        for (const { url, id } of urlsWithIds) {
          const result = await videoProviderService.validateUrl(url, 'youtube');
          expect(result.success).toBe(true);
          expect(result.data?.videoId).toBe(id);
        }
      });
    });

    describe('HTML5 validation', () => {
      it('should validate correct HTML5 video URLs', async () => {
        const validUrls = [
          'https://example.com/video.mp4',
          'http://test.com/movie.webm',
          'https://site.org/clip.ogg',
          'https://domain.com/video.mov',
          'https://server.net/file.avi',
          'https://cdn.com/video.mp4?quality=hd&format=mp4',
        ];

        for (const url of validUrls) {
          const result = await videoProviderService.validateUrl(url, 'html5');
          expect(result.success).toBe(true);
          expect(result.data?.provider).toBe('html5');
          expect(result.data?.url).toBe(url);
        }
      });

      it('should reject invalid HTML5 URLs', async () => {
        const invalidUrls = [
          'https://example.com/image.jpg',
          'https://test.com/document.pdf',
          'https://site.org/page.html',
          'https://domain.com/audio.mp3',
        ];

        for (const url of invalidUrls) {
          const result = await videoProviderService.validateUrl(url, 'html5');
          expect(result.success).toBe(false);
          expect(result.error).toContain('Invalid URL format for html5');
        }
      });
    });

    describe('Vimeo validation', () => {
      it('should validate correct Vimeo URLs', async () => {
        const validUrls = [
          'https://vimeo.com/123456789',
          'http://vimeo.com/987654321',
          'https://www.vimeo.com/555666777',
        ];

        for (const url of validUrls) {
          const result = await videoProviderService.validateUrl(url, 'vimeo');
          expect(result.success).toBe(true);
          expect(result.data?.provider).toBe('vimeo');
        }
      });

      it('should extract correct video ID from Vimeo URLs', async () => {
        const urlsWithIds = [
          { url: 'https://vimeo.com/123456789', id: '123456789' },
          { url: 'http://vimeo.com/987654321', id: '987654321' },
          { url: 'https://www.vimeo.com/555666777', id: '555666777' },
        ];

        for (const { url, id } of urlsWithIds) {
          const result = await videoProviderService.validateUrl(url, 'vimeo');
          expect(result.success).toBe(true);
          expect(result.data?.videoId).toBe(id);
        }
      });

      it('should reject invalid Vimeo URLs', async () => {
        const invalidUrls = [
          'https://vimeo.com/invalid',
          'https://vimeo.com/',
          'https://youtube.com/watch?v=123',
          'https://example.com/video.mp4',
        ];

        for (const url of invalidUrls) {
          const result = await videoProviderService.validateUrl(url, 'vimeo');
          expect(result.success).toBe(false);
          expect(result.error).toContain('Invalid URL format for vimeo');
        }
      });
    });

    describe('OwnMedia validation', () => {
      it('should always validate ownmedia provider', async () => {
        const urls = [
          'https://example.com/anything',
          'http://test.com/random',
          'invalid-url',
          '',
        ];

        for (const url of urls) {
          const result = await videoProviderService.validateUrl(url, 'ownmedia');
          expect(result.success).toBe(true);
          expect(result.data?.provider).toBe('ownmedia');
        }
      });
    });

    describe('General validation', () => {
      it('should require valid URL format', async () => {
        const invalidUrls = [
          'not-a-url',
          'ftp://example.com/video.mp4',
          'invalid://test.com',
          '',
        ];

        for (const url of invalidUrls) {
          const result = await videoProviderService.validateUrl(url, 'html5');
          expect(result.success).toBe(false);
          expect(result.error).toBe('Invalid URL format');
        }
      });

      it('should require both URL and provider', async () => {
        const result1 = await videoProviderService.validateUrl('', 'youtube');
        expect(result1.success).toBe(false);
        expect(result1.error).toBe('URL and provider are required');

        const result2 = await videoProviderService.validateUrl('https://test.com', '');
        expect(result2.success).toBe(false);
        expect(result2.error).toBe('URL and provider are required');
      });

      it('should handle unknown providers', async () => {
        const result = await videoProviderService.validateUrl('https://test.com', 'unknown-provider');
        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid URL format for unknown-provider');
      });
    });
  });

  describe('extractVideoId', () => {
    it('should extract YouTube video IDs correctly', () => {
      const testCases = [
        { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
        { url: 'https://youtu.be/abc123XYZ_-', expected: 'abc123XYZ_-' },
        { url: 'https://youtube.com/embed/TEST123test', expected: 'TEST123test' },
        { url: 'https://www.youtube.com/watch?v=9bZkp7q19f0&t=30', expected: '9bZkp7q19f0' },
      ];

      testCases.forEach(({ url, expected }) => {
        const videoId = videoProviderService.extractVideoId(url, 'youtube');
        expect(videoId).toBe(expected);
      });
    });

    it('should extract Vimeo video IDs correctly', () => {
      const testCases = [
        { url: 'https://vimeo.com/123456789', expected: '123456789' },
        { url: 'http://vimeo.com/987654321', expected: '987654321' },
        { url: 'https://www.vimeo.com/555666777', expected: '555666777' },
      ];

      testCases.forEach(({ url, expected }) => {
        const videoId = videoProviderService.extractVideoId(url, 'vimeo');
        expect(videoId).toBe(expected);
      });
    });

    it('should return null for invalid URLs', () => {
      const invalidCases = [
        { url: 'https://youtube.com/watch?v=invalid', provider: 'youtube' },
        { url: 'https://vimeo.com/invalid', provider: 'vimeo' },
        { url: 'https://example.com/video.mp4', provider: 'youtube' },
      ];

      invalidCases.forEach(({ url, provider }) => {
        const videoId = videoProviderService.extractVideoId(url, provider as any);
        expect(videoId).toBeNull();
      });
    });

    it('should return null for HTML5 and ownmedia providers', () => {
      const url = 'https://example.com/video.mp4';
      
      expect(videoProviderService.extractVideoId(url, 'html5')).toBeNull();
      expect(videoProviderService.extractVideoId(url, 'ownmedia')).toBeNull();
    });
  });
}); 