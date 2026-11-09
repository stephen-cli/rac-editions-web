import { defineStore } from 'pinia';
import { computed, markRaw, reactive, ref, shallowRef, watch } from 'vue';
import { EDITION_COPY, regionName } from '../editions/copy';
import { InstallerError, type InstallerClient, type Progress } from '../installer/client';
import type { Built, BuildRequest, DiscKey, Edition, ErrorCode, Identified, Plan, Stage } from '../installer/protocol';
import { defaultOutputPath, outputPathProblem, type Platform } from '../platform/platform';
import type { LastBuild, Memory, Remembered } from './memory';

export type StepId = 'edition' | 'discs' | 'output' | 'review' | 'build' | 'done';
export const STEPS: StepId[] = ['edition', 'discs', 'output', 'review', 'build', 'done'];

export interface DiscSlot {
  path: string;
  status: 'reading' | 'ok' | 'refused';
  /** 0 to 1 while reading: copying from the DVD, then hashing. */
  progress: number;
  fromDvd: boolean;
  identified?: Identified;
  message?: string;
}

export interface StageRow {
  stage: Stage;
  label: string;
  state: 'waiting' | 'active' | 'done';
  done: number;
  total: number;
  /** Its rough share of the build's time, for the overall percentage. */
  weight: number;
}

/** `checking`: the disc the feature needs is still being checked. */
export type FeatureState = 'on' | 'off' | 'locked' | 'checking';

/** An image added, and the game's row it ended in (its own game's, or the one it was added to if refused). */
export interface Added {
  image: DiscSlot;
  row: DiscKey;
}

const SECTOR = 2048;

const WORDS: Record<ErrorCode, string> = {
  unknown_disc: "This isn't a disc this edition uses.",
  wrong_version: 'This is a different version of the game.',
  image_incomplete: 'The disc image is incomplete (it ends early). Make the image again from the disc.',
  missing_disc: 'The edition needs its base disc.',
  no_space: "There isn't enough free space there for the new image.",
  not_writable: "The builder can't write there. Choose another place.",
  cancelled: 'The build was cancelled.',
  internal: 'Something went wrong in the installer.',
};

/** An installer error in words for the player; the details stay in the log. */
export function inWords(error: unknown): string {
  return error instanceof InstallerError ? WORDS[error.code] : WORDS.internal;
}

/**
 * The wizard's session: the edition, the discs, where the image goes, the edition settings, and the
 * build. Connected to an installer and a platform once, at start.
 */
export const useSession = defineStore('session', () => {
  const client = shallowRef<InstallerClient | null>(null);
  const platform = shallowRef<Platform | null>(null);
  const installerVersion = ref('');
  /** Why the installer couldn't be reached, if it couldn't. */
  const installerError = ref('');
  const editions = ref<Edition[]>([]);
  const editionId = ref('');
  const discs = reactive<Partial<Record<DiscKey, DiscSlot>>>({});
  const output = reactive({ mode: 'new' as 'new' | 'in_place', path: '', pathEdited: false, confirmed: false });
  const switches = reactive<Record<string, boolean>>({});
  const economy = ref('');
  const plan = ref<Plan | null>(null);
  const planError = ref('');
  const lastBuild = ref<LastBuild | null>(null);
  const remembered = ref<Remembered>({});
  const furthest = ref(0);
  const build = reactive({
    state: 'idle' as 'idle' | 'running' | 'done' | 'failed' | 'cancelled',
    id: '',
    rows: [] as StageRow[],
    index: 0,
    log: [] as string[],
    result: null as Built | null,
    error: '',
  });

  const edition = computed(() => editions.value.find((entry) => entry.id === editionId.value) ?? null);
  const copy = computed(() => EDITION_COPY[editionId.value] ?? null);
  const baseDisc = computed(() => discs.rac1?.status === 'ok' ? discs.rac1 : null);
  const hasDisc = (key: DiscKey) => discs[key]?.status === 'ok';
  const reading = computed(() => Object.values(discs).some((slot) => slot?.status === 'reading'));
  /** A disc's image the build can be planned with: being checked, or checked and right. */
  const added = (key: DiscKey) => {
    const slot = discs[key];
    return slot && slot.status !== 'refused' && slot.path ? slot : null;
  };
  /** How far the discs' checks have got, 0 to 1, across those still running. */
  const checking = computed(() => {
    const running = Object.values(discs).filter((slot) => slot?.status === 'reading');
    return running.length ? running.reduce((sum, slot) => sum + slot!.progress, 0) / running.length : 1;
  });
  const outputProblem = computed(() => (output.mode === 'new' ? outputPathProblem(output.path) : ''));

  /**
   * The step furthest along that the player may open now. The discs' checks carry on in the background
   * while the player chooses the output and reviews; only the build waits for them.
   */
  const reachable = computed<StepId>(() => {
    if (build.state === 'done') return 'done';
    if (build.state === 'running') return 'build';
    if (!edition.value) return 'edition';
    if (!added('rac1')) return 'discs';
    if (output.mode === 'new' ? outputProblem.value : !output.confirmed) return 'output';
    return 'review';
  });

  /** Whether the build can start: every disc checked, and nothing wrong with the plan. */
  const canBuild = computed(() => !!baseDisc.value && !reading.value && !planError.value && reachable.value === 'review');

  /** The furthest step up to Review the player may open now. */
  const lastOpen = computed<StepId>(() => (reachable.value === 'done' || reachable.value === 'build' ? 'review' : reachable.value));

  /**
   * Whether a step may open: while a build runs only Build does; Build opens once a build has started (it
   * shows how the last one ended) and Done once one has finished; any other step once those before it are
   * complete.
   */
  function canOpen(step: StepId): boolean {
    if (build.state === 'running') return step === 'build';
    if (step === 'build') return build.state !== 'idle';
    if (step === 'done') return build.state === 'done';
    return STEPS.indexOf(step) <= STEPS.indexOf(lastOpen.value);
  }

  function featureState(id: string): FeatureState {
    const needs = edition.value?.options.switches.find((entry) => entry.id === id)?.needs;
    if (needs && discs[needs]?.status === 'reading') return 'checking';
    if (needs && !hasDisc(needs)) return 'locked';
    return switches[id] === false ? 'off' : 'on';
  }

  /** Settings changed from the designed edition (features locked by a missing disc don't count). */
  const customised = computed(() => {
    const options = edition.value?.options;
    if (!options) return false;
    return options.economy[0] !== economy.value || options.switches.some((entry) => featureState(entry.id) === 'off');
  });

  /** The build as it stands; discs still being checked are in it, and the build waits for them. */
  const request = computed<BuildRequest | null>(() => {
    const base = added('rac1');
    if (!edition.value || !base) return null;
    const paths: BuildRequest['discs'] = { rac1: base.path };
    const rac2 = added('rac2');
    if (rac2) paths.rac2 = rac2.path;
    return {
      edition: edition.value.id,
      discs: paths,
      options: {
        economy: economy.value,
        without: edition.value.options.switches.filter((entry) => featureState(entry.id) === 'off').map((entry) => entry.id),
      },
      output: output.mode === 'new' ? { mode: 'new', path: output.path } : { mode: 'in_place' },
    };
  });

  /**
   * Connects to the installer and the computer. With a memory, the last run's edition, settings, output
   * and discs come back, and the discs are checked again in the background; the session is remembered as
   * it changes.
   */
  async function connect(installer: InstallerClient, host: Platform, memory?: Memory): Promise<void> {
    client.value = markRaw(installer);
    platform.value = markRaw(host);
    try {
      installerVersion.value = await installer.ready;
      editions.value = await installer.editions();
    } catch (error) {
      installerError.value = error instanceof Error ? error.message : String(error);
      return;
    }
    remembered.value = memory?.load() ?? {};
    const last = remembered.value;
    const first = editions.value.find((entry) => entry.id === last.edition) ?? editions.value[0];
    if (first) chooseEdition(first.id);
    if (last.lastBuild?.edition === editionId.value) lastBuild.value = last.lastBuild;
    if (last.output) Object.assign(output, last.output, { confirmed: false });
    for (const [key, path] of Object.entries(last.discs ?? {}) as [DiscKey, string][]) {
      if (edition.value?.discs[key]) void addImage(path, key, { remembered: true });
    }
    if (memory) watch(rememberable, (state) => memory.save(state), { deep: true });
  }

  /** What's kept between runs: the discs found right, but never an in-place confirmation. */
  const rememberable = computed<Remembered>(() => {
    const settings = { ...remembered.value.settings };
    if (editionId.value) settings[editionId.value] = { switches: { ...switches }, economy: economy.value };
    const paths: Remembered['discs'] = {};
    for (const key of ['rac1', 'rac2'] as const) if (hasDisc(key)) paths[key] = discs[key]!.path;
    return {
      edition: editionId.value,
      discs: paths,
      output: { mode: output.mode, path: output.path, pathEdited: output.pathEdited },
      settings,
      lastBuild: lastBuild.value ?? remembered.value.lastBuild,
    };
  });

  /** What the installer prints besides the protocol (a warning, or a crash), for the Details log. */
  function noteInstallerOutput(line: string): void {
    build.log.push(`installer: ${line}`);
  }

  function chooseEdition(id: string): void {
    editionId.value = id;
    resetSettings(true);
  }

  /** The edition's designed settings; `fromMemory`, the player's own from a past run where they still apply. */
  function resetSettings(fromMemory = false): void {
    const options = edition.value?.options;
    if (!options) return;
    const saved = fromMemory ? remembered.value.settings?.[editionId.value] : undefined;
    for (const entry of options.switches) switches[entry.id] = saved?.switches[entry.id] ?? true;
    economy.value = saved && options.economy.includes(saved.economy) ? saved.economy : options.economy[0] ?? '';
  }

  /** Why an identified image can't be used, in the player's words; empty if it can. */
  function refusal(found: Identified): string {
    const current = edition.value;
    if (!current) return '';
    if (found.known && found.disc && current.discs[found.disc]) return '';
    const wanted = found.game ? current.discs[found.game] : undefined;
    if (wanted && found.region) {
      const how = wanted.required ? 'is built from' : 'uses';
      return `This is the ${regionName(found.region)} version. The ${current.name} ${how} the ${regionName(wanted.region)} version of ${wanted.name}.`;
    }
    const names = Object.values(current.discs).map((disc) => `${disc!.name} (${disc!.region})`);
    return `This isn't a disc the ${current.name} uses. It uses ${names.join(' and ')}.`;
  }

  /**
   * Reads a disc image into the row it was added from. Once identified it moves to its own game's row,
   * and the row it came from gets back whatever disc it held before, or the image being checked in the
   * row it moved to. Resolves to the image and the row it ended in.
   */
  async function addImage(
    path: string,
    slot: DiscKey,
    how: { dvd?: { reading: DiscSlot; previous: DiscSlot | undefined }; remembered?: boolean } = {},
  ): Promise<Added | null> {
    const installer = client.value;
    if (!installer) return null;
    const { dvd } = how;
    const fromDvd = !!dvd;
    const previous = dvd ? dvd.previous : discs[slot];
    const entry = dvd?.reading ?? reactive<DiscSlot>({ path, status: 'reading', progress: 0, fromDvd });
    Object.assign(entry, { path, status: 'reading', progress: fromDvd ? 0.5 : 0, fromDvd });
    discs[slot] = entry;
    // Named now, so the player can choose the output while the image is checked.
    if (slot === 'rac1') nameOutputBeside(path);
    try {
      const found = await installer.identify(path, ({ done, total }) => {
        entry.progress = (fromDvd ? 0.5 : 0) + (total ? done / total : 0) * (fromDvd ? 0.5 : 1);
      });
      entry.identified = found;
      const why = refusal(found);
      if (why) {
        Object.assign(entry, { status: 'refused', message: why });
        return { image: entry, row: slot };
      }
      entry.status = 'ok';
      entry.progress = 1;
      const row = found.disc ?? slot;
      if (row !== slot && discs[slot] === entry) {
        // An image still being checked in its own game's row trades places with it, so it stays in view
        // (and counted as being checked) until it finds its own row.
        const waiting = discs[row]?.status === 'reading' ? discs[row] : undefined;
        if (waiting) discs[slot] = waiting;
        else if (previous?.status === 'ok') discs[slot] = previous;
        else delete discs[slot];
      }
      discs[row] = entry;
      if (row === 'rac1') nameOutputBeside(path);
      return { image: entry, row };
    } catch (error) {
      // A disc from the last run that has since moved or gone: forget it rather than refuse it.
      if (how.remembered && error instanceof InstallerError && error.code === 'missing_disc') {
        if (discs[slot] === entry) delete discs[slot];
        return null;
      }
      const message = error instanceof InstallerError && error.code === 'unknown_disc' && edition.value
        ? refusal({ disc: null, game: null, name: null, region: null, sha256: null, known: false })
        : inWords(error);
      Object.assign(entry, { status: 'refused', message });
      return { image: entry, row: slot };
    }
  }

  /** Names the new image beside the base disc's image, until the player names it themselves. */
  function nameOutputBeside(path: string): void {
    if (!output.pathEdited && edition.value) output.path = defaultOutputPath(path, edition.value.game, edition.value.name);
  }

  /** Copies the DVD in the drive to an image, then reads it like any other image. */
  async function readDvd(slot: DiscKey): Promise<Added | null> {
    const host = platform.value;
    if (!host?.readDvd) return null;
    const previous = discs[slot];
    const reading = reactive<DiscSlot>({ path: '', status: 'reading', progress: 0, fromDvd: true });
    discs[slot] = reading;
    const path = await host.readDvd((fraction) => (reading.progress = fraction / 2), slot);
    return addImage(path, slot, { dvd: { reading, previous } });
  }

  function removeDisc(slot: DiscKey): void {
    delete discs[slot];
  }

  function setOutputPath(path: string): void {
    output.path = path;
    output.pathEdited = true;
  }

  /** Asks the installer for the plan; resolves to what's wrong with it, in words, or '' if nothing is. */
  async function refreshPlan(): Promise<string> {
    if (!client.value || !request.value) return '';
    planError.value = '';
    try {
      plan.value = await client.value.plan(request.value);
    } catch (error) {
      plan.value = null;
      planError.value = inWords(error);
    }
    return planError.value;
  }

  /**
   * The rows the build will show, in the installer's order, before any progress arrives, each with its rough share
   * of the time. A new image is written in one pass: the levels and HelpDesk lines are made ready, then patched as
   * the writing reaches them, and the image is hashed as it is written. An image updated in place is copied and
   * patched, its restore file saved, and then checked in full.
   */
  function expectedRows(): StageRow[] {
    const rows: StageRow[] = [];
    const add = (stage: Stage, label: string, weight: number) =>
      rows.push({ stage, label, state: 'waiting', done: 0, total: 0, weight });
    for (const key of ['rac1', 'rac2'] as const) {
      const disc = edition.value?.discs[key];
      if (hasDisc(key) && disc) add('verify', `Check ${disc.name} (${disc.region})`, 12);
    }
    add('convert', hasDisc('rac2') ? "Convert Going Commando's data" : 'Prepare the edition', 8);
    if (output.mode === 'new') {
      add('patch', 'Prepare the levels and HelpDesk', 5);
      add('write', 'Write the new image', 75);
    } else {
      add('write', 'Update the image', 40);
      add('patch', 'Apply the edition', 10);
      add('write', 'Save the restore file', 5);
      add('verify', 'Check the finished image', 15);
    }
    return rows;
  }

  /**
   * Places a progress event on its row. Events of the row's stage continue it while their count rises;
   * another stage, or a count starting over (verify and write each come twice), moves on to the next
   * waiting row of that stage, and the rows passed on the way are done.
   */
  function onProgress({ stage, done, total }: Progress): void {
    const current = build.rows[build.index];
    const continues = current && current.stage === stage && !(current.state === 'active' && done < current.done);
    if (!continues) {
      const from = current?.state === 'waiting' ? build.index : build.index + 1;
      let next = build.rows.findIndex((row, at) => at >= from && row.stage === stage && row.state === 'waiting');
      if (next < 0) {
        // A stage the builder didn't expect: show it rather than lose it.
        build.rows.push({ stage, label: stage, state: 'waiting', done: 0, total: 0, weight: 10 });
        next = build.rows.length - 1;
      }
      for (let at = build.index; at < next; at++) build.rows[at]!.state = 'done';
      build.index = next;
    }
    Object.assign(build.rows[build.index]!, { state: 'active', done, total });
  }

  const overall = computed(() => {
    let sum = 0;
    let got = 0;
    for (const row of build.rows) {
      sum += row.weight;
      got += row.weight * (row.state === 'done' ? 1 : row.total ? row.done / row.total : 0);
    }
    return sum ? got / sum : 0;
  });

  /** Sectors of the image written so far (2048 bytes each), and of the whole image. */
  const sectors = computed(() => {
    const row = build.rows.find((entry) => entry.stage === 'write');
    return { written: Math.floor((row?.done ?? 0) / SECTOR), total: Math.floor((row?.total ?? 0) / SECTOR) };
  });

  async function startBuild(): Promise<void> {
    const installer = client.value;
    if (!installer || !request.value || !canBuild.value) return;
    Object.assign(build, { state: 'running', rows: expectedRows(), index: 0, log: [], result: null, error: '' });
    const started = installer.build(request.value, {
      onProgress,
      onLog: (text) => build.log.push(text),
    });
    build.id = started.id;
    try {
      build.result = await started.result;
      build.rows.forEach((row) => (row.state = 'done'));
      build.state = 'done';
      lastBuild.value = { edition: editionId.value, ...build.result, at: new Date().toISOString() };
    } catch (error) {
      build.state = error instanceof InstallerError && error.code === 'cancelled' ? 'cancelled' : 'failed';
      build.error = inWords(error);
      if (error instanceof Error) build.log.push(error.message);
    }
  }

  async function cancelBuild(): Promise<void> {
    if (build.state === 'running' && client.value) await client.value.cancel(build.id);
  }

  return {
    installerVersion,
    installerError,
    editions,
    editionId,
    edition,
    copy,
    discs,
    baseDisc,
    reading,
    output,
    switches,
    economy,
    plan,
    planError,
    lastBuild,
    checking,
    outputProblem,
    canBuild,
    furthest,
    build,
    reachable,
    lastOpen,
    canOpen,
    customised,
    request,
    overall,
    sectors,
    platform,
    connect,
    noteInstallerOutput,
    chooseEdition,
    resetSettings,
    featureState,
    hasDisc,
    addImage,
    readDvd,
    removeDisc,
    setOutputPath,
    refreshPlan,
    startBuild,
    cancelBuild,
  };
});
