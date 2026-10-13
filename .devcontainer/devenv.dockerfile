# Dev-Container-Image für Rebu (Ionic + Angular + Capacitor)
# Enthält Node 24, Android SDK/Build-Tools, JDK 21, Gradle, Ionic/Angular CLI.
# iOS-Builds sind nicht möglich (benötigen macOS + Xcode).
#
# Node 24: Angular 22 CLI verlangt Node >= 22.22 oder >= 24.15. Das
# 1-22-bookworm-Image kommt nur mit Node 22.16 (zu alt), deshalb 24.
#
# JDK 21: Capacitor 8 setzt sourceCompatibility = JavaVersion.VERSION_21 voraus.
#
# Proxy: Wird nicht im Dockerfile konfiguriert. Falls dein Docker-Daemon
# (Docker Desktop / Rancher Desktop) einen HTTP(S)-Proxy injiziert, nutzen
# apt, wget, npm etc. ihn automatisch. Siehe .devcontainer/README.md.

FROM mcr.microsoft.com/devcontainers/typescript-node:24-bookworm

# ---------- Optional: zusätzliche CA-Zertifikate ----------
# Alle *.pem / *.crt in .devcontainer/certificates/ werden in den
# System-CA-Store aufgenommen. Der Ordner selbst ist versioniert (via
# .gitkeep + README.md), aber die Zertifikat-Dateien sind gitignored.
USER root
COPY .devcontainer/certificates/ /tmp/extra-certs/
RUN set -e; \
    installed=0; \
    for f in /tmp/extra-certs/*.pem /tmp/extra-certs/*.crt; do \
      [ -f "$f" ] || continue; \
      name=$(basename "$f" | sed 's/\.pem$/.crt/'); \
      cp "$f" "/usr/local/share/ca-certificates/$name"; \
      chmod 644 "/usr/local/share/ca-certificates/$name"; \
      installed=1; \
    done; \
    if [ "$installed" = "1" ]; then update-ca-certificates; fi; \
    rm -rf /tmp/extra-certs

# ---------- Basispakete + JDK 21 (Eclipse Temurin via Adoptium APT-Repo) ----------
# Debian Bookworm liefert nur openjdk-17; openjdk-21 ist auch in bookworm-backports
# nicht verfügbar. Deshalb nutzen wir das offizielle Adoptium-APT-Repo für
# Temurin 21 (LTS). Capacitor 8 verlangt JDK 21.
RUN set -e \
 && apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      unzip \
      zip \
      wget \
      curl \
      git \
      gnupg \
      ca-certificates \
      sudo \
 && install -d -m 0755 /etc/apt/keyrings \
 && wget -qO- https://packages.adoptium.net/artifactory/api/gpg/key/public \
      | gpg --dearmor -o /etc/apt/keyrings/adoptium.gpg \
 && chmod 0644 /etc/apt/keyrings/adoptium.gpg \
 && echo "deb [signed-by=/etc/apt/keyrings/adoptium.gpg] https://packages.adoptium.net/artifactory/deb bookworm main" \
      > /etc/apt/sources.list.d/adoptium.list \
 && apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      temurin-21-jdk \
 && rm -rf /var/lib/apt/lists/*

ENV JAVA_HOME=/usr/lib/jvm/temurin-21-jdk-amd64

# ---------- Android SDK ----------
ENV ANDROID_SDK_ROOT=/opt/android-sdk \
    ANDROID_HOME=/opt/android-sdk \
    ANDROID_CMDLINE_TOOLS_VERSION=11076708 \
    ANDROID_PLATFORM_VERSION=36 \
    ANDROID_BUILD_TOOLS_VERSION=36.0.0

RUN mkdir -p "${ANDROID_SDK_ROOT}/cmdline-tools" \
 && cd /tmp \
 && wget -q "https://dl.google.com/android/repository/commandlinetools-linux-${ANDROID_CMDLINE_TOOLS_VERSION}_latest.zip" -O cmdline-tools.zip \
 && unzip -q cmdline-tools.zip -d "${ANDROID_SDK_ROOT}/cmdline-tools" \
 && mv "${ANDROID_SDK_ROOT}/cmdline-tools/cmdline-tools" "${ANDROID_SDK_ROOT}/cmdline-tools/latest" \
 && rm cmdline-tools.zip

ENV PATH="${ANDROID_SDK_ROOT}/cmdline-tools/latest/bin:${ANDROID_SDK_ROOT}/platform-tools:${ANDROID_SDK_ROOT}/emulator:${PATH}"

# sdkmanager ist ein Java-Programm und ignoriert HTTP_PROXY/HTTPS_PROXY.
# Es respektiert nur Java-System-Properties (https.proxyHost/Port). Hinter
# einem Corporate-Proxy (Zscaler o.ae.) muessen deswegen Build-Args
# JAVA_PROXY_HOST und JAVA_PROXY_PORT gesetzt werden; sie landen via
# JAVA_TOOL_OPTIONS in der JVM. Ohne Proxy bleiben beide leer und der
# Schritt laeuft unveraendert.
ARG JAVA_PROXY_HOST=""
ARG JAVA_PROXY_PORT=""
RUN set -e; \
    if [ -n "$JAVA_PROXY_HOST" ] && [ -n "$JAVA_PROXY_PORT" ]; then \
      export JAVA_TOOL_OPTIONS="-Dhttp.proxyHost=${JAVA_PROXY_HOST} -Dhttp.proxyPort=${JAVA_PROXY_PORT} -Dhttps.proxyHost=${JAVA_PROXY_HOST} -Dhttps.proxyPort=${JAVA_PROXY_PORT}"; \
      echo "sdkmanager: using JAVA_TOOL_OPTIONS=$JAVA_TOOL_OPTIONS"; \
    fi; \
    yes | sdkmanager --licenses > /dev/null; \
    sdkmanager --install \
      "platform-tools" \
      "platforms;android-${ANDROID_PLATFORM_VERSION}" \
      "build-tools;${ANDROID_BUILD_TOOLS_VERSION}"; \
    chown -R node:node "${ANDROID_SDK_ROOT}"

# ---------- Globale npm-Tools ----------
# opencode-ai: AI coding agent CLI, muss im Container verfügbar sein, damit
# Sessions innerhalb des Devcontainers laufen können (statt via docker exec).
# Version gepinnt für Reproduzierbarkeit; Updates bewusst via PR.
RUN npm install -g \
      @ionic/cli@latest \
      @angular/cli@22 \
      @capacitor/cli@8 \
      opencode-ai@1.18.35 \
 && npm cache clean --force

# ---------- Non-root User ----------
USER node
WORKDIR /workspace
