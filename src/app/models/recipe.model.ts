import { Ingredient, IngredientCreate } from './ingredient.model';
import { Kategorie } from './kategorie.enum';
import { Step, StepCreate } from './step.model';

export interface Recipe {
  id: string;
  titel: string;
  portionen: number;
  zeitVorbereitung: number | null;
  zeitKochen: number | null;
  kategorie: Kategorie | null;
  notizen: string | null;
  /** Relativer Dateipfad im Capacitor Filesystem oder null */
  fotoPath: string | null;
  erstelltAm: string; // ISO-8601
  geaendertAm: string; // ISO-8601
  /** Monate (1–12) in denen das Rezept saisonal ist (berechnet beim Speichern) */
  saisonMonate: number[];
  /** Primärer KH-Lieferant, z.B. "Pasta" (berechnet beim Speichern) */
  khTag: string | null;
  zutaten: Ingredient[];
  schritte: Step[];
}

/** Eingabetyp beim Anlegen eines neuen Rezepts (ohne berechnete / generierte Felder) */
export type RecipeCreate = Omit<
  Recipe,
  'id' | 'erstelltAm' | 'geaendertAm' | 'saisonMonate' | 'khTag' | 'zutaten' | 'schritte'
> & {
  zutaten: IngredientCreate[];
  schritte: StepCreate[];
};

/** Eingabetyp beim Bearbeiten eines bestehenden Rezepts */
export type RecipeUpdate = Partial<RecipeCreate> & { id: string };
