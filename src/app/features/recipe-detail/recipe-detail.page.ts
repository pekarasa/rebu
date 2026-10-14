import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  AlertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonProgressBar,
  IonTitle,
  IonToolbar,
  NavController,
  ToastController,
  ViewWillEnter,
  ViewWillLeave,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  bookmarkOutline,
  checkmarkCircle,
  createOutline,
  ellipseOutline,
  flameOutline,
  hourglassOutline,
  informationCircleOutline,
  leafOutline,
  nutritionOutline,
  refreshOutline,
  restaurantOutline,
  shareOutline,
  timeOutline,
  trashOutline,
} from 'ionicons/icons';
import { KeepAwakeService } from '../../core/keep-awake.service';
import { PhotoService } from '../../core/photo.service';
import { PortionScalingService } from '../../core/portion-scaling.service';
import { RecipeRepository } from '../../core/recipe.repository';
import { Ingredient } from '../../models/ingredient.model';
import { Recipe } from '../../models/recipe.model';
import { formatSaisonDisplay } from '../../models/saison.enum';
import { BadgeColor, BadgeComponent } from '../../shared/components/badge/badge.component';
import { PortionSelectorComponent } from '../../shared/components/portion-selector/portion-selector.component';

@Component({
  selector: 'app-recipe-detail',
  templateUrl: './recipe-detail.page.html',
  styleUrls: ['./recipe-detail.page.scss'],
  imports: [
    CommonModule,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonBackButton,
    IonContent,
    IonIcon,
    IonProgressBar,
    BadgeComponent,
    PortionSelectorComponent,
  ],
})
export class RecipeDetailPage implements OnInit, OnDestroy, ViewWillEnter, ViewWillLeave {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private navCtrl = inject(NavController);
  private recipeRepo = inject(RecipeRepository);
  private photoService = inject(PhotoService);
  private portionScaling = inject(PortionScalingService);
  private keepAwakeService = inject(KeepAwakeService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private cdr = inject(ChangeDetectorRef);

  recipe: Recipe | null = null;
  displayPhotoUrl: string | null = null;
  currentPortions = 4;
  checkedStepIds = new Set<string>();

  isLoading = true;
  loadError: string | null = null;

  constructor() {
    addIcons({
      shareOutline,
      createOutline,
      trashOutline,
      restaurantOutline,
      timeOutline,
      flameOutline,
      hourglassOutline,
      leafOutline,
      nutritionOutline,
      bookmarkOutline,
      checkmarkCircle,
      ellipseOutline,
      informationCircleOutline,
      refreshOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      await this.loadRecipe(id);
    } else {
      this.loadError = 'Keine Rezept-ID übergeben.';
      this.isLoading = false;
    }
  }

  async ionViewWillEnter(): Promise<void> {
    // Keep-Awake aktivieren, damit das Display beim Kochen aktiv bleibt
    await this.keepAwakeService.enable();

    // Bei erneutem Aufruf prüfen, ob Rezept aktualisiert wurde
    const id = this.route.snapshot.paramMap.get('id');
    if (id && this.recipe && this.recipe.id === id) {
      await this.loadRecipe(id, false);
    }
  }

  async ionViewWillLeave(): Promise<void> {
    // Keep-Awake deaktivieren beim Verlassen der Detailansicht
    await this.keepAwakeService.disable();
  }

  async ngOnDestroy(): Promise<void> {
    await this.keepAwakeService.disable();
  }

  async loadRecipe(id: string, showSpinner = true): Promise<void> {
    if (showSpinner) {
      this.isLoading = true;
    }
    this.loadError = null;

    try {
      const found = await this.recipeRepo.findById(id);
      if (!found) {
        this.loadError = 'Das Rezept wurde leider nicht gefunden.';
        this.recipe = null;
        return;
      }

      this.recipe = found;
      // Portionen initialisieren falls noch nicht gesetzt oder Erstaufruf
      if (showSpinner || this.currentPortions <= 0) {
        this.currentPortions = found.portionen > 0 ? found.portionen : 4;
      }

      if (found.fotoPath) {
        this.displayPhotoUrl = await this.photoService.getPhotoDisplayUrl(found.fotoPath);
      } else {
        this.displayPhotoUrl = null;
      }
    } catch (err) {
      console.error('Fehler beim Laden des Rezepts:', err);
      this.loadError = 'Fehler beim Laden des Rezepts.';
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  // ---------------------------------------------------------------------------
  // Berechnete Eigenschaften
  // ---------------------------------------------------------------------------

  get totalMinutes(): number {
    return (this.recipe?.zeitVorbereitung ?? 0) + (this.recipe?.zeitKochen ?? 0);
  }

  get saisonLabel(): string {
    return formatSaisonDisplay(this.recipe?.saisonMonate ?? []);
  }

  get saisonColor(): BadgeColor {
    const label = this.saisonLabel;
    if (label.includes('Frühling')) return 'success';
    if (label.includes('Sommer')) return 'warning';
    if (label.includes('Herbst')) return 'warning';
    if (label.includes('Winter')) return 'tertiary';
    return 'medium';
  }

  get scaledIngredients(): Ingredient[] {
    if (!this.recipe) return [];
    return this.portionScaling.scaleIngredients(
      this.recipe.zutaten,
      this.recipe.portionen,
      this.currentPortions,
    );
  }

  get completedStepsCount(): number {
    if (!this.recipe?.schritte) return 0;
    return this.recipe.schritte.filter((s) => this.checkedStepIds.has(s.id)).length;
  }

  get totalStepsCount(): number {
    return this.recipe?.schritte?.length ?? 0;
  }

  get cookingProgress(): number {
    if (this.totalStepsCount === 0) return 0;
    return this.completedStepsCount / this.totalStepsCount;
  }

  get cookingProgressPercent(): number {
    return Math.round(this.cookingProgress * 100);
  }

  // ---------------------------------------------------------------------------
  // Interaktionen
  // ---------------------------------------------------------------------------

  onPortionsChange(newPortions: number): void {
    if (newPortions > 0) {
      this.currentPortions = newPortions;
      this.cdr.markForCheck();
    }
  }

  formatAmount(amount: number | null | undefined): string {
    return this.portionScaling.formatAmount(amount);
  }

  isStepCompleted(stepId: string): boolean {
    return this.checkedStepIds.has(stepId);
  }

  toggleStep(stepId: string): void {
    if (this.checkedStepIds.has(stepId)) {
      this.checkedStepIds.delete(stepId);
    } else {
      this.checkedStepIds.add(stepId);
    }
    this.cdr.markForCheck();
  }

  async resetCooking(): Promise<void> {
    if (this.checkedStepIds.size === 0) return;

    this.checkedStepIds.clear();
    this.cdr.markForCheck();
    const toast = await this.toastCtrl.create({
      message: 'Kochen beendet: Alle Schritte zurückgesetzt.',
      duration: 2000,
      position: 'bottom',
    });
    await toast.present();
  }

  editRecipe(): void {
    if (!this.recipe) return;
    void this.router.navigate(['/recipes', this.recipe.id, 'edit']);
  }

  async openShare(): Promise<void> {
    if (!this.recipe) return;

    // Einfacher Text-Export über Navigator.share falls verfügbar (vollständiger Export in M7)
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        const ingredientsText = this.scaledIngredients
          .map((z) => `${this.formatAmount(z.menge)} ${z.einheit} ${z.name}`.trim())
          .join('\n');

        const stepsText = this.recipe.schritte
          .map((s, idx) => `${idx + 1}. ${s.text}`)
          .join('\n\n');

        await navigator.share({
          title: this.recipe.titel,
          text: `${this.recipe.titel} (${this.currentPortions} Portionen)\n\nZutaten:\n${ingredientsText}\n\nZubereitung:\n${stepsText}`,
        });
        return;
      } catch {
        // Teilen abgebrochen oder fehlgeschlagen
        return;
      }
    }

    const toast = await this.toastCtrl.create({
      message: 'Teilen-Funktion wird in Meilenstein 7 vollständig ausgebaut.',
      duration: 2500,
      position: 'bottom',
    });
    await toast.present();
  }

  async confirmDelete(): Promise<void> {
    if (!this.recipe) return;

    const alert = await this.alertCtrl.create({
      header: 'Rezept löschen?',
      message: `Möchtest du das Rezept "${this.recipe.titel}" wirklich unwiderruflich löschen?`,
      buttons: [
        {
          text: 'Abbrechen',
          role: 'cancel',
        },
        {
          text: 'Löschen',
          role: 'destructive',
          handler: async () => {
            await this.deleteRecipe();
          },
        },
      ],
    });

    await alert.present();
  }

  private async deleteRecipe(): Promise<void> {
    if (!this.recipe) return;

    try {
      const { id, fotoPath } = this.recipe;
      await this.recipeRepo.delete(id);
      if (fotoPath) {
        await this.photoService.deletePhoto(fotoPath);
      }

      const toast = await this.toastCtrl.create({
        message: 'Rezept erfolgreich gelöscht.',
        duration: 2000,
        position: 'bottom',
      });
      await toast.present();

      await this.navCtrl.navigateBack('/recipes');
    } catch (err) {
      console.error('Fehler beim Löschen des Rezepts:', err);
      const toast = await this.toastCtrl.create({
        message: 'Fehler beim Löschen des Rezepts.',
        duration: 2500,
        position: 'bottom',
        color: 'danger',
      });
      await toast.present();
    }
  }
}
