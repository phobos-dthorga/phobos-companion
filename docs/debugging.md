# Debugging the running game: design (20 Nov 2026)

**Status (24 Nov 2026):** **layer 1 is built**: phobos-modkit 1.65.0's heap reader and the Companion's Explorer page (0.41.0,
"The running game" source); its decisions are in `design-record.md` ("Explorer"), and the probe and its plan are history
([history/debugging-layer-1.md](history/debugging-layer-1.md)). Not tested on screen. **Layers 2 and 3 are designed in outline,
not built**, and wait for the owner's word; layer 3 waits for a second probe too. The owner's word of 20 Nov 2026 ("You may proceed
with all that was suggested") built layer 1 and chased the XML lead, which found 453 MB of patch XML kept alive.

**The owner asked for "debug(ging) tools into Companion that you can attach to the games (supported) and with our tools, visual
code analysis, etc. see things like relationships between things, and so much more! While looking at variables in memory"**
(20 Nov 2026). **Owner's choices (20 Nov 2026, by question card):**

- **Look inside first**: a read-only snapshot of the running game to browse, before anything else.
- **Our own debugger window, speaking the Debug Adapter Protocol**, for breakpoints and stepping (layer 3), not a hand-off to an
  editor.
- **An in-game part behind its own setting, off by default** (layer 2), talking to the Companion on this PC only.
- **A test attach once the probe was ready**: run the same day, with a colony loaded, after the owner saved.
- **Later the same day, by question card and on the Decisions page:** one explorer page for saves and the running game; a held
  snapshot let go after ten minutes; Microsoft's ClrMD as phobos-modkit's one C# package, and loading a game's own memory-reading
  library, both as written exceptions to the kit's rules; and a card before every snapshot of their game, including the XML chase.

## Read this first (gotchas)

- **It only reads.** Layers 1 and 2 never write into the game. Changing values in a running game is left out, for the same reason
  the Save explorer leaves out save editing: it is risky, and a wrong write can corrupt a colony.
- **Every attach asks first, every time**, and asks the person to save, as perf recordings and the memory watch already do.
- **A snapshot pauses the game for about half a second** (the kit's `docs/heap-reader.md` gives the measured figures and the reader's limits). The game then
  runs on while the snapshot is read.
- **A held snapshot costs memory as the game runs on.** Windows keeps the snapshot by copying each page the game changes
  afterwards, so the longer it is held, the more memory it takes. It is released when the page closes, after a time limit, or on
  **Let it go** (the limit is a decision below). Not yet measured.
- **Breakpoints freeze the whole game** (layer 3). The window says so in large words while it is stopped, with **Continue** beside.
- **RimWorld 1.7 runs on Ludeon's own build of .NET** (Waylith, `10.0.15-waylithclr.dev`; Ludeon,
  [announcing the Waylith engine, 12 Oct 2026](https://ludeon.com/blog/2026/10/announcing-the-waylith-engine-and-update-1-7/)).
  Its memory-reading library (`mscordaccore.dll`) is not signed by Microsoft, so the reader must be told to accept it, **and accepts
  only the one beside the game's own `coreclr.dll`**, in the game's install folder.
- **Pawn names, colony details and anything the game holds are on screen**, and in any picture the page saves.

## The four questions

| Question | Answer |
| --- | --- |
| What does it let the person do? | Look inside their running game without stopping it: what is in memory by kind and by mod, any object with every value it holds, what it holds, **what holds it and why it is still alive**, and two moments compared. Later (layer 2) values by their in-game names and charted over time; later still (layer 3) stop the game at a line of a mod's code and look around |
| What does it stop them doing? | Guessing from code alone, or from a partial heap snapshot, why memory grows or a value is wrong. Attaching by accident: every attach asks first. Changing the game: nothing is written |
| How does it change the way they work? | A question about the running game that needed a debugger, a dump of many gigabytes or an agent reading decompiled code becomes a few presses, and lands on the same Code map, patches and history the Companion already links |
| What outside the program notices? | **The game pauses for about half a second at each snapshot**, and stops at a breakpoint (layer 3). The layer 2 part is one setting in D'thorga Framework, off by default. Nothing else |

## Three layers

| Layer | What the person does | How | Pauses the game? |
| --- | --- | --- | --- |
| **1. Look inside** (first, owner's choice) | Takes a snapshot and browses it | A C# reader in the kit using ClrMD, reading a Windows snapshot | About half a second, at the snapshot |
| **2. Live view** | Values by their in-game names, our caches beside the truth, Harmony patches as applied, a value charted over time | A part of D'thorga Framework, **behind its own setting, off by default** (owner's choice), answering the Companion through a local pipe | No |
| **3. Debugger** | Breakpoints in a mod's code, stepping, locals, the call stack, in the Companion's own code viewer | **The Debug Adapter Protocol** (owner's choice), driving **netcoredbg** (Samsung, MIT) for .NET games | **Yes, at a breakpoint** |

Layer 1's plan, what the page shows and how it is built, is history now:
[history/debugging-layer-1.md](history/debugging-layer-1.md).

### Layer 2: the live view (designed in outline)

- **A part of D'thorga Framework**, its own section in Framework's settings, **off by default** (owner's choice). It opens a named
  pipe that only this PC can reach, and answers read-only requests on the game's main thread in small slices (a budget per frame),
  so the game never waits on the Companion.
- **What it answers that a snapshot cannot:** the selected thing and its in-game label; Harmony's own list of applied patches and
  their owners (the truth, where the kit's list is read from files); each of our caches beside a fresh recompute; a value watched
  over ticks and charted; seen-in-play notes as they happen.
- **Risk (the shared rules' grade, agent's proposal):** low. It reads only, nothing the player owns can be lost, and only a program
  on the same PC can ask. It still starts off, by the owner's choice.

### Layer 3: the debugger (designed in outline)

- **The Companion speaks the Debug Adapter Protocol** (owner's choice): one debugger window for every game that has an adapter.
  For RimWorld that is **netcoredbg** (Samsung, MIT, can be bundled). Microsoft's own debugger, vsdbg, is licensed for use only
  inside Microsoft's editors, so it is not used.
- **Unproven**: whether netcoredbg attaches to Waylith's runtime. The game ships the debugging library it needs (`mscordbi.dll`),
  but its version reads 42.42.42.42424, which the attach helper may refuse. **A second probe settles this before layer 3 is
  designed further**, with the owner's yes, as before.
- **Our mods would need a debug build to show locals**: the deploy script gains a debug install with symbol files (`.pdb`), never
  shipped to the Workshop.
- **Harmony moves code**: a patched game method runs as a generated copy, so a breakpoint on the original may never be hit. The
  window says so when a breakpoint is set on a patched method.
- **Risk:** a stopped game can be closed by Windows if it stays stopped (a "not responding" box). The window warns after a
  minute stopped.

## Games

| Game | Look inside (layer 1) | Live view (layer 2) | Debugger (layer 3) | Checked |
| --- | --- | --- | --- | --- |
| **RimWorld 1.7** (Waylith's .NET 10) | **Proven by the probe**, 20 Nov 2026 | D'thorga Framework | netcoredbg, unproven | The probe |
| **Ostranauts** (Unity's Mono, BepInEx) | Hard from outside: Mono has no memory-reading library like .NET's | Phobos Framework (Ostranauts), beside Phobos Scope | Needs a debug-enabled Mono; later | Agent's knowledge |
| **Project Zomboid** (Java, with Lua) | A Java heap dump reads Java's objects; its Lua tables are hard | A Lua mod writing files (its Lua cannot open sockets) | Java through a launch option (JDWP); Lua through the game's own debug mode | Agent's knowledge |
| **Farming Simulator 25** (Lua) | No | A Lua mod writing files | GIANTS Studio (Giants' own debugger): the Companion can only point to it | Agent's knowledge |
| **Kenshi, Workers & Resources** (C++) | Only with known memory layouts (KenshiLib for Kenshi): large work | A KenshiLib plugin | Native debuggers; a guide only | Agent's knowledge |

**A game that cannot do something is told so in words**, never shown a blank page (`AGENTS.md`). **Check on two games before
calling it done** applies per layer: layer 1 on RimWorld and on any other .NET game the owner then plays (a Unity game on .NET is
not among them today), so layer 1 is RimWorld-only at first and says so for every other game.

## For other people

It is for people, not for AI agent sessions, so it is **not** among the agent features hidden unless switched on
(`docs/release-audit.md`, B1; agent's choice when building 0.41.0, owner to revise): any player whose game's tools can look inside
sees it, a game whose tools cannot is told so in words, and the Guide's entry says what it does before anyone presses it. Its words
say "your game", never one game's terms. ClrMD and netcoredbg are MIT, so both can be bundled.

## Agent choices, owner to revise

The page's place and key (V, still on the Decisions page); the words "Look inside", "What holds it" and "Why is it still in memory";
layer 2's risk grade.

## Not decided yet

- The Explorer's key (Decisions page).
- How much memory a held snapshot costs over its ten minutes: not yet measured; the limit can change once it is.
- Layer 3's design beyond its outline, until the second probe.
