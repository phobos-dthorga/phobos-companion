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
- **It is a viewer for every game and every framework the owner mods, and it is to be released for others** (owner, 19 Nov
  2026: "any further work designed, changed, or removed with the Companion should be done around the fact that this is going to
  be a multi-game, multi-framework, viewer"; owner, 20 Nov 2026: "eventually, I wish to make Companion available to others. That's
  the greater view we should be taking with regard to everything revolving around the Companion"). Before designing, changing or
  removing anything, ask what it does for a game other than the one in hand, and for a person who is not the owner:
  - **Design for a stranger.** Someone who has never seen these repositories, may not mod RimWorld, may not work with AI agents
    and may not read English. Features for agent sessions (claims, screen notes read by sessions, decisions) and for one game's
    tools are offered where they apply, never assumed; the Guide explains everything in words for that person.
  - **What others bring is data, checked by the host** (themes, guide entries, anything a person imports or a repository
    supplies): never markup, scripts or addresses to fetch, and refused in words when it fails a check.
  - **Nothing adds to what stands between the Companion and another person**: the release audit (`docs/release-audit.md`) lists
    it, and a change that must add to it says so there.
  - **Build the general thing first.** A page reads what every repository has (a changelog, git history, a config file it opts in
    with), and a game's own knowledge reaches it through the kit's manifest and adapters. A feature that can only ever serve one
    game says so in the design record, with the reason.
  - **Check it on more than one game** before calling it done: run the kit tool behind it on at least two games' repositories and
    say which in the changelog. A game that cannot use it yet is told so on the page in words, never shown a blank.
  - **Nothing personal is built in.** No path, game name, repository name or account of the owner's in code, words or tests;
    they come from `.local/games.json` and the kit's settings. Words name "your mods" and "the repository", not one game's terms.
  - **Removing is a change for every game.** Before taking a page or a field away, say which games lose it.
- **Read the owner's screen notes at the start of every session** (owner's go-ahead, 19 Nov 2026: the "something's off" key,
  `docs/later.md` item 1): `python -m phobos_modkit screen-notes list`, run from `external/phobos-modkit/python`. Each is a page the
  owner flagged, with its picture (`picture.png` in the note's folder: read it), its address and their words. Raise them with the
  owner before other work, and when one is dealt with, `screen-notes resolve ID --how "what was done, and in which version"`.
  **Never delete a note.**
- **Choices for the owner to revise go in `config/decisions.json`**: a shared rule since 25 Nov 2026 (the owner's answer "Yes,
  every repository"; `every-session.md`). Here, read the answers with `python -m phobos_modkit decisions list --root ../../..`
  from `external/phobos-modkit/python`.
- Every new behaviour's design record answers the shared `rules/designs.md` questions; how to work with the owner (slices, testing
  on screen, mouse and saves, labels, plain writing) is in the shared `every-session.md`.

## What the program may do

One bullet per page: what it may change, only when, and what guards it. **How each guard works, and every file and folder the
program or the kit writes, is in [`docs/architecture.md`](docs/architecture.md)** ("Where state lives", "The security gates").

- **The host decides what may run, from the kit's manifest, and checks again when asked to run it**: the window can only request.
  The report viewer runs only reports marked `reads`, with a `question` and nothing required, a game's own or one the manifest
  scopes to the whole PC (`scope: machine`, 0.105.0); its **Look up** tab (0.106.0) runs only the game's `definitions` reports,
  found by surface, while the manifest calls them `reads`, with a checked name after `--`; `reads-online` and typed inputs come
  next; anything else needs a design record and a confirmation step. **`owner-only` is never run**, and **the program holds no
  credentials but keys for AI services the person adds** (0.71.0; the owner, 23 Nov 2026, of the old rule: "willing to bend this
  rule now", and "keys for AI services only"): kept in the operating system's own key store, never in a file, never shown again
  and never sent to the window (`companion_core::ai_keys`). **Steam passwords and every other credential stay never held.**
- **Home's note after a crash only reads, and looks by itself once after each unexpected shutdown** (0.105.0; the owner's choice of
  27 Nov 2026, "Home notices by itself"; `src-tauri/src/crash_look.rs`). It reads the kit's `crash-dump --list` (opens no dump) and
  `zeroed status` at most every half hour, and runs the two-minute `zeroed check` **only when a fresh `status` says one is due**,
  reaching back the days it names, so once per crash and never otherwise. Each only while the manifest calls it `reads`
  (`kit::reads_only`). **It never puts a file back**: the kit's `zeroed restore --apply` is not run by this program. Got it is
  remembered in the window's own storage.
- **Mods page: the one place the program changes a game's files** (owner, 18 Nov 2026: a part "dedicated to the updating,
  reversing changes, making backups"). May: the kit's `installs build`, `install`, `backup` and `restore` for a repository with
  `config/installs.json`, and the game's texture `encode`, found by the manifest's `textures` surface, never by name, writing into
  mod folders, Workshop ones included (the owner's choice of 18 Nov 2026). Only when: the owner presses and, except Build (which
  writes only inside the repository), confirms; while the manifest calls it `writes` or `runs`. Guarded: the host checks the
  repository, the move and every name; the kit refuses installing, going back and encoding while the game runs, and never deletes:
  the install it replaces becomes a backup.
- **Mod list page: a game's list of active mods, one change at a time** (0.45.0; the owner, 22 Nov 2026: "our own, third-party,
  mod managing", with fixes "on press + confirm, with backup and undo"; design record "Mod list"). **Never a change by itself.**
  - *Fix and Undo*: only after the owner's yes on the card; only a change the last check offered, or a list it named. The kit
    keeps a byte-for-byte backup first, refuses while the game or a mod manager (RimSort) runs, and refuses to undo over a list
    changed since.
  - *Edit the list* (rebuilt in 0.108.0; the owner's choices of 27 Nov 2026, "the mod list page needs a total redo ... take
    lessons from RimSort" and "Hold until Save", replacing 22 Nov's "each change saved at once"): moves and switches change only a
    draft in the window; **Save** writes the whole list at once with the kit's `mod-list write`, the list on standard input, only
    mods and a list the last listing named, while the manifest calls it `writes`. The kit keeps a backup and refuses a list
    changed since the draft began. **Undo** and **Throw away changes** touch only the draft; **Go back on the last change** is the
    kit's undo. Dragging is a shortcut: every move has keys and buttons.
  - *Sort* (0.47.0) shows the moves and writes only on **Use this order**; *Your rules* keeps or takes away one of the owner's
    rules, for mods the last listing named.
  - *Saved lists* (0.48.0) show what loading would change and load only on **Use this list**, for a list the last listing named or
    a file the owner chose in the host's Open dialog; save, forget and export write only on a press, an exported file only where
    the owner chose in the Save dialog.
  - *Subscribe and Unsubscribe* (0.49.0) speak to the Steam client already running and signed in, through the game's own Steam
    library: no credentials held. Subscribe runs on a press for any well-formed Workshop number (it only adds); **Unsubscribe only
    after the owner's yes**, only for mods the last listing or check named, switching them off first. **Agents never press either
    on the owner's account**, in a test or otherwise (the Workshop rule): browser tests stand in a host.
  - *What players say* (0.107.0; the owner's choice of 27 Nov 2026, "Workshop research on Mod list"): the kit's game-free
    `steam-workshop report` for one Workshop number the last listing or check named, on a press, only while **Workshop pages** is on
    and the manifest calls it `reads-online`; shown in a dialog so the list never moves. It only reads.
  - *Reading*: the check reads Steam's public Workshop API only when Ask Steam too is on (`reads-online`, no account); Home's note
    reads without it, at most every half hour. Saves and RimSort's files are only read. **Open in Steam** and **Find on the
    Workshop** hand the Steam client only a Workshop page a check named in this run, or a search for a missing mod's name in the
    game's own app.
  - Every write runs only while the manifest calls it `writes`.
- **Publish page: mods to the Steam Workshop, only on the owner's press and yes** (0.69.0; the owner, 23 Nov 2026, for "a visual
  way for the user to modify and upload their mods easily"; `docs/publishing.md`). Upload and update run only while the manifest
  calls them `owner-press`, only while the owner's **Workshop uploads** setting is on (Settings, Publishing; on by default), and
  only after the owner's yes; **making an item public needs a second, stronger yes** naming item, version and everyone. **Never by
  itself, and never in a test: agents never press it** (the Workshop rule); browser tests stand in a host. No credentials are
  held: the Steam client route speaks to the client already signed in, and SteamCMD runs in a window of its own where the owner
  types the login. **Save the page** and **Prepare** write only the page, the release notes and the kit's staging, on a press,
  while the manifest calls them `writes` and `runs`. **Read Steam back** runs only while the **Workshop pages** kind of going
  online is on. **Open in Steam** opens only an item the last card named. Names are checked: a repository of the game that keeps
  `config/workshop-publishing.json`, a mod the last reading named.
- **Memory page: a watch of the running game, only on the owner's press and confirmation** (owner, 19 Nov 2026: memory profiling
  "will be done from the Companion"; design record "Memory"). The game's `memory-watch` tool attaches Microsoft's dotnet-counters
  once unless the owner chose Windows' figures only, only while the manifest calls it `runs`. **Never start one by itself** unless
  the owner chooses that on the Decisions page. Reading a watch only reads; stopping and marking write only into the watch's own
  folder in the kit's cache, while the manifest calls them `writes`. Every length, text and name is checked first.
- **Memory page: a key that marks from the game** (0.98.0; the owner's answer on the Decisions page): while a watch runs, the
  host takes one system key, held with Ctrl or Alt (`game_key::plugin_key` refuses one the game uses alone), and a press runs the
  page's own mark through the manifest. It is let go when the watch ends, the page goes or the program closes.
- **Explorer: a snapshot of the running game, only on the owner's press and confirmation** (owner, 20 Nov 2026: debugging tools
  that look at "variables in memory"; `docs/debugging.md`). The game's `look-inside` tool, only while the manifest calls it
  `runs`; it pauses the game for about half a second and writes nothing to the game. **Never take one by itself.** One is held at
  a time, and let go on Let it go, on leaving the page, when the program closes, or after ten minutes (the owner's choice). Every
  request is checked for kind, shape and size first. **Run the checks** (0.91.0) asks the snapshot held the live checks the
  game's repositories keep; its request carries nothing from the window, so the rules come only from the tools. **Run the checks
  with the game frozen** (0.102.0, the owner's request of 27 Nov 2026) runs the game's `look-check --freeze` once, on its own press
  and card, for when Windows has no room for a snapshot: the game stands still for the read, two minutes at most; nothing is held.
  **Browse with the game frozen** (0.103.0, the owner's choice) starts on its own card, then reads each view (the overview, a kind's
  first page, the checks) as one frozen run of its own; nothing is held, so no object is opened or followed.
- **Changes page and the code viewer only read.** The code viewer's **pictures and sounds** (0.50.0; the owner, 22 Nov 2026:
  "display multimedia in parts like this", with Save a copy and Open with its own program) are only files the kit's last answer
  named, at most 64 MB. **Save a copy** writes only where the owner chose in the Save dialog; **Open with its own program** writes
  a copy into the program's own folder and opens it only for a kind the kit named as media, never a program or a kind it did not
  know, **so a press can never run something**. Both only on a press. **Pictures and sounds elsewhere** (0.53.0; the owner's
  choice of 23 Nov 2026: the Mods page, encoded textures, the Mod list's previews) only read, the same way.
- **Picks page reads, and a press keeps a pick** (0.55.0; the owner, 23 Nov 2026: "Go ahead and build the picks page"). Every
  file a pick names may be shown. **Pick** and **None of these** append the owner's answer in the program's own folder, only on a press, only for a repository the list
  names, only while the manifest calls it `writes`. Nothing in a repository changes on a press: a session applies the pick and
  settles it. **A pick already in the game settles by itself** (0.96.0; the owner's answer "Settle it by itself"): when the kit's
  list says an answered pick's try is the file in use byte for byte, reading the page runs the kit's `picks settle --applied` for
  that repository, while the manifest calls it `writes`; it removes only those picks (and their slot's other cards) from the
  repository's `config/picks.json`, and the page says which.
- **Timeline page only reads.** The history log it shows is written by the tools as they work, never by this program.
- **Settings page writes one file, the central settings file**: only when the owner presses Save or Use the default, or chooses a
  path in Windows' own picker (0.29.0; owner, 20 Nov 2026: "file dialog window pickers ... where ever a directory needs to be
  chosen"); only while the manifest calls it `writes`; only a setting the tools list, as one line. It never writes a repository's
  own settings. **Every folder or file a page asks for gets the picker beside its type-in box** (owner's choice: keep both).
- **Settings → AI only reads, and a press of Copy fills the clipboard** (0.70.0; the owner's choice of 23 Nov 2026, `docs/ai.md`,
  A1): the lines an AI program needs to start the kit's MCP server, from the kit's `mcp setup`, shown in full since they must
  name real folders. **The server is started by the AI program the person sets up, never by this program**, and runs only the
  kit's reports the manifest calls `reads` (phobos-modkit `docs/mcp.md`). **Before asking a running AI program anything about
  the kit's reports, read that doc**; never hand a model the kit's `--no-redact` output.
- **Settings → AI services keeps the person's choices and their key** (0.71.0; `docs/ai.md`, A2): the service, its model and the
  answer length in `ai.json`, written whole, on a press; a key only in the system's key store, on **Keep this key**, and gone on
  **Forget this key**. **The services are data** (`config/ai-services.json`), checked by `companion_core::ai` before use: a
  loopback one runs on this computer, one elsewhere must be https and needs a key, and **a program the person logs in to**
  (0.115.0; the owner's choices by card, 28 Nov 2026, `docs/ai.md`, A4) has neither: it is found by name on the search path, as
  the Chat page's agents are, and `companion_core::ai_programs` starts it for one answer **with its tools off by its own
  arguments**, in an empty folder of its own, without the variables that would make it charge per use, and only for a model its
  row names. **The program never holds, reads or passes such a program's login**: its own login check is read for three facts
  only (logged in, plan or key, the plan's name), kept in memory for this run. **Read the models** asks a service on a press,
  through the same gate as a question; for a program it runs that login check. Settings lists the services cheapest first: on
  this computer, programs you log in to, then those charged per use, each marked.
- **Help on pages sends only what the person was shown, on their press** (0.71.0; the owner's choice of 23 Nov 2026: "shown first,
  then my press"; `docs/ai.md`, A2): **Explain this fault** on Logs, and since 0.72.0 **Summarise this version** on Changes and
  **What does this mean for my mods?** under the Mods page's update check, all through `src/lib/ai/AskAi.svelte`. The host builds
  each question from what that page's last reading named (a fault by its id; a repository's changelog and version; a
  repository's update check from this run) and an instruction file kept with the program (`prompts/`); the window never adds
  words. **A new button adds its instruction file, a `prepare_` function in `ai_help.rs` that reads only what the host itself
  read, and its Guide words, in one change.** **Send** sends that question
  and nothing else, only the one last prepared, after `companion_core::ai::ready` checks the service, its key and, for an online
  one, AI services in Going online. **The model's only tools are the kit's three read-only ones** (0.73.0; the owner, 23 Nov 2026:
  "go ahead with the kit's tools for the model"), unless the person switches them off: `ai_tools.rs` hands each call whole to the
  kit's `mcp call`, which runs only reports the manifest calls `reads`, names repositories only from the games list, refuses
  paths and redacts; at most six a question. **For an online model each report runs first and waits, shown whole, for the
  person's Send this report** (`Step::Waiting`); a no tells the model it was declined. **A program the person logs in to is
  handed no tools** (0.115.0): it asks for a report in plain text (`ai_programs::MARK`), and each report waits for the same yes.
  **Never give the model a tool that writes,
  runs code or goes online.** Its answer is shown as text, never acted on, never put into `{@html}`. Each answer's token count is appended to `ai-usage.jsonl`. **Agents and tests never send a real question**:
  tests stand in the service, and a question to a model on the owner's computer loads their graphics card, so ask first.
- **Chat page: a whole agent in a repository, on the person's press, with its switch off until turned on** (0.74.0; the owner,
  23 Nov 2026: "go ahead with A3", and of the switch starting off: "a very good choice"; `docs/ai.md`, A3). The program starts
  only an agent `config/chat-agents.json` names, by its command found on the search path, in a repository from the games list;
  **it never installs an agent, never passes a login and holds no key for one**. Through the Companion the agent may read text
  files inside that repository (each read shown), ask the person's permission (answered only by the person, only with an option
  it offered), and **write a text file there only after the person saw the change line by line and pressed Make this change**
  (0.75.0, slice 5; the owner's answer "reads only at first, then a yes on each"): never inside `.git`, at most 2 MB, its folder
  checked again at the moment of writing, and a no tells the agent it was declined. **Commands** (0.84.0; the owner's choices by
  card, 25 Nov 2026): Settings → AI keeps a mode, **starting on Ask** (Refused, Ask every time, Automatic). Every command the
  agent asks the Companion to run, and every one its own permission questions name, is sorted by `companion_core::commands`
  from the data in `config/chat-commands.json`: **what the shared rules forbid agents is refused in every mode, even with a yes**;
  in Automatic only reading, tests and the kit's reports its manifest marks `reads` run by themselves; everything else is shown
  whole, with why, and runs only on Run it or Allow for this chat. A command runs as its own program in a folder of the
  repository, never through a shell the Companion adds, its output capped and its process tree ended by Stop, End or after 30
  minutes. **A rule about what commands may do goes in that data file, tested in `core/src/tests/commands.rs`; the sorting reads
  text and is never called a sandbox.** It is handed the kit's MCP server (reports that read). **The agent is its own program with the
  person's own access to the disk**, and may change files by itself: the page says so before a first start. One runs at a time;
  leaving the page, starting another, switching off or closing the program ends its whole process tree. **Agents and tests
  never start a real agent on the owner's computer**: tests stand in the agent on pipes; ask the owner first.
- **Settings adds to the games list on one press** (0.31.0, Add a game from Steam; `docs/later.md` item 5, the owner's yes of 19
  Nov 2026): one new entry in `.local/games.json`, after the window showed it whole, with every field checked again, the list's
  order kept and the list as it was kept beside it; nothing is written when a check fails. **It never changes or removes an entry
  already there.**
- **Settings → Setup fetches a missing program only on the person's press, after showing its command whole** (0.87.0; the
  owner's choices by card, 25 Nov 2026: "Show command, run on press", in a Settings tab with a line on Home). The rows and their
  commands are the tool kit's (`programs status`, which only looks); **the window names a program, never a command**, and the host
  takes the command from a fresh reading and holds it to `companion_core::setup::command_of`: the kit's own words for that
  program, still missing, starting only `winget`, `dotnet` or, on Linux, `pkexec` followed by `apt-get`, `dnf` or `pacman`
  (`FETCHERS`, `LINUX_MANAGERS`; 0.92.0), with what it needs first already here. One runs at a
  time, as its own program with no shell, ended by Stop. It installs programs for the person, so **agents and tests never press
  it on the owner's computer**: tests stand in the host. **A new program to fetch is a row in the kit, never a command here.**
  **Starter files** (0.89.0; the owner's choice by card, 25 Nov 2026): Your repositories, on the same tab, may write into a
  repository on the games list **only the starters `config/repository-starters.json` carries**, at their own paths, after the
  window showed each whole and the person ticked it and pressed Write the ticked files: opened as new files, so **nothing there
  is ever replaced**, inside the repository's folder (checked after its folders are made), and **never committed**
  (`companion_core::starters`). A new starter is a row in that file. **A form** (0.93.0) is a starter with `fields` and a JSON
  `template`: each value is checked by its field's kind in `companion_core::starters` (paths inside the repository, a command's
  words, a key, a variable's name, a choice), the file is made again by the host from the values at Write, and the window never
  sends the file itself. **AI, if you want it** (0.90.0): a look for a model running
  on this computer is the AI services' own **Read the models** (loopback only, no key); **Try** starts an agent from
  `config/chat-agents.json` in this program's own folder, only for the handshake, with no terminal, reports, repository or
  conversation, and ends its tree (`chat_page::try_agent`), on the person's press only: **agents and tests never press it**.
- **Their code and What did an update change? read, except one press** (owner's choice of 19 Nov 2026, "Read and compare, on your
  press"). **Decompile runs only on the owner's press, only for an assembly the kit named in this run of the program, and only
  while the manifest calls it `runs`**; it writes only into the kit's cache. Other authors' code is shown, never copied into a
  repository.
- **Keep the new builds writes only into the tools' archive** (0.28.0): on the owner's press, while the manifest calls it
  `writes`; it never touches the game's or the mods' folders.
- **Clean up deletes only what the owner chose and confirmed** (owner, 20 Nov 2026: "some kind of ongoing cleanup process", with
  their yes first). It lists by default; it deletes only the groups the owner chose, after **Clean up the chosen** and a
  confirmation, while the manifest calls it `writes`. The kit deletes nothing its listing did not name and never touches saves,
  game or mod folders or settings. **Never start a clean-up by itself**, and install backups start unchosen. Home's note only
  reads, at most every half hour.
- **How it connects and the Code map only read.** Their pictures' geometry is in `src/lib/connections/layout.ts`, tested without a
  screen. **Every question to the kit's `connections` names the game** (0.83.0), so a game whose adapter has a table of the names
  between its data files and its code shows the same things in the viewer and on the map; **which text counts as such a name is
  the kit's table, never a rule written here.**
- **Keyboard shortcuts** are written only from the Settings page's shortcuts dialog, whole and checked.
- **Features for AI agent sessions are offered, never assumed** (0.37.0; the owner, 20 Nov 2026: "Hidden unless switched on, or
  otherwise detected"). Something's off, the Decisions page and its note, open screen notes and the claims board show only by the
  person's choice in Settings or, by default, when sessions are found at work. **A new feature for agent sessions joins that
  switch**: its key carries `forAgents`, its page joins `FOR_AGENTS_PAGES` and its Guide entries `for: agents`.
- **Every kind of call to the internet has its own switch, on for the repositories on the games list** (0.61.0; the owner, 23 Nov
  2026: "On for listed repositories with a setting to disable otherwise, with applicable warnings of severe loss of
  functionality"; `docs/online.md`). **Off means off**: no call of that kind, on a press or by itself. A report is passed the flag
  that takes it online only while the manifest calls it `reads-online`; a look the program makes by itself says so
  (`--automatic`), keeping the hour's last keyless GitHub calls for a press. **Nothing is ever sent about the person by
  itself**: calls only read public pages, keyless, **except AI services** (0.71.0; the owner's choice of 23 Nov 2026), which sends
  only text the person was shown and chose to send, with their key or through a program they log in to (0.115.0), on their press; **it starts off** (`Kind::starts_on`), the
  only kind that does. Settings → Going online and About show the same list of kinds: today six (Gate lights, Nightly watch,
  Known problems, Their reports, Workshop pages and AI services; `docs/architecture.md` says what each contacts). **A new kind
  joins `companion_core::online::KINDS`, the window's words and the Guide's Going online entry in one change.**
- **Something's off, without agent sessions, opens a GitHub issue to send yourself, and never posts** (0.100.0; the release
  audit's C5; the owner's choices by card, 25 Nov 2026): the host builds the issue only from the person's words, the page's name
  and the versions (`report_page::report`), shows it whole, and on Open on GitHub saves the picture (their home folder hidden in
  its text first) in their Pictures folder and opens only `report_page::ISSUES`, filled in. They submit it on GitHub, or don't.
- **Report links open GitHub in the browser, and never post** (0.65.0; the owner's choice of 23 Nov 2026: the Logs page only).
  Only an address for a repository the kit named: our repository's new-issue form filled in, another author's blank form, or one
  of their issues. **Another author's form is never filled in**: drafts to them go through the owner's tracker (phobos-modkit
  `rules/reports.md`). Listing their issues reads only on a press, while Their reports is on. **One place in the code hands an
  address to the system** (`companion_core::process::open_address`).
- **Otherwise read-only towards games, saves and repositories.** The only other things the program writes, each only on the
  owner's press unless said:
  - the owner's test verdicts (owner, 17 Nov 2026) and, since 0.9.0, their word on notes no row names ("make a row" or "no row
    needed"; owner, 18 Nov 2026, phobos-rimworld's seen-in-play checks), appended in its own folder. phobos-modkit's `test-pass`
    reads both and `apply` writes verdicts into a test list, never this program;
  - **screen notes** (0.22.0), written whole; only the kit's `screen-notes resolve` writes beside them;
  - **Back up now** (0.22.0): a copy of this program's records into a new dated folder in the folder the owner chose, while the
    manifest calls it `writes`; it never deletes a copy. **It also runs by itself** (0.29.0; owner, 20 Nov 2026: "every few hours
    when it's open, and if the schedule is missed, the soonest next opportunity"), under the same check, and Home says when one
    failed and why. **It is the one record this program writes without a press;**
  - **Kept answers** (0.116.0; the owner's choices of 28 Nov 2026, `docs/design-record.md`, "Speed"): after each of the slow
    readings `kept_answers::KEPT` names, its answer is written whole into `answers/` in this program's folder, without a press, so
    the page shows it at once next time while it reads again. **Never a record**: the kit's `records` leaves the folder out. A page
    showing one **holds every button that changes something until the fresh answer lands**; a new slow reading that keeps its
    answer does the same. **Reading ahead** (Settings → Games, on by default: it only reads) has the window ask those readings by
    itself, in the Background lane; the host refuses one asked ahead while it is off;
  - **Copy now** (0.42.0), for a repository with `config/safe-copies.json`, while the manifest calls it `writes`: into the folders
    the owner chose and marked, and a push of the private repository the owner chose. It deletes nothing at a source and lets go
    only older copies beyond the number a set keeps (the saves, kit 1.68.0); the kit keeps anything made from a game's or the
    owner's private files off every shared place. **Check the copies** only reads;
  - **Restore** (0.43.0), into a folder the owner picked, and **Let go**, for one copy the kit lists as no longer taken: each only
    after the owner's yes on the card, while the manifest calls it `writes`. Restore never replaces a different file unless the
    owner then presses Replace older files, and never a newer one; Let go never touches the file the copy was made from;
  - **Decide** (0.22.0): the owner's answer, appended in this program's folder;
  - **Looked at** on a setting the Mods page lists as new (Settings to look at): the mark, appended per repository in this
    program's folder; nothing in a repository or a game changes;
  - **I've read it** and its **Undo** on a temporary patch the update check asked about (0.104.0; the owner's choice of 27 Nov
    2026, "Finish today's loop"): the kit's `reviews mark`, appended per repository in this program's folder, only for a row and
    build this run's check named, while the manifest calls it `writes`; nothing in a repository changes;
  - **Workshop uploads** (Settings, Publishing; 0.69.0): the owner's On or Off, in this program's folder;
  - **Code colours from VS Code** (Settings, Appearance; 0.77.0, `docs/code-reading.md` step 2): a VS Code theme's code colours,
    read on **Bring in** from a theme the host's own listing of VS Code's themes named (checked against a fresh listing) or from a
    file the person chose in the Open dialog, with the files it builds on only from its own folder; kept, chosen and removed in
    `code-colours/` in this program's folder. **Find VS Code's themes on this computer** only reads;
  - **Save a picture** (P) and **Something's off** (!): a picture of the page into the owner's Pictures folder (a D'thorga
    Companion folder) and the clipboard, or into a screen note above;
  - **First steps** (0.35.0): a new, empty games list where there is none, naming the projects folder the owner chose; it
    refuses when a list is already there. Adding a game to it is the Settings page's, above;
  - **The daily run of safe copies** (Settings; the owner's word of 22 Nov 2026): the kit's `safe-copies schedule`, which sets or
    removes the owner's one Windows scheduled task, "D'thorga Safe Copies", and no other;
  - **Set aside** on Settings → Setup (0.87.0): the keys of the programs the person said they don't need, in `setup.json` in this
    program's folder.

  **The Game files page only reads**; Show in folder opens the file manager on a file inside a folder the last report named, and
  nothing else.
- **The core never names a game.** A game reaches it only through the manifest's `game` field and the owner's own list,
  `.local/games.json`, which holds personal paths and is never committed.
- **Git is read with `--no-optional-locks` and `core.fsmonitor=false`**, through `companion_core::git`: reading takes no lock and
  starts no background watcher. A test that makes a repository sets `core.fsmonitor false` in it and removes it with read-only
  handling.
- **Tools run as processes through the pinned kit.** Fix a tool in phobos-modkit, then move the pin; never edit the submodule.

## How it is built

The layers, the folder map, a page's parts, how the kit runs and how to add a page are in
[`docs/architecture.md`](docs/architecture.md). The rules:

- **The window presents, the host decides.** Svelte components show what they are given. Only a `desktopClient.ts` may import
  `@tauri-apps/*` (`src/lib/shell/tauriImports.test.ts` holds it). Tauri commands stay thin: one line of delegation each, through
  `blocking` in `src-tauri/src/lib.rs`. **The one exception is a command sent raw bytes** (`save_picture`, `save_screen_note`): a
  raw body comes only with the request itself, so the command takes the bytes and its one header out first, then delegates.
- **Slow readings take turns; presses never wait** (0.116.0; the owner's speed round of 28 Nov 2026: a page's reading ran three to
  four times slower beside a dozen others). A command that only reads and can take seconds runs through `queued`, or `reading`
  when its answer is kept, in `src-tauri/src/lib.rs` (`companion_core::lanes`: at most three at once, readings ahead one at a time
  behind them). **A press, a write and a long run (a watch, a snapshot, an agent) stay in the Free lane**, so the queue never holds
  up what the person asked to happen. The kit's manifest is kept in memory until the kit's files change (`kit::read_manifest`).
- **Code more than one part uses lives once** (owner, 19 Nov 2026; `docs/history/shared-code-audit.md`): in the host, the `companion-core`
  crate (`src-tauri/core`), which holds no Tauri; in the window, `src/lib/shell/`, `src/lib/changelog/` and `src/app.css`. A
  page's own module keeps only what is its own. Every request goes through `ask` (and `BROWSER` outside the program), every kit
  answer through `Outcome`, every change through `allowed_by_manifest`, the window's text to the kit always as one argument
  (`args::Args::given`), every date through `dates.ts`, and every dialog over the window through `WindowDialog.svelte`. **Before
  writing a helper or a style, look there first.**
- **Words live in `locales/en-AU.json`**, never in a component; a test holds every key to it. Fluent, with named variables.
- **Colours come from the theme in use**, by role, never a literal colour in a component. A test holds the program's own themes
  (`themes/*.json`) to the contrast rules. Colour never carries a meaning alone.
- **A theme is data, never CSS** (0.33.0; the owner, 20 Nov 2026: themes "as OnAir has them", after onair-wyrmgrid's ADR-0009): a
  version, an id, a name, an optional author and exactly the twenty roles as `#RRGGBB`, with the twelve code colours (0.76.0) all
  or none, at most 32 KB. A theme with none takes them from its other roles (`CODE_FROM`), so a theme made before stays usable. The
  host's `companion_core::themes` is the authority: it checks the shape and the contrast (words 4.5:1, chart colours 3:1, lines
  1.5:1, on every surface; code colours 4.5:1 on the background and on removed and added lines) before a theme is kept or used, keeps the owner's themes and choice in the program's own folder, opens the Open
  and Save dialogs itself, and falls back to House D'thorga, saying why, when the chosen theme is missing or fails. The window
  sets only `--colour-<role>` from it. A new role is added to the format, every theme file, both checks and the maker in one
  change.
- **Controls are at least 44 px**, nothing needs a drag or appears only on hover, everything is reachable from the keyboard, and
  the type floor is 12 px. **The page list down the left is the one exception: its rows are 40 px** (the owner's choice of 23 Nov
  2026, so every page shows without scrolling in a window about 940 px high).
- **A page too long to read in one scroll is divided into tabs** (0.66.0; the owner, 23 Nov 2026: "a huuuuuuuge vertical trail of
  information"): `src/lib/shell/Tabs.svelte`, its tabs listed once in `PAGE_TABS` (`src/lib/shell/tabs.ts`), each a step of the
  trail with its own address, and a tab with something waiting says so in words. A new page with tabs adds its row there, its
  `tab` values to `docs/cross-links.md`, and says so in its Guide entry.
- **Failures say what happened, what stayed safe and what to do**, then the technical detail folded away.
- **Charts come from the tools, drawn by one component.** The kit sends a chart block with roles, never colours;
  `src/lib/charts/CompanionChart.svelte` is the only component that draws, and `echartsCore.ts` the only module that imports
  ECharts, on demand. Every chart has a description read in place of the picture, its key in the page's own text, its values where
  a pointer isn't needed, and **Show the numbers** for the table. Motion stops for reduced motion; chart text is 13 px.
- **The globe comes from the tools, drawn by one module.** The kit sends a globe block (phobos-modkit `docs/manifest.md`);
  `src/lib/atlas/globeScene.ts` is the only module that imports three.js, on demand, and `planet.ts` holds the arithmetic, tested
  without a screen. Every move has a button and a key; dragging and the wheel are shortcuts. Colours for a measure come from
  `colours.ts`'s ramps, chosen by the dataviz rules; a category layer brings the kit's own colours.
- **Code is coloured by one module, from the theme** (0.76.0: VS Code's grammars; the owner, 24 Nov 2026, `docs/code-reading.md`).
  `src/lib/code/shikiCore.ts` is the only module that imports Shiki, run in a worker by `highlightCore.ts` (in the window only
  where no worker starts), on demand, a grammar at a time; the kit names what a file is and never a colour. Which scope takes
  which of the theme's twelve code colours is one table, `src/lib/code/scopeRoles.json`, from VS Code's Dark+ rules; a test holds
  its roles to the host's `CODE_ROLES`. Pieces become `tok-<role>` spans coloured in `app.css`; the "something went wrong" colour
  is never used for code. A changed line carries a `+` or `−` mark beside it. Code reaches the page escaped (by `piecesToHtml`, or
  by `hunkHtml`): never put file text into `{@html}` any other way.
- **Work that takes time shows a bar and says what it is doing** (owner, 19 Nov 2026). Every request that runs a tool gives the
  host a progress channel, and the host passes on the tool's progress lines; `ProgressBar.svelte` is the one component that draws
  them: filled when the tool can count its steps, moving when it cannot, always with words, and its latest line of output beneath.
  A new tool that can take more than a moment speaks progress lines (phobos-modkit `docs/manifest.md`, Progress) before its page
  is built. **A read again that keeps the page on screen still shows a bar** (owner, 19 Nov 2026: a silent Read again "you ...
  think that the app ... is broken"), and its button says it is working until it is done.
- **Quantities are preset buttons or the game's own kind of control**, not sliders.
- **Every move goes through the window's trail** (owner, 19 Nov 2026: `docs/cross-links.md`, N1 to N3): a link calls `go` or
  `openDialog` (`src/lib/navigation/navigation.svelte.ts`), a choice on a page calls `setFocus` and reads it back from `here()`,
  and the code viewer and the changelog as it stood are drawn by the App from the trail, never by a page. A new page lists the
  focus keys it reads in `docs/cross-links.md`, and a new kind of thing joins Go to anything (`src/lib/navigation/goto.ts`).
- **The Guide is kept with the program** (0.34.0; the owner, 20 Nov 2026: "documentation, or an encyclopedia, into the Companion,
  so I know what to do or how to find something"). **A change that adds or alters a page, a panel or a button updates its entries
  in `guide/` in the same commit**: the page's entry, any How do I…? answer whose steps it changes, and a word it introduces. Each
  entry is a small file (`docs/guide-entries.md` gives the format); write it as the player guides are written: answer first,
  numbered steps, **bold** for what to press, the key beside it, and the button's words exactly as the page shows them.
  `src/lib/guide/entries.test.ts` refuses a page with no entry, a link or See also to no entry, a Take me there a page cannot
  show, and an entry nothing links to.
- **A page's common moves have keyboard shortcuts** (owner, 19 Nov 2026), listed once in `src/lib/shortcuts/actions.ts` with its
  default, and offered by the view while it is on screen (`register` in `src/lib/shortcuts/registry.ts`). They never act in a text
  box or a part that takes keys itself, and every one can be changed or turned off in Settings. A new page adds its moves there in
  the same change. **Once every letter was taken** (all 26 since 0.50.0), the owner allowed two more ways (23 Nov 2026: "repeat
  where never together (while trying to prevent confusion) and just using Shift, Ctrl, Alt, keys"): **a key may repeat in places
  never on screen together**, given a like move in each (J and K step through items wherever they appear), and **a key may be held
  with Shift, Ctrl or Alt**. A single key stays first where one is free.
- **Dark first.**
- **A new library has to earn it**: a real need now, less upkeep than a small local version, one place it can be replaced from,
  tests that fit, and safe behaviour when it fails. Record it in `THIRD_PARTY_NOTICES.md`.
- **A new page follows the checklist in `docs/architecture.md`, "How to add a page"**, so it reaches every list it belongs to.

## Names

Names people see, and every public page, follow the shared `external/phobos-modkit/rules/brand.md`.

## Checks

**This repository's gate is `python scripts/check-all.py`** (the shared rule: chain the commit on it). It runs the steps in `config/gate.json` and prints only what failed. After
cloning, run `git submodule update --init` and `npm ci`; the browser check also needs `npx playwright install chromium`.

Build output stays out of the repository: `scripts/with-target.mjs` and the gate send it to `%LOCALAPPDATA%\phobos-modkit\target`.

## Git and versions

- **Public, MIT** (agent default, matching its siblings). Never change the repository's visibility.
- The version lives in `package.json` and `src-tauri/Cargo.toml`, and a test keeps them equal.
- **Tag each version, and never publish a release** (0.85.0; `docs/releases.md`; the owner's choice of 25 Nov 2026: "a draft; I
  press Publish"). Once a version's commit is pushed, tag it `vX.Y.Z` and push the tag: GitHub's Windows machine builds the signed
  installer and a **draft** release. **Agents never publish a release, never make, see or hold the update key, and never change the
  repository's secrets**; the owner publishes, and only a published release reaches anyone's updater. The owner's one-time setup
  was done on 25 Nov 2026 (both secrets, and the public half in `tauri.conf.json`); should the secret ever go, the release build
  stops at its first step and says why. **Never change `plugins.updater.pubkey`** without the owner's word: every installed copy
  takes only updates signed by the key it carries.
- **Build the installer for the owner after every new version** (owner, 18 Nov 2026: "build it ahead of time for me"): once the
  version is committed, run `npm run installer` and tell the owner the setup file's full path
  (`%LOCALAPPDATA%\phobos-modkit\target\release\bundle\nsis\D’thorga Companion_<version>_x64-setup.exe`), so all they do is run
  it. Run `npm ci` first only when `package-lock.json` changed. **VS Code's Svelte language server holds `node_modules` files open**
  (its esbuild helper and rollup's native module), so `npm ci` fails with EPERM while it runs, after deleting most of
  `node_modules`: stop only that server first (a `Code.exe` whose command line names `svelte-language-server`, never a filter that
  matches the stopping command itself), then run `npm ci` at once; it restarts itself when a `.svelte` file is next opened.
