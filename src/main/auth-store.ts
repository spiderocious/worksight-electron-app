import fs from 'node:fs';
import path from 'node:path';
import { app, safeStorage } from 'electron';

const file = () => path.join(app.getPath('userData'), 'auth.bin');

export const authStore = {
  get(): string | null {
    try {
      const p = file();
      if (!fs.existsSync(p)) return null;
      const buf = fs.readFileSync(p);
      if (!safeStorage.isEncryptionAvailable()) return buf.toString('utf8');
      return safeStorage.decryptString(buf);
    } catch {
      return null;
    }
  },
  set(token: string) {
    const p = file();
    if (safeStorage.isEncryptionAvailable()) {
      fs.writeFileSync(p, safeStorage.encryptString(token));
    } else {
      fs.writeFileSync(p, token, 'utf8');
    }
  },
  clear() {
    try {
      fs.unlinkSync(file());
    } catch {
      // ignore
    }
  },
};
