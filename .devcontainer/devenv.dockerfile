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

# ---------- Basispakete + JDK 21 ----------
# openjdk-21-jdk-headless ist in bookworm-backports verfügbar.
RUN apt-get update \
 && echo "deb http://deb.debian.org/debian bookworm-backports main" > /etc/apt/sources.list.d/backports.list \
 && apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      -t bookworm-backports openjdk-21-jdk-headless \
      unzip \
      zip \
      wget \
      curl \
      git \
      ca-certificates \
      sudo \
    && rm -rf /var/lib/apt/lists/*

ENV JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64

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

# sdkmanager parst HTTP_PROXY/HTTPS_PROXY selbst und scheitert bei Werten,
# die er nicht versteht (z.B. leer). Wir übergeben hier bewusst nichts an
# den sdkmanager; er nutzt die DNS-Auflösung und direkte Verbindung.
# Falls Daemon-Proxy mit TLS-Interception aktiv ist, nutzt sdkmanager die
# ENVs transparent, solange der Proxy-Host erreichbar ist.
RUN yes | sdkmanager --licenses > /dev/null \
 && sdkmanager --install \
      "platform-tools" \
      "platforms;android-${ANDROID_PLATFORM_VERSION}" \
      "build-tools;${ANDROID_BUILD_TOOLS_VERSION}" \
 && chown -R node:node "${ANDROID_SDK_ROOT}"

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
