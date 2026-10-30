/**
 * Transient Failure Retry Utility with Exponential Backoff
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  backoffFactor?: number;
  onRetry?: (error: Error, attempt: number, delayMs: number) => void;
}

/**
 * Determine if an error is transient and eligible for retry
 */
export function isTransientError(error: unknown): boolean {
  if (!error) return false;
  const message = error instanceof Error ? error.message : String(error);
  const statusMatch = message.match(/\b(429|500|502|503|504)\b/);
  if (statusMatch) return true;

  const transientKeywords = [
    "rate limit",
    "timeout",
    "timed out",
    "econnreset",
    "econnrefused",
    "etimedout",
    "network error",
    "socket hang up",
    "service unavailable",
    "gateway timeout",
  ];

  const lower = message.toLowerCase();
  return transientKeywords.some((keyword) => lower.includes(keyword));
}

/**
 * Execute an async operation with automatic exponential backoff retry for transient failures
 */
export async function withRetry<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions = {}
): Promise<{ result: T; attempts: number }> {
  const maxRetries = options.maxRetries ?? 2;
  const initialDelayMs = options.initialDelayMs ?? 300;
  const backoffFactor = options.backoffFactor ?? 2;

  let attempt = 0;
  let delay = initialDelayMs;

  while (true) {
    try {
      const result = await operation(attempt);
      return { result, attempts: attempt };
    } catch (err: unknown) {
      attempt++;
      const error = err instanceof Error ? err : new Error(String(err));

      if (attempt > maxRetries || !isTransientError(error)) {
        throw error;
      }

      if (options.onRetry) {
        options.onRetry(error, attempt, delay);
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= backoffFactor;
    }
  }
}

