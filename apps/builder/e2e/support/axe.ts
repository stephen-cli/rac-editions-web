import { createRequire } from 'node:module';
import { expect, type Page } from '@playwright/test';

const axeSource = createRequire(import.meta.url).resolve('axe-core/axe.min.js');

/**
 * Checks the page as it stands against WCAG 2.2 AA with axe-core and fails on any violation, listing
 * each one with the elements it found. Colour contrast is included: the page is rendered, so axe sees
 * the real colours.
 */
export async function expectAccessible(page: Page): Promise<void> {
  await page.addScriptTag({ path: axeSource });
  const violations = await page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run: (context: Document, options: object) => Promise<{ violations: { id: string; help: string; nodes: { target: unknown[] }[] }[] }> } }).axe;
    const result = await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] });
    return result.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((node) => node.target.join(' ')).join(', ')})`);
  });
  expect(violations).toEqual([]);
}
