import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

const DB_NAME = 'rebu';
const DB_VERSION = 1;

/**
 * Aktuelles Schema (Version 1).
 * WICHTIG: Änderungen hier erhöhen DB_VERSION und erfordern einen Migrations-Eintrag.
 */
const SCHEMA_V1 = `
CREATE TABLE IF NOT EXISTS recipe (
  id               TEXT    PRIMARY KEY NOT NULL,
  titel            TEXT    NOT NULL,
  portionen        INTEGER NOT NULL DEFAULT 4,
  zeitVorbereitung INTEGER,
  zeitKochen       INTEGER,
  kategorie        TEXT,
  notizen          TEXT,
  fotoPath         TEXT,
  erstelltAm       TEXT    NOT NULL,
  geaendertAm      TEXT    NOT NULL,
  saisonMonate     TEXT    NOT NULL DEFAULT '[]',
  khTag            TEXT
);

CREATE TABLE IF NOT EXISTS ingredient (
  id          TEXT    PRIMARY KEY NOT NULL,
  rezeptId    TEXT    NOT NULL REFERENCES recipe(id) ON DELETE CASCADE,
  reihenfolge INTEGER NOT NULL DEFAULT 0,
  menge       REAL,
  einheit     TEXT    NOT NULL DEFAULT '',
  name        TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS step (
  id          TEXT    PRIMARY KEY NOT NULL,
  rezeptId    TEXT    NOT NULL REFERENCES recipe(id) ON DELETE CASCADE,
  reihenfolge INTEGER NOT NULL DEFAULT 0,
  text        TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ingredient_rezeptId ON ingredient(rezeptId);
CREATE INDEX IF NOT EXISTS idx_step_rezeptId        ON step(rezeptId);
`;

@Injectable({ providedIn: 'root' })
export class DatabaseService {
  private sqlite = new SQLiteConnection(CapacitorSQLite);
  private db: SQLiteDBConnection | null = null;

  /** Gibt true zurück, wenn SQLite auf dieser Plattform nativ verfügbar ist. */
  get isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Initialisiert die Datenbankverbindung und spielt das Schema ein.
   * Muss einmalig beim App-Start aufgerufen werden (z.B. in APP_INITIALIZER).
   */
  async init(): Promise<void> {
    if (this.db) return; // bereits initialisiert

    if (!this.isNative) {
      // Web-Plattform: jeepSqlite-Element muss im DOM vorhanden sein
      await this.sqlite.initWebStore();
    }

    const consistency = await this.sqlite.checkConnectionsConsistency();
    const isConnected = await this.sqlite.isConnection(DB_NAME, false);

    if (consistency.result && isConnected.result) {
      this.db = await this.sqlite.retrieveConnection(DB_NAME, false);
    } else {
      this.db = await this.sqlite.createConnection(
        DB_NAME,
        false,
        'no-encryption',
        DB_VERSION,
        false,
      );
    }

    await this.db.open();
    await this.applySchema();
  }

  /** Gibt die geöffnete DB-Verbindung zurück (wirft, wenn nicht initialisiert). */
  get connection(): SQLiteDBConnection {
    if (!this.db) {
      throw new Error('DatabaseService: init() wurde noch nicht aufgerufen.');
    }
    return this.db;
  }

  // ---------------------------------------------------------------------------
  // Private Hilfsmethoden
  // ---------------------------------------------------------------------------

  private async applySchema(): Promise<void> {
    const db = this.connection;

    // user_version auslesen
    const versionResult = await db.query('PRAGMA user_version;');
    const currentVersion: number = versionResult.values?.[0]?.user_version ?? 0;

    if (currentVersion < 1) {
      await db.execute(SCHEMA_V1);
      await db.execute(`PRAGMA user_version = 1;`);
    }

    // Zukünftige Migrationen hier einfügen:
    // if (currentVersion < 2) { await db.execute(MIGRATION_V2); await db.execute(`PRAGMA user_version = 2;`); }
  }
}
