import { desktopCapturer, screen } from 'electron';
import { apiRequest } from './api-client';
import { getUploadUri, putFile } from './file-service';
import {
  SCREENSHOT_MAX_INTERVAL_MS,
  SCREENSHOT_MIN_INTERVAL_MS,
} from './config';

export interface ScreenshotInterval {
  minMs: number;
  maxMs: number;
}

const DEFAULT_INTERVAL: ScreenshotInterval = {
  minMs: SCREENSHOT_MIN_INTERVAL_MS,
  maxMs: SCREENSHOT_MAX_INTERVAL_MS,
};

export interface CaptureOutcome {
  ok: boolean;
  key?: string;
  capturedAt?: string;
  error?: string;
}

export class ScreenshotLoop {
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private sessionId = '';
  private interval: ScreenshotInterval = DEFAULT_INTERVAL;

  start(sessionId: string, interval: ScreenshotInterval = DEFAULT_INTERVAL) {
    this.sessionId = sessionId;
    this.interval = sanitizeInterval(interval);
    this.running = true;
    this.scheduleNext();
  }

  stop() {
    this.running = false;
    this.sessionId = '';
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /**
   * Public, on-demand capture used by the candidate-side "tap to test" affordance.
   * Captures + uploads + registers a single screenshot regardless of the loop schedule.
   * Returns an outcome the renderer can show to the user.
   */
  async captureNow(): Promise<CaptureOutcome> {
    if (!this.sessionId) {
      return { ok: false, error: 'No active session' };
    }
    return this.runCapture(this.sessionId);
  }

  private scheduleNext() {
    if (!this.running) return;
    const span = Math.max(0, this.interval.maxMs - this.interval.minMs);
    const delay = this.interval.minMs + Math.floor(Math.random() * span);
    this.timer = setTimeout(() => {
      void this.runCapture(this.sessionId).finally(() => this.scheduleNext());
    }, delay);
  }

  private async runCapture(sessionId: string): Promise<CaptureOutcome> {
    try {
      const display = screen.getPrimaryDisplay();
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: {
          width: Math.floor(display.size.width * 0.6),
          height: Math.floor(display.size.height * 0.6),
        },
      });
      if (sources.length === 0) {
        return { ok: false, error: 'No display source available' };
      }
      const img = sources[0].thumbnail;
      const buf = img.toJPEG(70);
      const capturedAt = new Date().toISOString();

      const upload = await getUploadUri('jpg');
      await putFile(upload.uri, buf, 'image/jpeg');
      await apiRequest(`/candidate/sessions/${sessionId}/screenshots`, {
        method: 'POST',
        body: { key: upload.key, capturedAt },
      });
      return { ok: true, key: upload.key, capturedAt };
    } catch (err) {
      console.error('[worksight] screenshot upload failed', err);
      // Drop the frame and continue. Never block the session on an upload failure.
      return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }
}

const sanitizeInterval = (i: ScreenshotInterval): ScreenshotInterval => {
  // Floor: 30s. Ceiling: 30 min. Min must be < max.
  const minMs = Math.max(30_000, Math.min(i.minMs, 30 * 60_000));
  const maxMs = Math.max(minMs + 1000, Math.min(i.maxMs, 30 * 60_000));
  return { minMs, maxMs };
};

export const screenshotLoop = new ScreenshotLoop();
