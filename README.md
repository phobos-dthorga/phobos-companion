# D'thorga Companion

**One desktop program for every game you mod** (search for it as dthorga too). It shows when you last worked on each game, what
you did, what changed in your mods and their code, what your saves and logs say, and what is ready to play, without typing a
command. It can also install, back up and publish your mods, always on your press.

**Press F1 for the Guide.** It opens at the entry for the page you are on: what each page, tab and button does, and How do I…?
answers in numbered steps. **The Guide is the manual**; this page covers only what you need before the window opens.

- **Early releases are on GitHub** ([download](#download-it-windows)); what still stands in the way of a release for everyone, and
  in what order, is the [release audit](docs/release-audit.md).
- **It sends nothing about you**: what it asks the internet, and why, is [docs/privacy.md](docs/privacy.md).
- **Not yet tested on screen, except where the owner has said so.** It builds and passes its checks; a page or button counts as
  tested only once the owner says it works.

## Before you start

- **It needs git**, to read your projects' history; every page says so if it is missing.
- **The installer brings its own Python and tool kit, and the kit's compiled tools ready-built**, so nothing else need be
  installed. Run beside the repository it was built from, it uses that repository's kit and the Python on the PATH instead;
  `PHOBOS_COMPANION_KIT` and `PHOBOS_COMPANION_PYTHON` name others, and `PHOBOS_COMPANION_BUNDLED=1` tries what another PC's
  install does.
- **It reads a list of your games**: `.local/games.json` beside the repository it was built from, or `games.json` in its own data
  folder once installed elsewhere. **First steps makes it for you** (below), and **Add a game from Steam** adds to it; to write one
  by hand, `config/games.example.json` shows how. Each game names its repositories, and may name its folders (`places`: `data`,
  `saves`, `screenshots`) and its Steam app ID (`steam_app_id`).
  - **A game's `id` must match the tools' name for it** (`rimworld`) for its reports to appear.
  - **An entry may be a set of tools instead of a game** (`"kind": "tools"`): it gets the code and history pages, and the pages
    about saves, logs, a running game and game files say they have nothing for it. The Companion 0.23.0 and older refuse a list
    with `kind` in it.

## Download it (Windows)

**Download `DthorgaCompanion_<version>_x64-setup.exe` from the
[latest release](https://github.com/phobos-dthorga/phobos-companion/releases/latest), run it, then open the Companion from the
Start menu.** It installs for your Windows account only and needs no administrator. Once installed, it fetches newer releases by
itself and installs them when you close it (Settings → Going online → Updates turns that off).

**Windows may warn "Windows protected your PC"**, because the installer is not code-signed yet: press **More info**, then **Run
anyway**. Signing is being applied for (below).

## Install it from the repository (Windows)

**Build the setup program, run it once, then open the Companion from the Start menu** (type "companion") or the desktop.

```powershell
npm ci
npm run installer
```

The setup program lands in `%LOCALAPPDATA%\phobos-modkit\target\release\bundle\nsis\`, named
`D’thorga Companion_<version>_x64-setup.exe`. It installs for your Windows account only and needs no administrator. To update,
build and run a newer one over the top; to remove it, use Windows' **Installed apps**.

- **On the PC it was built on**, the installed program still reads its tools and your games list from the folder it was built in,
  so keep that folder where it is. On any other PC it uses what the installer brought, and keeps your games list in its own
  data folder.
- **Building the installer needs Rust's cargo and the .NET 10 SDK**, to build the kit's compiled tools (`programs bundle`); the
  installed program needs neither.
- **Building the installer fetches Python** 3.14.10's portable Windows build from python.org once (about 12 MB), checks it against
  python.org's own checksum, and keeps it outside the repository (`scripts/installer.mjs`).
- In Windows the name is spelled with a curly apostrophe (D’thorga), because the installer cannot hold a straight one.

## First steps

1. **Open it from the Start menu.** The first time on a PC, Home shows **First steps**.
2. **Choose where your mod projects are**, then **Add a game from Steam**.
3. **Press F1** on any page to learn what it does. The Guide's **First steps** entry walks through the rest.

## Try it from source

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

It prints only what failed. How it is built is [docs/architecture.md](docs/architecture.md), the decisions behind it
[docs/design-record.md](docs/design-record.md), and the rules [AGENTS.md](AGENTS.md). What is proposed and not yet built is kept
in [docs/later.md](docs/later.md), so nothing agreed is lost.

## Code signing policy

**Not signed yet: D'thorga Companion is applying to the SignPath Foundation for free code signing for open-source projects.**
Once accepted, each release's installer is signed this way: *Free code signing provided by [SignPath.io](https://about.signpath.io),
certificate by [SignPath Foundation](https://signpath.org)*, and Windows will show "SignPath Foundation" as its publisher.

- **Built only from this repository's source**, by GitHub Actions on GitHub's own machines, from a version's tag
  (`.github/workflows/release.yml`); nothing is built or signed on a person's PC.
- **Team roles**: Phobos A. D'thorga ([phobos-dthorga](https://github.com/phobos-dthorga)) is the author, reviewer and approver;
  every release is approved by hand before it is signed, and published by hand.
- **Privacy**: [docs/privacy.md](docs/privacy.md) says what the program asks the internet and why; it sends nothing about you.
- How signing would fit the release workflow, and the alternatives: [docs/signing.md](docs/signing.md).

## Credits

An independent community project. The layout and method follow two of the author's earlier programs,
[Republic Observatory](https://github.com/phobos-dthorga/soviet-republic-observatory) and
[OnAir WyrmGrid](https://github.com/phobos-dthorga/onair-wyrmgrid). The libraries it uses are in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). MIT licensed.
