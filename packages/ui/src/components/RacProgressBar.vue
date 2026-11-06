<script setup lang="ts">
/**
 * A thin progress bar: holo cyan while reading a disc, bolt gold while building. Name it with aria-label
 * or aria-labelledby; screen readers get the percentage.
 */
const { value, tone = 'holo' } = defineProps<{
  /** How far along, 0 to 1. */
  value: number;
  tone?: 'holo' | 'bolt';
}>();
</script>

<template>
  <div
    class="rac-progress-bar"
    :class="`rac-progress-bar--${tone}`"
    role="progressbar"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-valuenow="Math.round(Math.min(1, Math.max(0, value)) * 100)"
  >
    <i :style="{ width: `${Math.min(1, Math.max(0, value)) * 100}%` }" />
  </div>
</template>

<style scoped>
.rac-progress-bar {
  position: relative;
  height: 6px;
  overflow: hidden;
  border: 1px solid var(--rac-edge-soft);
  background: var(--rac-space);
}
.rac-progress-bar i {
  position: absolute;
  inset: 0 auto 0 0;
  background: linear-gradient(90deg, var(--rac-holo), var(--rac-glow-holo));
  transition: width 120ms linear;
}
.rac-progress-bar--bolt i {
  background: linear-gradient(90deg, color-mix(in srgb, var(--rac-bolt-face) 80%, var(--rac-space)), var(--rac-bolt-face));
}
@media (prefers-reduced-motion: reduce) {
  .rac-progress-bar i {
    transition: none;
  }
}
</style>
