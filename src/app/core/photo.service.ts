import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { v4 as uuidv4 } from 'uuid';

export interface PhotoResult {
  filePath: string;
  displayUrl: string;
}

@Injectable({ providedIn: 'root' })
export class PhotoService {
  /**
   * Öffnet den nativen Foto-Dialog (Kamera oder Fotomediathek), speichert das Foto
   * lokal im Capacitor-Dateisystem und gibt den relativen Pfad sowie die Anzeige-URL zurück.
   */
  async pickOrTakePhoto(source: CameraSource = CameraSource.Prompt): Promise<PhotoResult | null> {
    try {
      const image = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source,
      });

      if (!image.dataUrl) return null;
      return await this.saveDataUrl(image.dataUrl);
    } catch {
      // Benutzer hat abgebrochen oder Kamera nicht verfügbar
      return null;
    }
  }

  /**
   * Speichert eine DataUrl (z. B. aus File-Input oder Kamera) als JPG-Datei im Capacitor-Filesystem.
   */
  async saveDataUrl(dataUrl: string): Promise<PhotoResult> {
    const fileName = `recipe-photos/${uuidv4()}.jpg`;
    try {
      await Filesystem.writeFile({
        path: fileName,
        data: dataUrl,
        directory: Directory.Data,
        recursive: true,
      });
    } catch (err) {
      console.warn('Filesystem.writeFile failed, continuing with memory URL:', err);
    }

    return {
      filePath: fileName,
      displayUrl: dataUrl,
    };
  }

  /**
   * Lädt die Anzeige-URL (DataUrl oder Webpfad) für einen im Rezept gespeicherten Dateipfad.
   */
  async getPhotoDisplayUrl(filePath: string | null): Promise<string | null> {
    if (!filePath) return null;

    if (
      filePath.startsWith('data:') ||
      filePath.startsWith('blob:') ||
      filePath.startsWith('http')
    ) {
      return filePath;
    }

    try {
      const file = await Filesystem.readFile({
        path: filePath,
        directory: Directory.Data,
      });

      if (typeof file.data === 'string') {
        return file.data.startsWith('data:') ? file.data : `data:image/jpeg;base64,${file.data}`;
      }
    } catch (err) {
      console.warn(`Foto unter ${filePath} konnte nicht geladen werden:`, err);
    }

    return null;
  }

  /**
   * Löscht eine Foto-Datei aus dem Capacitor-Filesystem.
   */
  async deletePhoto(filePath: string | null): Promise<void> {
    if (!filePath) return;
    if (
      filePath.startsWith('data:') ||
      filePath.startsWith('blob:') ||
      filePath.startsWith('http')
    ) {
      return;
    }

    try {
      await Filesystem.deleteFile({
        path: filePath,
        directory: Directory.Data,
      });
    } catch {
      // Ignorieren falls nicht vorhanden
    }
  }
}
