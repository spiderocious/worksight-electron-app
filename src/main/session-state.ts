import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';

// We no longer persist the full session record locally. The server is the
// source of truth for everything session-related. The only thing we need to
// remember across app restarts is whether we touched /etc/hosts and pf — so
// we can defensively restore them if the app crashed mid-session.

const flagPath = () => path.join(app.getPath('userData'), 'network-dirty');

export const networkDirtyFlag = {
  mark(): void {
    try {
      fs.writeFileSync(flagPath(), '');
    } catch {
      // best-effort
    }
  },
  clear(): void {
    try {
      fs.unlinkSync(flagPath());
    } catch {
      // ignore
    }
  },
  isSet(): boolean {
    return fs.existsSync(flagPath());
  },
};

// Legacy session.json cleanup — if a previous version of the app left one
// behind, delete it so it doesn't confuse anyone.
export const cleanupLegacySessionFile = (): void => {
  try {
    fs.unlinkSync(path.join(app.getPath('userData'), 'session.json'));
  } catch {
    // not present, nothing to do
  }
};
