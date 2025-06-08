import { BaseError } from './errors';

// Result pattern for error handling
export type Result<T, E = BaseError> = 
  | { success: true; data: T }
  | { success: false; error: E };

// Helper functions for Result pattern
export const Ok = <T>(data: T): Result<T, never> => ({ 
  success: true, 
  data 
});

export const Err = <E extends BaseError>(error: E): Result<never, E> => ({ 
  success: false, 
  error 
});

// Type guards
export const isOk = <T, E>(result: Result<T, E>): result is { success: true; data: T } => 
  result.success;

export const isErr = <T, E>(result: Result<T, E>): result is { success: false; error: E } => 
  !result.success;

// Utility functions
export const mapResult = <T, U, E>(
  result: Result<T, E>,
  mapper: (data: T) => U
): Result<U, E> => {
  if (isOk(result)) {
    return Ok(mapper(result.data));
  }
  return result;
};

export const flatMapResult = <T, U, E>(
  result: Result<T, E>,
  mapper: (data: T) => Result<U, E>
): Result<U, E> => {
  if (isOk(result)) {
    return mapper(result.data);
  }
  return result;
};

// Async helpers
export const asyncResult = async <T>(
  promise: Promise<T>
): Promise<Result<T, BaseError>> => {
  try {
    const data = await promise;
    return Ok(data);
  } catch (error) {
    return Err(error as BaseError);
  }
}; 