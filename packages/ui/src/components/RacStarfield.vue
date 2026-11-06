<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue';
import { createStarfield, type Starfield } from '../effects/starfield';
import { useReducedMotion } from '../motion/reducedMotion';

/** The starfield canvas, filling its positioned parent; warp 0 drifts, 1 is a full warp. */
const { warp = 0 } = defineProps<{
  /** 0 is the idle drift, 1 a full warp; the speed eases between them. */
  warp?: number;
}>();

const canvas = useTemplateRef<HTMLCanvasElement>('canvas');
const reduced = useReducedMotion();
let field: Starfield | null = null;

function start(): void {
  field?.destroy();
  const el = canvas.value;
  if (!el?.parentElement) return;
  field = createStarfield(el, el.parentElement, reduced.value);
  field.setWarp(warp);
}

onMounted(start);
onBeforeUnmount(() => field?.destroy());
watch(reduced, start);
watch(
  () => warp,
  (amount) => field?.setWarp(amount),
);
</script>

<template>
  <canvas
    ref="canvas"
    class="rac-starfield"
    aria-hidden="true"
  />
</template>

<style scoped>
.rac-starfield {
  position: absolute;
  inset: 0;
  z-index: 0;
  display: block;
  width: 100%;
  height: 100%;
  background: var(--rac-space);
}
</style>
