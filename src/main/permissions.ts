import { desktopCapturer, shell, systemPreferences } from 'electron';
import os from 'node:os';
import type { ScreenPermissionStatus } from '../ipc/channels';

/**
 * macOS gates screen capture behind a per-app permission. The Electron API
 * doesn't surface a clean "denied" error from desktopCapturer; the call
 * silently returns black frames if permission is missing. So we have to use
 * systemPreferences to check the OS-level state directly.
 */
export const getScreenPermissionStatus = (): ScreenPermissionStatus => {
  if (os.platform() !== 'darwin') return 'granted'; // not applicable
  try {
    return systemPreferences.getMediaAccessStatus('screen') as ScreenPermissionStatus;
  } catch {
    return 'unknown';
  }
};

/**
 * Trigger the macOS "WorkSight wants to record this computer's screen" prompt.
 * The OS only shows it the FIRST time desktopCapturer.getSources() runs for
 * the screen media type. After the user denies (or dismisses), there's no
 * programmatic re-prompt — they have to enable it in System Settings.
 *
 * Returns the post-prompt status. Note: macOS often returns 'not-determined'
 * even after the prompt fires, because the permission grant is reflected only
 * after the app is relaunched. The renderer should treat anything other than
 * 'granted' here as "needs Settings + relaunch."
 */
export const requestScreenPermission = async (): Promise<ScreenPermissionStatus> => {
  if (os.platform() !== 'darwin') return 'granted';
  const before = getScreenPermissionStatus();
  if (before === 'granted') return 'granted';
  try {
    // Doing a tiny capture trigger the OS prompt. Thumbnail size minimal to
    // make this cheap. We don't actually use the result.
    await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1, height: 1 },
    });
  } catch (err) {
    console.warn('[worksight] requestScreenPermission: capture probe failed', err);
  }
  return getScreenPermissionStatus();
};

/**
 * Deep-link to System Settings → Privacy & Security → Screen & System Audio
 * Recording. This is the URL Apple documents for the panel; falls back to
 * opening generic Privacy if the deep link is rejected.
 */
export const openScreenPermissionSettings = async (): Promise<void> => {
  if (os.platform() !== 'darwin') return;
  try {
    await shell.openExternal(
      'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture'
    );
  } catch (err) {
    console.warn('[worksight] openScreenPermissionSettings failed, falling back', err);
    await shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy');
  }
};
