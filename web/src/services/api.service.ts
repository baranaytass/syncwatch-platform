import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  CreateSessionRequest,
  CreateSessionResponse,
  JoinSessionRequest,
  JoinSessionResponse,
  VideoUrlUpdateRequest,
  VideoUrlUpdateResponse,
} from '../types/session.types';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        console.log(`Making ${config.method?.toUpperCase()} request to: ${config.url}`);
        return config;
      },
      (error) => {
        console.error('Request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        console.log(`Response from ${response.config.url}:`, response.status);
        return response;
      },
      (error) => {
        console.error('Response error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.api.get('/health');
      return response.status === 200;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  // Create session
  async createSession(request: CreateSessionRequest): Promise<CreateSessionResponse> {
    try {
      const response = await this.api.post<CreateSessionResponse>('/api/sessions', request);
      return response.data;
    } catch (error: any) {
      console.error('Create session error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to create session',
      };
    }
  }

  // Join session
  async joinSession(request: JoinSessionRequest): Promise<JoinSessionResponse> {
    try {
      const response = await this.api.post<JoinSessionResponse>(
        `/api/sessions/${request.sessionId}/join`,
        { userId: request.userId }
      );
      return response.data;
    } catch (error: any) {
      console.error('Join session error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to join session',
      };
    }
  }

  // Update video URL
  async updateVideoUrl(request: VideoUrlUpdateRequest): Promise<VideoUrlUpdateResponse> {
    try {
      const response = await this.api.put<VideoUrlUpdateResponse>(
        `/api/sessions/${request.sessionId}/video-url`,
        { videoUrl: request.videoUrl }
      );
      return response.data;
    } catch (error: any) {
      console.error('Update video URL error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to update video URL',
      };
    }
  }

  // Get session details
  async getSession(sessionId: string): Promise<JoinSessionResponse> {
    try {
      const response = await this.api.get<JoinSessionResponse>(`/api/sessions/${sessionId}`);
      return response.data;
    } catch (error: any) {
      console.error('Get session error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to get session',
      };
    }
  }
}

// Singleton instance
export const apiService = new ApiService();
export default apiService; 