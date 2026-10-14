import { Injectable } from '@angular/core';
import { ZUTAT_SAISON_DB, ZutatSaison } from '../data/zutat-saison.data';
import { formatSaisonDisplay } from '../models/saison.enum';

const ALL_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/**
 * Ausgeschlossene Suffixe für verarbeitete Vorratszutaten, die nicht als
 * frische saisonale Zutat gewertet werden sollen (z. B. Apfelessig, Kürbiskerne, Walnussöl).
 */
const EXCLUDED_PANTRY_SUFFIXES = [
  'essig',
  'öl',
  'oel',
  'kern',
  'kerne',
  'kernöl',
  'kernoel',
  'saft',
  'sirup',
  'marmelade',
  'konfitüre',
  'konfituere',
  'gelee',
  'mus',
  'pulver',
];

@Injectable({ providedIn: 'root' })
export class SeasonService {
  private readonly sortedDb = [...ZUTAT_SAISON_DB].sort((a, b) => b.name.length - a.name.length);

  /**
   * Findet einen Eintrag in der Saisondatenbank anhand des Namens der Zutat.
   * Gibt den Eintrag zurück oder null, falls die Zutat als ganzjährig gilt oder
   * es sich um eine verarbeitete Vorratszutat handelt (z. B. Apfelessig, Kürbiskernöl).
   */
  findSaisonForIngredient(ingredientName: string): ZutatSaison | null {
    if (!ingredientName) return null;
    const lower = ingredientName.toLowerCase().trim();
    if (!lower) return null;

    for (const item of this.sortedDb) {
      let startIndex = 0;
      let foundIndex = lower.indexOf(item.name, startIndex);

      while (foundIndex !== -1) {
        const surroundingWord = this.getSurroundingWord(lower, foundIndex, item.name.length);
        const isPantryExclusion = EXCLUDED_PANTRY_SUFFIXES.some((suffix) =>
          surroundingWord.endsWith(suffix),
        );

        if (!isPantryExclusion) {
          return item;
        }

        startIndex = foundIndex + item.name.length;
        foundIndex = lower.indexOf(item.name, startIndex);
      }
    }
    return null;
  }

  /**
   * Prüft, ob eine einzelne Zutat saisonal erfasst ist.
   */
  isIngredientSeasonal(ingredientName: string): boolean {
    return this.findSaisonForIngredient(ingredientName) !== null;
  }

  /**
   * Gibt den formatierten Saison-Anzeigenamen (z. B. "Sommer" oder "Herbst") für eine Zutat zurück,
   * oder null wenn die Zutat ganzjährig/nicht saisonal ist.
   */
  getIngredientSaisonDisplay(ingredientName: string): string | null {
    const item = this.findSaisonForIngredient(ingredientName);
    if (!item) return null;
    return formatSaisonDisplay(item.monate);
  }

  /**
   * Berechnet die saisonalen Monate für ein Rezept basierend auf seinen Zutaten.
   * - Wenn keine saisonalen Zutaten enthalten sind (alle ganzjährig): [1..12].
   * - Wenn saisonale Zutaten enthalten sind: Schnittmenge aller Monate der saisonalen Zutaten.
   * - Wenn die Schnittmenge leer ist: [] (kein gemeinsamer Monat).
   */
  calculateSaisonMonate(ingredients: Array<{ name: string }>): number[] {
    if (!ingredients || ingredients.length === 0) {
      return [...ALL_MONTHS];
    }

    const seasonalIngredients: ZutatSaison[] = [];
    for (const ing of ingredients) {
      const match = this.findSaisonForIngredient(ing.name);
      if (match) {
        seasonalIngredients.push(match);
      }
    }

    if (seasonalIngredients.length === 0) {
      return [...ALL_MONTHS];
    }

    // Schnittmenge der Monate aller saisonalen Zutaten
    let commonMonths = new Set<number>(seasonalIngredients[0].monate);

    for (let i = 1; i < seasonalIngredients.length; i++) {
      const currentMonths = new Set<number>(seasonalIngredients[i].monate);
      commonMonths = new Set<number>([...commonMonths].filter((month) => currentMonths.has(month)));
    }

    return [...commonMonths].sort((a, b) => a - b);
  }

  /**
   * Prüft, ob ein Rezept als ganzjährig gilt (alle 12 Monate abgedeckt).
   */
  isAllYear(saisonMonate: number[]): boolean {
    return ALL_MONTHS.every((m) => saisonMonate.includes(m));
  }

  /**
   * Ermittelt das vollständige Wort um einen gefundenen Substring herum.
   */
  private getSurroundingWord(text: string, matchIndex: number, matchLength: number): string {
    let start = matchIndex;
    while (start > 0 && /[a-zäöüß]/i.test(text[start - 1])) {
      start--;
    }
    let end = matchIndex + matchLength;
    while (end < text.length && /[a-zäöüß]/i.test(text[end])) {
      end++;
    }
    return text.substring(start, end);
  }
}
