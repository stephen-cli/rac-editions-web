<script setup lang="ts">
import RacEdgeGlow from './RacEdgeGlow.vue';
import { clearEdgeGlow, trackEdgeGlow } from '../effects/edgeGlow';
import { burstSparks } from '../effects/sparks';
import { useReducedMotion } from '../motion/reducedMotion';

/**
 * The chamfered button: primary in bolt gold (sparks fly from a click), secondary gunmetal, danger in
 * hazard orange. Light pools on the edge around the pointer (RacEdgeGlow) unless `glow` is false; keyboard
 * focus lights the whole edge holo cyan either way.
 */
const { variant = 'secondary', type = 'button', disabled = false, glow = true } = defineProps<{
  /** primary: the one gold action on a screen; secondary: the rest; danger: cancel or destroy. */
  variant?: 'primary' | 'secondary' | 'danger';
  /** The native button type; only a form's own button submits. */
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  /** Light on the edge around the pointer. Keyboard focus still lights the edge without it. */
  glow?: boolean;
}>();

const emit = defineEmits<{ click: [event: MouseEvent] }>();

const reduced = useReducedMotion();

function onPointerMove(event: PointerEvent): void {
  if (glow) trackEdgeGlow(event);
}

function onClick(event: MouseEvent): void {
  if (variant === 'primary' && !reduced.value) burstSparks(event);
  emit('click', event);
}
</script>

<template>
  <button
    class="rac-button"
    :class="`rac-button--${variant}`"
    :type="type"
    :disabled="disabled"
    @pointermove="onPointerMove"
    @pointerleave="clearEdgeGlow"
    @click="onClick"
  >
    <RacEdgeGlow />
    <span class="rac-button__face"><slot /></span>
  </button>
</template>

<style scoped>
.rac-button {
  --rac-glow: var(--rac-glow-bolt);
  --rac-glow-alt: var(--rac-glow-holo);
  --rac-glow-cut: calc(var(--rac-cut-button) + 1px);
  position: relative;
  border: 0;
  padding: 0;
  background: none;
  color: inherit;
  cursor: pointer;
  font: 600 15px/1 var(--rac-font-display);
  letter-spacing: .06em;
  text-transform: uppercase;
}
.rac-button:focus-visible {
  --rac-glow: var(--rac-holo);
  --rac-glow-focus: 1;
  --rac-glow-ring: linear-gradient(var(--rac-holo), var(--rac-holo));
  outline: none;
}
.rac-button:disabled :deep(.rac-edge-glow) {
  display: none;
}
.rac-button__face {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 13px 22px;
  clip-path: polygon(
    var(--rac-cut-button) 0, 100% 0, 100% calc(100% - var(--rac-cut-button)),
    calc(100% - var(--rac-cut-button)) 100%, 0 100%, 0 var(--rac-cut-button)
  );
  transition:
    background var(--rac-duration-fast) var(--rac-ease),
    color var(--rac-duration-fast) var(--rac-ease),
    transform var(--rac-duration-fast) var(--rac-ease);
}
.rac-button--primary .rac-button__face {
  background: var(--rac-bolt-face);
  color: var(--rac-bolt-ink);
}
.rac-button--primary:hover:not(:disabled) .rac-button__face {
  background: var(--rac-bolt-face-hover);
}
.rac-button--primary:active:not(:disabled) .rac-button__face {
  transform: translateY(1px);
}
.rac-button--secondary {
  --rac-glow: var(--rac-glow-holo);
  --rac-glow-alt: var(--rac-glow-bolt);
}
.rac-button--secondary .rac-button__face {
  background: var(--rac-plate-600);
  color: var(--rac-ink);
  box-shadow: inset 0 0 0 1px var(--rac-edge);
}
.rac-button--secondary:hover:not(:disabled) .rac-button__face {
  background: color-mix(in srgb, var(--rac-plate-600) 85%, var(--rac-ink));
}
.rac-button--danger {
  --rac-glow: var(--rac-glow-hazard);
  --rac-glow-alt: var(--rac-glow-bolt);
}
.rac-button--danger .rac-button__face {
  background: var(--rac-plate-800);
  color: var(--rac-hazard);
  box-shadow: inset 0 0 0 1px var(--rac-hazard);
}
.rac-button:disabled {
  cursor: not-allowed;
}
.rac-button:disabled .rac-button__face {
  background: var(--rac-plate-700);
  color: var(--rac-ink-faint);
  box-shadow: inset 0 0 0 1px var(--rac-edge-soft);
}
@media (prefers-reduced-motion: reduce) {
  .rac-button__face {
    transition: none;
  }
}
</style>
