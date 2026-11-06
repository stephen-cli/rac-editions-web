<script setup lang="ts">
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from 'reka-ui';
import RacIcon from './RacIcon.vue';
import type { IconName } from '../icons/icons';

export interface Tab {
  value: string;
  label: string;
  icon?: IconName;
}

/**
 * Tabs with a bolt-gold underline on the chosen one; each tab's content is the slot named after its value.
 * Arrow keys move between tabs. Name the tab list with `label`.
 */
const { tabs, label } = defineProps<{
  tabs: Tab[];
  /** What the tabs choose between, for screen readers. */
  label: string;
}>();

const value = defineModel<string>({ required: true });
</script>

<template>
  <TabsRoot
    v-model="value"
    class="rac-tabs"
  >
    <TabsList
      class="rac-tabs__list"
      :aria-label="label"
    >
      <TabsTrigger
        v-for="tab in tabs"
        :key="tab.value"
        class="rac-tabs__tab"
        :value="tab.value"
      >
        <RacIcon
          v-if="tab.icon"
          :name="tab.icon"
          :size="18"
        />
        {{ tab.label }}
      </TabsTrigger>
    </TabsList>
    <TabsContent
      v-for="tab in tabs"
      :key="tab.value"
      class="rac-tabs__panel"
      :value="tab.value"
    >
      <slot :name="tab.value" />
    </TabsContent>
  </TabsRoot>
</template>

<style scoped>
.rac-tabs__list {
  display: flex;
  flex-wrap: wrap;
  border-bottom: 1px solid var(--rac-edge);
}
.rac-tabs__tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: -1px;
  padding: 10px 14px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: none;
  color: var(--rac-ink-dim);
  font: 600 14px/1 var(--rac-font-display);
  letter-spacing: .06em;
  text-transform: uppercase;
  cursor: pointer;
}
.rac-tabs__tab[data-state="active"] {
  border-bottom-color: var(--rac-bolt);
  color: var(--rac-ink);
}
.rac-tabs__panel {
  padding-top: 14px;
}
.rac-tabs__panel:focus-visible {
  outline-offset: 6px;
}
</style>
