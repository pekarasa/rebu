import { TestBed } from '@angular/core/testing';
import { Camera } from '@capacitor/camera';
import { Filesystem } from '@capacitor/filesystem';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PhotoService } from './photo.service';

describe('PhotoService', () => {
  let service: PhotoService;
  let mockCamera: {
    getPhoto: ReturnType<typeof vi.fn>;
  };
  let mockFilesystem: {
    writeFile: ReturnType<typeof vi.fn>;
    readFile: ReturnType<typeof vi.fn>;
    deleteFile: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockCamera = {
      getPhoto: vi.fn(),
    };
    mockFilesystem = {
      writeFile: vi.fn().mockResolvedValue({ uri: 'file:///path' }),
      readFile: vi.fn().mockResolvedValue({ data: 'mockbase64' }),
      deleteFile: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [PhotoService],
    });
    service = TestBed.inject(PhotoService);
    service.camera = mockCamera as unknown as typeof Camera;
    service.filesystem = mockFilesystem as unknown as typeof Filesystem;
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
    const dataUrl = 'data:image/jpeg;base64,testdata';

    const result = await service.saveDataUrl(dataUrl);
    expect(result.displayUrl).toBe(dataUrl);
    expect(result.filePath).toMatch(/^recipe-photos\/[0-9a-f-]+\.jpg$/);
    expect(mockFilesystem.writeFile).toHaveBeenCalledTimes(1);
  });

  it('liest Datei aus dem Dateisystem und formatiert DataUrl', async () => {
    const result = await service.getPhotoDisplayUrl('recipe-photos/photo.jpg');
    expect(result).toBe('data:image/jpeg;base64,mockbase64');
    expect(mockFilesystem.readFile).toHaveBeenCalledTimes(1);
  });

  it('bricht pickOrTakePhoto sauber ab bei Fehler oder Abbruch', async () => {
    mockCamera.getPhoto.mockRejectedValue(new Error('User cancelled'));

    const result = await service.pickOrTakePhoto();
    expect(result).toBeNull();
  });

  it('nimmt Foto erfolgreich auf und speichert es', async () => {
    mockCamera.getPhoto.mockResolvedValue({
      dataUrl: 'data:image/jpeg;base64,cameraImage',
      format: 'jpeg',
      saved: false,
    });
    mockFilesystem.writeFile.mockResolvedValue({ uri: 'file:///saved' });

    const result = await service.pickOrTakePhoto();
    expect(result).not.toBeNull();
    expect(result?.displayUrl).toBe('data:image/jpeg;base64,cameraImage');
  });

  it('löscht Datei aus dem Dateisystem', async () => {
    await service.deletePhoto('recipe-photos/photo.jpg');
    expect(mockFilesystem.deleteFile).toHaveBeenCalledTimes(1);
  });
});
