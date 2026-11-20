# Kept for later: everything proposed and not yet built

**Status (20 Nov 2026):** items 1 to 5 are built in Companion 0.22.0, untested on screen; of item 5's rest, adding a game from
Steam and better data-folder guesses are built in 0.31.0, the screenshot gallery on the Timeline in 0.32.0, and the launch
before last in 0.28.0; the RimWorld extras are still to come (below). The records backup copies itself from 0.29.0. The owner said yes to all of it ("Absolutely with all of these and
for what we are not implementing just yet, make sure to document and record those for later so that they are not lost"), in the
order of the build list below. Each item's status changes here in the change that builds it; once built, its design moves to
`design-record.md` and this record keeps one line pointing there.

## Read this first (gotchas)

- **Build order is the owner's go-ahead, not a schedule.** Items 1 to 5 are being built in Companion 0.22.0 onwards; everything under
  "Not on the build list yet" waits for the owner's word.
- **Every item still answers the three questions when it is built** (what it lets the person do, what it stops, how it changes the
  way they work), in `design-record.md`.
- **Multi-game first** (`AGENTS.md`): every game-files view below is designed as a generic view any game can fill, with RimWorld's
  extras on top, and a game that cannot fill it is told so in words.
- **One decision is the owner's alone and stays open:** whether the Companion may ever delete old autosaves or Real Ruins files to
  free space. Until the owner says so, it only shows sizes (the shared rule: never delete to free space without telling the owner
  and waiting for their choice).

## The build list (owner's yes, 19 Nov 2026)

| # | Item | What it lets the owner do | Status |
| --- | --- | --- | --- |
| 1 | **Screen notes ("something's off")** | Press one key on any page, add a few words or none, and the picture, the address, the version and the time land in a folder agent sessions read at the start: "this looks wrong" without having to describe where | **Built**, 0.22.0 (see `design-record.md`) |
| 2 | **Records backup** | Copy the Companion's own records (test verdicts, key decisions, "looked at" marks, the history log, shortcuts, the central settings file) to a folder of the owner's choosing on the NAS, with a note on Home when the last copy is old. Synology does not back up the app data folder | **Built**, 0.22.0; copies itself every 6 hours from 0.29.0 (see `design-record.md`) |
| 3 | **Claims board** | See which agent session holds which version number, test row or file, from a tiny shared claims file the sessions write and read; ends the cross-session "is 0.174.0 yours?" messages | **Built**, 0.22.0 (see `design-record.md`) |
| 4 | **Decisions page, and the page bar grouped** | Answer open decisions with a button, each showing its options and the agent's lean, instead of hunting through design records; the bar grouped into Play (Home, Mods, Tests, Logs, Atlas), Code (Changes, Timeline, Code map, Make-up) and Tools (Reports, Settings, Decisions) | **Built**, 0.22.0 (see `design-record.md`) |
| 5 | **Game files** | See what the game itself writes: what changed since you last played, saves, screenshots, disk use; add a game from Steam without hand-editing `games.json` | **Built in part**: 0.22.0 what changed, saves, screenshots as a list, space; 0.28.0 the launch before last; 0.31.0 adding a game from Steam and better guesses; the rest below |

### 1. Screen notes

- **One key and one button** on every page (a free key; `p` is the picture key, so not that). A small dialog with an optional words box.
- Saves the page picture (the same drawing as Save a picture), the page address (N3), the Companion's version, the time and the
  window size, as `screen-notes/<stamp>/picture.png` and `note.json` in the Companion's app data folder.
- A kit command lists open notes and marks one resolved, so agent sessions can read them at the start; a rule in this repository's
  `AGENTS.md` (and the agent's memory) says to check them.
- Home shows how many notes are open.

### 2. Records backup

- A kit command copies the Companion's data folder, the history log folder and the central settings file into a dated folder under a
  folder named by a central setting (the owner sets it on the Settings page).
- A button on the Settings page, and a note on Home when the newest copy is older than a set number of days, or there is none.
- **Never deletes an old copy**: the owner prunes by hand.
- **Saves are a separate, bigger question** (the RimWorld saves folder alone is 15 GB): not part of this item.

### 3. Claims board

- A kit `claims` command (list, take, release) on one shared file in the kit's local data, each claim with its session, what it holds
  (a version, a test row, a file) and when it was taken; an old claim shows its age rather than vanishing.
- Home shows the board: who is working on what.
- **A shared rule** in phobos-modkit `rules/every-session.md` (owner's word given): check and take a claim before using a shared
  version number. Repositories read it when their pin moves.

### 4. Decisions page

- Each repository lists its open decisions in a config file (question, options, the agent's lean, where it came from); the owner's
  answers are kept in the Companion's data folder, as test verdicts are, and a kit command lists them and applies an answer.
- **Seed list** (open today): the default keys G, M and P; page sizes (ten days, eight backups a page and the rest); CROWDED 3 on the
  Timeline; the activity strip's 0.6-second threshold; the 30-day window on Make-up; S1 and S5; Size as installed; the deletion
  question above; running the Companion on another machine.

### 5. Game files

**What RimWorld writes, as read on the owner's machine on 19 Nov 2026** (the data folder is
`%USERPROFILE%\AppData\LocalLow\Ludeon Studios\RimWorld by Ludeon Studios`):

| What | Where and how much | What the Companion could show | Value |
| --- | --- | --- | --- |
| Steam's records | `steamapps\appmanifest_294100.acf` (game build ID, last update) and `steamapps\workshop\appworkshop_294100.acf` (every Workshop item's last update, 754 items) | **What changed since I last played**: game build and every mod updated since a chosen day | High, and the same for every Steam game |
| Saves | `Saves`, 46 files, 15 GB | A save shelf: name, size, date, colony, which are autosaves; links into `query-save.py` | High |
| Screenshots | `Screenshots`, 57 files, 263 MB | A gallery, each picture placed on the Timeline on its day | Medium; lovely beside the history |
| Start-up sessions | `StartupImpactSessions` (11) and `StartupImpactData.xml` | A start-up chart over launches (kit's `startup-impact` already reads them) | Medium |
| Disk use | Real Ruins 1.5 GB in 16,231 files; TextureCache 3.5 GB; PhobosPatchedDefs 70 MB | Where the space goes, by folder | Medium; shows sizes only (see the open decision) |
| Crash dumps | Windows' `CrashDumps` folder (one RimWorld dump today) | Crashes placed on the Timeline, linked to `crash-dump.py`'s reading | Medium |
| Creations | `Xenotypes`, `PrepareCarefully`, gravship blueprints, DMSE missile designs, `Empire` squads | A shelf of things the owner made in game | Low to medium, fun |
| Settings files | `Config`: 170 `Mod_*` files, `ModsConfig.xml`, `Prefs.xml`, `KeyPrefs.xml`, `Knowledge.xml`, `LastPlayedVersion.txt` | Mod settings are already read by `mod-settings.py`; the rest | **Low**: `Prefs`, `KeyPrefs` and `Knowledge` are not worth a view |
| Logs | `Player.log`, `Player-prev.log` | Already on the Logs page | Built |

**The design, as proposed:**

- **"Kinds of thing" per game**: logs, saves, screenshots, settings, crash dumps and a data folder, each a place on the game's entry
  in `games.json`. Generic views read any game's places; a game's adapter in the kit adds what only it knows (a RimWorld save's colony).
- **Generic views first**: what changed since I last played (any Steam game, from its two `.acf` files), the save shelf, the
  screenshot gallery on the Timeline, disk use.
- **Add a game from Steam**: Steam's `libraryfolders.vdf` lists the installed games; picking one fills its ID, name, install folder
  and guessed data folders (LocalLow, Documents\My Games, AppData), each guess shown for the owner to confirm.
- **Say plainly what works for each game**: a game with no saves folder set says so, never shows a blank.
- **RimWorld extras**: the start-up chart, crashes on the Timeline, the creations shelf.

**Built in 0.22.0** (kit 1.46.0, `design-record.md`): the Game files page with what changed since you last played, the saves, the
screenshots as a list, and where the space goes; places and the Steam app ID in the games list. **Still to come, in this order:**

| Next | What it needs |
| --- | --- |
| **Screenshot gallery**, each picture placed on the Timeline on its day | **Built**, 0.32.0 (see `design-record.md`): small pictures drawn in the window from bytes the host hands over for listed files only |
| **Add a game from Steam** | **Built**, 0.31.0 (see `design-record.md`) |
| **Better guesses for the data folder** | **Built**, phobos-modkit 1.58.0: Documents where Windows keeps it, names that differ the way games' folders do; both now found |
| **The launch before last** | **Built**, 0.28.0 (phobos-modkit 1.51.0) |
| **RimWorld extras**: the start-up chart over launches, crashes on the Timeline, the creations shelf | The kit's `startup-impact` and `crash-dump` readings as Timeline facts; the creations folders listed |

## Not on the build list yet

| Item | Where it came from | What it needs or waits for |
| --- | --- | --- |
| **Deleting old autosaves or Real Ruins files** from the Companion | Game-files discussion, 19 Nov 2026 | **The owner's decision.** Until then, sizes only |
| **Running the Companion on another machine, or for someone else** | Limits in `design-record.md`; the owner's word of 20 Nov 2026 that it is to be released for others | **The [release audit](release-audit.md)**: every finding, in the order a stranger would hit them, with the owner's questions |
| **S1: design records joined to code** | `cross-links.md` | A way to tie a design record's sections to the code that builds them |
| **S5: rules joined to the checks that enforce them** | `cross-links.md` | A list tying each rule to its check script |
| **Size as installed** on Make-up | Make-up, 0.20.0 | Each game's install records read for sizes |
| **Prefs, KeyPrefs and Knowledge views** | Game-files discussion | Low value; build only if the owner asks |
| **Saves backup** (15 GB) | Records backup discussion | Its own decision: where, how often, how many |
| **phobos-rimworld's kit pin** was at 1.30.0, ten versions behind | Noticed 19 Nov 2026 | **Done**: moved to 1.42.0 by another session (19 Nov 2026) |
| **"Decisions waiting for you"** on Home | Owner's idea, 10 Nov 2026 | **Done**: folded into item 4, the Decisions page, with a count on Home |
| **Atlas: stepping through saves**, and links from places to the atlas | `design-record.md`, atlas | Not scheduled |
| **Save explorer**: any save's contents as a tree, search, one thing in full; then relationship pictures, what each mod has in a save, save against save | The owner's question of 20 Nov 2026; the first slice and "for players from the start" are the owner's choices | **Designed, not built**: [save-explorer.md](save-explorer.md). Waits for the owner's word to build; kit changes first |
| **Debugging the running game**: look inside a snapshot of it (memory by kind and by mod, any object in full, what holds it), then a live view through D'thorga Framework, then a debugger | The owner's ask of 20 Nov 2026; the order, the debugger protocol, the off-by-default setting and the test attach are the owner's choices | **Designed; layer 1 proven on RimWorld by a probe**: [debugging.md](debugging.md). Waits for the owner's word to build; kit changes first |
