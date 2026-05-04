export const API_BASE = process.env.WORKSIGHT_API ?? 'http://localhost:4000/api';
export const FILE_SERVICE_BASE = process.env.WORKSIGHT_API ?? 'http://localhost:4000/';

// Hosts these are whitelisted from blocking — the candidate must always be able to
// reach them while a session is in progress.
export const ALWAYS_ALLOW_HOSTS = [
  new URL(API_BASE).hostname,
  new URL(FILE_SERVICE_BASE).hostname,
  // Wildcard: storageapi.dev for the underlying R2/S3 host the file service redirects to
  't3.storageapi.dev',
  'storageapi.dev',
];

export const SCREENSHOT_MIN_INTERVAL_MS = 60 * 1000; // 1 min
export const SCREENSHOT_MAX_INTERVAL_MS = 4 * 60 * 1000; // 4 min
export const SESSION_TICK_MS = 1000;
export const TRAY_REFRESH_MS = 60 * 1000;
