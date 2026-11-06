/**
 * The design tokens: written once here and emitted as CSS custom properties (src/styles/tokens.css,
 * made by `pnpm run tokens`). Components use only the variables, never raw colours.
 *
 * Colours come in two themes. Dark is the default and the builder's only theme; the site also offers light.
 * Every text pair the components use meets WCAG 2.2 AA in both themes (tests/tokens.test.ts).
 */

export type ColourToken =
  | 'space' | 'plate-900' | 'plate-800' | 'plate-700' | 'plate-600' | 'plate-glass' | 'rail-glass'
  | 'edge' | 'edge-soft' | 'rivet'
  | 'ink' | 'ink-dim' | 'ink-faint'
  | 'holo' | 'holo-glass' | 'holo-line'
  | 'bolt' | 'bolt-face' | 'bolt-face-hover' | 'bolt-ink' | 'bolt-glass'
  | 'hazard' | 'hazard-glass'
  | 'clank' | 'clank-glass'
  | 'glow-bolt' | 'glow-holo' | 'glow-hazard';

export type Theme = Record<ColourToken, string>;

/** Gunmetal plates in deep space; holo cyan for focus and links, bolt gold the one accent. */
export const dark: Theme = {
  'space': '#070B13',
  'plate-900': '#0E141F',
  'plate-800': '#141C2A',
  'plate-700': '#1B2433',
  'plate-600': '#243045',
  'plate-glass': 'rgba(20, 28, 42, 0.86)',
  'rail-glass': 'rgba(14, 20, 31, 0.72)',
  'edge': '#34425A',
  'edge-soft': '#273349',
  'rivet': '#4A5A75',
  'ink': '#E6EDF5',
  'ink-dim': '#9AA9BD',
  'ink-faint': '#8696AD',
  'holo': '#3FD7E6',
  'holo-glass': 'rgba(63, 215, 230, 0.08)',
  'holo-line': 'rgba(63, 215, 230, 0.35)',
  'bolt': '#F2B53A',
  'bolt-face': '#F2B53A',
  'bolt-face-hover': '#FFC655',
  'bolt-ink': '#1A1206',
  'bolt-glass': 'rgba(242, 181, 58, 0.12)',
  'hazard': '#FF7A1A',
  'hazard-glass': 'rgba(255, 122, 26, 0.10)',
  'clank': '#8BE36B',
  'clank-glass': 'rgba(139, 227, 107, 0.10)',
  // The edge glow that follows the pointer over a button, per variant.
  'glow-bolt': '#FFD780',
  'glow-holo': '#7FE9F3',
  'glow-hazard': '#FFA766',
};

/** Light plates; the accents darken where they are text, and gold stays gold on the primary button. */
export const light: Theme = {
  'space': '#E9EEF5',
  'plate-900': '#F5F7FB',
  'plate-800': '#EEF2F7',
  'plate-700': '#FFFFFF',
  'plate-600': '#E2E8F0',
  'plate-glass': 'rgba(255, 255, 255, 0.9)',
  'rail-glass': 'rgba(245, 247, 251, 0.8)',
  'edge': '#B4C0D0',
  'edge-soft': '#D3DBE6',
  'rivet': '#9AA8BB',
  'ink': '#121A26',
  'ink-dim': '#3E4B5E',
  'ink-faint': '#566377',
  'holo': '#00707D',
  'holo-glass': 'rgba(0, 112, 125, 0.07)',
  'holo-line': 'rgba(0, 112, 125, 0.35)',
  'bolt': '#8A5A00',
  'bolt-face': '#F2B53A',
  'bolt-face-hover': '#FFC655',
  'bolt-ink': '#1A1206',
  'bolt-glass': 'rgba(242, 181, 58, 0.18)',
  'hazard': '#B23F00',
  'hazard-glass': 'rgba(178, 63, 0, 0.08)',
  'clank': '#2D7417',
  'clank-glass': 'rgba(45, 116, 23, 0.08)',
  'glow-bolt': '#E9A21F',
  'glow-holo': '#0FA3B3',
  'glow-hazard': '#E0661A',
};

/** Theme-independent tokens. */
export const shared: Record<string, string> = {
  // Chakra Petch for headings and numbers, Barlow for text, JetBrains Mono for paths, hashes and labels.
  'font-display': '"Chakra Petch", "Bahnschrift", "Arial Narrow", sans-serif',
  'font-body': '"Barlow", "Segoe UI", system-ui, sans-serif',
  'font-mono': '"JetBrains Mono", ui-monospace, "Cascadia Mono", Consolas, monospace',
  // Chamfers: the cut corner of plates, buttons and tiles.
  'cut': '14px',
  'cut-button': '10px',
  'cut-sm': '8px',
  'cut-xs': '6px',
  'space-1': '4px',
  'space-2': '8px',
  'space-3': '12px',
  'space-4': '16px',
  'space-5': '20px',
  'space-6': '24px',
  'space-8': '32px',
  // Motion explains a change and stays within 150 to 300 ms.
  'ease': 'cubic-bezier(.2, .8, .2, 1)',
  'duration-fast': '150ms',
  'duration': '200ms',
  'duration-slow': '300ms',
  'scanlines': 'repeating-linear-gradient(0deg, rgba(255,255,255,.028) 0 1px, transparent 1px 3px)',
};

/** The text pairs the components draw, which must meet AA (4.5:1) in each theme. */
export const textPairs: [foreground: ColourToken, background: ColourToken][] = [
  ...(['ink', 'ink-dim', 'ink-faint', 'holo', 'bolt', 'hazard', 'clank'] as const).flatMap((fg) =>
    (['space', 'plate-900', 'plate-800', 'plate-700'] as const).map((bg): [ColourToken, ColourToken] => [fg, bg]),
  ),
  ['ink', 'plate-600'],
  ['ink-dim', 'plate-600'],
  ['bolt-ink', 'bolt-face'],
  ['bolt-ink', 'bolt-face-hover'],
];

function block(selector: string, values: Record<string, string>): string {
  const lines = Object.entries(values).map(([name, value]) => `  --rac-${name}: ${value};`);
  return `${selector} {\n${lines.join('\n')}\n}\n`;
}

/**
 * The stylesheet: shared tokens and the dark theme on :root, the light theme under [data-theme="light"],
 * and, for pages that allow it (data-theme="auto"), light when the system prefers it.
 */
export function tokensCss(): string {
  return [
    '/* Generated from src/tokens/tokens.ts by `pnpm run tokens`; edit that file, not this one. */\n',
    block(':root', { ...shared, ...dark }).replace('}\n', '  color-scheme: dark;\n}\n'),
    block('[data-theme="light"]', light).replace('}\n', '  color-scheme: light;\n}\n'),
    '@media (prefers-color-scheme: light) {\n' +
      block('  [data-theme="auto"]', light)
        .replace(/\n {2}--/g, '\n    --')
        .replace('}\n', '    color-scheme: light;\n  }\n') +
      '}\n',
  ].join('\n');
}
