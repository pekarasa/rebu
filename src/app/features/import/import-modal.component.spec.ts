import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AlertController, ModalController, ToastController } from '@ionic/angular';
import { ImportModalComponent } from './import-modal.component';
import { ImportedRecipeDraft, ImportService } from '../../core/import.service';
import { Kategorie } from '../../models/kategorie.enum';

describe('ImportModalComponent', () => {
  let component: ImportModalComponent;
  let fixture: ComponentFixture<ImportModalComponent>;

  let mockModalCtrl: {
    dismiss: ReturnType<typeof vi.fn>;
  };
  let mockToastCtrl: {
    create: ReturnType<typeof vi.fn>;
  };
  let mockAlertCtrl: {
    create: ReturnType<typeof vi.fn>;
  };
  let mockImportService: {
    checkUuidCollision: ReturnType<typeof vi.fn>;
    importRecipe: ReturnType<typeof vi.fn>;
  };

  const sampleDraft: ImportedRecipeDraft = {
    id: 'test-recipe-uuid-1',
    titel: 'Sommerlicher Tomatensalat',
    portionen: 2,
    zeitVorbereitung: 10,
    zeitKochen: null,
    kategorie: Kategorie.Salat,
    notizen: 'Mit Basilikum verfeinern.',
    fotoBase64: 'data:image/jpeg;base64,mockfoto',
    saisonMonate: [6, 7, 8],
    khTag: null,
    zutaten: [
      { reihenfolge: 1, menge: 500, einheit: 'g', name: 'Tomaten' },
      { reihenfolge: 2, menge: 1, einheit: 'Bund', name: 'Basilikum' },
    ],
    schritte: [
      { reihenfolge: 1, text: 'Tomaten waschen und schneiden.' },
      { reihenfolge: 2, text: 'Basilikum hacken und untermischen.' },
    ],
  };

  beforeEach(async () => {
    mockModalCtrl = {
      dismiss: vi.fn().mockResolvedValue(true),
    };

    mockToastCtrl = {
      create: vi.fn().mockResolvedValue({
        present: vi.fn().mockResolvedValue(undefined),
      }),
    };

    mockAlertCtrl = {
      create: vi.fn().mockResolvedValue({
        present: vi.fn().mockResolvedValue(undefined),
      }),
    };

    mockImportService = {
      checkUuidCollision: vi.fn().mockResolvedValue(false),
      importRecipe: vi.fn().mockResolvedValue({
        success: true,
        recipe: { ...sampleDraft, erstelltAm: '2026-10-19', geaendertAm: '2026-10-19' },
        action: 'created',
      }),
    };

    await TestBed.configureTestingModule({
      imports: [ImportModalComponent],
      providers: [
        { provide: ModalController, useValue: mockModalCtrl },
        { provide: ToastController, useValue: mockToastCtrl },
        { provide: AlertController, useValue: mockAlertCtrl },
        { provide: ImportService, useValue: mockImportService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ImportModalComponent);
    component = fixture.componentInstance;
    component.drafts = [sampleDraft];
  });

  it('erzeugt die Komponente und zeigt Vorschau-Daten an', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component).toBeTruthy();
    expect(component.currentDraft?.titel).toBe('Sommerlicher Tomatensalat');
    expect(component.saisonLabel).toBe('Sommer');

    const titleEl = fixture.nativeElement.querySelector('[data-testid="recipe-preview-title"]');
    expect(titleEl?.textContent).toContain('Sommerlicher Tomatensalat');
  });

  it('erkennt keine Kollision wenn ID neu ist', async () => {
    mockImportService.checkUuidCollision.mockResolvedValueOnce(false);

    await component.ngOnInit();
    fixture.detectChanges();

    expect(component.hasCollision).toBe(false);
    const collisionBanner = fixture.nativeElement.querySelector('[data-testid="collision-banner"]');
    expect(collisionBanner).toBeNull();

    const saveBtn = fixture.nativeElement.querySelector('[data-testid="btn-save-import"]');
    expect(saveBtn).not.toBeNull();
  });

  it('erkennt UUID-Kollision und zeigt Warnbanner & Kollisions-Aktionen an', async () => {
    mockImportService.checkUuidCollision.mockResolvedValue(true);

    await component.ngOnInit();
    fixture.detectChanges();

    expect(component.hasCollision).toBe(true);
    const collisionBanner = fixture.nativeElement.querySelector('[data-testid="collision-banner"]');
    expect(collisionBanner).not.toBeNull();

    const overwriteBtn = fixture.nativeElement.querySelector('[data-testid="btn-overwrite"]');
    const copyBtn = fixture.nativeElement.querySelector('[data-testid="btn-save-as-copy"]');
    expect(overwriteBtn).not.toBeNull();
    expect(copyBtn).not.toBeNull();
  });

  it('speichert neues Rezept bei onSave() und schließt Modal mit Erfolg', async () => {
    component.hasCollision = false;

    await component.onSave();

    expect(mockImportService.importRecipe).toHaveBeenCalledWith(sampleDraft, {
      collisionResolution: undefined,
    });
    expect(mockToastCtrl.create).toHaveBeenCalled();
    expect(mockModalCtrl.dismiss).toHaveBeenCalledWith({
      imported: true,
      recipeId: sampleDraft.id,
      count: 1,
    });
  });

  it('überschreibt bestehendes Rezept bei onSaveWithResolution("overwrite")', async () => {
    component.hasCollision = true;
    mockImportService.importRecipe.mockResolvedValueOnce({
      success: true,
      recipe: { ...sampleDraft, erstelltAm: '2026-10-19', geaendertAm: '2026-10-19' },
      action: 'overwritten',
    });

    await component.onSaveWithResolution('overwrite');

    expect(mockImportService.importRecipe).toHaveBeenCalledWith(sampleDraft, {
      collisionResolution: 'overwrite',
    });
    expect(mockModalCtrl.dismiss).toHaveBeenCalledWith({
      imported: true,
      recipeId: sampleDraft.id,
      count: 1,
    });
  });

  it('speichert Rezept als Kopie bei onSaveWithResolution("copy")', async () => {
    component.hasCollision = true;
    mockImportService.importRecipe.mockResolvedValueOnce({
      success: true,
      recipe: {
        ...sampleDraft,
        id: 'copied-new-uuid',
        erstelltAm: '2026-10-19',
        geaendertAm: '2026-10-19',
      },
      action: 'copied',
    });

    await component.onSaveWithResolution('copy');

    expect(mockImportService.importRecipe).toHaveBeenCalledWith(sampleDraft, {
      collisionResolution: 'copy',
    });
    expect(mockModalCtrl.dismiss).toHaveBeenCalledWith({
      imported: true,
      recipeId: 'copied-new-uuid',
      count: 1,
    });
  });

  it('schließt das Modal bei onDiscard() mit imported = false', async () => {
    await component.onDiscard();

    expect(mockModalCtrl.dismiss).toHaveBeenCalledWith({ imported: false });
  });

  it('unterstützt Mehrfachauswahl bei mehreren Entwürfen (Sammel-Import)', async () => {
    const secondDraft = { ...sampleDraft, id: 'draft-2', titel: 'Zweites Rezept' };
    component.drafts = [sampleDraft, secondDraft];

    await component.ngOnInit();
    fixture.detectChanges();

    expect(component.isMulti).toBe(true);
    expect(component.selectedIndices.size).toBe(2);

    // Auswahl umschalten
    component.toggleSelection(0);
    expect(component.selectedIndices.has(0)).toBe(false);
    expect(component.selectedIndices.size).toBe(1);

    await component.onImportSelected();
    expect(mockImportService.importRecipe).toHaveBeenCalledTimes(1);
    expect(mockModalCtrl.dismiss).toHaveBeenCalledWith({
      imported: true,
      count: 1,
    });
  });
});
