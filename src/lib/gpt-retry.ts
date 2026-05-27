import pRetry, { type Options as RetryOptions } from "p-retry";

export interface GptRetryOptions {
  retryOptions?: Pick<RetryOptions, "factor" | "maxTimeout" | "minTimeout" | "randomize">;
}

export async function runWithGptRetry<T>(
  operation: () => Promise<T>,
  options: GptRetryOptions = {},
) {
  return pRetry(operation, {
    retries: 3,
    factor: options.retryOptions?.factor ?? 2,
    maxTimeout: options.retryOptions?.maxTimeout ?? 4000,
    minTimeout: options.retryOptions?.minTimeout ?? 1000,
    randomize: options.retryOptions?.randomize ?? false,
  });
}
