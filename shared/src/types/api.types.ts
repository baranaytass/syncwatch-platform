export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
  details?: any;
}

export interface ApiError {
  message: string;
  statusCode: number;
  errorCode: string;
  context?: Record<string, any>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export type Result<T, E = ApiError> = 
  | { success: true; data: T }
  | { success: false; error: E };

export const Ok = <T>(data: T): Result<T, never> => ({ 
  success: true, 
  data 
});

export const Err = <E extends ApiError>(error: E): Result<never, E> => ({ 
  success: false, 
  error 
});

export const isOk = <T, E>(result: Result<T, E>): result is { success: true; data: T } => 
  result.success;

export const isErr = <T, E>(result: Result<T, E>): result is { success: false; error: E } => 
  !result.success; 