import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { RacButton, RacChip, RacHeading, RacIcon, RacPanel, RacSpace } from '../src';

/** The builder's window: the starfield behind riveted panels, which fizz now and then. */
const meta: Meta<typeof RacSpace> = {
  title: 'Effects/Space',
  component: RacSpace,
  parameters: { layout: 'fullscreen' },
  argTypes: { warp: { control: { type: 'range', min: 0, max: 1, step: 0.05 } } },
  args: { warp: 0 },
  render: (args) => ({
    components: { RacButton, RacChip, RacHeading, RacIcon, RacPanel, RacSpace },
    setup: () => ({ args }),
    template: `
      <RacSpace v-bind="args" style="min-height: 100vh">
        <div style="max-width: 760px; margin: 0 auto; padding: 48px 16px; display: grid; gap: 16px">
          <RacHeading>Add your discs</RacHeading>
          <RacPanel>
            <div style="display: flex; gap: 16px; align-items: center">
              <RacIcon name="disc" :size="40" style="color: var(--rac-holo)" />
              <div>
                <div style="font: 600 17px var(--rac-font-display)">Ratchet &amp; Clank <RacChip tone="ok">PAL</RacChip></div>
                <div style="color: var(--rac-ink-dim)">Required. The edition is built from this.</div>
              </div>
            </div>
          </RacPanel>
          <RacPanel>
            <div style="display: flex; gap: 16px; align-items: center">
              <RacIcon name="boots" :size="40" style="color: var(--rac-bolt)" />
              <div>
                <div style="font: 600 17px var(--rac-font-display)">Going Commando <RacChip>USA</RacChip></div>
                <div style="color: var(--rac-ink-dim)">Optional. Adds the Charge Boots and strafing.</div>
              </div>
            </div>
          </RacPanel>
          <div style="display: flex; gap: 12px; justify-content: space-between">
            <RacButton>Back</RacButton>
            <RacButton variant="primary">Next: output</RacButton>
          </div>
        </div>
      </RacSpace>`,
  }),
};
export default meta;

type Story = StoryObj<typeof meta>;

export const Idle: Story = {};
/** A build at full speed: the stars streak past. */
export const Warp: Story = { args: { warp: 1 } };
