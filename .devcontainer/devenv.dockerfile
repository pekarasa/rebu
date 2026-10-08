# Dev-Container-Image für Rebu (Ionic + Angular + Capacitor)
# Enthält Node 20, Android SDK/Build-Tools, JDK 17, Gradle, Ionic/Angular CLI.
# iOS-Builds sind nicht möglich (benötigen macOS + Xcode).
#
# Proxy: Wird nicht im Dockerfile konfiguriert. Falls dein Docker-Daemon
# (Docker Desktop / Rancher Desktop) einen HTTP(S)-Proxy injiziert, nutzen
# apt, wget, npm etc. ihn automatisch. Siehe .devcontainer/README.md.

FROM mcr.microsoft.com/devcontainers/typescript-node:1-20-bookworm

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

# ---------- Basispakete + JDK ----------
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      openjdk-17-jdk-headless \
      unzip \
      zip \
      wget \
      curl \
      git \
      ca-certificates \
      sudo \
    && rm -rf /var/lib/apt/lists/*

ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64

# ---------- Android SDK ----------
ENV ANDROID_SDK_ROOT=/opt/android-sdk \
    ANDROID_HOME=/opt/android-sdk \
    ANDROID_CMDLINE_TOOLS_VERSION=11076708 \
    ANDROID_PLATFORM_VERSION=34 \
    ANDROID_BUILD_TOOLS_VERSION=34.0.0

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
RUN npm install -g @ionic/cli@latest @angular/cli@17 @capacitor/cli@6 \
 && npm cache clean --force

# ---------- Non-root User ----------
USER node
WORKDIR /workspace
