# Devcontainer – Rebu

VS Code Dev Container für Ionic + Angular + Capacitor-Entwicklung inkl.
Android-Toolchain. iOS-Builds brauchen macOS + Xcode und sind hier nicht
möglich.

## Enthalten

- Node 24, npm, Ionic CLI (latest), Angular CLI 22, Capacitor CLI 8
- OpenJDK 17
- Android SDK (Platform 34, Build-Tools 34.0.0, Platform-Tools)
- Vorinstallierte VS Code Extensions (Angular, Ionic, ESLint, Prettier, …)

## Benutzung

1. VS Code mit "Dev Containers"-Extension öffnen.
2. "Reopen in Container" ausführen.
3. Beim ersten Start wird das Image gebaut (ca. 3 Minuten + Download).

## Hinter einem Corporate-Proxy

Proxy-Settings werden **nicht** im docker-compose.yml oder Dockerfile
konfiguriert, sondern auf Docker-Daemon-Ebene. Der Daemon injiziert dann
automatisch `HTTP_PROXY`/`HTTPS_PROXY`/`NO_PROXY` in jeden Build und
Container, und apt/wget/npm/sdkmanager nutzen sie transparent.

### Rancher Desktop

Settings → Preferences → Virtual Machine → Proxy. HTTP/HTTPS-Proxy
eintragen. Rancher Desktop sorgt dafür, dass der Proxy-Host aus dem
Container-Netz erreichbar ist (DNS/Routing).

### Docker Desktop

Settings → Resources → Proxies. Analog.

### TLS-Interception / Firmen-CA-Zertifikate

Wenn dein Proxy TLS aufbricht, braucht der Container das Firmen-CA-Zertifikat:

1. Zertifikat als `*.pem` oder `*.crt` in `.devcontainer/certificates/`
   ablegen (gitignored).
2. Beim Image-Build (`devenv.dockerfile`) werden sie automatisch in den
   System-CA-Store aufgenommen (`update-ca-certificates`).
3. Container rebuilden ("Dev Containers: Rebuild Container").

Node.js nutzt den System-CA-Store nicht automatisch. Falls nötig, in
`containerEnv` von `devcontainer.json`:
`NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt`.

## Dateien

| Datei | Zweck |
|---|---|
| `devcontainer.json` | VS Code Dev-Container-Konfiguration |
| `docker-compose.yml` | Service-Definition (bind-mount Workspace etc.) |
| `devenv.dockerfile` | Image-Build: Node + JDK + Android SDK + CLIs |
| `post-start.sh` | Läuft bei jedem Container-Start (Permissions, Infos) |
| `.env.example` | Vorlage für lokale Compose-Env-Variablen (nicht committed als `.env`) |
| `certificates/` | Optionale CA-Zertifikate (Inhalt gitignored) |
