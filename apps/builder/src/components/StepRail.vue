<script setup lang="ts">
import { RacIcon } from '@rac-editions/ui';
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { STEPS, useSession, type StepId } from '../stores/session';

/** The wizard's steps down the left: done ones ticked, the current one gold, later ones not yet open. */
const session = useSession();
const route = useRoute();
const router = useRouter();

const LABELS: Record<Exclude<StepId, 'done'>, string> = {
  edition: 'Edition',
  discs: 'Discs',
  output: 'Output',
  review: 'Review',
  build: 'Build',
};

const current = computed(() => STEPS.indexOf(route.name as StepId));
const steps = computed(() =>
  (Object.keys(LABELS) as (keyof typeof LABELS)[]).map((id, index) => ({
    id,
    label: LABELS[id],
    index,
    state: index === current.value ? 'current' : index < current.value ? 'done' : 'later',
  })),
);

const okDiscs = computed(() =>
  (['rac1', 'rac2'] as const)
    .filter((key) => session.hasDisc(key))
    .map((key) => ({ key, label: `${session.edition?.discs[key]?.name} (${session.edition?.discs[key]?.region})` })),
);
</script>

<template>
  <nav
    class="rail"
    aria-label="Steps"
  >
    <div class="rail__label">
      Build an edition
    </div>
    <ol>
      <li
        v-for="step in steps"
        :key="step.id"
        :class="`rail__step--${step.state}`"
      >
        <button
          type="button"
          :disabled="!session.canOpen(step.id) || step.state === 'current'"
          :aria-current="step.state === 'current' ? 'step' : undefined"
          @click="router.push({ name: step.id })"
        >
          <span class="rail__num">
            <RacIcon
              v-if="step.state === 'done'"
              name="check"
              :size="14"
            />
            <template v-else>{{ step.index + 1 }}</template>
          </span>
          <span>{{ step.label }}</span>
        </button>
      </li>
    </ol>
    <div
      v-if="okDiscs.length"
      class="rail__discs"
    >
      <div
        v-for="disc in okDiscs"
        :key="disc.key"
      >
        <RacIcon
          name="disc"
          :size="14"
        />
        <span>{{ disc.label }}</span>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.rail {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 24px 16px;
  border-right: 1px solid var(--rac-edge-soft);
  background: var(--rac-rail-glass);
}
.rail__label {
  padding: 0 10px 10px;
  color: var(--rac-ink-faint);
  font: 11px var(--rac-font-mono);
  letter-spacing: .1em;
  text-transform: uppercase;
}
.rail ol {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.rail button {
  display: grid;
  grid-template-columns: 28px 1fr;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border: 1px solid transparent;
  background: none;
  color: var(--rac-ink-dim);
  font: 500 15px/1.2 var(--rac-font-body);
  text-align: left;
  cursor: pointer;
}
.rail button:disabled {
  color: var(--rac-ink-faint);
  cursor: default;
}
.rail__num {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--rac-edge);
  background: var(--rac-plate-900);
  font: 600 13px var(--rac-font-display);
  clip-path: polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px);
}
.rail__step--done .rail__num {
  border-color: var(--rac-clank);
  background: var(--rac-clank-glass);
  color: var(--rac-clank);
}
.rail__step--current button {
  border-color: var(--rac-holo-line);
  background: var(--rac-holo-glass);
  color: var(--rac-ink);
}
.rail__step--current .rail__num {
  border-color: var(--rac-bolt);
  background: var(--rac-bolt-face);
  color: var(--rac-bolt-ink);
}
.rail__discs {
  display: grid;
  gap: 6px;
  margin-top: auto;
  padding: 16px 10px 0;
  border-top: 1px solid var(--rac-edge-soft);
  color: var(--rac-ink-dim);
  font-size: 13px;
}
.rail__discs div {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.rail__discs :deep(svg) {
  color: var(--rac-clank);
}
.rail__discs span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
@media (max-width: 760px) {
  .rail {
    padding: 12px;
    border-right: 0;
    border-bottom: 1px solid var(--rac-edge-soft);
  }
  .rail__label,
  .rail__discs {
    display: none;
  }
  .rail ol {
    flex-direction: row;
    overflow-x: auto;
  }
  .rail li {
    flex: none;
  }
}
</style>
