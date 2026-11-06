import type { StorybookConfig } from '@storybook/vue3-vite';

const config: StorybookConfig = {
  // vue-component-meta reads props through Vue's language tools, so the docs show destructured defaults.
  framework: {
    name: '@storybook/vue3-vite',
    options: { docgen: { plugin: 'vue-component-meta', tsconfig: 'tsconfig.lib.json' } },
  },
  stories: ['../stories/**/*.stories.ts'],
  addons: ['@storybook/addon-docs'],
  core: { disableTelemetry: true },
};

export default config;
