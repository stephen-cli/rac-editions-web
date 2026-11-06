import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import { expect, userEvent, within } from 'storybook/test';
import { RacButton, RacDrawer, RacTabs, RacToaster, useToasts } from '../src';

const meta: Meta = { title: 'Components/Overlays and tabs' };
export default meta;

type Story = StoryObj;

/** RacDrawer: a modal panel from the right. Escape closes it and focus goes back to the button. */
export const Drawer: Story = {
  render: () => ({
    components: { RacButton, RacDrawer },
    setup: () => ({ open: ref(false) }),
    template: `
      <RacButton @click="open = true">Edition settings</RacButton>
      <RacDrawer v-model:open="open" title="Edition settings" icon="settings">
        <p style="margin: 0">The Executive Edition is designed to be played with everything here as it comes.</p>
        <template #footer><span /><RacButton @click="open = false">Done</RacButton></template>
      </RacDrawer>`,
  }),
  play: async ({ canvas, canvasElement }) => {
    const opener = canvas.getByRole('button', { name: 'Edition settings' });
    await userEvent.click(opener);
    const page = within(canvasElement.ownerDocument.body);
    await expect(await page.findByRole('dialog', { name: 'Edition settings' })).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await expect(page.queryByRole('dialog')).toBeNull();
  },
};

/** RacTabs: the Done step's "where to play" tabs. */
export const Tabs: Story = {
  render: () => ({
    components: { RacTabs },
    setup: () => ({
      tab: ref('pc'),
      tabs: [
        { value: 'pc', label: 'PC', icon: 'pc' },
        { value: 'console', label: 'PS2 or PS3', icon: 'console' },
      ],
    }),
    template: `
      <RacTabs v-model="tab" :tabs="tabs" label="Where to play it">
        <template #pc><p>PCSX2, the PS2 emulator, free from pcsx2.net.</p></template>
        <template #console><p>Play the .iso from a USB drive or hard drive, or burn it to a DVD-R.</p></template>
      </RacTabs>`,
  }),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('tab', { name: 'PS2 or PS3' }));
    await expect(canvas.getByRole('tabpanel')).toHaveTextContent('burn it to a DVD-R');
  },
};

/** RacToaster with useToasts(): a short note that leaves by itself, announced to screen readers. */
export const Toasts: Story = {
  render: () => ({
    components: { RacButton, RacToaster },
    setup: () => ({ toast: useToasts().toast }),
    template: `
      <RacButton @click="toast('Ratchet & Clank (PAL) recognised.')">Add a disc</RacButton>
      <RacToaster />`,
  }),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Add a disc' }));
    await expect(canvas.getByRole('status')).toHaveTextContent('Ratchet & Clank (PAL) recognised.');
  },
};
