<script setup lang="ts">
import { useToasts } from '../motion/toasts';

/** Where toasts from useToasts() appear, at the top centre; put one in the app. Screen readers hear each as it arrives. */
const { toasts } = useToasts();
</script>

<template>
  <div
    class="rac-toaster"
    role="status"
    aria-live="polite"
  >
    <div
      v-for="entry in toasts"
      :key="entry.id"
      class="rac-toaster__toast"
    >
      {{ entry.text }}
    </div>
  </div>
</template>

<style scoped>
.rac-toaster {
  position: fixed;
  /* At the top, under a title bar, where a toast covers no action button while it lasts. */
  top: calc(56px + env(safe-area-inset-top, 0px));
  left: 50%;
  z-index: 60;
  display: grid;
  gap: 8px;
  width: min(440px, calc(100% - 32px));
  transform: translateX(-50%);
  pointer-events: none;
}
.rac-toaster__toast {
  padding: 12px 16px;
  border: 1px solid var(--rac-holo-line);
  background: var(--rac-plate-700);
  box-shadow: 0 12px 30px rgba(0, 0, 0, .5);
  color: var(--rac-ink);
  font-size: 14px;
}
</style>
