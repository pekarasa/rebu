import { vi } from 'vitest';

// Polyfills for running unit tests under jsdom (the default Vitest environment).
// Ionic components such as ion-menu and ion-split-pane query `window.matchMedia`,
// which jsdom does not implement.
if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

// Global singleton mocks for native Capacitor plugins so that all files share the exact same mock instances
const mockCamera = {
  getPhoto: vi.fn(),
};

const mockFilesystem = {
  writeFile: vi.fn().mockResolvedValue({ uri: 'file:///mock' }),
  readFile: vi.fn().mockResolvedValue({ data: 'mockbase64' }),
  deleteFile: vi.fn().mockResolvedValue(undefined),
};

vi.mock('@capacitor/camera', () => ({
  Camera: mockCamera,
  CameraResultType: {
    DataUrl: 'dataUrl',
  },
  CameraSource: {
    Prompt: 'prompt',
  },
}));

vi.mock('@capacitor/filesystem', () => ({
  Filesystem: mockFilesystem,
  Directory: {
    Data: 'DATA',
  },
}));
