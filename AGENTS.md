# D'thorga Companion contributor instructions

Standing rules for this repository, stated once in their current form. What each version delivered lives in `CHANGELOG.md`; the
design is `docs/design-record.md`. Created on 9 November 2026 at the owner's request, as a sibling of phobos-modkit. Its layout
and method follow Republic Observatory and OnAir WyrmGrid, without their code or identity.

## Rules shared by every repository

**The owner's rules for every game, mod and tool repository live once, in phobos-modkit's `rules/` folder** (owner, 19 Nov 2026).
**Read [`external/phobos-modkit/rules/every-session.md`](external/phobos-modkit/rules/every-session.md) at the start of every
session**; `CLAUDE.md` imports it. This file adds what is particular to this program. A rule that would hold in another
repository too goes there, on the owner's word (`external/phobos-modkit/rules/README.md` says how), and a rule here that the
shared rules now state is dropped in the commit that moves the pin. The gate's "shared rules" step checks this repository still
reads them.

## Working with the owner

- Author: Phobos A. D'thorga (phobosgekko). **Built for humans and dragons first**; agents keep the command line.
- **It is a viewer for every game and every framework the owner mods, mainly for the owner and maybe for others too** (owner, 19 Nov
  2026: "any further work designed, changed, or removed with the Companion should be done around the fact that this is going to
  be a multi-game, multi-framework, viewer"). Before designing, changing or removing anything, ask what it does for a game other
  than the one in hand, and for a person who is not the owner:
  - **Build the general thing first.** A page reads what every repository has (a changelog, git history, a config file it opts in
    with), and a game's own knowledge reaches it through the kit's manifest and adapters. A feature that can only ever serve one
    game says so in the design record, with the reason.
  - **Check it on more than one game** before calling it done: run the kit tool behind it on at least two games' repositories and
    say which in the changelog. A game that cannot use it yet is told so on the page in words, never shown a blank.
  - **Nothing personal is built in.** No path, game name, repository name or account of the owner's in code, words or tests;
    they come from `.local/games.json` and the kit's settings. Words name "your mods" and "the repository", not one game's terms.
  - **Removing is a change for every game.** Before taking a page or a field away, say which games lose it.
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
- **The Mods page is the one place the program changes a game's files** (owner, 18 Nov 2026: a part "dedicated to the updating,
  reversing changes, making backups"): the kit's `installs build`, `install`, `backup` and `restore`, for a repository with
  `config/installs.json`, and the game's texture command's `encode` (found through the manifest's `textures` surface, never by
  name; it writes encoded textures into mod folders, Workshop ones included, by the owner's choice of 18 Nov 2026). Each only when
  the owner presses a button and, except Build (which writes only inside the repository), confirms; and only while the kit's
  manifest still calls it `writes` or `runs` (`src-tauri/src/installs_page.rs`). The host checks the repository, the move and every
  name; the kit refuses installing, going back and encoding while the game runs, and never deletes: the install it replaces becomes
  a backup.
- **The Changes page and the code viewer only read**: the kit's `changes`, through `src-tauri/src/changes_page.rs`, which checks
  the repository is one of the game's and the changelog a plain path inside it before the kit sees either.
- **Otherwise read-only towards games, saves and repositories.** The only other things the program writes are the owner's test verdicts and, since
  0.9.0, their word on notes no row names ("make a row" or "no row needed"; owner, 18 Nov 2026, phobos-rimworld's seen-in-play checks),
  each appended to its own data folder (`test-verdicts/<repository>.jsonl` and `test-key-decisions/<repository>.jsonl`,
  `src-tauri/src/tests_page.rs`, owner, 17 Nov 2026); phobos-modkit's `test-pass` reads both and `apply` writes verdicts into a test
  list, never this program.
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
- **The globe comes from the tools, drawn by one module.** The kit sends a globe block (phobos-modkit `docs/manifest.md`);
  `src/lib/atlas/globeScene.ts` is the only module that imports three.js, on demand, and `planet.ts` holds the arithmetic,
  tested without a screen. Every move has a button and a key; dragging and the wheel are shortcuts. Colours for a measure
  come from `colours.ts`'s ramps, chosen by the dataviz rules; a category layer brings the kit's own colours.
- **Code is coloured by one module, from the theme.** `src/lib/code/highlightCore.ts` is the only module that imports highlight.js,
  on demand, a grammar at a time; the kit names what a file is and never a colour. Token colours are the theme's roles, set in
  `CodeViewer.svelte`; the "something went wrong" colour is never used for code. A changed line carries a `+` or `−` mark beside it.
  Code reaches the page escaped (by the highlighter, or by `hunkHtml`): never put file text into `{@html}` any other way.
- **Work that takes time shows a bar and says what it is doing** (owner, 19 Nov 2026). Every request that runs a tool gives the host
  a progress channel (`progressChannel` in `src/lib/shell/desktopClient.ts`); the host passes on the tool's progress lines
  (`kit::run_hearing`), and `ProgressBar.svelte` is the one component that draws them: filled when the tool can count its steps,
  moving when it cannot, always with words, and its latest line of output beneath. A new tool that can take more than a moment
  speaks progress lines (phobos-modkit `docs/manifest.md`, Progress) before its page is built.
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
- **Build the installer for the owner after every new version** (owner, 18 Nov 2026: "build it ahead of time for me"): once the
  version is committed, run `npm run installer` and tell the owner the setup file's full path
  (`%LOCALAPPDATA%\phobos-modkit\target\release\bundle\nsis\D’thorga Companion_<version>_x64-setup.exe`), so all they do is run
  it. Run `npm ci` first only when `package-lock.json` changed. **VS Code's Svelte language server holds `node_modules` files open**
  (its esbuild helper and rollup's native module), so `npm ci` fails with EPERM while it runs, after deleting most of
  `node_modules`: stop only that server first (a `Code.exe` whose command line names `svelte-language-server`, never a filter that
  matches the stopping command itself), then run `npm ci` at once; it restarts itself when a `.svelte` file is next opened.
- Never commit credentials, personal paths, saves, logs or game files.
