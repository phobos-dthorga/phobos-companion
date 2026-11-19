# D'thorga Companion

**One desktop program for every game you mod** (search for it as dthorga too). It will show when you last worked on each game,
what you did, and what your saves and logs say, without typing a command.

## Read this first (gotchas)

- **You need a list of your games first**: `.local/games.json` in this folder, naming each game and its repositories.
  `config/games.example.json` shows how. Without one, the program says so and shows nothing else. A game may also name its
  folders (`places`: `data`, `saves`, `screenshots`) and its Steam app ID (`steam_app_id`) for the Game files page.
- **A game's `id` in that list must match the tools' name for it** (`rimworld`) for its reports to appear.
- **It shows where you left each game, and the reports that need nothing typed**, with charts where a report has them, such as
  RimWorld's colony mood report. Reports that need an input, read online or change anything aren't offered yet.
- **The Atlas page draws your newest save's world** as a globe: biomes, climate, terrain, pollution, places, roads and rivers.
  The first time, reading the save takes a minute; after that, a few seconds. On a PC that cannot draw it, the page says so
  and lists the same facts in tables.
- **A RimWorld save holds only half of a colonist's mood.** The mood report counts the remembered events exactly and gives the
  rest (rooms, pain, beliefs) as one figure; see the [design record](docs/design-record.md#colony-mood-built-10-nov-2026).
- **Not yet tested on screen.** It builds and passes its checks; nobody has judged the window yet.
- **The Changes page lists what each changelog says changed, for any game**, and **Show the code** opens the code behind an
  entry: the commit that wrote it, its files with code first, coloured by language. Nothing extra is written in a changelog for
  this. **A commit that wrote several entries is shown whole**, with the others named.
- **The Timeline page shows what happened to each game's mods over time**: an at-a-glance row a mod with a mark on each day,
  and every fact day by day beneath. **Read it as it stood** opens any changelog exactly as it was then, marking what has been
  reworded or taken out since. Installs, go-backs, backups, builds and encodings are recorded from 19 Nov 2026 on, in the history
  log in the Companion's own folder.
- **How code connects**: in the code viewer (How it connects) and on the Code map page, any method, class, Def or function drawn
  with what calls it, what it calls, what it belongs to, builds on, overrides, patches and uses; press anything to put it in the
  middle. **C# is exact from what was last built, so build first**; Lua, and C# with nothing built, are read by name and drawn
  dashed.
- **Back and Forward work across everything** (the buttons under the page bar, the , and . keys, or the mouse's side buttons),
  and **/ opens Go to anything**: one search over pages, code, changelog entries, test rows, settings and reports. **Copy address**
  gives a link to where you are, to paste back in later.
- **The Logs page reads the game's last log** (RimWorld's today): messages grouped, what is new since the run before, and each
  one's stack. **Find in the code** opens a step of the stack on the Code map, where **Show its history** lists the changes that
  touched it, and **backups from before this** leads to the Mods page's backup from before a change.
- **Test rows are joined to code**: a row on the Tests page names the code that notes it, the Code map names the rows a method
  watches, and each version on the Changes page names the in-game tests still waiting on it.
- **Patch badges** (RimWorld): under a Code map picture, each method our code patches says how many other mods patch it too and
  what the last update changed in it; a red dotted ring marks the crowded or changed ones in the picture.
- **Home says which tool kit each repository uses**, how far behind it is, and what moving its pin would bring.
- **The Make-up page shows what each repository is made of** (key M): blocks by mod, folder and file, each part's mix, growth
  since the first commit, how much is tested in game, and what players get. Measure in lines, size on disk or files. The Code
  map lists the busiest code before you search.
- **Settings to look at** (Mods page): every setting your mods added, removed or gave a new default, until you mark it as looked
  at; Home says how many are new, and the Timeline shows each on the day it was made.
- **Save a picture** (P) draws the whole page, scrolled parts included, into your Pictures (a D'thorga Companion folder) and
  copies it, ready to paste into a message.
- **Something's off** (the ! key, or its button beside Save a picture): saves a picture of the page as it is, with its address and
  a few words of yours (or none), for the next agent session to read when it starts. Home lists the notes still waiting, and what
  was done about the others.
- **Back up your records** (Settings page): copies the Companion's own records (verdicts, history log, marks, screen notes,
  shortcuts, central settings) into a folder you choose, which your NAS keeps; **choose that folder first**. Home reminds you
  when the newest copy is a week old.
- **Who is working on what** (Home): what each agent session holds on the claims board, and for how long.
- **Decisions** (D): every choice an agent made for you to revise, with its options and the agent's lean chosen to begin
  with; **Decide** takes it in one press. Home says how many wait. The page bar is grouped into Play, Code and Tools.
- **Game files** (W): what changed since you last played (the game and its Workshop items), your saves, your screenshots and
  where the space goes, for any Steam game. Read only.
- **Keyboard shortcuts, one key each**: 1 to 9 for the first nine pages and G for Logs, [ and ] for the games, ? for the full list. They never act while
  you type in a box. **Change any of them, or turn them off, under Settings, Change keyboard shortcuts.**
- **The Settings page lists every folder and file the tools read**, and where each value comes from. **Change writes the central
  settings file**, for every repository and game; a repository's own settings still win where they set something.
- **Anything that takes a while shows a progress bar** with what it is doing, the steps already done, and a count where the work
  can be counted (else about how long is left, from last time). A strip under the page bar follows any work, on any page.
- **The Mods page starts with "Before you play"**: ready to play, or what needs building, installing or encoding first, each
  with its button. Each mod shows what it has now beside what installing would bring (changelog entries, files, settings, things
  to look out for in play), and what going back to each backup would take away. **Its buttons change your installed mods and
  encode textures** (Workshop mods' too), asking first; installing, going back and encoding wait until the game is closed, and
  building doesn't. **Remove repeated backups** deletes backups that repeat the one before them, keeping the oldest of each run.
  A repository opts in with `config/installs.json`; see the
  [design record](docs/design-record.md#the-mods-page-built-18-nov-2026).
- **What it changes, and only when you ask:** your test verdicts, in its own folder; your installed mods and their textures, from
  the Mods page; the repository's build output when you press Build; and the central settings file, from the Settings page. It never changes a save, and never deletes anything.
- **It needs Python on the PATH**, or `PHOBOS_COMPANION_PYTHON` naming one.
- **Open it from the Start menu once installed** (see [Install it](#install-it-windows)).
- **It can't be handed to anyone else yet**: it finds its tools by the folder it was built from, or `PHOBOS_COMPANION_KIT`.

## Install it (Windows)

**Build the setup program, run it once, then open the Companion from the Start menu** (type "companion") or the desktop.

```powershell
npm ci
npm run installer
```

The setup program lands in `%LOCALAPPDATA%\phobos-modkit\target\release\bundle\nsis\`, named
`D’thorga Companion_<version>_x64-setup.exe`. It installs for your Windows account only and needs no administrator. To update,
build and run a newer one over the top; to remove it, use Windows' **Installed apps**.

- **Keep this folder where it is.** The installed program reads its tools and your games list from the folder it was built in.
- In Windows the name is spelled with a curly apostrophe (D’thorga), because the installer cannot hold a straight one.

## Try it

You need Rust through rustup, Node 22 with npm 10, Python 3.10 or newer, and on Windows the WebView2 runtime.

```powershell
git clone --recurse-submodules https://github.com/phobos-dthorga/phobos-companion
cd phobos-companion
npm ci
npm run desktop
```

## Check it

```powershell
npx playwright install chromium
python scripts/check-all.py
```

It prints only what failed. The design is in [docs/design-record.md](docs/design-record.md), the rules in [AGENTS.md](AGENTS.md).
What is proposed and not yet built is kept in [docs/later.md](docs/later.md), so nothing agreed is lost.

## Credits

An independent community project. The layout and method follow two of the author's earlier programs,
[Republic Observatory](https://github.com/phobos-dthorga/soviet-republic-observatory) and
[OnAir WyrmGrid](https://github.com/phobos-dthorga/onair-wyrmgrid). The libraries it uses are in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). MIT licensed.
