<script setup lang="ts">
import { RacButton, RacIcon, RacPanel } from '@rac-editions/ui';
import { useRouter } from 'vue-router';
import StepHead from '../components/StepHead.vue';
import { EDITION_COPY, PLANNED_EDITIONS } from '../editions/copy';
import { useSession } from '../stores/session';

/** Step 1: the editions the installer has, beside the planned ones, at equal size. */
const session = useSession();
const router = useRouter();
</script>

<template>
  <StepHead
    eyebrow="Step 1 of 5"
    title="Choose an edition"
    intro="Each edition is built from your own copy of the game. Nothing from the games is downloaded."
  />
  <div
    class="editions"
    role="radiogroup"
    aria-label="Editions"
  >
    <button
      v-for="edition in session.editions"
      :key="edition.id"
      type="button"
      role="radio"
      class="edition"
      :aria-checked="session.editionId === edition.id"
      @click="session.chooseEdition(edition.id)"
    >
      <RacPanel
        glow
        :tone="session.editionId === edition.id ? 'selected' : 'default'"
        class="edition__panel"
      >
        <div class="edition__game">
          {{ edition.game }}
        </div>
        <h3>{{ edition.name }}</h3>
        <div class="edition__needs">
          <RacIcon
            name="disc"
            :size="20"
          />
          <span>{{ EDITION_COPY[edition.id]?.needs ?? `Needs ${edition.game}` }}</span>
        </div>
      </RacPanel>
    </button>
    <div
      v-for="planned in PLANNED_EDITIONS"
      :key="planned.name"
      class="edition edition--planned"
    >
      <RacPanel class="edition__panel">
        <div class="edition__game">
          {{ planned.game }}
        </div>
        <h3>{{ planned.name }}</h3>
        <div class="edition__needs edition__needs--planned">
          <RacIcon
            name="pause"
            :size="20"
          />
          <span>Planned</span>
        </div>
      </RacPanel>
    </div>
  </div>
  <div class="step-actions">
    <div class="step-actions__end">
      <RacButton
        variant="primary"
        :disabled="!session.edition"
        @click="router.push({ name: 'discs' })"
      >
        Next: discs
      </RacButton>
    </div>
  </div>
</template>

<style scoped>
.editions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}
.edition {
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.edition--planned {
  opacity: .62;
  cursor: default;
}
.edition__panel {
  display: grid;
  align-content: start;
  gap: 10px;
  height: 100%;
  padding: 22px;
}
.edition__game {
  color: var(--rac-ink-faint);
  font: 12px var(--rac-font-mono);
  letter-spacing: .06em;
  text-transform: uppercase;
}
.edition h3 {
  margin: 0;
  font: 700 22px var(--rac-font-display);
  letter-spacing: .02em;
}
.edition__needs {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px solid var(--rac-edge-soft);
  color: var(--rac-ink-dim);
  font-size: 14px;
}
.edition__needs :deep(svg) {
  color: var(--rac-holo);
}
.edition__needs--planned :deep(svg) {
  color: var(--rac-ink-faint);
}
@media (max-width: 640px) {
  .editions {
    grid-template-columns: 1fr;
  }
}
</style>
