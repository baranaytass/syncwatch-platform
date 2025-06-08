import { Router } from 'express';
import { VideoProviderController } from '../controllers/VideoProviderController';
import { VideoProviderService } from '../services/VideoProviderService';

const router = Router();

// Initialize services and controllers
const videoProviderService = new VideoProviderService();
const videoProviderController = new VideoProviderController(videoProviderService);

/**
 * @route   GET /api/video/providers
 * @desc    Get supported video providers
 * @access  Public
 */
router.get('/providers', (req, res, next) => {
  videoProviderController.getSupportedProviders(req, res, next);
});

/**
 * @route   POST /api/video/validate
 * @desc    Validate video URL for specific provider
 * @access  Public
 * @body    { url: string, provider: VideoProvider }
 */
router.post('/validate', (req, res, next) => {
  videoProviderController.validateVideoUrl(req, res, next);
});

/**
 * @route   POST /api/video/detect-provider
 * @desc    Auto-detect video provider from URL
 * @access  Public
 * @body    { url: string }
 */
router.post('/detect-provider', (req, res, next) => {
  videoProviderController.detectProvider(req, res, next);
});

export default router; 