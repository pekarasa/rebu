import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { Style } from '@capacitor/status-bar';
import { ActionSheetController, AlertController, ModalController, Platform } from '@ionic/angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlatformService } from './platform.service';

describe('PlatformService', () => {
  let service: PlatformService;
  let router: Router;

  let mockPlatform: {
    is: ReturnType<typeof vi.fn>;
    backButton: {
      subscribeWithPriority: ReturnType<typeof vi.fn>;
    };
  };

  let mockModalCtrl: {
    getTop: ReturnType<typeof vi.fn>;
  };

  let mockAlertCtrl: {
    getTop: ReturnType<typeof vi.fn>;
  };

  let mockActionSheetCtrl: {
    getTop: ReturnType<typeof vi.fn>;
  };

  let mockAppPlugin: {
    exitApp: ReturnType<typeof vi.fn>;
  };

  let mockStatusBarPlugin: {
    setStyle: ReturnType<typeof vi.fn>;
    setBackgroundColor: ReturnType<typeof vi.fn>;
    setOverlaysWebView: ReturnType<typeof vi.fn>;
  };

  let backButtonCallback: (processNextHandler?: () => void) => Promise<void>;

  beforeEach(() => {
    mockPlatform = {
      is: vi.fn(),
      backButton: {
        subscribeWithPriority: vi.fn((_priority, cb) => {
          backButtonCallback = cb;
          return { unsubscribe: vi.fn() };
        }),
      },
    };

    mockModalCtrl = { getTop: vi.fn().mockResolvedValue(null) };
    mockAlertCtrl = { getTop: vi.fn().mockResolvedValue(null) };
    mockActionSheetCtrl = { getTop: vi.fn().mockResolvedValue(null) };

    mockAppPlugin = {
      exitApp: vi.fn().mockResolvedValue(undefined),
    };

    mockStatusBarPlugin = {
      setStyle: vi.fn().mockResolvedValue(undefined),
      setBackgroundColor: vi.fn().mockResolvedValue(undefined),
      setOverlaysWebView: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        PlatformService,
        { provide: Platform, useValue: mockPlatform },
        { provide: ModalController, useValue: mockModalCtrl },
        { provide: AlertController, useValue: mockAlertCtrl },
        { provide: ActionSheetController, useValue: mockActionSheetCtrl },
        {
          provide: Router,
          useValue: {
            url: '/recipes',
            navigate: vi.fn().mockResolvedValue(true),
          },
        },
      ],
    });

    service = TestBed.inject(PlatformService);
    router = TestBed.inject(Router);

    service.appPlugin = mockAppPlugin as unknown as typeof service.appPlugin;
    service.statusBarPlugin = mockStatusBarPlugin as unknown as typeof service.statusBarPlugin;
  });

  it('erkennt Android- und iOS-Plattformen über Platform.is', () => {
    mockPlatform.is.mockImplementation((p: string) => p === 'android');
    expect(service.isAndroid()).toBe(true);
    expect(service.isIos()).toBe(false);

    mockPlatform.is.mockImplementation((p: string) => p === 'ios');
    expect(service.isAndroid()).toBe(false);
    expect(service.isIos()).toBe(true);
  });

  describe('StatusBar', () => {
    it('wendet StatusBar-Stil für Dark- und Light-Mode an', async () => {
      await service.applyStatusBarStyle(true);
      expect(mockStatusBarPlugin.setStyle).toHaveBeenCalledWith({ style: Style.Dark });
      expect(mockStatusBarPlugin.setBackgroundColor).toHaveBeenCalledWith({ color: '#121212' });
      expect(mockStatusBarPlugin.setOverlaysWebView).toHaveBeenCalledWith({ overlay: false });

      await service.applyStatusBarStyle(false);
      expect(mockStatusBarPlugin.setStyle).toHaveBeenCalledWith({ style: Style.Light });
      expect(mockStatusBarPlugin.setBackgroundColor).toHaveBeenCalledWith({ color: '#ffffff' });
    });

    it('überspringt setupStatusBar im Browser/Nicht-Native', async () => {
      vi.spyOn(service, 'isNative').mockReturnValue(false);
      await service.setupStatusBar();
      expect(mockStatusBarPlugin.setStyle).not.toHaveBeenCalled();
    });

    it('initialisiert StatusBar wenn in nativer Umgebung', async () => {
      vi.spyOn(service, 'isNative').mockReturnValue(true);
      await service.setupStatusBar();
      expect(mockStatusBarPlugin.setStyle).toHaveBeenCalled();
    });
  });

  describe('Hardware Back Button', () => {
    it('schließt das oberste Modal, wenn ein Modal geöffnet ist', async () => {
      service.setupHardwareBackButton();

      const mockModal = { dismiss: vi.fn().mockResolvedValue(true) };
      mockModalCtrl.getTop.mockResolvedValueOnce(mockModal);

      await backButtonCallback();

      expect(mockModal.dismiss).toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
      expect(mockAppPlugin.exitApp).not.toHaveBeenCalled();
    });

    it('schließt den obersten Alert, wenn kein Modal aber ein Alert geöffnet ist', async () => {
      service.setupHardwareBackButton();

      const mockAlert = { dismiss: vi.fn().mockResolvedValue(true) };
      mockAlertCtrl.getTop.mockResolvedValueOnce(mockAlert);

      await backButtonCallback();

      expect(mockAlert.dismiss).toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('navigiert zurück zu /recipes, wenn keine Overlays offen sind und Route nicht die Hauptliste ist', async () => {
      (router as any).url = '/recipes/123/edit';
      service.setupHardwareBackButton();

      await backButtonCallback();

      expect(router.navigate).toHaveBeenCalledWith(['/recipes']);
      expect(mockAppPlugin.exitApp).not.toHaveBeenCalled();
    });

    it('beendet die App via App.exitApp, wenn auf der Hauptliste (/recipes)', async () => {
      (router as any).url = '/recipes';
      service.setupHardwareBackButton();

      await backButtonCallback();

      expect(mockAppPlugin.exitApp).toHaveBeenCalled();
    });
  });

  it('bereinigt Event-Listener beim Aufruf von destroy()', () => {
    service.setupHardwareBackButton();
    expect(() => service.destroy()).not.toThrow();
  });
});
