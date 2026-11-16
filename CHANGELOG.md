# D'thorga Companion changelog

Maintained from 9 November 2026.

## [Unreleased]

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
