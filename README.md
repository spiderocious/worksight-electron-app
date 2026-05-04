# worksight-electron

The candidate-facing desktop app for WorkSight. macOS-only by design (the network-blocking layer uses `pf` and `/etc/hosts`). Electron + React + TypeScript.

---

## Architecture

Three processes, one project:

```
src/
├── main/                # Electron main process (Node.js)
│   ├── index.ts         # Entry point: window, IPC, lifecycle
│   ├── api-client.ts    # Calls the WorkSight backend
│   ├── auth-store.ts    # Persists candidate token via safeStorage
│   ├── session-state.ts # The "I touched the network" flag (the only persisted state)
│   ├── session-manager.ts   # Owns the active session lifecycle
│   ├── screenshot-loop.ts   # desktopCapturer + file-service uploads
│   ├── network-blocking.ts  # /etc/hosts + pfctl via osascript
│   ├── tray-controller.ts   # Menu bar status + countdown
│   ├── file-service.ts  # Presigned PUT/GET against the file service
│   └── config.ts        # Defaults + always-allow hosts
├── preload/             # Bridge — exposes a typed `window.worksight` to the renderer
│   └── index.ts
├── ipc/                 # Channels + payload types (shared by main + preload + renderer)
│   └── channels.ts
└── renderer/            # The React UI the candidate actually sees
    ├── app.tsx          # Tiny route state machine
    ├── main.tsx         # ReactDOM root
    ├── index.html
    ├── index.css        # Tailwind + Google Fonts
    ├── features/
    │   ├── auth/        # 10-char access code entry
    │   ├── dashboard/   # Pending / in-progress / completed assignments
    │   ├── assignment/  # Brief screen
    │   └── session/     # Rules, in-session HUD, submitted screen
    └── shared/
        ├── ui/          # Button, Card, Modal, Logo, icons proxy, icon-catalog
        ├── hooks/       # useToast
        ├── services/    # api-client (fetch + token via preload bridge)
        ├── utils/       # format-date
        ├── types.ts     # Shared payload shapes
        └── window-api.ts # Typed handle to the preload bridge
```

The renderer is sandboxed and never talks directly to the OS — anything privileged goes through an IPC channel defined in `src/ipc/channels.ts`.

---

## Quick start

```bash
npm install
npm run dev
```

`npm run dev` runs three things concurrently:

1. **Vite** — renderer dev server on port 5174 with HMR.
2. **TypeScript** — main process in `--watch` mode, compiling to `dist-electron/`.
3. **Electron** — launches once both are ready (the script unsets `ELECTRON_RUN_AS_NODE` to avoid a known footgun).

The backend must be running locally on port 4000 — see [`worksight-backend/README.md`](../worksight-backend/README.md).

---

## Environment

```bash
# Where the WorkSight backend lives. Default: http://localhost:4000/api
WORKSIGHT_API=http://localhost:4000/api

# Where the renderer dev server is — only used in dev. Default: http://localhost:5174
WORKSIGHT_DEV_URL=http://localhost:5174
```

In packaged builds, `WORKSIGHT_API` should point at your production backend (set at build time or via electron-builder's `extraMetadata`).

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Renderer + main watcher + Electron, all concurrently |
| `npm run dev:renderer` | Just the Vite dev server |
| `npm run dev:main` | Just the TypeScript watcher for main |
| `npm run dev:electron` | Just Electron (assumes the other two are running) |
| `npm run build` | Vite production build + TS compile of main |
| `npm run start` | Runs the packaged build via electron CLI |
| `npm run typecheck` | Typechecks both renderer (`tsconfig.json`) and main (`tsconfig.electron.json`) |

---

## Network blocking — how the macOS sudo dance works

When a session starts, the app:

1. Sets a "network dirty" flag on disk (`~/Library/Application Support/worksight-electron/network-dirty`).
2. Backs up `/etc/hosts` to userData and writes a temp file with the blocklist appended.
3. Writes a `pf` ruleset to `/tmp/worksight.pf.conf`.
4. Bundles the privileged commands into `/tmp/worksight-sudo.sh` (a path with no spaces).
5. Calls `osascript -e 'do shell script "/bin/bash /tmp/worksight-sudo.sh" with administrator privileges'` — this is what triggers macOS's native admin password prompt.
6. Inside that elevated bash run: `cp` the new hosts file, `dscacheutil -flushcache`, `killall -HUP mDNSResponder`, and `pfctl -f` + `pfctl -e`.

On clean submit *or* on next launch if the dirty flag is set, the same dance runs in reverse — restore hosts, `pfctl -d`, clear the flag.

The osascript indirection (writing a script file rather than passing the command inline) avoids quoting hell when userData paths contain spaces (e.g. *Application Support*).

### Why we ask for the password every session

The cleanest non-paid path. Two upgrades on the table:

- **`sudoers.d` rule** — install `/etc/sudoers.d/worksight` once via the same admin prompt; future sessions never prompt again.
- **Privileged helper tool (SMAppService)** — the proper macOS way. Heavyweight to set up, bulletproof once done. v2.

See [`docs/distribution.md`](../docs/distribution.md) for the related "ship without paying Apple" plan.

---

## Server is the source of truth

The Electron app does not persist session state. On launch:

1. If `network-dirty` exists, defensively run `restoreNetwork()`.
2. Hit `GET /api/candidate/me` — the server tells us whether the candidate has an in-progress session.
3. If yes, fetch the full session via `GET /api/candidate/sessions/:id`, rehydrate the in-memory state, report abnormal termination, resume the tick loop.
4. If no, show the regular dashboard.

This means crashing, restarting, or even reinstalling the app cannot lose a session — the timer always runs to completion server-side, and the candidate's UI always reflects what the server believes.

---

## Distribution

Packaging is gated on [`docs/distribution.md`](../docs/distribution.md). Three channels planned:

- **D** — clone + `npm run start:packaged` (closed beta, technical candidates).
- **C** — unsigned `.app.zip` + a one-line `xattr` step (download flow).
- **F** — Homebrew cask wrapping the same zip (recommended default).

None of these require an Apple Developer account. We pay Apple the moment we have a paying customer.

---

## What this app deliberately does NOT do

- Run on Windows or Linux. macOS only — `pf` and `osascript` are Mac-specific.
- Bypass the user's password prompt for elevation. We always go through `osascript`.
- Store image bytes. Screenshots PUT directly to the file service; only the returned key is sent to our backend.
- Persist session state across restarts. The server is the single source of truth.
- Run automated tests in v1.
