import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { open } from '@tauri-apps/plugin-dialog';
import { revealItemInDir } from '@tauri-apps/plugin-opener';
import type { Transport } from '../installer/client';
import type { Platform } from './platform';

/** Whether the page runs inside the desktop shell. */
export function inDesktopShell(): boolean {
  return '__TAURI_INTERNALS__' in window;
}

/**
 * The installer as the desktop shell runs it (src-tauri/src/lib.rs): the page listens for its lines,
 * then asks the shell to start it, so even its first line, `ready`, arrives. Commands go one after
 * another, in the order sent.
 */
export class TauriTransport implements Transport {
  private readonly unlisten: UnlistenFn[] = [];
  private queue: Promise<unknown> = Promise.resolve();
  private closed: (reason?: string) => void = () => {};

  /** `onStderr` gets what the installer prints besides the protocol. */
  constructor(private readonly onStderr: (line: string) => void = () => {}) {}

  onLine(listener: (line: string) => void): void {
    void (async () => {
      this.unlisten.push(
        await listen<string>('installer://line', (event) => listener(event.payload)),
        await listen<string>('installer://stderr', (event) => this.onStderr(event.payload)),
        await listen<number | null>('installer://exit', (event) => {
          this.onStderr(`the installer exited (${event.payload ?? 'no exit code'})`);
          this.closed();
        }),
      );
      try {
        await invoke('installer_start');
      } catch (error) {
        this.closed(String(error));
      }
    })();
  }

  onClose(listener: (reason?: string) => void): void {
    this.closed = listener;
  }

  send(line: string): void {
    this.queue = this.queue.then(() => invoke('installer_send', { line })).catch((error: unknown) => this.closed(String(error)));
  }

  close(): void {
    this.unlisten.forEach((stop) => stop());
  }
}

/**
 * The computer through the desktop shell: the system's file dialog, Explorer or Finder for the finished
 * image, and drops with their real paths. Reading a DVD isn't there yet.
 */
export const tauriPlatform: Platform = {
  async pickImages() {
    const chosen = await open({
      title: 'Choose disc images',
      multiple: true,
      filters: [{ name: 'Disc images', extensions: ['iso', 'bin', 'img'] }],
    });
    return chosen ?? [];
  },

  watchDrops({ hover, drop }) {
    let stopped = false;
    let stop: UnlistenFn = () => {};
    void getCurrentWebview()
      .onDragDropEvent(({ payload }) => {
        if (payload.type === 'enter' || payload.type === 'over') hover(true);
        else if (payload.type === 'leave') hover(false);
        else {
          hover(false);
          if (payload.paths.length) drop(payload.paths);
        }
      })
      .then((unlisten) => (stopped ? unlisten() : (stop = unlisten)));
    return () => {
      stopped = true;
      stop();
    };
  },

  async showInFolder(path) {
    await revealItemInDir(path);
  },
};
