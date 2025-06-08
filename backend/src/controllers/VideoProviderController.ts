import { Request, Response, NextFunction } from 'express';
import { VideoProviderService } from '../services/VideoProviderService';
import { ApiResponse } from '../types';

export class VideoProviderController {
  constructor(private readonly videoProviderService: VideoProviderService) {}

  // GET /api/video/providers
  async getSupportedProviders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const providers = this.videoProviderService.getSupportedProviders();
      
      const response: ApiResponse<typeof providers> = {
        success: true,
        data: providers,
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  // POST /api/video/validate
  async validateVideoUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { url, provider } = req.body;

      if (!url || !provider) {
        const response: ApiResponse<never> = {
          success: false,
          error: 'URL and provider are required',
          errorCode: 'VALIDATION_ERROR',
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(response);
        return;
      }

      const result = await this.videoProviderService.validateUrl(url, provider);

      if (result.success) {
        const response: ApiResponse<typeof result.data> = {
          success: true,
          data: result.data,
          timestamp: new Date().toISOString(),
        };
        res.status(200).json(response);
      } else {
        const response: ApiResponse<never> = {
          success: false,
          error: result.error.message,
          errorCode: 'VALIDATION_ERROR',
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(response);
      }
    } catch (error) {
      next(error);
    }
  }

  // POST /api/video/detect-provider
  async detectProvider(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { url } = req.body;

      if (!url) {
        const response: ApiResponse<never> = {
          success: false,
          error: 'URL is required',
          errorCode: 'VALIDATION_ERROR',
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(response);
        return;
      }

      const detectionResult = this.videoProviderService.detectProvider(url);
      const providerInfo = this.videoProviderService.getProviderInfo(detectionResult.provider);

      const response: ApiResponse<{ provider: typeof detectionResult.provider; providerInfo: typeof providerInfo }> = {
        success: true,
        data: {
          provider: detectionResult.provider,
          providerInfo,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
} 