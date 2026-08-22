import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'app_debug_logs';
const MAX_ENTRIES = 200; // keep last 200 entries so storage doesn't grow unbounded

// __DEV__ is a RN global; guard so this module is safe to import outside Metro.
const IS_DEV = typeof __DEV__ !== 'undefined' ? __DEV__ : false;

const LEVELS = {
  info:  { label: 'INFO ', color: '\x1b[36m' },  // cyan
  warn:  { label: 'WARN ', color: '\x1b[33m' },  // yellow
  error: { label: 'ERROR', color: '\x1b[31m' },  // red
  api:   { label: 'API  ', color: '\x1b[35m' },  // magenta
};

const RESET = '\x1b[0m';

function timestamp() {
  return new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
}

function safeStringify(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function formatForConsole(level, tag, message, data) {
  const { label, color } = LEVELS[level] || LEVELS.info;
  const base = `${color}[${label}]${RESET} ${timestamp()} [${tag}] ${message}`;
  return data !== undefined ? [base, data] : [base];
}

async function persist(entry) {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const existing = raw ? JSON.parse(raw) : [];
    existing.push(entry);
    // Trim to the most recent MAX_ENTRIES
    const trimmed = existing.length > MAX_ENTRIES ? existing.slice(-MAX_ENTRIES) : existing;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Never let logging break the app
  }
}

// Forward errors to Sentry so production failures stay visible even though we
// no longer console.log or persist in release builds. Imported lazily and
// wrapped so a missing / un-initialised Sentry can never break the app.
function reportErrorToSentry(tag, message, data) {
  try {
    // eslint-disable-next-line global-require
    const Sentry = require('@sentry/react-native');
    const label = `[${tag}] ${message}`;
    if (data instanceof Error) {
      Sentry.captureException(data, { tags: { tag }, extra: { message } });
    } else if (message instanceof Error) {
      Sentry.captureException(message, { tags: { tag } });
    } else {
      Sentry.captureMessage(label, {
        level: 'error',
        tags: { tag },
        ...(data !== undefined && { extra: { data: safeStringify(data) } }),
      });
    }
  } catch {
    // Sentry unavailable / not initialised — reporting must never throw.
  }
}

function write(level, tag, message, data) {
  // Console output + on-device persisted log store are DEV-ONLY. In release
  // builds we neither console.* nor persist (avoids leaking PII: role, ids…).
  if (IS_DEV) {
    const args = formatForConsole(level, tag, message, data);
    if (level === 'error') {
      console.error(...args);
    } else if (level === 'warn') {
      console.warn(...args);
    } else {
      console.log(...args);
    }

    // Persist asynchronously — fire and forget
    const entry = {
      t: new Date().toISOString(),
      level,
      tag,
      message,
      ...(data !== undefined && { data: typeof data === 'object' ? safeStringify(data) : String(data) }),
    };
    persist(entry);
  }

  // Errors are always reported to Sentry (no-op in dev when no DSN is set).
  if (level === 'error') {
    reportErrorToSentry(tag, message, data);
  }
}

const logger = {
  info:  (tag, message, data) => write('info',  tag, message, data),
  warn:  (tag, message, data) => write('warn',  tag, message, data),
  error: (tag, message, data) => write('error', tag, message, data),

  /** Structured helper for API calls — logs method + path + status in one line. */
  api: (method, path, status, data) =>
    write('api', 'API', `${method} ${path} → ${status ?? '…'}`, data),

  /** Returns all persisted log entries as an array (newest last). */
  async getLogs() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  /** Clears the persisted log store. */
  async clearLogs() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  },
};

// Aliases so callers can reset the on-device log store by any of these names.
logger.clear = logger.clearLogs;
logger.reset = logger.clearLogs;

export default logger;
