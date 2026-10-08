# Dev-Container-Image für Rebu (Ionic + Angular + Capacitor)
# Enthält Node 20, Android SDK/Build-Tools, JDK 17, Gradle, Ionic/Angular CLI.
# iOS-Builds sind nicht möglich (benötigen macOS + Xcode).

FROM mcr.microsoft.com/devcontainers/typescript-node:1-20-bookworm

# ---------- Build-time Proxy (optional) ----------
# ARGs werden vom docker-compose übergeben. Wenn gesetzt, werden sie in
# apt- und wget-Konfiguration geschrieben. Keine persistente ENV-Variable:
# leere HTTP_PROXY-Vars bringen z.B. den Android sdkmanager zum Absturz.
ARG HTTP_PROXY=""
ARG HTTPS_PROXY=""
ARG NO_PROXY="localhost,127.0.0.1"
USER root
RUN set -e; \
    if [ -n "$HTTP_PROXY" ] || [ -n "$HTTPS_PROXY" ]; then \
      echo "Configuring proxy for apt and wget ..."; \
      { \
        [ -n "$HTTP_PROXY" ]  && echo "Acquire::http::Proxy  \"$HTTP_PROXY\";"; \
        [ -n "$HTTPS_PROXY" ] && echo "Acquire::https::Proxy \"$HTTPS_PROXY\";"; \
      } > /etc/apt/apt.conf.d/00proxy; \
      { \
        [ -n "$HTTP_PROXY" ]  && echo "http_proxy = $HTTP_PROXY"; \
        [ -n "$HTTPS_PROXY" ] && echo "https_proxy = $HTTPS_PROXY"; \
        echo "use_proxy = yes"; \
      } > /etc/wgetrc.local && cat /etc/wgetrc.local >> /etc/wgetrc; \
    fi

# ---------- Optional: zusätzliche CA-Zertifikate ----------
# Alle *.pem / *.crt in .devcontainer/certificates/ werden in den
# System-CA-Store aufgenommen. Der Ordner selbst ist versioniert (via
# .gitkeep + README.md), aber die Zertifikat-Dateien sind gitignored.
COPY .devcontainer/certificates/ /tmp/extra-certs/
RUN set -e; \
    shopt -s nullglob 2>/dev/null || true; \
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
# Vom Host injizierte Proxy-Env ggf. ignorieren (siehe Hinweis beim sdkmanager
# weiter unten). apt nutzt /etc/apt/apt.conf.d/00proxy, wenn ARG-Proxy gesetzt
# wurde.
RUN set -e; \
    unset HTTPS_PROXY HTTP_PROXY https_proxy http_proxy; \
    apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
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

RUN set -e; \
    unset HTTPS_PROXY HTTP_PROXY https_proxy http_proxy; \
    mkdir -p "${ANDROID_SDK_ROOT}/cmdline-tools" \
 && cd /tmp \
 && wget -q "https://dl.google.com/android/repository/commandlinetools-linux-${ANDROID_CMDLINE_TOOLS_VERSION}_latest.zip" -O cmdline-tools.zip \
 && unzip -q cmdline-tools.zip -d "${ANDROID_SDK_ROOT}/cmdline-tools" \
 && mv "${ANDROID_SDK_ROOT}/cmdline-tools/cmdline-tools" "${ANDROID_SDK_ROOT}/cmdline-tools/latest" \
 && rm cmdline-tools.zip

ENV PATH="${ANDROID_SDK_ROOT}/cmdline-tools/latest/bin:${ANDROID_SDK_ROOT}/platform-tools:${ANDROID_SDK_ROOT}/emulator:${PATH}"

# sdkmanager parst HTTP_PROXY/HTTPS_PROXY selbst und scheitert bei Werten,
# die er nicht versteht. Da Docker-Build-Umgebungen (Rancher Desktop etc.)
# gerne Host-Proxy-Vars injizieren, die im Container unbrauchbar sind,
# unsetten wir die Variablen hier lokal. apt/wget-Proxy ist bereits via
# Config-Dateien oben konfiguriert; sdkmanager geht direkt zu dl.google.com.
RUN set -e; \
    unset HTTPS_PROXY HTTP_PROXY https_proxy http_proxy; \
    yes | sdkmanager --licenses > /dev/null \
 && sdkmanager --install \
      "platform-tools" \
      "platforms;android-${ANDROID_PLATFORM_VERSION}" \
      "build-tools;${ANDROID_BUILD_TOOLS_VERSION}" \
 && chown -R node:node "${ANDROID_SDK_ROOT}"

# ---------- Globale npm-Tools ----------
RUN set -e; \
    unset HTTPS_PROXY HTTP_PROXY https_proxy http_proxy; \
    npm install -g @ionic/cli@latest @angular/cli@17 @capacitor/cli@6 \
 && npm cache clean --force

# ---------- Non-root User ----------
USER node
WORKDIR /workspace
