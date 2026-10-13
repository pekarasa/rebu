import { Injectable } from '@angular/core';
import { ZUTAT_KH_DB, ZutatKH } from '../data/zutat-kh.data';

export interface KhCandidate {
  tag: string;
  prioritaet: 1 | 2;
  menge: number | null;
  ingredientIndex: number;
}

@Injectable({ providedIn: 'root' })
export class KhService {
  private readonly sortedDb = [...ZUTAT_KH_DB].sort((a, b) => b.name.length - a.name.length);

  /**
   * Findet den am besten passenden KH-Eintrag für eine einzelne Zutat.
   */
  findKhForIngredient(ingredientName: string): ZutatKH | null {
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
   * Ermittelt den primären KH-Tag eines Rezepts anhand der Zutatenliste:
   * 1. Höchste Priorität (1 vor 2)
   * 2. Bei gleicher Priorität: Größte Menge (falls messbar > 0)
   * 3. Bei Gleichstand: Erster Treffer in der Zutatenliste
   * 4. Gibt null zurück, wenn kein Treffer vorhanden ist.
   */
  calculateKhTag(ingredients: Array<{ name: string; menge?: number | null }>): string | null {
    if (!ingredients || ingredients.length === 0) {
      return null;
    }

    const candidates: KhCandidate[] = [];

    for (let index = 0; index < ingredients.length; index++) {
      const ing = ingredients[index];
      const match = this.findKhForIngredient(ing.name);
      if (match) {
        candidates.push({
          tag: match.tag,
          prioritaet: match.prioritaet,
          menge: ing.menge ?? null,
          ingredientIndex: index,
        });
      }
    }

    if (candidates.length === 0) {
      return null;
    }

    candidates.sort((a, b) => {
      // 1. Priorität (1 vor 2)
      if (a.prioritaet !== b.prioritaet) {
        return a.prioritaet - b.prioritaet;
      }

      // 2. Menge vergleichen, wenn beide positive Mengen haben
      const mengeA = a.menge !== null && a.menge > 0 ? a.menge : null;
      const mengeB = b.menge !== null && b.menge > 0 ? b.menge : null;

      if (mengeA !== null && mengeB !== null) {
        if (mengeA !== mengeB) {
          return mengeB - mengeA; // größere Menge zuerst
        }
      } else if (mengeA !== null && mengeB === null) {
        return -1; // Eintrag mit Menge gewinnt
      } else if (mengeA === null && mengeB !== null) {
        return 1;
      }

      // 3. Bei Gleichstand: Erster Treffer in der Zutatenliste gewinnt
      return a.ingredientIndex - b.ingredientIndex;
    });

    return candidates[0].tag;
  }
}
