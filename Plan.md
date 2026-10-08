# Entwicklungsplan Rezept-App (Ionic + Angular + Capacitor)

Basis: `Specification.md`
Werkzeuge: VS Code, Git (GitLab), Docker (Devcontainer + CI-Build-Images)

---

## 1. Projekt-Grundgerüst

**Technologie-Stack**
- Ionic 7 + Angular 17 (Standalone Components)
- Capacitor 6 für native iOS/Android-Wrapper
- TypeScript strict mode
- SCSS für Styles

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
│   └── Dockerfile              # Dev-Image (Node, Ionic/Angular CLI, Android SDK, JDK)
├── .gitlab/
│   └── merge_request_templates/
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
├── .gitlab-ci.yml
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

### 3a. Devcontainer (`.devcontainer/Dockerfile`)
- Basis: `mcr.microsoft.com/devcontainers/typescript-node:20`
- Zusätzlich: OpenJDK 17, Android SDK + Build-Tools 34, Ionic CLI, Angular CLI, Gradle
- Non-root user `node`, Workspace gemountet
- VS Code Extensions preinstalled via `devcontainer.json`:
  - `Angular.ng-template`
  - `Ionic.ionic`
  - `dbaeumer.vscode-eslint`
  - `esbenp.prettier-vscode`
  - `editorconfig.editorconfig`
  - `GitLab.gitlab-workflow`
  - `ms-azuretools.vscode-docker`
- Ports: 8100 (Ionic serve), 4200 (ng serve), 35729 (livereload)
- iOS-Builds: **nicht im Container** – Hinweis im README (macOS + Xcode nötig)

### 3b. CI-Build-Image (`docker/build.Dockerfile`)
- Schlank: Node 20 Alpine + Chromium (für headless Karma/Playwright)
- Für Jobs: `lint`, `test`, `build:web`

### 3c. CI-Android-Image (`docker/android.Dockerfile`)
- Node 20 + JDK 17 + Android SDK + Gradle
- Für Job: `build:android` (unsigned APK als Artefakt)

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

## 5. Git / GitLab-Workflow

**Branching: Trunk-based mit kurzen Feature-Branches**
- `main` – immer deploybar, geschützt
- `feature/<ticket>-<slug>` – kurzlebig (< 3 Tage)
- MR → Review → Squash-Merge in `main`
- Tags `vX.Y.Z` triggern Release-Pipeline

**Konventionen**
- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`, …)
- `.gitignore`: `node_modules/`, `dist/`, `www/`, `android/app/build/`, `ios/App/Pods/`, `*.keystore`, `.env*`
- `.gitattributes`: LF-Normalisierung, Binary-Markierung für `.png`, `.jpg`, `.keystore`
- Git-Hooks via `husky` + `lint-staged`: pre-commit (lint+format), commit-msg (commitlint)

---

## 6. GitLab CI/CD (`.gitlab-ci.yml`)

**Stages:** `prepare` → `quality` → `test` → `build` → `package` → `release`

| Job | Image | Trigger |
|---|---|---|
| `install` | build.Dockerfile | jeder Push (Cache `node_modules/`) |
| `lint` | build.Dockerfile | jeder Push |
| `typecheck` | build.Dockerfile | jeder Push |
| `test:unit` | build.Dockerfile | jeder Push (Coverage als Artefakt) |
| `test:e2e` | build.Dockerfile + Playwright | MR, main |
| `build:web` | build.Dockerfile | MR, main |
| `build:android` | android.Dockerfile | main, Tags (APK-Artefakt) |
| `release` | – | nur Tags (GitLab Release + APK) |

iOS-Build läuft **nicht in GitLab CI** (benötigt macOS-Runner); dokumentiert als manueller Schritt oder späterer Fastlane-Job auf dediziertem Mac.

---

## 7. Entwicklungs-Meilensteine

| # | Meilenstein | Inhalt |
|---|---|---|
| M0 | **Setup** | Repo-Init, Devcontainer, Docker-Images, GitLab-Pipeline grün, Ionic-Projekt erzeugt |
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

- **Unit-Tests:** Jest oder Karma für Services (Saison-/KH-Berechnung, Import-Parsing, Mengen-Skalierung) – Ziel ≥ 80 % für `core/`
- **E2E:** Playwright für kritische Flows (Erfassen → Kochen → Teilen → Import)
- **Lint:** ESLint (Angular + TS strict) + Stylelint
- **Format:** Prettier
- **Commits:** commitlint + Conventional Commits
- **Dependency-Scan:** `npm audit` als CI-Job (allow-list)

---

## 9. Umsetzungsreihenfolge (konkrete nächste Schritte)

1. `git init`, `.gitignore`, `.editorconfig`, `.gitattributes` anlegen
2. GitLab-Projekt erstellen, Remote verknüpfen, `main` schützen
3. `.devcontainer/` + `docker/`-Dockerfiles schreiben, lokal testen (`docker build`)
4. Devcontainer in VS Code öffnen → `npm init @ionic/angular` (blank, standalone)
5. Capacitor init, Android-Plattform hinzufügen
6. ESLint/Prettier/Husky/commitlint konfigurieren
7. `.gitlab-ci.yml` mit `install`/`lint`/`test`/`build:web` grün bekommen
8. Erster Commit, erster MR als Pipeline-Test
9. Mit M1 (Datenmodell + SQLite) starten
