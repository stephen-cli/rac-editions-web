import { expect, test, type Page } from '@playwright/test';

// Disc images by name only: the fake installer recognises them by name, and no image is ever written.
const image = (name: string) => ({ name, mimeType: 'application/octet-stream', buffer: Buffer.alloc(0) });
const PAL = image('Ratchet & Clank (Europe).iso');
const USA = image('Ratchet & Clank (USA).iso');
const GC = image('Ratchet & Clank - Going Commando (USA).iso');

async function shot(page: Page, name: string): Promise<void> {
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/${name}.png` });
}

/** Chooses `file` with the "Choose image" button of the disc row named `game`. */
async function chooseImage(page: Page, game: string, file: ReturnType<typeof image>): Promise<void> {
  const row = page.getByRole('listitem').filter({ hasText: game });
  const chooser = page.waitForEvent('filechooser');
  await row.getByRole('button', { name: 'Choose image' }).click();
  await (await chooser).setFiles(file);
}

async function toReview(page: Page, withGoingCommando: boolean): Promise<void> {
  await page.goto('/?pace=0.1');
  await expect(page.getByRole('heading', { name: 'Choose an edition' })).toBeFocused();
  await shot(page, '1-edition');
  await page.getByRole('button', { name: 'Next: discs' }).click();
  await chooseImage(page, 'Ratchet & Clank', PAL);
  if (withGoingCommando) await chooseImage(page, 'Going Commando', GC);
  await expect(page.getByText('Ratchet & Clank (Europe).iso')).toBeVisible();
  if (withGoingCommando) await expect(page.getByText('Going Commando (USA).iso')).toBeVisible();
  await shot(page, '2-discs');
  await page.getByRole('button', { name: 'Next: output' }).click();
  await expect(page.getByLabel('Save as')).toHaveValue('D:\\Games\\PS2\\Ratchet & Clank - Executive Edition.iso');
  await shot(page, '3-output');
  await page.getByRole('button', { name: 'Next: review' }).click();
  await expect(page.getByRole('heading', { name: 'Review and build' })).toBeVisible();
}

test('builds the edition with both discs and a setting changed', async ({ page }) => {
  await toReview(page, true);
  await expect(page.getByText('Needs about 4.5 GB free')).toBeVisible();
  await shot(page, '4-review');

  await page.getByRole('button', { name: 'Edition settings' }).click();
  const settings = page.getByRole('dialog', { name: 'Edition settings' });
  await settings.getByRole('switch', { name: 'Quick Select pages' }).click();
  await settings.getByRole('radio', { name: /Classic/ }).click();
  await shot(page, '5-settings');
  await settings.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByText('Customised')).toBeVisible();
  await expect(page.getByText('Switched off in Edition settings.')).toBeVisible();

  await page.getByRole('button', { name: 'Build Executive Edition' }).click();
  await expect(page.getByRole('heading', { name: 'Building the Executive Edition' })).toBeVisible();
  await expect(page.getByText('Write the new image')).toBeVisible();
  await page.waitForTimeout(700);
  await shot(page, '6-build');
  await expect(page.getByRole('heading', { name: 'Executive Edition is ready' })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('D:\\Games\\PS2\\Ratchet & Clank - Executive Edition.iso')).toBeVisible();
  await page.getByRole('tab', { name: 'PS2 or PS3' }).click();
  await expect(page.getByRole('tabpanel')).toContainText('Open PS2 Loader');
  await shot(page, '7-done');
});

test('refuses the US disc and says why, in its row', async ({ page }) => {
  await page.goto('/?pace=0.1#/discs');
  await chooseImage(page, 'Ratchet & Clank', USA);
  await expect(page.getByRole('alert')).toHaveText(
    'This is the US version. The Executive Edition is built from the PAL (European) version of Ratchet & Clank.',
  );
  await expect(page.getByRole('button', { name: 'Next: output' })).toBeDisabled();
  await shot(page, '2-refused');
});

test('locks the Going Commando features without that disc', async ({ page }) => {
  await toReview(page, false);
  await expect(page.getByText('Needs Going Commando (USA).').first()).toBeVisible();
  await page.getByRole('button', { name: 'Edition settings' }).click();
  await expect(page.getByRole('switch', { name: /Charge Boots/ })).toBeDisabled();
});

test('cancels a build and leads back to the review', async ({ page }) => {
  await toReview(page, false);
  await page.getByRole('button', { name: 'Build Executive Edition' }).click();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('heading', { name: 'Build cancelled' })).toBeVisible();
  await expect(page.getByText('The new image was deleted.')).toBeVisible();
  await page.getByRole('button', { name: 'Back to review' }).click();
  await expect(page.getByRole('heading', { name: 'Review and build' })).toBeVisible();
});

test('needs a confirmation before updating an image in place', async ({ page }) => {
  await toReview(page, false);
  await page.getByRole('button', { name: 'Back' }).click();
  await page.getByText('Update my image in place').click();
  await expect(page.getByRole('button', { name: 'Next: review' })).toBeDisabled();
  await page.getByRole('checkbox', { name: /becomes the Executive Edition/ }).check();
  await expect(page.getByRole('button', { name: 'Next: review' })).toBeEnabled();
  await shot(page, '3-in-place');
});

test('reads Going Commando from the DVD drive into its row', async ({ page }) => {
  await page.goto('/?pace=0.1#/discs');
  const row = page.getByRole('listitem').filter({ hasText: 'Going Commando' });
  await row.getByRole('button', { name: 'or read the DVD' }).click();
  await expect(row.getByText(/Copied from the DVD to .*Going Commando \(USA\)\.iso/)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('status')).toContainText('Going Commando (USA) recognised.');
});
