import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { App, AppPlugin, URLOpenListenerEvent } from '@capacitor/app';
import { IonApp, IonRouterOutlet, ModalController, ToastController } from '@ionic/angular';
import { filter, Subscription } from 'rxjs';
import { ImportService } from './core/import.service';
import {
  ImportModalComponent,
  ImportModalDismissResult,
} from './features/import/import-modal.component';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit, OnDestroy {
  private importService = inject(ImportService);
  private modalCtrl = inject(ModalController);
  private toastCtrl = inject(ToastController);
  private router = inject(Router);

  /** Plugin-Referenz für DI / Mocking in Tests */
  appPlugin: AppPlugin = App;

  private appUrlListener?: { remove: () => Promise<void> };
  private routerSub?: Subscription;

  async ngOnInit(): Promise<void> {
    await this.setupDeepLinkHandling();
    this.setupWebQueryParamHandling();
  }

  ngOnDestroy(): void {
    if (this.appUrlListener) {
      void this.appUrlListener.remove();
    }
    if (this.routerSub) {
      this.routerSub.unsubscribe();
    }
  }

  async setupDeepLinkHandling(): Promise<void> {
    try {
      this.appUrlListener = await this.appPlugin.addListener(
        'appUrlOpen',
        async (event: URLOpenListenerEvent) => {
          if (event?.url) {
            await this.handleIncomingUrl(event.url);
          }
        },
      );
    } catch (err) {
      console.warn('Capacitor App.addListener nicht verfügbar:', err);
    }
  }

  setupWebQueryParamHandling(): void {
    this.routerSub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        const urlTree = this.router.parseUrl(this.router.url);
        const dataParam = urlTree.queryParams['data'];
        if (dataParam) {
          void this.handleIncomingUrl(`rebu://recipe?data=${encodeURIComponent(dataParam)}`);
          void this.router.navigate([], {
            queryParams: { data: null },
            queryParamsHandling: 'merge',
            replaceUrl: true,
          });
        }
      });
  }

  async handleIncomingUrl(url: string): Promise<void> {
    const parseResult = this.importService.parseImportSource(url);
    if (!parseResult.success || parseResult.recipes.length === 0) {
      await this.showToast(
        parseResult.error || 'Der geöffnete Link enthält kein gültiges Rezept.',
        'danger',
      );
      return;
    }

    const modal = await this.modalCtrl.create({
      component: ImportModalComponent,
      componentProps: { drafts: parseResult.recipes },
    });

    await modal.present();

    const { data } = await modal.onWillDismiss<ImportModalDismissResult>();
    if (data?.imported) {
      if (data.recipeId && data.count === 1) {
        await this.router.navigate(['/recipes', data.recipeId]);
      } else {
        await this.router.navigate(['/recipes']);
      }
    }
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3500,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}
