import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { AlertController, NavController, ToastController } from '@ionic/angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DraftService, RecipeDraft } from '../../core/draft.service';
import { KhService } from '../../core/kh.service';
import { PhotoService } from '../../core/photo.service';
import { RecipeRepository } from '../../core/recipe.repository';
import { SeasonService } from '../../core/season.service';
import { Kategorie } from '../../models/kategorie.enum';
import { RecipeEditPage } from './recipe-edit.page';

describe('RecipeEditPage', () => {
  let component: RecipeEditPage;
  let fixture: ComponentFixture<RecipeEditPage>;

  let mockRecipeRepo: {
    findById: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let mockDraftService: {
    loadDraft: ReturnType<typeof vi.fn>;
    saveDraft: ReturnType<typeof vi.fn>;
    clearDraft: ReturnType<typeof vi.fn>;
  };
  let mockPhotoService: {
    pickOrTakePhoto: ReturnType<typeof vi.fn>;
    saveDataUrl: ReturnType<typeof vi.fn>;
    getPhotoDisplayUrl: ReturnType<typeof vi.fn>;
    deletePhoto: ReturnType<typeof vi.fn>;
  };
  let mockSeasonService: {
    calculateSaisonMonate: ReturnType<typeof vi.fn>;
  };
  let mockKhService: {
    calculateKhTag: ReturnType<typeof vi.fn>;
  };
  let mockNavCtrl: {
    navigateBack: ReturnType<typeof vi.fn>;
  };
  let mockAlertCtrl: {
    create: ReturnType<typeof vi.fn>;
  };
  let mockToastCtrl: {
    create: ReturnType<typeof vi.fn>;
  };

  const createAlertMock = (buttonIndexToClick = 0) => {
    return {
      present: vi.fn().mockImplementation(async function (this: unknown) {
        return Promise.resolve();
      }),
      dismiss: vi.fn(),
    };
  };

  const createToastMock = () => {
    return {
      present: vi.fn().mockResolvedValue(undefined),
      dismiss: vi.fn(),
    };
  };

  beforeEach(async () => {
    mockRecipeRepo = {
      findById: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'new-123' }),
      update: vi.fn().mockResolvedValue({ id: 'edit-123' }),
    };

    mockDraftService = {
      loadDraft: vi.fn().mockResolvedValue(null),
      saveDraft: vi.fn().mockResolvedValue(undefined),
      clearDraft: vi.fn().mockResolvedValue(undefined),
    };

    mockPhotoService = {
      pickOrTakePhoto: vi.fn().mockResolvedValue({
        filePath: 'recipe-photos/photo1.jpg',
        displayUrl: 'data:image/jpeg;base64,preview',
      }),
      saveDataUrl: vi.fn().mockResolvedValue({
        filePath: 'recipe-photos/photo2.jpg',
        displayUrl: 'data:image/jpeg;base64,preview2',
      }),
      getPhotoDisplayUrl: vi.fn().mockResolvedValue('data:image/jpeg;base64,existing'),
      deletePhoto: vi.fn().mockResolvedValue(undefined),
    };

    mockSeasonService = {
      calculateSaisonMonate: vi.fn().mockReturnValue([5, 6]),
    };

    mockKhService = {
      calculateKhTag: vi.fn().mockReturnValue('Pasta'),
    };

    mockNavCtrl = {
      navigateBack: vi.fn().mockResolvedValue(true),
    };

    mockAlertCtrl = {
      create: vi.fn().mockResolvedValue(createAlertMock()),
    };

    mockToastCtrl = {
      create: vi.fn().mockResolvedValue(createToastMock()),
    };

    await TestBed.configureTestingModule({
      imports: [RecipeEditPage],
      providers: [
        { provide: RecipeRepository, useValue: mockRecipeRepo },
        { provide: DraftService, useValue: mockDraftService },
        { provide: PhotoService, useValue: mockPhotoService },
        { provide: SeasonService, useValue: mockSeasonService },
        { provide: KhService, useValue: mockKhService },
        { provide: NavController, useValue: mockNavCtrl },
        { provide: AlertController, useValue: mockAlertCtrl },
        { provide: ToastController, useValue: mockToastCtrl },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: vi.fn().mockReturnValue(null),
              },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RecipeEditPage);
    component = fixture.componentInstance;
  });

  it('wird erzeugt und initialisiert mit Standardwerten für neues Rezept', async () => {
    await component.ngOnInit();
    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(component.isEditMode).toBe(false);
    expect(component.form.get('portionen')?.value).toBe(4);
    expect(component.zutatenControls.length).toBe(1);
    expect(component.schritteControls.length).toBe(1);
  });

  it('erlaubt Hinzufügen und Entfernen von Zutaten', async () => {
    await component.ngOnInit();

    expect(component.zutatenControls.length).toBe(1);
    component.addIngredient({ menge: 100, einheit: 'g', name: 'Zucker' });
    expect(component.zutatenControls.length).toBe(2);

    component.removeIngredient(0);
    expect(component.zutatenControls.length).toBe(1);
    expect(component.zutatenControls[0].get('name')?.value).toBe('Zucker');

    // Mindestens 1 Zutat bleibt immer
    component.removeIngredient(0);
    expect(component.zutatenControls.length).toBe(1);
  });

  it('erlaubt Hinzufügen und Entfernen von Zubereitungsschritten', async () => {
    await component.ngOnInit();

    expect(component.schritteControls.length).toBe(1);
    component.addStep({ text: 'Wasser kochen' });
    expect(component.schritteControls.length).toBe(2);

    component.removeStep(0);
    expect(component.schritteControls.length).toBe(1);
    expect(component.schritteControls[0].get('text')?.value).toBe('Wasser kochen');

    // Mindestens 1 Schritt bleibt immer
    component.removeStep(0);
    expect(component.schritteControls.length).toBe(1);
  });

  it('setUnit setzt Einheit auf dem FormGroup', async () => {
    await component.ngOnInit();
    const group = component.zutatenControls[0];
    component.setUnit(group, 'EL');
    expect(group.get('einheit')?.value).toBe('EL');
    expect(component.form.dirty).toBe(true);
  });

  it('onDropIngredient und onDropStep sortieren Elemente um', async () => {
    await component.ngOnInit();
    component.addIngredient({ menge: 200, einheit: 'ml', name: 'Milch' });

    component.zutatenControls[0].patchValue({ name: 'Mehl' });
    expect(component.zutatenControls[0].get('name')?.value).toBe('Mehl');
    expect(component.zutatenControls[1].get('name')?.value).toBe('Milch');

    component.onDropIngredient({
      previousIndex: 0,
      currentIndex: 1,
    } as any);

    expect(component.zutatenControls[0].get('name')?.value).toBe('Milch');
    expect(component.zutatenControls[1].get('name')?.value).toBe('Mehl');
  });

  it('nimmt Foto auf und speichert Pfad im Formular', async () => {
    await component.ngOnInit();
    await component.onPickPhoto();

    expect(mockPhotoService.pickOrTakePhoto).toHaveBeenCalled();
    expect(component.form.get('fotoPath')?.value).toBe('recipe-photos/photo1.jpg');
    expect(component.photoDisplayUrl).toBe('data:image/jpeg;base64,preview');
    expect(mockDraftService.saveDraft).toHaveBeenCalled();
  });

  it('entfernt Foto und ruft deletePhoto auf', async () => {
    await component.ngOnInit();
    component.form.patchValue({ fotoPath: 'recipe-photos/photo1.jpg' });
    component.photoDisplayUrl = 'data:preview';

    await component.onRemovePhoto();

    expect(mockPhotoService.deletePhoto).toHaveBeenCalledWith('recipe-photos/photo1.jpg');
    expect(component.form.get('fotoPath')?.value).toBeNull();
    expect(component.photoDisplayUrl).toBeNull();
  });

  it('validiert Pflichtfelder beim Speichern (Titel fehlt)', async () => {
    await component.ngOnInit();
    component.form.patchValue({ titel: '' });

    await component.onSave();

    expect(mockToastCtrl.create).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Titel') }),
    );
    expect(mockRecipeRepo.create).not.toHaveBeenCalled();
  });

  it('validiert Pflichtfelder beim Speichern (Zutat fehlt)', async () => {
    await component.ngOnInit();
    component.form.patchValue({ titel: 'Gutes Essen' });
    component.zutatenControls[0].patchValue({ name: '' });

    await component.onSave();

    expect(mockToastCtrl.create).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Zutat') }),
    );
    expect(mockRecipeRepo.create).not.toHaveBeenCalled();
  });

  it('validiert Pflichtfelder beim Speichern (Schritt fehlt)', async () => {
    await component.ngOnInit();
    component.form.patchValue({ titel: 'Gutes Essen' });
    component.zutatenControls[0].patchValue({ name: 'Tomate' });
    component.schritteControls[0].patchValue({ text: '' });

    await component.onSave();

    expect(mockToastCtrl.create).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Zubereitungsschritt') }),
    );
    expect(mockRecipeRepo.create).not.toHaveBeenCalled();
  });

  it('speichert neues Rezept erfolgreich und löscht Entwurf', async () => {
    await component.ngOnInit();
    component.form.patchValue({
      titel: 'Pasta al Pomodoro',
      portionen: 2,
      kategorie: Kategorie.Hauptgericht,
      zeitVorbereitung: 10,
      zeitKochen: 20,
    });
    component.zutatenControls[0].patchValue({ menge: 500, einheit: 'g', name: 'Spaghetti' });
    component.schritteControls[0].patchValue({ text: 'Nudeln kochen' });

    await component.onSave();

    expect(mockSeasonService.calculateSaisonMonate).toHaveBeenCalled();
    expect(mockKhService.calculateKhTag).toHaveBeenCalled();
    expect(mockRecipeRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        titel: 'Pasta al Pomodoro',
        portionen: 2,
        kategorie: Kategorie.Hauptgericht,
        zutaten: [expect.objectContaining({ name: 'Spaghetti', menge: 500, einheit: 'g' })],
        schritte: [expect.objectContaining({ text: 'Nudeln kochen' })],
      }),
      [5, 6],
      'Pasta',
    );
    expect(mockDraftService.clearDraft).toHaveBeenCalledWith(null);
    expect(mockNavCtrl.navigateBack).toHaveBeenCalledWith('/home');
  });

  it('stellt gespeicherten Entwurf wieder her wenn Nutzer bestätigt', async () => {
    const draft: RecipeDraft = {
      recipeId: null,
      titel: 'Entwurf Rezept',
      portionen: 3,
      zeitVorbereitung: 5,
      zeitKochen: 10,
      kategorie: Kategorie.Dessert,
      notizen: 'Kalt stellen',
      fotoPath: null,
      fotoDisplayUrl: null,
      zutaten: [{ menge: 150, einheit: 'g', name: 'Schokolade' }],
      schritte: [{ text: 'Schmelzen' }],
      updatedAt: new Date().toISOString(),
    };

    mockDraftService.loadDraft.mockResolvedValue(draft);

    mockAlertCtrl.create.mockImplementation(async (opts: any) => {
      return {
        present: vi.fn().mockImplementation(async () => {
          // Klickt auf "Wiederherstellen"
          const btn = opts.buttons.find((b: any) => b.text === 'Wiederherstellen');
          if (btn && btn.handler) btn.handler();
        }),
      };
    });

    await component.ngOnInit();

    expect(component.form.get('titel')?.value).toBe('Entwurf Rezept');
    expect(component.form.get('portionen')?.value).toBe(3);
    expect(component.zutatenControls[0].get('name')?.value).toBe('Schokolade');
    expect(component.schritteControls[0].get('text')?.value).toBe('Schmelzen');
  });

  it('lädt bestehendes Rezept im Bearbeitungsmodus', async () => {
    TestBed.resetTestingModule();

    mockRecipeRepo.findById.mockResolvedValue({
      id: 'existing-456',
      titel: 'Bestehende Suppe',
      portionen: 6,
      zeitVorbereitung: 15,
      zeitKochen: 45,
      kategorie: Kategorie.Suppe,
      notizen: 'Heiß servieren',
      fotoPath: 'recipe-photos/soup.jpg',
      erstelltAm: '2026-01-01',
      geaendertAm: '2026-01-01',
      saisonMonate: [1, 2, 12],
      khTag: 'Kartoffeln',
      zutaten: [
        {
          id: 'z1',
          rezeptId: 'existing-456',
          reihenfolge: 1,
          menge: 3,
          einheit: 'Stück',
          name: 'Karotten',
        },
      ],
      schritte: [{ id: 's1', rezeptId: 'existing-456', reihenfolge: 1, text: 'Gemüse schneiden' }],
    });

    await TestBed.configureTestingModule({
      imports: [RecipeEditPage],
      providers: [
        { provide: RecipeRepository, useValue: mockRecipeRepo },
        { provide: DraftService, useValue: mockDraftService },
        { provide: PhotoService, useValue: mockPhotoService },
        { provide: SeasonService, useValue: mockSeasonService },
        { provide: KhService, useValue: mockKhService },
        { provide: NavController, useValue: mockNavCtrl },
        { provide: AlertController, useValue: mockAlertCtrl },
        { provide: ToastController, useValue: mockToastCtrl },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: vi.fn().mockReturnValue('existing-456'),
              },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RecipeEditPage);
    component = fixture.componentInstance;
    await component.ngOnInit();

    expect(component.isEditMode).toBe(true);
    expect(component.recipeId).toBe('existing-456');
    expect(component.form.get('titel')?.value).toBe('Bestehende Suppe');
    expect(component.zutatenControls[0].get('name')?.value).toBe('Karotten');
    expect(component.schritteControls[0].get('text')?.value).toBe('Gemüse schneiden');

    // Aktualisieren
    component.form.patchValue({ titel: 'Aktualisierte Suppe' });
    await component.onSave();

    expect(mockRecipeRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'existing-456',
        titel: 'Aktualisierte Suppe',
      }),
      [5, 6],
      'Pasta',
    );
    expect(mockDraftService.clearDraft).toHaveBeenCalledWith('existing-456');
  });

  it('onCancel navigiert direkt zurück wenn Formular nicht dirty ist', async () => {
    await component.ngOnInit();
    expect(component.form.dirty).toBe(false);

    await component.onCancel();

    expect(mockNavCtrl.navigateBack).toHaveBeenCalledWith('/home');
    expect(mockAlertCtrl.create).not.toHaveBeenCalled();
  });

  it('onCancel zeigt Bestätigungsdialog wenn Formular dirty ist', async () => {
    await component.ngOnInit();
    component.form.markAsDirty();

    await component.onCancel();

    expect(mockAlertCtrl.create).toHaveBeenCalledWith(
      expect.objectContaining({ header: 'Änderungen verwerfen?' }),
    );
  });
});
