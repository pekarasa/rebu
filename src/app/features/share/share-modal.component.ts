import { CommonModule } from '@angular/common';
import { Component, inject, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
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
  IonTitle,
  IonToggle,
  IonToolbar,
  ModalController,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  checkmarkOutline,
  closeOutline,
  codeDownloadOutline,
  copyOutline,
  documentTextOutline,
  linkOutline,
  printOutline,
  restaurantOutline,
  shareOutline,
} from 'ionicons/icons';
import { ShareService } from '../../core/share.service';
import { Recipe } from '../../models/recipe.model';

@Component({
  selector: 'app-share-modal',
  templateUrl: './share-modal.component.html',
  styleUrls: ['./share-modal.component.scss'],
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
    IonItem,
    IonLabel,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonToggle,
  ],
})
export class ShareModalComponent implements OnInit {
  private modalCtrl = inject(ModalController);
  private shareService = inject(ShareService);
  private toastCtrl = inject(ToastController);

  @Input({ required: true }) recipe!: Recipe;
  @Input() portions?: number;

  includePhotoInJson = true;
  isSharing = false;

  constructor() {
    addIcons({
      closeOutline,
      linkOutline,
      documentTextOutline,
      codeDownloadOutline,
      printOutline,
      copyOutline,
      shareOutline,
      checkmarkOutline,
      restaurantOutline,
    });
  }

  ngOnInit(): void {
    if (!this.recipe) {
      console.warn('ShareModalComponent: Kein Rezept übergeben');
    }
  }

  get effectivePortions(): number {
    return this.portions && this.portions > 0 ? this.portions : (this.recipe?.portionen ?? 4);
  }

  get exportFileName(): string {
    return this.shareService.getExportFileName(this.recipe?.titel || 'Rezept');
  }

  async dismiss(): Promise<void> {
    await this.modalCtrl.dismiss();
  }

  async shareLink(): Promise<void> {
    if (!this.recipe || this.isSharing) return;
    this.isSharing = true;
    try {
      const res = await this.shareService.shareDeepLink(this.recipe);
      if (res.success) {
        await this.showToast(
          res.method === 'clipboard' ? 'Link in die Zwischenablage kopiert!' : 'Link geteilt!',
        );
        await this.dismiss();
      } else if (res.error && res.error !== 'Abgebrochen') {
        await this.showToast(res.error, 'danger');
      }
    } finally {
      this.isSharing = false;
    }
  }

  async copyLink(): Promise<void> {
    if (!this.recipe || this.isSharing) return;
    const link = this.shareService.encodeDeepLink(this.recipe);
    const copied = await this.shareService.copyTextToClipboard(link);
    if (copied) {
      await this.showToast('Link in Zwischenablage kopiert!');
    } else {
      await this.showToast('Kopieren fehlgeschlagen.', 'danger');
    }
  }

  async shareText(): Promise<void> {
    if (!this.recipe || this.isSharing) return;
    this.isSharing = true;
    try {
      const res = await this.shareService.shareText(this.recipe, this.effectivePortions);
      if (res.success) {
        await this.showToast(
          res.method === 'clipboard' ? 'Text in die Zwischenablage kopiert!' : 'Rezept geteilt!',
        );
        await this.dismiss();
      } else if (res.error && res.error !== 'Abgebrochen') {
        await this.showToast(res.error, 'danger');
      }
    } finally {
      this.isSharing = false;
    }
  }

  async copyText(): Promise<void> {
    if (!this.recipe || this.isSharing) return;
    const text = this.shareService.formatAsText(this.recipe, this.effectivePortions);
    const copied = await this.shareService.copyTextToClipboard(text);
    if (copied) {
      await this.showToast('Rezepttext in Zwischenablage kopiert!');
    } else {
      await this.showToast('Kopieren fehlgeschlagen.', 'danger');
    }
  }

  async shareJson(): Promise<void> {
    if (!this.recipe || this.isSharing) return;
    this.isSharing = true;
    try {
      const res = await this.shareService.shareJsonFile(this.recipe, this.includePhotoInJson);
      if (res.success) {
        await this.showToast(
          res.method === 'download' ? 'Rezeptdatei heruntergeladen!' : 'Rezeptdatei geteilt!',
        );
        await this.dismiss();
      } else if (res.error && res.error !== 'Abgebrochen') {
        await this.showToast(res.error, 'danger');
      }
    } finally {
      this.isSharing = false;
    }
  }

  print(): void {
    if (!this.recipe) return;
    this.shareService.printRecipe(this.recipe, this.effectivePortions);
  }

  private async showToast(message: string, color?: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2200,
      position: 'bottom',
      color: color || undefined,
    });
    await toast.present();
  }
}
