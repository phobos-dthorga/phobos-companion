# Release audit: what stands between the Companion and another person (20 Nov 2026)

**Status (20 Nov 2026):** written at the owner's request. **A1, A2, A3 and A5 are built in Companion 0.36.0** (the installer carries its own Python and tool kit, the games list starts on First steps, and a missing git is said plainly); not yet tried on a clean PC. **B1 and B3 are built in 0.37.0, and B4 in part** (the Guide's entries from the kit and each repository are not); see "Built in 0.37.0" below. **A4 and B7 are built in 0.38.0** (the kit's compiled tools come ready-built; About leads to which other programs the tools use). The rest is not built. The owner answered four of the questions below. Written after
the owner said: "eventually, I wish to make Companion available to others. That's the greater view we should be taking with regard
to everything revolving around the Companion." The rule that follows from it is in `AGENTS.md` ("Design for a stranger").

## Read this first (gotchas)

- **The person this is for** has never seen these repositories, may mod a game other than RimWorld, may not work with AI agents,
  may not read English, and installs the Companion on a fresh Windows PC from a download.
- **Findings are grouped by how soon that person would hit them:** A stops a first install working, B spoils the first hour, C
  is needed before calling it ready.
- **Sizes are small, medium or large**, never hours. Each finding names its options and the agent's lean; the owner decides.
- **Unverified claims are marked so.** Figures about other projects (installer sizes, a signing service's terms) were not checked
  against their own pages for this audit.
- Read beside the design record's "Where each page stands" table, which says what each page needs from a repository.

## A. Stops a first install working

| # | What stands in the way | What the person would see | Options (lean first) | Size |
| --- | --- | --- | --- | --- |
| A1 | **The program finds the tool kit and the games list by the folder it was built in** (`repository_root()` is fixed when it is compiled, `src-tauri/core/src/lib.rs`) | Every page fails: the kit is not found at a path on the owner's PC | **Ship the kit inside the installer** as resources and look there first (the variable stays for developers); keep the games list in the program's own data folder | Medium |
| A2 | **It needs Python 3.10 or newer on the PATH** (`kit.rs`, `PHOBOS_COMPANION_PYTHON`) | The same failure, or a "python not found" message in technical words | **Bundle the embeddable Python for Windows** with the kit (the installer grows by roughly 10 to 20 MB, unverified); or find Python on first run and explain how to install it; or freeze the kit into one program | Medium |
| A3 | **The games list is made by hand** (`.local/games.json` beside the program; Home says to copy `config/games.example.json`); Add a game from Steam refuses when there is no list | A blank Home with instructions about a JSON file | **Start an empty list in the program's data folder on first run**, with a First steps welcome that adds games from Steam and picks the folder repositories live in | Small to medium |
| A4 | **The kit's Rust tools are built with cargo on first use** (`native.py`: the save index, among others) | Reading a save fails: "cargo is not installed; install Rust" | **Ship the tools built**, with the kit; build only for developers | Medium |
| A5 | **git is needed** for Home, Changes, the Timeline and the code viewer | Those pages fail with git's own message, or none | **Check for git and say plainly how to get it** (Git for Windows); bundling it is large | Small |

## B. Spoils the first hour

| # | What stands in the way | What the person would see | Options (lean first) | Size |
| --- | --- | --- | --- | --- |
| B1 | **What a repository must hold is written only for agents**: a `CHANGELOG.md` in this project's shape, and opt-in files (`config/test-evidence.json`, `config/installs.json`, `config/decisions.json`) | Pages that say a repository has nothing to show, with no way to learn why | **A "Make your repository Companion-ready" part of the Guide**, with small examples of each file, and each page saying which file it would read | Medium |
| B2 | **Installing, backing up and going back work only where the kit has an install adapter** (RimWorld) and the repository has its own install script | The Mods page has little to offer for any other game | A **simple general adapter** (copy a mod's folder into a chosen mods folder, keeping a backup) for games that need nothing more; game adapters where they do | Large |
| B3 | **Words that assume the owner**: the NAS and Synology in the records backup (4 and 1 times), Waylith in the Mods page's textures (5), AI agents (20), Steam (19, mostly fair) | Puzzling words; agent features with nothing behind them | **Features for agents shown only where a repository uses them** (decisions, claims, notes), with a setting; Waylith's lines only for games where it applies; NAS worded as "a backed-up folder" | Small to medium |
| B4 | **The Guide is written for the owner**: no First steps, no repository conventions, agent features not marked optional, English only | Help that assumes what they don't have | **First steps and repository entries; agent entries marked optional; entries also from the kit and each repository** (plain text, checked by the host, kept apart by where they came from, with a format version) | Medium |
| B5 | **The installer is not signed** | Windows SmartScreen warns of an unrecognised program before it installs | **Say so in the download page and the Guide**; look into free signing for open-source projects (SignPath Foundation offers it, unverified) | Small to medium |
| B6 | **Updates come from the repository it was built from** (About; "ask an agent session to build it") | No way to learn of or get a newer version | **Releases on GitHub**, and Tauri's updater with signed update files | Medium |
| B7 | **Some tools need more programs**: .NET (assembly reading, the Memory page), ilspycmd (decompiling), RimSort's todds (texture encoding), Steam | A tool that fails when it is first used | **Each tool says in words what it needs and where to get it** (most already do); the Guide lists them per page | Small |

## C. Before calling it ready

| # | What stands in the way | Options (lean first) | Size |
| --- | --- | --- | --- |
| C1 | **One language**: the interface's words are in one catalogue (Australian English) built to be translated; the Guide is English only | Language folders for the catalogue and the Guide, falling back to English entry by entry; a language choice in Settings | Medium |
| C2 | **Built and checked on Windows only**, though Tauri and most of the kit run elsewhere and the owner prefers Linux | A Linux build next, after the first Windows release | Medium to large |
| C3 | **Privacy is not stated anywhere a person would read it** | Say it in About and the Guide: the Companion itself makes no network calls (as read for this audit: no web client in the host or the window); the kit reads Steam's public pages only when a report asks; nothing is sent anywhere | Small |
| C4 | **Licences of what would be bundled** | MIT for the code and the art clause for the crest are in `LICENSE`; add Python, the kit and the built tools to `THIRD_PARTY_NOTICES.md` when they are bundled | Small |
| C5 | **Something's off goes to agent sessions only** | For others: an opt-in way to turn a note into a report they send themselves, showing exactly what would be sent | Medium |

## Built in 0.37.0: it speaks to a stranger (B1, B3, part of B4)

| # | What was done | Left |
| --- | --- | --- |
| B1 | **Make a repository ready for the Companion**, a Guide entry: what each page reads (git and a `CHANGELOG.md`; the optional `outstanding-work.md`, `test-evidence.json`, `installs.json`, `settings.json`, `decisions.json`). Changes, Mods and Tests, with nothing to read, say so with a button to it; Tests names its file | Small examples of the JSON files live in the kit's docs, which the Guide cannot link to yet |
| B3 | **Features for agent sessions are hidden unless switched on, or detected** (the owner's answer): Settings' "Features for AI agent sessions" offers When a repository uses them (the default), Always and Never, and says what it found. Hidden, there is no Something's off or its key, no Decisions page, key or note, no screen notes and no claims board. The NAS is "your backup" in words and the Guide; Waylith is named only where a mod's textures are affected, and explained | About still says "ask an agent session" to build the installer: that goes with B6 |
| B4 | **Entries for agent sessions are marked** (`for: agents`), grouped last, with the way to show those features; First steps (0.36.0) and the repository entry are there; entries name `test-pass apply` rather than an agent | **Entries from the kit and each repository** (namespaced, versioned, checked by the host), and other languages (C1) |

## Built in 0.38.0: its tools are ready to use (A4, B7)

| # | What was done | Left |
| --- | --- | --- |
| A4 | **The installer carries the kit's compiled tools ready-built** (kit 1.62.0's `programs bundle`): the XML indexer, so reading a save needs no Rust, and the assembly reader, needing only the .NET 10 runtime. The installed kit finds them before building anything | The .NET 10 runtime is not carried: the Code map's C# links and the patch pages need it installed (B7 says so) |
| B7 | **One answer to "what else is needed?"**: kit 1.62.0's `programs status` (git, the two compiled tools, .NET 10, the diagnostics tools, ilspycmd, Steam, a game's own), on Reports and from a button on About; a Guide entry lists which page needs what | Each tool's own refusal already names what it lacks; none was reworded |

## Added in 0.50.0: pictures and sounds in the code viewer

What it adds to what stands between the Companion and another person, all small, and none of it needing anything installed:

| What | Why it is safe enough | Left |
| --- | --- | --- |
| **The window's content policy allows `media-src 'self' blob:`**, so it can play a sound it decoded itself | Only addresses the window made from bytes the host handed it; nothing from the network | None |
| **Open with its own program** writes a copy into the program's own folder (`opened-copies`) and asks the system to open it | Only for a kind the kit named as media (never a program or an unknown kind), only on a press; copies are let go after a day | On Linux and macOS it uses `xdg-open` and `open`, unchecked |
| **Save a copy** writes one file where the person chose in the system's Save dialog | The host writes only the path the dialog gave | None |

## Already right

Much of the foundation already suits others, and should be kept so:

- **Multi-game from the start**, with **nothing personal built in** (a standing rule since 19 Nov 2026), and pages that say in words
  when a game cannot use them.
- **What others bring is data, checked by the host**: themes since 0.33.0, as OnAir WyrmGrid's ADR-0009; the Guide's entries are
  the next.
- **The host checks every request** against the kit's manifest, and the window never names a path to write.
- **Local only**: everything is kept on the person's own PC, with its own records backup.
- **Accessible**: keyboard routes for every common move, accessibility audits in the tests, dark first, a High contrast theme.
- **The Guide**, F1 on every page, kept current by a rule and tests.

## Proposed order (agent's lean)

1. **A clean PC can install it and start**: A1, A2, A3 and A5 together. The milestone: a fresh Windows account installs it, adds a
   game from Steam, and sees Home, Changes and Game files work.
2. **It speaks to a stranger**: B3, B4 and B1, so the words, the Guide and a repository's opt-in files make sense without us.
3. **Its tools are ready to use**: A4 and B7.
4. **It can be handed out and kept current**: B6 and B5, then a first public release.
5. Then C1, C2, C5 and B2 as each earns its place; C3 and C4 with the release.

## Questions for the owner

**Answered (20 Nov 2026):**

| Question | The owner's answer |
| --- | --- |
| Bundle Python and the kit inside the installer, so nothing else need be installed first (except git)? | **Yes, bundle them** |
| When features for AI agents (claims, screen notes read by sessions, decisions) aren't in use? | **Hidden unless switched on, or otherwise detected**: shown by themselves where a repository uses them, otherwise off until turned on in Settings |
| Where should releases live? | **GitHub Releases** (the phobos-companion repository) |
| Which part first? | **A clean PC can install it and start** (A1, A2, A3, A5) |

**Still open:**

| Question | Agent lean |
| --- | --- |
| Sign the installer? | Look into free open-source signing; until then, say plainly what Windows will warn |
| Which platform after Windows? | Linux, after the first Windows release |
| Should the general Mods adapter (B2) come before a first release? | No: after, once someone asks for a game that needs it |
