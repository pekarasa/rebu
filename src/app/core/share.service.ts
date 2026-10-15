import { inject, Injectable } from '@angular/core';
import { Share, SharePlugin } from '@capacitor/share';
import { Filesystem } from '@capacitor/filesystem';
import { PortionScalingService } from './portion-scaling.service';
import { PhotoService } from './photo.service';
import { Recipe } from '../models/recipe.model';

export interface RecipeExportIngredient {
  id?: string;
  reihenfolge: number;
  menge: number | null;
  einheit: string;
  name: string;
}

export interface RecipeExportStep {
  id?: string;
  reihenfolge: number;
  text: string;
}

export interface RecipeExportData {
  id: string;
  titel: string;
  portionen: number;
  zeitVorbereitung: number | null;
  zeitKochen: number | null;
  kategorie: string | null;
  notizen: string | null;
  fotoBase64?: string | null;
  saisonMonate?: number[];
  khTag?: string | null;
  zutaten: RecipeExportIngredient[];
  schritte: RecipeExportStep[];
  erstelltAm: string;
  geaendertAm: string;
}

export interface SingleRecipeExportPayload {
  app: 'rebu';
  version: number;
  exportedAt: string;
  recipe: RecipeExportData;
}

export interface DeepLinkOptions {
  scheme?: 'https' | 'rebu';
  baseUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class ShareService {
  private portionScaling = inject(PortionScalingService);
  private photoService = inject(PhotoService);

  /** Plugin-Referenzen für DI / Mocking in Tests */
  sharePlugin: SharePlugin = Share;
  filesystemPlugin = Filesystem;

  /**
   * Formatiert ein Rezept als ansprechenden, lesbaren Klartext für WhatsApp, E-Mail, SMS etc.
   * Optional können Zutatenmengen für eine abweichende Portionszahl skaliert werden.
   */
  formatAsText(recipe: Recipe, portions?: number): string {
    const effectivePortions = portions && portions > 0 ? portions : recipe.portionen;
    const lines: string[] = [];

    // Titel & Portionen
    lines.push(
      `${recipe.titel} (${effectivePortions} ${effectivePortions === 1 ? 'Portion' : 'Portionen'})`,
    );

    // Zeitangaben
    const timeParts: string[] = [];
    if (recipe.zeitVorbereitung && recipe.zeitVorbereitung > 0) {
      timeParts.push(`Vorbereitung: ${recipe.zeitVorbereitung} Min.`);
    }
    if (recipe.zeitKochen && recipe.zeitKochen > 0) {
      timeParts.push(`Kochen: ${recipe.zeitKochen} Min.`);
    }
    if (timeParts.length > 0) {
      lines.push(timeParts.join(' | '));
    }

    if (recipe.kategorie) {
      lines.push(`Kategorie: ${recipe.kategorie}`);
    }

    // Zutatenliste
    lines.push('');
    lines.push('Zutaten:');
    const scaledIngredients = this.portionScaling.scaleIngredients(
      recipe.zutaten,
      recipe.portionen,
      effectivePortions,
    );

    if (scaledIngredients.length === 0) {
      lines.push('Keine Zutaten angegeben.');
    } else {
      for (const zutat of scaledIngredients) {
        const amountStr = this.portionScaling.formatAmount(zutat.menge);
        const parts: string[] = [];
        if (amountStr) parts.push(amountStr);
        if (zutat.einheit) parts.push(zutat.einheit);
        parts.push(zutat.name);
        lines.push(`• ${parts.join(' ')}`.trim());
      }
    }

    // Zubereitungsschritte
    lines.push('');
    lines.push('Zubereitung:');
    if (!recipe.schritte || recipe.schritte.length === 0) {
      lines.push('Keine Zubereitungsschritte angegeben.');
    } else {
      recipe.schritte.forEach((schritt, index) => {
        lines.push(`${index + 1}. ${schritt.text}`);
      });
    }

    // Notizen
    if (recipe.notizen?.trim()) {
      lines.push('');
      lines.push('Tipps & Notizen:');
      lines.push(recipe.notizen.trim());
    }

    lines.push('');
    lines.push('— Geteilt mit Rebu');

    return lines.join('\n');
  }

  /**
   * Erzeugt einen Dateinamen für den JSON-Export im Format: `<titel>.rezept.json`
   * Ungültige Dateisystem-Zeichen werden bereinigt.
   */
  getExportFileName(title: string): string {
    const sanitized = (title || 'rezept')
      .trim()
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/\s+/g, ' ');
    return `${sanitized || 'rezept'}.rezept.json`;
  }

  /**
   * Kodiert ein Rezept als Deep-Link (App-zu-App).
   * Enthält die vollständigen Rezeptdaten (ohne großes lokales Foto), um URL-Längenlimits einzuhalten.
   */
  encodeDeepLink(recipe: Recipe, options?: DeepLinkOptions): string {
    const payload: SingleRecipeExportPayload = {
      app: 'rebu',
      version: 1,
      exportedAt: new Date().toISOString(),
      recipe: this.mapRecipeToExportData(recipe, null),
    };

    const json = JSON.stringify(payload);
    const encoded = this.toUrlSafeBase64(json);

    const scheme = options?.scheme ?? 'https';
    if (scheme === 'rebu') {
      return `rebu://recipe?data=${encodeURIComponent(encoded)}`;
    }

    const baseUrl = options?.baseUrl || 'https://rebu.app/recipe';
    return `${baseUrl}?data=${encodeURIComponent(encoded)}`;
  }

  /**
   * Dekodiert einen Deep-Link oder einen rohen Base64-String zurück in Rezeptdaten.
   * Gibt `null` zurück, wenn der Link ungültig oder nicht dekodierbar ist.
   */
  decodeDeepLink(urlOrData: string): RecipeExportData | null {
    if (!urlOrData || typeof urlOrData !== 'string') return null;

    try {
      let rawData = urlOrData.trim();

      // Prüfen, ob eine URL übergeben wurde (z. B. https://rebu.app/recipe?data=... oder rebu://recipe?data=...)
      if (rawData.includes('data=')) {
        const match = rawData.match(/[?&#]data=([^&#]+)/);
        if (match && match[1]) {
          rawData = decodeURIComponent(match[1]);
        }
      }

      const jsonString = this.fromUrlSafeBase64(rawData);
      const parsed = JSON.parse(jsonString);

      // Unterstützt sowohl das Hüllformat { app: 'rebu', recipe: ... } als auch direkt ein Rezept-Objekt
      if (parsed && typeof parsed === 'object') {
        if ('recipe' in parsed && parsed.recipe && typeof parsed.recipe === 'object') {
          return parsed.recipe as RecipeExportData;
        }
        if ('titel' in parsed && Array.isArray(parsed.zutaten) && Array.isArray(parsed.schritte)) {
          return parsed as RecipeExportData;
        }
      }

      return null;
    } catch (err) {
      console.warn('ShareService.decodeDeepLink fehlgeschlagen:', err);
      return null;
    }
  }

  /**
   * Erstellt den JSON-String für den Datei-Export eines Rezepts.
   * Bindet das Foto als Base64 ein, falls vorhanden und aktiviert.
   */
  async createRecipeExportJson(recipe: Recipe, includePhoto = true): Promise<string> {
    let photoBase64: string | null = null;
    if (includePhoto && recipe.fotoPath) {
      photoBase64 = await this.photoService.getPhotoDisplayUrl(recipe.fotoPath);
    }

    const payload: SingleRecipeExportPayload = {
      app: 'rebu',
      version: 1,
      exportedAt: new Date().toISOString(),
      recipe: this.mapRecipeToExportData(recipe, photoBase64),
    };

    return JSON.stringify(payload, null, 2);
  }

  /**
   * Mappt ein internes Recipe-Modell auf das Export-Datenmodell.
   */
  private mapRecipeToExportData(recipe: Recipe, photoBase64: string | null): RecipeExportData {
    return {
      id: recipe.id,
      titel: recipe.titel,
      portionen: recipe.portionen,
      zeitVorbereitung: recipe.zeitVorbereitung ?? null,
      zeitKochen: recipe.zeitKochen ?? null,
      kategorie: recipe.kategorie ?? null,
      notizen: recipe.notizen ?? null,
      fotoBase64: photoBase64 ?? null,
      saisonMonate: recipe.saisonMonate ? [...recipe.saisonMonate] : [],
      khTag: recipe.khTag ?? null,
      zutaten: (recipe.zutaten || []).map((z, idx) => ({
        id: z.id,
        reihenfolge: z.reihenfolge ?? idx + 1,
        menge: z.menge,
        einheit: z.einheit || '',
        name: z.name,
      })),
      schritte: (recipe.schritte || []).map((s, idx) => ({
        id: s.id,
        reihenfolge: s.reihenfolge ?? idx + 1,
        text: s.text,
      })),
      erstelltAm: recipe.erstelltAm,
      geaendertAm: recipe.geaendertAm,
    };
  }

  /**
   * URL-sicheres Base64-Encoding mit UTF-8-Unterstützung (Umlaute, Sonderzeichen).
   */
  private toUrlSafeBase64(str: string): string {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  /**
   * URL-sicheres Base64-Decoding mit UTF-8-Unterstützung (Umlaute, Sonderzeichen).
   */
  private fromUrlSafeBase64(base64url: string): string {
    let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  }
}
