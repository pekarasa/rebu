import { Injectable } from '@angular/core';
import { ZUTAT_SAISON_DB, ZutatSaison } from '../data/zutat-saison.data';

const ALL_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

@Injectable({ providedIn: 'root' })
export class SeasonService {
  private readonly sortedDb = [...ZUTAT_SAISON_DB].sort((a, b) => b.name.length - a.name.length);

  /**
   * Findet einen Eintrag in der Saisondatenbank anhand des Namens der Zutat.
   * Gibt den Eintrag zurück oder null, falls die Zutat als ganzjährig gilt.
   */
  findSaisonForIngredient(ingredientName: string): ZutatSaison | null {
    if (!ingredientName) return null;
    const lower = ingredientName.toLowerCase().trim();
    for (const item of this.sortedDb) {
      if (lower.includes(item.name)) {
        return item;
      }
    }
    return null;
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
}
