import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { RacChip } from '../src';
import { slotted } from './slotted';

const meta = {
  title: 'Components/RacChip',
  component: RacChip,
  render: slotted(RacChip),
  argTypes: {
    tone: { control: 'inline-radio', options: ['default', 'ok', 'holo', 'bolt'] },
    default: { control: 'text', description: 'The label' },
  },
  args: { tone: 'default', default: 'USA' },
} satisfies Meta<typeof RacChip>;
export default meta;

type Story = StoryObj<typeof meta>;

/** A disc's version before it is found. */
export const Default: Story = {};

/** A disc that was recognised, or the recommended choice. */
export const Ok: Story = { args: { tone: 'ok', default: 'PAL' } };

export const Holo: Story = { args: { tone: 'holo', default: '.restore' } };

/** Edition settings changed from the design. */
export const Bolt: Story = { args: { tone: 'bolt', default: 'Customised' } };
