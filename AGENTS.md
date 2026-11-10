# D'thorga Companion contributor instructions

Standing rules for this repository, stated once in their current form. What each version delivered lives in `CHANGELOG.md`; the
design is `docs/design-record.md`. Created on 9 November 2026 at the owner's request, as a sibling of phobos-modkit. Its layout
and method follow Republic Observatory and OnAir WyrmGrid, without their code or identity.

## Working with the owner

- Author: Phobos A. D'thorga (phobosgekko). **Built for humans and dragons first**; agents keep the command line.
- Practical working slices over speculative frameworks. Explain what works, what was checked and what remains uncertain. Never
  invent hour estimates.
- **Nothing counts as tested on screen until the owner says so.** A build, a test or a browser audit is not that.
- **Never control the owner's mouse or keyboard.** Never edit, replace or delete saves.
- Every new behaviour says, in the design record, what it lets the person do, what it stops them doing and how it changes the
  way they work. Owner choices, agent defaults and agent choices are labelled as such.
- Write plainly: answer first, short sentences, **bold** for must-dos, tables for comparisons. Diagrams are Mermaid. Never use
  Figma.

## What the program may do

- **The host decides what may run, from the kit's manifest** (`src-tauri/src/reports.rs`), and checks again when asked to run it: the
  window can only request. Today that is reports marked `reads` with a `question` and nothing required. `reads-online` and typed inputs
  come next; anything else needs a design record and a confirmation step. **`owner-only` is never run**, and the program never holds
  credentials.
- **Read-only towards games, saves and repositories** in the first version.
- **The core never names a game.** A game reaches it only through the manifest's `game` field and the owner's own list,
  `.local/games.json`, which holds personal paths and is never committed.
- **Git is read with `--no-optional-locks` and `core.fsmonitor=false`**, through `src-tauri/src/git.rs`: reading takes no lock and
  starts no background watcher. A test that makes a repository sets `core.fsmonitor false` in it and removes it with read-only handling.
- **Tools run as processes through the pinned kit.** Fix a tool in phobos-modkit, then move the pin; never edit the submodule.

## How it is built

- **The window presents, the host decides.** Svelte components show what they are given. Only a `desktopClient.ts` may import
  `@tauri-apps/*`. Tauri commands stay thin.
- **Words live in `locales/en-AU.json`**, never in a component; a test holds every key to it. Fluent, with named variables.
- **Colours come from the theme file**, by role. A test holds them to the contrast rules. Colour never carries a meaning alone.
- **Controls are at least 44 px**, nothing needs a drag or appears only on hover, everything is reachable from the keyboard, and
  the type floor is 12 px.
- **Failures say what happened, what stayed safe and what to do**, then the technical detail folded away.
- **Charts come from the tools, drawn by one component.** The kit sends a chart block with roles, never colours;
  `src/lib/charts/CompanionChart.svelte` is the only component that draws, and `echartsCore.ts` the only module that imports
  ECharts, on demand. Every chart has a description read in place of the picture, its key in the page's own text, its values
  where a pointer isn't needed, and **Show the numbers** for the table. Motion stops for reduced motion; chart text is 13 px.
- **Quantities are preset buttons or the game's own kind of control**, not sliders.
- **Dark first.**
- **A new library has to earn it**: a real need now, less upkeep than a small local version, one place it can be replaced from,
  tests that fit, and safe behaviour when it fails. Record it in `THIRD_PARTY_NOTICES.md`.

## Names

**D'thorga is the brand**: names people see are `D'thorga <Plain Word>`. Every public page also carries the spelling "dthorga",
without the apostrophe, so a search spelled either way finds it.

## Checks

**Before every commit, run `python scripts/check-all.py` and chain the commit on its exit code**
(`python scripts/check-all.py && git commit ...`). It runs the steps in `config/gate.json` and prints only what failed. After
cloning, run `git submodule update --init` and `npm ci`; the browser check also needs `npx playwright install chromium`.

Build output stays out of the repository: `scripts/with-target.mjs` and the gate send it to `%LOCALAPPDATA%\phobos-modkit\target`.

## Git and versions

- **Public, MIT** (agent default, matching its siblings). Never change the repository's visibility.
- Commit and push directly to `main`; no pull requests unless the owner asks. Never force-push or rewrite history. Several
  sessions may share a tree: commit explicit paths and leave others' work alone.
- Versions: a fix raises the last number, new functionality the middle, an incompatible change the first. Every change updates
  `CHANGELOG.md` in the same commit. The version lives in `package.json` and `src-tauri/Cargo.toml`, and a test keeps them equal.
- Never commit credentials, personal paths, saves, logs or game files.
