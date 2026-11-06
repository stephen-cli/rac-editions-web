<script setup lang="ts">
import { DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui';
import RacHeading from './RacHeading.vue';
import RacIcon from './RacIcon.vue';
import type { IconName } from '../icons/icons';

/**
 * A panel that slides in from the right over a dimmed window, for settings kept out of the main flow.
 * A modal dialog: focus stays inside while it is open, Escape or the scrim closes it, and focus returns
 * to what opened it.
 */
const { title, icon } = defineProps<{
  title: string;
  /** An icon beside the title. */
  icon?: IconName;
}>();

const open = defineModel<boolean>('open', { default: false });
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="rac-drawer__scrim" />
      <DialogContent
        class="rac-drawer"
        :aria-describedby="undefined"
      >
        <header class="rac-drawer__header">
          <RacIcon
            v-if="icon"
            :name="icon"
            :size="20"
            class="rac-drawer__icon"
          />
          <DialogTitle as-child>
            <RacHeading
              :level="2"
              class="rac-drawer__title"
            >
              {{ title }}
            </RacHeading>
          </DialogTitle>
          <slot name="header-end" />
        </header>
        <div class="rac-drawer__body">
          <slot />
        </div>
        <footer
          v-if="$slots.footer"
          class="rac-drawer__footer"
        >
          <slot name="footer" />
        </footer>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.rac-drawer__scrim {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: color-mix(in srgb, var(--rac-space) 60%, transparent);
}
.rac-drawer {
  position: fixed;
  inset: 0 0 0 auto;
  z-index: 41;
  display: grid;
  grid-template-rows: auto 1fr auto;
  width: min(480px, 100%);
  border-left: 1px solid var(--rac-edge);
  background: var(--rac-scanlines), var(--rac-plate-800);
  box-shadow: -30px 0 60px rgba(0, 0, 0, .45);
  color: var(--rac-ink);
}
.rac-drawer:focus {
  outline: none;
}
.rac-drawer__header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 22px 14px;
  border-bottom: 1px solid var(--rac-edge-soft);
  background: linear-gradient(180deg, var(--rac-holo-glass), transparent);
}
.rac-drawer__icon {
  color: var(--rac-holo);
}
.rac-drawer__title {
  font-size: 20px;
  letter-spacing: .04em;
  text-transform: uppercase;
}
.rac-drawer__body {
  display: grid;
  align-content: start;
  gap: 4px;
  padding: 18px 22px;
  overflow-y: auto;
}
.rac-drawer__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 22px;
  border-top: 1px solid var(--rac-edge-soft);
}
</style>
