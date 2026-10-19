import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ImportService, ImportedRecipeDraft } from './import.service';
import { RecipeRepository } from './recipe.repository';
import { SeasonService } from './season.service';
import { KhService } from './kh.service';
import { PhotoService } from './photo.service';
import { ShareService } from './share.service';
import { Recipe } from '../models/recipe.model';
import { Kategorie } from '../models/kategorie.enum';

describe('ImportService', () => {
  let service: ImportService;
  let mockRepo: {
    exists: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let mockSeasonService: {
    calculateSaisonMonate: ReturnType<typeof vi.fn>;
  };
  let mockKhService: {
    calculateKhTag: ReturnType<typeof vi.fn>;
  };
  let mockPhotoService: {
    saveDataUrl: ReturnType<typeof vi.fn>;
  };
  let shareService: ShareService;

  const validSampleRecipeData = {
    id: '11111111-2222-3333-4444-555555555555',
    titel: 'Kürbis-Pasta mit Salbei',
    portionen: 4,
    zeitVorbereitung: 15,
    zeitKochen: 20,
    kategorie: 'Hauptgericht',
    notizen: 'Sehr lecker mit frischem Parmesan.',
    fotoBase64: 'data:image/jpeg;base64,samplebase64photo',
    saisonMonate: [1, 2], // Im Import veraltet; muss neu berechnet werden!
    khTag: 'Reis', // Im Import falsch; muss neu berechnet werden!
    zutaten: [
      { reihenfolge: 1, menge: 400, einheit: 'g', name: 'Kürbis' },
      { reihenfolge: 2, menge: 350, einheit: 'g', name: 'Spaghetti' },
    ],
    schritte: [
      { reihenfolge: 1, text: 'Kürbis würfeln und anbraten.' },
      { reihenfolge: 2, text: 'Pasta kochen und untermengen.' },
    ],
    erstelltAm: '2026-10-01T10:00:00.000Z',
    geaendertAm: '2026-10-01T10:00:00.000Z',
  };

  beforeEach(() => {
    mockRepo = {
      exists: vi.fn().mockResolvedValue(false),
      create: vi.fn().mockImplementation((data, saisonMonate, khTag, id) =>
        Promise.resolve({
          ...data,
          id: id || 'generated-uuid',
          saisonMonate,
          khTag,
          erstelltAm: '2026-10-19T10:00:00Z',
          geaendertAm: '2026-10-19T10:00:00Z',
        } as Recipe),
      ),
      update: vi.fn().mockImplementation((data, saisonMonate, khTag) =>
        Promise.resolve({
          ...data,
          saisonMonate,
          khTag,
          erstelltAm: '2026-10-01T10:00:00Z',
          geaendertAm: '2026-10-19T10:00:00Z',
        } as Recipe),
      ),
    };

    mockSeasonService = {
      calculateSaisonMonate: vi.fn().mockReturnValue([9, 10, 11]),
    };

    mockKhService = {
      calculateKhTag: vi.fn().mockReturnValue('Pasta'),
    };

    mockPhotoService = {
      saveDataUrl: vi.fn().mockResolvedValue({
        filePath: 'recipe-photos/imported-photo.jpg',
        displayUrl: 'data:image/jpeg;base64,samplebase64photo',
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        ImportService,
        ShareService,
        { provide: RecipeRepository, useValue: mockRepo },
        { provide: SeasonService, useValue: mockSeasonService },
        { provide: KhService, useValue: mockKhService },
        { provide: PhotoService, useValue: mockPhotoService },
      ],
    });

    service = TestBed.inject(ImportService);
    shareService = TestBed.inject(ShareService);
  });

  describe('Validation & Parsing', () => {
    it('gibt Fehler bei leerer Import-Quelle zurück', () => {
      const res = service.parseImportSource('');
      expect(res.success).toBe(false);
      expect(res.recipes).toHaveLength(0);
      expect(res.error).toBeDefined();
    });

    it('parst Rebu Single-Recipe Export JSON und berechnet Saison und KH-Tag neu', () => {
      const payload = {
        app: 'rebu',
        version: 1,
        exportedAt: '2026-10-19T10:00:00.000Z',
        recipe: validSampleRecipeData,
      };

      const result = service.parseImportSource(JSON.stringify(payload));
      expect(result.success).toBe(true);
      expect(result.recipes).toHaveLength(1);

      const draft = result.recipes[0];
      expect(draft.titel).toBe('Kürbis-Pasta mit Salbei');
      expect(draft.portionen).toBe(4);
      expect(draft.kategorie).toBe(Kategorie.Hauptgericht);
      expect(draft.zutaten).toHaveLength(2);
      expect(draft.schritte).toHaveLength(2);
      // Neuberechnung prüfen
      expect(mockSeasonService.calculateSaisonMonate).toHaveBeenCalled();
      expect(mockKhService.calculateKhTag).toHaveBeenCalled();
      expect(draft.saisonMonate).toEqual([9, 10, 11]);
      expect(draft.khTag).toBe('Pasta');
    });

    it('parst direktes Einzelrezept-Objekt ohne Wrapper', () => {
      const result = service.parseImportJson(JSON.stringify(validSampleRecipeData));
      expect(result.success).toBe(true);
      expect(result.recipes).toHaveLength(1);
      expect(result.recipes[0].titel).toBe('Kürbis-Pasta mit Salbei');
    });

    it('parst Sammel-Export mit mehreren Rezepten', () => {
      const collectionPayload = {
        app: 'rebu',
        version: 1,
        exportedAt: '2026-10-19T10:00:00.000Z',
        recipes: [
          validSampleRecipeData,
          {
            ...validSampleRecipeData,
            id: '22222222-3333-4444-5555-666666666666',
            titel: 'Tomatensuppe',
          },
        ],
      };

      const result = service.parseImportSource(JSON.stringify(collectionPayload));
      expect(result.success).toBe(true);
      expect(result.recipes).toHaveLength(2);
      expect(result.recipes[0].titel).toBe('Kürbis-Pasta mit Salbei');
      expect(result.recipes[1].titel).toBe('Tomatensuppe');
    });

    it('weist ungültiges JSON mit fehlendem Titel ab', () => {
      const invalid = {
        ...validSampleRecipeData,
        titel: '   ',
      };
      const result = service.parseImportJson(JSON.stringify(invalid));
      expect(result.success).toBe(false);
      expect(result.recipes).toHaveLength(0);
    });

    it('weist Rezept ohne Zutaten ab', () => {
      const invalid = {
        ...validSampleRecipeData,
        zutaten: [],
      };
      const result = service.parseImportJson(JSON.stringify(invalid));
      expect(result.success).toBe(false);
      expect(result.recipes).toHaveLength(0);
    });

    it('weist Rezept ohne Schritte ab', () => {
      const invalid = {
        ...validSampleRecipeData,
        schritte: [],
      };
      const result = service.parseImportJson(JSON.stringify(invalid));
      expect(result.success).toBe(false);
      expect(result.recipes).toHaveLength(0);
    });

    it('korrigiert ungültige Portionen auf den Standardwert 4', () => {
      const dataWithInvalidPortions = {
        ...validSampleRecipeData,
        portionen: 0,
      };
      const result = service.parseImportJson(JSON.stringify(dataWithInvalidPortions));
      expect(result.success).toBe(true);
      expect(result.recipes[0].portionen).toBe(4);
    });
  });

  describe('Deep-Link Import', () => {
    it('dekodiert und parst einen HTTPS Deep-Link', () => {
      const encodedLink = shareService.encodeDeepLink({
        ...validSampleRecipeData,
        kategorie: Kategorie.Hauptgericht,
        fotoPath: null,
      } as unknown as Recipe);

      const result = service.parseImportSource(encodedLink);
      expect(result.success).toBe(true);
      expect(result.recipes).toHaveLength(1);
      expect(result.recipes[0].titel).toBe('Kürbis-Pasta mit Salbei');
    });

    it('dekodiert und parst einen rebu:// Deep-Link', () => {
      const customLink = shareService.encodeDeepLink(
        {
          ...validSampleRecipeData,
          kategorie: Kategorie.Hauptgericht,
          fotoPath: null,
        } as unknown as Recipe,
        { scheme: 'rebu' },
      );

      const result = service.parseImportSource(customLink);
      expect(result.success).toBe(true);
      expect(result.recipes).toHaveLength(1);
      expect(result.recipes[0].titel).toBe('Kürbis-Pasta mit Salbei');
    });
  });

  describe('File Parsing', () => {
    it('liest File-Objekt aus und parst JSON erfolgreich', async () => {
      const fileContent = JSON.stringify({
        app: 'rebu',
        version: 1,
        recipe: validSampleRecipeData,
      });
      const file = new File([fileContent], 'kuerbis-pasta.rezept.json', {
        type: 'application/json',
      });

      const result = await service.parseFile(file);
      expect(result.success).toBe(true);
      expect(result.recipes).toHaveLength(1);
      expect(result.recipes[0].titel).toBe('Kürbis-Pasta mit Salbei');
    });
  });

  describe('Collision Detection & Resolution', () => {
    it('checkUuidCollision fragt das Repository ab', async () => {
      mockRepo.exists.mockResolvedValueOnce(true);
      expect(await service.checkUuidCollision('existing-id')).toBe(true);
      expect(mockRepo.exists).toHaveBeenCalledWith('existing-id');

      mockRepo.exists.mockResolvedValueOnce(false);
      expect(await service.checkUuidCollision('new-id')).toBe(false);
    });

    it('speichert neues Rezept wenn keine Kollision vorliegt', async () => {
      mockRepo.exists.mockResolvedValue(false);

      const draft = service.validateAndNormalizeRecipe(validSampleRecipeData)!;
      const result = await service.importRecipe(draft);

      expect(result.success).toBe(true);
      expect(result.action).toBe('created');
      expect(mockPhotoService.saveDataUrl).toHaveBeenCalledWith(
        'data:image/jpeg;base64,samplebase64photo',
      );
      expect(mockRepo.create).toHaveBeenCalled();
      expect(result.recipe?.id).toBe(draft.id);
    });

    it('meldet Kollision, wenn ID existiert und keine Resolution gewählt wurde', async () => {
      mockRepo.exists.mockResolvedValue(true);

      const draft = service.validateAndNormalizeRecipe(validSampleRecipeData)!;
      const result = await service.importRecipe(draft);

      expect(result.success).toBe(false);
      expect(result.collision).toBe(true);
      expect(mockRepo.update).not.toHaveBeenCalled();
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('überschreibt bestehendes Rezept bei resolution overwrite', async () => {
      mockRepo.exists.mockResolvedValue(true);

      const draft = service.validateAndNormalizeRecipe(validSampleRecipeData)!;
      const result = await service.importRecipe(draft, { collisionResolution: 'overwrite' });

      expect(result.success).toBe(true);
      expect(result.action).toBe('overwritten');
      expect(mockRepo.update).toHaveBeenCalled();
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('speichert als Kopie mit neuer ID bei resolution copy', async () => {
      mockRepo.exists.mockResolvedValue(true);

      const draft = service.validateAndNormalizeRecipe(validSampleRecipeData)!;
      const result = await service.importRecipe(draft, { collisionResolution: 'copy' });

      expect(result.success).toBe(true);
      expect(result.action).toBe('copied');
      expect(mockRepo.create).toHaveBeenCalled();

      // Bei Kopie darf nicht die Original-ID übergeben werden
      const createCallArgs = mockRepo.create.mock.calls[0];
      const passedCustomId = createCallArgs[3];
      expect(passedCustomId).toBeDefined();
      expect(passedCustomId).not.toBe(draft.id);
    });
  });
});
