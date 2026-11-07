# Instructions for AI agents

These rules apply to any AI agent working in rac-editions-web, along with the [README](README.md). They follow
rac-editions' own AGENTS.md, so both repositories are worked on the same way.

## Commits and pushes

- Commit finished, working changes locally, one logical change per commit.
- Never push, publish or release anything without being asked.
- Never rewrite history that has been pushed.
- Leave uncommitted changes you did not make alone, and commit only your own.

## Project rules

- **No game data**, ever: see the README. `node scripts/check-game-data.ts` must pass.
- **The boundary with rac-editions.** rac-editions holds the edition logic and the installer; this repository
  holds the interface to it: the site, the builder and their components. The builder runs the installer as a
  separate program over the protocol in rac-editions' `installer/README.md`, and reads the editions' data
  (`edition.json`), never their internals; protocol changes are agreed in rac-editions first. Keep that split
  because it keeps each side simple, not as a wall: where the cleanest answer is to reuse something
  rac-editions already has (a schema, a small utility), reuse it.
- **Licences.** This repository is MIT; rac-editions, OpenRAC and wrench are GPL-3.0. Code this repository's
  author wrote for those repositories (including code written there with Claude) may come in under MIT; say
  where it came from in the commit message. Code by other authors under the GPL may not, nor may anything whose
  licence forbids redistribution.
- **Effects are our own code.** Their look learns from Vue Bits (vue-bits.dev), but no Vue Bits code is copied
  or ported here: its MIT + Commons Clause licence forbids redistributing its components, ported versions
  included.
- **One version of each dependency**: add it to the catalog in `pnpm-workspace.yaml` and ask for `catalog:`.
  Pin exact versions.
- **Accessibility**: every text pair meets WCAG 2.2 AA (`tests/tokens.test.ts`); every control works by
  keyboard with the holo focus ring; reduced motion stills every effect.
- **No legacy leftovers.** When an option, path, prop or mechanism is renamed or replaced, remove the old one
  outright rather than keeping an alias, and update the docs and comments that name it in the same change.
  Dated records keep the names they had at the time.

## Writing: commit messages, docs and code comments

Write about the product, not about the work session.

- **State, not process.** Say what the site or builder does, or for a fix, what was wrong and what it does
  now. Leave out how a bug was found, reproduced or narrowed down.
- **Direct description.** Name the behaviour itself: "Apply the edition sits at 0% until the first level is
  spliced", not "Testing showed the progress stalling".
- **Defects in the active voice.** "Two images added together share one row, and the second is dropped", not
  "It was observed that…" or "X found that…".
- **No meta-language.** No "the owner", "the user" (meaning whoever asked for the change), "at X's request",
  "this commit", "as reported", "after investigating". The player who uses the builder is "the player".
- **Changelogs** may say how an issue surfaced, but never who reported it.

## Commit messages

Subject: `type(scope): summary`, for example `fix(builder): the sector count no longer jitters as it climbs`.
The scope is the part changed: `ui` (the component library), `builder`, `desktop` (the builder's Tauri shell),
`site`, `ci` or `docs`.

Body: clear, concise and useful to someone reading the history later.

- Lead with the problem, then what the change does. Two to four sentences are usually enough.
- Include the technical detail that explains the change: how the installer, the protocol, the browser or Tauri
  behaves, and why that caused the problem or makes the fix work. Leave out detail that only records the
  session: tool runs, audit counts, setup steps, dead ends.
- Mention testing in one line, stated as fact, only when it is useful ("Tested with a real build."). Say
  plainly when something is untested.
- A small, self-explanatory change needs no body.
- No `Co-Authored-By:` or other attribution lines.

Example:

```
fix(builder): count the sectors written in fixed-width digits

The sectors-written count shifted left and right as it climbed, because
each digit took its own width in the proportional font. RacCountUp now
sets every digit in a cell 1ch wide, with an invisible copy of the
largest value holding the width, so the number stays still and screen
readers still hear it once.
```

## Explaining the code

Comments and docs say why the interface does what it does: name the installer's behaviour, the protocol event
or the browser rule it relies on, so a reader can follow the builder to the installer and back. Aim for
clarity over brevity when the two conflict.

## Code style

The aim is code a reader understands quickly and correctly, with no loss of speed. Style rules serve that aim:
follow them by default, and know what each one is for, so the same intent guides the cases no rule covers.

- **One statement per line**, so every step is visible and no `return` or error path hides at the end of a
  line.
- **Descriptive names**, so a reader need not remember what `h`, `p` or `st` stand for.
- **Lines up to 120 columns.** A line should read at a glance, but a table row, a type's layout or a message
  often reads best whole. Wrap where the structure breaks naturally.
- **Named functions** for anything with a job of its own, rather than arrow functions assigned to constants:
  they show in stack traces and read as declarations. Arrow functions suit callbacks and one-line handlers.
- **Vue**: `<script setup lang="ts">`, type-based `defineProps` with destructured defaults, composables for
  logic, scoped styles over the `--rac-*` tokens only (no raw colours in components), `Rac` prefix in the
  library.

Depart from a rule where following it would make that code harder to read: an aligned table, a long message
kept whole so it can be searched for. Prefer restructuring to silencing a check, and give the reason next to
any `eslint-disable`. Tidy the code a change touches; leave the rest for its own change.

`pnpm check` runs the game-data check, ESLint, the type checks and the unit tests; CI runs them with the
workshop build, the builder's build, its end-to-end tests and the desktop shell. They are the floor, and
should rarely find anything.
