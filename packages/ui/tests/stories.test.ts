// Every workshop story renders, and its play function (the Interactions panel) passes.
import { composeStories, setProjectAnnotations } from '@storybook/vue3-vite';
import { afterEach, describe, it } from 'vitest';
import * as preview from '../.storybook/preview';

setProjectAnnotations(preview);

const modules = import.meta.glob<Parameters<typeof composeStories>[0]>('../stories/*.stories.ts', { eager: true });

afterEach(() => {
  document.body.innerHTML = '';
});

describe.each(Object.entries(modules))('%s', (_, module) => {
  const stories = Object.entries(composeStories(module)) as [string, { run: () => Promise<void> }][];
  it.each(stories)('%s', async (_, story) => {
    await story.run();
  });
});
