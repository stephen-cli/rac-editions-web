import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { expect } from 'storybook/test';
import { RacPanel } from '../src';
import { slotted } from './slotted';

/** Panels fizz with static only inside a RacSpace; see Effects/Space. */
const meta = {
  title: 'Components/RacPanel',
  component: RacPanel,
  render: slotted(RacPanel),
  argTypes: {
    tone: { control: 'inline-radio', options: ['default', 'selected', 'hazard'] },
    as: { control: 'text' },
    glow: { control: 'boolean' },
    default: { control: 'text', description: 'The content' },
  },
  args: { tone: 'default', as: 'div', glow: false, default: 'Create a new image' },
} satisfies Meta<typeof RacPanel>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The chosen card or option. */
export const Selected: Story = {
  args: { tone: 'selected', default: 'Executive Edition' },
};

/** A choice that changes the player's files. */
export const Hazard: Story = {
  args: { tone: 'hazard', default: 'Update my image in place' },
};

/** A panel that is clicked, such as an edition card: light pools on its edge around the pointer. */
export const Clickable: Story = {
  args: { glow: true, default: 'Executive Edition' },
  play: async ({ canvasElement }) => {
    const panel = canvasElement.querySelector<HTMLElement>('.rac-panel')!;
    const box = panel.getBoundingClientRect();
    // Without layout (the stories also run as tests in jsdom) there is no edge to point at.
    if (!box.width) return;
    panel.dispatchEvent(
      new PointerEvent('pointermove', { clientX: box.right - 4, clientY: box.top + 6, bubbles: true }),
    );
    await expect(panel.style.getPropertyValue('--rac-glow-on')).toBe('1');
  },
};
