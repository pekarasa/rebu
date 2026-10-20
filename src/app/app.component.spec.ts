import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ModalController, ToastController } from '@ionic/angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppComponent } from './app.component';
import { ImportedRecipeDraft, ImportService } from './core/import.service';
import { PlatformService } from './core/platform.service';
import { ImportModalComponent } from './features/import/import-modal.component';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let router: Router;

  let mockModalCtrl: {
    create: ReturnType<typeof vi.fn>;
  };
  let mockToastCtrl: {
    create: ReturnType<typeof vi.fn>;
  };
  let mockImportService: {
    parseImportSource: ReturnType<typeof vi.fn>;
  };
  let mockPlatformService: {
    initialize: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
  };
  let mockAppPlugin: {
    addListener: ReturnType<typeof vi.fn>;
  };
  let mockFilesystemPlugin: {
    readFile: ReturnType<typeof vi.fn>;
  };

  const sampleDraft: ImportedRecipeDraft = {
    id: 'deep-link-recipe-id',
    titel: 'Deep-Link Pfannkuchen',
    portionen: 4,
    zeitVorbereitung: 10,
    zeitKochen: 15,
    kategorie: null,
    notizen: null,
    fotoBase64: null,
    saisonMonate: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    khTag: 'Brot / Teig',
    zutaten: [{ reihenfolge: 1, menge: 200, einheit: 'g', name: 'Mehl' }],
    schritte: [{ reihenfolge: 1, text: 'Teig anrühren und ausbacken.' }],
  };

  beforeEach(async () => {
    mockModalCtrl = {
      create: vi.fn().mockResolvedValue({
        present: vi.fn().mockResolvedValue(undefined),
        onWillDismiss: vi.fn().mockResolvedValue({
          data: { imported: true, recipeId: 'deep-link-recipe-id', count: 1 },
        }),
      }),
    };

    mockToastCtrl = {
      create: vi.fn().mockResolvedValue({
        present: vi.fn().mockResolvedValue(undefined),
      }),
    };

    mockImportService = {
      parseImportSource: vi.fn().mockReturnValue({
        success: true,
        recipes: [sampleDraft],
      }),
    };

    mockPlatformService = {
      initialize: vi.fn().mockResolvedValue(undefined),
      destroy: vi.fn(),
    };

    const mockListenerHandle = {
      remove: vi.fn().mockResolvedValue(undefined),
    };

    mockAppPlugin = {
      addListener: vi.fn().mockResolvedValue(mockListenerHandle),
    };

    mockFilesystemPlugin = {
      readFile: vi.fn().mockResolvedValue({ data: '{"app":"rebu"}' }),
    };

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        { provide: ModalController, useValue: mockModalCtrl },
        { provide: ToastController, useValue: mockToastCtrl },
        { provide: ImportService, useValue: mockImportService },
        { provide: PlatformService, useValue: mockPlatformService },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    component.appPlugin = mockAppPlugin as unknown as typeof component.appPlugin;
    component.filesystemPlugin =
      mockFilesystemPlugin as unknown as typeof component.filesystemPlugin;
  });

  it('erzeugt die App und registriert den appUrlOpen-Listener', async () => {
    await component.ngOnInit();
    expect(component).toBeTruthy();
    expect(mockPlatformService.initialize).toHaveBeenCalled();
    expect(mockAppPlugin.addListener).toHaveBeenCalledWith('appUrlOpen', expect.any(Function));
  });

  it('öffnet das ImportModalComponent wenn ein gültiger Deep-Link empfangen wird', async () => {
    await component.ngOnInit();

    // Callback aus dem addListener-Aufruf extrahieren
    const listenerCallback = mockAppPlugin.addListener.mock.calls[0][1];
    await listenerCallback({ url: 'rebu://recipe?data=base64string' });

    expect(mockImportService.parseImportSource).toHaveBeenCalledWith(
      'rebu://recipe?data=base64string',
    );
    expect(mockModalCtrl.create).toHaveBeenCalledWith(
      expect.objectContaining({
        component: ImportModalComponent,
        componentProps: { drafts: [sampleDraft] },
      }),
    );
    expect(router.navigate).toHaveBeenCalledWith(['/recipes', 'deep-link-recipe-id']);
  });

  it('liest den Dateiinhalt über Filesystem, wenn eine content:// oder file:// URL übergeben wird', async () => {
    await component.ngOnInit();

    const listenerCallback = mockAppPlugin.addListener.mock.calls[0][1];
    await listenerCallback({
      url: 'content://com.android.providers.downloads.documents/document/12',
    });

    expect(mockFilesystemPlugin.readFile).toHaveBeenCalledWith({
      path: 'content://com.android.providers.downloads.documents/document/12',
    });
    expect(mockImportService.parseImportSource).toHaveBeenCalledWith('{"app":"rebu"}');
    expect(mockModalCtrl.create).toHaveBeenCalled();
  });

  it('zeigt einen Fehler-Toast wenn der Deep-Link ungültig ist', async () => {
    mockImportService.parseImportSource.mockReturnValueOnce({
      success: false,
      error: 'Ungültiger Link',
      recipes: [],
    });

    await component.ngOnInit();
    const listenerCallback = mockAppPlugin.addListener.mock.calls[0][1];
    await listenerCallback({ url: 'rebu://recipe?data=defekt' });

    expect(mockToastCtrl.create).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Ungültiger Link',
        color: 'danger',
      }),
    );
    expect(mockModalCtrl.create).not.toHaveBeenCalled();
  });

  it('entfernt Listener und Subscriptions bei ngOnDestroy', async () => {
    await component.ngOnInit();

    const listenerHandle = await mockAppPlugin.addListener.mock.results[0].value;
    component.ngOnDestroy();

    expect(mockPlatformService.destroy).toHaveBeenCalled();
    expect(listenerHandle.remove).toHaveBeenCalled();
  });
});
