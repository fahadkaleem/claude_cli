import { UnauthorizedError } from './errors.js';

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
  shouldRetry?: (error: unknown) => boolean;
  onPersistent429?: (authType?: string, error?: unknown) => Promise<void>;
  authType?: string;
  onRetry?: (attempt: number, error: unknown, delayMs: number) => void;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onPersistent429' | 'authType' | 'onRetry'>> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffFactor: 2,
  shouldRetry: defaultShouldRetry,
};

function defaultShouldRetry(error: unknown): boolean {
  if (error instanceof UnauthorizedError) {
    return false;
  }

  if (error instanceof Error && error.message) {
    // Retry on rate limit errors
    if (error.message.includes('429')) return true;

    // Retry on server errors
    if (error.message.match(/5\d{2}/)) return true;

    // Retry on network errors
    if (error.message.includes('ECONNRESET') ||
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('ECONNREFUSED')) {
      return true;
    }
  }

  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown = new Error('Failed after all retry attempts');
  let delayMs = opts.initialDelayMs;
  let persistentRateLimitCount = 0;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check for unauthorized errors - these should not be retried
      if (error instanceof UnauthorizedError) {
        throw error;
      }

      // Check if this is a retryable error
      const shouldRetry = opts.shouldRetry(error);

      if (!shouldRetry || attempt === opts.maxAttempts) {
        // Check for persistent 429 errors
        if (error instanceof Error && error.message.includes('429')) {
          persistentRateLimitCount++;
          if (persistentRateLimitCount >= 2 && opts.onPersistent429) {
            await opts.onPersistent429(opts.authType, error);
          }
        }
        throw error;
      }

      // Track persistent rate limit errors
      if (error instanceof Error && error.message.includes('429')) {
        persistentRateLimitCount++;
      } else {
        persistentRateLimitCount = 0;
      }

      // Calculate delay for next retry
      const currentDelay = Math.min(delayMs, opts.maxDelayMs);

      // Call onRetry callback if provided
      if (opts.onRetry) {
        opts.onRetry(attempt, error, currentDelay);
      }

      // Wait before retrying
      await sleep(currentDelay);

      // Increase delay for next potential retry
      delayMs = Math.min(delayMs * opts.backoffFactor, opts.maxDelayMs);
    }
  }

  throw lastError;
}

export interface ContentRetryOptions {
  maxAttempts: number;
  initialDelayMs: number;
}

export const INVALID_CONTENT_RETRY_OPTIONS: ContentRetryOptions = {
  maxAttempts: 2, // 1 initial call + 1 retry
  initialDelayMs: 500,
};

export async function retryOnInvalidContent<T>(
  fn: () => Promise<T>,
  isValid: (result: T) => boolean,
  options: ContentRetryOptions = INVALID_CONTENT_RETRY_OPTIONS
): Promise<T> {
  let lastError: unknown = new Error('Invalid content after all retries');

  for (let attempt = 0; attempt < options.maxAttempts; attempt++) {
    try {
      if (attempt > 0) {
        // Linear backoff for content retries
        await sleep(options.initialDelayMs * attempt);
      }

      const result = await fn();

      if (isValid(result)) {
        return result;
      }

      lastError = new Error('Response validation failed');
    } catch (error) {
      lastError = error;

      // For actual errors (not validation), use normal retry logic
      if (attempt === options.maxAttempts - 1) {
        throw error;
      }
    }
  }

  throw lastError;
}