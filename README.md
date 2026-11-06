# R&C Editions: site and builder

The website for the Ratchet & Clank editions and the desktop builder that makes an edition from a player's
own disc images, with the Vue component library both share.

| Path | What it is |
|---|---|
| `packages/ui` | `@rac-editions/ui`: design tokens, the Ratchet-styled components and their workshop |

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
```

After changing `packages/ui/src/tokens/tokens.ts`, run `pnpm --filter @rac-editions/ui run tokens` to
write `tokens.css`; a test fails while the two differ.

## Licence

MIT (`LICENSE`). Fonts are from Fontsource under the SIL Open Font License.
