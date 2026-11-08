import type { DiscKey } from '../installer/protocol';

/**
 * What the builder needs from the computer it runs on: picking disc images, reading the game DVD in the
 * drive, and showing the finished image in its folder. The desktop shell (Tauri) provides the real one;
 * devPlatform stands in while the builder runs in a browser.
 */
export interface Platform {
  /** Asks for disc images with the system's file dialog; returns their paths, or none if cancelled. */
  pickImages(): Promise<string[]>;
  /**
   * Watches for files dragged over and dropped anywhere on the window: `hover` says whether something is
   * being dragged over it, `drop` gets the dropped files' paths. Returns the function that stops watching.
   */
  watchDrops(handlers: DropHandlers): () => void;
  /**
   * Copies the DVD in the computer's drive to an image and returns its path; absent where that can't be
   * done. `expecting` is the game the player is reading the drive for; a real drive reads whatever disc
   * is in it.
   */
  readDvd?: (onProgress: (fraction: number) => void, expecting: DiscKey) => Promise<string>;
  /** Asks for a folder with the system's folder dialog; returns its path, or null if cancelled. */
  pickFolder?: (title: string) => Promise<string | null>;
  /** Opens the folder holding `path` with the file selected. */
  showInFolder(path: string): Promise<void>;
}

export interface DropHandlers {
  hover: (over: boolean) => void;
  drop: (paths: string[]) => void;
}

/**
 * Drops through the page's own drag events, which give files but no paths; `pathOf` makes one from a
 * file, or null for none. The page never opens a dropped file itself.
 */
export function watchPageDrops({ hover, drop }: DropHandlers, pathOf: (file: File) => string | null): () => void {
  const over = (event: DragEvent) => {
    event.preventDefault();
    hover(true);
  };
  // Leaving the window, not just moving between elements: no element is being entered.
  const leave = (event: DragEvent) => {
    if (!event.relatedTarget) hover(false);
  };
  const dropped = (event: DragEvent) => {
    event.preventDefault();
    hover(false);
    const paths = [...(event.dataTransfer?.files ?? [])].map(pathOf).filter((path) => path !== null);
    if (paths.length) drop(paths);
  };
  window.addEventListener('dragover', over);
  window.addEventListener('dragleave', leave);
  window.addEventListener('drop', dropped);
  return () => {
    window.removeEventListener('dragover', over);
    window.removeEventListener('dragleave', leave);
    window.removeEventListener('drop', dropped);
  };
}

/** The default file name for a new image. */
export function defaultFileName(game: string, editionName: string): string {
  return `${game} ${editionName}.iso`;
}

/** The folder part of a path, with its trailing separator; empty for a bare file name. */
export function folderOf(path: string): string {
  const cut = Math.max(path.lastIndexOf('\\'), path.lastIndexOf('/'));
  return cut >= 0 ? path.slice(0, cut + 1) : '';
}

/** `name` in `folder`, joined with the separator the folder already uses. */
export function inFolder(folder: string, name: string): string {
  if (/[\\/]$/.test(folder)) return folder + name;
  const separator = folder.includes('/') && !folder.includes('\\') ? '/' : '\\';
  return `${folder}${separator}${name}`;
}

/** The default path for a new image: beside the base disc's image. */
export function defaultOutputPath(basePath: string, game: string, editionName: string): string {
  return folderOf(basePath) + defaultFileName(game, editionName);
}

/** The file name at the end of a path. */
export function fileName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

/**
 * What's wrong with a path for the new image, in the player's words; empty if nothing the builder can see
 * is. Whether its folder can be written to, and has room, is the installer's to say (its plan checks).
 */
export function outputPathProblem(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return 'Enter where to save the new image.';
  // A drive (C:\), a network share (\\server\) or a root (/).
  if (!/^([a-z]:[\\/]|\\\\|\/)/i.test(trimmed)) return 'Enter the full path, starting with the drive, such as C:\\Games\\Edition.iso.';
  const name = fileName(trimmed);
  if (!/\.iso$/i.test(name)) return 'End the path with a file name for the image, such as Edition.iso.';
  if (name.length === '.iso'.length) return 'Give the image a name before .iso.';
  if (/[<>:"|?*]/.test(name)) return 'A file name can\'t contain < > : " | ? or *.';
  return '';
}
