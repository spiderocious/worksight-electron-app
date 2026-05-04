import { contextBridge, ipcRenderer } from 'electron';
import {
  CHANNELS,
  type SessionStartArgs,
  type SessionStartResult,
  type SessionStateSnapshot,
  type SessionSubmitArgs,
  type SessionTickPayload,
  type SessionEndedPayload,
  type AbnormalRecoveryPayload,
  type CaptureNowResult,
  type ScreenPermissionStatus,
} from '../ipc/channels';

const subscribe = <T>(channel: string, handler: (payload: T) => void) => {
  const listener = (_e: unknown, payload: T) => handler(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
};

const api = {
  auth: {
    getToken: (): Promise<string | null> => ipcRenderer.invoke(CHANNELS.authGetToken),
    setToken: (token: string): Promise<void> => ipcRenderer.invoke(CHANNELS.authSetToken, token),
    clearToken: (): Promise<void> => ipcRenderer.invoke(CHANNELS.authClearToken),
  },
  session: {
    start: (args: SessionStartArgs): Promise<SessionStartResult> =>
      ipcRenderer.invoke(CHANNELS.sessionStart, args),
    submit: (args: SessionSubmitArgs): Promise<{ ok: true }> =>
      ipcRenderer.invoke(CHANNELS.sessionSubmit, args),
    requestState: (): Promise<SessionStateSnapshot> =>
      ipcRenderer.invoke(CHANNELS.sessionRequestState),
    captureNow: (): Promise<CaptureNowResult> => ipcRenderer.invoke(CHANNELS.sessionCaptureNow),
    onTick: (cb: (p: SessionTickPayload) => void) => subscribe(CHANNELS.sessionTick, cb),
    onExpired: (cb: (p: { sessionId: string }) => void) => subscribe(CHANNELS.sessionExpired, cb),
    onEnded: (cb: (p: SessionEndedPayload) => void) => subscribe(CHANNELS.sessionEnded, cb),
    onAbnormalRecovered: (cb: (p: AbnormalRecoveryPayload) => void) =>
      subscribe(CHANNELS.sessionAbnormalRecovered, cb),
  },
  permissions: {
    screenStatus: (): Promise<ScreenPermissionStatus> =>
      ipcRenderer.invoke(CHANNELS.permissionScreenStatus),
    requestScreen: (): Promise<ScreenPermissionStatus> =>
      ipcRenderer.invoke(CHANNELS.permissionRequestScreen),
    openSettings: (): Promise<void> => ipcRenderer.invoke(CHANNELS.permissionOpenSettings),
  },
  app: {
    relaunch: (): Promise<void> => ipcRenderer.invoke(CHANNELS.appRelaunch),
  },
  tray: {
    updateStatus: (status: string): Promise<void> =>
      ipcRenderer.invoke(CHANNELS.trayUpdateStatus, status),
  },
};

contextBridge.exposeInMainWorld('worksight', api);

export type WorkSightApi = typeof api;
