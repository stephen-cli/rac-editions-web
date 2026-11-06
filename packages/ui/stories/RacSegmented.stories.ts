import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import { expect, userEvent } from 'storybook/test';
import { RacSegmented } from '../src';

const options = [
  { value: 'skill', label: 'Skill', description: 'Drops as in a first playthrough, plus a bolt multiplier for kills without taking a hit.' },
  { value: 'classic', label: 'Classic', description: "Retail's doubled drops in Challenge Mode." },
];

const meta = {
  title: 'Components/RacSegmented',
  component: RacSegmented,
  args: { options, modelValue: 'skill' },
  render: (args) => ({
    components: { RacSegmented },
    setup: () => ({ args, choice: ref(args.modelValue) }),
    template: '<div style="max-width: 420px"><RacSegmented v-model="choice" :options="args.options" aria-label="Challenge Mode bolts" /></div>',
  }),
} satisfies Meta<typeof RacSegmented>;
export default meta;

type Story = StoryObj<typeof meta>;

/** A radio group: Tab reaches the chosen option, the arrow keys move the choice. */
export const Economy: Story = {
  play: async ({ canvas }) => {
    const skill = canvas.getByRole('radio', { name: /Skill/ });
    const classic = canvas.getByRole('radio', { name: /Classic/ });
    await expect(skill).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(classic);
    await expect(classic).toHaveAttribute('aria-checked', 'true');
    await expect(skill).toHaveAttribute('aria-checked', 'false');
  },
};
