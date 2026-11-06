<script setup lang="ts">
import { SwitchRoot, SwitchThumb } from 'reka-ui';

/** An on/off switch styled after the games' option toggles: bolt gold when on. Name it with aria-label or a label. */
const { disabled = false } = defineProps<{
  disabled?: boolean;
}>();

const on = defineModel<boolean>({ default: false });
</script>

<template>
  <SwitchRoot
    v-model="on"
    class="rac-switch"
    :disabled="disabled"
  >
    <SwitchThumb class="rac-switch__thumb" />
  </SwitchRoot>
</template>

<style scoped>
.rac-switch {
  position: relative;
  flex: none;
  width: 50px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--rac-edge);
  background: var(--rac-space);
  cursor: pointer;
  clip-path: polygon(
    var(--rac-cut-xs) 0, 100% 0, 100% calc(100% - var(--rac-cut-xs)),
    calc(100% - var(--rac-cut-xs)) 100%, 0 100%, 0 var(--rac-cut-xs)
  );
}
.rac-switch[data-state="checked"] {
  border-color: var(--rac-bolt);
  background: var(--rac-bolt-glass);
}
.rac-switch:disabled {
  cursor: not-allowed;
  opacity: .45;
}
.rac-switch__thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  background: var(--rac-ink-faint);
  transition: transform var(--rac-duration) var(--rac-ease), background var(--rac-duration) var(--rac-ease);
}
.rac-switch__thumb[data-state="checked"] {
  transform: translateX(22px);
  background: var(--rac-bolt);
}
@media (prefers-reduced-motion: reduce) {
  .rac-switch__thumb {
    transition: none;
  }
}
</style>
