import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { expect } from 'storybook/test';
import { ICONS, RacIcon, type IconName } from '../src';

const names = Object.keys(ICONS) as IconName[];

const meta = {
  title: 'Components/RacIcon',
  component: RacIcon,
  argTypes: {
    name: { control: 'select', options: names },
    size: { control: { type: 'range', min: 16, max: 64, step: 4 } },
    label: { control: 'text' },
  },
  args: { name: 'boots', size: 48 },
  // Under the icon, what a screen reader gets from it, since the label itself is never drawn.
  render: (args) => ({
    components: { RacIcon },
    setup: () => ({ args }),
    template: `
      <figure style="margin: 0; display: inline-grid; justify-items: center; gap: 10px">
        <RacIcon v-bind="args" style="color: var(--rac-holo)" />
        <figcaption style="color: var(--rac-ink-dim); font: 13px var(--rac-font-mono)">
          {{ args.label ? 'Screen readers say: "' + args.label + '"' : 'Hidden from screen readers' }}
        </figcaption>
      </figure>`,
  }),
  // Checks whichever case the current args make, so editing the label control keeps it passing.
  play: async ({ args, canvas, canvasElement }) => {
    const svg = canvasElement.querySelector('svg');
    if (args.label) {
      await expect(canvas.getByRole('img', { name: args.label })).toBe(svg);
      await expect(svg).not.toHaveAttribute('aria-hidden');
    } else {
      await expect(svg).toHaveAttribute('aria-hidden', 'true');
      await expect(canvas.queryByRole('img')).toBeNull();
    }
  },
} satisfies Meta<typeof RacIcon>;
export default meta;

type Story = StoryObj<typeof meta>;

/** Beside text that already says what it shows: hidden from screen readers. */
export const Decorative: Story = {};

/** On its own, as in an icon-only button: the label is what screen readers read. */
export const Labelled: Story = {
  args: { name: 'disc', label: 'Disc image' },
};

/** The whole set, drawn on one 24-unit grid. */
export const AllIcons: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    components: { RacIcon },
    setup: () => ({ names }),
    template: `
      <ul style="list-style: none; padding: 0; margin: 0; color: var(--rac-holo); display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 16px">
        <li v-for="name in names" :key="name" style="display: grid; justify-items: center; gap: 6px">
          <RacIcon :name="name" :size="32" />
          <code style="color: var(--rac-ink-dim); font: 12px var(--rac-font-mono)">{{ name }}</code>
        </li>
      </ul>`,
  }),
};
