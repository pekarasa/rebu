import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ModalController,
  ToastController,
  ViewWillEnter,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  cloudDownloadOutline,
  cloudUploadOutline,
  documentTextOutline,
  imageOutline,
  informationCircleOutline,
  restaurantOutline,
  shareOutline,
} from 'ionicons/icons';
import { ImportedRecipeDraft, ImportService } from '../../core/import.service';
import { RecipeRepository } from '../../core/recipe.repository';
import { ShareService } from '../../core/share.service';
import { ImportModalComponent, ImportModalDismissResult } from '../import/import-modal.component';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
    IonNote,
    IonSpinner,
  ],
})
export class SettingsPage implements OnInit, ViewWillEnter {
  private recipeRepo = inject(RecipeRepository);
  private shareService = inject(ShareService);
  private importService = inject(ImportService);
  private modalCtrl = inject(ModalController);
  private toastCtrl = inject(ToastController);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('fileInput') fileInputRef?: ElementRef<HTMLInputElement>;

  recipeCount = 0;
  photoCount = 0;
  isLoadingStats = true;
  isExporting = false;
  isImporting = false;

  constructor() {
    addIcons({
      cloudDownloadOutline,
      cloudUploadOutline,
      documentTextOutline,
      imageOutline,
      informationCircleOutline,
      restaurantOutline,
      shareOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadStats();
  }

  async ionViewWillEnter(): Promise<void> {
    await this.loadStats();
  }

  async loadStats(): Promise<void> {
    this.isLoadingStats = true;
    this.cdr.markForCheck();
    try {
      const recipes = await this.recipeRepo.findAll();
      this.recipeCount = recipes.length;
      this.photoCount = recipes.filter((r) => !!r.fotoPath).length;
    } catch (err) {
      console.warn('Statistiken konnten nicht geladen werden:', err);
    } finally {
      this.isLoadingStats = false;
      this.cdr.markForCheck();
    }
  }

  async exportAllRecipes(): Promise<void> {
    if (this.isExporting) return;

    this.isExporting = true;
    try {
      const recipes = await this.recipeRepo.findAll();
      if (recipes.length === 0) {
        await this.showToast('Keine Rezepte zum Exportieren vorhanden.', 'warning');
        return;
      }

      const result = await this.shareService.shareBatchJsonFile(recipes, true);
      if (result.success) {
        const msg =
          result.method === 'download'
            ? 'Sammel-Export heruntergeladen!'
            : 'Sammel-Export erfolgreich bereitgestellt!';
        await this.showToast(msg, 'success');
      } else if (result.error !== 'Abgebrochen') {
        await this.showToast(result.error || 'Sammel-Export fehlgeschlagen.', 'danger');
      }
    } catch (err) {
      console.error('Fehler beim Sammel-Export:', err);
      await this.showToast('Fehler beim Erstellen des Sammel-Exports.', 'danger');
    } finally {
      this.isExporting = false;
    }
  }

  triggerFileInput(): void {
    if (this.fileInputRef?.nativeElement) {
      this.fileInputRef.nativeElement.value = '';
      this.fileInputRef.nativeElement.click();
    }
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;

    this.isImporting = true;
    try {
      const parseResult = await this.importService.parseFile(file);
      if (!parseResult.success || parseResult.recipes.length === 0) {
        await this.showToast(
          parseResult.error || 'Die Datei enthält keine gültigen Rezepte.',
          'danger',
        );
        return;
      }

      await this.openImportModal(parseResult.recipes);
    } catch (err) {
      console.error('Fehler beim Lesen der Datei:', err);
      await this.showToast('Datei konnte nicht verarbeitet werden.', 'danger');
    } finally {
      this.isImporting = false;
      if (input) {
        input.value = '';
      }
    }
  }

  async openImportModal(drafts: ImportedRecipeDraft[]): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: ImportModalComponent,
      componentProps: { drafts },
    });

    await modal.present();

    const { data } = await modal.onWillDismiss<ImportModalDismissResult>();
    if (data?.imported) {
      await this.loadStats();
    }
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}
