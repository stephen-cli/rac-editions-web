import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { dark, light, textPairs, tokensCss, type Theme } from '../src/tokens/tokens';

/** WCAG 2.2 relative luminance of an opaque #RRGGBB colour. */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (high + 0.05) / (low + 0.05);
}

describe.each([
  ['dark', dark],
  ['light', light],
] as [string, Theme][])('the %s theme', (_, theme) => {
  it.each(textPairs)('%s text on %s meets AA', (fg, bg) => {
    expect(contrast(theme[fg], theme[bg])).toBeGreaterThanOrEqual(4.5);
  });
});

describe('tokens.css', () => {
  it('matches tokens.ts (run `pnpm run tokens` after changing them)', () => {
    // Vitest runs from the package directory.
    const css = readFileSync('src/styles/tokens.css', 'utf8');
    expect(css).toBe(tokensCss());
  });
});
