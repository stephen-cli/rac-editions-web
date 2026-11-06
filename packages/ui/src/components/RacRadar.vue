<script setup lang="ts">
/** A radar sweep that shows a disc being read or a stage running; still with reduced motion. Decorative. */
const { size = 52 } = defineProps<{
  /** Width and height in px. */
  size?: number;
}>();
</script>

<template>
  <span
    class="rac-radar"
    aria-hidden="true"
    :style="{ width: `${size}px`, height: `${size}px` }"
  />
</template>

<style scoped>
.rac-radar {
  position: relative;
  display: block;
  flex: none;
  overflow: hidden;
  border: 1px solid var(--rac-holo-line);
  border-radius: 50%;
  background:
    radial-gradient(circle, transparent 0 17%, var(--rac-holo-line) 18% 19%, transparent 20% 35%,
      color-mix(in srgb, var(--rac-holo) 25%, transparent) 36% 37%, transparent 38%),
    var(--rac-space);
}
.rac-radar::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: conic-gradient(from 0deg, color-mix(in srgb, var(--rac-holo) 65%, transparent), transparent 70deg);
  animation: rac-radar-sweep 1.1s linear infinite;
}
@keyframes rac-radar-sweep {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .rac-radar::after {
    animation: none;
    transform: rotate(40deg);
  }
}
</style>
