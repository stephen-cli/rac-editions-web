import type { IconName } from '@rac-editions/ui';

/**
 * The words the builder shows for an edition's features. The installer says which features exist and
 * which a player may switch off; what they are called and do is the builder's to say.
 */
export interface FeatureCopy {
  /** The installer's switch id, for a feature the player may leave out. */
  switch?: string;
  icon: IconName;
  name: string;
  /** One line for the review. */
  text: string;
  /** The fuller line in Edition settings, for a switchable feature. */
  detail?: string;
}

export interface EditionCopy {
  /** What the card says the edition needs, in words players know. */
  needs: string;
  /** Each disc's line on the Discs step. */
  discs: Record<string, string>;
  /** Features in the order the review lists them. */
  features: FeatureCopy[];
  /** The note at the top of Edition settings. */
  designedNote: string;
  economy: Record<string, { label: string; text: string; short: string }>;
}

export const EDITION_COPY: Record<string, EditionCopy> = {
  'rac1-executive': {
    needs: 'Needs the PAL version',
    discs: {
      rac1: 'Required. The edition is built from this.',
      rac2: 'Optional. Adds the Charge Boots and strafing.',
    },
    features: [
      {
        switch: 'charge_boots', icon: 'boots', name: 'Charge Boots',
        text: "Going Commando's dash on a double tap of R1, unlocked by a cheat in Challenge Mode.",
        detail: "Going Commando's dash on a double tap of R1, unlocked by a move-combo cheat in Challenge Mode.",
      },
      {
        switch: 'strafing', icon: 'strafe', name: 'Strafing',
        text: "L2 and R2 strafe, with Going Commando's flips and backpedal.",
        detail: "L2 and R2 strafe, with Going Commando's flips and backpedal. Players can still turn it off on the in-game Controls page.",
      },
      {
        switch: 'quick_select_pages', icon: 'pages', name: 'Quick Select pages',
        text: 'Three rings, switched with R1 and L1.',
        detail: "Three Quick Select rings, switched with R1 and L1. Off keeps retail's single ring.",
      },
      { icon: 'pause', name: 'Quick Select pause', text: 'The action pauses while the ring is held open.' },
      { icon: 'wide', name: '16:9 widescreen', text: 'Levels, menus, cutscenes and the title screen.' },
      { icon: 'throw', name: 'Free movement after the wrench throw', text: 'Run or jump out of the Comet-Strike.' },
      { icon: 'detector', name: 'Metal Detector', text: '10x bolts in Challenge Mode.' },
      { icon: 'random', name: 'Randomizer', text: 'In Goodies on the title screen, unlocked by beating Drek.' },
      { icon: 'volume', name: 'Movie volume', text: 'Its own row on the Sound page.' },
      { icon: 'fixes', name: 'Fixes', text: "Oltanis's lightning and Kalebo III's Gadgetron sign." },
    ],
    designedNote: 'The Executive Edition is designed to be played with everything here as it comes. Change these only if you want a different game.',
    economy: {
      skill: {
        label: 'Skill',
        text: 'Drops as in a first playthrough, plus a bolt multiplier for kills without taking a hit.',
        short: 'Skill: first-playthrough drops and a bolt multiplier for kills without taking a hit.',
      },
      classic: {
        label: 'Classic',
        text: "Retail's doubled drops in Challenge Mode.",
        short: "Classic: retail's doubled drops.",
      },
    },
  },
};

/** Planned editions, shown beside the ones the installer has, so the three sit side by side. */
export const PLANNED_EDITIONS = [
  { game: 'Going Commando', name: 'Loaded Edition' },
  { game: 'Up Your Arsenal', name: 'Titanium Edition' },
];

/** A region as players say it, for messages such as "This is the US version". */
export function regionName(region: string): string {
  return { PAL: 'PAL (European)', USA: 'US', NTSC: 'US', JPN: 'Japanese' }[region] ?? region;
}
