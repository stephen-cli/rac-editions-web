import { describe, expect, it } from 'vitest';
import { InstallerClient, InstallerError, type Progress } from '../src/installer/client';
import { FakeInstaller } from '../src/installer/fake';
import type { BuildRequest } from '../src/installer/protocol';

// A build takes a second or so at this pace.
const connect = () => new InstallerClient(new FakeInstaller({ pace: 0.02 }));

const request = (overrides: Partial<BuildRequest> = {}): BuildRequest => ({
  edition: 'rac1-executive',
  discs: { rac1: 'D:\\Games\\Ratchet & Clank (Europe).iso', rac2: 'D:\\Games\\Going Commando (USA).iso' },
  options: { economy: 'skill', without: [] },
  output: { mode: 'new', path: 'D:\\Games\\Ratchet & Clank Executive Edition.iso' },
  ...overrides,
});

describe('the installer client with the fake installer', () => {
  it('waits for ready and lists the editions', async () => {
    const client = connect();
    await expect(client.ready).resolves.toBe('fake');
    const [edition] = await client.editions();
    expect(edition?.id).toBe('rac1-executive');
    expect(edition?.discs.rac1).toEqual({ name: 'Ratchet & Clank', region: 'PAL', required: true });
  });

  it('identifies discs while reporting the hash in bytes', async () => {
    const client = connect();
    const progress: Progress[] = [];
    const found = await client.identify('D:\\Ratchet & Clank (Europe).iso', (step) => progress.push(step));
    expect(found).toMatchObject({ disc: 'rac1', known: true, region: 'PAL' });
    expect(progress.at(-1)).toMatchObject({ stage: 'hash', done: progress.at(-1)?.total });
    expect(await client.identify('Ratchet & Clank (USA).iso')).toMatchObject({ disc: null, game: 'rac1', known: false, region: 'USA' });
    expect(await client.identify('holiday photos.iso')).toMatchObject({ disc: null, known: false, name: null, region: null });
  });

  it('plans which switchable features go in and why others stay out', async () => {
    const client = connect();
    const plan = await client.plan(request({ discs: { rac1: 'R&C (Europe).iso' }, options: { without: ['quick_select_pages'] } }));
    expect(plan.in).toEqual([]);
    expect(plan.left_out).toEqual([
      { id: 'charge_boots', because: 'no_rac2' },
      { id: 'strafing', because: 'no_rac2' },
      { id: 'quick_select_pages', because: 'chosen' },
    ]);
  });

  it('builds in the installer stage order and returns the image', async () => {
    const client = connect();
    const stages: string[] = [];
    const logs: string[] = [];
    const { result } = client.build(request({ output: { mode: 'in_place' } }), {
      onProgress: ({ stage }) => stages.at(-1) !== stage && stages.push(stage),
      onLog: (text) => logs.push(text),
    });
    await expect(result).resolves.toMatchObject({ path: 'D:\\Games\\Ratchet & Clank (Europe).iso' });
    // Consecutive verifies (one per disc) merge here; the in-place build adds a write for the .restore file.
    expect(stages).toEqual(['verify', 'convert', 'write', 'patch', 'write', 'verify']);
    expect(logs).toContain('Saved the restore file beside the image');
  });

  it('cancels a running build, which then ends with the error "cancelled"', async () => {
    const client = connect();
    const build = client.build(request());
    await new Promise((resolve) => setTimeout(resolve, 60));
    await expect(client.cancel(build.id)).resolves.toEqual({ cancelling: true });
    const failure = await build.result.catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(InstallerError);
    expect(failure).toMatchObject({ code: 'cancelled' });
  });
});
