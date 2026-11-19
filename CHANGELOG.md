# D'thorga Companion changelog

Maintained from 9 November 2026.

## [Unreleased]

## [0.22.0] - 2026-11-19

The owner said yes (19 November 2026) to four new tools for working with agent sessions and to the game-files work; each is its own commit under this version, and anything not yet built is kept in docs/later.md. Not yet tested on screen.

### Added

- **Something's off** (the ! key, or the button beside Save a picture): when a page looks wrong, press it. It draws the page as it is, then asks what looks wrong (the words are optional; Ctrl+Enter saves). The picture, the page's address and your words are kept in the Companion's own folder, and the next agent session reads every open note when it starts, then says what it did. **Home lists the notes still waiting**, with Show the picture and Go to the page, and the newest ones dealt with, saying how.

- **Back up your records**, on the Settings page: your test verdicts, the history log, the settings you have looked at, screen notes, keyboard shortcuts and the central settings file live in this computer's local app data, which the NAS does not back up. Choose a folder it does keep (the new setting Where copies of the Companion's own records go), then **Back up now** copies them into a new dated folder there. Old copies are never deleted. **Home says when they have never been copied, or the newest copy is a week old or more**, with a button leading to the backup.

### Dependencies

- Tool kit 1.44.0, now pinned (1.41.0 brought screen-notes, which agent sessions use to read and resolve the notes; 1.43.0 the records backup and its setting).

## [0.21.0] - 2026-11-19

The owner asked (19 November 2026) for new mod settings to be tracked alongside the timeline, for paging further back, for repeated backups to be removable, for livelier progress, and for pictures of pages to share with friends; each is its own commit under this version. Not yet tested on screen.

### Added

- **Save a picture** (the button beside Copy address, or the P key): the whole page, the parts scrolled out of view included and wide tables opened out, drawn into a PNG, saved into a D'thorga Companion folder in your Pictures and copied, ready to paste into a message for friends. A note says where it went, with Show it in its folder. Only the page is drawn, never the bars around it. The Atlas's globe now keeps its last frame so it can appear in a picture.
- **Progress you can follow** (the owner's pick of all six ideas from the mock-up page):
  - **A trail of steps** above every progress bar: the steps already done, ticked, and the one underway glowing. Items of one count (comparing each mod in turn) stay one step.
  - **A sense of time**: a bar for work that cannot be counted fills against how long the same work took last time and says about how long is left, instead of only sliding.
  - **One activity strip under the page bar** for anything the window is waiting on, whatever page asked: what is being done, how many jobs, a thin bar and the seconds so far. When it ends it says how long it took, then clears itself. Quick work never shows.
  - **The page's shape while it loads**: soft blocks where the pictures and lists will be on Make-up, the Timeline, Changes, Logs and the Mods page, so nothing jumps when they arrive.
  - **Parts that arrive one by one** on Make-up: "3 of 5 parts ready", each part settling in as it comes.
  - **Figures that count up**: Make-up's totals of files and lines.
  - All of it stands still for anyone who asks their system for reduced motion.
- **Repeated backups can be removed**: on the Mods page, a backup that repeats the one before it says so (the same file for file, or only rebuilt from source code that had not changed), and **Remove repeated backups** under a repository's backups removes them all after asking, keeping the oldest of each run so going back loses nothing. Each is compared again just before it goes. It may run while the game is open, since it touches only the backups folder. On the owner's backups this found 37 of 99 (about 1 GB); the rest really differ, because the mod's code changed between them. The first read after this compares every backup once (about a minute), then only new ones.
- **Settings to look at**, on the Mods page under Before you play: every setting your mods ever added, removed or gave a new default, newest first, with its label in the settings window where known, its default and the change that made it. **Looked at** takes one off the list (it can be put back), and **Mark all as looked at** clears it, so from then on only new ones appear. Home says how many are new and leads there. **The same changes are on the Timeline**, one row a commit on each mod's lane. The marks are kept in the Companion's own folder. Needs phobos-rimworld's settings history (mod-settings.py history, cached per commit: about three minutes the first time, seconds after).
- **Paging further back**, the same Newer, Older, Newest and Oldest buttons everywhere a list was cut short. Changes now reaches every version of a changelog, six a page, and a page turn is a step Back returns from. The Timeline pages its days ten at a time (it used to add ten more), Logs its kinds of message twenty at a time (up to 500, where it used to stop at 60), a thing's history ten commits at a time (up to 200, where it stopped at 25), the Tests page 25 rows at a time, and a mod's backups eight at a time once you show them all. A link to a day, a message, a row or a backup turns to its page.

### Dependencies

- Tool kit 1.40.0, now pinned.

## [0.20.0] - 2026-11-19

The owner asked (19 November 2026) to show "how the contents of our mods, code, etc. is consisted of in a graphical manner", choosing all six views, lines as the first measure, and a new page with the code parts on the Code map. Not yet tested on screen.

### Added

- **A Make-up page** (the M key, or its button at the end of the bar), for any game's repositories. Measure everything in lines, size on disk or files:
  - **What it's made of**: blocks for each mod or part, then its folders, then its files, coloured by kind (code, tests, data and Defs, words and docs, pictures, sounds, build files, other) or by how often each changed in the last 30 days. Press a block to look inside. Show the biggest files lists them with their changes.
  - **Each part's mix**: one bar a mod or part, split by kind.
  - **How it grew**: one stacked band a kind, day by day since the first commit.
  - **Tested in game**: each mod's test rows passed, seen working and awaiting your word, waiting, or failed.
  - **What players get**: each mod's Defs by type, pictures, sounds and text keys.
  - Every picture has its numbers a press away, and its colours are one fixed colour a kind, checked for colour-blind readers.
- **Busiest code on the Code map**, before you search: the code files changed most often in the last 30 days. Press one to put what it holds in the middle.

### Dependencies

- Tool kit 1.39.0 (makeup), now pinned.

## [0.19.0] - 2026-11-19

The owner asked for the whole proposed order of docs/cross-links.md to be built overnight (19 November 2026): "Proceed with your entire proposed order, step-wise if necessary". Each step is its own commit under this version. Not yet tested on screen.

### Added

- **Back and Forward** across pages, games, choices and dialogs: buttons under the page bar, the , and . keys (one key each, changeable in Settings), and the mouse's side buttons. Closing a dialog is a step back, so Forward opens it again. A link to a dialog on another page arrives in two steps, so Back closes the dialog and leaves you on its page.
- **Go to anything** (the / key, or its button): one search over pages, methods, classes and Defs, changelog versions and entries, test rows, versions on the timeline, settings and reports, for the game shown. Enter opens the first result. Code is searched as you type, in every repository of the game.
- **Addresses**: Copy address puts where you are on the clipboard (dthorga://page/game?...), including the chosen changelog, method, test row, setting or report and any open code or as-it-stood dialog; pasted into Go to anything, it opens the same place. The code viewer and the changelog as it stood have their own Copy address.
- **What was I running then?** on every Timeline day: each mod's version installed at the end of that day, from this PC's history log (each mod's last install or go-back up to then), with Read it as it stood for each. Installs before the record began (19 November 2026), or made by hand, are not known.
- **The history of any method, class, Def or function**, under its connections picture (on the Code map and in the code viewer's How it connects): Show its history lists every commit that changed its lines, newest first, with the changelog entries each wrote. Press an entry, or a commit that wrote none, to see that commit's code; Back returns. It reads only when asked, since following a thing's lines back takes a moment. Needs tool kit 1.34.0, now pinned.
- **A Logs page** (the G key, or its button at the end of the bar): the game's last run as the tools group it, most serious first, with what is new since the run before, the mods each message points at, and its stack. **Find in the code** beside a step of the stack opens that method on the Code map; its history there leads to the change that touched it, and **backups from before this** on a change opens the Mods page at that mod's newest backup from before it, marked, ready to go back to. RimWorld's tools read its log today; a game whose tools cannot yet is told so. Needs tool kit 1.35.0, now pinned.
- **Test rows joined to code and changes.** On the Tests page, each row names the code that notes it (the method that writes its seen-in-play note), a press from the Code map. Under a connections picture, **In-game tests watching** lists the rows a method notes, or a type's methods note, each opening on the Tests page. On the Changes page, each version names the in-game tests still waiting on it. A linked row opens on its own shelf. Needs tool kit 1.36.0, now pinned.
- **Patch badges on the Code map**: under a connections picture, each method the thing patches (or that it is) says how many other active mods patch the same method, how many of their patches may skip the original, and what the last update of that method's mod or the game changed in it. In the picture, a red dotted ring marks a method three or more other mods patch, or one the last update changed, and our patches on it. RimWorld's tools can say today; other games show nothing extra. Needs tool kit 1.37.1, now pinned.
- **Home page items are links**: a latest commit opens its code, and a mod not yet released opens its changelog on the Changes page.
- **The Timeline names where an ended mod went**: its lane says "merged into" the mod that took it in, and with that lane chosen, Follow it into opens the other's lane; the mod that took it in offers the way back.
- **The tool kit each repository uses**, on the Home page: each repository's pin of the tool kit, how many versions newer the kit is, and what moving the pin would bring, version by version. Moving a pin stays an ordinary commit in that repository. Needs tool kit 1.38.0, now pinned.
- What is chosen on a page is part of where you are, so Back returns to it and a link can name it: the changelog on Changes, the repository and the thing in the middle on the Code map (each new thing in the middle is a step), the day on the Timeline, the open report on Reports. A link to a test row, a setting or a mod scrolls to it and outlines it for a moment.

### Changed

- The / key opens Go to anything instead of jumping to the page's own search box, which is a Tab away.
- The connections picture's own back button is now called Previous in the picture, beside the window's Back; on the Code map, the window's Back does the same job.
## [0.18.1] - 2026-11-19

The owner found the Mods page's Read again silent (19 November 2026): "while its doing calculations, you have no idea anything's happening and think that the app or said functionality is broken", and asked for other places like it. Not yet tested on screen.

### Fixed

- **Read again on the Mods page shows a bar at the top while it works**, with what the tools are reading, and its button says Reading… until it is done; the page stays on screen underneath. The same bar shows when the page reads again by itself as you come back to the window.
- **Look again**, in the bar at the top, shows a moving bar under it while it looks at every game, instead of only changing its button's words.
- **Search on the Code map page** shows a bar while it searches.
- Checked every other button that starts work: the Changes, Timeline, Atlas, Reports and Settings pages already show a bar while they read, and recording a test verdict or a keyboard shortcut is immediate.
## [0.18.0] - 2026-11-19

The owner asked for it (19 November 2026): "some common-sense keyboard shortcuts as a default setting, and the ability for the end-user to configure those further to their needs within the Settings Dialog somewhere, perhaps as its own modal deeper within". Not yet tested on screen.

### Added

- **Keyboard shortcuts, one key each, none needing two keys held together.** Everywhere: 1 to 9 for the pages in the bar's order, [ and ] for the game before and after, R to look again, / to jump to the page's search box, ? for the list of every shortcut. In the code viewer: C what changed, N the code as it now stands, H how it connects, J and K the next and previous file. In a connections picture: A around it, F flow of calls, L as a list, + and - to zoom, 0 to fit, Backspace to go back.
- **They never act while you type in a box**, or while the Atlas's globe has the keys, and the page shortcuts wait while a dialog is open.
- **Change keyboard shortcuts**, on the Settings page: a dialog listing every shortcut by where it works. Press Change, then the new key; turn one off; put one back to its default; put them all back; or turn shortcuts off altogether. A key another action has is refused, saying which action has it; Tab, Enter, Space and Escape are kept for moving around and pressing buttons. Every change is kept at once in shortcuts.json in the Companion's own folder.

### Compatibility and limits

- Only what you change is saved; every other key follows the defaults, so a later version's new shortcuts reach you without undoing yours.
## [0.17.0] - 2026-11-19

The owner asked for it (19 November 2026): "flow-charts and the such which show relationships between functions, classes, etc. of the code I'm viewing, wherever it might be. Such as when I'm viewing a code-slice that I was sent towards from a CHANGELOG", in the style of their Relationships and Factions screens. Owner's choices: both a radial and a flow layout, exact C# from built code, C#, XML Defs, Lua and Python, in the code viewer and on a page of its own. Not yet tested on screen.

### Added

- **How it connects**, a third view in the code viewer: the things a commit changed (methods, classes, Defs, functions), most-changed first, and how the chosen one connects to the rest. Reached from any changelog entry on the Changes or Mods page, and from any fact on the Timeline.
- **The connections view**: the thing in the middle, a hub for each kind of connection around it (calls, called by, belongs to, holds, builds on, overrides, patches, patched by, uses, used by, imports) with its count, and its members beyond, as on the Relationships screen. Press anything to put it in the middle; Back returns. Switch to a **flow of calls** (what calls it on the left, what it calls on the right, two steps each way) or **a list**. Filters for each kind with counts, and outside code (the game's, other mods') shown or hidden. Zoom buttons, with drag and scroll as shortcuts. Dashed lines are connections read by name; dashed circles are outside the repository; things the commit changed are ringed.
- **A Code map page for every game**: what was read and how exactly, a search for any class, method, Def or function, and the connections view from whichever is chosen.
- Each game now tells the window its repositories, for pages that let you choose one.

### Compatibility and limits

- The pinned phobos-modkit moves from 1.32.0 to 1.33.0, which adds the connections tool. C# is read exactly from what each repository last built, so build first for the newest picture; where nothing is built, it is read from the source by name. Lua is always by name.
- Checked on more than one game: phobos-rimworld (C# exact from 30 assemblies, XML Defs, Python), phobos-ostranauts (C# exact from 32 assemblies), a Project Zomboid repository (Lua) and phobos-modkit (Python). The first read of a large repository takes about 7 seconds; later ones under a second.
## [0.16.0] - 2026-11-19

The owner asked for one shared library for code more than one part of the Companion uses (19 November 2026), after an audit (docs/shared-code-audit.md) found the same code written 3 to 17 times, and in two places already drifting apart. Owner's choices: a library crate for the host rather than a DLL, and all four steps of the audit. Nothing should look or behave differently, except where the copies had drifted. Not yet tested on screen.

### Changed

- **The host's shared code is one library, companion-core** (src-tauri/core): the games list, running the tool kit, failures, checks on what the window asks for, and building the kit's arguments, with no window in it, so it is tested on its own and a second front end could use it whole. Every page's host module and the 17 commands now go through it.
- **The window's shared code lives once too**: one way to ask the host (16 requests in 8 files), one set of date and time formats in the words' own locale (written 4 ways, with the locale typed in 11 places), one module for showing a changelog, one frame for the code viewer and the changelog as it stood, and one style each for a page's title, its opening paragraph, its closing note and a pressed choice (copied up to 9 times). Small differences in spacing between pages are gone: every page now uses the same.
- **The Home page asks the tools what is not yet released**, instead of reading changelogs with a parser of its own: one run for every repository on your list (about 0.8 s for 19, beside the git reading Home already does), so Home, Changes and Timeline read a changelog the same way. Home now also finds changelogs deeper in a repository than its root and its mods folder, so it may list a few more unreleased items than before.

### Fixed

- The pages read a tool's answer by one rule. Before, the Changes and Timeline pages counted an answer that did not say whether it worked as a success, and the Mods and Settings pages as a failure.

### Compatibility and limits

- The pinned phobos-modkit moves from 1.31.0 to 1.32.0, which adds changes pending for the Home page and reads the Changes page's list faster (about 0.95 s instead of 1.65 s for phobos-rimworld).
- Checked on more than one game: the Home page's new reading ran over all 19 repositories on your list (RimWorld, Kenshi, Ostranauts, Workers & Resources, Farming Simulator 25, Project Zomboid).

## [0.15.1] - 2026-11-19

The owner asked for the Timeline's day-by-day list to be tidied and more streamlined (19 November 2026), "and if other areas can benefit too, then go for it". Not yet tested on screen.

### Changed

- **Mods installed together are one row on the Timeline**: "7 mods installed together", with each mod as a small button that reads its changelog as it stood. The same for mods backed up or taken back together.
- A fact's buttons sit at the right end of its line instead of on a line of their own, moving under it only on a narrow window.
- A fact's entries are grouped under their sections (Added, Fixed...), instead of naming the section after every entry.
- A version's own summary shows instead of the commit's message, which mostly said the same; the message is still on Show the code, when you point at it.
- The repository is named only for a game with more than one, and a build or an encoding no longer says Every mod.
- The status bar names the central settings file among the things the Companion changes when asked.
## [0.15.0] - 2026-11-19

From the owner's first look at the Timeline (19 November 2026): "I'm unable to view the applicable changes to the code, as you can in normal views". Not yet tested on screen.

### Added

- **Show the code in Read it as it stood**, as on the Changes page: the entries a commit wrote are grouped with one button that opens the code viewer on that commit, and a version written over several commits says so. Each entry's commit is the one that wrote it as the changelog stood then.

### Compatibility and limits

- The pinned phobos-modkit moves from 1.30.0 to 1.31.0, which gives each entry of an old changelog its commit.
## [0.14.0] - 2026-11-19

The owner asked for it (19 November 2026): "a timeline (with suitable graph(ic)s) that records/shows how updates were applied, changed, removed, etc. over time ... I like coming back and reading the CHANGELOGs from a particular update-in-moment but I can't because it is now lost to time", with the history kept in the Companion's own folder and "a central settings page where everything or at least, most, of these sorts of things are managed". Not yet tested on screen.

### Added

- **A Timeline page for every game.** At a glance: one row a mod and one column a day something happened, each mark the biggest thing that day (released, ended or merged, installed, went back, version written, entries added, reworded or taken out, and more), with a key to the marks. Pressing a mark takes you to that day; pressing a mod's name shows only that mod. Beneath, every fact day by day, newest first: versions and entries from the changelogs back to each repository's first commit, and installs, go-backs, backups, builds and texture encodings on this PC from now on. Show only what the repositories did, or only what was done on this PC.
- **Read it as it stood**: any changelog exactly as it was at that moment, each entry marked reworded (with its words now) or taken out since, and a count of what was added since. A changelog since removed (a mod merged into another) can still be read. Only what changed since can be shown on its own.
- Show the code on a timeline fact opens the code viewer on that commit, with every entry it wrote.
- **A Settings page**: every folder and file the tools read, for every game, with where each value comes from (the default, the central settings file, a repository's own settings, an environment variable) and whether it is there on this PC. Change writes one setting into the central settings file, for every repository; Use the default takes it out again. A repository's own settings still win, and the page says where they do.

### Compatibility and limits

- The pinned phobos-modkit moves from 1.29.0 to 1.30.0, which brings the history tool, the history log and the central settings file.
- Checked on more than one game: the history tool read phobos-rimworld (676 facts), phobos-ostranauts (609, including 11 releases) and a Project Zomboid repository (60). The history log is named by the game's ID on your list, so a repository's config/installs.json must use the same name (RimWorld's does).
- Installs and the rest before 19 November 2026 are not on the timeline (your choice): the backups hold the copies, but not when they were installed.
- The Settings page changes paths only: a folder or a file, typed as a full path.
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
