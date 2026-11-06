<script setup lang="ts">
import { RacHeading } from '@rac-editions/ui';
import { onMounted, useTemplateRef } from 'vue';

/**
 * A step's eyebrow, heading and introduction. The heading takes focus when the step opens, so screen
 * readers announce the new step and Tab continues from the top of it.
 */
const { eyebrow, title, intro } = defineProps<{
  eyebrow: string;
  title: string;
  intro?: string;
}>();

const heading = useTemplateRef<InstanceType<typeof RacHeading>>('heading');
onMounted(() => heading.value?.focus());
</script>

<template>
  <div class="step-head">
    <div class="step-head__eyebrow">
      {{ eyebrow }}
    </div>
    <RacHeading
      ref="heading"
      :level="2"
      tabindex="-1"
      class="step-head__title"
    >
      {{ title }}
    </RacHeading>
    <p v-if="intro">
      {{ intro }}
    </p>
  </div>
</template>

<style scoped>
.step-head {
  display: grid;
  gap: 6px;
}
.step-head__eyebrow {
  color: var(--rac-holo);
  font: 12px var(--rac-font-mono);
  letter-spacing: .12em;
  text-transform: uppercase;
}
.step-head__title {
  font-size: clamp(24px, 3vw, 30px);
  text-shadow: 0 0 18px color-mix(in srgb, var(--rac-holo) 18%, transparent);
}
.step-head p {
  max-width: 62ch;
  margin: 0;
  color: var(--rac-ink-dim);
}
</style>
