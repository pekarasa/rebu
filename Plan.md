# Entwicklungsplan Rezept-App (Ionic + Angular + Capacitor)

Basis: `Specification.md`
Werkzeuge: VS Code, Git (GitHub), Docker (Devcontainer + CI-Build-Images)

---

## 1. Projekt-Grundgerüst

**Technologie-Stack**
- Ionic 9 + Angular 22 (Standalone Components)
- Capacitor 8 für native iOS/Android-Wrapper
- Node 24 (Angular 22 CLI requires >= 22.22 oder >= 24.15)
- TypeScript 6
- SCSS für Styles
- Unit-Tests: vitest (statt Karma/Jest, Ionic-Default seit v9)

**Lokale Persistenz**
- `@capacitor-community/sqlite` für Rezepte, Zutaten, Schritte
- `Capacitor Filesystem` für Fotos (als Datei, nur Base64 für Export)
- `Capacitor Preferences` für UI-Einstellungen (aktive Filter)

**Weitere Kernbibliotheken**
- `@capacitor/share` – nativer Teilen-Dialog
- `@capacitor/camera` – Foto aus Kamera/Galerie
- `@capacitor/app` – Deep-Link-Handling
- `@capacitor/keep-awake` – Bildschirm aktiv in Detailansicht
- `@angular/cdk/drag-drop` – Umsortieren Zutaten/Schritte
- `uuid`, `zod` (Validierung Import-JSON)

---

## 2. Repository-Struktur

```
rebu/
├── .devcontainer/
│   ├── devcontainer.json
│   ├── docker-compose.yml
│   ├── devenv.dockerfile       # Dev-Image (Node, Ionic/Angular CLI, Android SDK, JDK)
│   ├── post-start.sh
│   └── certificates/           # Optionale CA-Zertifikate (gitignored)
├── .github/
│   ├── workflows/              # GitHub Actions (ci.yml, release.yml)
│   ├── ISSUE_TEMPLATE/
│   └── pull_request_template.md
├── docker/
│   ├── build.Dockerfile        # CI-Image für Lint/Test/Web-Build
│   └── android.Dockerfile      # CI-Image für Android-APK-Build
├── src/
│   ├── app/
│   │   ├── core/               # Services (DB, Share, Import, Season, KH)
│   │   ├── models/             # Rezept, Zutat, Schritt, Enums
│   │   ├── data/               # ZutatSaison-DB, ZutatKH-DB (JSON)
│   │   ├── features/
│   │   │   ├── recipe-list/
│   │   │   ├── recipe-edit/
│   │   │   ├── recipe-detail/
│   │   │   ├── share/
│   │   │   ├── import/
│   │   │   └── settings/
│   │   └── shared/             # UI-Komponenten (Badge, PortionSelector)
│   └── assets/
├── android/                    # Capacitor Android (generiert)
├── ios/                        # Capacitor iOS (generiert, nur auf macOS)
├── e2e/                        # Playwright/Cypress
├── .gitignore
├── .editorconfig
├── .prettierrc
├── eslint.config.js
├── capacitor.config.ts
├── angular.json
├── package.json
└── README.md
```

---

## 3. Docker-Setup

### 3a. Devcontainer (`.devcontainer/devenv.dockerfile`)
- Basis: `mcr.microsoft.com/devcontainers/typescript-node:24-bookworm`
- Zusätzlich: OpenJDK 17, Android SDK + Build-Tools 34, Ionic CLI, Angular CLI 22,
  Capacitor CLI 8, Gradle
- Non-root user `node`, Workspace via docker-compose bind-mount
- Optionale CA-Zertifikate: `.devcontainer/certificates/*.pem|*.crt` werden
  beim Image-Build in den System-CA-Store aufgenommen (Inhalt gitignored)
- Proxy: via Docker-Daemon (Docker Desktop / Rancher Desktop), nicht per
  dockerfile/compose – siehe `.devcontainer/README.md`
- VS Code Extensions preinstalled via `devcontainer.json`:
  - `Angular.ng-template`
  - `Ionic.ionic`
  - `dbaeumer.vscode-eslint`
  - `esbenp.prettier-vscode`
  - `editorconfig.editorconfig`
  - `GitHub.vscode-pull-request-github`
  - `GitHub.vscode-github-actions`
  - `ms-azuretools.vscode-docker`
- Ports: 8100 (Ionic serve), 4200 (ng serve), 35729 (livereload)
- iOS-Builds: **nicht im Container** – Hinweis im README (macOS + Xcode nötig)

### 3b. CI-Build-Image (`docker/build.Dockerfile`)
- Schlank: Node 20 Bookworm + Chromium (für headless Karma/Playwright)
- Für Jobs: `lint`, `test`, `build:web`
- *TODO: auf Node 24 anheben, parallel zum Devcontainer-Upgrade.*

### 3c. CI-Android-Image (`docker/android.Dockerfile`)
- Node 20 + JDK 17 + Android SDK + Gradle
- Für Job: `build:android` (unsigned APK als Artefakt)
- *TODO: auf Node 24 anheben.*

---

## 4. VS Code-Konfiguration

- `.vscode/settings.json`: Format-on-save, ESLint auto-fix, SCSS-Formatter
- `.vscode/launch.json`:
  - "Ionic Serve" (Browser-Debug)
  - "Attach to Chrome"
  - "Android Debug" (via Capacitor)
- `.vscode/tasks.json`: npm scripts (serve, build, test, sync, cap:open:android)
- `.vscode/extensions.json`: Empfehlungen (gleich wie Devcontainer)

---

## 5. Git / GitHub-Workflow

**Branching: Trunk-based mit kurzen Feature-Branches**
- `main` – immer deploybar, geschützt (Branch Protection Rule)
- `feature/<issue>-<slug>` – kurzlebig (< 3 Tage)
- PR → Review → Squash-Merge in `main`
- Tags `vX.Y.Z` triggern Release-Workflow

**GitHub-spezifisch**
- Issues + Labels (`type:feat`, `type:bug`, `area:ui`, …)
- `CODEOWNERS` für Review-Zuweisung
- Branch Protection: Required Status Checks (CI muss grün sein), lineare History, keine Direct-Pushes auf `main`
- Dependabot (`.github/dependabot.yml`) für npm + GitHub Actions Updates
- CLI: `gh` für Issue-/PR-Workflows aus VS Code heraus

**Konventionen**
- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`, …)
- `.gitignore`: `node_modules/`, `dist/`, `www/`, `android/app/build/`, `ios/App/Pods/`, `*.keystore`, `.env*`
- `.gitattributes`: LF-Normalisierung, Binary-Markierung für `.png`, `.jpg`, `.keystore`
- Git-Hooks via `husky` + `lint-staged`: pre-commit (lint+format), commit-msg (commitlint)

---

## 6. GitHub Actions CI/CD

**Workflows unter `.github/workflows/`**

### `ci.yml` – bei jedem Push / Pull Request
Läuft auf `ubuntu-latest`, Container: eigenes Build-Image (`docker/build.Dockerfile`), ggf. publiziert nach GHCR.

| Job | Container | Trigger |
|---|---|---|
| `install` | build-image | push, pull_request (Cache `~/.npm`, `node_modules/`) |
| `lint` | build-image | push, pull_request |
| `typecheck` | build-image | push, pull_request |
| `test-unit` | build-image | push, pull_request (Coverage-Upload als Artefakt) |
| `test-e2e` | build-image + Playwright | pull_request, push auf `main` |
| `build-web` | build-image | pull_request, push auf `main` |

### `android.yml` – Android-APK-Build
| Job | Runner / Container | Trigger |
|---|---|---|
| `build-android` | `ubuntu-latest` + `docker/android.Dockerfile` | push auf `main`, Tags `v*` (APK-Artefakt) |

### `release.yml` – Release-Erstellung
| Job | Runner | Trigger |
|---|---|---|
| `release` | `ubuntu-latest` | Tags `v*` (GitHub Release anlegen, APK als Asset anhängen, Changelog generieren) |

### `ios.yml` – iOS-Build (optional, später)
Läuft auf `macos-latest` (kein Docker möglich); baut nur bei Tags `v*`. Benötigt Signierungs-Zertifikate in GitHub Secrets. Zunächst deaktiviert; dokumentiert im README.

---

## 7. Entwicklungs-Meilensteine

| # | Meilenstein | Inhalt |
|---|---|---|
| M0 | **Setup** | Repo-Init, Devcontainer, Docker-Images, GitHub-Actions-CI grün, Ionic-Projekt erzeugt |
| M1 | **Datenmodell + Persistenz** | SQLite-Schema, Repository-Services, Migrations, Unit-Tests |
| M2 | **Rezept erfassen** | Formular, Drag&Drop, Auto-Save-Entwurf, Foto-Upload |
| M3 | **Rezept-Listenansicht** | Karten, Volltextsuche, Sortierung |
| M4 | **Rezept-Detailansicht** | Portionsskalierung, Schritte abhaken, Keep-Awake |
| M5 | **Saisonalität** | Statische Zutaten-DB, Berechnung beim Speichern, Filter-Chip |
| M6 | **KH-Erkennung** | Statische KH-DB mit Priorität, Berechnung, Filter-Chip |
| M7 | **Teilen** | Text/JSON-Export, Deep-Link-Encoding, nativer Share-Dialog |
| M8 | **Import** | Deep-Link-Handler, JSON-Datei-Import, Vorschau, UUID-Kollision |
| M9 | **Sammel-Export/Import** | Alle Rezepte + Base64-Fotos, Auswahl-Dialog |
| M10 | **Platform-Polish** | iOS/Android-Anpassungen, Icons, Splash, Signierung |
| M11 | **v1 Release** | Beta-Testing, Store-Vorbereitung, Tag `v1.0.0` |

---

## 8. Qualitätssicherung

- **Unit-Tests:** vitest (Ionic/Angular 9/22 Default) für Services (Saison-/KH-Berechnung, Import-Parsing, Mengen-Skalierung) – Ziel ≥ 80 % für `core/`
- **E2E:** Playwright für kritische Flows (Erfassen → Kochen → Teilen → Import)
- **Lint:** ESLint (Angular + TS strict) + Stylelint
- **Format:** Prettier
- **Commits:** commitlint + Conventional Commits
- **Dependency-Scan:** `npm audit` als CI-Job (allow-list) + Dependabot + GitHub CodeQL (optional)

---

## 9. Umsetzungsreihenfolge (konkrete nächste Schritte)

1. `git init`, `.gitignore`, `.editorconfig`, `.gitattributes` anlegen ✅
2. GitHub-Repository erstellen (via `gh repo create` oder Web), Remote `origin` verknüpfen, `main` pushen, Branch Protection Rule setzen ✅
3. `.devcontainer/` + `docker/`-Dockerfiles schreiben, lokal testen (`docker build`) ✅
4. Devcontainer in VS Code öffnen → `ionic start rebu blank --type=angular` (standalone) ✅
5. Capacitor init, Android-Plattform hinzufügen (Capacitor-core ist durch ionic start bereits dabei; `cap init` + `cap add android` fehlt noch)
6. ESLint/Prettier/Husky/commitlint konfigurieren (ESLint ist durch ionic start bereits dabei; Prettier/Husky/commitlint fehlen)
7. `.github/workflows/ci.yml` mit `install`/`lint`/`test`/`build-web` grün bekommen
8. Dependabot + PR-Template + CODEOWNERS einrichten
9. Erster Feature-Branch + PR als Pipeline-Test
10. Mit M1 (Datenmodell + SQLite) starten
