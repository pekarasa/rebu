import { CommonModule } from '@angular/common';
import { Component, inject, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AlertController,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ModalController,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  bookmarkOutline,
  checkmarkCircleOutline,
  closeOutline,
  copyOutline,
  downloadOutline,
  imageOutline,
  leafOutline,
  nutritionOutline,
  peopleOutline,
  refreshOutline,
  restaurantOutline,
  timeOutline,
} from 'ionicons/icons';
import {
  CollisionResolution,
  ImportedRecipeDraft,
  ImportExecutionResult,
  ImportService,
} from '../../core/import.service';
import { formatSaisonDisplay } from '../../models/saison.enum';
import { BadgeComponent } from '../../shared/components/badge/badge.component';

export interface ImportModalDismissResult {
  imported: boolean;
  recipeId?: string;
  count?: number;
}

@Component({
  selector: 'app-import-modal',
  templateUrl: './import-modal.component.html',
  styleUrls: ['./import-modal.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonCheckbox,
    IonSpinner,
    BadgeComponent,
  ],
})
export class ImportModalComponent implements OnInit {
  private modalCtrl = inject(ModalController);
  private importService = inject(ImportService);
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);

  @Input({ required: true }) drafts: ImportedRecipeDraft[] = [];

  isSaving = false;
  hasCollision = false;
  collisionChecked = false;

  // Für Mehrfach-Import (Sammel-Import / M9)
  selectedIndices = new Set<number>();
  previewIndex = 0;

  get isMulti(): boolean {
    return this.drafts.length > 1;
  }

  get currentDraft(): ImportedRecipeDraft | null {
    if (!this.drafts.length) return null;
    return this.drafts[this.previewIndex] || this.drafts[0];
  }

  get saisonLabel(): string {
    if (!this.currentDraft) return 'Ganzjährig';
    return formatSaisonDisplay(this.currentDraft.saisonMonate);
  }

  get saisonColor(): 'success' | 'warning' | 'primary' | 'medium' {
    const label = this.saisonLabel;
    if (label === 'Frühling') return 'success';
    if (label === 'Sommer') return 'warning';
    if (label === 'Herbst') return 'warning';
    if (label === 'Winter') return 'primary';
    return 'medium';
  }

  get totalTime(): number {
    if (!this.currentDraft) return 0;
    return (this.currentDraft.zeitVorbereitung || 0) + (this.currentDraft.zeitKochen || 0);
  }

  constructor() {
    addIcons({
      closeOutline,
      downloadOutline,
      copyOutline,
      refreshOutline,
      alertCircleOutline,
      checkmarkCircleOutline,
      timeOutline,
      peopleOutline,
      restaurantOutline,
      leafOutline,
      nutritionOutline,
      bookmarkOutline,
      imageOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    if (this.isMulti) {
      // Alle standardmäßig vorauswählen
      this.drafts.forEach((_, idx) => this.selectedIndices.add(idx));
    }

    if (this.currentDraft) {
      this.hasCollision = await this.importService.checkUuidCollision(this.currentDraft.id);
      this.collisionChecked = true;
    }
  }

  async selectPreview(index: number): Promise<void> {
    this.previewIndex = index;
    if (this.currentDraft) {
      this.hasCollision = await this.importService.checkUuidCollision(this.currentDraft.id);
    }
  }

  toggleSelection(index: number): void {
    if (this.selectedIndices.has(index)) {
      this.selectedIndices.delete(index);
    } else {
      this.selectedIndices.add(index);
    }
  }

  toggleAll(event: CustomEvent): void {
    const isChecked = event.detail.checked;
    if (isChecked) {
      this.drafts.forEach((_, idx) => this.selectedIndices.add(idx));
    } else {
      this.selectedIndices.clear();
    }
  }

  /**
   * Speichert das einzelne Rezept (wenn keine Kollision).
   */
  async onSave(): Promise<void> {
    if (!this.currentDraft) return;

    if (this.hasCollision) {
      await this.promptCollisionResolution();
      return;
    }

    await this.executeSingleImport();
  }

  /**
   * Führt den Import mit der angegebenen Kollisionsstrategie durch ('overwrite' oder 'copy').
   */
  async onSaveWithResolution(resolution: CollisionResolution): Promise<void> {
    await this.executeSingleImport(resolution);
  }

  private async executeSingleImport(resolution?: CollisionResolution): Promise<void> {
    if (!this.currentDraft) return;

    this.isSaving = true;
    try {
      const result = await this.importService.importRecipe(this.currentDraft, {
        collisionResolution: resolution,
      });

      if (result.success && result.recipe) {
        let msg = 'Rezept erfolgreich importiert!';
        if (result.action === 'overwritten') {
          msg = 'Bestehendes Rezept erfolgreich überschrieben!';
        } else if (result.action === 'copied') {
          msg = 'Rezept als Kopie gespeichert!';
        }

        await this.showToast(msg, 'success');
        await this.modalCtrl.dismiss({
          imported: true,
          recipeId: result.recipe.id,
          count: 1,
        } satisfies ImportModalDismissResult);
      } else if (result.collision) {
        this.hasCollision = true;
        await this.promptCollisionResolution();
      } else {
        await this.showToast(result.error || 'Import fehlgeschlagen.', 'danger');
      }
    } catch (err) {
      console.error('Import-Fehler:', err);
      await this.showToast('Fehler beim Importieren des Rezepts.', 'danger');
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * Fragt per Alert nach der gewünschten Kollisionsbehandlung.
   */
  async promptCollisionResolution(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Rezept existiert bereits',
      message:
        'Ein Rezept mit dieser Kennung ist bereits vorhanden. Möchtest du das bestehende Rezept überschreiben oder als neue Kopie anlegen?',
      buttons: [
        {
          text: 'Abbrechen',
          role: 'cancel',
        },
        {
          text: 'Als Kopie speichern',
          handler: () => {
            this.executeSingleImport('copy');
          },
        },
        {
          text: 'Überschreiben',
          role: 'destructive',
          handler: () => {
            this.executeSingleImport('overwrite');
          },
        },
      ],
    });

    await alert.present();
  }

  /**
   * Importiert alle aktuell ausgewählten Rezepte bei Mehrfach-Import.
   */
  async onImportSelected(): Promise<void> {
    const selected = this.drafts.filter((_, idx) => this.selectedIndices.has(idx));
    if (selected.length === 0) {
      await this.showToast('Bitte wähle mindestens ein Rezept aus.', 'warning');
      return;
    }

    // Prüfen, ob Kollisionen vorliegen
    let hasAnyCollision = false;
    for (const draft of selected) {
      if (await this.importService.checkUuidCollision(draft.id)) {
        hasAnyCollision = true;
        break;
      }
    }

    if (hasAnyCollision) {
      const alert = await this.alertCtrl.create({
        header: 'Bereits vorhandene Rezepte',
        message:
          'Einige der Rezepte existieren bereits auf deinem Gerät. Wie sollen diese behandelt werden?',
        buttons: [
          {
            text: 'Abbrechen',
            role: 'cancel',
          },
          {
            text: 'Als Kopien anlegen',
            handler: () => this.executeBatchImport(selected, 'copy'),
          },
          {
            text: 'Überschreiben',
            role: 'destructive',
            handler: () => this.executeBatchImport(selected, 'overwrite'),
          },
        ],
      });
      await alert.present();
      return;
    }

    await this.executeBatchImport(selected);
  }

  private async executeBatchImport(
    recipesToImport: ImportedRecipeDraft[],
    resolution?: CollisionResolution,
  ): Promise<void> {
    this.isSaving = true;
    let successCount = 0;

    try {
      for (const draft of recipesToImport) {
        const res: ImportExecutionResult = await this.importService.importRecipe(draft, {
          collisionResolution: resolution,
        });
        if (res.success) {
          successCount++;
        }
      }

      await this.showToast(
        `${successCount} von ${recipesToImport.length} Rezept(en) erfolgreich importiert!`,
        'success',
      );
      await this.modalCtrl.dismiss({
        imported: true,
        count: successCount,
      } satisfies ImportModalDismissResult);
    } catch (err) {
      console.error('Batch-Import-Fehler:', err);
      await this.showToast('Fehler beim Sammel-Import.', 'danger');
    } finally {
      this.isSaving = false;
    }
  }

  async onDiscard(): Promise<void> {
    await this.modalCtrl.dismiss({ imported: false } satisfies ImportModalDismissResult);
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
