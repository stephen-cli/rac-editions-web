import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { onBeforeUnmount, ref } from 'vue';
import { expect } from 'storybook/test';
import { RacCountUp } from '../src';

const meta = {
  title: 'Components/RacCountUp',
  component: RacCountUp,
  argTypes: {
    value: { control: 'number' },
    from: { control: 'number' },
    duration: { control: { type: 'range', min: 0, max: 4000, step: 100 } },
  },
  args: { value: 4220000000, from: 0, duration: 2000 },
  decorators: [() => ({ template: '<div style="font: 700 42px var(--rac-font-display)"><story /></div>' })],
} satisfies Meta<typeof RacCountUp>;
export default meta;

type Story = StoryObj<typeof meta>;

/** A figure on the site: counts up from 0 when it appears. Screen readers get only the final number. */
export const Figure: Story = {
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('.rac-sr-only')).toHaveTextContent('4,220,000,000');
  },
};

/** The builder's sector counter: new values arrive several times a second and each one is counted to. */
export const LiveCounter: Story = {
  args: { value: 0, from: undefined, duration: 250 },
  parameters: { controls: { disable: true } },
  render: (args) => ({
    components: { RacCountUp },
    setup() {
      const sectors = ref(0);
      const timer = setInterval(() => {
        sectors.value = sectors.value >= 2058796 ? 0 : sectors.value + Math.round(20000 + Math.random() * 30000);
      }, 200);
      onBeforeUnmount(() => clearInterval(timer));
      return { args, sectors };
    },
    template: '<RacCountUp v-bind="args" :value="sectors" /> <small style="font: 500 12px var(--rac-font-mono)">SECTORS WRITTEN</small>',
  }),
};
