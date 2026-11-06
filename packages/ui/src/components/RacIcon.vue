<script setup lang="ts">
import { ICONS, type IconName } from '../icons/icons';

/** An icon from icons.ts in currentColor. Decorative unless it has a `label`, which screen readers read. */
const { name, label, size = 24 } = defineProps<{
  /** The icon from icons.ts. */
  name: IconName;
  /** What a screen reader says; leave it out when text beside the icon already says it. */
  label?: string;
  /** Width and height in px. */
  size?: number;
}>();
</script>

<template>
  <svg
    class="rac-icon"
    viewBox="0 0 24 24"
    :width="size"
    :height="size"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    :role="label ? 'img' : undefined"
    :aria-label="label"
    :aria-hidden="label ? undefined : 'true'"
    focusable="false"
    v-html="ICONS[name]"
  />
</template>

<style scoped>
.rac-icon {
  flex: none;
}
</style>
