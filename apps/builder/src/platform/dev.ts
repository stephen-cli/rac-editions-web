import type { Platform } from './platform';

/**
 * The platform while the builder runs in a browser (`pnpm dev`): a browser gives no file paths, so the
 * file dialog and drops yield file names, which the fake installer recognises; the DVD drive is simulated
 * and always holds the game the player reads it for.
 */
const DEV_FOLDER = 'D:\\Games\\PS2\\';
const DVD_IMAGES = { rac1: 'Ratchet & Clank (Europe).iso', rac2: 'Ratchet & Clank - Going Commando (USA).iso' };

export const devPlatform: Platform = {
  pickImages() {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.iso,.bin,.img';
      input.multiple = true;
      input.addEventListener('change', () => resolve([...(input.files ?? [])].map((file) => DEV_FOLDER + file.name)));
      input.addEventListener('cancel', () => resolve([]));
      input.click();
    });
  },

  droppedImages(event) {
    return [...(event.dataTransfer?.files ?? [])].map((file) => DEV_FOLDER + file.name);
  },

  readDvd(onProgress, expecting) {
    return new Promise((resolve) => {
      const started = performance.now();
      const timer = setInterval(() => {
        const fraction = Math.min(1, (performance.now() - started) / 4000);
        onProgress(fraction);
        if (fraction < 1) return;
        clearInterval(timer);
        resolve(DEV_FOLDER + DVD_IMAGES[expecting]);
      }, 50);
    });
  },

  async showInFolder(path) {
    console.info(`Show in folder: ${path}`);
  },
};
