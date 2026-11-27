export const MODULE_TIMEOUT_MS = 8_000;
export const UNDO_WINDOW_MS = 5_000;
export const SMS_RESEND_SECONDS = 60;
export const SMS_CODE_LENGTH = 6;
export const SMS_CODE_TTL_MINUTES = 10;
export const QUERY_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export const REMINDER_HOUR = 9;
export const DUE_DAY_REMINDER_HOUR = 8;
export const DAILY_LIMIT_RANGE = { min: 2, max: 10 } as const;
export const RATE_ALERT_THRESHOLD_PCT = 0.5;
export const HOME_TIME_ZONE = 'Africa/Kigali';
export const WIDGET_TIMELINE_DAYS = 14;
/** Bump when a cached response shape changes; caches saved under another value are discarded on launch. */
export const CACHE_SCHEMA_VERSION = '4';
