<script setup lang="ts">
import RacEdgeGlow from './RacEdgeGlow.vue';
import { clearEdgeGlow, trackEdgeGlow } from '../effects/edgeGlow';

/**
 * The riveted CRT plate: a gunmetal gradient under faint scanlines, two rivets and a chamfered edge.
 * `tone` colours the edge: bolt gold for the selected choice, hazard orange for a warning.
 * Inside a RacSpace it fizzes with static now and then (effects/fizz.ts sets --rac-fizz while it lasts).
 * A panel that is clicked, such as an edition card, takes `glow`: light pools on its edge around the pointer.
 */
const { as = 'div', tone = 'default', glow = false } = defineProps<{
  /** The element it renders as: a section, li or label where that is what it is. */
  as?: string;
  /** The edge colour: bolt gold for the selected choice, hazard orange for a warning. */
  tone?: 'default' | 'selected' | 'hazard';
  /** Light on the edge around the pointer, for a panel that is clicked. */
  glow?: boolean;
}>();

const onPointerMove = (event: PointerEvent): void => {
  if (glow) trackEdgeGlow(event);
};
const onPointerLeave = (event: PointerEvent): void => {
  if (glow) clearEdgeGlow(event);
};
</script>

<template>
  <component
    :is="as"
    class="rac-panel"
    :class="`rac-panel--${tone}`"
    @pointermove="onPointerMove"
    @pointerleave="onPointerLeave"
  >
    <RacEdgeGlow v-if="glow" />
    <slot />
  </component>
</template>

<style scoped>
/* The edge and the face are two layers behind everything the panel holds, text included: the panel is its own
   stacking context and the layers sit at z-index -1 inside it. */
.rac-panel {
  --rac-glow: var(--rac-glow-bolt);
  --rac-glow-alt: var(--rac-glow-holo);
  --rac-glow-cut: calc(var(--rac-cut) + 1px);
  --rac-glow-radius: 160px;
  position: relative;
  isolation: isolate;
  min-width: 0;
  padding: var(--rac-space-5) 22px;
}
.rac-panel::before,
.rac-panel::after {
  content: "";
  position: absolute;
  z-index: -1;
  clip-path: polygon(
    var(--rac-cut) 0, 100% 0, 100% calc(100% - var(--rac-cut)),
    calc(100% - var(--rac-cut)) 100%, 0 100%, 0 var(--rac-cut)
  );
  pointer-events: none;
}
.rac-panel::before {
  inset: 0;
  background: var(--rac-edge);
}
.rac-panel::after {
  inset: 1px;
  background:
    radial-gradient(circle at calc(100% - 12px) 12px, var(--rac-rivet) 0 2px, transparent 2.6px),
    radial-gradient(circle at 12px calc(100% - 12px), var(--rac-rivet) 0 2px, transparent 2.6px),
    var(--rac-fizz, none),
    var(--rac-scanlines),
    linear-gradient(180deg, color-mix(in srgb, var(--rac-plate-700) 94%, transparent), color-mix(in srgb, var(--rac-plate-800) 94%, transparent));
  background-position: 0 0, 0 0, var(--rac-fizz-x, 0px) var(--rac-fizz-y, 0px), 0 0, 0 0;
}
/* The glow sits between the edge and the face, so it lights the edge and the bloom outside it. */
.rac-panel :deep(.rac-edge-glow) {
  z-index: -1;
}
.rac-panel--selected::before {
  background: var(--rac-bolt);
}
.rac-panel--hazard::before {
  background: var(--rac-hazard);
}
</style>
