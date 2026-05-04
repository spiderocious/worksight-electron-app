import { Tray, Menu, nativeImage, BrowserWindow } from 'electron';
import path from 'node:path';
import { sessionManager } from './session-manager';
import { apiRequest } from './api-client';
import { authStore } from './auth-store';
import { TRAY_REFRESH_MS } from './config';

interface CandidateMe {
  topBarStatus: string;
}

let tray: Tray | null = null;
let refreshTimer: NodeJS.Timeout | null = null;
let cachedIdleStatus = 'WorkSight';
let getMainWindow: () => BrowserWindow | null = () => null;

const buildIcon = () => {
  // Tiny green template square (works as a menu-bar template image on macOS).
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAH0lEQVR4nGNgGAWjYBSMglEwCkbBKBgFo2AUjAIaAwAFugABFgU0MgAAAABJRU5ErkJggg==',
    'base64'
  );
  const img = nativeImage.createFromBuffer(png);
  img.setTemplateImage(true);
  return img;
};

const formatRemaining = (remainingMs: number): string => {
  const total = Math.max(0, Math.floor(remainingMs / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export const initTray = (windowAccessor: () => BrowserWindow | null) => {
  getMainWindow = windowAccessor;
  tray = new Tray(buildIcon());
  tray.setToolTip('WorkSight');
  tray.on('click', () => {
    const w = getMainWindow();
    if (!w) return;
    if (w.isVisible()) w.focus();
    else w.show();
  });

  setIdleTitle('WorkSight');
  rebuildMenu();

  // Subscribe to ticks so the title updates each second during a session.
  sessionManager.onTick((p) => {
    if (!tray) return;
    tray.setTitle(`⏱ ${formatRemaining(p.remainingMs)}`);
  });

  scheduleRefresh();
};

const scheduleRefresh = () => {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(() => {
    void refreshIdleStatus();
  }, TRAY_REFRESH_MS);
  void refreshIdleStatus();
};

export const refreshIdleStatus = async (): Promise<void> => {
  if (sessionManager.isActive()) return;
  if (!authStore.get()) {
    setIdleTitle('Sign in');
    return;
  }
  try {
    const me = await apiRequest<CandidateMe>('/candidate/me');
    cachedIdleStatus = me.topBarStatus;
    setIdleTitle(me.topBarStatus);
  } catch {
    // Silent — keep last known status.
  }
};

const setIdleTitle = (title: string) => {
  if (!tray) return;
  tray.setTitle(title);
  cachedIdleStatus = title;
};

const rebuildMenu = () => {
  if (!tray) return;
  const menu = Menu.buildFromTemplate([
    {
      label: 'Open WorkSight',
      click: () => {
        const w = getMainWindow();
        if (w) {
          if (!w.isVisible()) w.show();
          w.focus();
        }
      },
    },
    { type: 'separator' },
    { label: 'Quit', role: 'quit' },
  ]);
  tray.setContextMenu(menu);
};

export const setIdleStatusManually = (s: string) => setIdleTitle(s);

export const restoreIdleAfterSession = () => setIdleTitle(cachedIdleStatus);
