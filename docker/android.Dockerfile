# CI-Image für Android-APK-Builds (unsigniert)
# Verwendet in GitHub Actions für: build-android.
#
# Basis: Microsoft Container Registry (schneller und zuverlässiger als Docker Hub).
# JDK 21: Capacitor 8 setzt sourceCompatibility = JavaVersion.VERSION_21 voraus.

FROM mcr.microsoft.com/devcontainers/typescript-node:1-24-bookworm

ENV DEBIAN_FRONTEND=noninteractive \
    JAVA_HOME=/usr/lib/jvm/temurin-21-jdk-amd64 \
    ANDROID_SDK_ROOT=/opt/android-sdk \
    ANDROID_HOME=/opt/android-sdk \
    ANDROID_CMDLINE_TOOLS_VERSION=11076708 \
    ANDROID_PLATFORM_VERSION=36 \
    ANDROID_BUILD_TOOLS_VERSION=36.0.0

USER root
# JDK 21 via Adoptium Temurin APT-Repo (Debian Bookworm hat kein openjdk-21).
RUN set -e \
 && apt-get update \
 && apt-get install -y --no-install-recommends \
      unzip \
      zip \
      wget \
      curl \
      gnupg \
      ca-certificates \
 && install -d -m 0755 /etc/apt/keyrings \
 && wget -qO- https://packages.adoptium.net/artifactory/api/gpg/key/public \
      | gpg --dearmor -o /etc/apt/keyrings/adoptium.gpg \
 && chmod 0644 /etc/apt/keyrings/adoptium.gpg \
 && echo "deb [signed-by=/etc/apt/keyrings/adoptium.gpg] https://packages.adoptium.net/artifactory/deb bookworm main" \
      > /etc/apt/sources.list.d/adoptium.list \
 && apt-get update \
 && apt-get install -y --no-install-recommends \
      temurin-21-jdk \
 && rm -rf /var/lib/apt/lists/*

RUN mkdir -p "${ANDROID_SDK_ROOT}/cmdline-tools" \
 && cd /tmp \
 && wget -q "https://dl.google.com/android/repository/commandlinetools-linux-${ANDROID_CMDLINE_TOOLS_VERSION}_latest.zip" -O cmdline-tools.zip \
 && unzip -q cmdline-tools.zip -d "${ANDROID_SDK_ROOT}/cmdline-tools" \
 && mv "${ANDROID_SDK_ROOT}/cmdline-tools/cmdline-tools" "${ANDROID_SDK_ROOT}/cmdline-tools/latest" \
 && rm cmdline-tools.zip

ENV PATH="${ANDROID_SDK_ROOT}/cmdline-tools/latest/bin:${ANDROID_SDK_ROOT}/platform-tools:${PATH}"

RUN yes | sdkmanager --licenses > /dev/null \
 && sdkmanager --install \
      "platform-tools" \
      "platforms;android-${ANDROID_PLATFORM_VERSION}" \
      "build-tools;${ANDROID_BUILD_TOOLS_VERSION}" \
 && chown -R node:node "${ANDROID_SDK_ROOT}"

USER node
WORKDIR /workspace
