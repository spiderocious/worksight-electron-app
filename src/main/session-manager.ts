import { BrowserWindow } from 'electron';
import { apiRequest } from './api-client';
import { applyBlock, fetchBlocklist, restoreNetwork } from './network-blocking';
import { screenshotLoop } from './screenshot-loop';
import { startBlockedListener, stopBlockedListener } from './blocked-listener';
import { cleanupLegacySessionFile, networkDirtyFlag } from './session-state';
import { getScreenPermissionStatus } from './permissions';
import { CHANNELS } from '../ipc/channels';
import type {
  AbnormalRecoveryPayload,
  SessionStartArgs,
  SessionStartResult,
  SessionStateSnapshot,
  SessionSubmitArgs,
  SessionTickPayload,
} from '../ipc/channels';
import { ALLOW_SCREENSHOTS, SESSION_TICK_MS } from './config';

interface ActiveSession {
  sessionId: string;
  instanceId: string;
  startedAt: Date;
  expiresAt: Date;
  durationMinutes: number;
}

// Minimum gap between recording the same domain again. Browsers retry like
// crazy when a request fails, so without debouncing we'd flood the API and
// the screenshot loop with near-identical events.
const BLOCKED_DEBOUNCE_MS = 5_000;

// Just the fields we need on launch — the full dashboard payload has more.
interface CandidateDashboardLite {
  inProgress?: Array<{ id: string; sessionId: string; expiresAt: string }>;
}

interface ServerSessionLite {
  id: string;
  instanceId: string;
  startedAt: string;
  expiresAt: string;
  status: 'in_progress' | 'submitted';
}

class SessionManager {
  private active: ActiveSession | null = null;
  private tickHandle: NodeJS.Timeout | null = null;
  private subscribers: Array<(p: SessionTickPayload) => void> = [];
  // Last time we recorded each domain — used to debounce browser retry storms.
  private lastBlockedAt = new Map<string, number>();

  isActive(): boolean {
    return this.active !== null;
  }

  state(): SessionStateSnapshot {
    if (!this.active) return { inProgress: false };
    return {
      inProgress: true,
      sessionId: this.active.sessionId,
      instanceId: this.active.instanceId,
      expiresAt: this.active.expiresAt.toISOString(),
      remainingMs: Math.max(0, this.active.expiresAt.getTime() - Date.now()),
    };
  }

  onTick(cb: (p: SessionTickPayload) => void) {
    this.subscribers.push(cb);
  }

  async start(args: SessionStartArgs, win: BrowserWindow | null): Promise<SessionStartResult> {
    if (this.active) {
      throw new Error('A session is already in progress');
    }

    // 0. Hard guard: macOS Screen Recording must be granted, otherwise the
    //    screenshot loop captures black frames silently. The renderer should
    //    have caught this on the rules screen and routed to the permissions
    //    screen, but we belt-and-braces here too.
    //
    //    Skipped entirely when ALLOW_SCREENSHOTS is off — there's no point
    //    asking for permission to do a thing the build won't do.
    if (ALLOW_SCREENSHOTS) {
      const screenStatus = getScreenPermissionStatus();
      if (screenStatus !== 'granted') {
        throw new Error('Screen Recording permission required. Open System Settings → Privacy & Security → Screen & System Audio Recording and enable WorkSight.');
      }
    }

    // 1. Apply network block FIRST (prompts for admin password). If this fails
    //    or the user cancels the password prompt, the server never knows a
    //    session was attempted — no orphan in_progress instance to clean up.
    let blockApplied = false;
    try {
      const domains = await fetchBlocklist();
      await applyBlock(domains);
      blockApplied = true;
    } catch (err) {
      console.error('[worksight] failed to apply network block', err);
      // Defensive: if we got partway through (hosts written but pf failed, etc.),
      // tear it back down so the candidate's network isn't stuck in a half-applied state.
      if (blockApplied) {
        try {
          await restoreNetwork();
        } catch {
          // already logged inside restoreNetwork
        }
      }
      throw new Error('Could not enable session restrictions. Please grant admin permission and try again.');
    }

    // 2. Now tell the server to start the session. If this fails, restore the network.
    let data: SessionStartResult;
    try {
      data = await apiRequest<SessionStartResult>('/candidate/sessions/start', {
        method: 'POST',
        body: { instanceId: args.instanceId },
      });
    } catch (err) {
      await restoreNetwork();
      throw err;
    }

    // 3. Set up internal state. The server is the source of truth — we don't
    //    persist anything here. The dirty-network flag (set inside applyBlock)
    //    is the only thing that survives a restart.
    this.active = {
      sessionId: data.sessionId,
      instanceId: args.instanceId,
      startedAt: new Date(data.startedAt),
      expiresAt: new Date(data.expiresAt),
      durationMinutes: data.durationMinutes,
    };

    // 4. Start screenshots + tick. Use the server-provided interval if it sent one,
    //    fall back to defaults otherwise (older servers).
    const interval = data.screenshotIntervalSeconds
      ? {
          minMs: Math.max(30, data.screenshotIntervalSeconds.min) * 1000,
          maxMs: Math.max(31, data.screenshotIntervalSeconds.max) * 1000,
        }
      : undefined;
    screenshotLoop.start(data.sessionId, interval);
    this.armBlockedListener(data.sessionId);
    this.startTick(win);

    return data;
  }

  async submit(args: SessionSubmitArgs, win: BrowserWindow | null): Promise<{ ok: true }> {
    // If we don't know about an active session locally, defer to the server.
    // The renderer might have stale state (e.g. a session expired between
    // tick handler runs); just resolve cleanly and let the renderer route to
    // the submitted screen.
    if (!this.active) {
      win?.webContents.send(CHANNELS.sessionEnded, { sessionId: '', reason: 'expired' });
      return { ok: true };
    }
    const sessionId = this.active.sessionId;
    try {
      await apiRequest(`/candidate/sessions/${sessionId}/submit`, {
        method: 'POST',
        body: args,
      });
    } finally {
      await this.teardown(win, 'ended');
    }
    return { ok: true };
  }

  async forceExpire(win: BrowserWindow | null) {
    if (!this.active) return;
    await this.teardown(win, 'expired');
  }

  async tryRecoverOnLaunch(
    win: BrowserWindow | null
  ): Promise<AbnormalRecoveryPayload | null> {
    // Tidy up any legacy session.json file from older versions of the app.
    cleanupLegacySessionFile();

    // 1. If we touched the network last time, restore defensively before we do
    //    anything else. This is independent of whether the server still has an
    //    active session.
    if (networkDirtyFlag.isSet()) {
      try {
        await restoreNetwork();
      } catch (err) {
        console.error('[worksight] defensive restore failed on launch', err);
      }
    }

    // 2. Ask the server: do I have any in-progress sessions? Server is the
    //    source of truth.
    let dashboard: CandidateDashboardLite;
    try {
      dashboard = await apiRequest<CandidateDashboardLite>('/candidate/me');
    } catch (err) {
      // If we're not authed (no token) or the server is unreachable, there's
      // nothing to recover — bail quietly. The user will see the sign-in
      // screen as normal.
      console.warn('[worksight] could not fetch dashboard on launch', err);
      return null;
    }

    const inFlight = dashboard.inProgress?.[0];
    if (!inFlight) return null;

    // 3. Pull the full session record so we have startedAt + durationMinutes.
    let session: ServerSessionLite;
    try {
      session = await apiRequest<ServerSessionLite>(`/candidate/sessions/${inFlight.sessionId}`);
    } catch (err) {
      console.warn('[worksight] could not fetch session on launch', err);
      return null;
    }

    // If the server has already closed it (sweeper just ran), nothing to do.
    if (session.status !== 'in_progress') return null;

    // 4. Tell the server this was an abnormal termination — best effort.
    try {
      await apiRequest(`/candidate/sessions/${session.id}/report-abnormal`, {
        method: 'POST',
        body: { detectedAt: new Date().toISOString() },
      });
    } catch (err) {
      console.error('[worksight] could not report abnormal termination', err);
    }

    // 5. Rehydrate from server data and resume the local loop.
    const expiresAt = new Date(session.expiresAt);
    const startedAt = new Date(session.startedAt);
    const now = new Date();
    const durationMinutes = Math.max(
      1,
      Math.round((expiresAt.getTime() - startedAt.getTime()) / 60000)
    );
    this.active = {
      sessionId: session.id,
      instanceId: session.instanceId,
      startedAt,
      expiresAt,
      durationMinutes,
    };
    screenshotLoop.start(session.id);
    this.armBlockedListener(session.id);
    this.startTick(win);

    return {
      sessionId: session.id,
      instanceId: session.instanceId,
      expiresAt: session.expiresAt,
      remainingMs: Math.max(0, expiresAt.getTime() - now.getTime()),
    };
  }

  private startTick(win: BrowserWindow | null) {
    if (this.tickHandle) clearInterval(this.tickHandle);
    const fire = () => {
      if (!this.active) return;
      const remainingMs = Math.max(0, this.active.expiresAt.getTime() - Date.now());
      const payload: SessionTickPayload = { sessionId: this.active.sessionId, remainingMs };
      this.subscribers.forEach((cb) => cb(payload));
      win?.webContents.send(CHANNELS.sessionTick, payload);
      if (remainingMs <= 0) {
        void this.forceExpire(win).then(() => {
          win?.webContents.send(CHANNELS.sessionExpired, { sessionId: payload.sessionId });
        });
      }
    };
    fire();
    this.tickHandle = setInterval(fire, SESSION_TICK_MS);
  }

  /**
   * Spins up the localhost listener that catches connection attempts to
   * blocked domains. On each attempt: debounce by domain (5s), capture a
   * screenshot, register the attempt with the backend.
   */
  private armBlockedListener(sessionId: string): void {
    this.lastBlockedAt.clear();
    startBlockedListener((domain) => {
      const now = Date.now();
      const last = this.lastBlockedAt.get(domain) ?? 0;
      if (now - last < BLOCKED_DEBOUNCE_MS) return;
      this.lastBlockedAt.set(domain, now);
      void this.recordBlockedAttempt(sessionId, domain, now);
    });
  }

  private async recordBlockedAttempt(sessionId: string, domain: string, atMs: number): Promise<void> {
    const attemptedAt = new Date(atMs).toISOString();
    let screenshotKey: string | undefined;
    try {
      const shot = await screenshotLoop.captureNow();
      if (shot.ok && shot.key) screenshotKey = shot.key;
    } catch (err) {
      console.warn('[worksight] blocked-attempt screenshot failed', err);
    }
    try {
      await apiRequest(`/candidate/sessions/${sessionId}/blocked-attempts`, {
        method: 'POST',
        body: { domain, attemptedAt, screenshotKey },
      });
    } catch (err) {
      console.warn('[worksight] blocked-attempt record failed', err);
    }
  }

  private async teardown(win: BrowserWindow | null, reason: 'ended' | 'expired') {
    if (this.tickHandle) {
      clearInterval(this.tickHandle);
      this.tickHandle = null;
    }
    stopBlockedListener();
    this.lastBlockedAt.clear();
    screenshotLoop.stop();
    const sid = this.active?.sessionId;
    this.active = null;
    await restoreNetwork();
    if (sid) {
      // Always notify the renderer on teardown — for both clean submits and
      // server-side expiry. The renderer routes to "submitted" either way; the
      // copy is the same. Without this, an expired session leaves the renderer
      // stuck on the session screen with no way to submit.
      win?.webContents.send(CHANNELS.sessionEnded, { sessionId: sid, reason });
    }
  }
}

export const sessionManager = new SessionManager();
