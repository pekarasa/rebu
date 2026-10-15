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

  describe('canShare', () => {
    it('gibt true zurück, wenn sharePlugin.canShare true liefert', async () => {
      service.sharePlugin = {
        canShare: vi.fn().mockResolvedValue({ value: true }),
        share: vi.fn(),
      } as any;

      const result = await service.canShare();
      expect(result).toBe(true);
    });

    it('fällt auf false zurück, wenn weder Plugin noch navigator.share vorhanden ist', async () => {
      service.sharePlugin = {
        canShare: vi.fn().mockRejectedValue(new Error('not supported')),
        share: vi.fn(),
      } as any;

      const origShare = (navigator as any).share;
      try {
        delete (navigator as any).share;
        const result = await service.canShare();
        expect(result).toBe(false);
      } finally {
        (navigator as any).share = origShare;
      }
    });
  });

  describe('shareText', () => {
    it('nutzt das native Share-Plugin, wenn verfügbar', async () => {
      const mockShare = vi
        .fn()
        .mockResolvedValue({ activityType: 'com.apple.UIKit.activity.Mail' });
      service.sharePlugin = {
        canShare: vi.fn().mockResolvedValue({ value: true }),
        share: mockShare,
      } as any;

      const res = await service.shareText(testRecipe);

      expect(res.success).toBe(true);
      expect(res.method).toBe('native');
      expect(mockShare).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Kürbis-Süppchen mit Ingwer',
          text: expect.stringContaining('Kürbis-Süppchen mit Ingwer'),
        }),
      );
    });

    it('erkennt Benutzerabbruch und markiert Ergebnis als nicht erfolgreich', async () => {
      service.sharePlugin = {
        canShare: vi.fn().mockResolvedValue({ value: true }),
        share: vi.fn().mockRejectedValue(new Error('Share canceled by user')),
      } as any;

      const res = await service.shareText(testRecipe);

      expect(res.success).toBe(false);
      expect(res.error).toBe('Abgebrochen');
    });

    it('fällt auf Zwischenablage zurück, wenn nativer Dialog nicht unterstützt wird', async () => {
      service.sharePlugin = {
        canShare: vi.fn().mockResolvedValue({ value: false }),
        share: vi.fn(),
      } as any;
      vi.spyOn(service, 'copyTextToClipboard').mockResolvedValue(true);

      const res = await service.shareText(testRecipe);

      expect(res.success).toBe(true);
      expect(res.method).toBe('clipboard');
    });
  });

  describe('shareDeepLink', () => {
    it('teilt URL über das native Share-Plugin', async () => {
      const mockShare = vi.fn().mockResolvedValue({});
      service.sharePlugin = {
        canShare: vi.fn().mockResolvedValue({ value: true }),
        share: mockShare,
      } as any;

      const res = await service.shareDeepLink(testRecipe);

      expect(res.success).toBe(true);
      expect(res.method).toBe('native');
      expect(mockShare).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining('https://rebu.app/recipe?data='),
        }),
      );
    });
  });

  describe('shareJsonFile', () => {
    it('schreibt die JSON-Datei in das Filesystem und teilt die Datei nativ', async () => {
      const mockWriteFile = vi
        .fn()
        .mockResolvedValue({ uri: 'file:///cache/exports/Kürbis-Süppchen.rezept.json' });
      const mockShare = vi.fn().mockResolvedValue({});

      service.filesystemPlugin = {
        writeFile: mockWriteFile,
      } as any;
      service.sharePlugin = {
        canShare: vi.fn().mockResolvedValue({ value: true }),
        share: mockShare,
      } as any;

      const res = await service.shareJsonFile(testRecipe);

      expect(res.success).toBe(true);
      expect(res.method).toBe('native');
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.objectContaining({
          path: 'exports/Kürbis-Süppchen mit Ingwer.rezept.json',
        }),
      );
      expect(mockShare).toHaveBeenCalledWith(
        expect.objectContaining({
          files: ['file:///cache/exports/Kürbis-Süppchen.rezept.json'],
        }),
      );
    });

    it('fällt im Webbrowser auf Datei-Download zurück', async () => {
      service.filesystemPlugin = {
        writeFile: vi.fn().mockRejectedValue(new Error('Filesystem not supported on web')),
      } as any;
      const downloadSpy = vi.spyOn(service, 'triggerFileDownload').mockImplementation(() => {});

      const res = await service.shareJsonFile(testRecipe);

      expect(res.success).toBe(true);
      expect(res.method).toBe('download');
      expect(downloadSpy).toHaveBeenCalledWith(
        'Kürbis-Süppchen mit Ingwer.rezept.json',
        expect.stringContaining('"app": "rebu"'),
        'application/json',
      );
    });
  });

  describe('copyTextToClipboard & printRecipe', () => {
    it('kopiert Text in die Zwischenablage über navigator.clipboard falls vorhanden', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });

      const success = await service.copyTextToClipboard('Hallo Welt');

      expect(success).toBe(true);
      expect(writeTextMock).toHaveBeenCalledWith('Hallo Welt');
    });

    it('öffnet Druckdialog über printRecipe fehlerfrei', () => {
      const mockPrintWindow = {
        document: {
          write: vi.fn(),
          close: vi.fn(),
        },
        focus: vi.fn(),
        print: vi.fn(),
      };
      vi.spyOn(window, 'open').mockReturnValue(mockPrintWindow as any);

      service.printRecipe(testRecipe);

      expect(mockPrintWindow.document.write).toHaveBeenCalled();
      expect(mockPrintWindow.print).toHaveBeenCalled();
    });
  });
});
