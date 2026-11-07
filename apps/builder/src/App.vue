<script setup lang="ts">
import { RacIcon, RacPanel, RacSpace, RacToaster } from '@rac-editions/ui';
import { computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import StepRail from './components/StepRail.vue';
import { versionName } from './editions/copy';
import { useSession, type StepId } from './stores/session';

/**
 * The builder's window: one starfield behind everything, the step rail on the left and the current step
 * on the right. During a build the stars speed into a warp as the build gets going.
 */
const session = useSession();

const route = useRoute();
const router = useRouter();

// A disc checked in the background can turn out wrong after the player has moved on: back to the step
// that needs them, where the disc's row says why. Only once every check has finished, as an image can
// leave a row empty for a moment while it moves to its own game's.
watch(
  () => [session.lastOpen, session.reading],
  () => {
    if (session.reading || !route.name || session.canOpen(route.name as StepId)) return;
    void router.replace({ name: session.lastOpen });
  },
);

const warp = computed(() => (session.build.state === 'running' ? 0.35 + 0.65 * Math.min(1, session.overall / 0.6) : 0));
</script>

<template>
  <RacSpace
    class="window"
    :warp="warp"
  >
    <div class="window__frame">
      <header class="titlebar">
        <RacIcon
          name="bolts"
          :size="18"
          class="titlebar__mark"
        />
        <span class="titlebar__name">Editions Builder</span>
        <span
          v-if="session.edition"
          class="titlebar__version"
        >installer {{ versionName(session.installerVersion) }} · {{ session.edition.name.toLowerCase() }} {{ versionName(session.edition.version) }}</span>
      </header>
      <div class="window__body">
        <StepRail />
        <main class="window__main">
          <div class="window__step">
            <RacPanel
              v-if="session.installerError"
              tone="hazard"
              role="alert"
            >
              <b>The installer didn't start.</b> {{ session.installerError }}
            </RacPanel>
            <RouterView v-else />
          </div>
        </main>
      </div>
    </div>
    <RacToaster />
  </RacSpace>
</template>

<style scoped>
/* The window fills the screen and stays put: the title bar and the step rail stay in view, and only the
   step's own content scrolls when it is taller than the window. */
.window {
  height: 100vh;
}
.window__frame {
  display: grid;
  grid-template-rows: auto 1fr;
  height: 100vh;
}
.titlebar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--rac-edge);
  background: linear-gradient(180deg, var(--rac-plate-700), var(--rac-plate-800));
}
.titlebar__mark {
  color: var(--rac-bolt);
}
.titlebar__name {
  font: 600 13px var(--rac-font-display);
  letter-spacing: .08em;
  text-transform: uppercase;
}
.titlebar__version {
  margin-left: auto;
  color: var(--rac-ink-faint);
  font: 11px var(--rac-font-mono);
}
.window__body {
  display: grid;
  grid-template-columns: 232px 1fr;
  min-height: 0;
}
.window__main {
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
}
.window__step {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: 100%;
  max-width: 1040px;
  padding: 28px clamp(16px, 3vw, 36px) 32px;
}
@media (max-width: 760px) {
  .window__body {
    grid-template-columns: 1fr;
  }
}
</style>
