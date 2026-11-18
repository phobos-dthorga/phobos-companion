# D'thorga Companion changelog

Maintained from 9 November 2026.

## [Unreleased]

## [0.13.0] - 2026-11-19

The owner's look at 0.12.0 (19 November 2026): "I absolutely love how the code is tracked to every particular item in question", a request to tidy the busiest areas, and "It seems to see changes in DLLs, across the board, where there might not be any". Not yet tested on screen.

### Changed

- One Show the code for all the entries one commit wrote, instead of a button under every entry. On the Changes page a version written in one commit has one button beside its heading; a version written over several commits says so and shows each group with its own button. On the Mods page each group of entries from one commit shares a button.
- Changelog entries show their own bold and code marks as such: no stray asterisks, and no space before a comma after a bold opening. The same on the Mods page, the Changes page, the save notes and the code viewer's heading.
- A mod's Installed now and After installing columns sit at the top instead of stretching to the taller one, and the after column takes more of the width.
- The code viewer's file list is more compact: each file's name and what happened to it on one line, its folder and line counts under it.

### Fixed

- A mod whose changelog matched but whose files differed read as Up to date. It now reads Files differ, naming the sources that changed since it was installed, or Only rebuilt when its code files were only built again from unchanged code.
- Every mod's code file read as changed after almost any commit. The cause was in how the mods are built, not here: .NET stamped the git commit into every assembly, so phobos-rimworld now builds without it, and the tools tell a rebuild from a change (phobos-modkit 1.26.0 to 1.28.0).
- A line many versions repeat word for word, such as "Not yet tested in game.", was put in a group of its own, because it was given the commit that first ever wrote it. Each entry's commit now comes from where it stands.

### Compatibility and limits

- The pinned phobos-modkit moves from 1.25.0 to 1.28.0.
- Mods installed before phobos-rimworld's build change carry the old stamp, so each reads Files differ (naming Directory.Build.props) until it is next installed.

## [0.12.0] - 2026-11-19

Progress bars, a code viewer, and a direction: the owner asked (19 November 2026) for progress bars with status updates wherever they fit, a code viewer "that helps show off all the new and shiny code associated with any particular CHANGELOG item", and for all further work to treat this as a multi-game, multi-framework viewer, mainly for them and maybe for others. Not yet tested on screen.

### Added

- A Changes page, for any game: each repository's changelogs by product, the newest five versions of each with their entries by section, and Show the code beside every entry.
- The code viewer. It opens over the window with the entry at the top, the commit that wrote it, and the files that commit changed, code first, then data and definitions, words and other files. One file shows at a time with line numbers and a plus or minus mark beside each changed line, coloured by what each piece of code is (C#, XML, Lua, Python, Rust, TypeScript, JSON and more). What changed and The code as it now stands switch between the change and the result. It opens the code itself before its tests.
- When one commit wrote several entries, the viewer says so and lists the others: git cannot say which lines belong to which entry. An entry in no commit yet shows the uncommitted changes. A picture or other file that isn't text says so.
- Show the code beside every changelog entry on the Mods page, in both columns and under each backup.
- Progress bars: reading the Mods page (each mod named as it is compared), the texture check (counting mods), Build (each project of the count), Install and Install everything that changed (projects, then each mod, then its textures), encoding, backups and going back, the Atlas and every report that reads a save (finding it, reading it, working out the answer), the Changes page and the code viewer. Each bar says what is being done, counts where the work can be counted, moves where it cannot, and shows the work's latest line of output beneath.

### Changed

- The pinned phobos-modkit moves from 1.21.0 to 1.24.1: progress lines, the changes tool, and each mod's changelog path.
- The first new library since the atlas: highlight.js 11.11.1, loaded only when code is first shown, one language at a time.

### Compatibility and limits

- Checked on more than one game: the tool behind the Changes page read the changelogs of RimWorld, Ostranauts, Project Zomboid and Kenshi repositories, and the Companion's own. The Farming Simulator 25 repositories keep no CHANGELOG.md, so their page says there is nothing to list.
- A changelog needs nothing new written in it. The view is as sharp as the commit is small.
- A file's change is cut at 600 lines and says so.

## [0.11.0] - 2026-11-18

The Mods page's second round, from the owner's four asks after seeing the first (18 November 2026): compile as needed, refresh after, see before and after ahead of a compile, and know whether textures need encoding before the next launch, since "it's always a wild guess currently". Their picks: check and fix textures, a Build button and Install everything that changed, all four before-and-after extras, and a Before you play strip. Not yet tested on screen.

### Added

- Before you play, at the top of the Mods page: Ready to play, or the things to do first, each with its button. Mods needing a build (Build now, fine while the game runs), mods with changes not installed (Install everything that changed, one run and one restart), and mods whose textures would show old pictures or were never encoded (Encode their textures). It says when the game is running and which buttons wait for it.
- Every active mod's textures are checked, ours and other authors': a stale encoded texture makes the game show a mod's old picture, because the game uses the encoded file whatever the dates. Encode their textures writes them with RimSort's own settings, Workshop mods included, after asking, with the game closed. A list under the mods names each mod and how many pictures need it.
- Each mod that would change shows Installed now beside After installing: the versions, where the install came from, the changelog entries lost and gained, the files that would change (Show the files), settings an install would add, remove or give a new default (by the names the settings window uses), and things to look out for in play from the test list. Needs a build is marked on the card and in its column. Files that differ while the changelog lists nothing new are pointed out.
- A Build button beside Read again; the page reads again after every build, install and encode.

### Changed

- The pinned phobos-modkit moves from 1.20.0 to 1.21.0, with its texture check and the further installs comparisons.
- A mod with nothing to install says so in one line instead of listing versions.
- Backups show the newest two; Show all lists the rest.
- The side panel's Where this comes from now says what the Mods page reads and changes, instead of saying the program only reads.

## [0.10.0] - 2026-11-18

The Mods page, asked for by the owner (18 November 2026): a part "dedicated to the updating, reversing changes, making backups, etc. all with regard to our mods", starting with seeing the changelogs "track and update to what I'm either benefitting from or losing as certain changes are made". Not yet tested on screen.

### Added

- A Mods page. For each mod of every repository with config/installs.json: the installed version, where and when it was installed (once the repository's install writes a record), the repository's version and any uncommitted changes, and what installing from the repository would give you and take away, entry by entry, grouped by version, with the changelog's save notes first.
- Backups for each mod, newest first, each saying what going back to it would take away and give, and how many of those entries are about saves; What going back changes lists them.
- Three buttons, each asking first in words: Install from the repository (builds and installs; the installed copy becomes a backup), Back up the installed copy, and Go back to this (the replaced install becomes a backup, and the backup stays). Going back and installing wait until the game is closed, and say so on the button; a backup can be made while it runs. What a move did, or why it was refused, is said at the top, with an install's last lines folded away.
- The page reads again when the window comes back into focus, so a change made elsewhere shows up without pressing anything; Read again does it at once.

### Changed

- The pinned phobos-modkit moves from 1.19.1 to 1.20.0, whose installs tool the page runs.
- The page buttons wrap onto a second line in a narrow window.
- The status bar and README say what the program changes, and only when asked: your test verdicts, and your installed mods from the Mods page.

## [0.9.0] - 2026-11-18

The Tests page shows when the game's notes are weaker than they look, as phobos-rimworld's seen-in-play checks asked (owner, 18 November 2026: "write up the design record, please, and then get it built"). Not yet tested on screen.

### Added

- A shelf, To look into: rows whose notes came but don't count yet, because their figures are off, they came out of order, or they're from before the row last changed. Each row card says which, with the figures seen and the figures expected.
- A row in parts says which parts were seen and which are still to see, and every row says what kinds of thing its notes came from.
- A shelf, Notes with no row: each note the game wrote that no test row asks for, with two buttons, Make a row and No row needed, and Take it back once decided. The word is kept beside the verdicts, in this program's own folder.

### Changed

- The pinned phobos-modkit moves from 1.9.0 to 1.19.1, whose test-pass judges the evidence and reads the decisions.

## [0.8.0] - 2026-11-17

An installer: the owner had trouble finding the program each time they wanted to open it, and asked for an NSIS setup (17 November 2026). Not yet tested on screen.

### Added

- A Windows installer. npm run installer builds a setup program; running it puts D’thorga Companion in the Start menu and, if you leave the box ticked, on the desktop. It installs for you alone, needs no administrator, and removes itself through Windows' Installed apps.

### Changed

- The program's name in Windows is written with a curly apostrophe (D’thorga Companion), because the installer's script cannot hold a straight one. The window's own title is unchanged.

### Compatibility and limits

- The installed program still finds its tools and your games list in the folder it was built from: keep the repository where it is, and build the installer on the PC that runs it. Your test verdicts stay where they were.

## [0.7.0] - 2026-11-17

The Tests page: the owner sees in-game tests pass but the news rarely reaches the test list, and asked for the checklist to live here (phobos-rimworld, 17 November 2026). Not yet tested on screen.

### Added

- A Tests page: every repository of the game that keeps a test list (config/test-evidence.json), its rows on four shelves (seen working, waiting, your verdicts, done), what to do and what passes for each, and when the game last saw a row working and on what.
- Passed and Failed buttons on every row, an optional note, and Take it back. A verdict is one line appended to this program's own data folder (test-verdicts/<repository>.jsonl); phobos-modkit's test-pass apply writes it into the test list later. Only your verdict passes a row: the game's notes only say a feature ran without an error.

### Changed

- The program now writes one thing, your test verdicts, in its own folder; it still changes no game, save or repository. The status line says so.
- phobos-modkit moves to 1.9.0 for its test-pass tool.

## [0.6.0] - 2026-11-10

The atlas: the owner asked for it, chose a hex globe over a flat map, and asked for every layer in the first version (10 November 2026). Not yet tested on screen.

### Added

- An Atlas page: your newest save's whole world as a globe you can turn and zoom, drawn hex by hex as the game draws its world map, sharp at any distance and at the poles.
- Six views (biome, elevation, temperature, rainfall, hills, swampiness), with pollution over any of them in the game's four bands, and rivers, roads, places, region names and tile edges each shown or hidden with one button.
- Click a tile, or turn the globe so it sits in the middle and press Enter, to see what is there: where it is in the game's own latitude and longitude, its biome, climate, terrain, pollution, region, landscape features, roads and rivers, and any settlement or site on it.
- Every place in a list, grouped as your own, allies, neutral and hostile, with a search box; each one flies the globe to it. A button goes straight to your colony.
- Everything works from buttons and the keyboard: arrows turn the globe, + and - zoom. Dragging and the scroll wheel are shortcuts, never the only way. Motion stops when Windows is set to reduce it.
- When this PC cannot draw the globe, the page says so and the atlas's tables still list everything.

### Changed

- Uses phobos-modkit 1.7.0, which also fixes how roads and rivers are read from a save.

### Dependencies

- three.js 0.186.1 (MIT) draws the globe. It loads only when the atlas opens.

## [0.5.0] - 2026-11-10

The owner said yes to naming every thought, to suggested fixes and to colonists, slaves and prisoners together (10 November 2026). Not yet tested on screen.

### Added

- The colony mood report starts with Where to start: the costliest causes you can do something about, each with a suggestion marked as advice.
- With D'thorga Framework 0.64.0's colony mood file, the report names every thought as the game counted it at that save, bedrooms, cold and beliefs included, and each colonist's own break thresholds.

### Changed

- Uses phobos-modkit 1.6.0.

## [0.4.0] - 2026-11-10

Charts, and a colony mood report: the owner asked to see where their colony is lacking mood-wise, and for pretty graphs (10 November 2026). Not yet tested on screen.

### Added

- Charts in reports: bars with each value written at its end, dashed lines for thresholds, and a key in plain text under the chart. Show the numbers opens the same figures as a table you can sort, so nothing needs hovering.
- A new RimWorld report, Where is my colony's mood suffering?: who is closest to breaking, the remembered events that cost and cheer the colony most, needs running low, and addictions and drug needs.
- Charts stop moving when Windows is set to reduce motion. When a chart can't be drawn, its numbers show instead.

### Changed

- Uses phobos-modkit 1.5.1. Its reports can now carry charts, and it finds the patched-Defs file D'thorga Framework writes by itself.

## [0.3.0] - 2026-11-09

The tools' reports in the window, chosen by the question they answer, with nothing to type (owner, 9 November 2026). Not yet tested on screen.

### Added

- A Reports page, listing for the chosen game the reports that only read and need nothing typed, 19 of them for RimWorld, each named as a question.
- Reports show their words, lists, tables and text in the window, and a report that fails says what happened and offers another go.
- Click a table heading to sort it: numbers as numbers, words A to Z, and click again to reverse.
- Show more brings in the rows a long table left out.
- Copy as command puts the report's command on the clipboard, to paste into a console or a session.

### Changed

- Uses phobos-modkit 1.1.0.

## [0.2.0] - 2026-11-09

Where each game was left, so changing games doesn't lose the thread (owner, 9 November 2026). Not yet tested on screen.

### Added

- The home page answers "where was I?" for every game on your list, most recently worked on first.
- For each game: when you last worked on it, the last thing you did, files left uncommitted, the latest work across its repositories, what isn't released yet, and open work where a repository keeps a list.
- A repository that can't be read is named with what to do about it, and the rest of the page still shows.
- Look again reads everything afresh and says when it did.
- Your list of games lives in .local/games.json, and config/games.example.json shows the shape.

## [0.1.0] - 2026-11-09

The frame for one desktop program over every game's tools (owner, 9 November 2026). Not yet tested on screen.

### Added

- A dark window with five bands: command bar, observation bar, navigator, canvas and inspector, with a status bar.
- The House D'thorga theme, held to contrast rules by a test.
- The window reads the pinned phobos-modkit 1.0.0's manifest and says how many tools it found, or what went wrong and what to do.
- Words in one catalogue, with a test that every key exists and is used.
- One command for every check: python scripts/check-all.py.
