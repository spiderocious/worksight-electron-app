import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { app } from 'electron';
import { apiRequest } from './api-client';
import { ALWAYS_ALLOW_HOSTS } from './config';
import { networkDirtyFlag } from './session-state';
import { HTTP_LISTEN_PORT, HTTPS_LISTEN_PORT } from './blocked-listener';

const execAsync = promisify(exec);

const HOSTS_PATH = '/etc/hosts';
const PF_RULES_PATH = '/tmp/worksight.pf.conf';
const HOSTS_BACKUP = () => path.join(app.getPath('userData'), 'hosts.bak');
const HOSTS_BEGIN = '# >>> WORKSIGHT BEGIN >>>';
const HOSTS_END = '# <<< WORKSIGHT END <<<';

interface BlocklistResponse {
  domains: string[];
  updatedAt: string;
}

// Write the multi-line shell script to a fixed path (no spaces, no apostrophes)
// and ask osascript to run that. Avoids quoting hell when userData paths contain
// spaces (e.g. "Application Support") or other special characters.
const SUDO_SCRIPT_PATH = '/tmp/worksight-sudo.sh';

const sudoExec = async (script: string): Promise<void> => {
  fs.writeFileSync(SUDO_SCRIPT_PATH, `#!/bin/bash\nset -e\n${script}\n`, { mode: 0o700 });
  await execAsync(
    `osascript -e 'do shell script "/bin/bash ${SUDO_SCRIPT_PATH}" with administrator privileges'`
  );
};

export const fetchBlocklist = async (): Promise<string[]> => {
  const res = await apiRequest<BlocklistResponse>('/blocklist', { noAuth: true });
  // Defensive: never block our own infrastructure even if the server adds it.
  return res.domains.filter((d) => !ALWAYS_ALLOW_HOSTS.some((h) => d === h || d.endsWith(h)));
};

const buildHostsBlock = (domains: string[]): string => {
  const lines = [HOSTS_BEGIN];
  for (const d of domains) {
    lines.push(`127.0.0.1 ${d}`);
    lines.push(`::1 ${d}`);
  }
  lines.push(HOSTS_END);
  return lines.join('\n');
};

/**
 * pf ruleset structure:
 *
 *   1. `rdr` rules redirect locally-destined traffic on 80/443 to our high
 *      ports (8080/8443) where the WorkSight blocked-listener picks it up.
 *      Since /etc/hosts redirects every blocked domain to 127.0.0.1, ALL
 *      connection attempts to those domains end up funneled here.
 *   2. The listener reads enough bytes to extract the hostname (TLS SNI or
 *      HTTP Host header), records the attempt, takes a screenshot, then drops
 *      the connection. The candidate's browser shows "site can't be reached".
 *
 * pf rules require an `anchor` for `rdr` and a separate file for the rules
 * themselves on macOS Sonoma+. We use the simpler form which still works:
 * load via `pfctl -f` and let the rules apply globally.
 */
const buildPfRules = (httpPort: number, httpsPort: number): string => {
  const lines = [
    '# WorkSight pf rules — generated, do not edit',
    `rdr pass on lo0 inet proto tcp from any to 127.0.0.1 port 80  -> 127.0.0.1 port ${httpPort}`,
    `rdr pass on lo0 inet proto tcp from any to 127.0.0.1 port 443 -> 127.0.0.1 port ${httpsPort}`,
  ];
  return lines.join('\n') + '\n';
};

export const applyBlock = async (domains: string[]): Promise<void> => {
  if (os.platform() !== 'darwin') {
    throw new Error('Network blocking is only supported on macOS in v1');
  }

  // 1. Backup current hosts file (we keep a per-app copy so restore is reliable).
  const backupPath = HOSTS_BACKUP();
  const current = fs.readFileSync(HOSTS_PATH, 'utf8');
  fs.writeFileSync(backupPath, current);

  // 2. Build new hosts content with our block appended.
  const stripped = stripWorksightFromHosts(current);
  const next = stripped.replace(/\n+$/, '') + '\n\n' + buildHostsBlock(domains) + '\n';

  // 3. Write a temp file we own, then sudo-copy it over /etc/hosts and load pf.
  const tmpHosts = path.join(app.getPath('userData'), 'hosts.next');
  fs.writeFileSync(tmpHosts, next);

  const tmpPf = PF_RULES_PATH;
  fs.writeFileSync(tmpPf, buildPfRules(HTTP_LISTEN_PORT, HTTPS_LISTEN_PORT));

  // Mark the dirty flag BEFORE we touch any system state. If sudoExec throws,
  // we still want the next launch to know to run a defensive restoreNetwork.
  networkDirtyFlag.mark();

  // Single elevated invocation: copy hosts, flush DNS, load pf rules.
  const script = [
    `cp ${escapeShell(tmpHosts)} ${HOSTS_PATH}`,
    `dscacheutil -flushcache`,
    `killall -HUP mDNSResponder || true`,
    `pfctl -f ${escapeShell(tmpPf)}`,
    `pfctl -e || true`,
  ].join(' && ');
  await sudoExec(script);
};

export const restoreNetwork = async (): Promise<void> => {
  if (os.platform() !== 'darwin') return;
  const backupPath = HOSTS_BACKUP();
  let restoreContent: string;
  if (fs.existsSync(backupPath)) {
    restoreContent = fs.readFileSync(backupPath, 'utf8');
  } else {
    // No backup — just strip our markers from the live file
    restoreContent = stripWorksightFromHosts(fs.readFileSync(HOSTS_PATH, 'utf8'));
  }
  const tmp = path.join(app.getPath('userData'), 'hosts.restore');
  fs.writeFileSync(tmp, restoreContent);

  const script = [
    `cp ${escapeShell(tmp)} ${HOSTS_PATH}`,
    `dscacheutil -flushcache`,
    `killall -HUP mDNSResponder || true`,
    `pfctl -d || true`,
  ].join(' && ');
  try {
    await sudoExec(script);
    // Only clear the dirty flag once restore actually succeeded. Otherwise
    // next launch will retry restore defensively.
    networkDirtyFlag.clear();
  } catch (err) {
    // Best-effort: log and move on. The next session start will overwrite anyway.
    console.error('[worksight] restore failed', err);
  }
  try {
    fs.unlinkSync(backupPath);
  } catch {
    // ignore
  }
};

const stripWorksightFromHosts = (content: string): string => {
  const beginIdx = content.indexOf(HOSTS_BEGIN);
  const endIdx = content.indexOf(HOSTS_END);
  if (beginIdx === -1 || endIdx === -1 || endIdx < beginIdx) return content;
  const before = content.slice(0, beginIdx).replace(/\n+$/, '');
  const after = content.slice(endIdx + HOSTS_END.length);
  return before + after;
};

const escapeShell = (p: string) => `'${p.replace(/'/g, `'\\''`)}'`;
