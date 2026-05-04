import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import path from 'node:path';
import { CHANNELS } from '../ipc/channels';
import type {
  SessionStartArgs,
  SessionStartResult,
  SessionStateSnapshot,
  SessionSubmitArgs,
} from '../ipc/channels';
import { authStore } from './auth-store';
import { sessionManager } from './session-manager';
import { initTray, refreshIdleStatus, restoreIdleAfterSession, setIdleStatusManually } from './tray-controller';
import { restoreNetwork } from './network-blocking';
import { screenshotLoop } from './screenshot-loop';

const DEV_URL = process.env.WORKSIGHT_DEV_URL ?? 'http://localhost:5174';
const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
const getMainWindow = () => mainWindow;

const createWindow = async () => {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 880,
    minHeight: 560,
    backgroundColor: '#F7FAF8',
    titleBarStyle: 'hiddenInset',
    title: 'WorkSight',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Block normal quit while a session is active.
  mainWindow.on('close', (e) => {
    if (sessionManager.isActive()) {
      e.preventDefault();
      dialog.showMessageBox(mainWindow!, {
        type: 'warning',
        message: 'You have an active session.',
        detail: 'Submit your work before quitting WorkSight.',
        buttons: ['OK'],
      });
    }
  });

  // External links → system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    await mainWindow.loadURL(DEV_URL);
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }
};

const registerIpc = () => {
  ipcMain.handle(CHANNELS.authGetToken, () => authStore.get());
  ipcMain.handle(CHANNELS.authSetToken, (_e, token: string) => {
    authStore.set(token);
    void refreshIdleStatus();
    return null;
  });
  ipcMain.handle(CHANNELS.authClearToken, () => {
    authStore.clear();
    setIdleStatusManually('Sign in');
    return null;
  });

  ipcMain.handle(CHANNELS.sessionStart, async (_e, args: SessionStartArgs): Promise<SessionStartResult> => {
    return sessionManager.start(args, mainWindow);
  });
  ipcMain.handle(CHANNELS.sessionSubmit, async (_e, args: SessionSubmitArgs) => {
    const r = await sessionManager.submit(args, mainWindow);
    restoreIdleAfterSession();
    void refreshIdleStatus();
    return r;
  });
  ipcMain.handle(CHANNELS.sessionRequestState, async (): Promise<SessionStateSnapshot> => {
    return sessionManager.state();
  });
  ipcMain.handle(CHANNELS.sessionCaptureNow, async () => {
    return screenshotLoop.captureNow();
  });
  ipcMain.handle(CHANNELS.trayUpdateStatus, (_e, s: string) => {
    setIdleStatusManually(s);
    return null;
  });
};

app.on('before-quit', async (e) => {
  if (sessionManager.isActive()) {
    e.preventDefault();
    return;
  }
  // Defensive: never leave the OS in a blocked state.
  try {
    await restoreNetwork();
  } catch {
    // ignore
  }
});

app.whenReady().then(async () => {
  registerIpc();
  await createWindow();
  initTray(getMainWindow);

  // Recovery from a previous abnormal termination, if any.
  const recovered = await sessionManager.tryRecoverOnLaunch(mainWindow);
  if (recovered && mainWindow) {
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow!.webContents.send(CHANNELS.sessionAbnormalRecovered, recovered);
    });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow();
  });
});

app.on('window-all-closed', () => {
  // Keep the tray alive on macOS.
  if (process.platform !== 'darwin') app.quit();
});
