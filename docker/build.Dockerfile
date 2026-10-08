# CI-Build-Image für Rebu
# Verwendet in GitHub Actions für: install, lint, typecheck, test-unit, build-web.
# Enthält Chromium für headless Browser-Tests (Karma/Playwright).
#
# Basis: Microsoft Container Registry (schneller und zuverlässiger als Docker Hub).

FROM mcr.microsoft.com/devcontainers/typescript-node:1-20-bookworm

ENV DEBIAN_FRONTEND=noninteractive \
    CHROME_BIN=/usr/bin/chromium \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

USER root
RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium \
      chromium-sandbox \
      fonts-liberation \
      ca-certificates \
      jq \
    && rm -rf /var/lib/apt/lists/*

USER node
WORKDIR /workspace
