<script setup lang="ts">
/**
 * Light on a chamfered edge around the pointer, used inside RacButton and RacPanel: a pool of --rac-glow
 * fading through --rac-glow-alt, centred on the pointer (--rac-glow-x, --rac-glow-y) and --rac-glow-radius
 * wide, shown only on the edge, with a soft bloom outside it. The parent sets the pointer variables and
 * --rac-glow-on (effects/edgeGlow.ts) and the cut size in --rac-glow-cut; its :focus-visible sets
 * --rac-glow-focus to 1 and --rac-glow-ring to a solid colour, lighting the whole edge.
 */
</script>

<template>
  <span
    class="rac-edge-glow"
    aria-hidden="true"
  ><span class="rac-edge-glow__edge" /></span>
</template>

<style scoped>
.rac-edge-glow {
  position: absolute;
  inset: -2px;
  pointer-events: none;
  opacity: max(var(--rac-glow-on, 0), var(--rac-glow-focus, 0));
  filter: drop-shadow(0 0 5px var(--rac-glow)) drop-shadow(0 0 14px color-mix(in srgb, var(--rac-glow) 45%, transparent));
  transition: opacity var(--rac-duration-slow) var(--rac-ease);
}
.rac-edge-glow__edge {
  position: absolute;
  inset: 0;
  clip-path: polygon(
    var(--rac-glow-cut) 0, 100% 0, 100% calc(100% - var(--rac-glow-cut)),
    calc(100% - var(--rac-glow-cut)) 100%, 0 100%, 0 var(--rac-glow-cut)
  );
  /* The layer sits 2px outside its parent, so the pointer's position is shifted by 2px to match. */
  background:
    var(--rac-glow-ring, none),
    radial-gradient(
      circle var(--rac-glow-radius, 90px) at calc(var(--rac-glow-x, 50%) + 2px) calc(var(--rac-glow-y, 50%) + 2px),
      var(--rac-glow) 0%,
      var(--rac-glow-alt) 45%,
      transparent 75%
    );
}
@media (prefers-reduced-motion: reduce) {
  .rac-edge-glow {
    transition: none;
  }
}
</style>
