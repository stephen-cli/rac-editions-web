# R&C Editions: site and builder

The website for the Ratchet & Clank editions and the desktop builder that makes an edition from a player's
own disc images, with the Vue component library both share.

| Path | What it is |
|---|---|
| `packages/ui` | `@rac-editions/ui`: design tokens, the Ratchet-styled components and their workshop |
| `apps/builder` | the Editions Builder's wizard; in a browser it runs against a stand-in installer |

The installer that does the building lives in
[rac-editions](https://github.com/stephen-cli/rac-editions) (GPL-3.0-or-later). The builder runs it as a
separate program and talks to it over JSON lines on stdin and stdout, so the edition logic stays there and
this repository holds the interface to it.

## No game data

Nothing in this repository holds data from a game: no disc images, executables, saves, audio or video.
`scripts/check-game-data.ts` refuses such files in every commit (the pre-commit hook) and in CI.

## Development

Needs Node 24.11 or newer (`.node-version` names the one CI uses) and pnpm 12. The pre-commit hook runs
with whichever `node` is first on PATH; if that is an older one, put the newer one first, e.g. in
PowerShell `$env:PATH = "<node folder>;$env:PATH"`.

```sh
pnpm install        # also points git at .githooks/
pnpm run check      # game data, lint, type check, tests
pnpm run workshop   # the component workshop (Storybook) on http://localhost:6006
pnpm --filter @rac-editions/builder dev   # the builder on http://localhost:5180
pnpm --filter @rac-editions/builder e2e   # the wizard end to end (Playwright, in the installed Edge)
```

In a browser the builder talks to `apps/builder/src/installer/fake.ts`, which speaks the installer's
protocol and recognises disc images by file name (`Ratchet & Clank (Europe).iso`, `Going Commando
(USA).iso`); `?pace=0.1` runs it ten times faster.

With `?installer=real` the dev server runs the real installer instead (`apps/builder/vite/installerBridge.ts`):
rac-editions' installer core, `rac-installer --serve`, checked out beside this repository and built with CMake
(`installer/core/build`), serving the Executive Edition's payload (its `tools/release.py` writes
`build/payload`); or the command in `RAC_INSTALLER` (a JSON array). The desktop shell's debug build runs the
same. The file dialog is then the system's (Windows), so images have their real paths.
`REAL_INSTALLER=1 pnpm --filter @rac-editions/builder e2e` runs the wizard that way on the real discs
(`RAC1_IMAGE`, `RAC2_IMAGE`).

A release build bundles rac-editions' installer core and the editions' payloads from the rac-editions
release pinned in `apps/builder/installer.json`, with their licence (GPL-3.0-or-later) and where their source
is: `node scripts/stage-installer.ts` stages them (`--from ../rac-editions` stages a local checkout's build
instead), then `pnpm --filter @rac-editions/builder tauri build --config src-tauri/tauri.release.conf.json`
builds the app with them. The `release` workflow does both for every platform when a release is published, and
attaches the installers of the platforms its matrix marks `ship` (Windows for now).

After changing `packages/ui/src/tokens/tokens.ts`, run `pnpm --filter @rac-editions/ui run tokens` to
write `tokens.css`; a test fails while the two differ.

## Licence

MIT (`LICENSE`). Fonts are from Fontsource under the SIL Open Font License.
