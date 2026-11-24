---
title: Make a repository ready for the Companion
kind: task
words: ready, set up, repository, changelog, config, opt in, empty, nothing to show, test list, installs
go: settings?panel=repositories
see: task-set-up, term-repository, term-changelog-entry, task-add-game
---
**Most pages need only what a mod repository has anyway: git and a changelog.** A few read a small file the repository keeps to opt in. A page with nothing to read says so, with a button to this entry.

### Home, Changes, Timeline and the code viewer
- **git history**: the repository is a folder kept with git.
- **A `CHANGELOG.md`** for each mod, up to three folders deep. Each version is a heading such as `## [1.2.0] - 2026-11-20`, with sections such as `### Added` and `### Fixed`, and one entry per line starting `- `. Work not released yet goes under `## [Unreleased]`.
- **Commit a change with its changelog entry**, in one commit: that is how the code viewer finds the code behind an entry.

### Home's open work (optional)
- A table in `docs/development/outstanding-work.md` with an **Item** column and a **Status** column. Rows whose status is open, in progress, waiting or blocked are listed.

### Tests (optional)
- `config/test-evidence.json`, naming the repository's test list (a Markdown table of [test rows](term-test-row)) in its `doc` field. Your mods can then note when a feature is [seen working](term-seen-working).

### Mods: install, back up, go back (optional)
- `config/installs.json`, saying where the repository's mods are (`mods`), where backups go (`backups`) and the command that installs one (`install`). The tool kit must also know the game: RimWorld today.

### Settings (optional)
- `config/settings.json`, listing the folders the repository's own scripts read, so you can set them here.

### For AI agent sessions (optional)
- `config/decisions.json`, the questions sessions leave you, for the [Decisions page](page-decisions).

Then add the repository to its game: **Settings** (the **9** key), on the **Games** tab.

### Let the Companion start them
**Settings → Setup**, under **Your repositories**, lists each repository on your games list, whether it is kept with git, and which
of these files it has: a changelog, the open-work list and, while the features for AI agent sessions show, the decisions file.

1. Press **Add starter files…** beside a repository.
2. **Each file is shown whole.** Tick the ones you want: a changelog is ticked when it has none.
3. Press **Write the ticked files**. Each is written only where nothing is there, never over a file.
4. **The Companion commits nothing**: commit them with git when you're ready.

Nothing else is asked of a repository, and **the Companion never writes into one**, except where a page says so and you press a button.
