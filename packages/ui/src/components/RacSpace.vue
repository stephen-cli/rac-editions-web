<script setup lang="ts">
import RacStarfield from './RacStarfield.vue';
import { useFizz } from '../motion/useFizz';
import { useTemplateRef } from 'vue';

/**
 * Space behind the content: the starfield fills this element, and the panels inside it fizz now and then.
 * The builder's whole window is one RacSpace; it raises `warp` during a build.
 */
const { warp = 0 } = defineProps<{
  /** The starfield's speed: 0 is the idle drift, 1 a full warp. */
  warp?: number;
}>();

const root = useTemplateRef<HTMLElement>('root');
useFizz(root);
</script>

<template>
  <div
    ref="root"
    class="rac-space"
  >
    <RacStarfield :warp="warp" />
    <div class="rac-space__content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.rac-space {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  background: var(--rac-space);
}
.rac-space__content {
  position: relative;
  z-index: 1;
  height: 100%;
}
</style>
