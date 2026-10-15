import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ShareService } from './share.service';
import { PhotoService } from './photo.service';
import { Recipe } from '../models/recipe.model';
import { Kategorie } from '../models/kategorie.enum';

describe('ShareService - Formatting & Encoding', () => {
  let service: ShareService;
  let mockPhotoService: Partial<PhotoService>;

  const testRecipe: Recipe = {
    id: 'recipe-uuid-1',
    titel: 'Kürbis-Süppchen mit Ingwer',
    portionen: 4,
    zeitVorbereitung: 15,
    zeitKochen: 25,
    kategorie: Kategorie.Hauptgericht,
    notizen: 'Mit gerösteten Kürbiskernen garnieren.',
    fotoPath: 'recipe-photos/kuerbis.jpg',
    erstelltAm: '2026-10-15T10:00:00.000Z',
    geaendertAm: '2026-10-15T10:30:00.000Z',
    saisonMonate: [9, 10, 11],
    khTag: null,
    zutaten: [
      {
        id: 'z1',
        rezeptId: 'recipe-uuid-1',
        reihenfolge: 1,
        menge: 800,
        einheit: 'g',
        name: 'Hokkaido-Kürbis',
      },
      {
        id: 'z2',
        rezeptId: 'recipe-uuid-1',
        reihenfolge: 2,
        menge: 1,
        einheit: 'Stück',
        name: 'Zwiebel',
      },
      {
        id: 'z3',
        rezeptId: 'recipe-uuid-1',
        reihenfolge: 3,
        menge: 600,
        einheit: 'ml',
        name: 'Gemüsebrühe',
      },
      {
        id: 'z4',
        rezeptId: 'recipe-uuid-1',
        reihenfolge: 4,
        menge: null,
        einheit: '',
        name: 'Salz und Pfeffer',
      },
    ],
    schritte: [
      {
        id: 's1',
        rezeptId: 'recipe-uuid-1',
        reihenfolge: 1,
        text: 'Kürbis würfeln und Zwiebel fein hacken.',
      },
      {
        id: 's2',
        rezeptId: 'recipe-uuid-1',
        reihenfolge: 2,
        text: 'In Olivenöl anbraten und mit Gemüsebrühe ablöschen.',
      },
      {
        id: 's3',
        rezeptId: 'recipe-uuid-1',
        reihenfolge: 3,
        text: '20 Minuten köcheln lassen und fein pürieren.',
      },
    ],
  };

  beforeEach(() => {
    mockPhotoService = {
      getPhotoDisplayUrl: vi.fn().mockResolvedValue('data:image/jpeg;base64,mockBase64KuerbisData'),
    };

    TestBed.configureTestingModule({
      providers: [ShareService, { provide: PhotoService, useValue: mockPhotoService }],
    });

    service = TestBed.inject(ShareService);
  });

  describe('formatAsText', () => {
    it('formatiert das Rezept als formatierten Klartext mit Originalportionen', () => {
      const text = service.formatAsText(testRecipe);

      expect(text).toContain('Kürbis-Süppchen mit Ingwer (4 Portionen)');
      expect(text).toContain('Vorbereitung: 15 Min. | Kochen: 25 Min.');
      expect(text).toContain('Kategorie: Hauptgericht');
      expect(text).toContain('• 800 g Hokkaido-Kürbis');
      expect(text).toContain('• 1 Stück Zwiebel');
      expect(text).toContain('• 600 ml Gemüsebrühe');
      expect(text).toContain('• Salz und Pfeffer');
      expect(text).toContain('1. Kürbis würfeln und Zwiebel fein hacken.');
      expect(text).toContain('2. In Olivenöl anbraten und mit Gemüsebrühe ablöschen.');
      expect(text).toContain('3. 20 Minuten köcheln lassen und fein pürieren.');
      expect(text).toContain('Tipps & Notizen:');
      expect(text).toContain('Mit gerösteten Kürbiskernen garnieren.');
      expect(text).toContain('Geteilt mit Rebu');
    });

    it('skaliert Zutatenmengen korrekt bei abweichender Portionszahl', () => {
      const text = service.formatAsText(testRecipe, 2);

      expect(text).toContain('Kürbis-Süppchen mit Ingwer (2 Portionen)');
      expect(text).toContain('• 400 g Hokkaido-Kürbis');
      expect(text).toContain('• 0,5 Stück Zwiebel');
      expect(text).toContain('• 300 ml Gemüsebrühe');
    });

    it('behandelt Einzahl bei 1 Portion ("1 Portion")', () => {
      const text = service.formatAsText(testRecipe, 1);
      expect(text).toContain('(1 Portion)');
    });

    it('formatiert Rezepte ohne Notizen, Zeit oder Kategorie fehlerfrei', () => {
      const minimalRecipe: Recipe = {
        ...testRecipe,
        zeitVorbereitung: null,
        zeitKochen: null,
        kategorie: null,
        notizen: null,
      };

      const text = service.formatAsText(minimalRecipe);

      expect(text).toContain('Kürbis-Süppchen mit Ingwer (4 Portionen)');
      expect(text).not.toContain('Vorbereitung:');
      expect(text).not.toContain('Kategorie:');
      expect(text).not.toContain('Tipps & Notizen:');
    });
  });

  describe('getExportFileName', () => {
    it('erzeugt einen Dateinamen im Format <titel>.rezept.json', () => {
      const fileName = service.getExportFileName('Kürbis-Süppchen');
      expect(fileName).toBe('Kürbis-Süppchen.rezept.json');
    });

    it('bereinigt unerlaubte Dateisystem-Zeichen wie /, \\, :, * etc.', () => {
      const fileName = service.getExportFileName('Pasta: Carbonara / Roma * Spezial?');
      expect(fileName).toBe('Pasta_ Carbonara _ Roma _ Spezial_.rezept.json');
    });

    it('fällt bei leerem Titel auf "rezept.rezept.json" zurück', () => {
      expect(service.getExportFileName('')).toBe('rezept.rezept.json');
      expect(service.getExportFileName('   ')).toBe('rezept.rezept.json');
    });
  });

  describe('encodeDeepLink & decodeDeepLink', () => {
    it('erzeugt standardmäßig einen HTTPS Deep-Link mit Datenparameter', () => {
      const link = service.encodeDeepLink(testRecipe);

      expect(link).toContain('https://rebu.app/recipe?data=');
      expect(link).not.toContain('mockBase64KuerbisData'); // Foto nicht im Link enthalten
    });

    it('unterstützt das benutzerdefinierte rebu:// URL-Schema', () => {
      const link = service.encodeDeepLink(testRecipe, { scheme: 'rebu' });

      expect(link.startsWith('rebu://recipe?data=')).toBe(true);
    });

    it('dekodiert einen generierten HTTPS Deep-Link fehlerfrei (Roundtrip mit Umlauten)', () => {
      const link = service.encodeDeepLink(testRecipe);
      const decoded = service.decodeDeepLink(link);

      expect(decoded).not.toBeNull();
      expect(decoded?.titel).toBe('Kürbis-Süppchen mit Ingwer');
      expect(decoded?.portionen).toBe(4);
      expect(decoded?.zutaten.length).toBe(4);
      expect(decoded?.zutaten[0].name).toBe('Hokkaido-Kürbis');
      expect(decoded?.schritte.length).toBe(3);
      expect(decoded?.notizen).toBe('Mit gerösteten Kürbiskernen garnieren.');
    });

    it('dekodiert einen rebu:// Deep-Link fehlerfrei', () => {
      const link = service.encodeDeepLink(testRecipe, { scheme: 'rebu' });
      const decoded = service.decodeDeepLink(link);

      expect(decoded).not.toBeNull();
      expect(decoded?.titel).toBe('Kürbis-Süppchen mit Ingwer');
    });

    it('dekodiert auch direkten URL-safe Base64-String', () => {
      const link = service.encodeDeepLink(testRecipe);
      const url = new URL(link);
      const rawData = url.searchParams.get('data')!;

      const decoded = service.decodeDeepLink(rawData);
      expect(decoded).not.toBeNull();
      expect(decoded?.titel).toBe('Kürbis-Süppchen mit Ingwer');
    });

    it('gibt bei ungültigen Eingaben null zurück', () => {
      expect(service.decodeDeepLink('')).toBeNull();
      expect(service.decodeDeepLink('ungültiger-link')).toBeNull();
      expect(service.decodeDeepLink('https://rebu.app/recipe?data=invalidbase64!%%')).toBeNull();
    });
  });

  describe('createRecipeExportJson', () => {
    it('erzeugt eine valide SingleRecipeExport-JSON-Struktur inklusive Foto als Base64', async () => {
      const json = await service.createRecipeExportJson(testRecipe, true);
      const parsed = JSON.parse(json);

      expect(parsed.app).toBe('rebu');
      expect(parsed.version).toBe(1);
      expect(parsed.recipe).toBeDefined();
      expect(parsed.recipe.titel).toBe('Kürbis-Süppchen mit Ingwer');
      expect(parsed.recipe.fotoBase64).toBe('data:image/jpeg;base64,mockBase64KuerbisData');
      expect(parsed.recipe.zutaten.length).toBe(4);
      expect(parsed.recipe.schritte.length).toBe(3);
    });

    it('schließt das Foto aus, wenn includePhoto auf false gesetzt ist', async () => {
      const json = await service.createRecipeExportJson(testRecipe, false);
      const parsed = JSON.parse(json);

      expect(parsed.recipe.fotoBase64).toBeNull();
      expect(mockPhotoService.getPhotoDisplayUrl).not.toHaveBeenCalled();
    });
  });
});
