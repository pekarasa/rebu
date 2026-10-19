import { inject, Injectable } from '@angular/core';
import { Share, SharePlugin } from '@capacitor/share';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { PortionScalingService } from './portion-scaling.service';
import { PhotoService } from './photo.service';
import { Recipe } from '../models/recipe.model';

export type ShareMethod = 'native' | 'clipboard' | 'download';

export interface ShareExecutionResult {
  success: boolean;
  method?: ShareMethod;
  error?: string;
}

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

export interface BatchRecipeExportPayload {
  app: 'rebu';
  version: number;
  exportedAt: string;
  recipes: RecipeExportData[];
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
   * Erzeugt einen Dateinamen für den Sammel-Export im Format:
   * `rebu-alle-rezepte-YYYY-MM-DD.rezept.json`
   */
  getBatchExportFileName(date = new Date()): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `rebu-alle-rezepte-${yyyy}-${mm}-${dd}.rezept.json`;
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
   * Erstellt den JSON-String für den Sammel-Export aller übergebenen Rezepte.
   * Bindet Fotos als Base64 ein, falls vorhanden und includePhotos = true.
   */
  async createBatchExportJson(recipes: Recipe[], includePhotos = true): Promise<string> {
    const exportedRecipes: RecipeExportData[] = [];

    for (const recipe of recipes) {
      let photoBase64: string | null = null;
      if (includePhotos && recipe.fotoPath) {
        try {
          photoBase64 = await this.photoService.getPhotoDisplayUrl(recipe.fotoPath);
        } catch (err) {
          console.warn(`Foto für Rezept "${recipe.titel}" konnte nicht geladen werden:`, err);
        }
      }
      exportedRecipes.push(this.mapRecipeToExportData(recipe, photoBase64));
    }

    const payload: BatchRecipeExportPayload = {
      app: 'rebu',
      version: 1,
      exportedAt: new Date().toISOString(),
      recipes: exportedRecipes,
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
   * Prüft, ob nativer Teilen-Dialog unterstützt wird.
   */
  async canShare(): Promise<boolean> {
    try {
      if (this.sharePlugin && typeof this.sharePlugin.canShare === 'function') {
        const res = await this.sharePlugin.canShare();
        if (res.value) return true;
      }
    } catch {
      // Ignorieren und Web-Check probieren
    }

    return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  }

  /**
   * Teilt ein Rezept als formatierten Klartext.
   * Versucht zuerst Capacitor Share / Web Share API, fällt sonst auf Zwischenablage zurück.
   */
  async shareText(recipe: Recipe, portions?: number): Promise<ShareExecutionResult> {
    const formattedText = this.formatAsText(recipe, portions);
    return this.shareContent({
      title: recipe.titel,
      text: formattedText,
      dialogTitle: `${recipe.titel} teilen`,
    });
  }

  /**
   * Teilt ein Rezept als App-zu-App Deep Link.
   */
  async shareDeepLink(recipe: Recipe, options?: DeepLinkOptions): Promise<ShareExecutionResult> {
    const link = this.encodeDeepLink(recipe, options);
    return this.shareContent({
      title: recipe.titel,
      text: `${recipe.titel} – mit Rebu ansehen`,
      url: link,
      dialogTitle: `${recipe.titel} Link teilen`,
    });
  }

  /**
   * Exportiert ein Rezept als .json Datei und öffnet den nativen Share-Dialog.
   * Falls nicht auf nativer Plattform oder Filesystem/Share fehlschlägt,
   * wird die Datei im Webbrowser als Download angeboten.
   */
  async shareJsonFile(recipe: Recipe, includePhoto = true): Promise<ShareExecutionResult> {
    try {
      const fileName = this.getExportFileName(recipe.titel);
      const jsonContent = await this.createRecipeExportJson(recipe, includePhoto);

      let fileUri: string | null = null;
      try {
        const writeResult = await this.filesystemPlugin.writeFile({
          path: `exports/${fileName}`,
          data: jsonContent,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
          recursive: true,
        });
        fileUri = writeResult?.uri ?? null;
      } catch (fsErr) {
        console.warn('Filesystem.writeFile im Cache fehlgeschlagen:', fsErr);
      }

      if (fileUri) {
        try {
          const canShareRes = await this.sharePlugin.canShare();
          if (canShareRes.value) {
            await this.sharePlugin.share({
              title: fileName,
              files: [fileUri],
              dialogTitle: `${recipe.titel} als Datei teilen`,
            });
            return { success: true, method: 'native' };
          }
        } catch (shareErr) {
          if (this.isUserCancellation(shareErr)) {
            return { success: false, error: 'Abgebrochen' };
          }
        }
      }

      // Fallback: Browser Download
      this.triggerFileDownload(fileName, jsonContent, 'application/json');
      return { success: true, method: 'download' };
    } catch (err) {
      console.error('ShareService.shareJsonFile fehlgeschlagen:', err);
      return { success: false, error: 'Datei-Export fehlgeschlagen' };
    }
  }

  /**
   * Exportiert mehrere oder alle Rezepte als .json-Datei und öffnet den nativen Share-Dialog.
   * Falls nicht auf nativer Plattform oder Filesystem/Share fehlschlägt,
   * wird die Datei im Webbrowser als Download angeboten.
   */
  async shareBatchJsonFile(
    recipes: Recipe[],
    includePhotos = true,
    fileName?: string,
  ): Promise<ShareExecutionResult> {
    try {
      const effectiveFileName = fileName || this.getBatchExportFileName();
      const jsonContent = await this.createBatchExportJson(recipes, includePhotos);

      let fileUri: string | null = null;
      try {
        const writeResult = await this.filesystemPlugin.writeFile({
          path: `exports/${effectiveFileName}`,
          data: jsonContent,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
          recursive: true,
        });
        fileUri = writeResult?.uri ?? null;
      } catch (fsErr) {
        console.warn('Filesystem.writeFile im Cache fehlgeschlagen:', fsErr);
      }

      if (fileUri) {
        try {
          const canShareRes = await this.sharePlugin.canShare();
          if (canShareRes.value) {
            await this.sharePlugin.share({
              title: effectiveFileName,
              files: [fileUri],
              dialogTitle: `Alle Rezepte exportieren (${recipes.length})`,
            });
            return { success: true, method: 'native' };
          }
        } catch (shareErr) {
          if (this.isUserCancellation(shareErr)) {
            return { success: false, error: 'Abgebrochen' };
          }
        }
      }

      // Fallback: Browser Download
      this.triggerFileDownload(effectiveFileName, jsonContent, 'application/json');
      return { success: true, method: 'download' };
    } catch (err) {
      console.error('ShareService.shareBatchJsonFile fehlgeschlagen:', err);
      return { success: false, error: 'Sammel-Export fehlgeschlagen' };
    }
  }

  /**
   * Kopiert einen String in die System-Zwischenablage.
   */
  async copyTextToClipboard(text: string): Promise<boolean> {
    if (
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === 'function'
    ) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // Fallback
      }
    }

    try {
      if (typeof document !== 'undefined') {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textarea);
        return success;
      }
    } catch {
      return false;
    }
    return false;
  }

  /**
   * Druckfreundliche Ansicht (v2 Vorbereitung / Druckdialog).
   */
  printRecipe(recipe: Recipe, portions?: number): void {
    if (typeof window === 'undefined') return;
    const formattedText = this.formatAsText(recipe, portions);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const title = recipe.titel;
      printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="de">
          <head>
            <meta charset="utf-8">
            <title>${title}</title>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; padding: 2rem; line-height: 1.6; color: #111; }
              h1 { margin-bottom: 0.5rem; font-size: 1.75rem; }
              pre { font-family: inherit; white-space: pre-wrap; font-size: 1rem; }
            </style>
          </head>
          <body>
            <h1>${title}</h1>
            <pre>${formattedText}</pre>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    } else {
      window.print();
    }
  }

  /**
   * Hilfsfunktion zum Auslösen eines Dateidownloads im Browser.
   */
  triggerFileDownload(fileName: string, content: string, mimeType = 'application/json'): void {
    if (typeof document === 'undefined') return;
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  /**
   * Interner Verteiler: versucht natives Teilen via Capacitor oder Web Share API,
   * fällt ansonsten auf die Zwischenablage zurück.
   */
  private async shareContent(options: {
    title: string;
    text?: string;
    url?: string;
    dialogTitle?: string;
  }): Promise<ShareExecutionResult> {
    // 1. Capacitor Share Plugin versuchen
    try {
      const canShareRes = await this.sharePlugin.canShare();
      if (canShareRes.value) {
        await this.sharePlugin.share(options);
        return { success: true, method: 'native' };
      }
    } catch (pluginErr) {
      if (this.isUserCancellation(pluginErr)) {
        return { success: false, error: 'Abgebrochen' };
      }
    }

    // 2. Web Share API versuchen
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: options.title,
          text: options.text,
          url: options.url,
        });
        return { success: true, method: 'native' };
      } catch (webErr) {
        if (this.isUserCancellation(webErr)) {
          return { success: false, error: 'Abgebrochen' };
        }
      }
    }

    // 3. Fallback: Zwischenablage
    const toCopy = options.url || options.text || options.title;
    const copied = await this.copyTextToClipboard(toCopy);
    if (copied) {
      return { success: true, method: 'clipboard' };
    }

    return { success: false, error: 'Teilen fehlgeschlagen' };
  }

  private isUserCancellation(err: unknown): boolean {
    if (!err) return false;
    const msg = String(err).toLowerCase();
    return (
      msg.includes('cancel') ||
      msg.includes('aborted') ||
      msg.includes('abort') ||
      msg.includes('dismiss') ||
      msg.includes('closed')
    );
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
