import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InstallerClient } from '../src/installer/client';
import { FakeInstaller } from '../src/installer/fake';
import { outputPathProblem, type Platform } from '../src/platform/platform';
import type { Memory, Remembered } from '../src/stores/memory';
import { useSession } from '../src/stores/session';

const platform: Platform = {
  pickImages: async () => [],
  watchDrops: () => () => {},
  showInFolder: async () => {},
};

async function session(memory?: Memory) {
  setActivePinia(createPinia());
  const store = useSession();
  await store.connect(new InstallerClient(new FakeInstaller({ pace: 0.02 })), platform, memory);
  return store;
}

/** A memory holding `remembered`, keeping what's saved in `saved`. */
function memoryOf(remembered: Remembered) {
  const saved: Remembered[] = [];
  const memory: Memory = { load: () => remembered, save: (state) => saved.push(JSON.parse(JSON.stringify(state)) as Remembered) };
  return { memory, saved };
}

describe('the session', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('starts on the first edition with the designed settings', async () => {
    const store = await session();
    expect(store.edition?.name).toBe('Executive Edition');
    expect(store.economy).toBe('skill');
    expect(store.customised).toBe(false);
    expect(store.lastOpen).toBe('discs');
  });

  it('moves an identified image to its own game, whichever row it was added from', async () => {
    const store = await session();
    await store.addImage('D:\\Games\\Going Commando (USA).iso', 'rac1');
    expect(store.discs.rac1).toBeUndefined();
    expect(store.discs.rac2?.status).toBe('ok');
  });

  it('keeps a row\'s disc when an image added there turns out to be the other game', async () => {
    const store = await session();
    await store.addImage('D:\\Going Commando (USA).iso', 'rac2');
    const added = await store.addImage('D:\\Ratchet & Clank (Europe).iso', 'rac2');
    expect(added?.row).toBe('rac1');
    expect(store.discs.rac1?.path).toBe('D:\\Ratchet & Clank (Europe).iso');
    expect(store.discs.rac2?.path).toBe('D:\\Going Commando (USA).iso');
  });

  it('reads the DVD for a row and lands it in that game\'s row', async () => {
    setActivePinia(createPinia());
    const store = useSession();
    const drive: Platform = {
      ...platform,
      readDvd: async (onProgress, expecting) => {
        onProgress(1);
        return expecting === 'rac2' ? 'D:\\Going Commando (USA).iso' : 'D:\\Ratchet & Clank (Europe).iso';
      },
    };
    await store.connect(new InstallerClient(new FakeInstaller({ pace: 0.02 })), drive);
    const added = await store.readDvd('rac2');
    expect(added?.row).toBe('rac2');
    expect(store.discs.rac2).toMatchObject({ status: 'ok', fromDvd: true });
  });

  it('refuses a wrong version in its row, in the player\'s words', async () => {
    const store = await session();
    await store.addImage('D:\\Games\\Ratchet & Clank (USA).iso', 'rac1');
    expect(store.discs.rac1).toMatchObject({
      status: 'refused',
      message: 'This is the US version. The Executive Edition is built from the PAL (European) version of Ratchet & Clank.',
    });
    await store.addImage('D:\\Games\\holiday.iso', 'rac2');
    expect(store.discs.rac2?.message).toBe(
      "This isn't a disc the Executive Edition uses. It uses Ratchet & Clank (PAL) and Going Commando (USA).",
    );
  });

  it('names the new image after the base disc, until the player edits it', async () => {
    const store = await session();
    await store.addImage('E:\\PS2\\Ratchet & Clank (Europe).iso', 'rac1');
    expect(store.output.path).toBe('E:\\PS2\\Ratchet & Clank Executive Edition.iso');
    expect(store.lastOpen).toBe('review');
    store.setOutputPath('F:\\mine.iso');
    await store.addImage('D:\\Ratchet & Clank (Europe).iso', 'rac1');
    expect(store.output.path).toBe('F:\\mine.iso');
  });

  it('locks the Going Commando features without that disc and leaves them out of the build', async () => {
    const store = await session();
    await store.addImage('D:\\Ratchet & Clank (Europe).iso', 'rac1');
    expect(store.featureState('charge_boots')).toBe('locked');
    store.switches.quick_select_pages = false;
    expect(store.customised).toBe(true);
    expect(store.request?.options.without).toEqual(['quick_select_pages']);
    expect(store.request?.discs).toEqual({ rac1: 'D:\\Ratchet & Clank (Europe).iso' });
  });

  it('follows an in-place build stage by stage, telling the two verifies and writes apart', async () => {
    const store = await session();
    await store.addImage('D:\\Ratchet & Clank (Europe).iso', 'rac1');
    await store.addImage('D:\\Going Commando (USA).iso', 'rac2');
    store.output.mode = 'in_place';
    store.output.confirmed = true;
    await store.startBuild();
    expect(store.build.state).toBe('done');
    expect(store.build.rows.map((row) => [row.label, row.state])).toEqual([
      ['Check Ratchet & Clank (PAL)', 'done'],
      ['Check Going Commando (USA)', 'done'],
      ["Convert Going Commando's data", 'done'],
      ['Update the image', 'done'],
      ['Apply the edition', 'done'],
      ['Save the restore file', 'done'],
      ['Check the finished image', 'done'],
    ]);
    expect(store.sectors.written).toBe(store.sectors.total);
    expect(store.overall).toBe(1);
    expect(store.canOpen('done')).toBe(true);
  });

  it('lets the player go on while a disc is checked, and builds only once it is', async () => {
    const store = await session();
    const checked = store.addImage('D:\\Ratchet & Clank (Europe).iso', 'rac1');
    expect(store.discs.rac1?.status).toBe('reading');
    expect(store.canOpen('review')).toBe(true);
    expect(store.canBuild).toBe(false);
    await checked;
    expect(store.canBuild).toBe(true);
  });

  it('holds the player on Output while the new image\'s path names no .iso file', async () => {
    const store = await session();
    await store.addImage('D:\\Ratchet & Clank (Europe).iso', 'rac1');
    store.setOutputPath('C:\\Users\\steph\\Desktop');
    expect(store.outputProblem).toBe('End the path with a file name for the image, such as Edition.iso.');
    expect(store.lastOpen).toBe('output');
  });

  it('brings back the last run\'s discs, settings and output, and remembers changes', async () => {
    const { memory, saved } = memoryOf({
      edition: 'rac1-executive',
      discs: { rac1: 'D:\\Ratchet & Clank (Europe).iso' },
      output: { mode: 'in_place', path: '', pathEdited: false },
      settings: { 'rac1-executive': { switches: { quick_select_pages: false }, economy: 'classic' } },
      lastBuild: { edition: 'rac1-executive', path: 'E:\\Edition.iso', sha256: 'ab', at: '2026-11-07T09:00:00Z' },
    });
    const store = await session(memory);
    expect(store.economy).toBe('classic');
    expect(store.switches.quick_select_pages).toBe(false);
    expect(store.output).toMatchObject({ mode: 'in_place', confirmed: false });
    expect(store.lastBuild?.path).toBe('E:\\Edition.iso');
    expect(store.discs.rac1?.status).toBe('reading');
    await vi.waitFor(() => expect(store.discs.rac1?.status).toBe('ok'));
    store.economy = 'skill';
    await vi.waitFor(() => expect(saved.at(-1)).toMatchObject({
      discs: { rac1: 'D:\\Ratchet & Clank (Europe).iso' },
      settings: { 'rac1-executive': { economy: 'skill' } },
    }));
  });
});

describe('a new image\'s path', () => {
  it.each([
    ['', 'Enter where to save the new image.'],
    ['Edition.iso', 'Enter the full path, starting with the drive, such as C:\\Games\\Edition.iso.'],
    ['C:\\Users\\steph\\Desktop', 'End the path with a file name for the image, such as Edition.iso.'],
    ['C:\\Users\\steph\\Desktop\\', 'End the path with a file name for the image, such as Edition.iso.'],
    ['C:\\Games\\.iso', 'Give the image a name before .iso.'],
    ['C:\\Games\\a?b.iso', 'A file name can\'t contain < > : " | ? or *.'],
    ['C:\\Games\\Ratchet & Clank Executive Edition.ISO', ''],
    ['\\\\nas\\games\\Edition.iso', ''],
    ['/home/player/Edition.iso', ''],
  ])('%j: %j', (path, problem) => expect(outputPathProblem(path)).toBe(problem));
});

describe('images checked side by side', () => {
  it('trade rows when each was added to the other game\'s row', async () => {
    const store = await session();
    const goingCommando = store.addImage('D:\\Going Commando (USA).iso', 'rac1');
    const ratchet = store.addImage('D:\\Ratchet & Clank (Europe).iso', 'rac2');
    await goingCommando;
    expect(store.discs.rac1?.status).toBe('reading');
    expect(store.reading).toBe(true);
    await ratchet;
    expect(store.discs.rac1?.path).toBe('D:\\Ratchet & Clank (Europe).iso');
    expect(store.discs.rac2?.path).toBe('D:\\Going Commando (USA).iso');
  });
});
