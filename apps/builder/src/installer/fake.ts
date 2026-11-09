import type { Transport } from './client';
import type { BuildRequest, Command, Edition, ErrorCode, Identified, InstallerEvent, Plan, Stage } from './protocol';

/**
 * A stand-in installer that speaks protocol v1 in the page, for working on the builder without the real
 * one and for its tests. It recognises disc images by file name, as no image is read, and spends a scaled
 * amount of time on each stage, in the real installer's order and units:
 *   identify: hash (bytes)
 *   build, a new image: verify per disc (bytes), convert (0..14), patch (0..100: the levels and HelpDesk
 *             lines made ready), write (bytes: the image in one pass, hashed as it is written)
 *   build, in place: verify per disc (bytes), convert (0..14), write (bytes), patch (0..100), write the
 *             .restore file (bytes), verify the finished image (bytes)
 * Like the real installer, it remembers the discs it has hashed, so a build's verify of a disc checked
 * when it was added finishes at once. Its log lines are worded as the real installer's are.
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

/** A size as the real installer logs it: GiB, one decimal. */
const gib = (bytes: number) => `${(bytes / 2 ** 30).toFixed(1)} GB`;

/** The line after a disc's hash, as the real installer logs it. */
function hashLine(found: Identified, path: string): string {
  if (!found.sha256) return `${path}: not an image of a PS2 disc`;
  if (found.known) return `sha256 ${found.sha256} matches ${found.name} (${found.region})`;
  if (found.game) return `sha256 ${found.sha256}: ${found.name} (${found.region}), not the version this edition is built from`;
  return `sha256 ${found.sha256}: not a disc of this edition`;
}

/** Which disc a file name looks like; the real installer hashes the image instead. */
function recognise(path: string): Identified {
  const name = path.split(/[\\/]/).pop() ?? path;
  const sha = (seed: string) => Array.from({ length: 64 }, (_, i) => ((seed.charCodeAt(i % seed.length) + i * 7) % 16).toString(16)).join('');
  if (/going.?commando|rac2/i.test(name)) {
    return { disc: 'rac2', game: 'rac2', name: 'Going Commando', region: 'USA', sha256: sha('rac2'), known: true };
  }
  if (/\(europe\)|\bpal\b|\(e\)/i.test(name)) {
    return { disc: 'rac1', game: 'rac1', name: 'Ratchet & Clank', region: 'PAL', sha256: sha('rac1'), known: true };
  }
  if (/\(usa\)|\bntsc\b|\(u\)/i.test(name)) {
    return { disc: null, game: 'rac1', name: 'Ratchet & Clank', region: 'USA', sha256: sha('rac1us'), known: false };
  }
  return { disc: null, game: null, name: null, region: null, sha256: null, known: false };
}

export class FakeInstaller implements Transport {
  private listener: ((line: string) => void) | null = null;
  private readonly pace: number;
  private readonly cancelled = new Set<string>();
  /** The paths of the disc images hashed already. */
  private readonly hashed = new Set<string>();
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
        const size = found.disc ? SIZES[found.disc] : SIZES.rac1;
        const earlier = this.hashed.has(command.path);
        this.emit({ event: 'log', id, text: earlier ? `${command.path}: checked earlier` : `checking ${command.path} (${gib(size)})` });
        if (!(await this.stage(id, 'hash', size, earlier ? 0 : SECONDS.hash))) return this.fail(id, 'cancelled', 'cancelled');
        this.hashed.add(command.path);
        this.emit({ event: 'log', id, text: hashLine(found, command.path) });
        this.emit({ event: 'result', id, value: found });
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
    // Each step: its stage, total, seconds at pace 1, the line logged after it, and any logged before it.
    type Step = [Stage, number, number, string, string?];
    const verify = (key: 'rac1' | 'rac2', name: string): Step => {
      const path = command.discs[key]!;
      const { sha256 } = recognise(path);
      if (this.hashed.has(path)) return ['verify', SIZES[key], 0, `${name}: checked earlier, sha256 ${sha256}`];
      return ['verify', SIZES[key], SECONDS.verify, `sha256 ${sha256} matches ${name}`, `checking ${path} (${gib(SIZES[key])})`];
    };
    const steps: Step[] = [verify('rac1', 'Ratchet & Clank (PAL)')];
    if (command.discs.rac2) steps.push(verify('rac2', 'Going Commando (USA)'));
    steps.push(['convert', 14, SECONDS.convert, plan.in.includes('charge_boots') ? 'Charge Boots: model and textures from Going Commando' : 'Nothing to convert']);
    const applied = `Applied the edition: ${plan.in.length} switchable features in, ${plan.left_out.length} left out`;
    if (command.output.mode === 'new') {
      steps.push(['patch', 100, SECONDS.patch, 'The levels and HelpDesk lines are ready']);
      steps.push(['write', SIZES.edition, SECONDS.write, applied, `writing ${command.output.path} in one pass`]);
    } else {
      steps.push(['write', SIZES.edition, SECONDS.write, 'Updating the image in place']);
      steps.push(['patch', 100, SECONDS.patch, applied]);
      steps.push(['write', 52_428_800, SECONDS.restore, 'Saved the restore file beside the image']);
      steps.push(['verify', SIZES.edition, SECONDS.check, 'Hashed the finished image']);
    }

    for (const [stage, total, seconds, line, before] of steps) {
      if (before) log(before);
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
