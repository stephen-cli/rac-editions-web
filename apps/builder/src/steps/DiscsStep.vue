<script setup lang="ts">
import { RacButton, useToasts } from '@rac-editions/ui';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import DiscRow from '../components/DiscRow.vue';
import StepHead from '../components/StepHead.vue';
import type { DiscKey } from '../installer/protocol';
import { useSession, type Added } from '../stores/session';

/**
 * Step 2: a row per game the edition uses. Images come from the file dialog, the DVD drive, or a drop
 * anywhere on the list; each lands in its own game's row once identified, whichever row it was added to.
 */
const session = useSession();
const router = useRouter();
const { toast } = useToasts();
const dragging = ref(false);

const rows = computed(() =>
  (['rac1', 'rac2'] as const).flatMap((id) => {
    const disc = session.edition?.discs[id];
    return disc ? [{ id, disc, need: session.copy?.discs[id] ?? '' }] : [];
  }),
);
const dvdBusy = computed(() => Object.values(session.discs).some((slot) => slot?.status === 'reading' && slot.fromDvd));

/** Says what an added image turned out to be, and where it went if not to the row it was added to. */
function report(added: Added | null, slot: DiscKey): void {
  const found = added?.image.identified;
  if (!added || added.image.status !== 'ok' || !found) return;
  const name = `${found.name} (${found.region})`;
  toast(added.row === slot ? `${name} recognised.` : `That was ${name}, so it went in its own row.`);
}

async function add(paths: string[], slot: DiscKey): Promise<void> {
  await Promise.all(paths.map(async (path) => report(await session.addImage(path, slot), slot)));
}

async function choose(slot: DiscKey): Promise<void> {
  const paths = await session.platform?.pickImages();
  if (paths?.length) await add(paths, slot);
}

async function readDvd(slot: DiscKey): Promise<void> {
  report(await session.readDvd(slot), slot);
}

function drop(event: DragEvent): void {
  dragging.value = false;
  const paths = session.platform?.droppedImages(event) ?? [];
  if (paths.length) void add(paths, 'rac1');
}
</script>

<template>
  <StepHead
    eyebrow="Step 2 of 5"
    title="Add your discs"
    intro="Use a disc image or the game DVD. You can also drop images here. Nothing leaves your computer."
  />
  <ul
    class="discs"
    :class="{ 'discs--over': dragging }"
    aria-live="polite"
    @dragover.prevent="dragging = true"
    @dragleave.self="dragging = false"
    @drop.prevent="drop"
  >
    <DiscRow
      v-for="row in rows"
      :key="row.id"
      :disc="row.disc"
      :image="session.discs[row.id]"
      :need="row.need"
      :can-read-dvd="!!session.platform?.readDvd"
      :busy="dvdBusy"
      @choose="choose(row.id)"
      @read-dvd="readDvd(row.id)"
      @remove="session.removeDisc(row.id)"
    />
  </ul>
  <div class="step-actions">
    <RacButton
      :glow="false"
      @click="router.push({ name: 'edition' })"
    >
      Back
    </RacButton>
    <div class="step-actions__end">
      <RacButton
        variant="primary"
        :disabled="!session.baseDisc || session.reading"
        @click="router.push({ name: 'output' })"
      >
        Next: output
      </RacButton>
    </div>
  </div>
</template>

<style scoped>
.discs {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
  outline: 1.5px dashed transparent;
  outline-offset: 6px;
  transition: outline-color var(--rac-duration-fast) var(--rac-ease);
}
.discs--over {
  outline-color: var(--rac-holo);
}
</style>
