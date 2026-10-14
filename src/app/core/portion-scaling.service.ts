import { Injectable } from '@angular/core';
import { Ingredient } from '../models/ingredient.model';

@Injectable({ providedIn: 'root' })
export class PortionScalingService {
  /**
   * Skaliert eine Zutatenmenge von der Basis-Portionsanzahl auf die Ziel-Portionsanzahl.
   * Gibt null zurück, wenn keine Ausgangsmenge angegeben ist (z. B. "Prise").
   * Rundet auf maximal 2 Nachkommastellen.
   */
  scaleAmount(
    baseAmount: number | null | undefined,
    basePortions: number,
    targetPortions: number,
  ): number | null {
    if (baseAmount === null || baseAmount === undefined || isNaN(baseAmount)) {
      return null;
    }

    if (basePortions <= 0 || targetPortions <= 0) {
      return baseAmount;
    }

    if (basePortions === targetPortions) {
      return baseAmount;
    }

    const scaled = (baseAmount / basePortions) * targetPortions;
    return Math.round((scaled + Number.EPSILON) * 100) / 100;
  }

  /**
   * Skaliert alle Mengenangaben einer Zutatenliste basierend auf Ziel-Portionen.
   * Gibt neue Zutaten-Objekte zurück, ohne die Originale zu mutieren.
   */
  scaleIngredients(
    ingredients: Ingredient[],
    basePortions: number,
    targetPortions: number,
  ): Ingredient[] {
    if (!ingredients?.length) {
      return [];
    }

    return ingredients.map((ing) => ({
      ...ing,
      menge: this.scaleAmount(ing.menge, basePortions, targetPortions),
    }));
  }

  /**
   * Formatiert eine numerische Menge für die Rezeptanzeige im deutschen Format:
   * - Ganze Zahlen ohne Dezimalstelle (z.B. 4 -> "4")
   * - Dezimalzahlen mit Komma und bis zu 2 Nachkommastellen (z.B. 1.5 -> "1,5", 0.333 -> "0,33")
   * - Null / undefined -> leerer String ""
   * - Tausendertrennzeichen werden vermieden, um Verwechslungen mit Dezimalpunkten zu verhindern (z.B. 1000 -> "1000")
   */
  formatAmount(amount: number | null | undefined): string {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '';
    }

    const rounded = Math.round((amount + Number.EPSILON) * 100) / 100;
    return new Intl.NumberFormat('de-DE', {
      maximumFractionDigits: 2,
      useGrouping: false,
    }).format(rounded);
  }
}
