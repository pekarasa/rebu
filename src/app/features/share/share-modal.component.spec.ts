import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalController, ToastController } from '@ionic/angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ShareModalComponent } from './share-modal.component';
import { ShareService } from '../../core/share.service';
import { Recipe } from '../../models/recipe.model';
import { Kategorie } from '../../models/kategorie.enum';

describe('ShareModalComponent', () => {
  let component: ShareModalComponent;
  let fixture: ComponentFixture<ShareModalComponent>;

  let mockModalCtrl: { dismiss: ReturnType<typeof vi.fn> };
  let mockToastCtrl: { create: ReturnType<typeof vi.fn> };
  let mockShareService: Partial<ShareService>;

  const testRecipe: Recipe = {
    id: 'test-recipe-id',
    titel: 'Spaghetti Bolognese',
    portionen: 4,
    zeitVorbereitung: 15,
    zeitKochen: 45,
    kategorie: Kategorie.Hauptgericht,
    notizen: 'Mit Parmesan servieren.',
    fotoPath: 'recipe-photos/spaghetti.jpg',
    erstelltAm: '2026-10-15T12:00:00.000Z',
    geaendertAm: '2026-10-15T12:00:00.000Z',
    saisonMonate: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    khTag: 'Pasta',
    zutaten: [
      {
        id: 'z1',
        rezeptId: 'test-recipe-id',
        reihenfolge: 1,
        menge: 400,
        einheit: 'g',
        name: 'Spaghetti',
      },
      {
        id: 'z2',
        rezeptId: 'test-recipe-id',
        reihenfolge: 2,
        menge: 300,
        einheit: 'g',
        name: 'Hackfleisch',
      },
    ],
    schritte: [
      { id: 's1', rezeptId: 'test-recipe-id', reihenfolge: 1, text: 'Sauce kochen.' },
      { id: 's2', rezeptId: 'test-recipe-id', reihenfolge: 2, text: 'Nudeln kochen.' },
    ],
  };

  beforeEach(async () => {
    mockModalCtrl = {
      dismiss: vi.fn().mockResolvedValue(true),
    };

    const mockToast = { present: vi.fn().mockResolvedValue(undefined) };
    mockToastCtrl = {
      create: vi.fn().mockResolvedValue(mockToast),
    };

    mockShareService = {
      getExportFileName: vi.fn().mockReturnValue('Spaghetti_Bolognese.rezept.json'),
      formatAsText: vi.fn().mockReturnValue('Spaghetti Bolognese Text'),
      encodeDeepLink: vi.fn().mockReturnValue('https://rebu.app/recipe?data=mock-data'),
      shareDeepLink: vi.fn().mockResolvedValue({ success: true, method: 'native' }),
      shareText: vi.fn().mockResolvedValue({ success: true, method: 'native' }),
      shareJsonFile: vi.fn().mockResolvedValue({ success: true, method: 'native' }),
      copyTextToClipboard: vi.fn().mockResolvedValue(true),
      printRecipe: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ShareModalComponent],
      providers: [
        { provide: ModalController, useValue: mockModalCtrl },
        { provide: ToastController, useValue: mockToastCtrl },
        { provide: ShareService, useValue: mockShareService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ShareModalComponent);
    component = fixture.componentInstance;
    component.recipe = testRecipe;
    component.portions = 4;
    fixture.detectChanges();
  });

  it('erzeugt die Komponente erfolgreich mit Rezepttitel und Portionen', () => {
    expect(component).toBeTruthy();
    expect(component.effectivePortions).toBe(4);
    expect(component.exportFileName).toBe('Spaghetti_Bolognese.rezept.json');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.recipe-title')?.textContent).toContain('Spaghetti Bolognese');
    expect(compiled.querySelector('.recipe-sub')?.textContent).toContain('4 Portionen');
  });

  it('schließt das Modal beim Klick auf Schließen', async () => {
    await component.dismiss();
    expect(mockModalCtrl.dismiss).toHaveBeenCalled();
  });

  describe('Link-Export', () => {
    it('ruft shareDeepLink auf und zeigt Toast bei Erfolg', async () => {
      await component.shareLink();

      expect(mockShareService.shareDeepLink).toHaveBeenCalledWith(testRecipe);
      expect(mockToastCtrl.create).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Link geteilt!' }),
      );
      expect(mockModalCtrl.dismiss).toHaveBeenCalled();
    });

    it('kopiert Link in die Zwischenablage bei copyLink()', async () => {
      await component.copyLink();

      expect(mockShareService.encodeDeepLink).toHaveBeenCalledWith(testRecipe);
      expect(mockShareService.copyTextToClipboard).toHaveBeenCalledWith(
        'https://rebu.app/recipe?data=mock-data',
      );
      expect(mockToastCtrl.create).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Link in Zwischenablage kopiert!' }),
      );
    });
  });

  describe('Text-Export', () => {
    it('ruft shareText mit Rezept und Portionen auf', async () => {
      component.portions = 6;
      await component.shareText();

      expect(mockShareService.shareText).toHaveBeenCalledWith(testRecipe, 6);
      expect(mockToastCtrl.create).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Rezept geteilt!' }),
      );
      expect(mockModalCtrl.dismiss).toHaveBeenCalled();
    });

    it('kopiert Text bei copyText() in die Zwischenablage', async () => {
      component.portions = 2;
      await component.copyText();

      expect(mockShareService.formatAsText).toHaveBeenCalledWith(testRecipe, 2);
      expect(mockShareService.copyTextToClipboard).toHaveBeenCalledWith('Spaghetti Bolognese Text');
      expect(mockToastCtrl.create).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Rezepttext in Zwischenablage kopiert!' }),
      );
    });
  });

  describe('JSON-Export', () => {
    it('ruft shareJsonFile mit Foto-Flag auf', async () => {
      component.includePhotoInJson = true;
      await component.shareJson();

      expect(mockShareService.shareJsonFile).toHaveBeenCalledWith(testRecipe, true);
      expect(mockToastCtrl.create).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Rezeptdatei geteilt!' }),
      );
      expect(mockModalCtrl.dismiss).toHaveBeenCalled();
    });

    it('behandelt Download-Fallback mit passender Meldung', async () => {
      mockShareService.shareJsonFile = vi
        .fn()
        .mockResolvedValue({ success: true, method: 'download' });

      await component.shareJson();

      expect(mockToastCtrl.create).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Rezeptdatei heruntergeladen!' }),
      );
    });
  });

  describe('Drucken / PDF', () => {
    it('ruft printRecipe auf', () => {
      component.portions = 4;
      component.print();

      expect(mockShareService.printRecipe).toHaveBeenCalledWith(testRecipe, 4);
    });
  });
});
