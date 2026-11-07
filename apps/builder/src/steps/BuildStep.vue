<script setup lang="ts">
import { RacButton, RacCountUp, RacIcon, RacPanel, RacProgressBar, RacRadar } from '@rac-editions/ui';
import { computed, nextTick, useTemplateRef, watch } from 'vue';
import { useRouter } from 'vue-router';
import StepHead from '../components/StepHead.vue';
import { useSession } from '../stores/session';

/**
 * Step 5: the build. The sector counter and the percentage, then each stage as the installer reaches it,
 * with the log under Details. When the build ends it moves on to Done; a cancelled or failed build says
 * so here and leads back to Review.
 */
const session = useSession();
const router = useRouter();
const log = useTemplateRef<HTMLElement>('log');
/** Room for the sector counter's largest value: the image's sectors, or the plan's estimate until the write starts. */
const sectorRoom = computed(() => session.sectors.total || Math.ceil((session.plan?.bytes_needed ?? 0) / 2048));

const title = computed(() => {
  const name = session.edition?.name ?? 'edition';
  if (session.build.state === 'cancelled') return 'Build cancelled';
  if (session.build.state === 'failed') return "The build didn't finish";
  return `Building the ${name}`;
});

watch(
  () => session.build.state,
  (state) => {
    if (state === 'done') void router.push({ name: 'done' });
  },
  { immediate: true },
);

watch(
  () => session.build.log.length,
  async () => {
    await nextTick();
    if (log.value) log.value.scrollTop = log.value.scrollHeight;
  },
);
</script>

<template>
  <StepHead
    :key="title"
    eyebrow="Step 5 of 5"
    :title="title"
  />
  <RacPanel class="readout">
    <div class="readout__count">
      <RacIcon
        name="bolts"
        :size="34"
      />
      <RacCountUp
        :value="session.sectors.written"
        :max="sectorRoom"
        :duration="250"
      />
      <small>sectors<br>written</small>
    </div>
    <div class="readout__percent">
      {{ Math.floor(session.overall * 100) }}%
    </div>
  </RacPanel>
  <RacPanel>
    <ol class="stages">
      <li
        v-for="(row, at) in session.build.rows"
        :key="at"
        class="stage"
        :class="`stage--${row.state}`"
      >
        <span class="stage__mark">
          <RacIcon
            v-if="row.state === 'done'"
            name="check"
            :size="18"
          />
          <RacRadar
            v-else-if="row.state === 'active' && session.build.state === 'running'"
            :size="18"
          />
          <span
            v-else
            class="stage__dot"
          />
        </span>
        <div class="stage__label">
          <span :id="`stage-${at}`">{{ row.label }}</span>
          <RacProgressBar
            v-if="row.state === 'active'"
            tone="bolt"
            :value="row.total ? row.done / row.total : 0"
            :aria-labelledby="`stage-${at}`"
          />
        </div>
        <span class="stage__state">{{
          row.state === 'done' ? 'done' : row.state === 'active' ? `${Math.floor((row.total ? row.done / row.total : 0) * 100)}%` : 'waiting'
        }}</span>
      </li>
    </ol>
  </RacPanel>
  <p
    v-if="session.build.error"
    class="ended"
    role="alert"
  >
    {{ session.build.error }}
    <template v-if="session.build.state === 'cancelled'">
      {{ session.output.mode === 'new' ? 'The new image was deleted.' : 'Your image was restored.' }}
    </template>
  </p>
  <details>
    <summary>Details</summary>
    <pre
      ref="log"
      class="log"
    >{{ session.build.log.join('\n') }}</pre>
  </details>
  <div class="step-actions">
    <RacButton
      v-if="session.build.state === 'running'"
      variant="danger"
      :glow="false"
      @click="session.cancelBuild()"
    >
      Cancel
    </RacButton>
    <RacButton
      v-else
      @click="router.push({ name: 'review' })"
    >
      Back to review
    </RacButton>
  </div>
</template>

<style scoped>
.readout {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px 24px;
}
.readout__count {
  display: flex;
  align-items: center;
  gap: 12px;
  font: 700 clamp(28px, 5vw, 42px) var(--rac-font-display);
  letter-spacing: .02em;
}
.readout__count :deep(svg) {
  color: var(--rac-bolt);
}
.readout__count small {
  color: var(--rac-ink-dim);
  font: 500 12px/1.2 var(--rac-font-mono);
  letter-spacing: .08em;
  text-transform: uppercase;
}
.readout__percent {
  color: var(--rac-bolt);
  font: 600 22px var(--rac-font-display);
  font-variant-numeric: tabular-nums;
}
.stages {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.stage {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) 72px;
  align-items: center;
  gap: 12px;
  font-size: 15px;
}
.stage__mark {
  display: grid;
  place-items: center;
}
.stage--done .stage__mark {
  color: var(--rac-clank);
}
.stage__dot {
  width: 10px;
  height: 10px;
  border: 2px solid var(--rac-ink-faint);
  border-radius: 50%;
}
.stage__label {
  display: grid;
  gap: 6px;
}
.stage--waiting .stage__label {
  color: var(--rac-ink-dim);
}
.stage__state {
  color: var(--rac-ink-faint);
  font: 12px var(--rac-font-mono);
  text-align: right;
}
.stage--active .stage__state {
  color: var(--rac-holo);
}
.stage--done .stage__state {
  color: var(--rac-clank);
}
.ended {
  margin: 0;
  color: var(--rac-hazard);
}
details summary {
  color: var(--rac-ink-dim);
  font-size: 14px;
  cursor: pointer;
}
.log {
  max-height: 180px;
  margin: 10px 0 0;
  padding: 12px 14px;
  overflow: auto;
  border: 1px solid var(--rac-edge-soft);
  background: color-mix(in srgb, var(--rac-space) 90%, transparent);
  color: var(--rac-ink-dim);
  font: 12.5px/1.6 var(--rac-font-mono);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>
