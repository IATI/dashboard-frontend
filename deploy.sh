#!/usr/bin/env bash
# Build the Nuxt app as a static site and push it to the mockups server.
#
# Usage:
#   ./deploy.sh            # build + deploy
#   ./deploy.sh --dry-run  # build, then show what rsync would change without changing it

set -euo pipefail

REMOTE_HOST="root@iati-dashboard-mockups.emergentally.com"
REMOTE_PATH="/var/www/html/iati-dashboard-mockups"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

RSYNC_FLAGS=(-az --delete)
DRY_RUN=0
if [[ "${1:-}" == "--dry-run" ]]; then
  echo "==> Dry run: no files will be changed on the server"
  RSYNC_FLAGS+=(--dry-run -v)
  DRY_RUN=1
fi

cd "$SCRIPT_DIR"

echo "==> Installing dependencies"
npm install

echo "==> Generating static site (nuxt generate)"
rm -rf .output
npm run generate

echo "==> Syncing .output/public/ to $REMOTE_HOST:$REMOTE_PATH"
# macOS's bundled openrsync has no --chown, so ownership is fixed afterwards via ssh.
rsync "${RSYNC_FLAGS[@]}" .output/public/ "$REMOTE_HOST:$REMOTE_PATH/"

if [[ "$DRY_RUN" -eq 0 ]]; then
  echo "==> Fixing ownership on the server (www-data:www-data)"
  ssh "$REMOTE_HOST" "chown -R www-data:www-data '$REMOTE_PATH'"
fi

echo "==> Done. https://iati-dashboard-mockups.emergentally.com/"
