# D'thorga Companion

**One desktop program for every game you mod** (search for it as dthorga too). It will show when you last worked on each game,
what you did, and what your saves and logs say, without typing a command.

## Read this first (gotchas)

- **Right now it is an empty window**: the frame, the House D'thorga theme, and a check that the tools can be reached. Your games
  arrive in the next step.
- **Not yet tested on screen.** It builds and passes its checks; nobody has judged the window yet.
- **It only reads.** It does not change a game, a save or a repository.
- **It needs Python on the PATH**, or `PHOBOS_COMPANION_PYTHON` naming one.
- **It can't be handed to anyone else yet**: it finds its tools by the folder it was built from, or `PHOBOS_COMPANION_KIT`.

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
