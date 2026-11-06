import { defineStore } from 'pinia';
import { computed, markRaw, reactive, ref, shallowRef } from 'vue';
import { EDITION_COPY, regionName } from '../editions/copy';
import { InstallerError, type InstallerClient, type Progress } from '../installer/client';
import type { Built, BuildRequest, DiscKey, Edition, ErrorCode, Identified, Plan, Stage } from '../installer/protocol';
import { defaultOutputPath, type Platform } from '../platform/platform';

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
}

export type FeatureState = 'on' | 'off' | 'locked';

/** An image added, and the game's row it ended in (its own game's, or the one it was added to if refused). */
export interface Added {
  image: DiscSlot;
  row: DiscKey;
}

// How much of a build each kind of row takes, roughly, for the overall percentage.
const WEIGHT: Record<string, number> = { verify: 12, convert: 8, write: 40, patch: 10, restore: 5, check: 15 };
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
  const editions = ref<Edition[]>([]);
  const editionId = ref('');
  const discs = reactive<Partial<Record<DiscKey, DiscSlot>>>({});
  const output = reactive({ mode: 'new' as 'new' | 'in_place', path: '', pathEdited: false, confirmed: false });
  const switches = reactive<Record<string, boolean>>({});
  const economy = ref('');
  const plan = ref<Plan | null>(null);
  const planError = ref('');
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

  /** The step furthest along that the player may open now. */
  const reachable = computed<StepId>(() => {
    if (build.state === 'done') return 'done';
    if (build.state === 'running') return 'build';
    if (!edition.value) return 'edition';
    if (!baseDisc.value || reading.value) return 'discs';
    if (output.mode === 'new' ? !output.path : !output.confirmed) return 'output';
    return 'review';
  });

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
    if (needs && !hasDisc(needs)) return 'locked';
    return switches[id] === false ? 'off' : 'on';
  }

  /** Settings changed from the designed edition (features locked by a missing disc don't count). */
  const customised = computed(() => {
    const options = edition.value?.options;
    if (!options) return false;
    return options.economy[0] !== economy.value || options.switches.some((entry) => featureState(entry.id) === 'off');
  });

  const request = computed<BuildRequest | null>(() => {
    if (!edition.value || !baseDisc.value) return null;
    const paths: BuildRequest['discs'] = { rac1: baseDisc.value.path };
    if (hasDisc('rac2')) paths.rac2 = discs.rac2!.path;
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

  async function connect(installer: InstallerClient, host: Platform): Promise<void> {
    client.value = markRaw(installer);
    platform.value = markRaw(host);
    installerVersion.value = await installer.ready;
    editions.value = await installer.editions();
    const first = editions.value[0];
    if (first) chooseEdition(first.id);
  }

  function chooseEdition(id: string): void {
    editionId.value = id;
    resetSettings();
  }

  function resetSettings(): void {
    const options = edition.value?.options;
    if (!options) return;
    for (const entry of options.switches) switches[entry.id] = true;
    economy.value = options.economy[0] ?? '';
  }

  /** Why an identified image can't be used, in the player's words; empty if it can. */
  function refusal(found: Identified): string {
    const current = edition.value;
    if (!current) return '';
    if (found.known && found.disc && current.discs[found.disc]) return '';
    const wanted = Object.values(current.discs).find((disc) => disc?.name === found.name);
    if (wanted) {
      const how = wanted.required ? 'is built from' : 'uses';
      return `This is the ${regionName(found.region)} version. The ${current.name} ${how} the ${regionName(wanted.region)} version of ${wanted.name}.`;
    }
    const names = Object.values(current.discs).map((disc) => `${disc!.name} (${disc!.region})`);
    return `This isn't a disc the ${current.name} uses. It uses ${names.join(' and ')}.`;
  }

  /**
   * Reads a disc image into the row it was added from. Once identified it moves to its own game's row,
   * and the row it came from gets back whatever disc it held before. Resolves to the image and the row
   * it ended in.
   */
  async function addImage(
    path: string,
    slot: DiscKey,
    dvd?: { reading: DiscSlot; previous: DiscSlot | undefined },
  ): Promise<Added | null> {
    const installer = client.value;
    if (!installer) return null;
    const fromDvd = !!dvd;
    const previous = dvd ? dvd.previous : discs[slot];
    const entry = dvd?.reading ?? reactive<DiscSlot>({ path, status: 'reading', progress: 0, fromDvd });
    Object.assign(entry, { path, status: 'reading', progress: fromDvd ? 0.5 : 0, fromDvd });
    discs[slot] = entry;
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
        if (previous?.status === 'ok') discs[slot] = previous;
        else delete discs[slot];
      }
      discs[row] = entry;
      if (row === 'rac1' && !output.pathEdited && edition.value) {
        output.path = defaultOutputPath(path, edition.value.game, edition.value.name);
      }
      return { image: entry, row };
    } catch (error) {
      const message = error instanceof InstallerError && error.code === 'unknown_disc' && edition.value
        ? refusal({ disc: null, name: '', region: '', sha256: '', known: false })
        : inWords(error);
      Object.assign(entry, { status: 'refused', message });
      return { image: entry, row: slot };
    }
  }

  /** Copies the DVD in the drive to an image, then reads it like any other image. */
  async function readDvd(slot: DiscKey): Promise<Added | null> {
    const host = platform.value;
    if (!host?.readDvd) return null;
    const previous = discs[slot];
    const reading = reactive<DiscSlot>({ path: '', status: 'reading', progress: 0, fromDvd: true });
    discs[slot] = reading;
    const path = await host.readDvd((fraction) => (reading.progress = fraction / 2), slot);
    return addImage(path, slot, { reading, previous });
  }

  function removeDisc(slot: DiscKey): void {
    delete discs[slot];
  }

  function setOutputPath(path: string): void {
    output.path = path;
    output.pathEdited = true;
  }

  async function refreshPlan(): Promise<void> {
    if (!client.value || !request.value) return;
    planError.value = '';
    try {
      plan.value = await client.value.plan(request.value);
    } catch (error) {
      plan.value = null;
      planError.value = inWords(error);
    }
  }

  /** The rows the build will show, in the installer's order, before any progress arrives. */
  function expectedRows(): StageRow[] {
    const rows: StageRow[] = [];
    const add = (stage: Stage, label: string) => rows.push({ stage, label, state: 'waiting', done: 0, total: 0 });
    for (const key of ['rac1', 'rac2'] as const) {
      const disc = edition.value?.discs[key];
      if (hasDisc(key) && disc) add('verify', `Check ${disc.name} (${disc.region})`);
    }
    add('convert', hasDisc('rac2') ? "Convert Going Commando's data" : 'Prepare the edition');
    add('write', output.mode === 'new' ? 'Write the new image' : 'Update the image');
    add('patch', 'Apply the edition');
    if (output.mode === 'in_place') add('write', 'Save the restore file');
    add('verify', 'Check the finished image');
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
        build.rows.push({ stage, label: stage, state: 'waiting', done: 0, total: 0 });
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
    build.rows.forEach((row, at) => {
      const weight = WEIGHT[row.label === 'Save the restore file' ? 'restore' : at === build.rows.length - 1 ? 'check' : row.stage] ?? 10;
      sum += weight;
      got += weight * (row.state === 'done' ? 1 : row.total ? row.done / row.total : 0);
    });
    return sum ? got / sum : 0;
  });

  /** Sectors of the image written so far (2048 bytes each), and of the whole image. */
  const sectors = computed(() => {
    const row = build.rows.find((entry) => entry.stage === 'write');
    return { written: Math.floor((row?.done ?? 0) / SECTOR), total: Math.floor((row?.total ?? 0) / SECTOR) };
  });

  async function startBuild(): Promise<void> {
    const installer = client.value;
    if (!installer || !request.value) return;
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
