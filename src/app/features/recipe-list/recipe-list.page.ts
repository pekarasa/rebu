import { Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  ActionSheetController,
  IonButton,
  IonButtons,
  IonChip,
  IonCol,
  IonContent,
  IonFab,
  IonFabButton,
  IonGrid,
  IonHeader,
  IonIcon,
  IonLabel,
  IonProgressBar,
  IonRefresher,
  IonRefresherContent,
  IonRow,
  IonSearchbar,
  IonTitle,
  IonToolbar,
  ModalController,
  ToastController,
  ViewWillEnter,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  addOutline,
  closeCircle,
  downloadOutline,
  funnelOutline,
  leafOutline,
  nutritionOutline,
  refreshOutline,
  restaurantOutline,
  searchOutline,
  swapVerticalOutline,
} from 'ionicons/icons';
import {
  FilterPreferencesService,
  FilterPreferencesState,
} from '../../core/filter-preferences.service';
import { RecipeFilter, RecipeRepository, RecipeSortOrder } from '../../core/recipe.repository';
import { ImportedRecipeDraft, ImportService } from '../../core/import.service';
import { ImportModalComponent, ImportModalDismissResult } from '../import/import-modal.component';
import { KH_TAGS } from '../../data/zutat-kh.data';
import { Recipe } from '../../models/recipe.model';
import { getCurrentSaison, getMonateForSaison, Saison } from '../../models/saison.enum';
import { RecipeCardComponent } from './components/recipe-card/recipe-card.component';

@Component({
  selector: 'app-recipe-list',
  templateUrl: './recipe-list.page.html',
  styleUrls: ['./recipe-list.page.scss'],
  imports: [
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonSearchbar,
    IonContent,
    IonRefresher,
    IonRefresherContent,
    IonProgressBar,
    IonChip,
    IonLabel,
    IonIcon,
    IonGrid,
    IonRow,
    IonCol,
    IonFab,
    IonFabButton,
    RecipeCardComponent,
  ],
})
export class RecipeListPage implements OnInit, ViewWillEnter {
  private recipeRepo = inject(RecipeRepository);
  private filterPrefs = inject(FilterPreferencesService);
  private actionSheetCtrl = inject(ActionSheetController);
  private modalCtrl = inject(ModalController);
  private toastCtrl = inject(ToastController);
  private importService = inject(ImportService);
  private router = inject(Router);

  @ViewChild('fileInput') fileInputRef?: ElementRef<HTMLInputElement>;

  recipes: Recipe[] = [];
  searchTerm = '';
  selectedSaison: Saison | 'alle' = getCurrentSaison();
  selectedKhTag: string | null = null;
  sortOrder: RecipeSortOrder = 'alphabetisch';

  isLoading = false;
  hasLoadedOnce = false;
  totalRecipeCount = 0;

  constructor() {
    addIcons({
      addOutline,
      downloadOutline,
      searchOutline,
      leafOutline,
      nutritionOutline,
      swapVerticalOutline,
      funnelOutline,
      closeCircle,
      refreshOutline,
      restaurantOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    const saved = await this.filterPrefs.getFilterState();
    this.selectedSaison = saved.saison;
    this.selectedKhTag = saved.khTag;
    this.sortOrder = saved.sortierung;
    await this.loadRecipes();
  }

  async ionViewWillEnter(): Promise<void> {
    if (this.hasLoadedOnce) {
      await this.loadRecipes();
    }
  }

  get isDefaultFilter(): boolean {
    const current = getCurrentSaison();
    return (
      this.selectedSaison === current &&
      this.selectedKhTag === null &&
      this.sortOrder === 'alphabetisch' &&
      !this.searchTerm.trim()
    );
  }

  get hasActiveFilters(): boolean {
    return (
      this.selectedSaison !== 'alle' ||
      this.selectedKhTag !== null ||
      this.searchTerm.trim().length > 0
    );
  }

  get sortOrderLabel(): string {
    switch (this.sortOrder) {
      case 'neuste-zuerst':
        return 'Neueste';
      case 'zeitaufwand':
        return 'Zeitaufwand';
      default:
        return 'A–Z';
    }
  }

  get saisonFilterLabel(): string {
    if (this.selectedSaison === 'alle') {
      return 'Saison: Alle';
    }
    return `Saison: ${this.selectedSaison}`;
  }

  get khFilterLabel(): string {
    if (!this.selectedKhTag) {
      return 'KH-Tag: Alle';
    }
    return `KH: ${this.selectedKhTag}`;
  }

  async onSearchChange(event: CustomEvent): Promise<void> {
    const value = (event.detail.value ?? '') as string;
    this.searchTerm = value;
    await this.loadRecipes();
  }

  async onRefresh(event: CustomEvent): Promise<void> {
    await this.loadRecipes();
    (event.target as HTMLIonRefresherElement).complete();
  }

  async loadRecipes(): Promise<void> {
    this.isLoading = true;
    try {
      const filter: RecipeFilter = {
        suche: this.searchTerm.trim() || undefined,
        sortierung: this.sortOrder,
      };

      if (this.selectedSaison !== 'alle') {
        filter.saisonMonate = getMonateForSaison(this.selectedSaison);
      }

      if (this.selectedKhTag) {
        filter.khTag = this.selectedKhTag;
      }

      this.recipes = await this.recipeRepo.findAll(filter);

      // Falls wir gerade suchen/filtern, bestimmen wir auch, ob generell Rezepte in der DB sind
      if (
        this.recipes.length === 0 &&
        (this.searchTerm || this.selectedSaison !== 'alle' || this.selectedKhTag)
      ) {
        const allRecipes = await this.recipeRepo.findAll();
        this.totalRecipeCount = allRecipes.length;
      } else {
        this.totalRecipeCount = this.recipes.length;
      }
    } catch (err) {
      console.error('Fehler beim Laden der Rezepte:', err);
    } finally {
      this.isLoading = false;
      this.hasLoadedOnce = true;
    }
  }

  async openSaisonSelection(): Promise<void> {
    const current = getCurrentSaison();
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Saison-Filter wählen',
      subHeader: `Aktuelle Saison ist ${current}`,
      buttons: [
        {
          text: `Aktuelle Saison (${current})`,
          role: this.selectedSaison === current ? 'selected' : undefined,
          handler: () => {
            this.setSaison(current);
          },
        },
        {
          text: Saison.Fruehling,
          role: this.selectedSaison === Saison.Fruehling ? 'selected' : undefined,
          handler: () => {
            this.setSaison(Saison.Fruehling);
          },
        },
        {
          text: Saison.Sommer,
          role: this.selectedSaison === Saison.Sommer ? 'selected' : undefined,
          handler: () => {
            this.setSaison(Saison.Sommer);
          },
        },
        {
          text: Saison.Herbst,
          role: this.selectedSaison === Saison.Herbst ? 'selected' : undefined,
          handler: () => {
            this.setSaison(Saison.Herbst);
          },
        },
        {
          text: Saison.Winter,
          role: this.selectedSaison === Saison.Winter ? 'selected' : undefined,
          handler: () => {
            this.setSaison(Saison.Winter);
          },
        },
        {
          text: 'Alle Saisons (kein Filter)',
          role: this.selectedSaison === 'alle' ? 'selected' : undefined,
          handler: () => {
            this.setSaison('alle');
          },
        },
        {
          text: 'Abbrechen',
          role: 'cancel',
        },
      ],
    });

    await actionSheet.present();
  }

  async openKhSelection(): Promise<void> {
    const buttons = [
      {
        text: 'Alle (kein KH-Filter)',
        role: this.selectedKhTag === null ? 'selected' : undefined,
        handler: () => {
          this.setKhTag(null);
        },
      },
      ...KH_TAGS.map((tag) => ({
        text: tag,
        role: this.selectedKhTag === tag ? 'selected' : undefined,
        handler: () => {
          this.setKhTag(tag);
        },
      })),
      {
        text: 'Abbrechen',
        role: 'cancel',
      },
    ];

    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Kohlenhydrat-Filter wählen',
      buttons,
    });

    await actionSheet.present();
  }

  async openSortSelection(): Promise<void> {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Sortierung wählen',
      buttons: [
        {
          text: 'Alphabetisch (A–Z)',
          role: this.sortOrder === 'alphabetisch' ? 'selected' : undefined,
          handler: () => {
            this.setSortOrder('alphabetisch');
          },
        },
        {
          text: 'Neueste zuerst',
          role: this.sortOrder === 'neuste-zuerst' ? 'selected' : undefined,
          handler: () => {
            this.setSortOrder('neuste-zuerst');
          },
        },
        {
          text: 'Zeitaufwand (kürzeste zuerst)',
          role: this.sortOrder === 'zeitaufwand' ? 'selected' : undefined,
          handler: () => {
            this.setSortOrder('zeitaufwand');
          },
        },
        {
          text: 'Abbrechen',
          role: 'cancel',
        },
      ],
    });

    await actionSheet.present();
  }

  async setSaison(saison: Saison | 'alle'): Promise<void> {
    this.selectedSaison = saison;
    await this.persistAndReload({ saison });
  }

  async clearSaisonFilter(event?: Event): Promise<void> {
    if (event) {
      event.stopPropagation();
    }
    await this.setSaison('alle');
  }

  async setKhTag(tag: string | null): Promise<void> {
    this.selectedKhTag = tag;
    await this.persistAndReload({ khTag: tag });
  }

  async clearKhFilter(event?: Event): Promise<void> {
    if (event) {
      event.stopPropagation();
    }
    await this.setKhTag(null);
  }

  async setSortOrder(order: RecipeSortOrder): Promise<void> {
    this.sortOrder = order;
    await this.persistAndReload({ sortierung: order });
  }

  async resetAllFilters(): Promise<void> {
    this.searchTerm = '';
    const defaults = await this.filterPrefs.resetFilterState();
    this.selectedSaison = defaults.saison;
    this.selectedKhTag = defaults.khTag;
    this.sortOrder = defaults.sortierung;
    await this.loadRecipes();
  }

  onRecipeSelected(recipe: Recipe): void {
    void this.router.navigate(['/recipes', recipe.id]);
  }

  triggerFileInput(): void {
    this.fileInputRef?.nativeElement.click();
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    input.value = '';

    const parseResult = await this.importService.parseFile(file);
    if (!parseResult.success || parseResult.recipes.length === 0) {
      await this.showToast(
        parseResult.error || 'Die Datei enthält kein gültiges Rezept.',
        'danger',
      );
      return;
    }

    await this.openImportModal(parseResult.recipes);
  }

  async openImportModal(drafts: ImportedRecipeDraft[]): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: ImportModalComponent,
      componentProps: { drafts },
    });

    await modal.present();

    const { data } = await modal.onWillDismiss<ImportModalDismissResult>();
    if (data?.imported) {
      await this.loadRecipes();
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

  private async persistAndReload(partial: Partial<FilterPreferencesState>): Promise<void> {
    await this.filterPrefs.saveFilterState(partial);
    await this.loadRecipes();
  }
}
