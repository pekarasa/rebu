#!/bin/bash
# Läuft bei jedem Container-Start (postStartCommand).

set -e

echo "Starting post-start setup..."

# ---------------------------------------------------------------------------
# Fix permissions for persistent volumes
# ---------------------------------------------------------------------------
echo "Fixing permissions on /mnt/user_data ..."
sudo chown -R node:node /mnt/user_data || true

# ---------------------------------------------------------------------------
# opencode: Elternordner der read-only File-Mounts dem User gehoeren lassen.
#
# docker-compose mountet auth.json/opencode.jsonc als einzelne Datei read-only.
# Dabei legt Docker die Zielordner inkl. aller fehlenden Zwischenebenen
# (/home/node/.local, /home/node/.local/share, /home/node/.config) als root
# an. opencode will daneben repos/, storage/, sessions/ UND auch
# /home/node/.local/state/ schreiben -> EACCES fuer User node.
#
# Loesung: alle moeglichen betroffenen Elternebenen rekursiv dem User node
# geben. chown springt an den read-only File-Mounts (auth.json etc.) sauber
# weiter, weil sie als eigene Mount-Points gelten; -h haelt Symlinks heil,
# --preserve-root schuetzt vor Unfaellen.
# ---------------------------------------------------------------------------
for d in /home/node/.local /home/node/.config /home/node/.cache; do
    if [ -d "$d" ]; then
        sudo chown -R --preserve-root node:node "$d" 2>/dev/null || true
    else
        sudo install -d -o node -g node "$d" 2>/dev/null || true
    fi
done

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
