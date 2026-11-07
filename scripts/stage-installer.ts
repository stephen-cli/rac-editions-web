/**
 * Stages what a release build of the builder bundles: rac-editions' installer core for the target platform, as
 * the Tauri sidecar `rac-installer`, each edition's payload, and the licences that come with them, from the
 * rac-editions release pinned in apps/builder/installer.json (rac-editions' installer/README.md, "Releases").
 *
 *   node scripts/stage-installer.ts                       the pinned release's assets, for this machine
 *   node scripts/stage-installer.ts --target TRIPLE       ... for another target (a Mac's other architecture)
 *   node scripts/stage-installer.ts --from DIR            a rac-editions checkout's own build instead
 *                                                         (installer/core/build, editions/<edition>/build/payload)
 *
 * They land in apps/builder/src-tauri/binaries/rac-installer-<triple>[.exe], src-tauri/payloads/<edition>/ and
 * src-tauri/licences/, which src-tauri/tauri.release.conf.json bundles. None is committed: the installer and
 * payloads are rac-editions' (GPL-3.0-or-later), shipped beside the builder as a separate program, so the app
 * carries the GPL, rac-editions' licensing notes and where their source is (NOTICE.txt), with the builder's
 * own MIT licence.
 */
import { execFileSync } from 'node:child_process';
import { chmodSync, copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';

interface Pin {
  /** owner/name of the rac-editions repository on GitHub */
  repository: string;
  /** the release's tag */
  release: string;
  /** the editions whose payloads the builder bundles */
  editions: string[];
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAURI = join(ROOT, 'apps/builder/src-tauri');
const PIN_FILE = join(ROOT, 'apps/builder/installer.json');
const LICENCES = join(TAURI, 'licences');
/** rac-editions' licence files: the GPL's text and its licensing notes */
const RAC_EDITIONS_LICENCES = ['COPYING', 'LICENSE.md'];

function argument(name: string): string | undefined {
  const at = process.argv.indexOf(name);
  return at >= 0 ? process.argv[at + 1] : undefined;
}

/** The target triple Rust builds for on this machine, as Tauri names sidecars by it. */
function hostTriple(): string {
  const info = execFileSync('rustc', ['-vV'], { encoding: 'utf8' });
  const host = /^host: (\S+)$/m.exec(info)?.[1];
  if (!host) throw new Error('rustc -vV names no host triple');
  return host;
}

async function download(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status} ${response.statusText}`);
  return Buffer.from(await response.arrayBuffer());
}

/**
 * The files of a zip archive into FOLDER. Only what the payloads use is read: stored or deflated entries, no
 * zip64. Entries that would land outside FOLDER are refused.
 */
function unzip(archive: Buffer, folder: string): void {
  const END = 0x06054b50;
  const CENTRAL = 0x02014b50;
  const LOCAL = 0x04034b50;
  let end = archive.length - 22;
  while (end >= 0 && archive.readUInt32LE(end) !== END) end--;
  if (end < 0) throw new Error('not a zip archive');
  const count = archive.readUInt16LE(end + 10);
  let entry = archive.readUInt32LE(end + 16);
  for (let i = 0; i < count; i++) {
    if (archive.readUInt32LE(entry) !== CENTRAL) throw new Error('a broken zip directory');
    const method = archive.readUInt16LE(entry + 10);
    const packedSize = archive.readUInt32LE(entry + 20);
    const nameLength = archive.readUInt16LE(entry + 28);
    const extraLength = archive.readUInt16LE(entry + 30);
    const commentLength = archive.readUInt16LE(entry + 32);
    const local = archive.readUInt32LE(entry + 42);
    const name = archive.toString('utf8', entry + 46, entry + 46 + nameLength);
    entry += 46 + nameLength + extraLength + commentLength;

    const target = normalize(join(folder, name));
    if (!target.startsWith(folder + sep)) throw new Error(`${name}: outside the archive's folder`);
    if (name.endsWith('/')) {
      mkdirSync(target, { recursive: true });
      continue;
    }
    if (archive.readUInt32LE(local) !== LOCAL) throw new Error(`${name}: a broken zip entry`);
    const start = local + 30 + archive.readUInt16LE(local + 26) + archive.readUInt16LE(local + 28);
    const packed = archive.subarray(start, start + packedSize);
    if (method !== 0 && method !== 8) throw new Error(`${name}: compression method ${method}`);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, method === 8 ? inflateRawSync(packed) : packed);
  }
}

function programName(triple: string): string {
  return triple.includes('windows') ? 'rac-installer.exe' : 'rac-installer';
}

function sidecarPath(triple: string): string {
  const suffix = triple.includes('windows') ? '.exe' : '';
  return join(TAURI, 'binaries', `rac-installer-${triple}${suffix}`);
}

/**
 * The licences beside the bundled installer: rac-editions' files (FILES, by name), NOTICE.txt naming what is
 * bundled and the source it is built from (SOURCE, a URL or a checkout's commit), and the builder's LICENSE.
 */
function writeLicences(pin: Pin, files: Map<string, Buffer>, source: string): void {
  rmSync(LICENCES, { recursive: true, force: true });
  mkdirSync(join(LICENCES, 'rac-editions'), { recursive: true });
  for (const [name, bytes] of files) writeFileSync(join(LICENCES, 'rac-editions', name), bytes);
  copyFileSync(join(ROOT, 'LICENSE'), join(LICENCES, 'LICENSE'));
  writeFileSync(
    join(LICENCES, 'NOTICE.txt'),
    [
      'Editions Builder is free software under the MIT licence (LICENSE).',
      '',
      `It runs rac-installer and bundles the edition payloads (${pin.editions.join(', ')}) from rac-editions,`,
      'a separate program: free software under the GNU General Public License, version 3 or (at your option)',
      'any later version (rac-editions/COPYING), with the licensing notes in rac-editions/LICENSE.md.',
      `Their source: ${source}`,
      '',
    ].join('\n'),
  );
  console.log(`${LICENCES}: ${source}`);
}

async function fromRelease(pin: Pin, triple: string): Promise<void> {
  const base = `https://github.com/${pin.repository}/releases/download/${encodeURIComponent(pin.release)}`;
  const sidecar = sidecarPath(triple);
  const suffix = triple.includes('windows') ? '.exe' : '';
  writeFileSync(sidecar, await download(`${base}/rac-installer-${triple}${suffix}`));
  chmodSync(sidecar, 0o755);
  console.log(`${sidecar}: ${pin.release}`);
  for (const edition of pin.editions) {
    const archive = await download(`${base}/${edition}-payload.zip`);
    const folder = join(TAURI, 'payloads', edition);
    rmSync(folder, { recursive: true, force: true });
    unzip(archive, folder);
    console.log(`${folder}: ${pin.release}`);
  }
  const raw = `https://raw.githubusercontent.com/${pin.repository}/${encodeURIComponent(pin.release)}`;
  const files = new Map<string, Buffer>();
  for (const name of RAC_EDITIONS_LICENCES) files.set(name, await download(`${raw}/${name}`));
  writeLicences(pin, files, `https://github.com/${pin.repository}/tree/${pin.release}`);
}

function fromCheckout(pin: Pin, checkout: string, triple: string): void {
  const program = join(checkout, 'installer/core/build', programName(triple));
  if (!existsSync(program)) throw new Error(`${program} is not built (installer/core, CMake)`);
  copyFileSync(program, sidecarPath(triple));
  console.log(`${sidecarPath(triple)}: ${program}`);
  for (const edition of pin.editions) {
    const payload = join(checkout, 'editions', edition, 'build/payload');
    if (!existsSync(join(payload, 'edition.json'))) throw new Error(`${payload} has no payload (tools/release.py)`);
    rmSync(join(TAURI, 'payloads', edition), { recursive: true, force: true });
    cpSync(payload, join(TAURI, 'payloads', edition), { recursive: true });
    console.log(`${join(TAURI, 'payloads', edition)}: ${payload}`);
  }
  const files = new Map(RAC_EDITIONS_LICENCES.map((name) => [name, readFileSync(join(checkout, name))]));
  const commit = execFileSync('git', ['-C', checkout, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  writeLicences(pin, files, `https://github.com/${pin.repository}/tree/${commit} (a local checkout)`);
}

async function main(): Promise<void> {
  const pin = JSON.parse(readFileSync(PIN_FILE, 'utf8')) as Pin;
  const triple = argument('--target') ?? hostTriple();
  mkdirSync(join(TAURI, 'binaries'), { recursive: true });
  mkdirSync(join(TAURI, 'payloads'), { recursive: true });
  const checkout = argument('--from');
  if (checkout) fromCheckout(pin, resolve(checkout), triple);
  else await fromRelease(pin, triple);
}

main().catch((error: unknown) => {
  console.error(`stage-installer: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
