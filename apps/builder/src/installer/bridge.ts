import type { Transport } from './client';
import type { Platform } from '../platform/platform';

/**
 * The browser's end of the development bridge (vite/installerBridge.ts): the real installer program,
 * started by the dev server for this tab, reached over server-sent events and POSTs. Commands are posted
 * one after another, so they reach the installer in the order sent.
 */
export class BridgeTransport implements Transport {
  private readonly session = crypto.randomUUID();
  private source: EventSource | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private closed: () => void = () => {};

  /** `onStderr` gets what the installer prints besides the protocol, and its exit. */
  constructor(private readonly onStderr: (line: string) => void = () => {}) {}

  onLine(listener: (line: string) => void): void {
    this.source = new EventSource(`/__installer/events?session=${this.session}`);
    this.source.onmessage = (event: MessageEvent<string>) => listener(event.data);
    this.source.addEventListener('stderr', (event) => this.onStderr((event as MessageEvent<string>).data));
    this.source.addEventListener('exit', (event) => {
      this.onStderr(`the installer exited (${(event as MessageEvent<string>).data})`);
      this.source?.close();
      this.closed();
    });
  }

  onClose(listener: () => void): void {
    this.closed = listener;
  }

  send(line: string): void {
    this.queue = this.queue.then(() => fetch(`/__installer/send?session=${this.session}`, { method: 'POST', body: line }));
  }

  close(): void {
    this.source?.close();
  }
}

/**
 * The platform with the bridge: real paths from the system's file dialog (on Windows) and Explorer for
 * "Show in folder". A browser gives dropped files no path, so drops do nothing, and there is no DVD drive.
 */
export const bridgePlatform: Platform = {
  async pickImages() {
    const response = await fetch('/__installer/pick', { method: 'POST' });
    return response.ok ? ((await response.json()) as string[]) : [];
  },
  droppedImages() {
    return [];
  },
  async showInFolder(path) {
    await fetch('/__installer/reveal', { method: 'POST', body: path });
  },
};
