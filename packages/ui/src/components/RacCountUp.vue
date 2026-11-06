<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useReducedMotion } from '../motion/reducedMotion';

/**
 * A number that counts to its value: from `from` when it first appears (if given), then from whatever it
 * shows to each new value, easing out. So it serves a figure on the site and the builder's live sector
 * counter alike. The value itself is rendered from the start (a prerendered page shows it without
 * JavaScript), screen readers read only the value, never the digits in between, and with reduced motion
 * it changes at once.
 */
const {
  value,
  from,
  duration = 700,
  locale = 'en-GB',
} = defineProps<{
  /** The number to count to. */
  value: number;
  /** Where to count from when it first appears; left out, it starts at the value. */
  from?: number;
  /** How long each count takes, in ms. */
  duration?: number;
  /** Digit grouping follows this locale. */
  locale?: string;
}>();

const reduced = useReducedMotion();
const shown = ref(value);
const format = computed(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }));
let raf = 0;

/** Eases the shown number from where it is to `target` over `duration`. */
function countTo(target: number): void {
  cancelAnimationFrame(raf);
  if (reduced.value || duration <= 0) {
    shown.value = target;
    return;
  }
  const start = shown.value;
  const started = performance.now();
  const step = (now: number): void => {
    const t = Math.min(1, (now - started) / duration);
    shown.value = start + (target - start) * (1 - (1 - t) ** 3);
    if (t < 1) raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
}

onMounted(() => {
  if (from === undefined || reduced.value) return;
  shown.value = from;
  countTo(value);
});
onBeforeUnmount(() => cancelAnimationFrame(raf));
watch(
  () => value,
  (target) => countTo(target),
);
</script>

<template>
  <span class="rac-count-up">
    <span aria-hidden="true">{{ format.format(shown) }}</span>
    <span class="rac-sr-only">{{ format.format(value) }}</span>
  </span>
</template>

<style scoped>
.rac-count-up {
  font-variant-numeric: tabular-nums;
}
</style>
