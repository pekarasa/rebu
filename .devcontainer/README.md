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
2. `.devcontainer/.env.example` nach `.devcontainer/.env` kopieren und die
   opencode-Pfade anpassen (siehe Abschnitt *opencode im Container* unten).
3. "Reopen in Container" ausführen.
4. Beim ersten Start wird das Image gebaut (ca. 3 Minuten + Download).

## opencode im Container

Der Devcontainer installiert die `opencode`-CLI global (siehe
`devenv.dockerfile`). Damit du im Container ohne erneutes `/connect` arbeiten
kannst, werden folgende Host-Dateien read-only ins Container-User-Home
gespiegelt:

- `~/.local/share/opencode/auth.json` → `/home/node/.local/share/opencode/auth.json`
- `~/.config/opencode/opencode.jsonc` → `/home/node/.config/opencode/opencode.jsonc`

Die Pfade werden über `OPENCODE_AUTH_FILE` und `OPENCODE_CONFIG_FILE` in
`.devcontainer/.env` gesteuert (gitignored). Beide Host-Dateien müssen
existieren, sonst scheitert der Container-Start.

Falls `opencode.jsonc` relative `instructions`-Pfade enthält (z. B.
`../../OneDrive - THALES SA/Documents/Cline/Rules/*.md`), muss der Ordner
zusätzlich als Bind-Mount gereicht werden. Pfad via `OPENCODE_RULES_DIR`.

Zusätzlich reicht `docker-compose.yml` übliche LLM-Provider-API-Keys
(`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, …) sowie `OPENCODE_*`-Variablen aus
der Host-Shell oder `.devcontainer/.env` durch. Firmen-interne Gateways
(z. B. `SYNAPSE_API_KEY` für den Thales-Synapse-Gateway) sind ebenfalls in
der Pass-through-Liste.

Sessions/Storage persistieren im Container-FS (nicht gemountet), um
Konflikte mit laufendem Host-opencode zu vermeiden.

### Firmen-interne LLM-Hosts hinter Zscaler

Zscaler erlaubt zwar HTTP-CONNECT-Tunnel zu Firmen-internen HTTPS-Hosts
(z. B. `llm.synapse.thalescloud.io`), bricht aber das TLS-Backend-Handshake
unvorhersehbar ab. Workaround: Host in `NO_PROXY`/`no_proxy` in
`.devcontainer/.env` eintragen, dann geht der Container direkt via
Firmen-LAN. Beispiel:

```
NO_PROXY=127.0.0.1,localhost,llm.synapse.thalescloud.io,.thalescloud.io
no_proxy=${NO_PROXY}
```

Die vom Docker-Daemon injizierten `NO_PROXY`-Defaults werden durch
`docker-compose.yml` nicht ersetzt, sondern per Shell-ENV überschrieben.

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
| `.env.example` | Vorlage für lokale Compose-Env-Variablen (nach `.env` kopieren, gitignored) |
| `certificates/` | Optionale CA-Zertifikate (Inhalt gitignored) |
