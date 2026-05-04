// Resolution order for the API base + file service base:
//
//   1. Runtime env vars (WORKSIGHT_API, WORKSIGHT_FILE_SERVICE) — used in dev
//      via the `dev:electron` npm script.
//   2. Build-time injection from .env.production — `scripts/generate-build-env.cjs`
//      reads .env.production and writes src/main/build-env.ts before tsc runs.
//      That file is gitignored so production URLs never live in source.
//   3. Localhost fallback — what you get when nothing's configured. Useful for
//      first-time `npm run dev` against a local backend.
//
// Source code never references real production hosts directly.

import { BUILD_API_BASE, BUILD_FILE_SERVICE_BASE } from './build-env';

export const API_BASE =
  process.env.WORKSIGHT_API || BUILD_API_BASE || 'http://localhost:4000/api';

export const FILE_SERVICE_BASE =
  process.env.WORKSIGHT_FILE_SERVICE || BUILD_FILE_SERVICE_BASE || 'http://localhost:4000';

// Hosts these are whitelisted from blocking — the candidate must always be able to
// reach them while a session is in progress.
export const ALWAYS_ALLOW_HOSTS = [
  new URL(API_BASE).hostname,
  new URL(FILE_SERVICE_BASE).hostname,
  // The file service redirects to a Tigris (S3-compatible) host for the actual bytes.
  't3.storageapi.dev',
  'storageapi.dev',
];

export const SCREENSHOT_MIN_INTERVAL_MS = 60 * 1000; // 1 min
export const SCREENSHOT_MAX_INTERVAL_MS = 4 * 60 * 1000; // 4 min
export const SESSION_TICK_MS = 1000;
export const TRAY_REFRESH_MS = 60 * 1000;
