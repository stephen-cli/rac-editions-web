<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useReducedMotion } from '../motion/reducedMotion';

/**
 * A number that counts to its value: from `from` when it first appears (if given), then from whatever it
 * shows to each new value, easing out. So it serves a figure on the site and the builder's live sector
 * counter alike. The value itself is rendered from the start (a prerendered page shows it without
 * JavaScript), screen readers read only the value, never the digits in between, and with reduced motion
 * it changes at once. Each digit takes the width of a 0, as the display font's digits differ in width,
 * so the digits hold still as they change; `max` keeps room for the widest value, so neither does what
 * follows the number move as digits are added.
 */
const {
  value,
  from,
  duration = 700,
  locale = 'en-GB',
  max,
} = defineProps<{
  /** The number to count to. */
  value: number;
  /** Where to count from when it first appears; left out, it starts at the value. */
  from?: number;
  /** How long each count takes, in ms. */
  duration?: number;
  /** Digit grouping follows this locale. */
  locale?: string;
  /** The largest value it will show, if known: its width is kept from the start. */
  max?: number;
}>();

const reduced = useReducedMotion();
const shown = ref(value);
const format = computed(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }));
/** A formatted number as characters, each marked as a digit or not. */
const characters = (number: number) => [...format.value.format(number)].map((text) => ({ text, digit: /\d/.test(text) }));
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
    <span
      v-if="max !== undefined"
      class="rac-count-up__room"
      aria-hidden="true"
    ><span
      v-for="(character, at) in characters(Math.max(max, value))"
      :key="at"
      :class="{ 'rac-count-up__digit': character.digit }"
    >{{ character.text }}</span></span>
    <span
      class="rac-count-up__shown"
      aria-hidden="true"
    ><span
      v-for="(character, at) in characters(shown)"
      :key="at"
      :class="{ 'rac-count-up__digit': character.digit }"
    >{{ character.text }}</span></span>
    <span class="rac-sr-only">{{ format.format(value) }}</span>
  </span>
</template>

<style scoped>
/* The room and the number share one cell, so the cell is as wide as the wider of them. */
.rac-count-up {
  display: inline-grid;
  justify-items: start;
  font-variant-numeric: tabular-nums;
}
.rac-count-up > * {
  grid-area: 1 / 1;
}
.rac-count-up__room {
  visibility: hidden;
}
.rac-count-up__digit {
  display: inline-block;
  width: 1ch;
  text-align: center;
}
</style>
