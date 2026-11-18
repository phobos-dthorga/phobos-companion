# Shared code audit (19 Nov 2026)

**Status (19 Nov 2026):** an audit and a proposal, **nothing moved yet**. Written at the owner's request: "We should be using a
common library ... that contains all the shared code/functions/etc that is common to more than just one area of Companion ... I
call for an audit". Every proposal below waits for the owner's word.

## Read this first (gotchas)

- **Agreed: shared code should live once.** The audit found the same code written 3 to 17 times, and in two places the copies have
  already drifted apart (R4, W6). That drift is the real cost: a fix made in one copy and missed in the others.
- **Not a DLL, though** (agent's view, for the owner to overrule). The Companion has two halves, and neither suits a DLL:
  - **The host (Rust)** is built into one program. A DLL would add a second file to install and keep in step, for nothing a
    statically linked library does not already give. The Rust form of "a common library" is a **library crate**: its own folder,
    its own `Cargo.toml` and tests, compiled into the program. Proposed: `companion-core`, holding everything that does not need
    Tauri.
  - **The window (TypeScript and Svelte)** has no DLLs at all. Its shared library is a folder of modules and components:
    `src/lib/shell/` already plays that part and should grow.
- **The tools are already the shared library across games.** phobos-modkit is where code shared by every game and by the Companion
  lives. One finding (X1) is the Companion repeating something the kit already does.
- **Two copies of a check are sometimes on purpose.** The host checks a request, then the kit checks it again (defence in depth).
  Those stay doubled; only the host's own copies of its checks are merged.

## How the audit was done

Counts are from the source at commit 1c6d1e1 (Companion 0.15.1), by searching for each pattern: 2,044 lines of Rust in
`src-tauri/src`, and the Svelte and TypeScript under `src/`. Each finding names where the copies are.

## The host (Rust): proposed `companion-core` crate

| # | Found | Copies | Proposal |
| --- | --- | --- | --- |
| R1 | Every Tauri command wraps its work in the same `spawn_blocking(...).await.map_err(ToolFailed)` | 17, in `lib.rs` | One helper, `blocking(move \|\| ...)`; each command shrinks to its one line of delegation |
| R2 | Finding a game, its repositories, or one repository by name, from the owner's list | 7 ways, in `changes_page`, `history_page` (twice), `installs_page`, `settings_page`, `tests_page`, `home` | `games::find(id)`, `games::repository(game, name)` (refusing in words when it is not one of the game's), `games::all_repositories()` |
| R3 | A refusal built by a local closure, `\|detail\| Failure::new(FailureCode::Refused, detail)` | 7 | `Failure::refused(detail)` |
| R4 | Reading the kit's answer (did it succeed, and if not, why) | 4, **already different**: `changes_page` and `history_page` count an answer with no `ok` as a success, `installs_page` and `settings_page` as a failure | One `kit::Outcome::of(&answer)` with one rule, tested once |
| R5 | Checks on what the window asks for: a changelog's path, a commit, a moment, a plain name, a setting's key and value | 6 checks in 4 modules; `changes_page` already borrows `history_page::commit_hash` | One `checks` module, one test file |
| R6 | Building the kit's arguments, where text from the window must stay one argument (`--text=...`) so it is never read as an option | 7 modules, each remembering the rule by hand | An argument builder whose only way to add the window's text is the one-argument form, so the rule cannot be forgotten |

**What goes in the crate:** R2 to R6, with the games list (`games.rs`), the kit runner (`kit.rs`, without its Tauri `Channel` type),
`failure.rs`, `git.rs` and `process.rs`. **What stays in the program:** `lib.rs` (the Tauri commands) and each page's thin module.
The crate has no Tauri dependency, so its tests build without the windowing parts, and a second front end (a command line, or
another program for someone else) could use it whole.

## The window (Svelte and TypeScript): grow `src/lib/shell/`

| # | Found | Copies | Proposal |
| --- | --- | --- | --- |
| W1 | Asking the host for something: "not in the desktop program", try, and the failure | 16 functions in 8 `desktopClient.ts` files; 9 near-identical `...Reading` types | One `request<T>(command, args, onProgress)` and one `Reading<T>` type in the shell |
| W2 | The page heading: kicker, title, lead, and their styles | 8 pages and `App.svelte` copy the same `h1` and `.lead` styles | One `PageHeading.svelte`, and shared page styles (`.lead`, `.small`, `.how`) in `app.css` |
| W3 | Pressed-button choices ("Everything / What the repositories did", product choice, view modes) | 29 pressed buttons in 8 components; the `.choice` styles 3 times | One `ChoiceGroup.svelte` |
| W4 | The whole-window dialog: frame, backdrop, header with Close, opening on mount | `CodeViewer`, `AsItStood` | One `WindowDialog.svelte` that both use |
| W5 | Showing a changelog: version chip, entry lists, grouping by section, "Unreleased" in words | `ChangesPage`, `ModsPage`, `TimelinePage`, `AsItStood`; grouping by section written twice (`bySection`, `entrySections`) | A `src/lib/changelog/` module: `sections()`, `versionWords()`, `VersionChip.svelte`, `EntryList.svelte` |
| W6 | Dates and times | 4 formatters (`formatDate`, `formatDay`, `dayWords`, `timeWords`), with "en-AU" written in 4 places, **already formatting the same day 3 ways** | One `dates.ts`, taking its locale from the words' own locale |
| W7 | Loading with a progress bar: reading state, progress, `heard(...)` | 7 components | A small `loading()` helper; lowest value, last |

## Across the repositories

| # | Found | Proposal |
| --- | --- | --- |
| X1 | `changelog.rs` reads changelogs for the Home page with its own parser, beside the kit's (`changes list`), which already knows versions, drafts and unreleased entries | The Home page asks the kit, and `changelog.rs` goes. Follows the rule that the window shows what the tools say |

## What stays as it is

- Each page's own layout and styles, where only that page uses them.
- The host's checks *and* the kit's checks of the same request (on purpose).
- `ModsPage.svelte` (1,314 lines) gets smaller from W2 to W5, but splitting it further is a separate decision.

## Proposed order

1. **The host core** (R1 to R6), as the `companion-core` crate. The biggest gain: one rule for kit answers, one place for request
   checks.
2. **The window's shared pieces** (W1 to W6), page by page, each page's audit still passing.
3. **X1**, the Home page reading the kit.
4. **W7**, if it still earns it after the rest.

Each step is behaviour-preserving: the pages look and act the same, which the browser audits check. **Agent choices, for the owner
to overrule:** a crate rather than a DLL; the shell folder as the window's library; this order.
