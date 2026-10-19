import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ActionSheetController, ModalController, ToastController } from '@ionic/angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FilterPreferencesService,
  FilterPreferencesState,
} from '../../core/filter-preferences.service';
import { RecipeRepository } from '../../core/recipe.repository';
import { ImportService } from '../../core/import.service';
import { ImportModalComponent } from '../import/import-modal.component';
import { Kategorie } from '../../models/kategorie.enum';
import { Recipe } from '../../models/recipe.model';
import { getCurrentSaison, getMonateForSaison, Saison } from '../../models/saison.enum';
import { RecipeListPage } from './recipe-list.page';

describe('RecipeListPage', () => {
  let component: RecipeListPage;
  let fixture: ComponentFixture<RecipeListPage>;

  let mockRecipeRepo: {
    findAll: ReturnType<typeof vi.fn>;
  };
  let mockFilterPrefs: {
    getFilterState: ReturnType<typeof vi.fn>;
    saveFilterState: ReturnType<typeof vi.fn>;
    resetFilterState: ReturnType<typeof vi.fn>;
  };
  let mockRouter: {
    navigate: ReturnType<typeof vi.fn>;
  };
  let mockActionSheetCtrl: {
    create: ReturnType<typeof vi.fn>;
  };
  let mockModalCtrl: {
    create: ReturnType<typeof vi.fn>;
  };
  let mockToastCtrl: {
    create: ReturnType<typeof vi.fn>;
  };
  let mockImportService: {
    parseFile: ReturnType<typeof vi.fn>;
  };

  const sampleRecipes: Recipe[] = [
    {
      id: 'r1',
      titel: 'Apfelkuchen',
      portionen: 8,
      zeitVorbereitung: 20,
      zeitKochen: 45,
      kategorie: Kategorie.Dessert,
      notizen: null,
      fotoPath: null,
      erstelltAm: '2026-10-01T10:00:00.000Z',
      geaendertAm: '2026-10-01T10:00:00.000Z',
      saisonMonate: [9, 10, 11],
      khTag: 'Brot / Teig',
      zutaten: [],
      schritte: [],
    },
    {
      id: 'r2',
      titel: 'Spaghetti Carbonara',
      portionen: 4,
      zeitVorbereitung: 10,
      zeitKochen: 15,
      kategorie: Kategorie.Hauptgericht,
      notizen: null,
      fotoPath: null,
      erstelltAm: '2026-10-02T10:00:00.000Z',
      geaendertAm: '2026-10-02T10:00:00.000Z',
      saisonMonate: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      khTag: 'Pasta',
      zutaten: [],
      schritte: [],
    },
  ];

  beforeEach(async () => {
    mockRecipeRepo = {
      findAll: vi.fn().mockResolvedValue([...sampleRecipes]),
    };

    const initialPrefs: FilterPreferencesState = {
      saison: getCurrentSaison(),
      khTag: null,
      sortierung: 'alphabetisch',
    };

    mockFilterPrefs = {
      getFilterState: vi.fn().mockResolvedValue(initialPrefs),
      saveFilterState: vi.fn().mockResolvedValue(undefined),
      resetFilterState: vi.fn().mockResolvedValue(initialPrefs),
    };

    mockActionSheetCtrl = {
      create: vi.fn().mockResolvedValue({
        present: vi.fn().mockResolvedValue(undefined),
      }),
    };

    mockModalCtrl = {
      create: vi.fn().mockResolvedValue({
        present: vi.fn().mockResolvedValue(undefined),
        onWillDismiss: vi.fn().mockResolvedValue({ data: { imported: true } }),
      }),
    };

    mockToastCtrl = {
      create: vi.fn().mockResolvedValue({
        present: vi.fn().mockResolvedValue(undefined),
      }),
    };

    mockImportService = {
      parseFile: vi.fn().mockResolvedValue({
        success: true,
        recipes: [
          {
            id: 'imported-id-1',
            titel: 'Importierte Lasagne',
            portionen: 4,
            zutaten: [],
            schritte: [],
            saisonMonate: [1, 2, 3],
            khTag: 'Pasta',
          },
        ],
      }),
    };

    await TestBed.configureTestingModule({
      imports: [RecipeListPage],
      providers: [
        provideRouter([]),
        { provide: RecipeRepository, useValue: mockRecipeRepo },
        { provide: FilterPreferencesService, useValue: mockFilterPrefs },
        { provide: ActionSheetController, useValue: mockActionSheetCtrl },
        { provide: ModalController, useValue: mockModalCtrl },
        { provide: ToastController, useValue: mockToastCtrl },
        { provide: ImportService, useValue: mockImportService },
      ],
    }).compileComponents();

    const router = TestBed.inject(Router);
    mockRouter = {
      navigate: vi.spyOn(router, 'navigate').mockResolvedValue(true),
    };

    fixture = TestBed.createComponent(RecipeListPage);
    component = fixture.componentInstance;
    await component.ngOnInit();
    fixture.detectChanges();
  });

  it('erzeugt die Seite und lädt initial die Rezepte mit Standard-Filtern', () => {
    expect(component).toBeTruthy();
    expect(mockFilterPrefs.getFilterState).toHaveBeenCalled();
    expect(mockRecipeRepo.findAll).toHaveBeenCalledWith({
      suche: undefined,
      saisonMonate: getMonateForSaison(getCurrentSaison()),
      sortierung: 'alphabetisch',
    });
    expect(component.recipes.length).toBe(2);
  });

  it('führt Volltextsuche bei Texteingabe aus', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    await component.onSearchChange({ detail: { value: 'Apfel' } } as CustomEvent);

    expect(component.searchTerm).toBe('Apfel');
    expect(mockRecipeRepo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        suche: 'Apfel',
      }),
    );
  });

  it('wechselt Saison-Filter und speichert die Auswahl', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    await component.setSaison(Saison.Sommer);

    expect(component.selectedSaison).toBe(Saison.Sommer);
    expect(mockFilterPrefs.saveFilterState).toHaveBeenCalledWith({ saison: Saison.Sommer });
    expect(mockRecipeRepo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        saisonMonate: [6, 7, 8],
      }),
    );
  });

  it('deaktiviert den Saisonfilter (setzt auf alle)', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    await component.clearSaisonFilter();

    expect(component.selectedSaison).toBe('alle');
    expect(component.saisonFilterLabel).toBe('Saison: Alle');
    expect(mockFilterPrefs.saveFilterState).toHaveBeenCalledWith({ saison: 'alle' });
    expect(mockRecipeRepo.findAll).toHaveBeenCalledWith(
      expect.not.objectContaining({
        saisonMonate: expect.anything(),
      }),
    );
  });

  it('erlaubt Kombination von Saisonfilter, Suche und KH-Tag', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    component.searchTerm = 'Auflauf';
    component.selectedSaison = Saison.Herbst;
    component.selectedKhTag = 'Kartoffeln';

    await component.loadRecipes();

    expect(mockRecipeRepo.findAll).toHaveBeenCalledWith({
      suche: 'Auflauf',
      saisonMonate: [9, 10, 11],
      khTag: 'Kartoffeln',
      sortierung: 'alphabetisch',
    });
  });

  it('stoppt Event-Propagation beim Entfernen des Saisonfilters via Chip-Icon', async () => {
    const mockEvent = {
      stopPropagation: vi.fn(),
    } as unknown as Event;

    await component.clearSaisonFilter(mockEvent);

    expect(mockEvent.stopPropagation).toHaveBeenCalled();
    expect(component.selectedSaison).toBe('alle');
  });

  it('setzt und entfernt KH-Filter', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    await component.setKhTag('Pasta');
    expect(component.selectedKhTag).toBe('Pasta');
    expect(mockFilterPrefs.saveFilterState).toHaveBeenCalledWith({ khTag: 'Pasta' });
    expect(mockRecipeRepo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        khTag: 'Pasta',
      }),
    );

    await component.clearKhFilter();
    expect(component.selectedKhTag).toBeNull();
    expect(mockFilterPrefs.saveFilterState).toHaveBeenCalledWith({ khTag: null });
  });

  it('ändert die Sortierreihenfolge', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    await component.setSortOrder('zeitaufwand');
    expect(component.sortOrder).toBe('zeitaufwand');
    expect(mockFilterPrefs.saveFilterState).toHaveBeenCalledWith({ sortierung: 'zeitaufwand' });
    expect(mockRecipeRepo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        sortierung: 'zeitaufwand',
      }),
    );
  });

  it('setzt alle Filter zurück', async () => {
    component.searchTerm = 'Pasta';
    component.selectedSaison = Saison.Winter;
    component.selectedKhTag = 'Pasta';
    component.sortOrder = 'neuste-zuerst';

    await component.resetAllFilters();

    expect(mockFilterPrefs.resetFilterState).toHaveBeenCalled();
    expect(component.searchTerm).toBe('');
    expect(component.selectedKhTag).toBeNull();
    expect(component.sortOrder).toBe('alphabetisch');
  });

  it('navigiert beim Auswählen eines Rezepts zur Detailroute', () => {
    component.onRecipeSelected(sampleRecipes[0]);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/recipes', 'r1']);
  });

  it('öffnet die Auswahl-Dialoge für Saison, KH und Sortierung', async () => {
    await component.openSaisonSelection();
    expect(mockActionSheetCtrl.create).toHaveBeenCalledWith(
      expect.objectContaining({ header: 'Saison-Filter wählen' }),
    );

    await component.openKhSelection();
    expect(mockActionSheetCtrl.create).toHaveBeenCalledWith(
      expect.objectContaining({ header: 'Kohlenhydrat-Filter wählen' }),
    );

    await component.openSortSelection();
    expect(mockActionSheetCtrl.create).toHaveBeenCalledWith(
      expect.objectContaining({ header: 'Sortierung wählen' }),
    );
  });

  it('lädt Rezepte bei ionViewWillEnter erneut', async () => {
    mockRecipeRepo.findAll.mockClear();
    await component.ionViewWillEnter();
    expect(mockRecipeRepo.findAll).toHaveBeenCalled();
  });

  it('triggerFileInput klickt das versteckte File-Input-Element an', () => {
    const input = fixture.nativeElement.querySelector(
      '[data-testid="recipe-file-input"]',
    ) as HTMLInputElement;
    const clickSpy = vi.spyOn(input, 'click');

    component.triggerFileInput();

    expect(clickSpy).toHaveBeenCalled();
  });

  it('onFileSelected parst Datei und öffnet ImportModalComponent', async () => {
    const mockFile = new File(['{"app":"rebu"}'], 'rezept.json', { type: 'application/json' });
    const event = {
      target: {
        files: [mockFile],
        value: 'C:\\fake\\rezept.json',
      },
    } as unknown as Event;

    await component.onFileSelected(event);

    expect(mockImportService.parseFile).toHaveBeenCalledWith(mockFile);
    expect(mockModalCtrl.create).toHaveBeenCalledWith(
      expect.objectContaining({
        component: ImportModalComponent,
      }),
    );
  });

  it('onFileSelected zeigt Fehler-Toast wenn Parsing fehlschlägt', async () => {
    mockImportService.parseFile.mockResolvedValueOnce({
      success: false,
      error: 'Ungültiges Format',
      recipes: [],
    });

    const mockFile = new File(['invalid'], 'invalid.json', { type: 'application/json' });
    const event = {
      target: {
        files: [mockFile],
        value: '',
      },
    } as unknown as Event;

    await component.onFileSelected(event);

    expect(mockToastCtrl.create).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Ungültiges Format',
        color: 'danger',
      }),
    );
    expect(mockModalCtrl.create).not.toHaveBeenCalled();
  });

  it('stellt einen Button zur Navigation auf die Einstellungsseite bereit', () => {
    const settingsBtn = fixture.nativeElement.querySelector('[data-testid="btn-settings"]');
    expect(settingsBtn).not.toBeNull();
    expect(settingsBtn.getAttribute('routerlink')).toBe('/settings');
  });
});
