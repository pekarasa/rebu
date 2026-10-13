import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { Kategorie } from '../models/kategorie.enum';

export interface RecipeDraft {
  recipeId?: string | null;
  titel: string;
  portionen: number;
  zeitVorbereitung: number | null;
  zeitKochen: number | null;
  kategorie: Kategorie | null;
  notizen: string | null;
  fotoPath: string | null;
  fotoDisplayUrl?: string | null;
  zutaten: Array<{
    menge: number | null;
    einheit: string;
    name: string;
  }>;
  schritte: Array<{
    text: string;
  }>;
  updatedAt: string;
}

const NEW_DRAFT_KEY = 'rebu_recipe_draft_new';
const DRAFT_PREFIX = 'rebu_recipe_draft_';

@Injectable({ providedIn: 'root' })
export class DraftService {
  private getKey(recipeId?: string | null): string {
    return recipeId ? `${DRAFT_PREFIX}${recipeId}` : NEW_DRAFT_KEY;
  }

  async saveDraft(draft: RecipeDraft): Promise<void> {
    const key = this.getKey(draft.recipeId);
    const value = JSON.stringify({
      ...draft,
      updatedAt: new Date().toISOString(),
    });
    await Preferences.set({ key, value });
  }

  async loadDraft(recipeId?: string | null): Promise<RecipeDraft | null> {
    const key = this.getKey(recipeId);
    const result = await Preferences.get({ key });
    if (!result.value) return null;
    try {
      return JSON.parse(result.value) as RecipeDraft;
    } catch {
      return null;
    }
  }

  async hasDraft(recipeId?: string | null): Promise<boolean> {
    const draft = await this.loadDraft(recipeId);
    return draft !== null;
  }

  async clearDraft(recipeId?: string | null): Promise<void> {
    const key = this.getKey(recipeId);
    await Preferences.remove({ key });
  }
}
