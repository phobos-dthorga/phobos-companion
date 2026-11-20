# D'thorga Companion contributor instructions

Standing rules for this repository, stated once in their current form. What each version delivered lives in `CHANGELOG.md`; the
design is `docs/design-record.md`. Created on 9 November 2026 at the owner's request, as a sibling of phobos-modkit. Its layout
and method follow Republic Observatory and OnAir WyrmGrid, without their code or identity.

## Rules shared by every repository

**The owner's rules for every game, mod and tool repository live once, in phobos-modkit's `rules/` folder** (owner, 19 Nov 2026).
**Read `external/phobos-modkit/rules/every-session.md` at the start of every session**; `CLAUDE.md` imports it. (On GitHub that
folder is a pointer to the other repository:
[read the rules there](https://github.com/phobos-dthorga/phobos-modkit/blob/main/rules/every-session.md).) This file adds what is
particular to this program. A rule that would hold in another
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
- **Read the owner's screen notes at the start of every session** (owner's go-ahead, 19 Nov 2026: the "something's off" key,
  `docs/later.md` item 1): `python -m phobos_modkit screen-notes list`, run from `external/phobos-modkit/python`. Each is a page the
  owner flagged, with its picture (`picture.png` in the note's folder: read it), its address and their words. Raise them with the
  owner before other work, and when one is dealt with, `screen-notes resolve ID --how "what was done, and in which version"`.
  **Never delete a note.**
- **Put every choice you make for the owner to revise, and every question you need their word on, in `config/decisions.json`**
  (owner's go-ahead for the Decisions page, 19 Nov 2026; phobos-modkit's `docs/decisions.md`): a question, two or more options,
  your lean and why. Read the answers at the start of a session with `python -m phobos_modkit decisions list --root ../../..`
  (from `external/phobos-modkit/python`), **act on each answer and remove its decision from the file in the same commit.** Design
  records still label agent choices as now.
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
- **The Memory page starts a watch of the running game only on the owner's press and confirmation** (owner, 19 Nov 2026: memory
  profiling "will be done from the Companion"; `src-tauri/src/memory_page.rs`, design record "Memory"): the kit's watch, found by
  the manifest's `memory-watch` surface, attaches Microsoft's dotnet-counters to the game once unless the owner chose Windows' figures
  only, and runs only while the manifest calls it `runs`. **Never start one by itself** unless the owner chooses that on the
  Decisions page. Reading a watch only reads; stopping and marking write only into the watch's own folder in the kit's cache, while
  the manifest calls them `writes`. The host checks the length is one offered, every text is one line of a sane length and a
  watch's name has the kit's shape, and puts a mark's words after `--`.
- **The Changes page and the code viewer only read**: the kit's `changes`, through `src-tauri/src/changes_page.rs`, which checks
  the repository is one of the game's and the changelog a plain path inside it before the kit sees either.
- **The Timeline page only reads**: the kit's `history`, through `src-tauri/src/history_page.rs`, which checks the repository is one
  of the game's, the changelog a plain path inside it, and the commit or moment plain text of the right shape. The history log it
  shows is written by the tools as they work, never by this program.
- **The Settings page writes one file, the central settings file**, through the kit's `settings set`
  (`src-tauri/src/settings_page.rs`): only when the owner presses Save or Use the default, or chooses a path in Windows' own
  picker (0.29.0; owner, 20 Nov 2026: "file dialog window pickers ... where ever a directory needs to be chosen"; `src-tauri/src/
  pick.rs` only answers with the path, and the save is the same), only while the manifest still calls it `writes`, and only a
  setting the tools list, as one line. It never writes a repository's own settings. **Every folder or file a page asks for gets
  the picker beside its type-in box** (owner's choice: keep both). **It adds to the games list on one press too** (0.31.0, Add a
  game from Steam; `docs/later.md` item 5, the owner's yes of 19 Nov 2026): `companion_core::games::add` writes one new entry
  into `.local/games.json`, after the window showed it whole; the host checks the id, the name, the Steam game, the data folder
  and every repository again, keeps the list's own order, keeps the list as it was in `games.json.before-add`, and writes nothing
  when a check fails. It never changes or removes an entry already there.
- **Their code and What did an update change? read, except one press** (owner's choice of 19 Nov 2026, "Read and compare, on
  your press"; `src-tauri/src/other_code_page.rs`): the kit's reports carrying the manifest's `other-code` and `updates` surfaces.
  **Decompile runs only on the owner's press, only for an assembly the kit's `holder` named in this run of the program, and only
  while the manifest calls it `runs`**; it writes only into the kit's cache. Names go to the kit after `--`, checked to have the
  shape of a type or member name; a kept file is a plain `.dll` name. Other authors' code is shown, never copied into a repository.
- **Keep the new builds writes only into the tools' archive** (0.28.0, `other_code_page::keep_builds`): the kit's
  `rimworld-archive snapshot`, found by the `updates` surface, only on the owner's press and while the manifest calls it `writes`. It
  copies new builds of the game and tied mods into the archive, never touching the game's or the mods' folders.
- **Clean up deletes only what the owner chose and confirmed** (owner, 20 Nov 2026: "some kind of ongoing cleanup process", with
  their yes first; `src-tauri/src/cleanup_page.rs`): the kit's `cleanup`, listing by default; deleting runs only after the owner
  chooses the groups, presses Clean up the chosen and confirms, only the groups chosen (`--group`, each one argument), and only while
  the manifest calls it `writes`. The kit deletes nothing its listing did not name and never touches saves, game or mod folders or
  settings. **Never start a clean-up by itself**, and install backups start unchosen. Home's note only reads, at most every half hour.
- **The code viewer's How it connects and the Code map page only read**: the kit's `connections`, through
  `src-tauri/src/connections_page.rs`, which checks the repository is one of the game's, a thing's id has the tools' shape, a commit
  is a commit and a search is one line, before the kit sees any of them. Pictures are drawn by `src/lib/connections/`, with the
  geometry in `layout.ts`, tested without a screen.
- **The owner's keyboard shortcuts are kept in `shortcuts.json` in this program's own folder** (`src-tauri/src/shortcuts.rs`),
  written only from the Settings page's shortcuts dialog, whole and checked.
- **Otherwise read-only towards games, saves and repositories.** The only other things the program writes are the owner's test verdicts and, since
  0.9.0, their word on notes no row names ("make a row" or "no row needed"; owner, 18 Nov 2026, phobos-rimworld's seen-in-play checks),
  each appended to its own data folder (`test-verdicts/<repository>.jsonl` and `test-key-decisions/<repository>.jsonl`,
  `src-tauri/src/tests_page.rs`, owner, 17 Nov 2026); phobos-modkit's `test-pass` reads both and `apply` writes verdicts into a test
  list, never this program. **Screen notes** (0.22.0) are written whole into `screen-notes/<id>/` in its own data folder
  (`src-tauri/src/screen_notes.rs`): the page's picture and `note.json`; only the kit's `screen-notes resolve` writes beside them.
  **Back up now** (0.22.0, `src-tauri/src/records_backup.rs`) runs the kit's `records backup`, which copies this program's records
  into a new dated folder in the folder the owner chose (`recordsBackupPath`), on the owner's press and while the manifest
  calls it `writes`; it never deletes a copy. **It also runs by itself** (0.29.0; owner, 20 Nov 2026: "every few hours when it's
  open, and if the schedule is missed, the soonest next opportunity"): a timer in the host makes a copy when the kit's `records
  status --every-hours` says one is due, as `records backup --automatic`, under the same manifest check, and Home says when one
  failed and why. It is the one write this program makes without a press. **Decide** (0.22.0, `src-tauri/src/decisions_page.rs`) runs the kit's `decisions
  answer`, which appends the owner's answer to `decisions/<repository>.jsonl` in this program's folder. **The Game files page only
  reads** (the kit's `game-files report`, `src-tauri/src/game_files_page.rs`); Show in folder opens the file manager on a file
  inside a folder the last report named, and nothing else.
- **The core never names a game.** A game reaches it only through the manifest's `game` field and the owner's own list,
  `.local/games.json`, which holds personal paths and is never committed.
- **Git is read with `--no-optional-locks` and `core.fsmonitor=false`**, through `src-tauri/src/git.rs`: reading takes no lock and
  starts no background watcher. A test that makes a repository sets `core.fsmonitor false` in it and removes it with read-only handling.
- **Tools run as processes through the pinned kit.** Fix a tool in phobos-modkit, then move the pin; never edit the submodule.

## How it is built

- **The window presents, the host decides.** Svelte components show what they are given. Only a `desktopClient.ts` may import
  `@tauri-apps/*`. Tauri commands stay thin: one line of delegation each, through `blocking` in `src-tauri/src/lib.rs`.
- **Code more than one part uses lives once** (owner, 19 Nov 2026; `docs/shared-code-audit.md`). In the host, that is the
  `companion-core` crate (`src-tauri/core`), which holds no Tauri: the games list (`games::find`, `repositories_of`,
  `named_repository`), the kit (`kit::run_hearing`, `Outcome` for every answer, `allowed_by_manifest` before every change), failures
  (`Failure::refused`), request checks (`checks`) and arguments (`args::Args`, where the window's text is always `given`, one
  argument). A page's host module keeps only what is its own. In the window it is `src/lib/shell/` (`ask` and `BROWSER` for every
  request, the `Waiting` and `Pending` readings, `dates.ts` for every date, `WindowDialog.svelte` for a dialog over the window),
  `src/lib/changelog/` for showing a changelog, and `src/app.css` for a page's `h1`, `.lead`, `.how`, `.small` and pressed
  `.toggle` choices. Before writing a helper or a style, look there first.
- **Words live in `locales/en-AU.json`**, never in a component; a test holds every key to it. Fluent, with named variables.
- **Colours come from the theme in use**, by role, never a literal colour in a component. A test holds the program's own themes
  (`themes/*.json`) to the contrast rules. Colour never carries a meaning alone.
- **A theme is data, never CSS** (0.33.0; the owner, 20 Nov 2026: themes "as OnAir has them", after onair-wyrmgrid's ADR-0009): a
  version, an id, a name, an optional author and exactly the twenty roles as `#RRGGBB`, at most 32 KB. The host's
  `companion_core::themes` is the authority: it checks the shape and the contrast (words 4.5:1, chart colours 3:1, lines 1.5:1, on
  every surface) before a theme is kept or used, keeps the owner's themes and choice in the program's own folder, opens the Open
  and Save dialogs itself, and falls back to House D'thorga, saying why, when the chosen theme is missing or fails. The window sets
  only `--colour-<role>` from it. A new role is added to the format, every theme file, both checks and the maker in one change.
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
  speaks progress lines (phobos-modkit `docs/manifest.md`, Progress) before its page is built. **A read again that keeps the page on
  screen still shows a bar** (owner, 19 Nov 2026: a silent Read again "you ... think that the app ... is broken"), and its button
  says it is working until it is done.
- **Quantities are preset buttons or the game's own kind of control**, not sliders.
- **Every move goes through the window's trail** (owner, 19 Nov 2026: `docs/cross-links.md`, N1 to N3): a link calls `go` or
  `openDialog` (`src/lib/navigation/navigation.svelte.ts`), a choice on a page calls `setFocus` and reads it back from `here()`, and
  the code viewer and the changelog as it stood are drawn by the App from the trail, never by a page. A new page lists the focus keys
  it reads in `docs/cross-links.md`, and a new kind of thing joins Go to anything (`src/lib/navigation/goto.ts`).
- **The Guide is kept with the program** (0.34.0; the owner, 20 Nov 2026: "documentation, or an encyclopedia, into the
  Companion, so I know what to do or how to find something"). **A change that adds or alters a page, a panel or a button updates
  its entries in `guide/` in the same commit**: the page's entry, any How do I…? answer whose steps it changes, and a word it
  introduces. Each entry is a small file (`docs/guide-entries.md` gives the format); write it as the player guides are written:
  answer first, numbered steps, **bold** for what to press, the key beside it, and the button's words exactly as the page shows
  them. `src/lib/guide/entries.test.ts` refuses a page with no entry, a link or See also to no entry, a Take me there a page cannot
  show, and an entry nothing links to.
- **A page's common moves have keyboard shortcuts** (owner, 19 Nov 2026): one key each, never two held together, listed once in
  `src/lib/shortcuts/actions.ts` with its default, and offered by the view while it is on screen (`register` in
  `src/lib/shortcuts/registry.ts`). They never act in a text box or a part that takes keys itself, and every one can be changed or
  turned off in Settings. A new page adds its moves there in the same change.
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
