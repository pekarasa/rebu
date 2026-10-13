import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import {
  AlertController,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonList,
  IonRow,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonTitle,
  IonToolbar,
  NavController,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  addOutline,
  cameraOutline,
  checkmarkOutline,
  closeOutline,
  cloudDoneOutline,
  imageOutline,
  reorderTwoOutline,
  trashOutline,
} from 'ionicons/icons';
import { debounceTime, Subject, takeUntil } from 'rxjs';

import { DraftService, RecipeDraft } from '../../core/draft.service';
import { KhService } from '../../core/kh.service';
import { PhotoService } from '../../core/photo.service';
import { RecipeRepository } from '../../core/recipe.repository';
import { SeasonService } from '../../core/season.service';
import { IngredientCreate } from '../../models/ingredient.model';
import { Kategorie } from '../../models/kategorie.enum';
import { RecipeCreate, RecipeUpdate } from '../../models/recipe.model';
import { StepCreate } from '../../models/step.model';

@Component({
  selector: 'app-recipe-edit',
  templateUrl: './recipe-edit.page.html',
  styleUrls: ['./recipe-edit.page.scss'],
  imports: [
    CommonModule,
    DatePipe,
    ReactiveFormsModule,
    DragDropModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonItem,
    IonInput,
    IonTextarea,
    IonSelect,
    IonSelectOption,
    IonIcon,
    IonGrid,
    IonRow,
    IonCol,
  ],
})
export class RecipeEditPage implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private navCtrl = inject(NavController);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private recipeRepo = inject(RecipeRepository);
  private draftService = inject(DraftService);
  private photoService = inject(PhotoService);
  private seasonService = inject(SeasonService);
  private khService = inject(KhService);

  private destroy$ = new Subject<void>();

  recipeId: string | null = null;
  isEditMode = false;
  photoDisplayUrl: string | null = null;
  draftSavedAt: Date | null = null;

  categories = Object.values(Kategorie);
  commonUnits = ['g', 'kg', 'ml', 'l', 'TL', 'EL', 'Stück', 'Prise', 'Pck.', 'Bund', 'Dose'];

  form: FormGroup = this.fb.group({
    titel: ['', [Validators.required, Validators.maxLength(150)]],
    portionen: [4, [Validators.required, Validators.min(1)]],
    zeitVorbereitung: [null as number | null, [Validators.min(0)]],
    zeitKochen: [null as number | null, [Validators.min(0)]],
    kategorie: [null as Kategorie | null],
    notizen: [''],
    fotoPath: [null as string | null],
    zutaten: this.fb.array<FormGroup>([]),
    schritte: this.fb.array<FormGroup>([]),
  });

  constructor() {
    addIcons({
      cameraOutline,
      imageOutline,
      trashOutline,
      addOutline,
      reorderTwoOutline,
      checkmarkOutline,
      closeOutline,
      cloudDoneOutline,
    });
  }

  get zutatenArray(): FormArray<FormGroup> {
    return this.form.get('zutaten') as FormArray<FormGroup>;
  }

  get zutatenControls(): FormGroup[] {
    return this.zutatenArray.controls;
  }

  get schritteArray(): FormArray<FormGroup> {
    return this.form.get('schritte') as FormArray<FormGroup>;
  }

  get schritteControls(): FormGroup[] {
    return this.schritteArray.controls;
  }

  async ngOnInit(): Promise<void> {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.recipeId = idParam || null;
    this.isEditMode = !!this.recipeId;

    await this.initFormContent();
    this.setupAutoSave();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async initFormContent(): Promise<void> {
    const existingDraft = await this.draftService.loadDraft(this.recipeId);

    if (existingDraft) {
      const confirmRestore = await this.promptRestoreDraft(existingDraft);
      if (confirmRestore) {
        this.applyDraftToForm(existingDraft);
        return;
      } else {
        await this.draftService.clearDraft(this.recipeId);
      }
    }

    if (this.isEditMode && this.recipeId) {
      const recipe = await this.recipeRepo.findById(this.recipeId);
      if (recipe) {
        this.form.patchValue({
          titel: recipe.titel,
          portionen: recipe.portionen,
          zeitVorbereitung: recipe.zeitVorbereitung,
          zeitKochen: recipe.zeitKochen,
          kategorie: recipe.kategorie,
          notizen: recipe.notizen,
          fotoPath: recipe.fotoPath,
        });

        if (recipe.fotoPath) {
          this.photoDisplayUrl = await this.photoService.getPhotoDisplayUrl(recipe.fotoPath);
        }

        this.zutatenArray.clear();
        for (const ing of recipe.zutaten) {
          this.addIngredient({ menge: ing.menge, einheit: ing.einheit, name: ing.name });
        }

        this.schritteArray.clear();
        for (const step of recipe.schritte) {
          this.addStep({ text: step.text });
        }
        return;
      }
    }

    // Standard-Initialisierung für neues Rezept (oder wenn kein Rezept gefunden)
    this.zutatenArray.clear();
    this.addIngredient();
    this.schritteArray.clear();
    this.addStep();
  }

  private async promptRestoreDraft(draft: RecipeDraft): Promise<boolean> {
    return new Promise(async (resolve) => {
      const alert = await this.alertCtrl.create({
        header: 'Entwurf gefunden',
        message: `Es gibt einen gespeicherten Entwurf für "${draft.titel || 'dieses Rezept'}". Möchtest du ihn wiederherstellen?`,
        backdropDismiss: false,
        buttons: [
          {
            text: 'Verwerfen',
            role: 'cancel',
            handler: () => resolve(false),
          },
          {
            text: 'Wiederherstellen',
            handler: () => resolve(true),
          },
        ],
      });
      await alert.present();
    });
  }

  private applyDraftToForm(draft: RecipeDraft): void {
    this.form.patchValue({
      titel: draft.titel,
      portionen: draft.portionen,
      zeitVorbereitung: draft.zeitVorbereitung,
      zeitKochen: draft.zeitKochen,
      kategorie: draft.kategorie,
      notizen: draft.notizen,
      fotoPath: draft.fotoPath,
    });

    this.photoDisplayUrl = draft.fotoDisplayUrl || null;
    if (draft.fotoPath && !this.photoDisplayUrl) {
      this.photoService.getPhotoDisplayUrl(draft.fotoPath).then((url) => {
        this.photoDisplayUrl = url;
      });
    }

    this.zutatenArray.clear();
    if (draft.zutaten && draft.zutaten.length > 0) {
      for (const ing of draft.zutaten) {
        this.addIngredient(ing);
      }
    } else {
      this.addIngredient();
    }

    this.schritteArray.clear();
    if (draft.schritte && draft.schritte.length > 0) {
      for (const s of draft.schritte) {
        this.addStep(s);
      }
    } else {
      this.addStep();
    }
  }

  private setupAutoSave(): void {
    this.form.valueChanges.pipe(debounceTime(1200), takeUntil(this.destroy$)).subscribe(() => {
      if (this.form.dirty) {
        this.saveDraft();
      }
    });
  }

  private async saveDraft(): Promise<void> {
    const raw = this.form.getRawValue();
    const draft: RecipeDraft = {
      recipeId: this.recipeId,
      titel: raw.titel,
      portionen: raw.portionen ?? 4,
      zeitVorbereitung: raw.zeitVorbereitung ? Number(raw.zeitVorbereitung) : null,
      zeitKochen: raw.zeitKochen ? Number(raw.zeitKochen) : null,
      kategorie: raw.kategorie ?? null,
      notizen: raw.notizen || null,
      fotoPath: raw.fotoPath || null,
      fotoDisplayUrl: this.photoDisplayUrl,
      zutaten: raw.zutaten.map((z: { menge: unknown; einheit: unknown; name: unknown }) => ({
        menge: z.menge ? Number(z.menge) : null,
        einheit: String(z.einheit || ''),
        name: String(z.name || ''),
      })),
      schritte: raw.schritte.map((s: { text: unknown }) => ({
        text: String(s.text || ''),
      })),
      updatedAt: new Date().toISOString(),
    };

    await this.draftService.saveDraft(draft);
    this.draftSavedAt = new Date();
  }

  // --- ZUTATEN ---

  addIngredient(data?: { menge: number | null; einheit: string; name: string }): void {
    const group = this.fb.group({
      menge: [data?.menge ?? null, [Validators.min(0)]],
      einheit: [data?.einheit ?? 'g'],
      name: [data?.name ?? '', [Validators.required]],
    });
    this.zutatenArray.push(group);
  }

  removeIngredient(index: number): void {
    if (this.zutatenControls.length > 1) {
      this.zutatenArray.removeAt(index);
      this.form.markAsDirty();
    }
  }

  setUnit(group: FormGroup, unit: string): void {
    group.patchValue({ einheit: unit });
    this.form.markAsDirty();
  }

  onDropIngredient(event: CdkDragDrop<FormGroup[]>): void {
    moveItemInArray(this.zutatenArray.controls, event.previousIndex, event.currentIndex);
    this.zutatenArray.updateValueAndValidity();
    this.form.markAsDirty();
  }

  // --- SCHRITTE ---

  addStep(data?: { text: string }): void {
    const group = this.fb.group({
      text: [data?.text ?? '', [Validators.required]],
    });
    this.schritteArray.push(group);
  }

  removeStep(index: number): void {
    if (this.schritteControls.length > 1) {
      this.schritteArray.removeAt(index);
      this.form.markAsDirty();
    }
  }

  onDropStep(event: CdkDragDrop<FormGroup[]>): void {
    moveItemInArray(this.schritteArray.controls, event.previousIndex, event.currentIndex);
    this.schritteArray.updateValueAndValidity();
    this.form.markAsDirty();
  }

  // --- FOTO ---

  async onPickPhoto(): Promise<void> {
    const result = await this.photoService.pickOrTakePhoto();
    if (result) {
      this.form.patchValue({ fotoPath: result.filePath });
      this.photoDisplayUrl = result.displayUrl;
      this.form.markAsDirty();
      await this.saveDraft();
    }
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const result = await this.photoService.saveDataUrl(dataUrl);
      this.form.patchValue({ fotoPath: result.filePath });
      this.photoDisplayUrl = result.displayUrl;
      this.form.markAsDirty();
      await this.saveDraft();
    };
    reader.readAsDataURL(file);
  }

  async onRemovePhoto(): Promise<void> {
    const currentPath = this.form.get('fotoPath')?.value;
    if (currentPath) {
      await this.photoService.deletePhoto(currentPath);
    }
    this.form.patchValue({ fotoPath: null });
    this.photoDisplayUrl = null;
    this.form.markAsDirty();
    await this.saveDraft();
  }

  // --- SPEICHERN & ABBRECHEN ---

  async onSave(): Promise<void> {
    const raw = this.form.getRawValue();
    const titel = (raw.titel || '').trim();

    if (!titel) {
      await this.showToast('Bitte gib einen Titel für das Rezept ein.');
      return;
    }

    if (!raw.portionen || raw.portionen < 1) {
      await this.showToast('Die Anzahl der Portionen muss mindestens 1 betragen.');
      return;
    }

    // Zutaten filtern: nur jene mit Name
    const validIngredients: IngredientCreate[] = raw.zutaten
      .filter((z: { name: string }) => z.name && z.name.trim().length > 0)
      .map((z: { menge: unknown; einheit: string; name: string }, idx: number) => ({
        reihenfolge: idx + 1,
        menge: z.menge !== null && z.menge !== undefined && z.menge !== '' ? Number(z.menge) : null,
        einheit: (z.einheit || '').trim(),
        name: z.name.trim(),
      }));

    if (validIngredients.length === 0) {
      await this.showToast('Bitte gib mindestens eine Zutat an.');
      return;
    }

    // Schritte filtern: nur jene mit Text
    const validSteps: StepCreate[] = raw.schritte
      .filter((s: { text: string }) => s.text && s.text.trim().length > 0)
      .map((s: { text: string }, idx: number) => ({
        reihenfolge: idx + 1,
        text: s.text.trim(),
      }));

    if (validSteps.length === 0) {
      await this.showToast('Bitte gib mindestens einen Zubereitungsschritt an.');
      return;
    }

    // Saison und KH-Tag automatisch berechnen
    const saisonMonate = this.seasonService.calculateSaisonMonate(validIngredients);
    const khTag = this.khService.calculateKhTag(validIngredients);

    const baseData = {
      titel,
      portionen: Number(raw.portionen),
      zeitVorbereitung:
        raw.zeitVorbereitung !== null && raw.zeitVorbereitung !== ''
          ? Number(raw.zeitVorbereitung)
          : null,
      zeitKochen: raw.zeitKochen !== null && raw.zeitKochen !== '' ? Number(raw.zeitKochen) : null,
      kategorie: raw.kategorie || null,
      notizen: raw.notizen?.trim() || null,
      fotoPath: raw.fotoPath || null,
      zutaten: validIngredients,
      schritte: validSteps,
    };

    try {
      if (this.isEditMode && this.recipeId) {
        const updatePayload: RecipeUpdate = {
          id: this.recipeId,
          ...baseData,
        };
        await this.recipeRepo.update(updatePayload, saisonMonate, khTag);
      } else {
        const createPayload: RecipeCreate = baseData;
        await this.recipeRepo.create(createPayload, saisonMonate, khTag);
      }

      await this.draftService.clearDraft(this.recipeId);
      this.form.markAsPristine();

      await this.showToast('Rezept erfolgreich gespeichert!', 'success');
      await this.navCtrl.navigateBack('/home');
    } catch (err) {
      console.error('Fehler beim Speichern des Rezepts:', err);
      await this.showToast('Fehler beim Speichern des Rezepts.', 'danger');
    }
  }

  async onCancel(): Promise<void> {
    if (!this.form.dirty) {
      await this.navCtrl.navigateBack('/home');
      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'Änderungen verwerfen?',
      message:
        'Du hast ungespeicherte Änderungen. Möchtest du den Entwurf behalten oder verwerfen?',
      buttons: [
        {
          text: 'Weiter bearbeiten',
          role: 'cancel',
        },
        {
          text: 'Entwurf verwerfen',
          role: 'destructive',
          handler: async () => {
            await this.draftService.clearDraft(this.recipeId);
            await this.navCtrl.navigateBack('/home');
          },
        },
        {
          text: 'Als Entwurf behalten',
          handler: async () => {
            await this.saveDraft();
            await this.navCtrl.navigateBack('/home');
          },
        },
      ],
    });

    await alert.present();
  }

  private async showToast(
    message: string,
    color: 'primary' | 'success' | 'danger' = 'primary',
  ): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      position: 'bottom',
      color,
    });
    await toast.present();
  }
}
