import { spawn } from 'node:child_process';
import { chromium, expect, test, type Browser } from '@playwright/test';
import { answerFileDialog } from './support/fileDialog';

/**
 * The desktop app itself, with the real installer, on the real discs. Opt-in: DESKTOP_APP is the app's
 * executable (from `pnpm tauri build --debug --no-bundle`), and RAC1_IMAGE / RAC2_IMAGE the images.
 * Playwright attaches to the app's WebView2 through its debugging port, and the Windows file dialog is
 * answered through UI Automation; nothing in the app is stood in for.
 */
const RAC1 = process.env.RAC1_IMAGE ?? 'C:\\Users\\steph\\source\\repos\\OpenRAC\\games\\rac1\\baserom\\SCES_509.16.iso';
const RAC2 = process.env.RAC2_IMAGE ?? 'C:\\Users\\steph\\source\\repos\\OpenRAC\\games\\rac2\\ntsc\\baserom\\SCUS_972.68.iso';
const PORT = 9333;

test.skip(!process.env.DESKTOP_APP, 'needs the built desktop app: set DESKTOP_APP to its executable');

async function attach(): Promise<Browser> {
  for (let tries = 0; ; tries++) {
    try {
      return await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`);
    } catch (error) {
      if (tries > 60) throw error;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}

test('the desktop app identifies the real discs and plans the build', async () => {
  test.setTimeout(180_000);
  const app = spawn(process.env.DESKTOP_APP!, [], {
    env: { ...process.env, RAC_DEVTOOLS_PORT: String(PORT) },
  });
  try {
    const browser = await attach();
    const page = browser.contexts()[0]!.pages()[0]!;
    await expect(page.getByText(/^installer [0-9a-f]{7} · executive edition [0-9a-f]{7}$/)).toBeVisible({ timeout: 30_000 });


    await page.getByRole('button', { name: 'Next: discs' }).click();
    const rac1 = page.getByRole('listitem').filter({ hasText: 'Ratchet & Clank' }).first();
    await rac1.getByRole('button', { name: 'Choose image' }).click();
    await answerFileDialog('Choose disc images', RAC1);
    await expect(rac1.getByText(RAC1)).toBeVisible({ timeout: 90_000 });
    const rac2 = page.getByRole('listitem').filter({ hasText: 'Going Commando' });
    await rac2.getByRole('button', { name: 'Choose image' }).click();
    await answerFileDialog('Choose disc images', RAC2);
    await expect(rac2.getByText(RAC2)).toBeVisible({ timeout: 90_000 });

    await page.getByRole('button', { name: 'Next: output' }).click();
    await page.getByRole('button', { name: 'Next: review' }).click();
    await expect(page.getByText(/Needs about 4\.\d GB free/)).toBeVisible();
    if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/desktop-review.png` });
    await browser.close();
  } finally {
    app.kill();
  }
});
