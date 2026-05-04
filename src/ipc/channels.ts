// Single source of truth for IPC channels & payload shapes.
// Used by main, preload, and renderer.

export const CHANNELS = {
  // Auth (token storage in main process via safeStorage)
  authGetToken: 'auth:get-token',
  authSetToken: 'auth:set-token',
  authClearToken: 'auth:clear-token',

  // Session lifecycle
  sessionStart: 'session:start',
  sessionSubmit: 'session:submit',
  sessionRequestState: 'session:request-state',
  sessionTick: 'session:tick',
  sessionExpired: 'session:expired',
  sessionEnded: 'session:ended',
  sessionAbnormalRecovered: 'session:abnormal-recovered',

  // QA / candidate-visible "tap to test" — captures + uploads a screenshot now.
  sessionCaptureNow: 'session:capture-now',

  // Top-bar status updates (renderer pushes a status string when it knows more)
  trayUpdateStatus: 'tray:update-status',

  // App-wide
  windowFocus: 'window:focus',
} as const;

export type Channel = (typeof CHANNELS)[keyof typeof CHANNELS];

export interface SessionStartArgs {
  instanceId: string;
}

export interface SessionStartResult {
  sessionId: string;
  startedAt: string;
  expiresAt: string;
  durationMinutes: number;
  // Reviewer-configurable. Defaults: 60s min, 240s max.
  screenshotIntervalSeconds: { min: number; max: number };
  // Reviewer-configurable visibility of the candidate-side screenshot warning.
  showScreenshotWarning: boolean;
}

export interface SessionSubmitArgs {
  submissionContent?: string;
  submissionLink?: string;
  terminationClean: boolean;
}

export interface SessionStateSnapshot {
  inProgress: boolean;
  sessionId?: string;
  instanceId?: string;
  expiresAt?: string;
  remainingMs?: number;
}

export interface SessionTickPayload {
  sessionId: string;
  remainingMs: number;
}

export interface SessionEndedPayload {
  sessionId: string;
  reason: 'ended' | 'expired';
}

export interface CaptureNowResult {
  ok: boolean;
  key?: string;
  capturedAt?: string;
  error?: string;
}

export interface AbnormalRecoveryPayload {
  sessionId: string;
  instanceId: string;
  expiresAt: string;
  remainingMs: number;
}
