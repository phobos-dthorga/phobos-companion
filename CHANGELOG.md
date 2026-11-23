# D'thorga Companion changelog

Maintained from 9 November 2026.

## [Unreleased]

### Changed

- **AGENTS.md names everything the program writes**, as the architecture page found it (the owner, 23 Nov 2026: "fix those
  AGENTS gaps too"): the Looked at marks, the Workshop uploads switch, Save a picture, First steps' new games list and the
  daily safe copies' scheduled task join the list; the five kinds of going online are named; the two commands sent raw bytes
  are the stated exception to one-line commands; and a test now holds the rule that only a desktopClient.ts imports Tauri.
- **The kit pin moves from v1.102.0 to v1.105.1, and the shared rules it brings replace this repository's copies** (the owner's
  docs rewrite, step 2, 23 Nov 2026: "Move all 12 now"). AGENTS.md drops what the kit's every-session, brand and changelog rules
  now say; publishing.md points to the kit's own publishing guide for how the kit publishes, and debugging.md to its heap reader
  guide, so each is explained in one place. The kit also brings steam-publish's build output on standard error (1.105.1).
- **The architecture page explains the codebase in one place** (the owner's docs rewrite, step 4, 23 Nov 2026):
  `docs/architecture.md`, written fresh from the code, traces a press from the window through the host to the kit, with one
  table of where every piece of state lives, the security gates, the tests and a checklist for adding a page. AGENTS.md keeps
  every rule, one bullet a page, and points there for how each works; the design record's "How it is built" points there too.

### Fixed

- **The README and the Guide describe the window as it is now** (the owner's docs rewrite, step 1, 23 Nov 2026). The README
  opens with F1 and the Guide, names the pages the 1 to 9 keys really open, has the page list down the left in place of the page
  bar, lists everything the program writes (picks and decisions, the Mod list, the Publish page) and says plainly what it deletes
  on Clean up; the Guide's Settings entry says seven tabs, not six. The design record's opening and its Limits no longer say
  nothing has been judged on screen or that it needs Python on the PATH.

## [0.69.2] - 2026-11-23

Two fixes from the owner's screen notes of 23 Nov 2026. Not yet tested on screen.

### Fixed

- **The Mods page's Textures tab can encode, as Before you play can.** It listed the mods whose textures want encoding but had no
  button, so the press was found only on the other tab ("How come I cannot encode the textures?"). **Encode their textures**
  now sits under the list, asks first, and waits while the game runs, as the one on Before you play does.
- **The Picks page lets go of the last "Kept" line when you open another pick yourself.** It went on saying "Kept: Try 83 for
  n11-window" while n11-suppression was open, which read as the wrong name tied to that sound. Every pick had been kept for its
  own name, and the sounds made from them were the right ones. The move to the next waiting pick after a press still shows
  the line, as it says what that press did.

## [0.69.1] - 2026-11-23

A fix from the owner's report of 23 Nov 2026. Not yet tested on screen.

### Fixed

- **Save a picture works on the Picks page.** It failed with "The picture could not be made: [object Event]": the tries are shown
  from addresses held in the window's memory, and the installed program's security policy let the window show them but not read
  them back, which drawing a picture does. The policy now lets it read them.
- **A picture on a page that cannot be read leaves a crossed grey box in the saved picture**, rather than failing the whole
  picture, and a failure that does happen says so in words, never as "[object Event]".
- **The browser checks can run a page under the installed program's security policy** (`useInstalledPolicy`), as they never had:
  the Picks page's picture is checked that way, with its tries readable and with them refused.

## [0.69.0] - 2026-11-23

A Publish page for the Steam Workshop, for any game. Kit pin v1.96.0 to v1.102.0.

### Added

- **Publish** (the owner, 23 Nov 2026: Ostranauts' publishing scripts brought over "in a visual way for the user to modify and
  upload their mods easily", "genericized as far as is possible"; the owner's choices on question cards: both senders chosen per
  upload, editing in the Companion, Workshop uploads starting on; `docs/publishing.md`). For every repository of the game that keeps
  a Workshop catalogue (`config/workshop-publishing.json`): a card per mod, dependencies first, with its item or **Not on Steam
  yet**, the version here against the one on Steam, its visibility, what holds it back and its one next step. The mod's own view
  has four tabs: **Workshop page** (the page's BBCode beside Steam's look, a byte counter against the budget, and every problem
  the tools find a moment after typing stops; **Save the page** writes the file only when it has none), **Change note** (exactly
  what Steam will get), **On Steam** (item, visibility, tags, Required items, cover, hold, what is still to do on Steam) and
  **Uploads** (each receipt). Keys: **Shift + W** opens it; **J** and **K** step through the mods.
- **Prepare** (**E**) writes the mod's release notes and stages a checked candidate, building it first unless **Build first** is
  unpressed; nothing reaches Steam.
- **Upload privately**, **Send the update** (**Shift + U**), **Make public** (**Shift + M**) and **Update all waiting**
  (**Shift + A**), each only after a yes; **making an item public asks twice**, the second naming everyone. The host runs them only
  while the kit's manifest calls them `owner-press` and the Workshop uploads setting is on. **How uploads reach Steam**: **The
  Steam client** (signed in, no password; sets tags and Required items) or **SteamCMD** in a window of its own, where you type your
  login. **Nothing has been sent to Steam from the Companion yet.**
- **Read Steam back** (**B**) reads each item from Steam's public pages, without an account, and marks its version Released in
  the changelog; **Open in Steam** (**O**) opens the item.
- **Workshop uploads**, a new setting on **Settings**, on the new **Publishing** tab: **On** (the default) or **Off**. Off hides
  Upload, Make public and Update all waiting, and the host refuses an upload; reading, editing pages and preparing stay.
- **Workshop pages**, a new kind under **Settings**, **Going online**: Read Steam back's call to Steam's public API. On by
  default, as every kind is.
- **Home says when Workshop updates wait**, read at most every half hour, with **Go to Publish**.
- **Guide**: the Publish page, and Put a mod on the Steam Workshop, or update one.

### Changed

- **The core can hand a tool text on its standard input** (`kit::run_with_input`), so a page's text never travels as an
  argument, and **checks a report is the owner's to press** (`kit::allowed_on_press`) before the program runs one.

Checked on two games' repositories, read only: the tools' `steam-publish status` at the new pin reads phobos-rimworld (8 mods,
every one held) and phobos-ostranauts (10 items already on the Workshop, 4 held). The page was checked in the browser against a
stand-in host. Not yet tested on screen, and nothing has been sent to Steam from it.

## [0.68.1] - 2026-11-23

### Fixed

- **A press on one sound no longer shows on every other** (the owner, 23 Nov 2026: picking one choice for a sound "picks all
  other of those same choices for ALL OTHER sounds too"). The sound panel's **Choose this one** said only which side the **Y** key
  plays, but the panel stays on screen from sound to sound and kept that side, so every later sound showed the same side
  "Chosen". Each new sound, try, file or screenshot now starts with **Y** on the after side: on Picks, the try in focus. Nothing
  was ever kept by that button: picks are kept only by **Pick Try …** and **None of these**, and the answers already kept were
  each their own.
- **The button no longer sounds like a pick**: **Have Y play this one**, and **Y plays this one** once pressed; the line above the
  players and the Z and Y shortcuts in Settings say "which one Y plays" too.
- **A band made with Play the band … alone is let go when the sound changes**, so it no longer plays under the next sound's name;
  one still being made when the sound changes is thrown away.
- **Guide**: Pick a picture or a sound and Compare a changed picture or sound say what Y and Z do, and that each sound starts
  again.

Not yet tested on screen.

## [0.68.0] - 2026-11-23

Backups kept as zips, and Save a picture takes the whole window. Kit pin v1.95.0 to v1.96.0.

### Changed

- **Each mod backup is one zip file** (the owner's choice of 23 Nov 2026, "One zip per backup"): **Back up the installed copy**
  writes one, checked file for file, and **Go back to this** unpacks it. Backups made before stay folders until **the next install
  or go-back packs them**, each checked first; its report says how much space that saved. On the owner's RimWorld backups that is
  4,254 MB as folders against about 855 MB as zips; the largest, 735 MB, became 95 MB in 7 seconds. Compare still shows a changed
  picture from a zipped backup, and Remove repeated backups finds repeats among zips and folders alike.
- **Guide**: the Backup entry says backups are zips, and when older ones are packed.
- **Save a picture takes the whole window** (the owner's choice of 23 Nov 2026): the bar on top, the page list and the details
  beside the page, as well as the page with its scrolled parts. Until now it drew only the page, which left out the pages' numbers
  and the game looked at. **Guide**: Save a picture of a page says so.

Not yet tested on screen.

## [0.67.0] - 2026-11-23

Scans in the background, for the page list's numbers (the owner, 23 Nov 2026: "a scan after updating to see if a sort is needed
and then ... some sort of sign/figure next to Mod List", with every other scan chosen by card).

### Added

- **A number beside Mod list**: the problems and warnings its check finds (a mod missing, listed twice, needing another, clashing,
  in the wrong order) plus how many mods a sort would move. No number means the list is sound and sorted.
- **A number beside Logs**: new errors the game's first run showed after your last change to the mod list.
- **Mods counts more**: what Before you play lists as to do (a build, changes not installed, textures to encode) and updates since
  you last played that changed a method your mods patch, added to the settings to look at.
- **A mark beside About** when a newer version of the Companion waits in its repository.
- **The scans run by themselves, and only read**: when the Companion starts, for each game you look at, on **Look again**, and when
  you come back to its window once the last scan is five minutes old, which is when an update may have arrived. A number already
  shown stays until its new answer arrives. On the owner's list the mod list check takes about 4 seconds and the sort preview
  about 2.
- **Guide**: Home's entry says what each number counts and when the scans run.

Not yet tested on screen.

## [0.66.1] - 2026-11-23

### Fixed

- **A tab's key stays on one line.** "Alt + 1" beside a tab's name broke after the plus, dropping the number beneath it (the
  owner's picture of the Mods page, 23 Nov 2026). The keys beside the pages on the left hold to one line the same way.

## [0.66.0] - 2026-11-23

A tidier window (the owner's choices of 23 Nov 2026, made on a mock-up first): the pages down the left, and Settings, Mods and
About in tabs. Kit pin v1.94.0 to v1.95.0.

### Changed

- **The pages are a list down the left side**, in place of the bar across the top that wrapped onto several lines: still grouped
  as Play, Code and Tools, each with its key beside it. **A number beside a page says how many things there wait on you**:
  decisions and picks to answer (while features for agent sessions show), test rows seen working that nobody has judged, and mod
  settings to look at. No number means nothing waits. Its rows are 40 px, so every page shows without scrolling.
- **One bar on top** where there were two: the brand, **the game you are looking at**, which opens your games with when you last
  worked on each, and Back, Forward, Go to anything and the rest. **[** and **]** still step through the games.
- **Settings is in six tabs**: Look and keys, Games, Folders and files, Going online, Backups and space, and Agent sessions.
  **Folders and files lists each setting on one line**, with its short name, its value and where the value comes from; press a
  line to open it. Buttons above choose every setting, those for every game, one game's, or **Needs you** (naming something not on
  this PC), and the tab says how many need you.
- **Mods is in three tabs**: Before you play (with Since you last played and Settings to look at), Installed and backups, and
  Textures. Before you play says how many things are to do; Textures how many mods want encoding.
- **About is in four tabs**: This version (marked when a newer one waits), Where it lives, What it asks the internet, and Built with.
- **Every tab is a place of its own**: a step of the trail, so Back returns to the tab you left, with its own address, and listed in
  Go to anything ("Settings › Folders and files"). Links that led to a part of these pages before (Home's notes, the Guide's Take
  me there) open its tab. Go to anything names each setting by its short name.

### Added

- **Keys for tabs**: **;** and **'** step to the tab before or after, and **Alt + 1** to **Alt + 9** jump to a tab, on any page with
  tabs. Each can be changed in Settings, on Look and keys.
- **Your games, on Home**: every game with when you last worked on it, and **Look at this** to switch.
- **Guide**: Home's entry explains the page list, the counts and the picker; Settings, Mods and About describe their tabs and keys;
  every How do I…? that leads to them names its tab.

Checked with the kit's `settings list` on phobos-rimworld's and phobos-ostranauts' repositories: every setting the kit reads has
its short name; a repository's own settings without one (phobos-rimworld's five art and AI tool folders) show their full sentence.
Not yet tested on screen.

## [0.65.0] - 2026-11-23

The fourth slice of going online (`docs/online.md`, O4: report links; the owner's choice of the Logs page only). Kit pin
v1.93.0 to v1.94.0.

### Added

- **Report links on the Logs page**: under the mods a fault points at, for a mod of yours on GitHub, **Report this on GitHub**
  opens your repository's new-issue form in your browser, filled in with the fault, how often and when, the game version, the
  stack and the lines as written (a report too long for the address goes on your clipboard to paste). For another author's mod
  whose public source is known, **Their reports** lists their issues, those naming the fault's words first, and **Their
  new-issue form** opens it blank, as the reports rule asks. **The Companion never posts anything.** On the owner's PC, D'thorga
  Framework reads as yours; Vehicle Framework, Combat Extended and Adaptive Storage Framework as theirs. Not yet tested on
  screen.
- **Their reports, in Settings → Going online**: its own switch, on by default, contacting api.github.com only on a press.
- **Guide**: the Logs page and "Choose what the Companion asks the internet" name report links.

### Changed

- **One place hands an address to the system** (`companion_core::process::open_address`): the Mod list's Steam pages and the
  report links both use it.

## [0.64.0] - 2026-11-23

The third slice of going online (`docs/online.md`, O2: known problems; the owner's choice of "public, facts and links"). Kit pin
v1.92.0 to v1.93.0.

### Added

- **Known problems on the Mod list**: What's wrong warns when mods on your list are known to go wrong together, with what goes
  wrong, what to do, and when and against what it was checked, read from the known-problems feeds your repositories publish.
  phobos-rimworld publishes three (23 Nov 2026), each checked against the authors' newest source or Workshop build first:
  Adaptive Storage's empty Chunk A, Chunk B or Bundle D on 1.7; Mounted Weapons with Combat Extended's autoloaders; and UI
  Rethemed - Colonist Card's Tab buttons with Dubs Mint Menus. On the owner's list two show; the Colonist Card one shows though
  its setting is already off, since the check can't read a mod's settings. Not yet tested on screen.
- **Known problems, in Settings → Going online**: its own switch, **on by default** (the owner's choice), contacting
  raw.githubusercontent.com at most every six hours. Switching it off asks first. Not yet tested on screen.
- **Guide**: the Mod list and "Choose what the Companion asks the internet" name known problems.

## [0.63.0] - 2026-11-23

The second slice of going online (`docs/online.md`, O3's nightly watch). Kit pin v1.91.0 to v1.92.0.

### Added

- **Their code changed, on Home**: what the nightly watch on GitHub's own machine found in the public source of mods yours patch:
  each commit that touches a method your code names, newest first, with its date and words, the method, and your line that names
  it, before those authors' updates reach you. Read from each repository's results branch; a repository with no nightly run shows
  nothing. When GitHub can't be reached, Home shows the watch's last answer and says from when. phobos-rimworld's first nightly
  run (23 Nov 2026) found 16 such commits in 24 mods' source. Not yet tested on screen.
- **Nightly watch, in Settings → Going online**: its own switch, **on by default** (the owner's choice), contacting
  raw.githubusercontent.com at most every six hours, outside GitHub's hourly calls. Switching it off asks first: you would hear
  of such a change only after the update reaches you. Not yet tested on screen.
- **Guide**: "Choose what the Companion asks the internet" and Home's entry name the nightly watch.

## [0.62.0] - 2026-11-23

After the owner's full re-sort preview with 0.60.0 (23 Nov 2026: "Thoughts?"); the owner chose all three fixes on a question
card. Kit pin v1.89.0 to v1.91.0.

### Changed

- **When no rule needs any move, Not now comes first** in Sort's last step, and the other button reads **Use this order anyway**:
  a full re-sort stays there, without the page leaning towards it. Not yet tested on screen.
- **Only mods that pass a mod of another group are folded as moved into their group** (kit 1.91.0); one that only changes places
  inside its group joins the names fold. On the owner's list the five "moved into their group" were already in it: all 134 moves
  are now names moves.
- **A group move's reason follows the links back to the framework** (kit 1.91.0): "Combat Extended loads after it, and Vehicle
  Framework after Combat Extended", not only the nearest link. The Guide's Mod list page says both.

## [0.61.0] - 2026-11-23

The first slice of going online (`docs/online.md`, O4's gate lights; the owner's go-ahead and answers of 23 Nov 2026). Kit pin
v1.88.0 to v1.89.0.

### Added

- **Checks on GitHub, on Home**: for each of the game's repositories, commits not pushed, files changed, and whether its last
  push passed its checks on GitHub (passed, failed with which check, still running, no run yet for the last push, no checks), each
  with a mark as well as a colour, and any nightly run that has not run for two days. Home's own look asks GitHub only what may
  have changed since (after a push, while a check runs, or once a day); **Look now** asks at once. When GitHub can't be reached,
  the lights are its last answer, and Home says from when. Under it, how many of the hour's 60 keyless GitHub calls are left,
  shared by every tool. Not yet tested on screen.
- **Going online, in Settings**: every kind of call the Companion makes to the internet by itself, the address it contacts, and
  its switch, **on by default for the repositories on your list** (the owner's choice). Switching off one whose loss is severe
  first says what stops working, with **Switch it off** or **Keep it on**. Off means off: no call of that kind, by itself or on a
  press. The first kind is **Gate lights** (api.github.com). Not yet tested on screen.
- **What the Companion asks the internet, on About** (the release audit's C3): the same kinds, with whether each is on, and the
  Steam calls the Mod list makes. Not yet tested on screen.
- **Guide**: "Choose what the Companion asks the internet", and Home, Settings and About name the new parts.

## [0.60.0] - 2026-11-23

After the owner's first full re-sort preview with 0.59.0 (23 Nov 2026: "What are your thoughts here?"): all 146 moves on their list
were group or name-order moves, with no rule broken. Kit pin v1.86.0 to v1.88.0.

### Changed

- **When no rule needs any move, Sort says so**: "No rule needs any of these moves: your order already obeys every rule", with
  nothing to gain from using the order, in place of an empty list of rule moves. Not yet tested on screen.
- **Each group move shows its own reason** when the fold is opened ("a known framework, so it goes in the frameworks' group", or
  which mod loads after it), from kit 1.88.0, one to a line.
- **A mod others' code builds on is no longer pulled up with the frameworks** in a full re-sort (kit 1.88.0, the owner's choice of
  23 Nov 2026), and a mod whose place number stays is no longer listed as moved. On the owner's list a full re-sort now moves 134
  mods (5 into their group, 129 for names, none for a rule), with Vanilla Expanded Framework 13th, Combat Extended 18th and
  Vehicle Framework 21st, and Vanilla Vehicles Expanded, Dubs Bad Hygiene and Rimefeller no longer lifted.

## [0.59.0] - 2026-11-23

The Mod list's Sort after the RimSort study (the owner's choices on question cards of 23 Nov 2026: a full re-sort's moves
grouped, and the sorter's groups as RimSort's tiers). Kit pin v1.85.0 to v1.86.0.

### Changed

- **A full re-sort's moves are told apart**: moves a rule asks for are listed first, each with its reason, as before; mods moved
  only into their group, and those moved only to put names in order, are folded below in compact rows (from, to and name), to
  open when wanted. On the owner's list that was 146 moves: 23 into their group and 123 for names. A move from an older kit
  counts as a rule's. Not yet tested on screen.
- **The sorter sorts in groups, as RimSort does** (kit 1.86.0): the game's own and its loaders first, then frameworks and "load at
  the top" mods (each with what it must load after), then the rest, then "load at the bottom" mods. "Top" and "bottom" now mean
  the group, as in RimSort; frameworks' needs make no order rule; Workshop pages are the weakest rule. On the owner's list fewest
  moves finds none, and a full re-sort keeps Vanilla Expanded Framework 20th, Combat Extended 25th and Vehicle Framework 33rd.
  The Guide's Mod list page, Sort the mod list and Load order rule say so, and the loop words name Workshop pages as giving way
  first.

## [0.58.0] - 2026-11-23

### Changed

- **The zoom, the ground, the view, the tolerance, the side flicked to and the marks are kept between runs too** (the owner,
  23 Nov 2026: "save the view settings between sessions too"), each place its own, in the window's own storage. Every value is
  checked as it is read back, so one this version does not offer starts that place afresh. Not yet tested on screen.

## [0.57.0] - 2026-11-23

Picks made easier to compare (the owner, 23 Nov 2026: "the remembered image size, background colour, etc. should be remembered
between each pick. It makes it VERY HARD to compare otherwise", and on question cards, both altered forms of the compare tool).

### Changed

- **The zoom, the ground, the view, the tolerance and the side flicked to stay as you left them** when you move to the next pick,
  try, file or screenshot, for the whole run; each place (Picks, the code viewer, the Mods page, encoded textures, screenshots)
  keeps its own. **The last picture stays on screen while the next is read**, so nothing jumps. Not yet tested on screen.

### Added

- **Picks: Compare with** the one in use now or **any other try**: a new picture with nothing in use is compared too, and a
  correction try shows what the fix touched (flick with Z, side by side, or what changed). Not yet tested on screen.
- **Mark loose specks and fringes**, wherever a picture is compared: the edge check's loose specks, loose strokes, pale fringe and
  haze painted in the accent colour, counted beside the picture. The same figures as `edge_check.py`: equal on all 53 of your
  textures checked, 15 of them with something loose. Not yet tested on screen.
## [0.56.0] - 2026-11-23

Helpers for the player in the Mod list (the owner, 23 Nov 2026: "Is there anything more we can do, especially to help the
player?"; their choices on a question card: all four, with a caution on Full re-sort).

### Added

- **Mod list: did my change break it?** At the top of each list on What's wrong, the first game run after your last change,
  compared with the run before: its new errors with what the log points at, **Undo the last change** (asked first, in the note)
  and **Go back to a list that ran clean…**; a clean run, a change not yet run and a list changed outside the Companion are said
  in a line. Home's note also says when a change was followed by new errors. New since is not the same as caused by, and the
  note says so. Only runs that both loaded a save (or neither) are compared (kit 1.85.0). Not yet tested on screen.
- **Saved lists: Ran clean.** A list kept at a game start is marked **Ran clean** (or with its new errors) once the game has run
  on it and closed; **Go back to the last list that ran clean** compares the newest such list with yours, then **Use this list**
  loads it. Not yet tested on screen.
- **What's wrong, more notes**: a library several mods carry where an older copy loads first; mods that do not say they work
  with the game's version but likely do (a folder for it, their Workshop page, the community's list, or no errors from them in
  your last game) in one note, so only the doubtful stay apart; and a continued version of an old or missing mod from the
  community's Use This Instead list, with **Open in Steam** and **Subscribe**. Not yet tested on screen.

### Changed

- **Full re-sort says what it costs**: before Use this order, it says how many of your mods it moves, and that fewest moves only
  moves what a rule says is out of place.
- Tool kit pin v1.84.0 to v1.85.0.
## [0.55.0] - 2026-11-23

The Picks page (the owner, 23 Nov 2026: "Go ahead and build the picks page", after answering its design's three questions).

### Added

- **Picks** (Tools, **Shift + P**): every picture and sound the art tools made tries of, waiting for your pick, from every
  repository that keeps a list of them (`config/picks.json`, kit 1.83.0's `picks`). Each shows its tries small and side by side,
  and the try in focus against the one in use with the code viewer's views, on the game's own grounds too (Soil and Dark stone for
  RimWorld). **J** and **K** step through the tries, **Shift + J** and **Shift + K** through the picks; **Pick Try …** (**Ctrl +
  Enter**) or **None of these** (**Shift + N**), with words if you like, and the next waiting pick opens. Your pick is kept in the
  Companion's own folder; an agent session applies it and it leaves the list. Home says how many wait. Shown with the other features
  for agent sessions. phobos-rimworld's `review_cards.py` offers every card's tries here, and `sound_review.py --offer` its sounds.
  Guide: Picks, and Pick a picture or a sound the art tools made. Not yet tested on screen.

### Changed

- **Keys, now every letter is taken** (your choice of 23 Nov 2026): a key held with **Shift** before a letter is a key of its own,
  and a key may repeat where its two places are never on screen together, given a like move in each (**J** and **K** step through
  files in the code viewer and tries on Picks). Shift with a letter no longer does what the letter alone does.
- **Z, Y and = work wherever a picture or sound is compared**: on the Mods page and Picks too, not only in the code viewer and on a
  screenshot. They are listed under their own heading in Change keyboard shortcuts; a key you had changed for them before is back
  to its default.
## [0.54.0] - 2026-11-23

From the owner's log of 23 Nov 2026: after a Full re-sort, I Am Mother's compat code failed to load and a save's mechs went
missing, because the re-sort put Vanilla Expanded Framework and other frameworks far below mods that build on them without saying
so. Undo the last change put the list back; nothing was saved in between.

### Added

- **Sort reads what each mod's code builds on** (kit 1.84.0): a mod loads after any mod whose classes its own code builds on,
  read from the mods' assemblies, which catches what neither mod's files say. A new badge, **Its code**, names those rules, and
  their count shows beside the others; in a loop they give way only to yours. **What's wrong** shows a mod loading before what its
  code builds on as a problem. Guide: Load-order rule. Not yet tested on screen.

### Changed

- **Full re-sort puts libraries first** (kit 1.84.0): after the game's own, the mods others depend on come first, the most used
  first, then the rest by name, so frameworks stay near the top. Fewest moves is unchanged. Not yet tested on screen.
- Tool kit pin v1.82.0 to v1.84.0.
### Changed

- **The picks page's design has your answers** (`docs/picks-page.md`): picks listed from a file each repository keeps, a pick kept
  as an answer for the next session to apply, and keys that may repeat where never on screen together or be held with Shift, Ctrl or
  Alt, now the shortcut rule in `AGENTS.md`. Nothing is built yet.

## [0.53.0] - 2026-11-23

Pictures and sounds beyond the code viewer (the owner, 23 Nov 2026: "Can we introduce these new features anywhere else?", choosing
all four smaller places, the encoded texture check and the picks page as a design first, in one batch).

### Added

- **Mods page: Compare a changed picture or sound before installing or going back.** **Compare** beside each picture, texture or
  sound in **Show the files**: installed now against **In the repository**, or against one of the five newest backups, with the code
  viewer's views. Guide: the Mods page. Not yet tested on screen.
- **Mods page: Compare pictures with their encoded textures** on each mod: every picture beside the texture the game loads in its
  place, turned the right way up (RimSort's preset stores it upside down), with the stale, never-encoded and left-over ones picked
  out; What changed starts at 16 levels, since encoding shifts most pixels a little. RimWorld's tools pair them (563 for D'thorga
  Vehicles). Not yet tested on screen.
- **Changes: a repository with no changelog lists its commits**, twenty a page, each with **Show the code**, pictures and textures
  included: Workers & Resources' buildings (45 commits, 208 DDS textures) can be seen for the first time. Not yet tested on screen.
- **Mod list: The mod in focus** on Edit the list shows the picture of the mod last moved to or pressed, as the game's mod menu
  shows it (399 of your 407 RimWorld mods have one). Not yet tested on screen.
- **Screenshots: zoom, grounds, and Compare with the one before or after**, flicked with **Z** or with what changed marked. Not yet
  tested on screen.
- **What changed lets small differences pass**: **Exact**, **4**, **16** and **64 levels**, everywhere it is shown. Your screenshot
  of 23 Nov showed why: tanks exported again marked 92,971 pixels for a pale line round their edges.
- **The picks page, designed** ([docs/picks-page.md](docs/picks-page.md)): picture and sound picks inside the Companion. Three
  questions wait for you; nothing is built.

### Changed

- Tool kit pin v1.78.0 to v1.82.0. The installs read is unredacted, for each copy's folder.

### Seen working on screen

- **Show what changed** in the code viewer (0.50.0), at 1×: your screenshot of 23 Nov 2026.
## [0.52.0] - 2026-11-23

### Changed

- **Fit shows the whole picture in the code viewer.** It fitted the width alone, so a small icon (your 128 × 128 MealHalt, in your
  screenshot of 22 Nov) came out about 750 pixels square with its bottom half cut off. Now the whole picture fits its frame both ways,
  no taller than half the window: a small one is enlarged by a whole number so every pixel stays an even square, and a large one is
  shrunk to fit. Side by side fits each half the same way. 1× to 8× are unchanged. Not yet tested on screen.

### Seen working on screen

- **A new picture in the code viewer** (0.50.0), with its size and its Save a copy and Open with its own program buttons: your
  screenshot of 22 Nov 2026. Flicking, Show what changed, DDS textures, sounds and pressing the copy buttons are not yet tested on
  screen.
## [0.51.0] - 2026-11-23

### Added

- **Sort reads the Workshop's required items** (the owner, 23 Nov 2026: "add RimSort's Workshop database as a source"): a mod
  loads after each item its Workshop page lists as required, read from RimSort's Steam Workshop Database, which catches needs a mod
  never wrote into its own files. A new badge, **Its Workshop page**, names those rules, and the count of them shows beside the
  others. In a loop of rules they give way before needs, a mod's own and yours, after the community rules. Guide: Load-order rule.
  Not yet tested on screen.

### Changed

- Tool kit pin v1.78.0 to 1.79.0 (commit 665a602).
## [0.50.0] - 2026-11-22

Pictures and sounds in the code viewer (the owner, 22 Nov 2026: "We should support the ability to display multimedia in parts like
this", of the code behind Vehicles 0.105.2, which could only say a changed picture "isn't text").

### Added

- **The code viewer draws changed pictures and textures and plays changed sounds.** A picture: **Side by side**, **Flick between
  them** (**Z**), and **Show what changed** (every changed pixel marked in the accent colour, boxed and counted), at **Fit** to
  **8×** (**=**) on **Checks**, **Dark** or **Light**. DDS textures are decoded in the window: BC1 to BC5 (DXT1 to DXT5) and BC7,
  bit-exact with Pillow on every block kind, 60 Workers & Resources textures and 10 of your installed BC7 RimWorld textures. A sound:
  a player for each version (**Z** chooses, **Y** plays), its loudness (BS.1770, as ffmpeg reads it), peak, highs above 4 kHz and
  any steady whine (your sound review tool's search), its waveform and its spectrogram with 4 kHz and 15 kHz marked, and **the band
  alone, moved down** to 1 kHz at a steady loudness. Any other file shows its kind and its size before and after. Guide: Compare a
  changed picture or sound. **Not yet tested on screen.**
- **Save a copy of before or after**, for any file that isn't text, where you choose; **Open with its own program** for pictures,
  sounds, models, fonts, documents and archives (a copy, let go after a day), never for a program.

### Changed

- Tool kit pin v1.77.0 to v1.78.0 (each binary file's kind and sizes). The window may now play sounds it decoded itself
  (`media-src 'self' blob:` in its content policy).
## [0.49.0] - 2026-11-22

Step 5 of the program's own mod manager (the owner, 22 Nov 2026: "Start step 5, subscribing through Steam").

### Added

- **Mod list: subscribing through Steam.** **Subscribe** beside a missing mod on What's wrong (and a needed mod not on this PC, or
  one Steam no longer keeps for you), beside each missing mod in Saved lists with **Subscribe to all**, and **Subscribe by Workshop
  link or number** in Edit the list: Steam subscribes at once, a bar shows the download, then the page checks or compares again,
  or offers **Switch on**. **Unsubscribe…** in Edit the list asks first, switches the mods off (after a backup), then Steam deletes
  their files. Through the Steam client already running and signed in, borrowing the game's own Steam library for the seconds a
  press takes (Steam shows you as playing the game meanwhile); no password is asked for or kept. Guide: Subscribe or unsubscribe
  to Workshop mods without leaving the Companion. **Not yet tested on screen, nor against a real Steam client**: the first real
  subscribe is your own press.

### Changed

- Tool kit pin v1.76.0 to v1.77.0.
## [0.48.0] - 2026-11-22

Step 4 of the program's own mod manager (the owner, 22 Nov 2026: "Start step 4, saved lists").

### Added

- **Mod list: Saved lists.** **Save the list** keeps the game's list by name. Lists to load: **Saved by name**, **Kept at each game
  start** (a copy each time the game starts with a different list, noticed the next time the Companion reads it), **From your
  saves** (the mods each save was played with) and **RimSort's history**, or **Open a file…** (the game's own `.rml`, a save, an
  exported RimSort list). **Compare** shows how many mods would switch on, switch off and move, and names each mod not on this PC
  with why, with **Open in Steam** or **Find on the Workshop**; **Use this list** loads it, leaving those out, after a backup, and
  Undo takes it back. **Save as a file…** writes any list as the game's own `.rml`, which the game's mod menu loads too. Saves and
  RimSort's files are only read. Guide: Save a mod list, or load one from a save, RimSort or a file. Not yet tested on screen.

### Changed

- Tool kit pin v1.74.0 to v1.76.0.
## [0.47.0] - 2026-11-22

Step 3 of the program's own mod manager (the owner, 22 Nov 2026: "Start the sorter now", mods moved "more freely", the page tidied,
and "extra colours/shades ... as appropriate to each theme").

### Added

- **Mod list: Sort.** **Sort: fewest moves** keeps your order and moves only the mods a rule says are in the wrong place; **Full
  re-sort** rebuilds the whole order, as RimSort does. Each move shows from where to where, which way, and whose rule asked for it
  (your rule, its own files, needs, community); rules that go round in a loop are named, with the one set aside. **Nothing is
  written until Use this order**, after a backup, and Undo takes it back. **Your rules**: make one by finding the mods by name
  (after, before, at the top, at the bottom), take one away; your RimSort rules and the community rules are read as they are.
  Guide: Sort the mod list, and keep a rule of your own; Load-order rule. Not yet tested on screen.
- **Edit the list moves mods freely.** Choose any number of mods with Space or a click, then **Carry (Enter)** them with Up, Down,
  Page Up, Page Down, Home and End and put them down with Enter; or **Put after…** or **Put before…** a mod found by typing part of
  its name; or give a **Place**; or drag them. Mods switched off can be **Switched on after…** one found by name. Several mods
  moved together are one change. Not yet tested on screen.
- **Shades from each theme**: chosen and carried rows, the badges for where a mod comes from and whose rule, the sort's moves and
  What's wrong's problems and warnings take a soft shade of the theme's own colours; words always say the same. Both theme checks
  now hold words to the shades too.

### Changed

- **Edit the list is tidier**: one scroll instead of pages of 40, and one bar of actions for the chosen mods instead of six buttons
  on every row; the bar stays in view as the list scrolls.
- Tool kit pin v1.73.0 to v1.74.0.
## [0.46.0] - 2026-11-22

Step 2 of the program's own mod manager (the owner, 22 Nov 2026: switching mods on and off and moving them, each change saved at
once, from the keyboard).

### Added

- **Mod list: Edit the list.** Every mod on this PC, **Switched on** in load order and **Switched off** by name, with **Find a mod**
  (names, ids, authors) and **Show** and **From** filters. **Switch on**, **Switch off**, **Move up**, **Move down**, a place typed
  then **Move to**, or **Move…** then **Put it at**: each press is saved at once, after a backup of the list. Changes wait while
  the game or RimSort is open. The page's two views are chosen at its top: **What's wrong** and **Edit the list**; coming back to
  What's wrong checks again. Guide: Switch a mod on or off, or move it in the load order. Checked with the kit on RimWorld and
  Project Zomboid. Not yet tested on screen.

### Changed

- **Undo the last change walks back one change at a time**: pressed again, it goes back on the change before (kit 1.73.0).
- Tool kit pin v1.72.0 to v1.73.0.

## [0.45.2] - 2026-11-22

From the owner's screenshot of 22 Nov 2026: the Mods page stopped at "Matching … changelog entries to their commits" and never showed the mods. Not yet tested on screen.

### Fixed

- **The Mods page shows the mods again when one mod names a setting in two settings classes**, as D'thorga Medical now does for its three radiation settings. The page told each setting apart by its name alone, met the same name twice, and stopped drawing while the tools had long finished; it now tells them apart by class and name. Found by feeding your own Mods answers into the page; a test now holds a setting named twice.

## [0.45.1] - 2026-11-22

### Fixed

- **Starting up says "Reading your list…" again**, not "Reading Steam's games…": the word file held one key twice, and the second
  meaning hid the first. Add a game from Steam keeps its own words, and a test now refuses a key written twice.

## [0.45.0] - 2026-11-22

The first step of the program's own mod manager (the owner, 22 Nov 2026: "We actually should have our own, third-party, mod
managing", after RimSort said only "1 missing mod" for a patch its author had taken off the Workshop).

### Added

- **Mod list: what is wrong with a game's list of active mods, and why** (the **S** key; Guide: Mod list, and Fix a missing mod or
  another mod list problem). For each list the game loads: problems (a mod switched on but not on this PC, with the likeliest
  reason it went; a mod another needs that is off or missing; two that refuse each other; one listed twice), warnings (wrong
  order; a mod the Workshop no longer has, or Steam no longer updates for you) and notes (game versions, folded away; what the
  check could not see). A missing patch gets a clue when one of the mods it joined now names the other in its own files.
  **Each change it offers waits for a yes on its card**, keeps a backup of the list first, and **Undo the last change** puts it
  back; changes wait while the game or RimSort is open. **Open in Steam** opens a mod's Workshop page in Steam. **Ask Steam too**
  checks which Workshop items still exist. RimWorld and Project Zomboid; other games are told in words. Checked with the kit on
  RimWorld and Project Zomboid. Not yet tested on screen.
- **Home notes a mod list with problems or warnings**, read quietly at most every half hour, leading to the page.

### Changed

- Tool kit pin v1.71.0 to v1.72.0 (`mod-list`).

## [0.44.0] - 2026-11-22

Safe copies for every game (the owner, 22 Nov 2026: "work across as many individual games and their mods from the get go"). Not yet tested on screen.

### Added

- **The game's own files on its Safe copies card**: its saves and settings, from the list a repository keeps for the game (the tools keep yours for RimWorld, Ostranauts, Kenshi and Project Zomboid). Copy now, Check the copies, Restore… and Let go… work on it as on any list. A save that is a folder, as in Kenshi and Ostranauts, is copied, listed and let go whole.
- **Daily safe copies**, at the foot of the card: press **Every day at 03:00** (or 09:00, 13:00, 19:00) to run every list of every game once a day by itself, then check every copy; **Turn off** removes it. The card says when it runs next and how the last run went. It is one Windows scheduled task of your own, "D'thorga Safe Copies"; a run missed while the PC was off happens at your next sign-in.

### Changed

- Tools kit pin v1.70.1 to v1.71.0 (safe copies for every game, the daily run, and two shared rules: every game from the start, and what cannot be made again is listed when it is made).

## [0.43.0] - 2026-11-22

Safe copies' follow-ups (the owner's go of 22 Nov 2026). Not yet tested on screen.

### Added

- **Restore…** on each row of Safe copies: choose a folder in Windows' own picker, then **Copy it there**. Each file is checked against its fingerprint as it comes back. A different file already in the folder is left alone, and **Replace older files** is offered next; a file newer than the copy is never replaced from here. One installed style model comes back on its own.
- **Kept, no longer copied**: copies the tools keep of files they no longer take, such as a save that left your newest pair, with their size and older copies. **Let go…** removes one after **Remove the copy**; the file it was made from is never touched.

### Changed

- **A copy not sent to the private repository stays said** ("2 copies are committed but not sent yet") until a later Copy now sends it, and the card is outlined meanwhile. Before, only the run that failed said so.
- Tools kit pin v1.68.0 to v1.70.1 (not sent yet, kept copies and let-go, one file restored on its own, and the shared rule on reports to other authors).

## [0.42.4] - 2026-11-22

Two small fixes to Since you last played, from the owner's screenshot of 22 Nov 2026. Not yet tested on screen.

### Fixed

- **After a check, Since you last played no longer says no check has been made.** The line under the count was decided when the card opened, so it still said "No check has been made here yet" beside the check's own answers. Once Check what they mean for ours finishes, it now says the updates it looked at leave the list the next time Mods opens; the list itself stays until then, beside the answers.
- **The XML patches line has its space back**: "still there (7 of them only once other patches have run)" read "still there(7 …", because Fluent drops the spaces that open a variant. A test holds it.

## [0.42.3] - 2026-11-22

Safe copies now include your RimWorld saves (the owner's go of 22 Nov 2026): the newest pair, with five older copies of each. Not yet tested on screen.

### Changed

- **The card and the Guide say what may now go.** Nothing at its source is ever deleted; a set that keeps a set number of older copies, such as the saves, lets the oldest go. They said nothing was ever deleted.
- Tools kit pin v1.67.0 to v1.68.0 (the newest few files of a set, and a set number of older copies).

## [0.42.2] - 2026-11-22

Safe copies name the tools' new personal kind (the owner's go of 22 Nov 2026: notes kept about them and their game settings, on a private, local folder only). Not yet tested on screen.

### Changed

- **Safe copies say Personal** for the owner's own but private files: the notes kept about them, a game's settings. Before this, the card would have called them Made from a game's files. A kind the card does not know yet says Kept private, never Ours.
- The Tools game's Home now shows the notes kept about you, from the tools' own list.
- Tools kit pin v1.66.0 to v1.67.0.

## [0.42.1] - 2026-11-21

An update you have not checked no longer disappears from Since you last played (the owner, 21 Nov 2026: the Harrier update and Check what they mean for ours showed on the Mods page in the morning and were gone by the afternoon). Not yet tested on screen.

### Fixed

- **An update stays listed until Check what they mean for ours has looked at it.** Since you last played compared only with your last launch, so launching the game again after an update hid it, and the check with it. It now reaches back to your last check when that is earlier, and says so; before your first check it reaches back a week (agent default).
- **Check what they mean for ours is always there**, even when nothing is new. A check marks the moment it began, so an update arriving while it runs is still listed next time.

The last check is kept in the window's own storage, for each game; if that storage is cleared, the next look reaches back a week again.



Safe copies on Home (the owner, 21 Nov 2026: copies of "our training sets, models, etc." within the Companion). Not yet tested on screen.

### Added

- **Safe copies, a card on Home**: for each of the game's repositories that lists what cannot be made again (training sets, the style models made from them, the notes on which picture was picked), each set's kind and whether it is copied, changed since its copy, or never copied, at each place copies go (a folder, a private repository). The card is outlined when a set was never copied or has changed since.
- **Copy now** copies whatever changed and sends the repository's copy at once; **Check the copies** reads every copy again and says if one is missing or damaged. A bar shows the work, and the card reads itself again afterwards.
- **Made from a game's files** marks a set that goes only to a folder marked private and local; "Not kept here" shows where it may not go. Nothing is ever deleted.
- A game whose repositories list no safe copies says so in one line.
- The Guide: Keep safe copies of what cannot be made again, and the word Safe copy; Home's entry names the card.
- On the Decisions page: where the card should live (lean: Home, where it is now).

### Changed

- Tools kit pin v1.65.1 to v1.66.0 (its safe-copies command).

Checked with the tools on phobos-rimworld, whose trainings, models and notes are listed; phobos-ostranauts lists none yet.

## [0.41.1] - 2026-11-21

Removed code stands out (the owner, 21 Nov 2026: its contrast in the compare and view tools was "not nearly high enough"). Not yet tested on screen.

### Fixed

- **Removed and added lines are easy to tell apart.** In the code viewer (Show the code, What changed), a removed line now has a red-tinted background and an added line a green-tinted one, each with a wider bar at its start and a bold − or +. Before, both had the same faint background, so only a thin bar told them apart.
- **What did an update change? colours its comparisons** the same way. Its member-by-member diffs had been plain text, with a removed line marked only by a - at its start.
- The tints come from your theme (a fifth of its Something went wrong or It worked colour over its Background), so every theme gets them, and every colour of words still reads on them: at least 4.5 to 1 in all three of the program's themes.

### Changed

- A theme you make or bring in is checked on removed and added lines' backgrounds too, so it cannot make changed code hard to read; the maker names the pair when one fails. The Guide's theme entry says so.

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
