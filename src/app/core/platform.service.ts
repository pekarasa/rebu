import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { App, AppPlugin } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { ActionSheetController, AlertController, ModalController, Platform } from '@ionic/angular';
import { Subscription } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PlatformService {
  private platform = inject(Platform);
  private modalCtrl = inject(ModalController);
  private alertCtrl = inject(AlertController);
  private actionSheetCtrl = inject(ActionSheetController);
  private router = inject(Router);

  /** Plugin-Referenzen für DI / Mocking in Tests */
  appPlugin: AppPlugin = App;
  statusBarPlugin: typeof StatusBar = StatusBar;

  private backButtonSub?: Subscription;
  private mediaQueryListener?: (e: MediaQueryListEvent) => void;
  private mediaQueryList?: MediaQueryList;

  /**
   * Prüft, ob die App in einer nativen Capacitor-Umgebung läuft (Android oder iOS).
   */
  isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Prüft, ob die App auf Android läuft.
   */
  isAndroid(): boolean {
    return this.platform.is('android');
  }

  /**
   * Prüft, ob die App auf iOS läuft.
   */
  isIos(): boolean {
    return this.platform.is('ios');
  }

  /**
   * Initialisiert mobile Plattform-Anpassungen:
   * 1. Status Bar Theme & dynamische Dark-Mode Anpassung
   * 2. Android Hardware Back Button Handling
   */
  async initialize(): Promise<void> {
    await this.setupStatusBar();
    this.setupHardwareBackButton();
  }

  /**
   * Konfiguriert die native Statusleiste.
   */
  async setupStatusBar(): Promise<void> {
    if (!this.isNative()) {
      return;
    }

    try {
      const isDark =
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;

      await this.applyStatusBarStyle(isDark);

      if (typeof window !== 'undefined' && window.matchMedia) {
        this.mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
        this.mediaQueryListener = (e: MediaQueryListEvent) => {
          void this.applyStatusBarStyle(e.matches);
        };
        this.mediaQueryList.addEventListener('change', this.mediaQueryListener);
      }
    } catch (err) {
      console.warn('StatusBar konnte nicht initialisiert werden:', err);
    }
  }

  /**
   * Wendet StatusBar-Farbe und Stil an.
   */
  async applyStatusBarStyle(isDark: boolean): Promise<void> {
    try {
      await this.statusBarPlugin.setStyle({
        style: isDark ? Style.Dark : Style.Light,
      });
      await this.statusBarPlugin.setBackgroundColor({
        color: isDark ? '#121212' : '#ffffff',
      });
      await this.statusBarPlugin.setOverlaysWebView({ overlay: false });
    } catch (err) {
      console.warn('applyStatusBarStyle fehlgeschlagen:', err);
    }
  }

  /**
   * Registriert die Behandlung der Hardware-Zurück-Taste auf Android.
   */
  setupHardwareBackButton(): void {
    if (!this.platform.backButton) {
      return;
    }

    this.backButtonSub = this.platform.backButton.subscribeWithPriority(
      10,
      async (processNextHandler) => {
        // 1. Zuerst offene Overlays (Modal, Alert, ActionSheet) schließen
        const topModal = await this.modalCtrl.getTop();
        if (topModal) {
          await topModal.dismiss();
          return;
        }

        const topAlert = await this.alertCtrl.getTop();
        if (topAlert) {
          await topAlert.dismiss();
          return;
        }

        const topActionSheet = await this.actionSheetCtrl.getTop();
        if (topActionSheet) {
          await topActionSheet.dismiss();
          return;
        }

        // 2. Navigation zurück prüfen
        const currentUrl = this.router.url.split('?')[0];
        if (currentUrl !== '/recipes' && currentUrl !== '/') {
          await this.router.navigate(['/recipes']);
          return;
        }

        // 3. Auf der Hauptseite die App beenden/minimieren
        try {
          await this.appPlugin.exitApp();
        } catch {
          if (typeof processNextHandler === 'function') {
            processNextHandler();
          }
        }
      },
    );
  }

  /**
   * Bereinigt Event-Listener und Subscriptions.
   */
  destroy(): void {
    if (this.backButtonSub) {
      this.backButtonSub.unsubscribe();
      this.backButtonSub = undefined;
    }

    if (this.mediaQueryList && this.mediaQueryListener) {
      this.mediaQueryList.removeEventListener('change', this.mediaQueryListener);
      this.mediaQueryListener = undefined;
      this.mediaQueryList = undefined;
    }
  }
}
