import type { DiscKey } from '../installer/protocol';

/** A finished build, for the Edition step to point back to. */
export interface LastBuild {
  edition: string;
  path: string;
  sha256: string;
  /** When it finished, as an ISO 8601 time. */
  at: string;
}

/** What the builder keeps between runs: the player's discs, output and settings, and the last build. */
export interface Remembered {
  edition?: string;
  discs?: Partial<Record<DiscKey, string>>;
  output?: { mode: 'new' | 'in_place'; path: string; pathEdited: boolean };
  /** Each edition's settings, by edition id. */
  settings?: Record<string, { switches: Record<string, boolean>; economy: string }>;
  lastBuild?: LastBuild;
}

export interface Memory {
  load(): Remembered;
  save(remembered: Remembered): void;
}

/**
 * The webview's own storage, under `name`: the desktop shell keeps it in the app's data folder between
 * runs. Storage that can't be read or written (a private window, say) only means nothing is remembered.
 */
export function webMemory(name: string): Memory {
  const key = `rac-editions-builder:${name}`;
  return {
    load() {
      try {
        return (JSON.parse(localStorage.getItem(key) ?? '{}') as Remembered | null) ?? {};
      } catch {
        return {};
      }
    },
    save(remembered) {
      try {
        localStorage.setItem(key, JSON.stringify(remembered));
      } catch {
        // Nothing remembered this time.
      }
    },
  };
}
