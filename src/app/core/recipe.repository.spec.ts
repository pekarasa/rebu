/**
 * Unit-Tests für RecipeRepository.
 *
 * Da @capacitor-community/sqlite im Test-Umfeld (jsdom) nicht nativ verfügbar ist,
 * wird DatabaseService vollständig gemockt. Der Mock implementiert eine einfache
 * In-Memory-SQLite-ähnliche Schnittstelle über Maps.
 */
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { RecipeRepository } from './recipe.repository';
import { DatabaseService } from './database.service';
import { Kategorie } from '../models/kategorie.enum';
import { RecipeCreate } from '../models/recipe.model';

// ---------------------------------------------------------------------------
// In-Memory-Datenbank-Mock
// ---------------------------------------------------------------------------

interface InMemoryRow {
  [key: string]: unknown;
}

class InMemoryDb {
  private tables: Map<string, InMemoryRow[]> = new Map([
    ['recipe', []],
    ['ingredient', []],
    ['step', []],
  ]);

  private table(name: string): InMemoryRow[] {
    return this.tables.get(name)!;
  }

  /** Minimaler SQL-Interpreter – nur die vom Repository genutzten Statements */
  async run(sql: string, params: unknown[] = []): Promise<void> {
    const s = sql.trim().replace(/\s+/g, ' ').toUpperCase();

    if (s.startsWith('INSERT INTO RECIPE ')) {
      const [
        id,
        titel,
        portionen,
        zeitVorb,
        zeitKoch,
        kat,
        notizen,
        fotoPath,
        erstelltAm,
        geaendertAm,
        saisonMonate,
        khTag,
      ] = params;
      this.table('recipe').push({
        id,
        titel,
        portionen,
        zeitVorbereitung: zeitVorb,
        zeitKochen: zeitKoch,
        kategorie: kat,
        notizen,
        fotoPath,
        erstelltAm,
        geaendertAm,
        saisonMonate,
        khTag,
      });
    } else if (s.startsWith('INSERT INTO INGREDIENT ')) {
      const [id, rezeptId, reihenfolge, menge, einheit, name] = params;
      this.table('ingredient').push({ id, rezeptId, reihenfolge, menge, einheit, name });
    } else if (s.startsWith('INSERT INTO STEP ')) {
      const [id, rezeptId, reihenfolge, text] = params;
      this.table('step').push({ id, rezeptId, reihenfolge, text });
    } else if (s.startsWith('UPDATE RECIPE SET ')) {
      const id = params[params.length - 1] as string;
      const idx = this.table('recipe').findIndex((r) => r['id'] === id);
      if (idx !== -1) {
        const [
          titel,
          portionen,
          zeitVorb,
          zeitKoch,
          kat,
          notizen,
          fotoPath,
          geaendertAm,
          saisonMonate,
          khTag,
        ] = params;
        this.table('recipe')[idx] = {
          ...this.table('recipe')[idx],
          titel,
          portionen,
          zeitVorbereitung: zeitVorb,
          zeitKochen: zeitKoch,
          kategorie: kat,
          notizen,
          fotoPath,
          geaendertAm,
          saisonMonate,
          khTag,
        };
      }
    } else if (s.startsWith('DELETE FROM INGREDIENT WHERE REZEPTID')) {
      const rezeptId = params[0] as string;
      this.tables.set(
        'ingredient',
        this.table('ingredient').filter((r) => r['rezeptId'] !== rezeptId),
      );
    } else if (s.startsWith('DELETE FROM STEP WHERE REZEPTID')) {
      const rezeptId = params[0] as string;
      this.tables.set(
        'step',
        this.table('step').filter((r) => r['rezeptId'] !== rezeptId),
      );
    } else if (s.startsWith('DELETE FROM RECIPE WHERE ID')) {
      const id = params[0] as string;
      this.tables.set(
        'recipe',
        this.table('recipe').filter((r) => r['id'] !== id),
      );
      this.tables.set(
        'ingredient',
        this.table('ingredient').filter((r) => r['rezeptId'] !== id),
      );
      this.tables.set(
        'step',
        this.table('step').filter((r) => r['rezeptId'] !== id),
      );
    } else if (s === 'DELETE FROM INGREDIENT') {
      this.tables.set('ingredient', []);
    } else if (s === 'DELETE FROM STEP') {
      this.tables.set('step', []);
    } else if (s === 'DELETE FROM RECIPE') {
      this.tables.set('recipe', []);
    }
  }

  async query(sql: string, params: unknown[] = []): Promise<{ values: InMemoryRow[] }> {
    const s = sql.trim().replace(/\s+/g, ' ');

    if (/SELECT \* FROM recipe WHERE id/i.test(s)) {
      const id = params[0] as string;
      const values = this.table('recipe').filter((r) => r['id'] === id);
      return { values };
    }

    if (/SELECT \* FROM ingredient WHERE rezeptId/i.test(s)) {
      const rezeptId = params[0] as string;
      const values = this.table('ingredient')
        .filter((r) => r['rezeptId'] === rezeptId)
        .sort((a, b) => (a['reihenfolge'] as number) - (b['reihenfolge'] as number));
      return { values };
    }

    if (/SELECT \* FROM step WHERE rezeptId/i.test(s)) {
      const rezeptId = params[0] as string;
      const values = this.table('step')
        .filter((r) => r['rezeptId'] === rezeptId)
        .sort((a, b) => (a['reihenfolge'] as number) - (b['reihenfolge'] as number));
      return { values };
    }

    if (/SELECT DISTINCT r\.\* FROM recipe r/i.test(s)) {
      // findAll – minimale Unterstützung ohne Filter/Join
      return { values: [...this.table('recipe')] };
    }

    return { values: [] };
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RecipeRepository', () => {
  let repo: RecipeRepository;
  let inMemoryDb: InMemoryDb;

  beforeEach(() => {
    inMemoryDb = new InMemoryDb();

    TestBed.configureTestingModule({
      providers: [
        RecipeRepository,
        {
          provide: DatabaseService,
          useValue: { connection: inMemoryDb } as unknown as DatabaseService,
        },
      ],
    });

    repo = TestBed.inject(RecipeRepository);
  });

  const baseRecipe = (): RecipeCreate => ({
    titel: 'Spaghetti Bolognese',
    portionen: 4,
    zeitVorbereitung: 15,
    zeitKochen: 30,
    kategorie: Kategorie.Hauptgericht,
    notizen: 'Klassiker',
    fotoPath: null,
    zutaten: [
      { reihenfolge: 0, menge: 400, einheit: 'g', name: 'Spaghetti' },
      { reihenfolge: 1, menge: 500, einheit: 'g', name: 'Hackfleisch' },
    ],
    schritte: [
      { reihenfolge: 0, text: 'Wasser aufkochen.' },
      { reihenfolge: 1, text: 'Spaghetti al dente kochen.' },
    ],
  });

  describe('create', () => {
    it('legt ein Rezept mit ID und Timestamps an', async () => {
      const recipe = await repo.create(baseRecipe(), [6, 7, 8], 'Pasta');
      expect(recipe.id).toBeTruthy();
      expect(recipe.erstelltAm).toBeTruthy();
      expect(recipe.geaendertAm).toBeTruthy();
    });

    it('speichert alle Felder korrekt', async () => {
      const recipe = await repo.create(baseRecipe(), [6, 7, 8], 'Pasta');
      expect(recipe.titel).toBe('Spaghetti Bolognese');
      expect(recipe.portionen).toBe(4);
      expect(recipe.zeitVorbereitung).toBe(15);
      expect(recipe.zeitKochen).toBe(30);
      expect(recipe.kategorie).toBe(Kategorie.Hauptgericht);
      expect(recipe.notizen).toBe('Klassiker');
      expect(recipe.saisonMonate).toEqual([6, 7, 8]);
      expect(recipe.khTag).toBe('Pasta');
    });

    it('speichert Zutaten in der richtigen Reihenfolge', async () => {
      const recipe = await repo.create(baseRecipe(), [], null);
      expect(recipe.zutaten).toHaveLength(2);
      expect(recipe.zutaten[0].name).toBe('Spaghetti');
      expect(recipe.zutaten[1].name).toBe('Hackfleisch');
    });

    it('speichert Schritte in der richtigen Reihenfolge', async () => {
      const recipe = await repo.create(baseRecipe(), [], null);
      expect(recipe.schritte).toHaveLength(2);
      expect(recipe.schritte[0].text).toBe('Wasser aufkochen.');
    });

    it('generiert unterschiedliche IDs für zwei Rezepte', async () => {
      const r1 = await repo.create(baseRecipe(), [], null);
      const r2 = await repo.create({ ...baseRecipe(), titel: 'Risotto' }, [], null);
      expect(r1.id).not.toBe(r2.id);
    });
  });

  describe('findById', () => {
    it('findet ein angelegtes Rezept', async () => {
      const created = await repo.create(baseRecipe(), [9, 10], 'Pasta');
      const found = await repo.findById(created.id);
      expect(found).not.toBeNull();
      expect(found!.titel).toBe('Spaghetti Bolognese');
    });

    it('gibt null zurück für unbekannte ID', async () => {
      const found = await repo.findById('unbekannte-id');
      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    it('gibt alle Rezepte zurück', async () => {
      await repo.create(baseRecipe(), [], null);
      await repo.create({ ...baseRecipe(), titel: 'Risotto' }, [], 'Reis');
      const all = await repo.findAll();
      expect(all).toHaveLength(2);
    });

    it('gibt leeres Array zurück wenn keine Rezepte vorhanden', async () => {
      const all = await repo.findAll();
      expect(all).toHaveLength(0);
    });
  });

  describe('update', () => {
    it('aktualisiert Titel und geaendertAm', async () => {
      const created = await repo.create(baseRecipe(), [], null);
      const originalDate = created.geaendertAm;

      // kurz warten damit Timestamp sich unterscheidet
      await new Promise((r) => setTimeout(r, 5));

      const updated = await repo.update({ id: created.id, titel: 'Bolognese deluxe' }, [], null);
      expect(updated.titel).toBe('Bolognese deluxe');
      expect(updated.geaendertAm).not.toBe(originalDate);
    });

    it('aktualisiert Saison und KH-Tag', async () => {
      const created = await repo.create(baseRecipe(), [], null);
      const updated = await repo.update({ id: created.id }, [3, 4, 5], 'Getreide');
      expect(updated.saisonMonate).toEqual([3, 4, 5]);
      expect(updated.khTag).toBe('Getreide');
    });

    it('wirft bei unbekannter ID', async () => {
      await expect(repo.update({ id: 'xyz' }, [], null)).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('entfernt das Rezept aus der DB', async () => {
      const created = await repo.create(baseRecipe(), [], null);
      await repo.delete(created.id);
      const found = await repo.findById(created.id);
      expect(found).toBeNull();
    });

    it('entfernt auch Zutaten und Schritte (Cascade)', async () => {
      const created = await repo.create(baseRecipe(), [], null);
      await repo.delete(created.id);
      // Nach dem Löschen muss findById null liefern
      expect(await repo.findById(created.id)).toBeNull();
    });
  });

  describe('deleteAll', () => {
    it('leert die gesamte DB', async () => {
      await repo.create(baseRecipe(), [], null);
      await repo.create({ ...baseRecipe(), titel: 'Risotto' }, [], null);
      await repo.deleteAll();
      expect(await repo.findAll()).toHaveLength(0);
    });
  });
});
