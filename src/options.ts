export const DEFAULT_TIMEOUT_MS = 15_000;
export const MAX_TIMEOUT_MS = 2_147_483_647;

export class InvalidOptionsError extends Error {
  readonly code = 'INVALID_OPTIONS';

  constructor() {
    super(`timeoutMs 必须是 1 到 ${MAX_TIMEOUT_MS} 之间的整数。`);
    this.name = 'InvalidOptionsError';
  }
}

/** Node timers and AbortSignal must receive the same valid, non-overflowing delay. */
export function validateTimeout(timeoutMs: number | undefined): number {
  if (timeoutMs === undefined) return DEFAULT_TIMEOUT_MS;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > MAX_TIMEOUT_MS) {
    throw new InvalidOptionsError();
  }
  return timeoutMs;
}
