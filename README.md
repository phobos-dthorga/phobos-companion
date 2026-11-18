# D'thorga Companion

**One desktop program for every game you mod** (search for it as dthorga too). It will show when you last worked on each game,
what you did, and what your saves and logs say, without typing a command.

## Read this first (gotchas)

- **You need a list of your games first**: `.local/games.json` in this folder, naming each game and its repositories.
  `config/games.example.json` shows how. Without one, the program says so and shows nothing else.
- **A game's `id` in that list must match the tools' name for it** (`rimworld`) for its reports to appear.
- **It shows where you left each game, and the reports that need nothing typed**, with charts where a report has them, such as
  RimWorld's colony mood report. Reports that need an input, read online or change anything aren't offered yet.
- **The Atlas page draws your newest save's world** as a globe: biomes, climate, terrain, pollution, places, roads and rivers.
  The first time, reading the save takes a minute; after that, a few seconds. On a PC that cannot draw it, the page says so
  and lists the same facts in tables.
- **A RimWorld save holds only half of a colonist's mood.** The mood report counts the remembered events exactly and gives the
  rest (rooms, pain, beliefs) as one figure; see the [design record](docs/design-record.md#colony-mood-built-10-nov-2026).
- **Not yet tested on screen.** It builds and passes its checks; nobody has judged the window yet.
- **The Mods page shows what updating or going back would give you or take away**, read from the changelog each copy of a mod
  carries: the installed copy, the repository's and every backup. **Its three buttons change your installed mods** (back up, go
  back to a backup, install from the repository), each only after you confirm. Going back and installing wait until the game is
  closed. A repository opts in with `config/installs.json`; see the [design record](docs/design-record.md#the-mods-page-built-18-nov-2026).
- **What it changes, and only when you ask:** your test verdicts, in its own folder, and your installed mods, from the Mods page.
  It never changes a save or a repository.
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

## Credits

An independent community project. The layout and method follow two of the author's earlier programs,
[Republic Observatory](https://github.com/phobos-dthorga/soviet-republic-observatory) and
[OnAir WyrmGrid](https://github.com/phobos-dthorga/onair-wyrmgrid). The libraries it uses are in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). MIT licensed.
