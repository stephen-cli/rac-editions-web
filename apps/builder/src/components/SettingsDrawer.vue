<script setup lang="ts">
import { RacButton, RacChip, RacDrawer, RacIcon, RacSegmented, RacSwitch, useToasts } from '@rac-editions/ui';
import { computed } from 'vue';
import { useSession } from '../stores/session';

/**
 * Edition settings, deliberately out of the way: the switches the edition lets a player turn off and
 * Challenge Mode's economy. Features that need a missing disc show greyed, with the disc that unlocks them.
 */
const session = useSession();
const { toast } = useToasts();
const open = defineModel<boolean>('open', { default: false });

const settings = computed(() =>
  (session.edition?.options.switches ?? []).map((entry) => {
    const copy = session.copy?.features.find((feature) => feature.switch === entry.id);
    const disc = entry.needs ? session.edition?.discs[entry.needs] : undefined;
    return {
      id: entry.id,
      icon: copy?.icon ?? 'fixes',
      name: copy?.name ?? entry.id,
      text: copy?.detail ?? copy?.text ?? '',
      locked: session.featureState(entry.id) === 'locked',
      needs: disc ? `Needs ${disc.name}` : '',
      gold: !!entry.needs,
    };
  }),
);

const economyOptions = computed(() =>
  (session.edition?.options.economy ?? []).map((value) => ({
    value,
    label: session.copy?.economy[value]?.label ?? value,
    description: session.copy?.economy[value]?.text,
  })),
);

function reset(): void {
  session.resetSettings();
  toast('Edition settings reset to the designed game.');
}
</script>

<template>
  <RacDrawer
    v-model:open="open"
    title="Edition settings"
    icon="settings"
  >
    <div class="note">
      {{ session.copy?.designedNote }}
    </div>
    <div
      v-for="setting in settings"
      :key="setting.id"
      class="setting"
      :class="{ 'setting--locked': setting.locked }"
    >
      <span
        class="tile"
        :class="setting.locked ? 'tile--dim' : setting.gold ? 'tile--gold' : ''"
      ><RacIcon
        :name="setting.icon"
        :size="22"
      /></span>
      <h3 :id="`setting-${setting.id}`">
        {{ setting.name }}
        <RacChip v-if="setting.locked">
          {{ setting.needs }}
        </RacChip>
      </h3>
      <RacSwitch
        :model-value="!setting.locked && session.switches[setting.id] !== false"
        :disabled="setting.locked"
        :aria-labelledby="`setting-${setting.id}`"
        @update:model-value="session.switches[setting.id] = $event"
      />
      <p>{{ setting.text }}</p>
    </div>
    <div
      v-if="economyOptions.length > 1"
      class="setting"
    >
      <span class="tile"><RacIcon
        name="bolts"
        :size="22"
      /></span>
      <h3 id="setting-economy">
        Challenge Mode bolts
      </h3>
      <span />
      <RacSegmented
        v-model="session.economy"
        class="setting__wide"
        :options="economyOptions"
        aria-labelledby="setting-economy"
      />
    </div>
    <template #footer>
      <button
        type="button"
        class="text-button"
        :disabled="!session.customised"
        @click="reset"
      >
        Reset to designed
      </button>
      <RacButton
        :glow="false"
        @click="open = false"
      >
        Done
      </RacButton>
    </template>
  </RacDrawer>
</template>

<style scoped>
.note {
  margin-bottom: 8px;
  padding: 12px 14px;
  border-left: 2px solid var(--rac-holo);
  background: var(--rac-holo-glass);
  font-size: 14px;
}
.setting {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 6px 14px;
  padding: 14px 0;
  border-bottom: 1px solid var(--rac-edge-soft);
}
.setting h3 {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}
.setting p,
.setting__wide {
  grid-column: 2 / -1;
}
.setting p {
  margin: 0;
  color: var(--rac-ink-dim);
  font-size: 14px;
}
.setting--locked h3 {
  color: var(--rac-ink-dim);
}
</style>
