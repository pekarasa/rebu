# CI-Image für Android-APK-Builds (unsigniert)
# Verwendet in GitHub Actions für: build-android.
#
# Basis: Microsoft Container Registry (schneller und zuverlässiger als Docker Hub).

FROM mcr.microsoft.com/devcontainers/typescript-node:1-20-bookworm

ENV DEBIAN_FRONTEND=noninteractive \
    JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 \
    ANDROID_SDK_ROOT=/opt/android-sdk \
    ANDROID_HOME=/opt/android-sdk \
    ANDROID_CMDLINE_TOOLS_VERSION=11076708 \
    ANDROID_PLATFORM_VERSION=34 \
    ANDROID_BUILD_TOOLS_VERSION=34.0.0

USER root
RUN apt-get update && apt-get install -y --no-install-recommends \
      openjdk-17-jdk-headless \
      unzip \
      zip \
      wget \
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
