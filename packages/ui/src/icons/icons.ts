/**
 * The icon set, drawn for the editions on one 24-unit grid. Each entry is the inside of an
 * <svg viewBox="0 0 24 24"> stroked in currentColor, so the surrounding tile sets the colour.
 * Constant markup only: RacIcon renders these strings as HTML.
 */
export const ICONS = {
  // features
  boots: '<path d="M9 3h5v7l5 2.6a2.6 2.6 0 0 1 1.4 2.3V18H8z"/><path d="M8 18v2.5h12.4V18"/><path d="M2 10.5h4M1.5 14h4.5M2 17.5h4"/>',
  strafe: '<circle cx="12" cy="5.5" r="2"/><path d="M12 8.5v5.5M9.5 20l2.5-6 2.5 6M9 11h6"/><path d="M6.5 12H2.5M4.3 10.2L2.5 12l1.8 1.8M17.5 12h4M19.7 10.2l1.8 1.8-1.8 1.8"/>',
  bolts: '<path d="M12 2.5l8.2 4.75v9.5L12 21.5l-8.2-4.75v-9.5z"/><circle cx="12" cy="12" r="3.3"/>',
  pages: '<circle cx="14.5" cy="12" r="6.5" stroke-dasharray="3.4 1.7" opacity=".55"/><circle cx="9.5" cy="12" r="6.5" stroke-dasharray="3.4 1.7"/><circle cx="9.5" cy="12" r="1.3" fill="currentColor"/>',
  pause: '<circle cx="12" cy="12" r="8.5" stroke-dasharray="4.2 2.1"/><path d="M10 9v6M14 9v6"/>',
  wide: '<rect x="2" y="6" width="20" height="12" rx="1"/><path d="M5.5 12h13M8 9.8L5.5 12 8 14.2M16 9.8l2.5 2.2-2.5 2.2"/>',
  throw: '<path d="M14.8 4.2a3.6 3.6 0 0 0 5 5l-1.9-.5-1.2-1.2-.6-1.9z"/><path d="M15.6 8.4l-8 8a1.6 1.6 0 1 0 2.3 2.3l8-8"/><path d="M3 9.5a8.5 8.5 0 0 1 6-6.3"/><path d="M6.5 2.6L9 3.2l-1 2.4"/>',
  detector: '<path d="M4 20.5l7-7"/><path d="M10 10.5l3.5 3.5 2.5-2.5-3.5-3.5z"/><path d="M16.5 3.5a5.5 5.5 0 0 1 4 4M15.5 6.3a2.6 2.6 0 0 1 2.2 2.2"/>',
  random: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="8.5" cy="8.5" r="1.1" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.1" fill="currentColor"/><circle cx="12" cy="12" r="1.1" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1.1" fill="currentColor"/><circle cx="8.5" cy="15.5" r="1.1" fill="currentColor"/>',
  volume: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  fixes: '<path d="M20.5 7.5a4.5 4.5 0 0 1-6 4.2L7.4 18.8a2 2 0 1 1-2.8-2.8L11.7 9A4.5 4.5 0 0 1 17 3.4l-2.6 2.6.5 2.2 2.2.5z"/>',
  // discs and play targets
  drive: '<rect x="2.5" y="7" width="19" height="10" rx="1.5"/><path d="M6 13.5h8"/><circle cx="18" cy="13.5" r=".9" fill="currentColor"/>',
  disc: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/><path d="M12 5.5a6.5 6.5 0 0 1 6.5 6.5" opacity=".6"/>',
  file: '<path d="M6 2.5h8l4 4v15H6z"/><path d="M14 2.5v4h4"/><circle cx="12" cy="14" r="3.2"/>',
  folder: '<path d="M2.5 6.5a1.5 1.5 0 0 1 1.5-1.5h4.6l2 2.2H20a1.5 1.5 0 0 1 1.5 1.5v9.3A1.5 1.5 0 0 1 20 19.5H4a1.5 1.5 0 0 1-1.5-1.5z"/><path d="M2.5 10h19" opacity=".6"/>',
  pc: '<rect x="3" y="4" width="18" height="12" rx="1.2"/><path d="M8.5 20h7M12 16v4"/>',
  console: '<rect x="2.5" y="8" width="19" height="8" rx="1.5"/><path d="M6 12h5"/><circle cx="17" cy="12" r="1" fill="currentColor"/>',
  // interface
  check: '<path d="M4 12.5l5 5L20 6.5"/>',
  settings: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
} as const;

export type IconName = keyof typeof ICONS;
