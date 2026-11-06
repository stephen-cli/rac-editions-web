<script setup lang="ts">
import { RacButton, RacChip, RacIcon, RacPanel, RacProgressBar, RacRadar } from '@rac-editions/ui';
import { computed } from 'vue';
import type { EditionDisc } from '../installer/protocol';
import type { DiscSlot } from '../stores/session';

/**
 * One game the edition uses: what it is for, then the image being read (a radar and a progress bar),
 * the image found, or why the image given can't be used.
 */
const { disc, image, need, canReadDvd, busy } = defineProps<{
  disc: EditionDisc;
  /** The image added for this game, if any. */
  image?: DiscSlot;
  need: string;
  canReadDvd: boolean;
  /** Another disc is being read from the DVD drive. */
  busy: boolean;
}>();

const emit = defineEmits<{ choose: []; readDvd: []; remove: [] }>();

const title = computed(() => `${disc.name} (${disc.region})`);
const icon = computed(() => (disc.required ? 'disc' : 'boots'));
</script>

<template>
  <RacPanel
    as="li"
    class="disc"
    :tone="image?.status === 'refused' ? 'hazard' : 'default'"
  >
    <div class="disc__icon">
      <RacRadar v-if="image?.status === 'reading'" />
      <span
        v-else-if="image?.status === 'ok'"
        class="disc__found"
      ><RacIcon
        name="check"
        :size="28"
      /></span>
      <span
        v-else
        class="tile"
        :class="{ 'tile--gold': !disc.required }"
      ><RacIcon
        :name="icon"
        :size="22"
      /></span>
    </div>
    <div class="disc__info">
      <div class="disc__title">
        {{ disc.name }}
        <RacChip :tone="image?.status === 'ok' ? 'ok' : 'default'">
          {{ disc.region }}
        </RacChip>
      </div>
      <div
        v-if="!image"
        class="disc__need"
      >
        {{ need }}
      </div>
      <div
        v-else-if="image.status === 'reading'"
        class="disc__reading"
      >
        <RacProgressBar
          :value="image.progress"
          :aria-label="`Reading ${title}`"
        />
        <span>{{ image.fromDvd && image.progress < 0.5 ? 'Copying the DVD' : 'Checking' }} {{ Math.floor(image.progress * 100) }}%</span>
      </div>
      <div
        v-else-if="image.status === 'ok'"
        class="disc__path mono"
      >
        {{ image.fromDvd ? `Copied from the DVD to ${image.path}` : image.path }}
      </div>
      <div
        v-else
        class="disc__message"
        role="alert"
      >
        {{ image.message }}
      </div>
    </div>
    <div class="disc__actions">
      <template v-if="!image || image.status === 'refused'">
        <RacButton
          :glow="false"
          @click="emit('choose')"
        >
          Choose image
        </RacButton>
        <button
          v-if="canReadDvd"
          type="button"
          class="text-button text-button--quiet"
          :disabled="busy"
          @click="emit('readDvd')"
        >
          or read the DVD
        </button>
      </template>
      <button
        v-else-if="image.status === 'ok'"
        type="button"
        class="text-button text-button--quiet"
        :aria-label="`Remove ${title}`"
        @click="emit('remove')"
      >
        Remove
      </button>
    </div>
  </RacPanel>
</template>

<style scoped>
.disc {
  display: grid;
  grid-template-columns: 52px 1fr auto;
  align-items: center;
  gap: 16px;
}
.disc__icon {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
}
.disc__found {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1.4px solid var(--rac-clank);
  border-radius: 50%;
  background: var(--rac-clank-glass);
  color: var(--rac-clank);
}
.disc__info {
  display: grid;
  gap: 6px;
  min-width: 0;
}
.disc__title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font: 600 17px var(--rac-font-display);
  letter-spacing: .02em;
}
.disc__need {
  color: var(--rac-ink-dim);
  font-size: 14px;
}
.disc__reading {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 10px;
  color: var(--rac-ink-dim);
  font: 12px var(--rac-font-mono);
}
.disc__path {
  color: var(--rac-ink-faint);
}
.disc__message {
  color: var(--rac-hazard);
  font-size: 14px;
}
.disc__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 6px 16px;
}
@media (max-width: 640px) {
  .disc {
    grid-template-columns: 44px 1fr;
  }
  .disc__actions {
    grid-column: 1 / -1;
    justify-content: flex-start;
  }
}
</style>
