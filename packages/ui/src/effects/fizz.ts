/**
 * Static for the CRT panels, after R&C1's menus: no constant grain; once every 1 to 20 seconds one visible
 * panel fizzes for about a second, the static fading in, flickering and dropping away. A panel draws the
 * tile set in --rac-fizz, at the offset in --rac-fizz-x and --rac-fizz-y (see RacPanel).
 */

export const PANEL_SELECTOR = '.rac-panel';

const TILE_SIZE = 128;

// Strength levels from faint to strong, and how many different tiles each has, so the grain is new on
// every flicker rather than one pattern sliding about.
const LEVELS = [12, 26, 46, 72];
const VARIANTS = 2;

/** Static tiles, VARIANTS per level, faint to strong; the stronger ones carry bright horizontal streaks. */
export function makeFizzTiles(): string[] {
  return LEVELS.flatMap((alpha) => Array.from({ length: VARIANTS }, () => alpha)).map((alpha) => {
    const canvas = document.createElement('canvas');
    canvas.width = TILE_SIZE;
    canvas.height = TILE_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'none';
    const image = ctx.createImageData(TILE_SIZE, TILE_SIZE);
    for (let i = 0; i < image.data.length; i += 4) {
      const value = 140 + Math.random() * 115;
      image.data[i] = value;
      image.data[i + 1] = value;
      image.data[i + 2] = value + 10;
      image.data[i + 3] = Math.random() < 0.5 ? 0 : alpha * (0.4 + Math.random() * 0.6);
    }
    for (let streak = 0; streak < alpha / 12; streak++) {
      const row = Math.floor(Math.random() * TILE_SIZE);
      const from = Math.floor(Math.random() * TILE_SIZE * 0.6);
      const to = Math.min(TILE_SIZE, from + 20 + Math.random() * TILE_SIZE * 0.5);
      for (let x = from; x < to; x++) {
        const i = (row * TILE_SIZE + x) * 4;
        image.data[i] = 225;
        image.data[i + 1] = 240;
        image.data[i + 2] = 250;
        image.data[i + 3] = Math.min(255, alpha * 1.8);
      }
    }
    ctx.putImageData(image, 0, 0);
    return `url(${canvas.toDataURL()})`;
  });
}

/** One burst on one panel: ramps up for a fifth of its time, flickers, and fades over the last third. */
export function fizzPanel(panel: HTMLElement, tiles: string[]): () => void {
  const started = performance.now();
  const duration = 800 + Math.random() * 500;
  const clear = (): void => {
    clearInterval(tick);
    panel.style.removeProperty('--rac-fizz');
  };
  const tick = setInterval(() => {
    const t = (performance.now() - started) / duration;
    if (t >= 1) {
      clear();
      return;
    }
    const envelope = Math.max(0, Math.min(1, t / 0.2, (1 - t) / 0.35));
    const levels = Math.max(1, Math.floor(tiles.length / VARIANTS));
    const level = Math.max(0, Math.min(levels - 1, Math.round(envelope * (levels - 1) + (Math.random() - 0.5) * 1.6)));
    const variant = Math.floor(Math.random() * Math.min(VARIANTS, tiles.length));
    const tile = tiles[Math.min(tiles.length - 1, level * VARIANTS + variant)] ?? 'none';
    panel.style.setProperty('--rac-fizz', Math.random() < 0.12 ? 'none' : tile);
    panel.style.setProperty('--rac-fizz-x', `${Math.floor(Math.random() * TILE_SIZE)}px`);
    panel.style.setProperty('--rac-fizz-y', `${Math.floor(Math.random() * TILE_SIZE)}px`);
  }, 40);
  return clear;
}

/** Fizzes a random visible panel under `root` every 1 to 20 seconds; returns the stop function. */
export function startFizzing(root: HTMLElement): () => void {
  const tiles = makeFizzTiles();
  let timer = 0;
  let stopBurst: (() => void) | null = null;
  const gap = (): number => 1000 + Math.random() * 19000;
  const next = (delay: number): void => {
    timer = window.setTimeout(() => {
      const panels = [...root.querySelectorAll<HTMLElement>(PANEL_SELECTOR)].filter((p) => p.offsetParent !== null);
      const panel = panels[Math.floor(Math.random() * panels.length)];
      if (panel && !document.hidden) stopBurst = fizzPanel(panel, tiles);
      next(gap());
    }, delay);
  };
  next(gap());
  return () => {
    clearTimeout(timer);
    stopBurst?.();
  };
}
