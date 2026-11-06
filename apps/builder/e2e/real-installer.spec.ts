import { existsSync, statSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

/**
 * The wizard with the real installer through the dev bridge (?installer=real), on the real discs.
 * Opt-in, since only a machine with the discs can run it: REAL_INSTALLER=1, and RAC1_IMAGE / RAC2_IMAGE
 * for the images' paths. Only the system's file dialog is stood in for: it answers with those paths.
 * REAL_BUILD=1 also builds the edition, into REAL_BUILD_OUTPUT (about 4.5 GB free needed there).
 */
const RAC1 = process.env.RAC1_IMAGE ?? 'C:\\Users\\steph\\source\\repos\\OpenRAC\\games\\rac1\\baserom\\SCES_509.16.iso';
const RAC2 = process.env.RAC2_IMAGE ?? 'C:\\Users\\steph\\source\\repos\\OpenRAC\\games\\rac2\\ntsc\\baserom\\SCUS_972.68.iso';

test.skip(!process.env.REAL_INSTALLER, 'needs the real installer and the discs: set REAL_INSTALLER=1');

/** Adds both real discs and goes on to the Output step. */
async function addDiscs(page: Page): Promise<void> {
  const answers = [[RAC1], [RAC2]];
  await page.route('**/__installer/pick', (route) => route.fulfill({ json: answers.shift() ?? [] }));

  await page.goto('/?installer=real');
  await expect(page.getByRole('heading', { name: 'Choose an edition' })).toBeVisible();
  await expect(page.getByText(/^installer [0-9a-f]{7} · executive edition [0-9a-f]{7}$/)).toBeVisible();
  await page.getByRole('button', { name: 'Next: discs' }).click();

  const rac1 = page.getByRole('listitem').filter({ hasText: 'Ratchet & Clank' }).first();
  await rac1.getByRole('button', { name: 'Choose image' }).click();
  await expect(rac1.getByRole('progressbar')).toBeVisible();
  await expect(rac1.getByText(RAC1)).toBeVisible({ timeout: 90_000 });

  const rac2 = page.getByRole('listitem').filter({ hasText: 'Going Commando' });
  await rac2.getByRole('button', { name: 'Choose image' }).click();
  await expect(rac2.getByText(RAC2)).toBeVisible({ timeout: 90_000 });
  await expect(page.getByRole('status')).toContainText('Going Commando (USA) recognised.');
  await page.getByRole('button', { name: 'Next: output' }).click();
}

test('identifies the real discs and plans the build', async ({ page }) => {
  test.setTimeout(180_000);
  await addDiscs(page);
  await page.getByRole('button', { name: 'Next: review' }).click();
  await expect(page.getByText(/Needs about 4\.\d GB free/)).toBeVisible();
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/real-review.png` });
});

test('builds the edition from the real discs', async ({ page }) => {
  test.skip(!process.env.REAL_BUILD || !process.env.REAL_BUILD_OUTPUT, 'set REAL_BUILD=1 and REAL_BUILD_OUTPUT to the new image');
  test.setTimeout(900_000);
  const output = process.env.REAL_BUILD_OUTPUT!;
  await addDiscs(page);
  await page.getByLabel('Save as').fill(output);
  await page.getByRole('button', { name: 'Next: review' }).click();
  await page.getByRole('button', { name: 'Build Executive Edition' }).click();
  await expect(page.getByRole('heading', { name: 'Building the Executive Edition' })).toBeVisible();
  await expect(page.getByText('Write the new image')).toBeVisible();
  if (process.env.SHOTS) {
    await page.waitForTimeout(20_000);
    await page.screenshot({ path: `${process.env.SHOTS}/real-build.png` });
  }
  await expect(page.getByRole('heading', { name: 'Executive Edition is ready' })).toBeVisible({ timeout: 840_000 });
  await expect(page.getByText(output)).toBeVisible();
  const hash = (await page.getByText(/^SHA-256 [0-9a-f]{64}$/).textContent())!.slice('SHA-256 '.length);
  test.info().annotations.push({ type: 'sha256', description: hash });
  console.log(`built ${output}: sha256 ${hash}`);
  expect(existsSync(output)).toBe(true);
  expect(statSync(output).size).toBeGreaterThan(4_000_000_000);
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/real-done.png` });
});
