# Working in rac-editions-web

- **No game data**, ever: see README. `node scripts/check-game-data.ts` must pass.
- **The boundary with rac-editions.** rac-editions holds the edition logic and the installer; this
  repository holds the interface to it: the site, the builder and their components. The builder runs the
  installer as a separate program over the protocol in rac-editions' `installer/README.md`, and reads the
  editions' data (`edition.json`), never their internals; protocol changes are agreed in rac-editions
  first. Keep that split because it keeps each side simple, not as a wall: where the cleanest answer is
  to reuse something rac-editions already has (a schema, a small utility), reuse it.
- **Licences.** This repository is MIT; rac-editions, OpenRAC and wrench are GPL-3.0. Code this repository's
  author wrote for those repositories (including code written there with Claude) may come in under MIT;
  say where it came from in the commit message. Code by other authors under the GPL may not, nor may anything
  whose licence forbids redistribution.
- **Effects are our own code.** Their look learns from Vue Bits (vue-bits.dev), but no Vue Bits code is
  copied or ported here: its MIT + Commons Clause licence forbids redistributing its components, ported
  versions included.
- **One version of each dependency**: add it to the catalog in `pnpm-workspace.yaml` and ask for
  `catalog:`. Pin exact versions.
- **Vue**: `<script setup lang="ts">`, type-based `defineProps` with destructured defaults, composables for
  logic, scoped styles over the `--rac-*` tokens only (no raw colours in components), `Rac` prefix in the
  library.
- **Accessibility**: every text pair meets WCAG 2.2 AA (`tests/tokens.test.ts`); every control works by
  keyboard with the holo focus ring; reduced motion stills every effect.
- **Writing**: describe the product's state plainly, in docs, comments and commit messages. Commit bodies
  say the problem, then the change, with the detail that explains why.
