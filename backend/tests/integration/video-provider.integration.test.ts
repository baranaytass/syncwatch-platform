import request from 'supertest';
import { app } from '../../src/app.simple';

describe('Video Provider API Integration Tests', () => {
  describe('GET /api/video/providers', () => {
    it('should return all available video providers', async () => {
      const response = await request(app)
        .get('/api/video/providers')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(4);
      
      const providerNames = response.body.data.map((p: any) => p.name);
      expect(providerNames).toEqual(['html5', 'youtube', 'vimeo', 'ownmedia']);
      
      // Check each provider has required fields
      response.body.data.forEach((provider: any) => {
        expect(provider).toHaveProperty('name');
        expect(provider).toHaveProperty('displayName');
        expect(provider).toHaveProperty('icon');
        expect(provider).toHaveProperty('capabilities');
        expect(provider).toHaveProperty('description');
      });
    });

    it('should return providers with correct capabilities', async () => {
      const response = await request(app)
        .get('/api/video/providers')
        .expect(200);

      const youtubeProvider = response.body.data.find((p: any) => p.name === 'youtube');
      expect(youtubeProvider.capabilities.canPlay).toBe(true);
      expect(youtubeProvider.capabilities.canSetPlaybackRate).toBe(false);
      
      const html5Provider = response.body.data.find((p: any) => p.name === 'html5');
      expect(html5Provider.capabilities.canSetPlaybackRate).toBe(true);
    });
  });

  describe('POST /api/video/validate', () => {
    describe('YouTube validation', () => {
      it('should validate correct YouTube URLs', async () => {
        const validUrls = [
          'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          'https://youtube.com/watch?v=dQw4w9WgXcQ',
          'https://youtu.be/dQw4w9WgXcQ',
          'https://www.youtube.com/embed/dQw4w9WgXcQ',
          'https://youtube.com/watch?v=dQw4w9WgXcQ&t=30s',
          'https://www.youtube.com/watch?v=c4jZics6MA8', // Real YouTube URL
        ];

        for (const url of validUrls) {
          const response = await request(app)
            .post('/api/video/validate')
            .send({ url, provider: 'youtube' })
            .expect(200);

          expect(response.body.success).toBe(true);
          expect(response.body.data.provider).toBe('youtube');
          
          // Extract expected video ID from URL
          const expectedId = url.includes('c4jZics6MA8') ? 'c4jZics6MA8' : 'dQw4w9WgXcQ';
          expect(response.body.data.videoId).toBe(expectedId);
          expect(response.body.data.metadata.thumbnail).toContain(expectedId);
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
          const response = await request(app)
            .post('/api/video/validate')
            .send({ url, provider: 'youtube' })
            .expect(400);

          expect(response.body.success).toBe(false);
          expect(response.body.error).toContain('Invalid URL format for youtube');
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
          const response = await request(app)
            .post('/api/video/validate')
            .send({ url, provider: 'youtube' })
            .expect(200);

          expect(response.body.success).toBe(true);
          expect(response.body.data.videoId).toBe(id);
        }
      });

      it('should validate real YouTube URL with correct metadata', async () => {
        const realUrl = 'https://www.youtube.com/watch?v=c4jZics6MA8';
        
        const response = await request(app)
          .post('/api/video/validate')
          .send({ url: realUrl, provider: 'youtube' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.provider).toBe('youtube');
        expect(response.body.data.videoId).toBe('c4jZics6MA8');
        expect(response.body.data.url).toBe(realUrl);
        expect(response.body.data.metadata.thumbnail).toContain('c4jZics6MA8');
        
        // Video ID should be exactly 11 characters
        expect(response.body.data.videoId).toHaveLength(11);
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
          const response = await request(app)
            .post('/api/video/validate')
            .send({ url, provider: 'html5' })
            .expect(200);

          expect(response.body.success).toBe(true);
          expect(response.body.data.provider).toBe('html5');
          expect(response.body.data.url).toBe(url);
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
          const response = await request(app)
            .post('/api/video/validate')
            .send({ url, provider: 'html5' })
            .expect(400);

          expect(response.body.success).toBe(false);
          expect(response.body.error).toContain('Invalid URL format for html5');
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
          const response = await request(app)
            .post('/api/video/validate')
            .send({ url, provider: 'vimeo' })
            .expect(200);

          expect(response.body.success).toBe(true);
          expect(response.body.data.provider).toBe('vimeo');
        }
      });

      it('should extract correct video ID from Vimeo URLs', async () => {
        const urlsWithIds = [
          { url: 'https://vimeo.com/123456789', id: '123456789' },
          { url: 'http://vimeo.com/987654321', id: '987654321' },
          { url: 'https://www.vimeo.com/555666777', id: '555666777' },
        ];

        for (const { url, id } of urlsWithIds) {
          const response = await request(app)
            .post('/api/video/validate')
            .send({ url, provider: 'vimeo' })
            .expect(200);

          expect(response.body.success).toBe(true);
          expect(response.body.data.videoId).toBe(id);
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
          const response = await request(app)
            .post('/api/video/validate')
            .send({ url, provider: 'vimeo' })
            .expect(400);

          expect(response.body.success).toBe(false);
          expect(response.body.error).toContain('Invalid URL format for vimeo');
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
          const response = await request(app)
            .post('/api/video/validate')
            .send({ url, provider: 'html5' })
            .expect(400);

          expect(response.body.success).toBe(false);
          expect(response.body.error).toBe('Invalid URL format');
        }
      });

      it('should require both URL and provider', async () => {
        const response1 = await request(app)
          .post('/api/video/validate')
          .send({ url: '', provider: 'youtube' })
          .expect(400);

        expect(response1.body.success).toBe(false);
        expect(response1.body.error).toBe('Invalid URL format');

        const response2 = await request(app)
          .post('/api/video/validate')
          .send({ url: 'https://test.com', provider: '' })
          .expect(400);

        expect(response2.body.success).toBe(false);
        expect(response2.body.error).toBe('URL and provider are required');
      });

      it('should handle unknown providers', async () => {
        const response = await request(app)
          .post('/api/video/validate')
          .send({ url: 'https://test.com', provider: 'unknown-provider' })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Invalid URL format for unknown-provider');
      });
    });
  });

  describe('POST /api/video/detect-provider', () => {
    it('should detect YouTube from youtube.com URLs', async () => {
      const testUrls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtube.com/watch?v=dQw4w9WgXcQ',
        'http://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s',
        'https://www.youtube.com/watch?v=c4jZics6MA8', // Real YouTube URL
      ];

      for (const url of testUrls) {
        const response = await request(app)
          .post('/api/video/detect-provider')
          .send({ url })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.provider).toBe('youtube');
        expect(response.body.data.providerInfo.name).toBe('youtube');
        expect(response.body.data.providerInfo.displayName).toBe('YouTube');
      }
    });

    it('should detect YouTube from youtu.be URLs', async () => {
      const testUrls = [
        'https://youtu.be/dQw4w9WgXcQ',
        'http://youtu.be/dQw4w9WgXcQ',
        'https://youtu.be/dQw4w9WgXcQ?t=30',
      ];

      for (const url of testUrls) {
        const response = await request(app)
          .post('/api/video/detect-provider')
          .send({ url })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.provider).toBe('youtube');
      }
    });

    it('should detect Vimeo from vimeo.com URLs', async () => {
      const testUrls = [
        'https://vimeo.com/123456789',
        'http://vimeo.com/987654321',
        'https://www.vimeo.com/123456789',
      ];

      for (const url of testUrls) {
        const response = await request(app)
          .post('/api/video/detect-provider')
          .send({ url })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.provider).toBe('vimeo');
        expect(response.body.data.providerInfo.displayName).toBe('Vimeo');
      }
    });

    it('should detect HTML5 from direct video URLs', async () => {
      const testUrls = [
        'https://example.com/video.mp4',
        'http://test.com/movie.webm',
        'https://site.org/clip.ogg',
        'https://domain.com/video.mov',
        'https://server.net/file.avi',
        'https://cdn.com/video.mp4?quality=hd',
      ];

      for (const url of testUrls) {
        const response = await request(app)
          .post('/api/video/detect-provider')
          .send({ url })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.provider).toBe('html5');
        expect(response.body.data.providerInfo.displayName).toBe('Direct Video');
      }
    });

    it('should default to HTML5 for unknown URLs', async () => {
      const testUrls = [
        'https://unknown-site.com/somepage',
        'https://example.org/random-url',
        'https://test.net/',
      ];

      for (const url of testUrls) {
        const response = await request(app)
          .post('/api/video/detect-provider')
          .send({ url })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.provider).toBe('html5');
      }
    });

    it('should require URL', async () => {
      const response = await request(app)
        .post('/api/video/detect-provider')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('URL is required');
    });
  });
}); 