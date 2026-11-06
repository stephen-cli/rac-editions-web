import {
  PROTOCOL,
  type BuildRequest,
  type Built,
  type Command,
  type Edition,
  type ErrorCode,
  type Identified,
  type InstallerEvent,
  type Plan,
  type Stage,
} from './protocol';

/** A line-based connection to an installer: the real program (through the desktop shell) or the fake. */
export interface Transport {
  send(line: string): void;
  onLine(listener: (line: string) => void): void;
  /** Called if the installer stops (exits, crashes or can't start), with why; every command still waiting then fails. */
  onClose?(listener: (reason?: string) => void): void;
  close(): void;
}

export class InstallerError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'InstallerError';
  }
}

export interface Progress {
  stage: Stage;
  done: number;
  total: number;
}

interface Pending {
  resolve: (value: unknown) => void;
  reject: (error: InstallerError) => void;
  onProgress?: (progress: Progress) => void;
  onLog?: (text: string) => void;
}

/**
 * The builder's side of the protocol: sends commands, routes each event to the command it answers, and
 * turns results and errors into promises. Stdout carries only protocol lines; anything unparsable is
 * reported as a log line of no command rather than thrown.
 */
export class InstallerClient {
  /** The installer's version, once it has said it is ready and speaks this protocol. */
  readonly ready: Promise<string>;
  private readonly pending = new Map<string, Pending>();
  private nextId = 1;
  private markReady!: (version: string) => void;
  private failReady!: (error: InstallerError) => void;

  constructor(private readonly transport: Transport) {
    this.ready = new Promise((resolve, reject) => {
      this.markReady = resolve;
      this.failReady = reject;
    });
    transport.onLine((line) => this.receive(line));
    transport.onClose?.((reason) => this.stopped(reason));
  }

  editions(): Promise<Edition[]> {
    return this.request({ id: this.id(), cmd: 'editions' }) as Promise<Edition[]>;
  }

  identify(path: string, onProgress?: (progress: Progress) => void): Promise<Identified> {
    return this.request({ id: this.id(), cmd: 'identify', path }, { onProgress }) as Promise<Identified>;
  }

  plan(request: BuildRequest): Promise<Plan> {
    return this.request({ id: this.id(), cmd: 'plan', ...request }) as Promise<Plan>;
  }

  /** Starts a build; `id` is what cancel() takes. */
  build(
    request: BuildRequest,
    handlers: { onProgress?: (progress: Progress) => void; onLog?: (text: string) => void } = {},
  ): { id: string; result: Promise<Built> } {
    const id = this.id();
    return { id, result: this.request({ id, cmd: 'build', ...request }, handlers) as Promise<Built> };
  }

  /** Asks a running build to stop; the build then ends with the error code "cancelled". */
  cancel(buildId: string): Promise<{ cancelling: boolean }> {
    return this.request({ id: this.id(), cmd: 'cancel', of: buildId }) as Promise<{ cancelling: boolean }>;
  }

  close(): void {
    this.transport.close();
  }

  private id(): string {
    return String(this.nextId++);
  }

  private async request(command: Command, handlers: Omit<Pending, 'resolve' | 'reject'> = {}): Promise<unknown> {
    await this.ready;
    return new Promise((resolve, reject) => {
      this.pending.set(command.id, { resolve, reject, ...handlers });
      this.transport.send(JSON.stringify(command));
    });
  }

  /** The installer stopped: nothing more will answer, so every waiting command fails. */
  private stopped(reason = 'The installer stopped.'): void {
    const error = new InstallerError('internal', reason);
    this.failReady(error);
    for (const pending of this.pending.values()) pending.reject(error);
    this.pending.clear();
  }

  private receive(line: string): void {
    let event: InstallerEvent;
    try {
      event = JSON.parse(line) as InstallerEvent;
    } catch {
      return;
    }
    if (event.event === 'ready') {
      if (event.protocol === PROTOCOL) this.markReady(event.installer);
      else this.failReady(new InstallerError('internal', `The installer speaks protocol ${event.protocol}, not ${PROTOCOL}.`));
      return;
    }
    const pending = this.pending.get(String(event.id));
    if (!pending) return;
    switch (event.event) {
      case 'progress':
        pending.onProgress?.({ stage: event.stage, done: event.done, total: event.total });
        break;
      case 'log':
        pending.onLog?.(event.text);
        break;
      case 'result':
        this.pending.delete(String(event.id));
        pending.resolve(event.value);
        break;
      case 'error':
        this.pending.delete(String(event.id));
        pending.reject(new InstallerError(event.code, event.message));
        break;
    }
  }
}
