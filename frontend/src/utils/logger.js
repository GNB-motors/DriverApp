import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'app_debug_logs';
const MAX_ENTRIES = 200; // keep last 200 entries so storage doesn't grow unbounded

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

function formatForConsole(level, tag, message, data) {
  const { label, color } = LEVELS[level];
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

function write(level, tag, message, data) {
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
    ...(data !== undefined && { data: typeof data === 'object' ? JSON.stringify(data) : String(data) }),
  };
  persist(entry);
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

export default logger;
