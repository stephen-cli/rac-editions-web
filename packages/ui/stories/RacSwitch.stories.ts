import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref, watch } from 'vue';
import { expect, fn, userEvent } from 'storybook/test';
import { RacSwitch } from '../src';

const meta = {
  title: 'Components/RacSwitch',
  component: RacSwitch,
  args: { modelValue: true, disabled: false, 'onUpdate:modelValue': fn() },
  render: (args) => ({
    components: { RacSwitch },
    setup() {
      const on = ref(args.modelValue);
      watch(() => args.modelValue, (value) => (on.value = value));
      return { args, on };
    },
    template: `
      <label style="display: inline-flex; gap: 12px; align-items: center">
        <RacSwitch v-model="on" :disabled="args.disabled" @update:model-value="args['onUpdate:modelValue']" />
        Strafing
      </label>`,
  }),
} satisfies Meta<typeof RacSwitch>;
export default meta;

type Story = StoryObj<typeof meta>;

/** Space or a click turns it off and on; it is named by its label. */
export const On: Story = {
  play: async ({ args, canvas }) => {
    const toggle = canvas.getByRole('switch', { name: 'Strafing' });
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(toggle);
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    await expect(args['onUpdate:modelValue']).toHaveBeenCalledWith(false);
  },
};

export const Off: Story = { args: { modelValue: false } };

/** A feature that needs a disc the player hasn't added. */
export const Disabled: Story = {
  args: { modelValue: false, disabled: true },
  play: async ({ canvas }) => {
    const toggle = canvas.getByRole('switch', { name: 'Strafing' });
    await userEvent.click(toggle);
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
  },
};
