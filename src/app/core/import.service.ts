import { inject, Injectable } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';
import { RecipeRepository } from './recipe.repository';
import { SeasonService } from './season.service';
import { KhService } from './kh.service';
import { PhotoService } from './photo.service';
import { RecipeExportData, ShareService } from './share.service';
import { Recipe } from '../models/recipe.model';
import { Kategorie } from '../models/kategorie.enum';

export type CollisionResolution = 'overwrite' | 'copy';

export interface ImportedIngredient {
  id?: string;
  reihenfolge: number;
  menge: number | null;
  einheit: string;
  name: string;
}

export interface ImportedStep {
  id?: string;
  reihenfolge: number;
  text: string;
}

export interface ImportedRecipeDraft {
  id: string;
  titel: string;
  portionen: number;
  zeitVorbereitung: number | null;
  zeitKochen: number | null;
  kategorie: Kategorie | null;
  notizen: string | null;
  fotoBase64?: string | null;
  fotoPath?: string | null;
  saisonMonate: number[];
  khTag: string | null;
  zutaten: ImportedIngredient[];
  schritte: ImportedStep[];
  erstelltAm?: string;
  geaendertAm?: string;
}

export interface ImportParseResult {
  success: boolean;
  error?: string;
  recipes: ImportedRecipeDraft[];
}

export interface ImportOptions {
  collisionResolution?: CollisionResolution;
}

export interface ImportExecutionResult {
  success: boolean;
  recipe?: Recipe;
  action?: 'created' | 'overwritten' | 'copied';
  error?: string;
  collision?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ImportService {
  private recipeRepo = inject(RecipeRepository);
  private seasonService = inject(SeasonService);
  private khService = inject(KhService);
  private photoService = inject(PhotoService);
  private shareService = inject(ShareService);

  /**
   * Parst einen beliebigen Import-String: entweder einen Deep-Link (URL / Base64)
   * oder einen rohen JSON-String (Rezeptdatei).
   */
  parseImportSource(source: string): ImportParseResult {
    if (!source || typeof source !== 'string' || !source.trim()) {
      return { success: false, error: 'Keine Importdaten übergeben.', recipes: [] };
    }

    const trimmed = source.trim();

    // 1. Prüfen, ob es sich um einen Deep-Link handelt (rebu://, https://, ?data=)
    if (
      trimmed.startsWith('rebu://') ||
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.includes('data=')
    ) {
      const decoded = this.shareService.decodeDeepLink(trimmed);
      if (decoded) {
        const draft = this.validateAndNormalizeRecipe(decoded);
        if (draft) {
          return { success: true, recipes: [draft] };
        }
        return {
          success: false,
          error: 'Die Daten im Deep-Link enthalten kein gültiges Rezept.',
          recipes: [],
        };
      }
    }

    // 2. Als JSON parsen
    return this.parseImportJson(trimmed);
  }

  /**
   * Liest den Inhalt einer hochgeladenen/ausgewählten Datei und parst ihn.
   */
  async parseFile(file: File): Promise<ImportParseResult> {
    try {
      const content = await file.text();
      return this.parseImportSource(content);
    } catch (err) {
      return {
        success: false,
        error: `Datei konnte nicht gelesen werden: ${err instanceof Error ? err.message : String(err)}`,
        recipes: [],
      };
    }
  }

  /**
   * Parst und validiert einen JSON-String.
   * Unterstützt Einzelrezept-Export ({ app: 'rebu', recipe: ... }),
   * Sammel-Export ({ app: 'rebu', recipes: [...] }), Array von Rezepten
   * oder ein direktes Rezept-Objekt.
   */
  parseImportJson(jsonString: string): ImportParseResult {
    try {
      const parsed = JSON.parse(jsonString);

      if (!parsed || typeof parsed !== 'object') {
        return {
          success: false,
          error: 'Ungültiges JSON-Format (kein Objekt).',
          recipes: [],
        };
      }

      const rawList: unknown[] = [];

      // Sammel-Export { app: 'rebu', recipes: [...] }
      if ('recipes' in parsed && Array.isArray((parsed as { recipes: unknown[] }).recipes)) {
        rawList.push(...(parsed as { recipes: unknown[] }).recipes);
      }
      // Einzel-Export { app: 'rebu', recipe: { ... } }
      else if ('recipe' in parsed && (parsed as { recipe: unknown }).recipe) {
        rawList.push((parsed as { recipe: unknown }).recipe);
      }
      // Direktes Array von Rezepten [ { ... } ]
      else if (Array.isArray(parsed)) {
        rawList.push(...parsed);
      }
      // Direktes Einzelrezept { titel: '...', ... }
      else if ('titel' in parsed) {
        rawList.push(parsed);
      } else {
        return {
          success: false,
          error: 'Kein erkennbares Rezept-Format in den Daten gefunden.',
          recipes: [],
        };
      }

      const validDrafts: ImportedRecipeDraft[] = [];
      for (const item of rawList) {
        const draft = this.validateAndNormalizeRecipe(item);
        if (draft) {
          validDrafts.push(draft);
        }
      }

      if (validDrafts.length === 0) {
        return {
          success: false,
          error: 'Keine gültigen Rezepte in der Import-Quelle gefunden.',
          recipes: [],
        };
      }

      return { success: true, recipes: validDrafts };
    } catch {
      // Wenn JSON.parse fehlschlägt, prüfen wir noch, ob es sich um einen reinen Base64-String handeln könnte
      const decoded = this.shareService.decodeDeepLink(jsonString);
      if (decoded) {
        const draft = this.validateAndNormalizeRecipe(decoded);
        if (draft) {
          return { success: true, recipes: [draft] };
        }
      }

      return {
        success: false,
        error: 'Fehlerhaftes JSON: Die Daten konnten nicht analysiert werden.',
        recipes: [],
      };
    }
  }

  /**
   * Prüft, ob ein Rezept mit der angegebenen ID bereits in der Datenbank existiert.
   */
  async checkUuidCollision(recipeId: string): Promise<boolean> {
    if (!recipeId) return false;
    return this.recipeRepo.exists(recipeId);
  }

  /**
   * Importiert ein vorbereitetes Rezept in die Datenbank.
   * Berechnet Saison und KH-Tag neu.
   * Speichert das Foto (falls vorhanden als Base64) im Capacitor-Dateisystem.
   * Behandelt Kollisionen gemäß options.collisionResolution ('overwrite' oder 'copy').
   */
  async importRecipe(
    draft: ImportedRecipeDraft,
    options?: ImportOptions,
  ): Promise<ImportExecutionResult> {
    try {
      const collision = await this.checkUuidCollision(draft.id);

      // Falls Kollision und keine Strategie gewählt: Abbruch mit Hinweis
      if (collision && !options?.collisionResolution) {
        return {
          success: false,
          collision: true,
          error: 'Ein Rezept mit dieser ID existiert bereits.',
        };
      }

      // Foto sichern, falls Base64 vorhanden
      let fotoPath = draft.fotoPath || null;
      if (draft.fotoBase64) {
        try {
          const photoResult = await this.photoService.saveDataUrl(draft.fotoBase64);
          fotoPath = photoResult.filePath;
        } catch (err) {
          console.warn('Foto konnte beim Import nicht gespeichert werden:', err);
        }
      }

      // Saison und KH-Tag immer frisch neu berechnen
      const saisonMonate = this.seasonService.calculateSaisonMonate(draft.zutaten);
      const khTag = this.khService.calculateKhTag(draft.zutaten);

      // 1. Überschreiben
      if (collision && options?.collisionResolution === 'overwrite') {
        const updated = await this.recipeRepo.update(
          {
            id: draft.id,
            titel: draft.titel,
            portionen: draft.portionen,
            zeitVorbereitung: draft.zeitVorbereitung,
            zeitKochen: draft.zeitKochen,
            kategorie: draft.kategorie,
            notizen: draft.notizen,
            fotoPath,
            zutaten: draft.zutaten.map((z, idx) => ({
              id: z.id,
              reihenfolge: z.reihenfolge ?? idx + 1,
              menge: z.menge,
              einheit: z.einheit,
              name: z.name,
            })),
            schritte: draft.schritte.map((s, idx) => ({
              id: s.id,
              reihenfolge: s.reihenfolge ?? idx + 1,
              text: s.text,
            })),
          },
          saisonMonate,
          khTag,
        );

        return {
          success: true,
          recipe: updated,
          action: 'overwritten',
        };
      }

      // 2. Als Kopie speichern
      if (collision && options?.collisionResolution === 'copy') {
        const newId = uuidv4();
        const created = await this.recipeRepo.create(
          {
            titel: draft.titel,
            portionen: draft.portionen,
            zeitVorbereitung: draft.zeitVorbereitung,
            zeitKochen: draft.zeitKochen,
            kategorie: draft.kategorie,
            notizen: draft.notizen,
            fotoPath,
            zutaten: draft.zutaten.map((z, idx) => ({
              reihenfolge: z.reihenfolge ?? idx + 1,
              menge: z.menge,
              einheit: z.einheit,
              name: z.name,
            })),
            schritte: draft.schritte.map((s, idx) => ({
              reihenfolge: s.reihenfolge ?? idx + 1,
              text: s.text,
            })),
          },
          saisonMonate,
          khTag,
          newId,
        );

        return {
          success: true,
          recipe: created,
          action: 'copied',
        };
      }

      // 3. Neu anlegen (keine Kollision, ID erhalten)
      const created = await this.recipeRepo.create(
        {
          titel: draft.titel,
          portionen: draft.portionen,
          zeitVorbereitung: draft.zeitVorbereitung,
          zeitKochen: draft.zeitKochen,
          kategorie: draft.kategorie,
          notizen: draft.notizen,
          fotoPath,
          zutaten: draft.zutaten.map((z, idx) => ({
            id: z.id,
            reihenfolge: z.reihenfolge ?? idx + 1,
            menge: z.menge,
            einheit: z.einheit,
            name: z.name,
          })),
          schritte: draft.schritte.map((s, idx) => ({
            id: s.id,
            reihenfolge: s.reihenfolge ?? idx + 1,
            text: s.text,
          })),
        },
        saisonMonate,
        khTag,
        draft.id,
      );

      return {
        success: true,
        recipe: created,
        action: 'created',
      };
    } catch (err) {
      return {
        success: false,
        error: `Import fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  /**
   * Validiert ein Roh-Rezept-Objekt und normalisiert es in einen ImportedRecipeDraft.
   * Gibt null zurück, wenn Pflichtfelder (Titel, min. 1 Zutat, min. 1 Schritt) fehlen.
   */
  validateAndNormalizeRecipe(raw: unknown): ImportedRecipeDraft | null {
    if (!raw || typeof raw !== 'object') return null;

    const obj = raw as Partial<RecipeExportData> & Record<string, unknown>;

    // Titel-Validierung
    const titel = typeof obj.titel === 'string' ? obj.titel.trim() : '';
    if (!titel) return null;

    // Portionen (Default 4)
    let portionen = typeof obj.portionen === 'number' ? obj.portionen : Number(obj.portionen);
    if (!portionen || isNaN(portionen) || portionen <= 0) {
      portionen = 4;
    }

    // Zutaten-Validierung
    if (!Array.isArray(obj.zutaten) || obj.zutaten.length === 0) {
      return null;
    }

    const validIngredients: ImportedIngredient[] = [];
    obj.zutaten.forEach((item, index) => {
      if (item && typeof item === 'object') {
        const itemRecord = item as unknown as Record<string, unknown>;
        const name = typeof itemRecord['name'] === 'string' ? itemRecord['name'].trim() : '';
        if (name) {
          const rawMenge = itemRecord['menge'];
          const menge =
            rawMenge !== null && rawMenge !== undefined && rawMenge !== ''
              ? Number(rawMenge)
              : null;
          validIngredients.push({
            id: typeof itemRecord['id'] === 'string' ? itemRecord['id'] : undefined,
            reihenfolge:
              typeof itemRecord['reihenfolge'] === 'number' ? itemRecord['reihenfolge'] : index + 1,
            menge: menge !== null && !isNaN(menge) ? menge : null,
            einheit: typeof itemRecord['einheit'] === 'string' ? itemRecord['einheit'].trim() : '',
            name,
          });
        }
      }
    });

    if (validIngredients.length === 0) {
      return null;
    }

    // Schritte-Validierung
    if (!Array.isArray(obj.schritte) || obj.schritte.length === 0) {
      return null;
    }

    const validSteps: ImportedStep[] = [];
    obj.schritte.forEach((item, index) => {
      if (item && typeof item === 'object') {
        const itemRecord = item as unknown as Record<string, unknown>;
        const text = typeof itemRecord['text'] === 'string' ? itemRecord['text'].trim() : '';
        if (text) {
          validSteps.push({
            id: typeof itemRecord['id'] === 'string' ? itemRecord['id'] : undefined,
            reihenfolge:
              typeof itemRecord['reihenfolge'] === 'number' ? itemRecord['reihenfolge'] : index + 1,
            text,
          });
        }
      }
    });

    if (validSteps.length === 0) {
      return null;
    }

    // Saison und KH-Tag werden initial für die Vorschau direkt neu berechnet
    const saisonMonate = this.seasonService.calculateSaisonMonate(validIngredients);
    const khTag = this.khService.calculateKhTag(validIngredients);

    // ID sicherstellen
    const id = typeof obj.id === 'string' && obj.id.trim() ? obj.id.trim() : uuidv4();

    // Optionale Felder
    const zeitVorb =
      obj.zeitVorbereitung !== null && obj.zeitVorbereitung !== undefined
        ? Number(obj.zeitVorbereitung)
        : null;
    const zeitKoch =
      obj.zeitKochen !== null && obj.zeitKochen !== undefined ? Number(obj.zeitKochen) : null;

    let kategorie: Kategorie | null = null;
    if (typeof obj.kategorie === 'string' && obj.kategorie.trim()) {
      const matchKat = Object.values(Kategorie).find(
        (k) => k.toLowerCase() === (obj.kategorie as string).toLowerCase().trim(),
      );
      kategorie = matchKat || null;
    }

    const notizen =
      typeof obj.notizen === 'string' && obj.notizen.trim() ? obj.notizen.trim() : null;
    const fotoBase64 =
      typeof obj.fotoBase64 === 'string' && obj.fotoBase64.trim() ? obj.fotoBase64.trim() : null;

    return {
      id,
      titel,
      portionen,
      zeitVorbereitung: zeitVorb !== null && !isNaN(zeitVorb) ? zeitVorb : null,
      zeitKochen: zeitKoch !== null && !isNaN(zeitKoch) ? zeitKoch : null,
      kategorie,
      notizen,
      fotoBase64,
      saisonMonate,
      khTag,
      zutaten: validIngredients,
      schritte: validSteps,
      erstelltAm: typeof obj.erstelltAm === 'string' ? obj.erstelltAm : undefined,
      geaendertAm: typeof obj.geaendertAm === 'string' ? obj.geaendertAm : undefined,
    };
  }
}
