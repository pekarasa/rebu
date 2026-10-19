import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ModalController, ToastController } from '@ionic/angular';
import { SettingsPage } from './settings.page';
import { RecipeRepository } from '../../core/recipe.repository';
import { ShareService } from '../../core/share.service';
import { ImportedRecipeDraft, ImportService } from '../../core/import.service';
import { Recipe } from '../../models/recipe.model';
import { Kategorie } from '../../models/kategorie.enum';
import { ImportModalComponent } from '../import/import-modal.component';

describe('SettingsPage', () => {
  let component: SettingsPage;
  let fixture: ComponentFixture<SettingsPage>;

  let mockRecipeRepo: {
    findAll: ReturnType<typeof vi.fn>;
  };
  let mockShareService: {
    shareBatchJsonFile: ReturnType<typeof vi.fn>;
  };
  let mockImportService: {
    parseFile: ReturnType<typeof vi.fn>;
  };
  let mockModalCtrl: {
    create: ReturnType<typeof vi.fn>;
  };
  let mockToastCtrl: {
    create: ReturnType<typeof vi.fn>;
  };

  const sampleRecipe: Recipe = {
    id: 'test-uuid-1',
    titel: 'Gemüsesuppe',
    portionen: 4,
    zeitVorbereitung: 10,
    zeitKochen: 20,
    kategorie: Kategorie.Suppe,
    notizen: 'Einfach und gut.',
    fotoPath: 'recipe-photos/suppe.jpg',
    erstelltAm: '2026-10-19T10:00:00Z',
    geaendertAm: '2026-10-19T10:00:00Z',
    saisonMonate: [1, 2, 3],
    khTag: null,
    zutaten: [
      {
        id: 'z1',
        rezeptId: 'test-uuid-1',
        reihenfolge: 1,
        menge: 2,
        einheit: 'Stück',
        name: 'Karotten',
      },
    ],
    schritte: [{ id: 's1', rezeptId: 'test-uuid-1', reihenfolge: 1, text: 'Kochen' }],
  };

  beforeEach(async () => {
    mockRecipeRepo = {
      findAll: vi.fn().mockResolvedValue([sampleRecipe]),
    };

    mockShareService = {
      shareBatchJsonFile: vi.fn().mockResolvedValue({ success: true, method: 'native' }),
    };

    mockImportService = {
      parseFile: vi.fn().mockResolvedValue({
        success: true,
        recipes: [
          {
            id: 'imported-1',
            titel: 'Importiertes Rezept',
            portionen: 2,
            zutaten: [],
            schritte: [],
          } as unknown as ImportedRecipeDraft,
        ],
      }),
    };

    mockModalCtrl = {
      create: vi.fn().mockResolvedValue({
        present: vi.fn().mockResolvedValue(undefined),
        onWillDismiss: vi.fn().mockResolvedValue({ data: { imported: true, count: 1 } }),
      }),
    };

    mockToastCtrl = {
      create: vi.fn().mockResolvedValue({
        present: vi.fn().mockResolvedValue(undefined),
      }),
    };

    await TestBed.configureTestingModule({
      imports: [SettingsPage],
      providers: [
        { provide: RecipeRepository, useValue: mockRecipeRepo },
        { provide: ShareService, useValue: mockShareService },
        { provide: ImportService, useValue: mockImportService },
        { provide: ModalController, useValue: mockModalCtrl },
        { provide: ToastController, useValue: mockToastCtrl },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsPage);
    component = fixture.componentInstance;
  });

  it('erzeugt die Komponente und lädt Rezept-Statistiken', async () => {
    fixture.detectChanges();
    await component.loadStats();
    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(mockRecipeRepo.findAll).toHaveBeenCalled();
    expect(component.recipeCount).toBe(1);
    expect(component.photoCount).toBe(1);

    const countEl = fixture.nativeElement.querySelector('[data-testid="stat-recipes-count"]');
    expect(countEl?.textContent?.trim()).toBe('1');
  });

  it('lädt Statistiken bei ionViewWillEnter erneut', async () => {
    mockRecipeRepo.findAll.mockResolvedValueOnce([
      sampleRecipe,
      { ...sampleRecipe, id: 'test-2', fotoPath: null },
    ]);

    await component.ionViewWillEnter();

    expect(component.recipeCount).toBe(2);
    expect(component.photoCount).toBe(1);
  });

  describe('Sammel-Export (exportAllRecipes)', () => {
    it('warnt wenn keine Rezepte vorhanden sind', async () => {
      mockRecipeRepo.findAll.mockResolvedValueOnce([]);

      await component.exportAllRecipes();

      expect(mockShareService.shareBatchJsonFile).not.toHaveBeenCalled();
      expect(mockToastCtrl.create).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Keine Rezepte zum Exportieren vorhanden.' }),
      );
    });

    it('exportiert alle Rezepte erfolgreich über ShareService', async () => {
      mockRecipeRepo.findAll.mockResolvedValueOnce([sampleRecipe]);
      mockShareService.shareBatchJsonFile.mockResolvedValueOnce({
        success: true,
        method: 'native',
      });

      await component.exportAllRecipes();

      expect(mockShareService.shareBatchJsonFile).toHaveBeenCalledWith([sampleRecipe], true);
      expect(mockToastCtrl.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Sammel-Export erfolgreich bereitgestellt!',
          color: 'success',
        }),
      );
    });

    it('zeigt Download-Erfolgsmeldung bei Web-Fallback', async () => {
      mockRecipeRepo.findAll.mockResolvedValueOnce([sampleRecipe]);
      mockShareService.shareBatchJsonFile.mockResolvedValueOnce({
        success: true,
        method: 'download',
      });

      await component.exportAllRecipes();

      expect(mockToastCtrl.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Sammel-Export heruntergeladen!',
          color: 'success',
        }),
      );
    });

    it('zeigt keine Fehlermeldung bei Benutzerabbruch des Teilens', async () => {
      mockRecipeRepo.findAll.mockResolvedValueOnce([sampleRecipe]);
      mockShareService.shareBatchJsonFile.mockResolvedValueOnce({
        success: false,
        error: 'Abgebrochen',
      });

      await component.exportAllRecipes();

      expect(mockToastCtrl.create).not.toHaveBeenCalled();
    });

    it('zeigt Fehlermeldung wenn Export fehlschlägt', async () => {
      mockRecipeRepo.findAll.mockResolvedValueOnce([sampleRecipe]);
      mockShareService.shareBatchJsonFile.mockResolvedValueOnce({
        success: false,
        error: 'Fehler im Filesystem',
      });

      await component.exportAllRecipes();

      expect(mockToastCtrl.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Fehler im Filesystem',
          color: 'danger',
        }),
      );
    });
  });

  describe('Sammel-Import / Datei-Auswahl', () => {
    it('triggert das native Dateieingabefeld', () => {
      const clickSpy = vi.fn();
      component.fileInputRef = {
        nativeElement: {
          click: clickSpy,
          value: 'test.json',
        } as unknown as HTMLInputElement,
      };

      component.triggerFileInput();

      expect(clickSpy).toHaveBeenCalled();
      expect(component.fileInputRef.nativeElement.value).toBe('');
    });

    it('liest gewählte Datei ein und öffnet ImportModalComponent', async () => {
      const mockFile = new File(['{"app":"rebu"}'], 'recipes.json', { type: 'application/json' });
      const event = {
        target: {
          files: [mockFile],
          value: 'recipes.json',
        },
      } as unknown as Event;

      const loadStatsSpy = vi.spyOn(component, 'loadStats');

      await component.onFileSelected(event);

      expect(mockImportService.parseFile).toHaveBeenCalledWith(mockFile);
      expect(mockModalCtrl.create).toHaveBeenCalledWith(
        expect.objectContaining({
          component: ImportModalComponent,
        }),
      );
      expect(loadStatsSpy).toHaveBeenCalled();
    });

    it('zeigt Toast bei ungültiger Datei', async () => {
      mockImportService.parseFile.mockResolvedValueOnce({
        success: false,
        error: 'Ungültiges JSON-Format',
        recipes: [],
      });

      const mockFile = new File(['invalid'], 'recipes.json', { type: 'application/json' });
      const event = {
        target: {
          files: [mockFile],
          value: '',
        },
      } as unknown as Event;

      await component.onFileSelected(event);

      expect(mockModalCtrl.create).not.toHaveBeenCalled();
      expect(mockToastCtrl.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Ungültiges JSON-Format',
          color: 'danger',
        }),
      );
    });
  });
});
