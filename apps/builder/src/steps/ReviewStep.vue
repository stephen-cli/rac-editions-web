<script setup lang="ts">
import { RacButton, RacChip, RacIcon, RacPanel } from '@rac-editions/ui';
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import SettingsDrawer from '../components/SettingsDrawer.vue';
import StepHead from '../components/StepHead.vue';
import { useSession } from '../stores/session';

/**
 * Step 4: the edition, the discs and the output, then everything the build will hold, each feature with
 * its icon. A feature switched off or locked by a missing disc says so. The settings stay behind a small
 * "Edition settings" link. Discs still being checked are shown as such, and the build waits for them.
 */
const session = useSession();
const router = useRouter();
const settingsOpen = ref(false);

const discs = computed(() =>
  (['rac1', 'rac2'] as const)
    .filter((key) => session.request?.discs[key])
    .map((key) => {
      const name = `${session.edition?.discs[key]?.name} (${session.edition?.discs[key]?.region})`;
      return session.discs[key]?.status === 'reading' ? `${name}, checking` : name;
    }),
);

const features = computed(() =>
  (session.copy?.features ?? []).map((feature) => {
    const state = feature.switch ? session.featureState(feature.switch) : 'on';
    const needs = feature.switch ? session.edition?.options.switches.find((entry) => entry.id === feature.switch)?.needs : null;
    return { ...feature, state, gold: !!needs, needs: needs ? session.edition?.discs[needs] : undefined };
  }),
);

const economyText = computed(() => session.copy?.economy[session.economy]?.short ?? session.economy);
const gigabytes = computed(() => (session.plan ? (session.plan.bytes_needed / 1e9).toFixed(1) : ''));

onMounted(() => session.refreshPlan());
watch(() => session.request, () => session.refreshPlan(), { deep: true });

async function build(): Promise<void> {
  void session.startBuild();
  await router.push({ name: 'build' });
}
</script>

<template>
  <StepHead
    eyebrow="Step 4 of 5"
    title="Review and build"
  />
  <div class="summary">
    <RacPanel>
      <span class="kv-label">Edition</span>
      <span class="kv-value">{{ session.edition?.name }}</span>
      <span class="kv-sub">{{ session.edition?.game }} ({{ session.edition?.discs.rac1?.region }})</span>
    </RacPanel>
    <RacPanel>
      <span class="kv-label">Discs</span>
      <span
        v-for="disc in discs"
        :key="disc"
        class="kv-value"
      >{{ disc }}</span>
    </RacPanel>
    <RacPanel :tone="session.output.mode === 'in_place' ? 'hazard' : 'default'">
      <span class="kv-label">Output</span>
      <span class="kv-value">{{ session.output.mode === 'new' ? 'New image' : 'Update in place' }}</span>
      <span class="kv-sub">{{ session.output.mode === 'new' ? session.output.path : session.baseDisc?.path }}</span>
    </RacPanel>
  </div>

  <div class="features-head">
    <h3>What's in your build</h3>
    <RacChip
      v-if="session.customised"
      tone="bolt"
    >
      Customised
    </RacChip>
    <button
      v-if="session.customised"
      type="button"
      class="text-button"
      @click="session.resetSettings()"
    >
      Reset to designed
    </button>
  </div>
  <ul class="features">
    <li
      v-for="feature in features"
      :key="feature.name"
      class="feature"
      :class="`feature--${feature.state}`"
    >
      <span
        class="tile"
        :class="feature.state !== 'on' ? 'tile--dim' : feature.gold ? 'tile--gold' : ''"
      ><RacIcon
        :name="feature.icon"
        :size="22"
      /></span>
      <div class="feature__words">
        <b>{{ feature.name }}</b>
        <span v-if="feature.state === 'locked'">
          Needs {{ feature.needs?.name }} ({{ feature.needs?.region }}).
          <button
            type="button"
            class="text-button feature__add"
            @click="router.push({ name: 'discs' })"
          >Add it</button>
        </span>
        <span v-else-if="feature.state === 'checking'">Checking {{ feature.needs?.name }} ({{ feature.needs?.region }}).</span>
        <span v-else-if="feature.state === 'off'">Switched off in Edition settings.</span>
        <span v-else>{{ feature.text }}</span>
      </div>
    </li>
    <li class="feature">
      <span class="tile"><RacIcon
        name="bolts"
        :size="22"
      /></span>
      <div class="feature__words">
        <b>Challenge Mode bolts</b>
        <span>{{ economyText }}</span>
      </div>
    </li>
  </ul>

  <div class="settings-entry">
    <p
      v-if="session.planError"
      class="plan-error"
      role="alert"
    >
      {{ session.planError }}
    </p>
    <span
      v-else-if="session.reading"
      class="space"
    >Checking your discs: {{ Math.floor(session.checking * 100) }}%. You can build once they're checked.</span>
    <span
      v-else-if="gigabytes"
      class="space"
    >Needs about {{ gigabytes }} GB free</span>
    <button
      type="button"
      class="text-button text-button--quiet"
      @click="settingsOpen = true"
    >
      <RacIcon
        name="settings"
        :size="15"
      />
      Edition settings
    </button>
  </div>

  <div class="step-actions">
    <RacButton
      :glow="false"
      @click="router.push({ name: 'output' })"
    >
      Back
    </RacButton>
    <div class="step-actions__end">
      <RacButton
        variant="primary"
        :disabled="!session.canBuild"
        @click="build"
      >
        <RacIcon
          name="bolts"
          :size="16"
        />
        Build {{ session.edition?.name }}
      </RacButton>
    </div>
  </div>
  <SettingsDrawer v-model:open="settingsOpen" />
</template>

<style scoped>
.summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
}
.summary .rac-panel {
  display: grid;
  align-content: start;
  gap: 6px;
}
.kv-label {
  color: var(--rac-ink-faint);
  font: 500 11px/1 var(--rac-font-mono);
  letter-spacing: .1em;
  text-transform: uppercase;
}
.kv-value {
  font: 600 16px var(--rac-font-display);
  letter-spacing: .02em;
  overflow-wrap: anywhere;
}
.kv-sub {
  color: var(--rac-ink-dim);
  font-size: 13px;
  overflow-wrap: anywhere;
}
.features-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}
.features-head h3 {
  margin: 0;
  font: 700 18px var(--rac-font-display);
  letter-spacing: .03em;
}
.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
  gap: 4px 24px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.feature {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid var(--rac-edge-soft);
}
.feature__words {
  display: grid;
  gap: 1px;
  min-width: 0;
}
.feature__words b {
  font-weight: 600;
}
.feature__words span {
  color: var(--rac-ink-dim);
  font-size: 14px;
}
.feature--off b,
.feature--locked b {
  color: var(--rac-ink-dim);
}
.feature__add {
  padding: 0;
}
.settings-entry {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
}
.space {
  color: var(--rac-ink-faint);
  font: 12px var(--rac-font-mono);
}
.plan-error {
  margin: 0;
  color: var(--rac-hazard);
  font-size: 14px;
}
</style>
