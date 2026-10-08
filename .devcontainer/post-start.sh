#!/bin/bash
# Läuft bei jedem Container-Start (postStartCommand).

set -e

echo "Starting post-start setup..."

# ---------------------------------------------------------------------------
# Fix permissions for persistent volumes
# ---------------------------------------------------------------------------
echo "Fixing permissions on /mnt/user_data ..."
sudo chown -R node:node /mnt/user_data || true

# Ensure git hooks (falls vorhanden) ausführbar sind.
if [ -d ".githooks" ]; then
    chmod +x .githooks/* 2>/dev/null || true
fi

# ---------------------------------------------------------------------------
# Toolchain-Versionen (informativ)
# ---------------------------------------------------------------------------
echo ""
echo "=== Toolchain versions ==="
echo "Node:   $(node --version)"
echo "NPM:    $(npm --version)"
echo "Java:   $(java -version 2>&1 | head -1)"
echo "SDK:    $(sdkmanager --version 2>/dev/null || echo 'n/a')"
echo "Ionic:  $(ionic --version 2>/dev/null || echo 'n/a')"
echo ""
echo "Post-start setup complete."
