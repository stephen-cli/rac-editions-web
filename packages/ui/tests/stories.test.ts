// Every workshop story renders, and its play function (the Interactions panel) passes.
import { composeStories, setProjectAnnotations } from '@storybook/vue3-vite';
import { describe, it } from 'vitest';
import * as preview from '../.storybook/preview';

setProjectAnnotations(preview);

const modules = import.meta.glob<Parameters<typeof composeStories>[0]>('../stories/*.stories.ts', { eager: true });

describe.each(Object.entries(modules))('%s', (_, module) => {
  const stories = Object.entries(composeStories(module)) as [
    string,
    { run: (context: { canvasElement: HTMLElement }) => Promise<void> },
  ][];
  // Each story gets its own canvas, removed afterwards, so stories never see each other's elements;
  // the document itself is left alone, since overlays live in it (teleported) until their story closes them.
  it.each(stories)('%s', async (_, story) => {
    const canvasElement = document.body.appendChild(document.createElement('div'));
    try {
      await story.run({ canvasElement });
    } finally {
      canvasElement.remove();
    }
  });
});
