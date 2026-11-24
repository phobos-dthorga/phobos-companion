---
title: Find out which other programs a page needs
kind: task
go: settings?panel=setup
words: programs, needs, missing, install, git, dotnet, .NET, ilspycmd, Steam, todds, Rust, requirements
see: task-set-up, page-about, term-tool-kit
---
**The Companion brings its own Python, tool kit and compiled tools.** A few pages also use programs of their own: each is needed only by what it names, and nothing else stops working without it.

1. Open **About** (the **I** key) and press **Which other programs do the tools use, and are they here?** It opens **Settings →
   Setup** (since 0.87.0), which can also [fetch a missing one](task-set-up).
2. Each row says whether the program is here, how it was found, what needs it, and where to get it.

### Which page needs what
- **git:** Home, Changes, the Timeline, the code viewer and What changed: every repository's history.
- **The .NET 10 runtime:** the Code map's C# links, and the pages that read Harmony patches and what your code names.
- **The .NET 10 SDK:** watching a game's memory, on the **Memory** page (the tools install Microsoft's diagnostics tools with it).
- **ilspycmd:** reading another author's code, and What did an update change?
- **Steam:** Game files, and Add a game from Steam.
- **A game's own:** for RimWorld, RimSort's texture encoder, to encode textures on the **Mods** page.
