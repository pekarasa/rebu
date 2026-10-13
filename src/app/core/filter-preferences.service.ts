import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { getCurrentSaison, Saison } from '../models/saison.enum';
import { RecipeSortOrder } from './recipe.repository';

export interface FilterPreferencesState {
  /** Ausgewählte Saison oder 'alle' für keinen Saisonfilter */
  saison: Saison | 'alle';
  /** Ausgewählter KH-Tag oder null für keinen KH-Filter */
  khTag: string | null;
  /** Sortierreihenfolge */
  sortierung: RecipeSortOrder;
}

export const FILTER_PREFERENCES_STORAGE_KEY = 'rebu_recipe_filter_preferences';

export function getDefaultFilterPreferences(): FilterPreferencesState {
  return {
    saison: getCurrentSaison(),
    khTag: null,
    sortierung: 'alphabetisch',
  };
}

@Injectable({ providedIn: 'root' })
export class FilterPreferencesService {
  private memoryFallback: FilterPreferencesState = getDefaultFilterPreferences();

  async getFilterState(): Promise<FilterPreferencesState> {
    try {
      const { value } = await Preferences.get({ key: FILTER_PREFERENCES_STORAGE_KEY });
      if (!value) {
        return { ...this.memoryFallback };
      }
      const parsed = JSON.parse(value) as Partial<FilterPreferencesState>;
      const defaults = getDefaultFilterPreferences();
      return {
        saison: parsed.saison ?? defaults.saison,
        khTag: parsed.khTag !== undefined ? parsed.khTag : defaults.khTag,
        sortierung: parsed.sortierung ?? defaults.sortierung,
      };
    } catch {
      return { ...this.memoryFallback };
    }
  }

  async saveFilterState(state: Partial<FilterPreferencesState>): Promise<void> {
    const current = await this.getFilterState();
    const updated: FilterPreferencesState = {
      ...current,
      ...state,
    };
    this.memoryFallback = updated;

    try {
      await Preferences.set({
        key: FILTER_PREFERENCES_STORAGE_KEY,
        value: JSON.stringify(updated),
      });
    } catch {
      // In Fallback-Speicher gehalten
    }
  }

  async resetFilterState(): Promise<FilterPreferencesState> {
    const defaults = getDefaultFilterPreferences();
    this.memoryFallback = defaults;
    try {
      await Preferences.remove({ key: FILTER_PREFERENCES_STORAGE_KEY });
    } catch {
      // In Fallback-Speicher gehalten
    }
    return defaults;
  }
}
