import { inject, Injectable } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from './database.service';
import { Ingredient } from '../models/ingredient.model';
import { Kategorie } from '../models/kategorie.enum';
import { Recipe, RecipeCreate, RecipeUpdate } from '../models/recipe.model';
import { Step } from '../models/step.model';

/** Sortieroptionen für die Rezeptliste */
export type RecipeSortOrder = 'alphabetisch' | 'neuste-zuerst' | 'zeitaufwand';

/** Filteroptionen für die Rezeptliste */
export interface RecipeFilter {
  /** Volltextsuche über Titel und Zutaten */
  suche?: string;
  /** Nur Rezepte, die in diesen Monaten saisonal sind */
  saisonMonate?: number[];
  /** Nur Rezepte mit diesem KH-Tag */
  khTag?: string;
  sortierung?: RecipeSortOrder;
}

@Injectable({ providedIn: 'root' })
export class RecipeRepository {
  private db = inject(DatabaseService);

  // ---------------------------------------------------------------------------
  // Anlegen
  // ---------------------------------------------------------------------------

  async create(data: RecipeCreate, saisonMonate: number[], khTag: string | null): Promise<Recipe> {
    const now = new Date().toISOString();
    const id = uuidv4();

    const recipe: Recipe = {
      id,
      titel: data.titel,
      portionen: data.portionen,
      zeitVorbereitung: data.zeitVorbereitung ?? null,
      zeitKochen: data.zeitKochen ?? null,
      kategorie: data.kategorie ?? null,
      notizen: data.notizen ?? null,
      fotoPath: data.fotoPath ?? null,
      erstelltAm: now,
      geaendertAm: now,
      saisonMonate,
      khTag,
      zutaten: [],
      schritte: [],
    };

    const conn = this.db.connection;

    await conn.run(
      `INSERT INTO recipe
         (id, titel, portionen, zeitVorbereitung, zeitKochen, kategorie, notizen,
          fotoPath, erstelltAm, geaendertAm, saisonMonate, khTag)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        recipe.id,
        recipe.titel,
        recipe.portionen,
        recipe.zeitVorbereitung,
        recipe.zeitKochen,
        recipe.kategorie,
        recipe.notizen,
        recipe.fotoPath,
        recipe.erstelltAm,
        recipe.geaendertAm,
        JSON.stringify(recipe.saisonMonate),
        recipe.khTag,
      ],
    );

    recipe.zutaten = await this.insertIngredients(id, data.zutaten ?? []);
    recipe.schritte = await this.insertSteps(id, data.schritte ?? []);

    return recipe;
  }

  // ---------------------------------------------------------------------------
  // Lesen
  // ---------------------------------------------------------------------------

  async findById(id: string): Promise<Recipe | null> {
    const conn = this.db.connection;
    const result = await conn.query(`SELECT * FROM recipe WHERE id = ?`, [id]);
    if (!result.values?.length) return null;

    const row = result.values[0];
    return this.rowToRecipe(row, await this.findIngredients(id), await this.findSteps(id));
  }

  async findAll(filter: RecipeFilter = {}): Promise<Recipe[]> {
    const conn = this.db.connection;

    let sql = `SELECT DISTINCT r.* FROM recipe r`;
    const params: (string | number | null)[] = [];

    const conditions: string[] = [];

    // Volltextsuche: Titel und Zutatenname
    if (filter.suche?.trim()) {
      sql += ` LEFT JOIN ingredient i ON i.rezeptId = r.id`;
      const term = `%${filter.suche.trim().toLowerCase()}%`;
      conditions.push(`(LOWER(r.titel) LIKE ? OR LOWER(i.name) LIKE ?)`);
      params.push(term, term);
    }

    // KH-Filter
    if (filter.khTag) {
      conditions.push(`r.khTag = ?`);
      params.push(filter.khTag);
    }

    if (conditions.length) {
      sql += ` WHERE ` + conditions.join(' AND ');
    }

    // Sortierung
    switch (filter.sortierung ?? 'alphabetisch') {
      case 'neuste-zuerst':
        sql += ` ORDER BY r.erstelltAm DESC`;
        break;
      case 'zeitaufwand':
        sql += ` ORDER BY (COALESCE(r.zeitVorbereitung, 0) + COALESCE(r.zeitKochen, 0)) ASC, r.titel ASC`;
        break;
      default:
        sql += ` ORDER BY r.titel ASC`;
    }

    const result = await conn.query(sql, params);
    const rows = result.values ?? [];

    const recipes: Recipe[] = [];
    for (const row of rows) {
      // Saisonfilter nachgelagert (JSON-Array in SQLite schwierig per SQL zu filtern)
      if (filter.saisonMonate?.length) {
        const monate: number[] = JSON.parse(row['saisonMonate'] ?? '[]');
        // Rezept muss saisonal in MINDESTENS EINEM der gesuchten Monate sein,
        // ODER keine saisonalen Zutaten haben (leeres Array = ganzjährig)
        const isGanzjaehrig = monate.length === 0;
        const matchesSaison = isGanzjaehrig || filter.saisonMonate.some((m) => monate.includes(m));
        if (!matchesSaison) continue;
      }
      const zutaten = await this.findIngredients(row['id']);
      const schritte = await this.findSteps(row['id']);
      recipes.push(this.rowToRecipe(row, zutaten, schritte));
    }

    return recipes;
  }

  // ---------------------------------------------------------------------------
  // Aktualisieren
  // ---------------------------------------------------------------------------

  async update(data: RecipeUpdate, saisonMonate: number[], khTag: string | null): Promise<Recipe> {
    const existing = await this.findById(data.id);
    if (!existing) throw new Error(`Rezept ${data.id} nicht gefunden.`);

    const now = new Date().toISOString();
    // zutaten/schritte werden separat behandelt, daher aus dem Spread ausschliessen
    const { zutaten: _z, schritte: _s, ...dataWithoutChildren } = data;
    const updated: Recipe = {
      ...existing,
      ...dataWithoutChildren,
      geaendertAm: now,
      saisonMonate,
      khTag,
      zutaten: existing.zutaten,
      schritte: existing.schritte,
    };

    const conn = this.db.connection;

    await conn.run(
      `UPDATE recipe SET
         titel = ?, portionen = ?, zeitVorbereitung = ?, zeitKochen = ?,
         kategorie = ?, notizen = ?, fotoPath = ?, geaendertAm = ?,
         saisonMonate = ?, khTag = ?
       WHERE id = ?`,
      [
        updated.titel,
        updated.portionen,
        updated.zeitVorbereitung,
        updated.zeitKochen,
        updated.kategorie,
        updated.notizen,
        updated.fotoPath,
        updated.geaendertAm,
        JSON.stringify(updated.saisonMonate),
        updated.khTag,
        updated.id,
      ],
    );

    // Zutaten/Schritte neu schreiben wenn übergeben
    if (data.zutaten !== undefined) {
      await conn.run(`DELETE FROM ingredient WHERE rezeptId = ?`, [updated.id]);
      updated.zutaten = await this.insertIngredients(updated.id, data.zutaten);
    }
    if (data.schritte !== undefined) {
      await conn.run(`DELETE FROM step WHERE rezeptId = ?`, [updated.id]);
      updated.schritte = await this.insertSteps(updated.id, data.schritte);
    }

    return updated;
  }

  // ---------------------------------------------------------------------------
  // Löschen
  // ---------------------------------------------------------------------------

  async delete(id: string): Promise<void> {
    // ON DELETE CASCADE entfernt ingredient + step automatisch
    await this.db.connection.run(`DELETE FROM recipe WHERE id = ?`, [id]);
  }

  async deleteAll(): Promise<void> {
    const conn = this.db.connection;
    await conn.run(`DELETE FROM ingredient`);
    await conn.run(`DELETE FROM step`);
    await conn.run(`DELETE FROM recipe`);
  }

  // ---------------------------------------------------------------------------
  // Private Hilfsmethoden
  // ---------------------------------------------------------------------------

  private async insertIngredients(
    rezeptId: string,
    list: Array<Omit<Ingredient, 'id' | 'rezeptId'>>,
  ): Promise<Ingredient[]> {
    const conn = this.db.connection;
    const result: Ingredient[] = [];

    for (const item of list) {
      const id = uuidv4();
      await conn.run(
        `INSERT INTO ingredient (id, rezeptId, reihenfolge, menge, einheit, name)
         VALUES (?,?,?,?,?,?)`,
        [id, rezeptId, item.reihenfolge, item.menge, item.einheit, item.name],
      );
      result.push({ id, rezeptId, ...item });
    }

    return result;
  }

  private async insertSteps(
    rezeptId: string,
    list: Array<Omit<Step, 'id' | 'rezeptId'>>,
  ): Promise<Step[]> {
    const conn = this.db.connection;
    const result: Step[] = [];

    for (const item of list) {
      const id = uuidv4();
      await conn.run(`INSERT INTO step (id, rezeptId, reihenfolge, text) VALUES (?,?,?,?)`, [
        id,
        rezeptId,
        item.reihenfolge,
        item.text,
      ]);
      result.push({ id, rezeptId, ...item });
    }

    return result;
  }

  private async findIngredients(rezeptId: string): Promise<Ingredient[]> {
    const result = await this.db.connection.query(
      `SELECT * FROM ingredient WHERE rezeptId = ? ORDER BY reihenfolge ASC`,
      [rezeptId],
    );
    return (result.values ?? []).map((row) => ({
      id: row['id'],
      rezeptId: row['rezeptId'],
      reihenfolge: row['reihenfolge'],
      menge: row['menge'],
      einheit: row['einheit'],
      name: row['name'],
    }));
  }

  private async findSteps(rezeptId: string): Promise<Step[]> {
    const result = await this.db.connection.query(
      `SELECT * FROM step WHERE rezeptId = ? ORDER BY reihenfolge ASC`,
      [rezeptId],
    );
    return (result.values ?? []).map((row) => ({
      id: row['id'],
      rezeptId: row['rezeptId'],
      reihenfolge: row['reihenfolge'],
      text: row['text'],
    }));
  }

  private rowToRecipe(
    row: Record<string, unknown>,
    zutaten: Ingredient[],
    schritte: Step[],
  ): Recipe {
    return {
      id: row['id'] as string,
      titel: row['titel'] as string,
      portionen: row['portionen'] as number,
      zeitVorbereitung: (row['zeitVorbereitung'] as number | null) ?? null,
      zeitKochen: (row['zeitKochen'] as number | null) ?? null,
      kategorie: (row['kategorie'] as Kategorie | null) ?? null,
      notizen: (row['notizen'] as string | null) ?? null,
      fotoPath: (row['fotoPath'] as string | null) ?? null,
      erstelltAm: row['erstelltAm'] as string,
      geaendertAm: row['geaendertAm'] as string,
      saisonMonate: JSON.parse((row['saisonMonate'] as string | null) ?? '[]') as number[],
      khTag: (row['khTag'] as string | null) ?? null,
      zutaten,
      schritte,
    };
  }
}
