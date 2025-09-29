/**
 * Custom error types for robust error handling
 */

/**
 * Base error class with additional metadata
 */
export abstract class BaseError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error for unauthorized/authentication failures
 */
export class UnauthorizedError extends BaseError {
  constructor(message: string = 'Unauthorized', details?: unknown) {
    super(message, 'UNAUTHORIZED', details);
  }
}

/**
 * Error for API-related failures
 */
export class ApiError extends BaseError {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly retryable: boolean = false,
    details?: unknown
  ) {
    super(message, `API_ERROR_${statusCode}`, details);
  }

  static fromError(error: unknown): ApiError {
    if (error instanceof ApiError) {
      return error;
    }

    if (error instanceof Error) {
      // Check for rate limit errors
      if (error.message.includes('429')) {
        return new ApiError(error.message, 429, true, error);
      }

      // Check for server errors (5xx)
      const serverErrorMatch = error.message.match(/5(\d{2})/);
      if (serverErrorMatch) {
        const statusCode = parseInt(serverErrorMatch[0], 10);
        return new ApiError(error.message, statusCode, true, error);
      }

      // Check for client errors (4xx)
      const clientErrorMatch = error.message.match(/4(\d{2})/);
      if (clientErrorMatch) {
        const statusCode = parseInt(clientErrorMatch[0], 10);
        return new ApiError(error.message, statusCode, false, error);
      }
    }

    return new ApiError(
      error instanceof Error ? error.message : String(error),
      undefined,
      false,
      error
    );
  }
}

/**
 * Error for invalid stream responses
 */
export class InvalidStreamError extends BaseError {
  readonly type: 'NO_FINISH_REASON' | 'NO_RESPONSE_TEXT' | 'INVALID_CONTENT';

  constructor(
    message: string,
    type: 'NO_FINISH_REASON' | 'NO_RESPONSE_TEXT' | 'INVALID_CONTENT'
  ) {
    super(message, `INVALID_STREAM_${type}`);
    this.type = type;
  }
}

/**
 * Error for invalid responses
 */
export class InvalidResponseError extends BaseError {
  constructor(message: string, public readonly response?: unknown) {
    super(message, 'INVALID_RESPONSE', response);
  }
}

/**
 * Error for configuration issues
 */
export class ConfigurationError extends BaseError {
  constructor(message: string, details?: unknown) {
    super(message, 'CONFIGURATION_ERROR', details);
  }
}

/**
 * Error for tool execution failures
 */
export class ToolExecutionError extends BaseError {
  constructor(
    message: string,
    public readonly toolName: string,
    public readonly toolError?: unknown
  ) {
    super(message, 'TOOL_EXECUTION_ERROR', toolError);
  }
}

/**
 * Structured error interface
 */
export interface StructuredError {
  message: string;
  status?: number;
  code?: string;
  details?: unknown;
}

/**
 * Convert any error to a structured error
 */
export function toStructuredError(error: unknown): StructuredError {
  if (error instanceof ApiError) {
    return {
      message: error.message,
      status: error.statusCode,
      code: error.code,
      details: error.details,
    };
  }

  if (error instanceof BaseError) {
    return {
      message: error.message,
      code: error.code,
      details: error.details,
    };
  }

  if (error instanceof Error) {
    // Try to extract status code from error message
    const statusMatch = error.message.match(/\b(\d{3})\b/);
    const status = statusMatch ? parseInt(statusMatch[1], 10) : undefined;

    return {
      message: error.message,
      status,
      details: error,
    };
  }

  return {
    message: String(error),
    details: error,
  };
}

/**
 * Get a user-friendly error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }

  return 'An unknown error occurred';
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.retryable;
  }

  if (error instanceof UnauthorizedError) {
    return false;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Network errors are retryable
    if (
      message.includes('econnreset') ||
      message.includes('etimedout') ||
      message.includes('econnrefused') ||
      message.includes('network')
    ) {
      return true;
    }

    // Rate limits are retryable
    if (message.includes('429') || message.includes('rate limit')) {
      return true;
    }

    // Server errors are retryable
    if (message.match(/5\d{2}/)) {
      return true;
    }
  }

  return false;
}

/**
 * Convert error to a friendly user message
 */
export function toFriendlyError(error: unknown): Error {
  if (error instanceof UnauthorizedError) {
    return new Error('Authentication failed. Please check your API key.');
  }

  if (error instanceof ApiError) {
    if (error.statusCode === 429) {
      return new Error('Rate limit exceeded. Please try again later.');
    }

    if (error.statusCode && error.statusCode >= 500) {
      return new Error('Server error. Please try again later.');
    }

    if (error.statusCode === 404) {
      return new Error('Resource not found.');
    }
  }

  if (error instanceof InvalidStreamError) {
    switch (error.type) {
      case 'NO_FINISH_REASON':
        return new Error('Response was incomplete. Please try again.');
      case 'NO_RESPONSE_TEXT':
        return new Error('No response received. Please try again.');
      case 'INVALID_CONTENT':
        return new Error('Invalid response format. Please try again.');
    }
  }

  if (error instanceof ConfigurationError) {
    return new Error(`Configuration error: ${error.message}`);
  }

  if (error instanceof ToolExecutionError) {
    return new Error(`Tool execution failed: ${error.message}`);
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error('An unexpected error occurred');
}