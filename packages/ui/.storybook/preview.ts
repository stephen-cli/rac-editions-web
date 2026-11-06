import type { Preview } from '@storybook/vue3-vite';
import { themes } from 'storybook/theming';
import '../src/styles/index.css';

const preview: Preview = {
  tags: ['autodocs'],
  globalTypes: {
    theme: {
      description: 'Colour theme',
      toolbar: { icon: 'mirror', items: ['dark', 'light'], dynamicTitle: true },
    },
  },
  initialGlobals: { theme: 'dark' },
  decorators: [
    (story, context) => {
      document.documentElement.dataset.theme = context.globals.theme as string;
      return story();
    },
  ],
  parameters: {
    layout: 'padded',
    // The components are dark-first, so their docs pages are too.
    docs: { theme: themes.dark },
  },
};

export default preview;
