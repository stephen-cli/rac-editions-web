/**
 * The installer's protocol, version 1, as rac-editions' installer/README.md ("The protocol") describes it:
 * one JSON object per line over the installer's stdin and stdout. The builder sends commands, each with
 * an id it chooses; the installer answers with events carrying that id.
 */

export const PROTOCOL = 1;

/** The games an edition takes discs from: rac1 is Ratchet & Clank, rac2 Going Commando. */
export type DiscKey = 'rac1' | 'rac2';

/** hash, verify and write count bytes; convert and patch count steps. */
export type Stage = 'hash' | 'verify' | 'convert' | 'patch' | 'write';

export type ErrorCode =
  | 'unknown_disc'
  | 'wrong_version'
  | 'image_incomplete'
  | 'missing_disc'
  | 'no_space'
  | 'not_writable'
  | 'cancelled'
  | 'internal';

export interface EditionDisc {
  name: string;
  region: string;
  required: boolean;
}

/** A feature the player may leave out; `needs` names the disc it takes data from, if any. */
export interface EditionSwitch {
  id: string;
  needs: DiscKey | null;
}

export interface Edition {
  id: string;
  name: string;
  game: string;
  version: string;
  discs: Partial<Record<DiscKey, EditionDisc>>;
  options: { economy: string[]; switches: EditionSwitch[] };
}

/**
 * What a disc image is. `disc` is set only for an image the edition is built from; `game` names the game
 * in any version, so a wrong version has disc null, known false, and its game, name and region. An image
 * of no game the installer knows has every field null.
 */
export interface Identified {
  disc: DiscKey | null;
  game: DiscKey | null;
  /** The game's name as the edition's discs name it ("Going Commando"). */
  name: string | null;
  region: string | null;
  /** The image's SHA-256; null when the file isn't a disc image. */
  sha256: string | null;
  known: boolean;
}

export interface BuildOptions {
  economy?: string;
  without?: string[];
}

/** A new image at `path`, or the base disc's image updated in place (after saving `<image>.restore`). */
export type Output = { mode: 'new'; path: string } | { mode: 'in_place' };

export interface BuildRequest {
  edition: string;
  discs: Partial<Record<DiscKey, string>>;
  options: BuildOptions;
  output: Output;
}

export interface Plan {
  in: string[];
  left_out: { id: string; because: 'no_rac2' | 'chosen' }[];
  bytes_needed: number;
}

export interface Built {
  path: string;
  sha256: string;
}

export type Command =
  | { id: string; cmd: 'editions' }
  | { id: string; cmd: 'identify'; path: string }
  | ({ id: string; cmd: 'plan' } & BuildRequest)
  | ({ id: string; cmd: 'build' } & BuildRequest)
  | { id: string; cmd: 'cancel'; of: string };

export type InstallerEvent =
  | { event: 'ready'; protocol: number; installer: string }
  | { event: 'progress'; id: string; stage: Stage; done: number; total: number }
  | { event: 'log'; id: string; text: string }
  | { event: 'result'; id: string; value: unknown }
  | { event: 'error'; id: string; code: ErrorCode; message: string };
