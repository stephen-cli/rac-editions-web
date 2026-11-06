<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useId, useTemplateRef } from 'vue';
import { useReducedMotion } from '../motion/reducedMotion';

/**
 * A heading that fuzzes for a moment when it appears, faintly while the pointer is on it, and in a short
 * glitch every 3 to 12 seconds, like a CRT picture: each row of pixels jumps sideways by its own amount.
 * The fuzz is an SVG filter over the real text, so the heading stays text for screen readers, selection
 * and wrapping. Remount it (a :key) to fuzz again for new text.
 */
const { level = 2 } = defineProps<{
  /** The heading level, h1 to h6. */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
}>();

const filterId = `rac-fuzz-${useId()}`;
const heading = useTemplateRef<HTMLElement>('heading');
const noise = useTemplateRef<SVGFETurbulenceElement>('noise');
const displace = useTemplateRef<SVGFEDisplacementMapElement>('displace');
const reduced = useReducedMotion();
const fuzzing = ref(false);
let timer = 0;
let glitchTimer = 0;
let hovering = false;

/** Shifts each row of the text sideways at random, from `peak` px easing out over `duration` ms. */
function fuzz(peak: number, duration: number): void {
  if (reduced.value || !displace.value || !noise.value) return;
  const map = displace.value;
  const turbulence = noise.value;
  clearInterval(timer);
  const started = performance.now();
  fuzzing.value = true;
  timer = window.setInterval(() => {
    const t = Math.min(1, (performance.now() - started) / duration);
    const floor = hovering ? 3 : 0;
    map.setAttribute('scale', (floor + (peak - floor) * (1 - t) * (1 - t)).toFixed(2));
    turbulence.setAttribute('seed', String(Math.floor(Math.random() * 1000)));
    if (t >= 1 && !hovering) {
      clearInterval(timer);
      map.setAttribute('scale', '0');
      fuzzing.value = false;
    }
  }, 45);
}

function hover(on: boolean): void {
  hovering = on;
  if (on) fuzz(7, 260);
  else fuzz(3, 160);
}

/** A short glitch now and then, at random gaps, skipped while hovered or while the page is hidden. */
function scheduleGlitch(): void {
  glitchTimer = window.setTimeout(() => {
    if (!hovering && !document.hidden) fuzz(9, 220);
    scheduleGlitch();
  }, 3000 + Math.random() * 9000);
}

onMounted(() => {
  fuzz(16, 520);
  scheduleGlitch();
});
onBeforeUnmount(() => {
  clearInterval(timer);
  clearTimeout(glitchTimer);
});

defineExpose({
  /** Moves focus to the heading, as a wizard does on each new step (give it tabindex="-1"). */
  focus: () => heading.value?.focus({ preventScroll: true }),
});
</script>

<template>
  <component
    :is="`h${level}`"
    ref="heading"
    class="rac-heading"
    :style="fuzzing ? { filter: `url(#${filterId})` } : undefined"
    @pointerenter="hover(true)"
    @pointerleave="hover(false)"
  >
    <slot />
    <svg
      class="rac-heading__defs"
      width="0"
      height="0"
      aria-hidden="true"
      focusable="false"
    >
      <filter
        :id="filterId"
        x="-5%"
        y="-20%"
        width="110%"
        height="140%"
      >
        <feTurbulence
          ref="noise"
          type="fractalNoise"
          baseFrequency="0.0001 0.9"
          numOctaves="1"
          seed="2"
          result="noise"
        />
        <feColorMatrix
          in="noise"
          type="matrix"
          values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0 0.5"
          result="bands"
        />
        <feDisplacementMap
          ref="displace"
          in="SourceGraphic"
          in2="bands"
          scale="0"
          xChannelSelector="R"
          yChannelSelector="A"
        />
      </filter>
    </svg>
  </component>
</template>

<style scoped>
.rac-heading {
  margin: 0;
  font-family: var(--rac-font-display);
  font-weight: 700;
  letter-spacing: .02em;
  text-wrap: balance;
}
.rac-heading:focus {
  outline: none;
}
.rac-heading__defs {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
}
</style>
