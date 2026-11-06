import type { Transport } from './client';
import type { BuildRequest, Command, Edition, ErrorCode, Identified, InstallerEvent, Plan, Stage } from './protocol';

/**
 * A stand-in installer that speaks protocol v1 in the page, for working on the builder without the real
 * one and for its tests. It recognises disc images by file name, as no image is read, and spends a scaled
 * amount of time on each stage, in the real installer's order and units:
 *   identify: hash (bytes)
 *   build:    verify per disc (bytes), convert (0..1), write (bytes), patch (0..6),
 *             write the .restore file (in place only, bytes), verify the finished image (bytes)
 */

export interface FakeOptions {
  /** Real seconds per simulated second; 0.02 makes a build take about a second, for tests. */
  pace?: number;
}

const EXECUTIVE: Edition = {
  id: 'rac1-executive',
  name: 'Executive Edition',
  game: 'Ratchet & Clank',
  version: '1.0.0',
  discs: {
    rac1: { name: 'Ratchet & Clank', region: 'PAL', required: true },
    rac2: { name: 'Going Commando', region: 'USA', required: false },
  },
  options: {
    economy: ['skill', 'classic'],
    switches: [
      { id: 'charge_boots', needs: 'rac2' },
      { id: 'strafing', needs: 'rac2' },
      { id: 'quick_select_pages', needs: null },
    ],
  },
};

// Image sizes in bytes, and how long each stage takes at pace 1, in seconds.
const SIZES = { rac1: 4_216_256_512, rac2: 4_434_165_760, edition: 4_220_715_008 };
const SECONDS = { hash: 3, verify: 2.5, convert: 1.5, write: 4, patch: 2, restore: 1, check: 2.5 };
const TICK_MS = 50;

/** Which disc a file name looks like; the real installer hashes the image instead. */
function recognise(path: string): Identified | ErrorCode {
  const name = path.split(/[\\/]/).pop() ?? path;
  const sha = (seed: string) => Array.from({ length: 64 }, (_, i) => ((seed.charCodeAt(i % seed.length) + i * 7) % 16).toString(16)).join('');
  if (/going.?commando|rac2/i.test(name)) {
    return { disc: 'rac2', name: 'Going Commando', region: 'USA', sha256: sha('rac2'), known: true };
  }
  if (/\(europe\)|\bpal\b|\(e\)/i.test(name)) {
    return { disc: 'rac1', name: 'Ratchet & Clank', region: 'PAL', sha256: sha('rac1'), known: true };
  }
  if (/\(usa\)|\bntsc\b|\(u\)/i.test(name)) {
    return { disc: null, name: 'Ratchet & Clank', region: 'USA', sha256: sha('rac1us'), known: false };
  }
  return 'unknown_disc';
}

export class FakeInstaller implements Transport {
  private listener: ((line: string) => void) | null = null;
  private readonly pace: number;
  private readonly cancelled = new Set<string>();
  private closed = false;

  constructor(options: FakeOptions = {}) {
    this.pace = options.pace ?? 1;
  }

  onLine(listener: (line: string) => void): void {
    this.listener = listener;
    setTimeout(() => this.emit({ event: 'ready', protocol: 1, installer: 'fake' }), 0);
  }

  send(line: string): void {
    const command = JSON.parse(line) as Command;
    void this.run(command);
  }

  close(): void {
    this.closed = true;
  }

  private emit(event: InstallerEvent): void {
    if (!this.closed) this.listener?.(JSON.stringify(event));
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** Counts `total` up over `seconds`, sending progress; stops early if the command is cancelled. */
  private async stage(id: string, stage: Stage, total: number, seconds: number): Promise<boolean> {
    const ticks = Math.max(1, Math.round((seconds * this.pace * 1000) / TICK_MS));
    for (let tick = 1; tick <= ticks; tick++) {
      await this.wait((seconds * this.pace * 1000) / ticks);
      if (this.cancelled.has(id)) return false;
      this.emit({ event: 'progress', id, stage, done: Math.round((total * tick) / ticks), total });
    }
    return true;
  }

  private fail(id: string, code: ErrorCode, message: string): void {
    this.emit({ event: 'error', id, code, message });
  }

  private plan(request: BuildRequest): Plan {
    const without = new Set(request.options.without ?? []);
    const plan: Plan = { in: [], left_out: [], bytes_needed: request.output.mode === 'new' ? 4_500_000_000 : 40_000_000 };
    for (const feature of EXECUTIVE.options.switches) {
      if (feature.needs && !request.discs[feature.needs]) plan.left_out.push({ id: feature.id, because: 'no_rac2' });
      else if (without.has(feature.id)) plan.left_out.push({ id: feature.id, because: 'chosen' });
      else plan.in.push(feature.id);
    }
    return plan;
  }

  private async run(command: Command): Promise<void> {
    const { id } = command;
    switch (command.cmd) {
      case 'editions':
        this.emit({ event: 'result', id, value: [EXECUTIVE] });
        return;
      case 'identify': {
        const found = recognise(command.path);
        const size = typeof found === 'object' && found.disc ? SIZES[found.disc] : SIZES.rac1;
        await this.stage(id, 'hash', size, SECONDS.hash);
        if (found === 'unknown_disc') this.fail(id, 'unknown_disc', `${command.path} is not a disc this installer knows.`);
        else this.emit({ event: 'result', id, value: found });
        return;
      }
      case 'plan':
        if (!command.discs.rac1) return this.fail(id, 'missing_disc', 'Ratchet & Clank (PAL) is needed.');
        this.emit({ event: 'result', id, value: this.plan(command) });
        return;
      case 'cancel': {
        this.cancelled.add(command.of);
        this.emit({ event: 'result', id, value: { cancelling: true } });
        return;
      }
      case 'build':
        await this.build(command);
    }
  }

  private async build(command: Extract<Command, { cmd: 'build' }>): Promise<void> {
    const { id } = command;
    if (!command.discs.rac1) return this.fail(id, 'missing_disc', 'Ratchet & Clank (PAL) is needed.');
    const plan = this.plan(command);
    const log = (text: string) => this.emit({ event: 'log', id, text });
    const steps: [Stage, number, number, string][] = [
      ['verify', SIZES.rac1, SECONDS.verify, 'Ratchet & Clank (PAL): matches the known disc'],
    ];
    if (command.discs.rac2) steps.push(['verify', SIZES.rac2, SECONDS.verify, 'Going Commando (USA): matches the known disc']);
    steps.push(['convert', 1, SECONDS.convert, plan.in.includes('charge_boots') ? 'Charge Boots: model and textures from Going Commando' : 'Nothing to convert']);
    steps.push(['write', SIZES.edition, SECONDS.write, command.output.mode === 'new' ? `Copying the image to ${command.output.path}` : 'Updating the image in place']);
    steps.push(['patch', 6, SECONDS.patch, `Applied the edition: ${plan.in.length} switchable features in, ${plan.left_out.length} left out`]);
    if (command.output.mode === 'in_place') steps.push(['write', 52_428_800, SECONDS.restore, 'Saved the restore file beside the image']);
    steps.push(['verify', SIZES.edition, SECONDS.check, 'Hashed the finished image']);

    for (const [stage, total, seconds, line] of steps) {
      if (!(await this.stage(id, stage, total, seconds))) {
        log(command.output.mode === 'new' ? 'Cancelled; the new image was deleted' : 'Cancelled; the image was restored');
        return this.fail(id, 'cancelled', 'The build was cancelled.');
      }
      log(line);
    }
    const path = command.output.mode === 'new' ? command.output.path : command.discs.rac1;
    this.emit({ event: 'result', id, value: { path, sha256: '5e1f'.repeat(16) } });
  }
}
