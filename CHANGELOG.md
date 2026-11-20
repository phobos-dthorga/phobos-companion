# D'thorga Companion changelog

Maintained from 9 November 2026.

## [Unreleased]

## [0.41.0] - 2026-11-21

The Explorer looks inside your running game (the owner, 20 Nov 2026: debugging tools to see "variables in memory" and the relationships between things; look inside first was their choice). Not yet tested on screen.

### Added

- **The Explorer (key V, under Play): look inside your running game.** Press **Look inside the running game** and confirm; the game pauses for about half a second while a snapshot is taken, then runs on, and nothing in it is changed. Then see what is in its memory by kind and by mod, open a kind to see its objects (filter them, largest first), and open any object to see every value it holds, with each link a press to the next. **What holds it** lists what points to it; **Why is it still in memory?** draws the path from where the game keeps it down to it, or says nothing holds it: garbage not yet swept up, not a leak.
- A snapshot is held while you look and let go when you press **Let it go**, leave the page, close the program, or after ten minutes (your choice), because holding one costs memory while the game runs on. The page counts the time down.
- Keys on the page: **E** to look inside (it asks first), **Q** to let it go, **O** back to the overview; all can be changed in Settings. Go to anything offers **Look inside the running game**.
- Guide: the Explorer's page, "Find out what is using my game's memory", "Find why something is still in memory", and the words Snapshot and Garbage.

### Changed

- The shared pager gained First, Previous, Next and Last for lists that are not by date, and can page a filtered list whose length is not known yet; every page that used it before is unchanged.
- Your choices on the Decisions page about the Explorer (one page for saves and the running game; ten minutes) are acted on and gone from it; the page key is still asked.

### Dependencies

- Tool kit 1.64.0 to 1.65.1: the heap reader (Microsoft's ClrMD) and rimworld-perf's look commands; look-serve refuses in its own first line when the game is not running.

### Compatibility and limits

- RimWorld 1.7 only for now: the one game the owner plays on .NET's CoreCLR, whose install carries the library the reader needs. Any other game is told in words that its tools cannot look inside it yet. The reader itself was checked on a small made-up .NET program as well as on the owner's colony (from the command line, 21 Nov 2026), where it read 27.4 million objects in 17.6 s.
- Saves will open on the same page once the save explorer is built.
- How much memory a held snapshot costs over its ten minutes is not measured yet.

## [0.40.0] - 2026-11-20

Repeated backups no longer pile up: removing them is now part of every install and go-back (the owner, 20 Nov 2026). Not yet tested on screen.

### Changed

- **Every install and every go-back removes the mod's repeated backups**: a backup the same as the one before it, file for file, or only rebuilt from source code that had not changed, as Remove repeated backups does. The oldest of each run is kept, so nothing you could go back to is lost, and the report names each one removed. If the removal cannot finish, the install or go-back still stands and the report says why. The questions before installing and going back now say so, and the Guide's Backup, Go back, Back up a mod and Get ready to play entries match.
- Remove repeated backups stays, for repeats made before this version and for every mod at once.

### Dependencies

- Tool kit 1.62.0 to 1.64.0: installs restore removes repeated backups, and installs.tidy lets a repository's install command do the same (RimWorld's deploy.py does since this day's pin of 1.64.0).

### Compatibility and limits

- Tried on one game's repository only (RimWorld's). A repository's install command removes repeats only if it runs installs.tidy; going back always does.

## [0.39.0] - 2026-11-20

A mod your repository holds but you never installed is no longer easy to miss. Not yet tested on screen.

### Added

- **Before you play names every mod never installed, with Install for the first time**: a line of its own, marked as worth knowing rather than left to do, so Ready to play still shows beside it (a repository may hold mods you do not want). Its question says nothing is replaced and reminds you to turn the mod on in the game's mod list. Install everything that changed still installs only changes, and each card keeps its own Install.

### Changed

- **Installing several mods at once warns about uncommitted work**, naming the mods with files not yet committed, as a card's Install already did.
- Ready to play now says every mod you have installed is built and up to date, so it stays true beside a mod not installed.

### Compatibility and limits

- Tried on one game's repository only (RimWorld's), the only one with an install config today; the line reads only the tool kit's general not-installed state, so any repository that adopts one gets it.

## [0.38.0] - 2026-11-20

The third step of the release audit: its tools are ready to use (A4 and B7). Not yet tested on screen, and not yet tried on a clean PC.

### Added

- **The installer brings the tool kit's compiled tools ready-built**: reading a save no longer needs Rust installed, and the Code map's C# links need only the .NET 10 runtime, not its SDK.
- **Which other programs do the tools use, and are they here?** A button on About opens the answer on Reports: git, .NET 10, ilspycmd, Steam and a game's own (RimSort's texture encoder for RimWorld), each with whether it is on this PC, what needs it and where to get it. A new Guide entry says which page needs what.

### Dependencies

- Tool kit 1.62.0 (programs status and bundle; ready-built tools found first). Building the installer now needs Rust's cargo and the .NET 10 SDK on the PC that builds it.

## [0.37.0] - 2026-11-20

The second step of the release audit: it speaks to someone who isn't you (B1, B3 and part of B4). On your own PC nothing should look different. Not yet tested on screen.

### Added

- **Features for AI agent sessions are hidden unless switched on, or found**, as you chose: Something's off and its ! key, the Decisions page and its D key, the decisions and screen notes on Home, and the claims board show only when a repository on your list has an AGENTS.md, a CLAUDE.md, a .claude folder or a config/decisions.json, or the Companion already keeps notes or answers. Settings has a new panel, **Features for AI agent sessions**: When a repository uses them (the default), Always or Never, with what it found and whether they are shown now.
- **Make a repository ready for the Companion**, a new Guide entry: what each page reads from a repository, and which small files switch on Tests, Mods, Settings and Decisions. Changes, Mods and Tests, when they have nothing to show, lead to it.
- **The Guide marks its entries about agent sessions**, lists them in a group of their own at the end, and, while those features are hidden, says so with a way to show them.

### Changed

- **Words for anyone's PC**: the records backup speaks of "your backup" (a synced folder, a network drive or an external disk) instead of a NAS, and Waylith is named only when a mod's textures are affected by it, with what it is. Test verdicts are written into a test list by the tool kit's test-pass apply, run by you or an agent session, rather than "by an agent".
- Go to anything leaves out the Decisions page while it is hidden; the shortcuts list leaves out its keys.

## [0.36.0] - 2026-11-20

The first step of the release audit (A1, A2, A3 and A5), chosen by the owner on 20 November 2026 after saying the Companion is to be released for others, with Python and the tool kit bundled. Not yet tested on screen, and not yet tried on a clean PC.

### Added

- **The installer brings everything it needs**: its own Python (3.14.10, checked against python.org's own checksum when the installer is built) and the tool kit. On a PC without them, nothing else need be installed, except git. On the PC it was built on, it uses that repository's tools and the Python there, as before.
- **First steps**: the first time on a PC, Home welcomes you with two steps: where your mod projects are kept (or that they aren't in one folder), then your first game from Steam. Your games list is then kept in the Companion's own data folder, never beside the program. A new Guide entry says the same.
- **A missing git is said plainly**, above every page, with where to get it, instead of pages failing in git's own words.
- About says where the tools came from: installed with the program, or the repository it was built from.

### Fixed

- **Screenshots can be drawn in the installed program.** Its security policy refused the small pictures and the whole ones the Timeline and Game files show (from 0.32.0); the browser checks never saw it, since they run without that policy.

### Dependencies

- Python 3.14.10, the portable Windows build from python.org (Python Software Foundation License), carried by the installer.

## [0.35.0] - 2026-11-20

The owner asked whether the check run by hand after the updates of 20 November 2026 could live in the Companion, and chose all four parts it lacked. Not yet tested on screen.

### Added

- **Check what they mean for ours**, in Since you last played on the Mods page, after any update: one press asks the tools whether every method and field our code names is still there, whether an update touched the code behind one of our **temporary patches** (with **See what changed** to read whether the author fixed the fault), how big each update was and what new things it brought, and whether everything our XML patches name is still there. It shows a bar while it works (a couple of minutes the first time, while the tools read the new builds) and changes nothing.
- The Guide's **See what updated since you last played** and **Mods** entries explain it.

### Changed

- The tool kit moves to 1.61.1, which brings the check (rimworld-update-check).

## [0.34.0] - 2026-11-20

The owner asked for "documentation, or an encyclopedia, into the Companion, so I know what to do or how to find something" (20 November 2026), and chose the Companion's own guide first and F1 to open it. Not yet tested on screen.

### Added

- **The Guide**, under Tools in the page bar: **How do I…?** answers in steps (going back to an older version of a mod, getting ready to play, backing up your records, passing a test, adding a game, making a theme and more), an entry for **every page**, and the Companion's own **words** explained (backup, claim, seen working, install record…).
- **Press F1 on any page** and the Guide opens at that page's entry. F1 can be changed in Settings like every shortcut.
- **Take me there** on an answer opens the right page with the right part in view. Links between entries, and See also, lead on; **Back** (the , key) returns, one entry at a time.
- **Search the Guide** with the box at its top; **Go to anything** (the / key) finds the Guide's entries too.
- Settings can now be opened at Appearance and at Games on the list, for Take me there.

### Changed

- **The LICENSE adds two paragraphs** (phobos-modkit's shared licence rule, the owner's decisions of 20 November 2026): our own art and sound are CC BY 4.0, credited to House D'thorga, and the D'thorga names and preview images are not part of either grant, so a fork or reupload uses its own name. The code stays MIT; nothing granted before is withdrawn.

## [0.33.0] - 2026-11-20

The owner asked for themes (20 November 2026), with their OnAir WyrmGrid as the reference, and chose everything it has. Not yet tested on screen.

### Added

- **Appearance**, on the Settings page: choose how the Companion looks. Each theme is shown in its own colours; **Use this** changes the whole window at once and is kept for next time, drawn from the first moment the program opens.
- **Three themes come with it**: House D'thorga (as before, and still the default), **Phobos D'thorga** (oxblood with ember red and amber, after OnAir's of that name) and **High contrast** (black, white and bright colours, for tired eyes or a bright room).
- **Bring in a theme file…** and **Save a copy…** use Windows' own Open and Save dialogs, so a theme can be shared as a file. Your own themes can be removed (after a second press); the Companion's cannot.
- **Make your own from this**, on any theme: change each colour with a colour box or by typing its code, see a preview of the page in your colours, and see each pair that cannot be read as you go. **Keep and use** waits until every colour can be read; **Save as a file…** keeps a draft at any time.
- A theme is colours only: a file holding anything else (styles, fonts, pictures, addresses) is refused, and every theme is checked so its words, charts and lines can be read on every background. If the theme in use goes missing or fails, House D'thorga is used and the page says why.
- Your themes are kept in the Companion's own folder, which the records backup copies.

## [0.32.0] - 2026-11-20

Item 5 of docs/later.md, which the owner said yes to on 19 November 2026: a screenshot gallery, each picture placed on the Timeline on its day. Built overnight on the owner's go-ahead of 20 November. Not yet tested on screen.

### Added

- **Screenshots on the Timeline**: a Screenshots row in the overview marks each day you took pictures, and each day in the list shows its pictures, small (six, then Show all). A day when you only played and took pictures now has its place too. The game's own screenshots and Steam's are both read.
- **Press a picture to see it whole**, over the window, with when it was taken, where it is, and Show in folder. Back closes it, and Copy address keeps a link to it.
- The Game files page's screenshots are now the same small pictures, instead of a list of file names.
- Pictures are drawn small only when they scroll into view, two at a time, and kept until the program closes, so the page stays quick with hundreds of them. A picture that cannot be read says so instead of showing a broken image.

### Dependencies

- phobos-modkit v1.58.0 to v1.59.0: game-files screenshots, one game's pictures alone, quickly.

## [0.31.0] - 2026-11-20

Item 5 of docs/later.md, which the owner said yes to on 19 November 2026: adding a game from Steam, and better guesses at where a game keeps its files. Built overnight on the owner's go-ahead of 20 November ("proceed at your leisure and even agency"). Not yet tested on screen.

### Added

- **Add a game from Steam**, on the Settings page (Games on the list): every game Steam has installed, those not on your list first. Choose one, and its name, a short id, where it keeps its files and its repositories are filled in for you to check: the folder from the tools' guesses (each saying why it was guessed), Choose a folder… for Windows' picker, or none for now; the repositories are the folders under your root that no game names yet. **The entry is shown exactly as it will be written** before Add to the list writes it, and the game is in the game menu at once. A game already on the list shows which id it has and cannot be added twice.
- The list as it was is kept beside it (games.json.before-add) at each add, and the list keeps its own order and layout. Nothing already on the list is changed or removed.

### Fixed

- Where a game keeps its files is now found for Farming Simulator 25 and Project Zomboid too, and from where Windows keeps your Documents folder (yours is in SynologyDrive, so Documents\My Games was never looked in). From the tool kit.

### Dependencies

- phobos-modkit v1.57.1 to v1.58.0: game-files guesses a game's data folder where it really is, with up to three candidates for each Steam game.
- serde_json's preserve_order feature, so the games list keeps its order when a game is added.

## [0.30.1] - 2026-11-20

The owner, on the code viewer (20 November 2026): "It doesn't seem to be showing the full extent of the code that was/is involved? I've had this feeling for sometime now." Not yet tested on screen.

### Fixed

- **The code behind an entry not yet committed now includes new files.** They were left out, and a new feature is mostly new files: D'thorga Farming's first build showed 25 files and 104 lines before its commit, and 112 files and 5,408 lines after. New files now show whole, marked new. Once an entry is committed, the viewer shows its commit as before; one file's change still stops at 600 lines, and says so.

### Dependencies

- phobos-modkit v1.57.0 to v1.57.1: changes shows new files for an entry not yet committed.

## [0.30.0] - 2026-11-20

Your game runs on Waylith, which unpacks many mods' compressed textures at four times the memory: D'thorga Vehicles showed 2.0 GB in Graphics Settings' memory profiler. You asked (20 November 2026) for the fix to be part of the Companion's own install and encode steps. Installing already runs the repository's deploy, which now carries it, and encoding runs the tool kit, which does; but the texture check looked only at file dates, so those mods counted as up to date and were never offered. Not yet tested on screen.

### Added

- **The Mods page offers encoding for textures Waylith unpacks.** Before you play says how many mods have them and how many textures in all, with Encode their textures when nothing older needs encoding first; Textures to encode lists each such mod. Encoding trims only their smallest copies, used when zoomed far out, so they stay compressed; the pictures themselves don't change. A first check of your 358 active mods found 4,770 such textures in 116 mods, about 7.75 GB of what the profiler counts.

### Changed

- The encode confirmation names the first three mods and counts the rest, instead of listing every one, and says how many textures get trimmed.

### Dependencies

- phobos-modkit v1.55.0 to v1.57.0: rimworld-textures status counts the textures Waylith unpacks, remembering each file's verdict so only new or changed ones are read again (1.57.0); a shared rule for designing a new behaviour (1.56.0). It also corrects 0.29.0's note: encoding here did use 1.54.0's trimming from then on.

## [0.29.0] - 2026-11-20

The owner found backups still not working (20 November 2026): no folder had ever been saved for the records backup, and nothing ran by itself. They chose copies every few hours while the program is open, a missed one made at the soonest next chance, and Windows' own pickers wherever a folder is chosen, keeping the type-in box. Not yet tested on screen.

### Added

- **Your records now copy themselves**: every 6 hours while the Companion is open, into the folder you chose. A copy missed while the program was closed, or while the PC slept, is made within minutes of it opening or waking. The Settings page says how often, and when the last one was made; **Home says when one failed and why** (a drive not there, a NAS asleep), and it tries again within a few minutes. Back up now still works as before, and old copies are never deleted.
- **Choose a folder… and Choose a file…** beside every setting on the Settings page open Windows' own picker, where the setting's value is; what you choose is saved at once, the same way a typed path is. Closing the picker without choosing changes nothing, and says so. **Choose the folder** in Back up your records opens the picker too; **Type a folder instead** opens the box as before.

### Changed

- The Change button on each setting is now **Type a path**, beside the picker.

### Fixed

- A backup folder that cannot be reached is now refused in words (from the tool kit), instead of failing with the tools' own error.

### Dependencies

- Tauri's dialog plugin 2.8.4 (with its file-system plugin 2.7.1), for the pickers, used only from the host.
- phobos-modkit v1.53.0 to v1.55.0: records says when a copy is due and marks the copies made automatically, and an unreachable folder is refused in words (1.55.0); rimworld-textures shortens mip chains another mod would unpack (1.54.0, not used here).

## [0.28.2] - 2026-11-20

The owner's screen note on the Mods page (20 November 2026): "Why is it showing me as taking away nine entries?" Not yet tested on screen.

### Fixed

- **Entries the repository's changelog does not hold now are no longer called a loss.** Two sessions had both numbered their work D'thorga Framework 0.184.0, and the installed one was renumbered, so its nine entries read as "take away 9 entries" though their code was still in the repository. They now show under their own heading in Installed now, with why for each version: a number used twice, or installed from changes not committed then and not in the repository's changelog now. Either way the changelog cannot say whether the code went, and the page says so. A card whose only difference is these says "Installed copy has entries the repository's changelog does not hold now". An entry dropped from a version both copies share, and going back to a backup, still read as taking it away.

### Dependencies

- phobos-modkit v1.51.0 to v1.53.0: installs status sets those entries aside (unlisted, with unlistedWhy); 1.52.0 brought rimworld-save thing, which this program does not use yet.

## [0.28.1] - 2026-11-20

Loose ends the owner said yes to (20 November 2026). Not yet tested on screen.

### Fixed

- **A setting listed twice in Settings to look at shows once**: 18 settings of D'thorga Medical's Burns and Smoke part were each added in one commit by two settings classes (Medical's own and the part's), so each showed twice and marking one marked its twin. Marks already made are kept.

### Changed

- **The Decisions page holds six questions, down from 20**: the owner took the agent's lean on the 14 that kept things as they are (page sizes, the crowded-patch threshold, the activity strip's delay, Make-up's 30 days, sizes only for old game files, running elsewhere later, the ! key, the records reminder at 7 days, old claims after a day, memory watches only on a press, 15 minutes first, the Memory page's keys, Clean up's note from 5 GB, and install backups starting unchosen). Their answers are kept in the Companion's own folder. Left: renumbering the page keys, decisions from every repository, Size as installed, the last two cross-links, marking a memory watch from inside the game, and the Code map's readers for TypeScript, Svelte and Rust.

## [0.28.0] - 2026-11-20

The owner chose (20 November 2026) "Since you last played" as the next build: the question they have before launching, answered from parts the tools already had. Built on phobos-modkit 1.51.0. Checked on RimWorld, against the owner's real update of Vanilla Furniture Expanded - Factory, which changed methods D'thorga Factory Additions patches; not yet tested on screen.

### Added

- **Since you last played**, in the Mods page's Before you play: what updated since the session before (the game, and how many of your mods, with Which ones to unfold), then whether any of those updates changed a method our mods patch.
  - **A mod whose update changed something we patch is named, with the methods**, and **See what changed** opens that update's comparison on the Code map, method by method.
  - **A mod ours tie into whose new build the tools have not kept yet** is named too, since it could not be checked, with **Keep the new builds**: it keeps them in the tools' own archive (never the game's or the mods' folders) and checks again.
  - **While RimWorld runs, it compares with the launch before this one.** Steam records only the latest launch, so the tools now remember each launch they see; the very first time, it says it can only compare with this launch, and from your next launch it compares with the one before.

### Dependencies

- phobos-modkit 1.51.0 (launches remembered; when an update's build was kept, as data).

### Compatibility and limits

- The patch check reads every patch our code makes and compares the kept builds, which takes about a minute the first time in a session; the update list shows first, and the check follows.
- Only RimWorld's tools can say what an update changed in what we patch; other games show what updated, and say nothing about patches.

## [0.27.0] - 2026-11-20

The owner saw the Mods page's settings list sit on its bar for about a minute just after starting the Companion, and asked (20 November 2026) for the list to show at once, for the tools' cache to leave Windows' Temp folder for K:, and for "some kind of ongoing cleanup process", with their yes before anything goes. Not yet tested on screen.

### Added

- **Clean up**, on the Settings page: what the tools, builds and tests have left behind, by group, with how much each holds and why it may go (on your PC today: 33.7 GB, 29 GB of it the tools' development build). Choose the groups, press Clean up the chosen, and confirm; nothing goes before that, and nothing the list does not name. **Install backups start unchosen**: they are the Mods page's way back to an earlier version. Git's file-watcher daemons are a group too.
- **Home says when the tools could clear 5 GB or more**, with a button to Clean up. It looks quietly, at most every half hour.
- Two questions on the Decisions page: when Home should mention it, and whether install backups should start unchosen.

### Changed

- **Settings to look at shows its list at once**: the list from last time appears when the page opens, saying it is being checked for changes, and the fresh read replaces it when it comes. Right after the Companion starts, that read can take a minute while everything else starts too. A failed check keeps the list and says so.
- Sizes from 1 GB up read in GB (32.2 GB, not 32,972.8 MB), everywhere the Companion shows a size.

### Dependencies

- phobos-modkit 1.50.0 (cleanup by group).

### Compatibility and limits

- The tools' cache moved to K:\phobos-modkit\cache on 20 November 2026 (the setting modkitCachePath on the Settings page, set for you), copied across so nothing had to be rebuilt. The old copy in Windows' Temp folder (1.8 GB) is left where it was until you choose; Clean up does not list it, since it is no longer the tools' cache.

## [0.26.2] - 2026-11-20

The owner saw the Mods page for D'thorga Tools speak as if the tools were a game, and said yes to telling a set of tools it has no mods (20 November 2026). Not yet tested on screen.

### Fixed

- **The Mods page tells a set of tools it has no mods to install**, as the Atlas, Logs, Memory and Game files pages do, instead of "before you play" and "your installed mods". It points to About, with a button, for which version of the Companion you are running and whether a newer one is waiting. Its button in the page bar has a dashed edge while the tools are chosen. Games are unchanged.

## [0.26.1] - 2026-11-20

The owner could not make a backup of the Companion's records or choose the folder for it (20 November 2026). Not yet tested on screen.

### Fixed

- **A folder pasted from Explorer's Copy as path is accepted**: Ctrl+Shift+C puts quotes round the path, and the tools refused the quoted path as "not a full path". The quotes are now taken off before it is saved, for every folder on the Settings page.
- **Back up now turns on as soon as the folder is saved**: the backup panel read its folder only when the page opened, so the button stayed off until you left the page and came back.
- **Choose a folder opens the box to type it in**, already focused, instead of only scrolling to the setting.
- The note shown before a folder is chosen gives examples of a folder, says Explorer's Ctrl+Shift+C copies one, and that the folder is made at the first backup if it is not there yet.

## [0.26.0] - 2026-11-19

The owner chose (19 November 2026) "Read and compare, on your press" for how much of decompiling the Companion takes on: follow one of our patches into the method it patches, read other authors' code, and see what an update changed. Built on phobos-modkit 1.49.0. Checked on RimWorld, the only game whose tools can do it yet; not yet tested on screen.

### Added

- **Read their code**: on the Code map, a button beside each method our code patches (in its patches box) and beside any thing outside our code that you pick on the map. It shows that type's or method's code, numbered and coloured like ours:
  - **from the author's public source first**, saying which repository and file, since it has their own names and comments;
  - **else from a decompile already kept**, saying so: a decompile has no comments, and some names are the decompiler's;
  - **else it names the file and mod that hold it** and offers **Decompile**, on your press. A mod's file takes seconds; the game's own takes about five minutes the first time, and you can keep playing meanwhile. Only a file the tools named can be decompiled, and the result stays in the tools' own folder on this PC, never in a repository.
  - The first look searches every copy kept on this PC, which took about four minutes once on your machine; after that it is quick.
- **What did an update change?**: on the Code map, the game's file and the mods we tie into, newest update first, for every file kept twice or more. Choose one to see what its last update added, removed and changed, declaration by declaration; choose a declaration to see its change as a diff. A patch whose target the last update changed now has **See what changed**, straight to that diff.
- Both are steps on the trail: Back closes their code and steps out of an update.

### Changed

- The code viewer's colours for code now live in one place shared with Their code, so the two always look the same.

### Dependencies

- phobos-modkit 1.49.0 (rimworld-code; the archive's kept files as data).

### Compatibility and limits

- Only RimWorld's tools can find other authors' code and compare updates today; on every other game the Code map says so in words.
- A decompile of the game's own file is large (tens of megabytes of code); the tools keep the twelve most recently used decompiles and remove older ones by themselves.

## [0.25.0] - 2026-11-19

The owner asked (19 November 2026) for a proper About page: "I keep forgetting which version I have installed and I cannot find a version number anywhere." Not yet tested on screen.

### Added

- **The version is always in sight**: the status bar at the bottom of the window says D'thorga Companion and its version. Press it to open About.
- **An About page** (the I key, or its button under Tools):
  - **Which version you are running**, the commit it was built from and when.
  - **Whether a newer version is waiting in the repository**, with what each newer version brings and, when its installer has been built, the installer's full path to run. When you are up to date it says so, and how many commits the repository has had since that are not yet part of a version.
  - **What this version brought**: its changelog's opening words, with a button to read it all on the Changes page when your games list holds the Companion's repository (the D'thorga Tools entry does).
  - **Where it lives**: the program, the repository it was built from (where it finds the tool kit and your games list, wherever it is installed), its own records folder, the tool kit's version and the source's web address.
  - **What it is built with**: each library inside it and its licence, read from the third-party notices.

### Fixed

- The third-party notices now name html-to-image, the library behind Save a picture and Something's off since 0.21.0.

## [0.24.0] - 2026-11-19

The owner asked (19 November 2026) for three things: no more pages that are only a progress bar and empty space, which is also all Save a picture caught while a page loaded; a neater top to the Atlas page; and the Companion listed as its own game. They chose one entry holding all three tools (the Companion, the tool kit and the logger), with pages that say plainly when they have nothing for it. Not yet tested on screen.

### Added

- **Your tools beside your games**: an entry on your games list may say it is a set of tools ("kind": "tools"). It gets Home, Changes, Timeline, the Code map, Make-up, Tests and Reports like any game. **The Atlas, Logs, Memory and Game files pages say in words that a set of tools has no saves, log, running game or game files**, and their buttons have a dashed edge while one is chosen. An entry that says nothing is a game, as before. Checked on RimWorld (a game) and the tools entry.
- Two questions on the Decisions page: teaching the Code map to read TypeScript, Svelte and Rust, so the Companion's own code can be followed (today it reads the kit's Python only), and how much of decompiling the Companion should take on.

### Changed

- **Save a picture waits for the page to finish loading**: pressed while a page shows its progress bar, it says it is waiting and takes the picture once the page has loaded and stayed loaded for half a second. **Take it now** takes it at once; the close button lets it go, and so does changing page. The Memory page's bar for a running watch does not hold it up.
- **Pages show the shape of what is coming while they read**, beneath the bar, instead of empty space: the Code map, Reports, Settings and Tests now, as Changes, Logs, Make-up, Memory, Mods and Timeline already did. The Atlas page shows a globe.
- **A tidier top to the Atlas page**: the title and Read the newest save again on one line (the button says Reading the save while it works); what the map shows as the page's opening line; where it came from (save, when it was read, world seed, tiles) as a strip of small cards instead of a long sentence; the view and show choices in one panel with their labels lined up; and, where the window is wide, the tile you picked and the colour key beside the globe instead of below it, with Go to your colony above them.
- **Every report shows where it came from as a strip of facts** when the tools give them (save reports do from phobos-modkit 1.48.0).

### Fixed

- **No more empty band under the top bars while a page loads.** Since 0.21.0 the activity strip had no row of its own in the window's layout, so whenever a page was shorter than the window (always while it loaded) the strip stretched into a tall empty band and pushed the page down.

### Dependencies

- phobos-modkit 1.48.0 (report facts).

### Compatibility and limits

- **Install 0.24.0 before opening the Companion once your list has a tools entry**: 0.23.0 and older refuse a list with a field they do not know, and say the list could not be read.
- The Code map reads C#, XML Defs, Lua and Python, so for the Companion's own repository it says nothing was read; it follows the kit's Python. Readers for TypeScript, Svelte and Rust are a question on the Decisions page.

## [0.23.0] - 2026-11-19

The owner decided (19 November 2026) that memory profiling is done from the Companion rather than by asking agent sessions to run watches; the tool kit gained what a program needs to follow, stop and mark a watch (phobos-modkit 1.47.0). Not yet tested on screen, and no watch has been started from the window yet.

### Added

- **A Memory page** (the U key, or its button under Play): watch your game's memory for a few minutes while you play, without pausing it, and see whether it climbs steadily or in jumps, and whether it is .NET's (the game's and mods' code objects) or everything else (the engine, textures, drivers).
  - **Start a watch** (T, or the button): choose how long (5 to 60 minutes, 15 to begin with), whether to read .NET's figures too (it attaches to the game once, which can make it stutter for a moment) or Windows' figures only (attaches nothing), and a label. **It always asks first**, and says to save.
  - **While it runs**: a bar of how far along it is, the latest figures, the timeline so far, and **Stop the watch now** (X), which loses nothing. It carries on when you change page.
  - **Mark the moment** (B): type what you are doing, such as reloading now, and press Enter. The time is taken when you press B. Five quick marks mark at once: Reloading now, Loaded a save, Opened the world map, Back to playing, Paused the game.
  - **Every kept watch's report**, newest first. **The report now says what happened before any figure**: the saves the log shows loaded, or in bold that none was; your marks; and in bold, a marked reload that never reached the log.
  - A game whose tools have no memory watch is told so in words. Today that is every game but RimWorld.
- Kept memory watches join **Go to anything** (/).
- Four questions on the Decisions page: marking from inside the game with a two-key press, starting a watch by itself when the game starts, the first length, and the page's keys.

### Changed

- **Reports show bold text as bold** (on the Reports page and wherever a report is drawn), not with asterisks around it.

### Dependencies

- phobos-modkit 1.47.0 (watch-status, watch-stop, watch-mark and the memory-watch surface).

## [0.22.0] - 2026-11-19

The owner said yes (19 November 2026) to four new tools for working with agent sessions and to the game-files work; each is its own commit under this version, and anything not yet built is kept in docs/later.md. Not yet tested on screen.

### Added

- **Something's off** (the ! key, or the button beside Save a picture): when a page looks wrong, press it. It draws the page as it is, then asks what looks wrong (the words are optional; Ctrl+Enter saves). The picture, the page's address and your words are kept in the Companion's own folder, and the next agent session reads every open note when it starts, then says what it did. **Home lists the notes still waiting**, with Show the picture and Go to the page, and the newest ones dealt with, saying how.

- **Back up your records**, on the Settings page: your test verdicts, the history log, the settings you have looked at, screen notes, keyboard shortcuts and the central settings file live in this computer's local app data, which the NAS does not back up. Choose a folder it does keep (the new setting Where copies of the Companion's own records go), then **Back up now** copies them into a new dated folder there. Old copies are never deleted. **Home says when they have never been copied, or the newest copy is a week old or more**, with a button leading to the backup.

- **Who is working on what**, on Home: what each agent session holds on the claims board (a version number, a test row, a file being reworked), for how long and what for. A claim a day old or more is marked old: perhaps a session that ended without letting go. Sessions take and release claims themselves, under a new shared rule, so two never take the same version number again.

- **A Decisions page** (the D key, or its button under Tools): every choice an agent made for you to revise, and every question it needs your word on, gathered from each repository. Each shows its options as plain choices, with the agent's lean marked and chosen to begin with, so **taking the lean is one press of Decide**; Something else takes your own words. Answered ones wait below, with Change my answer, until an agent acts on them. **Home says how many wait.** Thirteen are waiting to begin with, from the choices made in this program so far.
- **The page bar is grouped**: Play (Home, Mods, Tests, Logs, Atlas), Code (Changes, Timeline, Code map, Make-up) and Tools (Reports, Settings, Decisions). No key changed: whether the number keys should follow the new order is the first question on the Decisions page.

- **A Game files page** (the W key, or its button under Play), for any Steam game:
  - **What changed**: whether Steam updated the game after you last played, and every Workshop item updated since, by name where its files give one. Look back to your last launch, the last day or the last week.
  - **Saves**, newest first, ten a page, autosaves marked, with Show in folder.
  - **Screenshots**, the game's own and Steam's, the newest listed with Show in folder.
  - **Where the space goes**: the game itself, its Workshop items and each folder of its data folder, largest first.
  - Folders are found from the game's name. **A game whose folders are named otherwise can name them** in its entry in the games list (places: data, saves, screenshots), and its Steam app ID (steam_app_id) when Steam knows it by another name; the page says which is missing, in words. Checked on RimWorld (all four parts), Farming Simulator 25 (Steam's records; its data folder was not found) and Project Zomboid (its saves and space, with its data folder named; it is not installed through Steam at the moment). Nothing is changed or deleted.

### Dependencies

- Tool kit 1.46.0, now pinned (1.41.0 brought screen-notes, which agent sessions use to read and resolve the notes; 1.43.0 the records backup and its setting; 1.44.0 the claims board and its rule; 1.45.0 decisions; 1.46.0 game-files).

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
