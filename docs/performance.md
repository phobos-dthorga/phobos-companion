# Performance: where the running game spends its time, joined to everything else (design, 28 Nov 2026)

**Status (28 Nov 2026):** designed, nothing built. Slice one (below) has the owner's go: the kit's part first, then the page. When a
slice is built, its design moves into `design-record.md` and this record keeps what differs.

**The owner's request** (28 Nov 2026, after phobos-modkit 1.151.0 gave rimworld-perf callers, hot spots, lock waits, allocations,
timelines and stalls, thread names, a trend across recordings and the game's own tick counter): "what can we do with Companion to
accommodate these in terms of bringing the wealth of new information to the user? As well as creating all the 'cross-links' between
other, relevant, information too, whether that itself needs further collection/processing of its own or not? I only wish to provide
users with relevant, compiled, condensed, information and how it relates to everything else."

## Read this first (gotchas)

- **Recording attaches to the running game.** Every start from the page asks first, every time, and asks the person to save, as
  the Memory watch and the Explorer do. The in-game key (P6) is the one exception: pressing it is the person's own go-ahead.
- **Condensed first.** The page opens on a few ranked findings and the game's own figures; every table stays one press away, never
  the first thing shown.
- **Links come from the kit's link targets (K2), never from reading a report's words.**
- **What the Reports page shows today** (checked 28 Nov 2026, `reports.rs`): only reports the manifest calls `reads`, with a question
  and nothing typed. So rimworld-perf's `report`, `compare` and `trend` show there as plain tables; `callers` and `mod` (a name typed)
  and `record` (attaches) are not offered at all; nothing else in the Companion mentions a recording.
- **Every game, through surfaces**: the page finds its tools by a `performance` surface, as Memory finds `memory-watch`. A game whose
  tools have none is told so in words. RimWorld fills it first; what a next game needs is under [Other games](#other-games).

## Owner's choices (28 Nov 2026, by question card)

Each card as put, the chosen option first and marked.

**Where it lives**

- **Chosen: a new Performance page.** A page of its own under Play, beside Memory and Explorer: record, summary cards, ranked
  findings, charts, drill-downs, and links to every other page.
- Merge with Memory: one "Performance and memory" page, recordings and memory watches together. Fewer pages, but a busier one, and
  Memory's design changes.
- Reports page only: keep it there and add charts, summary cards and links. Least work, but no recording button and no place for
  drill-downs.

**What is built first**

- **Chosen: the page, the findings and the links out.** Kit K1 to K3, then the Performance page with recording, findings and links
  out (P1 to P5, X1 to X8). The links back from other pages are slice two.
- Everything in one go: every part listed, before any of it can be looked at.
- Links back first: cost tags on Mods and the Mod list and time badges on the Code map, from the recordings already kept; the page
  later.

**A key in the game**

- **Chosen: yes, while the Companion runs.** A key (agent's proposal: Ctrl+Alt+P) starts a 30-second recording the moment a stutter
  happens, with no card first; the page shows it. The key is taken only while the Companion is open.
- A mark only: the key marks a moment in a recording or watch already running from the page; recordings start only from the page.
- No key: recordings start only from the page, with a card each time.

**The memory watch and the game's own counter**

- **Chosen: yes, always.** The watch adds D'thorga Framework 0.380.0's meter (`DThorga.RimWorld`: ticks and frames a second, worst
  frame, speed, pawns, maps) to what it already reads, at no extra cost; Memory's chart gains ticks a second, the worst frame and
  garbage-collection pauses. Nothing extra shows where the framework is not loaded.
- Yes, as a switch on the Memory page, off unless chosen.
- No: the watch stays about memory only.

## The four questions (`rules/designs.md`)

| Question | Answer |
| --- | --- |
| What does it let the person do? | See what slows their game and whose it is on one screen, then follow it to the code, the author, the day it changed and the memory it holds; start a recording from inside the game the moment it stutters |
| What does it stop them doing? | Reading fifteen tables to find the one line that matters; blaming a mod from two recordings that were not like for like; asking an agent session to record |
| How does it change the way they work? | Performance is read in the Companion, as memory has been since 19 Nov 2026; a finding is a starting point for the pages that answer what to do about it |
| What outside it notices? | Mods, the Mod list, the Code map, Home, the Timeline and Go to anything (slice two), and Memory's chart (K6) |

## The page

| Id | Part | What it shows or does |
| --- | --- | --- |
| P1 | **Record** | A label, a length (agent's proposal: 15, 30 and 60 seconds, 30 first) and an "allocations too" switch; the card before attaching; progress while it records; the report when it ends |
| P2 | **The game's own figures** | Summary cards: ticks and frames a second, **ms a tick**, the worst frame, the speed, colonists, maps, the save, the game's version, mods loaded. Without the meter, a line says why the cards are missing |
| P3 | **What matters** | At most five findings, ranked by share: a lock the main thread waits on, the longest stall and who caused it, a mod whose share moved in the trend, a busy thread that is not the game's (audio, compiling through Harmony's hook), the busiest hot spot, the biggest allocator. Each is one line and a link |
| P4 | **Pictures** | Ticking over time by mod (stacked bars, the windows the kit keeps), stalls marked on it; ticks a second and garbage collection as lines; the trend across recordings |
| P5 | **Deeper, on a press** | Callers of a method (from a hot spot or a finding), one mod's view, compare two recordings chosen, and the full report's tables |
| P6 | **The key in the game** | While the Companion is open, the key starts a 30-second recording of the chosen game's running process, with the label "from the game" and the time; a second press while it records does nothing. Changeable in Settings, as the Memory mark's key is |

Recordings already kept are listed newest first, by label, and any can be opened; the page reads the kit's per-recording summary
(K3), so the list is instant.

## Links out (slice one)

| Id | From | To | It answers |
| --- | --- | --- | --- |
| X1 | A mod | Mods, `installed`, at that mod | Which version, which files |
| X2 | A mod | Its Workshop page and whether its author is active (`workshop-research report`) | Is it theirs to fix, and will they? |
| X3 | One of our mods | Changes, at its changelog | Which of our versions it was |
| X4 | A method | The Code map: `node` for ours, `their` for anyone else's | What the code does |
| X5 | A method | Its patch badges (L5): who else patches it, and whether the last update changed it | Who else is in there |
| X6 | A lock wait | The holding thread's method, on the Code map | Who kept the door shut |
| X7 | An allocated type | The Explorer at that kind (`kind`) | Is the churn also kept? |
| X8 | The recording | The Timeline at its day (`day`), and Memory at a watch the same day | What else changed then |

## Links back (slice two)

| Id | Where | What it gains |
| --- | --- | --- |
| B1 | Mods, `installed` | A cost tag on each mod from the newest recording, and its trend |
| B2 | The Mod list | A "cost last time" column to sort by (the mod manager that retires RimSort) |
| B3 | The Code map | A time badge beside the patch badges: the method's share of ticking in the newest recording |
| B4 | Home | A performance panel: the newest recording's first finding, and a flag when our mods' trend moves |
| B5 | The Timeline | Recordings, watches and heap snapshots as facts on their day (K5) |
| B6 | Go to anything | Recordings, and methods seen in them |
| B7 | The Guide | Entries for the page, a lock wait, a stall and "ms a tick" |
| B8 | Logs | The log written during a recording (K4) |
| B9 | Tests | A test row that names a recording opens it |

## What the kit collects first (phobos-modkit)

| Id | What | Why | Slice |
| --- | --- | --- | --- |
| K1 | rimworld-perf's reports send `facts`, chart blocks and a ranked findings section (manifest blocks the Companion already draws) | P2 to P4 | One |
| K2 | Link targets on rows and findings: a mod's package id, a method's full name, a type, a thread | Links without reading words | One |
| K3 | A small summary file kept beside each recording (its figures, findings and each mod's share), written at record and at reindex | The list, and slice two's tags, read instantly | One |
| K4 | More context per recording: mod versions, a settings fingerprint, the log's size at the start and the end | Cost before and after a version; "settings changed between these two"; the log slice (B8) | Two |
| K5 | Recordings, watches and heap snapshots as history facts | B5 | Two |
| K6 | The memory watch reads `DThorga.RimWorld` beside `System.Runtime` | The owner's choice above | One |
| K7 | A `performance` surface on rimworld-perf's `record`, `report`, `callers`, `mod`, `compare`, `trend`, `list` and `summary` | The page finds its tools by surface | One |

## Other games

The page reads surfaces and the kit's generic report blocks, so nothing in it is RimWorld's. A next game needs a recorder for its
runtime that fills the same index (frames, threads, samples, owners): .NET games through the same Microsoft tools; Unity's Mono
games need another sampler; **Project Zomboid runs on Java, where Java Flight Recorder could fill it** (an idea, not checked). The
game meter is a mod's part: each game's library would publish its own ticks and frames.

## Agent choices, owner to revise

The page's place (under Play, after Memory) and key; the lengths offered and 30 seconds first; five findings at most; Ctrl+Alt+P for
the game key and 30 seconds for its recording; the summary file's name and contents; which findings rank first (by share of the main
thread, then by the longest single stall).
