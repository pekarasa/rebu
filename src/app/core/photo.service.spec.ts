import { TestBed } from '@angular/core/testing';
import { Camera } from '@capacitor/camera';
import { Filesystem } from '@capacitor/filesystem';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PhotoService } from './photo.service';

describe('PhotoService', () => {
  let service: PhotoService;

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [PhotoService],
    });
    service = TestBed.inject(PhotoService);
  });

  it('gibt null zurück wenn filePath null ist', async () => {
    expect(await service.getPhotoDisplayUrl(null)).toBeNull();
  });

  it('gibt data: URL direkt zurück ohne Filesystem-Zugriff', async () => {
    const dataUrl = 'data:image/jpeg;base64,abc123xyz';
    const result = await service.getPhotoDisplayUrl(dataUrl);
    expect(result).toBe(dataUrl);
  });

  it('speichert dataUrl im Dateisystem und liefert Pfad und Url', async () => {
    vi.mocked(Filesystem.writeFile).mockResolvedValue({ uri: 'file:///path' });
    const dataUrl = 'data:image/jpeg;base64,testdata';

    const result = await service.saveDataUrl(dataUrl);
    expect(result.displayUrl).toBe(dataUrl);
    expect(result.filePath).toMatch(/^recipe-photos\/[0-9a-f-]+\.jpg$/);
    expect(Filesystem.writeFile).toHaveBeenCalledTimes(1);
  });

  it('liest Datei aus dem Dateisystem und formatiert DataUrl', async () => {
    vi.mocked(Filesystem.readFile).mockResolvedValue({ data: 'mockbase64' });

    const result = await service.getPhotoDisplayUrl('recipe-photos/photo.jpg');
    expect(result).toBe('data:image/jpeg;base64,mockbase64');
  });

  it('bricht pickOrTakePhoto sauber ab bei Fehler oder Abbruch', async () => {
    vi.mocked(Camera.getPhoto).mockRejectedValue(new Error('User cancelled'));

    const result = await service.pickOrTakePhoto();
    expect(result).toBeNull();
  });

  it('nimmt Foto erfolgreich auf und speichert es', async () => {
    vi.mocked(Camera.getPhoto).mockResolvedValue({
      dataUrl: 'data:image/jpeg;base64,cameraImage',
      format: 'jpeg',
      saved: false,
    });
    vi.mocked(Filesystem.writeFile).mockResolvedValue({ uri: 'file:///saved' });

    const result = await service.pickOrTakePhoto();
    expect(result).not.toBeNull();
    expect(result?.displayUrl).toBe('data:image/jpeg;base64,cameraImage');
  });

  it('löscht Datei aus dem Dateisystem', async () => {
    vi.mocked(Filesystem.deleteFile).mockResolvedValue(undefined as never);
    await service.deletePhoto('recipe-photos/photo.jpg');
    expect(Filesystem.deleteFile).toHaveBeenCalledTimes(1);
  });
});
