import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { expect, userEvent } from 'storybook/test';
import { RacHeading } from '../src';
import { slotted } from './slotted';

/** Fuzzes for a moment when it appears, and faintly while the pointer is on it. */
const meta = {
  title: 'Components/RacHeading',
  component: RacHeading,
  render: slotted(RacHeading),
  argTypes: {
    level: { control: 'select', options: [1, 2, 3, 4, 5, 6] },
    default: { control: 'text', description: 'The text' },
  },
  args: { level: 2, default: 'Where should it go?' },
} satisfies Meta<typeof RacHeading>;
export default meta;

type Story = StoryObj<typeof meta>;

/** The fuzz is a filter over real text, so the heading keeps its role, level and name. */
export const Default: Story = {
  play: async ({ canvas }) => {
    const heading = canvas.getByRole('heading', { level: 2, name: 'Where should it go?' });
    await userEvent.hover(heading);
    await expect(heading).toBeVisible();
  },
};

export const PageTitle: Story = {
  args: { level: 1, default: 'Executive Edition is ready' },
};

export const Section: Story = {
  args: { level: 3, default: "What's in your build" },
};
