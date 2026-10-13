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

// Global mocks for native Capacitor plugins that require device APIs not present in jsdom
vi.mock('@capacitor/camera', () => ({
  Camera: {
    getPhoto: vi.fn(),
  },
  CameraResultType: {
    DataUrl: 'dataUrl',
  },
  CameraSource: {
    Prompt: 'prompt',
  },
}));

vi.mock('@capacitor/filesystem', () => ({
  Filesystem: {
    writeFile: vi.fn(),
    readFile: vi.fn(),
    deleteFile: vi.fn(),
  },
  Directory: {
    Data: 'DATA',
  },
}));
