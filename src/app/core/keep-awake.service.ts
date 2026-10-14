import { Injectable } from '@angular/core';
import { KeepAwake } from '@capacitor-community/keep-awake';

@Injectable({ providedIn: 'root' })
export class KeepAwakeService {
  /**
   * Plugin-Referenz für Dependency Injection / Mocking in Tests.
   */
  keepAwakePlugin = KeepAwake;

  private _isActive = false;

  /**
   * Gibt an, ob der Bildschirm derzeit aktiv gehalten wird.
   */
  get isActive(): boolean {
    return this._isActive;
  }

  /**
   * Aktiviert den Keep-Awake-Modus, sodass sich der Bildschirm nicht automatisch ausschaltet.
   */
  async enable(): Promise<boolean> {
    try {
      await this.keepAwakePlugin.keepAwake();
      this._isActive = true;
      return true;
    } catch (err) {
      console.warn('KeepAwake.keepAwake() fehlgeschlagen oder nicht unterstützt:', err);
      return false;
    }
  }

  /**
   * Deaktiviert den Keep-Awake-Modus, sodass der reguläre Ruhemodus wieder aktiv wird.
   */
  async disable(): Promise<boolean> {
    try {
      await this.keepAwakePlugin.allowSleep();
      this._isActive = false;
      return true;
    } catch (err) {
      console.warn('KeepAwake.allowSleep() fehlgeschlagen:', err);
      return false;
    }
  }

  /**
   * Prüft, ob Keep-Awake auf der Plattform unterstützt wird.
   */
  async isSupported(): Promise<boolean> {
    try {
      if (typeof this.keepAwakePlugin.isSupported === 'function') {
        const res = await this.keepAwakePlugin.isSupported();
        return res.isSupported;
      }
      return false;
    } catch {
      return false;
    }
  }
}
