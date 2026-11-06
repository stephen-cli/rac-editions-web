import pluginVue from 'eslint-plugin-vue';
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript';

export default defineConfigWithVueTs(
  { ignores: ['**/dist/**', '**/storybook-static/**', '**/coverage/**'] },
  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,
  {
    rules: {
      // Typed optional props are undefined when not given; a default would only restate that.
      'vue/require-default-prop': 'off',
    },
  },
  {
    // RacIcon renders the constant markup in icons.ts, never outside input. (A disable comment in its
    // template would make the root a fragment in development and drop the attributes passed to it.)
    files: ['packages/ui/src/components/RacIcon.vue'],
    rules: { 'vue/no-v-html': 'off' },
  },
);
