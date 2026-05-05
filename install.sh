#!/usr/bin/env bash
#
# WorkSight installer for macOS.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/spiderocious/worksight-electron-app/main/install.sh | bash
#
# Or pin a specific version:
#   curl -fsSL https://raw.githubusercontent.com/spiderocious/worksight-electron-app/main/install.sh | WORKSIGHT_VERSION=0.1.0 bash
#
# The script:
#   1. Detects your CPU architecture (arm64 vs Intel)
#   2. Downloads the matching unsigned .app.zip from GitHub Releases
#   3. Installs to /Applications/WorkSight.app
#   4. Strips the macOS quarantine attribute so Gatekeeper lets it open
#
# WorkSight is currently distributed unsigned. The xattr step in #4 is what
# tells macOS "the user has consciously authorized this app." We do not
# bypass any security checks — we just acknowledge the download is intentional.

set -euo pipefail

# -------------------- config --------------------
REPO="spiderocious/worksight-electron-app"
VERSION="${WORKSIGHT_VERSION:-latest}"
TARGET_APP="/Applications/WorkSight.app"

# -------------------- helpers --------------------
log()  { printf "\033[1;32m→\033[0m %s\n" "$1"; }
warn() { printf "\033[1;33m!\033[0m %s\n" "$1" >&2; }
fail() { printf "\033[1;31m✗\033[0m %s\n" "$1" >&2; exit 1; }

# -------------------- platform checks --------------------
if [ "$(uname -s)" != "Darwin" ]; then
  fail "WorkSight only runs on macOS. Detected: $(uname -s)"
fi

ARCH=$(uname -m)
case "$ARCH" in
  arm64)  ARCHIVE_SUFFIX="arm64-mac.zip" ;;
  x86_64) ARCHIVE_SUFFIX="mac.zip" ;;
  *)      fail "Unsupported architecture: $ARCH" ;;
esac

# -------------------- resolve URL --------------------
if [ "$VERSION" = "latest" ]; then
  # GitHub's "latest" redirect: stable across releases.
  DOWNLOAD_URL="https://github.com/${REPO}/releases/latest/download/WorkSight-${ARCHIVE_SUFFIX}"
  # …except electron-builder names files with the version embedded. We resolve
  # the actual asset URL via the GitHub API so we don't 404 when the asset
  # filename doesn't match the redirect path.
  log "Resolving latest release..."
  RESOLVED=$(curl -fsSL -H "Accept: application/vnd.github+json" \
    "https://api.github.com/repos/${REPO}/releases/latest" \
    | grep -oE '"browser_download_url": *"[^"]+'"${ARCHIVE_SUFFIX}"'"' \
    | head -n 1 \
    | sed -E 's/.*"([^"]+)"$/\1/')
  if [ -z "$RESOLVED" ]; then
    fail "Couldn't find a ${ARCHIVE_SUFFIX} asset in the latest release of ${REPO}."
  fi
  DOWNLOAD_URL="$RESOLVED"
else
  DOWNLOAD_URL="https://github.com/${REPO}/releases/download/v${VERSION}/WorkSight-${VERSION}-${ARCHIVE_SUFFIX}"
fi

# -------------------- download --------------------
TMPDIR=$(mktemp -d -t worksight)
trap 'rm -rf "$TMPDIR"' EXIT

log "Downloading WorkSight ($ARCH)..."
log "  $DOWNLOAD_URL"
if ! curl -fL --progress-bar "$DOWNLOAD_URL" -o "$TMPDIR/worksight.zip"; then
  fail "Download failed. Check your network connection and try again."
fi

# -------------------- extract --------------------
log "Extracting..."
if ! unzip -q "$TMPDIR/worksight.zip" -d "$TMPDIR"; then
  fail "Couldn't extract the archive. The download may be corrupt."
fi

if [ ! -d "$TMPDIR/WorkSight.app" ]; then
  fail "The archive didn't contain WorkSight.app — got:\n$(ls "$TMPDIR")"
fi

# -------------------- install --------------------
if [ -d "$TARGET_APP" ]; then
  log "Replacing existing install at $TARGET_APP..."
  if ! rm -rf "$TARGET_APP" 2>/dev/null; then
    warn "Couldn't remove $TARGET_APP (may need elevated permissions)."
    sudo rm -rf "$TARGET_APP" || fail "Couldn't remove $TARGET_APP."
  fi
fi

log "Installing to $TARGET_APP..."
if ! mv "$TMPDIR/WorkSight.app" "$TARGET_APP" 2>/dev/null; then
  warn "Couldn't write to /Applications without elevated permissions."
  sudo mv "$TMPDIR/WorkSight.app" "$TARGET_APP" || fail "Install failed."
fi

# -------------------- authorize --------------------
log "Authorizing app (clearing quarantine attribute)..."
xattr -dr com.apple.quarantine "$TARGET_APP" 2>/dev/null || true

# -------------------- launch --------------------
# Tiny pause so the quarantine strip + Launch Services registration settle
# before we ask macOS to open the app. Best-effort — if it hiccups we don't
# fail the install; the user can re-run `open -a WorkSight` from the message
# below.
log "Launching WorkSight..."
sleep 1
open -a "WorkSight" 2>/dev/null || true

# -------------------- done --------------------
cat <<EOF

  ✓ WorkSight installed and launched.

  If it didn't open automatically, you can launch it yourself with:
      open -a WorkSight

  Or just open it from /Applications.

  Need help? https://github.com/${REPO}

EOF
