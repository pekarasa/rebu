import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, ModalController, NavController, ToastController } from '@ionic/angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { KeepAwakeService } from '../../core/keep-awake.service';
import { PhotoService } from '../../core/photo.service';
import { PortionScalingService } from '../../core/portion-scaling.service';
import { RecipeRepository } from '../../core/recipe.repository';
import { Kategorie } from '../../models/kategorie.enum';
import { Recipe } from '../../models/recipe.model';
import { ShareModalComponent } from '../share/share-modal.component';
import { RecipeDetailPage } from './recipe-detail.page';

describe('RecipeDetailPage', () => {
  let component: RecipeDetailPage;
  let fixture: ComponentFixture<RecipeDetailPage>;

  let mockRecipeRepo: {
    findById: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let mockPhotoService: {
    getPhotoDisplayUrl: ReturnType<typeof vi.fn>;
    deletePhoto: ReturnType<typeof vi.fn>;
  };
  let mockKeepAwakeService: {
    enable: ReturnType<typeof vi.fn>;
    disable: ReturnType<typeof vi.fn>;
  };
  let mockRouter: {
    navigate: ReturnType<typeof vi.fn>;
  };
  let mockNavCtrl: {
    navigateBack: ReturnType<typeof vi.fn>;
  };
  let mockAlertCtrl: {
    create: ReturnType<typeof vi.fn>;
  };
  let mockModalCtrl: {
    create: ReturnType<typeof vi.fn>;
  };
  let mockToastCtrl: {
    create: ReturnType<typeof vi.fn>;
  };

  const sampleRecipe: Recipe = {
    id: 'r1',
    titel: 'Spaghetti Bolognese',
    portionen: 4,
    zeitVorbereitung: 15,
    zeitKochen: 30,
    kategorie: Kategorie.Hauptgericht,
    notizen: 'Mit frischem Parmesan servieren.',
    fotoPath: 'recipe-photos/spaghetti.jpg',
    erstelltAm: '2026-10-01T10:00:00.000Z',
    geaendertAm: '2026-10-01T10:00:00.000Z',
    saisonMonate: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    khTag: 'Pasta',
    zutaten: [
      {
        id: 'z1',
        rezeptId: 'r1',
        reihenfolge: 0,
        menge: 400,
        einheit: 'g',
        name: 'Spaghetti',
      },
      {
        id: 'z2',
        rezeptId: 'r1',
        reihenfolge: 1,
        menge: 500,
        einheit: 'g',
        name: 'Hackfleisch',
      },
      {
        id: 'z3',
        rezeptId: 'r1',
        reihenfolge: 2,
        menge: null,
        einheit: '',
        name: 'Salz und Pfeffer',
      },
      {
        id: 'z4',
        rezeptId: 'r1',
        reihenfolge: 3,
        menge: 200,
        einheit: 'g',
        name: 'Frische Tomaten',
      },
    ],
    schritte: [
      {
        id: 's1',
        rezeptId: 'r1',
        reihenfolge: 0,
        text: 'Wasser zum Kochen bringen und Spaghetti kochen.',
      },
      {
        id: 's2',
        rezeptId: 'r1',
        reihenfolge: 1,
        text: 'Hackfleisch in einer Pfanne anbraten.',
      },
    ],
  };

  beforeEach(async () => {
    mockRecipeRepo = {
      findById: vi.fn().mockResolvedValue(sampleRecipe),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    mockPhotoService = {
      getPhotoDisplayUrl: vi.fn().mockResolvedValue('data:image/jpeg;base64,mockphoto'),
      deletePhoto: vi.fn().mockResolvedValue(undefined),
    };

    mockKeepAwakeService = {
      enable: vi.fn().mockResolvedValue(true),
      disable: vi.fn().mockResolvedValue(true),
    };

    mockRouter = {
      navigate: vi.fn().mockResolvedValue(true),
    };

    mockNavCtrl = {
      navigateBack: vi.fn().mockResolvedValue(true),
    };

    mockAlertCtrl = {
      create: vi.fn().mockResolvedValue({
        present: vi.fn().mockResolvedValue(undefined),
      }),
    };

    mockModalCtrl = {
      create: vi.fn().mockResolvedValue({
        present: vi.fn().mockResolvedValue(undefined),
      }),
    };

    mockToastCtrl = {
      create: vi.fn().mockResolvedValue({
        present: vi.fn().mockResolvedValue(undefined),
      }),
    };

    await TestBed.configureTestingModule({
      imports: [RecipeDetailPage],
      providers: [
        PortionScalingService,
        { provide: RecipeRepository, useValue: mockRecipeRepo },
        { provide: PhotoService, useValue: mockPhotoService },
        { provide: KeepAwakeService, useValue: mockKeepAwakeService },
        { provide: Router, useValue: mockRouter },
        { provide: NavController, useValue: mockNavCtrl },
        { provide: AlertController, useValue: mockAlertCtrl },
        { provide: ModalController, useValue: mockModalCtrl },
        { provide: ToastController, useValue: mockToastCtrl },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'id' ? 'r1' : null),
              },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RecipeDetailPage);
    component = fixture.componentInstance;
    await component.ngOnInit();
    fixture.detectChanges();
  });

  it('erstellt die Komponente und lädt das Rezept initial', () => {
    expect(component).toBeTruthy();
    expect(mockRecipeRepo.findById).toHaveBeenCalledWith('r1');
    expect(component.recipe?.id).toBe('r1');
    expect(component.currentPortions).toBe(4);
    expect(component.displayPhotoUrl).toBe('data:image/jpeg;base64,mockphoto');
    expect(component.isLoading).toBe(false);
  });

  it('zeigt Fehler an, wenn das Rezept nicht gefunden werden kann', async () => {
    mockRecipeRepo.findById.mockResolvedValueOnce(null);

    await component.loadRecipe('not-found');
    fixture.detectChanges();

    expect(component.recipe).toBeNull();
    expect(component.loadError).toBe('Das Rezept wurde leider nicht gefunden.');
  });

  describe('Keep-Awake Integration', () => {
    it('aktiviert Keep-Awake beim Betreten der Ansicht (ionViewWillEnter)', async () => {
      await component.ionViewWillEnter();
      expect(mockKeepAwakeService.enable).toHaveBeenCalledTimes(1);
    });

    it('deaktiviert Keep-Awake beim Verlassen der Ansicht (ionViewWillLeave)', async () => {
      await component.ionViewWillLeave();
      expect(mockKeepAwakeService.disable).toHaveBeenCalledTimes(1);
    });

    it('deaktiviert Keep-Awake bei Zerstörung der Komponente (ngOnDestroy)', async () => {
      await component.ngOnDestroy();
      expect(mockKeepAwakeService.disable).toHaveBeenCalledTimes(1);
    });
  });

  describe('Portionsskalierung in Echtzeit', () => {
    it('skaliert Zutaten bei Erhöhung der Portionsanzahl', () => {
      expect(component.scaledIngredients[0].menge).toBe(400); // bei 4 Portionen

      component.onPortionsChange(8);

      expect(component.currentPortions).toBe(8);
      expect(component.scaledIngredients[0].menge).toBe(800);
      expect(component.scaledIngredients[1].menge).toBe(1000);
      expect(component.scaledIngredients[2].menge).toBeNull(); // ohne Menge bleibt null
    });

    it('skaliert Zutaten bei Verringerung der Portionsanzahl', () => {
      component.onPortionsChange(2);

      expect(component.currentPortions).toBe(2);
      expect(component.scaledIngredients[0].menge).toBe(200);
      expect(component.scaledIngredients[1].menge).toBe(250);
    });

    it('formatiert Mengenangaben über PortionScalingService', () => {
      expect(component.formatAmount(400)).toBe('400');
      expect(component.formatAmount(1.5)).toBe('1,5');
      expect(component.formatAmount(null)).toBe('');
    });

    it('erkennt saisonale Zutaten und stellt visuelle Hinweise bereit', () => {
      fixture.detectChanges();

      expect(component.isIngredientSeasonal('Frische Tomaten')).toBe(true);
      expect(component.getIngredientSeasonBadge('Frische Tomaten')).toContain('Sommer');

      expect(component.isIngredientSeasonal('Hackfleisch')).toBe(false);
      expect(component.getIngredientSeasonBadge('Hackfleisch')).toBeNull();

      const seasonalIcons = fixture.nativeElement.querySelectorAll('.seasonal-ingredient-icon');
      expect(seasonalIcons.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Schritte abhaken (Kochen)', () => {
    it('startet ohne abgehakte Schritte', () => {
      expect(component.checkedStepIds.size).toBe(0);
      expect(component.isStepCompleted('s1')).toBe(false);
      expect(component.completedStepsCount).toBe(0);
      expect(component.cookingProgress).toBe(0);
    });

    it('toggled einen Schritt als erledigt und wieder zurück', () => {
      component.toggleStep('s1');
      expect(component.isStepCompleted('s1')).toBe(true);
      expect(component.completedStepsCount).toBe(1);
      expect(component.cookingProgress).toBe(0.5);

      component.toggleStep('s1');
      expect(component.isStepCompleted('s1')).toBe(false);
      expect(component.completedStepsCount).toBe(0);
      expect(component.cookingProgress).toBe(0);
    });

    it('Kochen beenden setzt alle Häkchen zurück und zeigt Toast', async () => {
      component.toggleStep('s1');
      component.toggleStep('s2');
      expect(component.checkedStepIds.size).toBe(2);

      await component.resetCooking();

      expect(component.checkedStepIds.size).toBe(0);
      expect(mockToastCtrl.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Alle Schritte zurückgesetzt'),
        }),
      );
    });
  });

  describe('KH-Tag und Saison-Badge Anzeige', () => {
    it('zeigt KH-Badge an wenn khTag gesetzt ist', () => {
      fixture.detectChanges();
      const badges = fixture.nativeElement.querySelectorAll('app-badge');
      const badgeTexts = Array.from(badges).map((b: unknown) =>
        (b as HTMLElement).textContent?.trim(),
      );
      expect(badgeTexts).toContain('Pasta');
    });

    it('zeigt keinen KH-Badge an wenn khTag null ist', async () => {
      mockRecipeRepo.findById.mockResolvedValueOnce({ ...sampleRecipe, khTag: null });
      await component.loadRecipe('r1');
      fixture.detectChanges();

      const badges = fixture.nativeElement.querySelectorAll('app-badge');
      const badgeTexts = Array.from(badges).map((b: unknown) =>
        (b as HTMLElement).textContent?.trim(),
      );
      expect(badgeTexts).not.toContain('Pasta');
    });
  });

  describe('Aktionen (Bearbeiten, Teilen, Löschen)', () => {
    it('navigiert zum Bearbeiten-Screen', () => {
      component.editRecipe();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/recipes', 'r1', 'edit']);
    });

    it('öffnet das ShareModalComponent über ModalController beim Teilen', async () => {
      component.currentPortions = 6;
      await component.openShare();

      expect(mockModalCtrl.create).toHaveBeenCalledWith(
        expect.objectContaining({
          component: ShareModalComponent,
          componentProps: {
            recipe: sampleRecipe,
            portions: 6,
          },
        }),
      );
    });

    it('öffnet Bestätigungsdialog vor dem Löschen', async () => {
      await component.confirmDelete();
      expect(mockAlertCtrl.create).toHaveBeenCalledWith(
        expect.objectContaining({
          header: 'Rezept löschen?',
        }),
      );
    });

    it('löscht Rezept und Foto bei Bestätigung und navigiert zurück', async () => {
      let confirmHandler: (() => Promise<void>) | undefined;
      mockAlertCtrl.create.mockImplementationOnce(async (options: { buttons?: unknown[] }) => {
        const destructiveBtn = (
          options.buttons as Array<{ role?: string; handler?: () => Promise<void> }>
        )?.find((b) => b.role === 'destructive');
        confirmHandler = destructiveBtn?.handler;
        return { present: vi.fn().mockResolvedValue(undefined) };
      });

      await component.confirmDelete();
      expect(confirmHandler).toBeDefined();

      await confirmHandler!();

      expect(mockRecipeRepo.delete).toHaveBeenCalledWith('r1');
      expect(mockPhotoService.deletePhoto).toHaveBeenCalledWith('recipe-photos/spaghetti.jpg');
      expect(mockNavCtrl.navigateBack).toHaveBeenCalledWith('/recipes');
    });
  });
});
