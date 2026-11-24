# Kept for later: everything proposed and not yet built

**Status (24 Nov 2026):** the build list's items 1 to 5 are built (0.22.0 to 0.32.0), untested on screen, except item 5's
RimWorld extras (below). Under "Not on the build list yet", going online is designed and four slices built
([online.md](online.md)), reading code closer is built to step 3, and the rest waits for the owner's word. The owner said yes to all of it ("Absolutely with all of these and
for what we are not implementing just yet, make sure to document and record those for later so that they are not lost"), in the
order of the build list below. Each item's status changes here in the change that builds it; once built, its design moves to
`design-record.md` and this record keeps one line pointing there.

## Read this first (gotchas)

- **Build order is the owner's go-ahead, not a schedule.** Items 1 to 5 are built (Companion 0.22.0 onwards); everything under
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
| **S1: design records joined to code** | [history/cross-links-proposal.md](history/cross-links-proposal.md) | A way to tie a design record's sections to the code that builds them |
| **S5: rules joined to the checks that enforce them** | [history/cross-links-proposal.md](history/cross-links-proposal.md) | A list tying each rule to its check script |
| **Size as installed** on Make-up | Make-up, 0.20.0 | Each game's install records read for sizes |
| **Prefs, KeyPrefs and Knowledge views** | Game-files discussion | Low value; build only if the owner asks |
| **Saves backup** (15 GB) | Records backup discussion | Its own decision: where, how often, how many |
| **phobos-rimworld's kit pin** was at 1.30.0, ten versions behind | Noticed 19 Nov 2026 | **Done**: moved to 1.42.0 by another session (19 Nov 2026) |
| **"Decisions waiting for you"** on Home | Owner's idea, 10 Nov 2026 | **Done**: folded into item 4, the Decisions page, with a count on Home |
| **Atlas: stepping through saves**, and links from places to the atlas | `design-record.md`, atlas | Not scheduled |
| **Atlas: the fleet layer**: every vehicle and convoy the player owns drawn on the globe from a save (convoys on the road with their route, aircraft in flight, vehicles left parked or at a depot, sling wrecks), each with what it is doing and what it needs, as D'thorga Framework's in-game Fleet board shows them (camped for the night, driving through the night, halted for a meal, short of food or water) | The owner, 22 Nov 2026, in phobos-rimworld: "Maybe the Fleet window could be part of the World/Atlas view too?"; their card the same day: the Fleet in game now, **the Companion's atlas later**, written up here to build when the Companion is next worked on | A kit save reader for the vehicle world objects (Vehicle Framework's caravans, aerial vehicles, stashed vehicles) and our vehicles' saved state; then one more atlas layer. **Generic first** (the shared rule): "things that move across a world map, with a state and a need" is a layer any game's save can fill; RimWorld fills it first, and a next game needs only its own reader |
| **Save explorer**: any save's contents as a tree, search, one thing in full; then relationship pictures, what each mod has in a save, save against save | The owner's question of 20 Nov 2026; the first slice and "for players from the start" are the owner's choices | **Designed, not built**: [save-explorer.md](save-explorer.md). Waits for the owner's word to build; kit changes first |
| **Search, overview first**: one search across everything the Companion reads (Go to anything's sources, Defs as patched, the snapshot, logs and saves), counts by source and mod before any match, and contexts to keep it small | The owner's ask of 21 Nov 2026, after Needle; overview first, in the Companion, every source and switchable contexts are the owner's choices | **Designed, not built**: [search.md](search.md). Waits for the owner's word; kit changes first |
| **Debugging the running game**: layer 1, look inside a snapshot, is **built** (0.41.0, the Explorer); then a live view through D'thorga Framework, then a debugger | The owner's ask of 20 Nov 2026; the order, the debugger protocol, the off-by-default setting and the test attach are the owner's choices | **Layer 1 built**: [design-record.md](design-record.md), Explorer. Layers 2 and 3: [debugging.md](debugging.md), designed in outline; layer 3 waits for a second probe |
| **Theming, round two**: the rest of the theme ideas from the owner's other programs, OnAir WyrmGrid and Republic Observatory (list below) | The owner's wish of 21 Nov 2026: "eventually" implement "the rest of the theming ideas from my other Svelte, etc. projects like OnAir" | Not designed; waits for the owner's word. [Theming, round two](#theming-round-two) lists what is left |
| **Reading code closer**: code coloured by VS Code's own grammars, with a VS Code theme brought in for the colours; any name pressed to reach its declaration (exact for C#, by name elsewhere); a change shown as lines and picture together, with the calls it took away and added, and a ring finder; jumps between a game's data files and its code | The owner's ask of 24 Nov 2026; the grammar switch with a theme brought in, Roslyn for C#, and all four picture parts are the owner's choices by card | **Steps 1 to 4 on the owner's go** (24 Nov 2026): [code-reading.md](code-reading.md). **Step 1 built**, 0.76.0 (VS Code's grammars and code colours); **step 2 built**, 0.77.0 (code colours from VS Code); **step 3 built**, 0.78.0 (lines and pictures lit together); **step 4 built**, 0.79.0 (names to follow in C#, on kit 1.111.0); **step 5 built**, 0.81.0 (names by name in Lua, Python and XML, on kit 1.115.0); **step 6 built**, 0.82.0 (calls gone and added, and the ring finder, on kit 1.116.0); **step 7 built**, 0.83.0 (jumps between data files and code, on kit 1.117.0, after the count of false matches); see `design-record.md`. Every step is built; none is tested on screen |
| **Going online**: releases and an updater, data feeds, a nightly watch of other authors' public source, report links and gate lights, an off-site copy in a bucket, and a signed installer (list below) | The owner's question of 23 Nov 2026 ("Are there any (further) online capabilities we can/should add to Companion?"), and their answers by card the same day: all four GitHub-side additions, both off-site routes, SignPath Foundation | **O2 to O4 designed** in [online.md](online.md), and four slices built (0.61.0 to 0.65.0: gate lights and the switches, the nightly watch, known problems, report links); O1, O5 and O6 wait for the owner's word. [Going online](#going-online) lists them |

## Going online

**The owner's question (23 Nov 2026):** whether the Companion should gain online capabilities that use GitHub's own servers, an
S3 provider or something else, paid or not. **Where it stood that day:** Companion 0.59.0 makes no network calls itself (the kit
reads Steam's public pages when a report asks), no release is published, and safe copies go to a plain folder, a private local
folder or a private git repository. **The owner's answers, by card:** every GitHub-side addition below (O1 to O4), **both** off-site
routes (O5), and SignPath Foundation for signing (O6). The order, the shapes and the cautions are the agent's, for the owner to
revise.

**One rule for all of it (agent's proposal, to confirm when the first is designed):** every online feature is off until switched
on or pressed, names what it contacts before it does, keeps its last answer so the page works offline, and sends nothing about the
person. The release audit's privacy line (C3, "makes no network calls") becomes a short list of the calls it can make. Nothing
here may become something the Companion needs in order to work (the owner's rule: owned, not leased).

| # | Addition | What it would give | Uses, and what it costs | What it needs first |
| --- | --- | --- | --- | --- |
| O1 | **Releases, built on GitHub, with an updater** | A person downloads a setup file from GitHub Releases, and About says when a newer version exists and fetches it. The build on GitHub's own Windows machine is also the clean-PC check | GitHub Releases and Actions; free for a public repository. Releases have no bandwidth limit and take files up to 2 GiB (GitHub's documentation, read 23 Nov 2026) | **Built in 0.85.0**: [releases.md](releases.md) (drafts the owner publishes, an auto-updater installing on close, the key a GitHub secret with the owner's copy, Windows first); waits on the owner's one-time key setup |
| O2 | **Data feeds** | The Companion improves without a new installer: sort rules of our own, known problems (a mod pulled from the Workshop, known clashes), Guide entries, themes | Plain data files in a public repository; free | The "what others bring is data, checked by the host" rule covers the shape. A format version, a check on each file, the last copy kept. The Guide's entries from outside (release audit B4's rest) are the same work |
| O3 | **Upstream watch at night** | Home warns when the public source of a mod we patch changed a method we patch, before its Workshop update arrives | A scheduled GitHub Actions run; free for a public repository | A kit command that reads public source only (no game files may be in a run), and a result file the Companion reads. **A limit to say on the page:** public source can differ from the Workshop build, so it is an early warning, and the check on the person's PC stays the real one. Generic first: a list of repositories and method names per game repository |
| O4 | **Report links and gate lights** | A drafted fault report opens GitHub's new-issue form already filled in, for the person to send themselves; Home shows whether each repository's last push passed its checks | GitHub's issue form address and its public API, with no login held | Report links also answer the release audit's C5 (a note turned into a report the person sends, shown whole first). The public API allows a small number of keyless requests an hour: read on a press or rarely, and keep the answer |
| O5 | **An off-site copy of what cannot be made again** (the owner chose both routes) | Saves, trainings, models and art masters outlive a fire, a theft or a dead power supply: by the kit's rule they go only to a private local folder, so on 23 Nov 2026 none of them left the house | **(a)** Synology's Hyper Backup from the NAS to a bucket, set up by the owner, no code of ours; covers only what is on the NAS. **(b)** A bucket as a new safe-copies destination in phobos-modkit, encrypted on the PC before upload, shown on the Companion's safe-copies panel. Paid: Backblaze B2 was US$6.95 per TB a month and Cloudflare R2 US$0.015 per GB a month, each with 10 GB free (their pricing pages, read 23 Nov 2026), so about US$1 a month for 100 GB | **(b) needs the owner's word on a shared rule**: `rules/safe-copies.md` keeps game-derived and personal files in a private local folder, and an encrypted bucket would be an exception, in the owner's wording. It also needs rclone (MIT) installed by the owner, run as a process, or a small S3 client of our own in the kit: undecided. The bucket is a second copy only: if payment stops, nothing stops working. **The encryption key must also be kept somewhere outside the house** |
| O6 | **A signed installer** (the owner's choice: SignPath Foundation) | Windows SmartScreen stops warning of an unrecognised program | SignPath Foundation signs open-source projects free of charge | O1's automated build (a condition of theirs), multi-factor login, a code signing policy page naming them, and the owner's application; the publisher shown is SignPath Foundation (their terms, read 23 Nov 2026). Azure's paid signing was set aside: a Microsoft answer of March 2026 says sign-up by individuals is paused |

**Set aside (agent's recommendation, 23 Nov 2026; the owner has not ruled on these):** a server of our own or any usage reporting
(something to keep alive, and against "nothing is sent anywhere"); an AI service inside the Companion (leased, not owned); a
bucket for public downloads (GitHub Releases already gives that free).

**O2 to O4 are designed together** in [online.md](online.md) (the owner's go-ahead and four answers of 23 Nov 2026), with what
they share and the build order.

**Suggested order (agent's lean):** O5(a) at once, being the owner's own step; then O1 with O6, which a first public release
needs; then O4, O2 and O3; O5(b) when the owner has worded the rule.

## Theming, round two

**The owner's wish (21 Nov 2026):** to bring in, eventually, the rest of the theming ideas from their other programs. Companion 0.33.0
took OnAir WyrmGrid's data-only themes (ADR-0009: choosing, bringing in, saving, removing, the maker, Phobos D'thorga and High
contrast), and 0.41.1 added the first colour the host derives from a theme (changed code's tints). **What is left**, read from each
program's own records on 21 Nov 2026 (agent's reading, to confirm with the owner when this is designed):

| # | Idea | From | What it would give |
| --- | --- | --- | --- |
| T1 | **A light theme** for a bright room (OnAir's Daylight) | OnAir WyrmGrid, its fourth built-in | A choice beside the dark ones; dark stays the default (the owner's preference) |
| T2 | **Where each theme came from**: built in, or brought in, and when it was brought in and last changed | OnAir WyrmGrid (`provenance`: bundled or local import, imported and updated times) | Knowing which themes are yours and how old they are |
| T3 | **Revisions kept, never overwritten**: bringing a theme in and using it are separate steps; the chosen one is pinned by its id, version and a hash of its contents; a broken chosen one falls back without the failed file being deleted | Republic Observatory, ADR-0015 | No theme lost to a bad edit, and evidence kept of what failed |
| T4 | **Remedies, not just ratios**: the maker says how to fix a failing pair (lighter or darker, and by about how much) | Republic Observatory, ADR-0015 | A theme author fixes a problem without guessing |
| T5 | **A contrast audit of every page** in every built-in theme and a generated "boundary" theme (one at the edge of every rule), in the browser check | Republic Observatory, ADR-0015 | Catches a component that draws a colour the theme checks never saw, as removed code's background was until 0.41.1 |
| T6 | **More colours the host derives and checks**, such as a tinted guidance surface for help and tutorial panels (a little of the success role over a surface, with ordinary and muted words checked on it) | Republic Observatory, accessibility guidance | The Guide's panels and tips stand out as help, readably, in every theme |
| T7 | **The atlas's colours from the theme**: places, labels and their halos as theme roles | OnAir WyrmGrid (`map_label`, `map_halo` and the like) | The globe matches the chosen theme instead of fixed ramps |
| T8 | **Text size, 100 to 200%**, as a setting beside the theme | Republic Observatory, ADR-0025 | Larger words for tired eyes, without a theme of their own |

**Not on this list**, as in both programs: fonts, pictures, layouts or any CSS in a theme, which stay refused. Community language
packs (OnAir's ADR-0010) are the same idea for words, and belong with translation, not theming.
