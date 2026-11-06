<script setup lang="ts">
/** A small mono label: a disc's version, a state such as "Recommended" or "Customised". */
const { tone = 'default' } = defineProps<{
  /** ok: found or recommended; holo: information; bolt: changed from the design. */
  tone?: 'default' | 'ok' | 'holo' | 'bolt';
}>();
</script>

<template>
  <span
    class="rac-chip"
    :class="`rac-chip--${tone}`"
  ><slot /></span>
</template>

<style scoped>
.rac-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border: 1px solid var(--rac-edge);
  background: color-mix(in srgb, var(--rac-space) 50%, transparent);
  color: var(--rac-ink-dim);
  font: 500 12px/1.3 var(--rac-font-mono);
  letter-spacing: .04em;
}
.rac-chip--ok {
  border-color: color-mix(in srgb, var(--rac-clank) 50%, transparent);
  background: var(--rac-clank-glass);
  color: var(--rac-clank);
}
.rac-chip--holo {
  border-color: var(--rac-holo-line);
  background: var(--rac-holo-glass);
  color: var(--rac-holo);
}
.rac-chip--bolt {
  border-color: color-mix(in srgb, var(--rac-bolt) 55%, transparent);
  background: var(--rac-bolt-glass);
  color: var(--rac-bolt);
}
</style>
