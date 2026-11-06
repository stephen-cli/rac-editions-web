import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { expect, fn, userEvent } from 'storybook/test';
import { RacButton } from '../src';
import { slotted } from './slotted';

const meta = {
  title: 'Components/RacButton',
  component: RacButton,
  render: slotted(RacButton),
  argTypes: {
    variant: { control: 'inline-radio', options: ['primary', 'secondary', 'danger'] },
    type: { control: 'inline-radio', options: ['button', 'submit', 'reset'] },
    glow: { control: 'boolean' },
    default: { control: 'text', description: 'The label' },
    // The spy behind the Actions panel; the docs table lists the event under Events.
    onClick: { table: { disable: true } },
  },
  args: { variant: 'secondary', disabled: false, glow: true, default: 'Choose image', onClick: fn() },
} satisfies Meta<typeof RacButton>;
export default meta;

type Story = StoryObj<typeof meta>;

/** The one gold action per screen; sparks fly from a pointer click. */
export const Primary: Story = {
  args: { variant: 'primary', default: 'Next: discs' },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Next: discs' }));
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
};

/** Works from the keyboard: Tab to it, then Enter. */
export const Secondary: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.tab();
    await expect(canvas.getByRole('button')).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
};

export const Danger: Story = {
  args: { variant: 'danger', default: 'Cancel' },
};

/** A disabled button takes no clicks. */
export const Disabled: Story = {
  args: { variant: 'primary', disabled: true, default: 'Next: output' },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button'));
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};

/** Light pools on the edge around the pointer; here the pointer rests near the top-left corner. */
export const Glow: Story = {
  args: { variant: 'primary', default: 'Build Executive Edition' },
  play: async ({ canvas }) => {
    const button = canvas.getByRole('button');
    const box = button.getBoundingClientRect();
    // Without layout (the stories also run as tests in jsdom) there is no edge to point at.
    if (!box.width) return;
    button.dispatchEvent(
      new PointerEvent('pointermove', { clientX: box.left + 40, clientY: box.top + 4, bubbles: true }),
    );
    await expect(button.style.getPropertyValue('--rac-glow-on')).toBe('1');
    await expect(button.style.getPropertyValue('--rac-glow-x')).toBe('40.0px');
  },
};

/** Without the glow: the pointer lights nothing, though keyboard focus still shows the ring. */
export const NoGlow: Story = {
  args: { glow: false, default: 'Back' },
  play: async ({ canvas }) => {
    const button = canvas.getByRole('button');
    button.dispatchEvent(new PointerEvent('pointermove', { clientX: 10, clientY: 10, bubbles: true }));
    await expect(button.style.getPropertyValue('--rac-glow-on')).toBe('');
  },
};
