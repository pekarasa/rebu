import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { KeepAwakeService } from './keep-awake.service';

describe('KeepAwakeService', () => {
  let service: KeepAwakeService;
  let mockPlugin: {
    keepAwake: ReturnType<typeof vi.fn>;
    allowSleep: ReturnType<typeof vi.fn>;
    isSupported: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockPlugin = {
      keepAwake: vi.fn().mockResolvedValue(undefined),
      allowSleep: vi.fn().mockResolvedValue(undefined),
      isSupported: vi.fn().mockResolvedValue({ isSupported: true }),
    };

    TestBed.configureTestingModule({
      providers: [KeepAwakeService],
    });
    service = TestBed.inject(KeepAwakeService);
    service.keepAwakePlugin = mockPlugin as unknown as typeof service.keepAwakePlugin;
  });

  it('startet mit isActive = false', () => {
    expect(service.isActive).toBe(false);
  });

  describe('enable', () => {
    it('ruft keepAwake auf und setzt isActive = true', async () => {
      const result = await service.enable();

      expect(mockPlugin.keepAwake).toHaveBeenCalledTimes(1);
      expect(result).toBe(true);
      expect(service.isActive).toBe(true);
    });

    it('fängt Fehler ab und gibt false zurück', async () => {
      mockPlugin.keepAwake.mockRejectedValueOnce(new Error('Not supported on web'));

      const result = await service.enable();

      expect(result).toBe(false);
      expect(service.isActive).toBe(false);
    });
  });

  describe('disable', () => {
    it('ruft allowSleep auf und setzt isActive = false', async () => {
      // Zuerst aktivieren
      await service.enable();
      expect(service.isActive).toBe(true);

      const result = await service.disable();

      expect(mockPlugin.allowSleep).toHaveBeenCalledTimes(1);
      expect(result).toBe(true);
      expect(service.isActive).toBe(false);
    });

    it('fängt Fehler ab und gibt false zurück', async () => {
      mockPlugin.allowSleep.mockRejectedValueOnce(new Error('Failure'));

      const result = await service.disable();

      expect(result).toBe(false);
    });
  });

  describe('isSupported', () => {
    it('gibt true zurück wenn vom Plugin unterstützt', async () => {
      mockPlugin.isSupported.mockResolvedValueOnce({ isSupported: true });

      const supported = await service.isSupported();

      expect(supported).toBe(true);
    });

    it('gibt false zurück wenn nicht unterstützt', async () => {
      mockPlugin.isSupported.mockResolvedValueOnce({ isSupported: false });

      const supported = await service.isSupported();

      expect(supported).toBe(false);
    });

    it('gibt false zurück wenn isSupported einen Fehler wirft', async () => {
      mockPlugin.isSupported.mockRejectedValueOnce(new Error('Unknown error'));

      const supported = await service.isSupported();

      expect(supported).toBe(false);
    });
  });
});
