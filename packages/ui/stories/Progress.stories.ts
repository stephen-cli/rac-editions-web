import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { expect } from 'storybook/test';
import { RacProgressBar, RacRadar } from '../src';

const meta = {
  title: 'Components/RacProgressBar',
  component: RacProgressBar,
  argTypes: {
    value: { control: { type: 'range', min: 0, max: 1, step: 0.01 } },
    tone: { control: 'inline-radio', options: ['holo', 'bolt'] },
  },
  args: { value: 0.42, tone: 'holo' },
  render: (args) => ({
    components: { RacProgressBar },
    setup: () => ({ args }),
    template: '<div style="max-width: 420px"><RacProgressBar v-bind="args" aria-label="Reading Ratchet & Clank (PAL)" /></div>',
  }),
} satisfies Meta<typeof RacProgressBar>;
export default meta;

type Story = StoryObj<typeof meta>;

/** Reading a disc. Screen readers get the percentage. */
export const Reading: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('progressbar', { name: 'Reading Ratchet & Clank (PAL)' })).toHaveAttribute('aria-valuenow', '42');
  },
};

/** A build stage. */
export const Building: Story = { args: { tone: 'bolt', value: 0.73 } };

/** The radar sweep beside a disc being read (RacRadar). */
export const Radar: Story = {
  render: () => ({
    components: { RacRadar },
    template: '<div style="display: flex; gap: 16px; align-items: center"><RacRadar /><RacRadar :size="18" /></div>',
  }),
};
