<script setup lang="ts">
import { RadioGroupItem, RadioGroupRoot } from 'reka-ui';

export interface SegmentedOption {
  value: string;
  label: string;
  /** A line under the label saying what the choice does. */
  description?: string;
}

/**
 * One choice of a few, side by side, each with a line saying what it does: Challenge Mode's economy, for
 * one. A radio group underneath, so arrow keys move between the choices. Name it with aria-label.
 */
const { options } = defineProps<{
  options: SegmentedOption[];
}>();

const value = defineModel<string>({ required: true });
</script>

<template>
  <RadioGroupRoot
    v-model="value"
    class="rac-segmented"
    :style="{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }"
    orientation="horizontal"
    loop
  >
    <RadioGroupItem
      v-for="option in options"
      :key="option.value"
      class="rac-segmented__option"
      :value="option.value"
    >
      <b>{{ option.label }}</b>
      <small v-if="option.description">{{ option.description }}</small>
    </RadioGroupItem>
  </RadioGroupRoot>
</template>

<style scoped>
.rac-segmented {
  display: grid;
  border: 1px solid var(--rac-edge);
}
.rac-segmented__option {
  display: grid;
  align-content: start;
  gap: 2px;
  padding: 10px 12px;
  border: 0;
  background: var(--rac-plate-900);
  color: var(--rac-ink-dim);
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.rac-segmented__option + .rac-segmented__option {
  border-left: 1px solid var(--rac-edge);
}
.rac-segmented__option b {
  color: var(--rac-ink);
  font: 600 15px/1.3 var(--rac-font-display);
  letter-spacing: .03em;
}
.rac-segmented__option small {
  font-size: 12.5px;
  line-height: 1.35;
}
.rac-segmented__option[data-state="checked"] {
  background: var(--rac-bolt-glass);
  box-shadow: inset 0 -2px 0 var(--rac-bolt);
}
.rac-segmented__option:focus-visible {
  outline-offset: -2px;
}
</style>
