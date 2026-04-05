#!/bin/bash
# Deploy the keyboard-relay.js postMessage bridge into the noVNC container
#
# This script:
# 1. Copies keyboard-relay.js into the running openclaw-novnc container
# 2. Injects a <script> tag into vnc.html to load it
# 3. The change persists until the container is recreated
#
# Run from: ecosystem-dashboard/src/components/tesla/
# Usage: bash deploy-keyboard-relay.sh

set -euo pipefail

CONTAINER="openclaw-novnc"
NOVNC_DIR="/usr/share/novnc"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RELAY_JS="$SCRIPT_DIR/novnc-keyboard-relay.js"

echo "=== noVNC Keyboard Relay Deployment ==="

# Check container is running
if ! docker inspect "$CONTAINER" --format '{{.State.Running}}' 2>/dev/null | grep -q true; then
  echo "ERROR: Container '$CONTAINER' is not running"
  exit 1
fi

# Check relay script exists
if [ ! -f "$RELAY_JS" ]; then
  echo "ERROR: $RELAY_JS not found"
  exit 1
fi

# 1. Copy the relay script into the container
echo "[1/3] Copying keyboard-relay.js into container..."
docker cp "$RELAY_JS" "$CONTAINER:$NOVNC_DIR/app/keyboard-relay.js"

# 2. Check if the script tag already exists
ALREADY_INJECTED=$(docker exec "$CONTAINER" grep -c "keyboard-relay\.js" "$NOVNC_DIR/vnc.html" 2>/dev/null || true)

if [ "$ALREADY_INJECTED" != "0" ]; then
  echo "[2/3] Script tag already present in vnc.html — skipping injection"
else
  echo "[2/3] Injecting <script> tag into vnc.html..."
  # Insert our script tag right after the existing ui.js script tag
  docker exec "$CONTAINER" sed -i \
    's|<script type="module" crossorigin="anonymous" src="app/ui.js"></script>|<script type="module" crossorigin="anonymous" src="app/ui.js"></script>\n    <script type="module" crossorigin="anonymous" src="app/keyboard-relay.js"></script>|' \
    "$NOVNC_DIR/vnc.html"
fi

# 3. Verify
echo "[3/3] Verifying..."
if docker exec "$CONTAINER" grep -q "keyboard-relay.js" "$NOVNC_DIR/vnc.html"; then
  echo "✅ keyboard-relay.js deployed and injected into vnc.html"
  echo ""
  echo "The postMessage bridge is now active. Any new page load of"
  echo "vnc.hyperspaceanalytics.com will include the keyboard relay."
  echo ""
  echo "Existing browser tabs need a hard refresh (Ctrl+Shift+R)."
else
  echo "❌ Injection failed — please check container manually"
  exit 1
fi
