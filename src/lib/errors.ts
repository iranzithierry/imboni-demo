export type ErrorCode =
  | 'network_unavailable'
  | 'timeout'
  | 'server'
  | 'invalid_response'
  | 'not_found'
  | 'unauthorized'
  | 'invalid_input'
  | 'invalid_code'
  | 'code_expired'
  | 'rate_limited'
  | 'provider_unavailable'
  | 'permission_denied'
  | 'cancelled'
  | 'unknown';

const TRANSPORT: ReadonlySet<ErrorCode> = new Set(['network_unavailable', 'timeout']);

/** Typed, user-mappable error. `message` is for logs only; UI copy comes from `userMessage`. */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly correlationId: string;
  constructor(code: ErrorCode, options: { correlationId?: string; cause?: unknown; detail?: string } = {}) {
    super(options.detail ?? code, { cause: options.cause });
    this.name = 'AppError';
    this.code = code;
    this.correlationId = options.correlationId ?? newCorrelationId();
  }
  /** Transport failures are retryable and never imply the content is wrong. */
  get isTransport(): boolean {
    return TRANSPORT.has(this.code);
  }
}

export function newCorrelationId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof Error && error.name === 'AbortError') return new AppError('cancelled', { cause: error });
  return new AppError('unknown', { cause: error });
}

export function userMessage(code: ErrorCode): string {
  switch (code) {
    case 'network_unavailable':
      return 'You’re offline. We’ll try again when you’re back.';
    case 'timeout':
      return 'That took too long. Try again.';
    case 'server':
      return 'Something went wrong on our side. Try again.';
    case 'invalid_response':
      return 'We got data we couldn’t read. Try again shortly.';
    case 'not_found':
      return 'This item is no longer available.';
    case 'unauthorized':
      return 'Sign in to continue.';
    case 'invalid_input':
      return 'Check what you entered and try again.';
    case 'invalid_code':
      return 'That code doesn’t match. Try again.';
    case 'code_expired':
      return 'That code has expired. Send a new one.';
    case 'rate_limited':
      return 'Too many tries. Wait a moment and try again.';
    case 'provider_unavailable':
      return 'This sign-in option isn’t available on this device.';
    case 'permission_denied':
      return 'Permission is off. You can turn it on in Settings.';
    case 'cancelled':
      return 'Cancelled.';
    case 'unknown':
      return 'Something went wrong. Try again.';
    default: {
      const exhaustive: never = code;
      return exhaustive;
    }
  }
}

/** Single place that decides how unexpected errors are recorded. Never logs payloads or secrets. */
export function reportError(error: AppError, context: string): void {
  if (__DEV__) console.warn(`[${context}] ${error.code} (${error.correlationId})`);
}
