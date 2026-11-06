import type { DiscKey } from '../installer/protocol';

/**
 * What the builder needs from the computer it runs on: picking disc images, reading the game DVD in the
 * drive, and showing the finished image in its folder. The desktop shell (Tauri) provides the real one;
 * devPlatform stands in while the builder runs in a browser.
 */
export interface Platform {
  /** Asks for disc images with the system's file dialog; returns their paths, or none if cancelled. */
  pickImages(): Promise<string[]>;
  /** The paths of files dropped on the window. */
  droppedImages(event: DragEvent): string[];
  /**
   * Copies the DVD in the computer's drive to an image and returns its path; absent where that can't be
   * done. `expecting` is the game the player is reading the drive for; a real drive reads whatever disc
   * is in it.
   */
  readDvd?: (onProgress: (fraction: number) => void, expecting: DiscKey) => Promise<string>;
  /** Opens the folder holding `path` with the file selected. */
  showInFolder(path: string): Promise<void>;
}

/** The default name for a new image, beside the base disc's image. */
export function defaultOutputPath(basePath: string, game: string, editionName: string): string {
  const cut = Math.max(basePath.lastIndexOf('\\'), basePath.lastIndexOf('/'));
  const folder = cut >= 0 ? basePath.slice(0, cut + 1) : '';
  return `${folder}${game} - ${editionName}.iso`;
}

/** The file name at the end of a path. */
export function fileName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}
