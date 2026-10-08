# Devcontainer – Rebu

VS Code Dev Container für Ionic + Angular + Capacitor-Entwicklung inkl.
Android-Toolchain. iOS-Builds brauchen macOS + Xcode und sind hier nicht
möglich.

## Enthalten

- Node 20, npm, Ionic CLI 7, Angular CLI 17, Capacitor CLI 6
- OpenJDK 17
- Android SDK (Platform 34, Build-Tools 34.0.0, Platform-Tools)
- Vorinstallierte VS Code Extensions (Angular, Ionic, ESLint, Prettier, …)

## Benutzung

1. VS Code mit "Dev Containers"-Extension öffnen.
2. "Reopen in Container" ausführen.
3. Beim ersten Start wird das Image gebaut (ca. 3 Minuten + Download).

## Hinter einem Corporate-Proxy

Falls du einen Proxy brauchst:

1. `.devcontainer/.env.example` nach `.devcontainer/.env` kopieren und die
   Werte setzen. Diese Datei ist gitignored.
2. Falls dein Proxy TLS-Interception macht: Firmen-CA-Zertifikat(e) als
   `*.pem` oder `*.crt` in `.devcontainer/certificates/` ablegen (ebenfalls
   gitignored). Werden beim Image-Build in den System-CA-Store aufgenommen.
3. Container rebuilden ("Dev Containers: Rebuild Container").

## Dateien

| Datei | Zweck |
|---|---|
| `devcontainer.json` | VS Code Dev-Container-Konfiguration |
| `docker-compose.yml` | Service-Definition (bind-mount Workspace etc.) |
| `devenv.dockerfile` | Image-Build: Node + JDK + Android SDK + CLIs |
| `post-start.sh` | Läuft bei jedem Container-Start (Permissions, Infos) |
| `.env.example` | Vorlage für lokale Proxy-Konfiguration (nicht committed als `.env`) |
| `certificates/` | Optionale CA-Zertifikate (Inhalt gitignored) |
