# D'thorga Companion: design record (9 Nov 2026)

**Status (24 Nov 2026): a decision log, through 0.78.0.** Each section is one piece of work: what the owner asked, what they
chose, what the agent chose for them to revise, and the risk where one was graded. **How each piece works is in
[architecture.md](architecture.md)** ("How each part works"); what each version delivered is in the [changelog](../CHANGELOG.md);
how to use it is the Guide (F1 in the program). Planning documents of finished work are in [history/](history/README.md).

- **Nothing counts as tested on screen until the owner says so.** The owner approved the mock-up on 9 Nov 2026 ("I like the
  purple vibe") and has used the window since 0.66.0; a section says where the owner has seen something work.
- **Open choices are on the Decisions page** (`config/decisions.json`); an agent choice below stands until the owner revises it.
- The research behind the program, with sources, is phobos-rimworld's
  [research record](https://github.com/phobos-dthorga/phobos-rimworld/blob/main/docs/development/tools-desktop-research.md).
- The AI pieces (0.70.0 to 0.75.0) are recorded in [ai.md](ai.md), going online in [online.md](online.md), publishing in
  [publishing.md](publishing.md) and reading code closer in [code-reading.md](code-reading.md); a section here points to them.

## Read this first

**D'thorga Companion is one desktop program for every game the owner mods.** It asks what you want to know and answers on
screen. Agent sessions keep the command line. Both run the same tools, so both get the same answers.

**Owner's decisions (9 Nov 2026):**

1. A program over every use of the tools, now and in the future, for humans and dragons first.
2. Primarily Rust, with SQLite if a database is needed.
3. Republic Observatory's layout and feel, with a House D'thorga identity.
4. A new sibling repository; phobos-modkit stays the engine.
5. One program for every game, so moving between games does not lose the thread.
6. The name: D'thorga Companion, plain so players can find it.
7. The order: this record and a mock-up, the two kit changes, this repository; then the home page, the report viewer, saves
   and logs, and the planet globe.

**Agent choices, for the owner to revise:** Tauri 2 with Svelte 5 over a Rust host; the Python tools run as processes; the
colours below; the first version only reads (history since the Mods page of 18 Nov 2026: the program now writes to games, mod
lists and the Workshop on the owner's press).

## What each behaviour does to the person

The first behaviours, as designed on 9 to 17 Nov 2026. Each later section answers the same questions for itself.

| Behaviour | What it lets them do | What it stops them doing | How it changes the way they work |
| --- | --- | --- | --- |
| The window (built) | See that the program and the tools are working, or be told plainly what is wrong and what to do | Nothing | Nothing yet: it is the frame everything else goes in |
| "Where was I?" home page (built) | Come back to a game after months and see when they last worked on it, what they did, what was left uncommitted, what isn't released and what's still open | Nothing; it only reads | Changing games stops costing the thread |
| Report viewer (step 5) | Read any tool's report, chosen from a list, with no typing | Run anything the manifest marks as writing, running or owner-only | Long quoted commands are no longer needed |
| Newest save and log (step 6) | See them appear by themselves as they play | Nothing | The page stays current without asking |
| Tests page (built 17 Nov 2026) | See which in-game tests the game has seen working, and pass or fail each with one press, in the moment | Mistake a note for a pass: only their own verdict passes a row | Passes seen in play reach the test list instead of being forgotten |
| Installer (built 17 Nov 2026) | Open the program from the Start menu or the desktop, like any other | Nothing | No more hunting for the exe in a build folder |
| Atlas (step 7, built 10 Nov 2026) | See the whole world as the game draws it, in six views with pollution over any of them, find any place and read any tile | Nothing; it only reads | "Why is that place polluted?" and "where should we settle?" become a glance |

## How it is built

**Moved to [architecture.md](architecture.md)** (23 Nov 2026, the owner's docs rewrite, step 4): the layers from the window to
the kit, the folder map, a page traced from press to file, where every piece of state lives, the security gates, the tests, how
to add a page, and (step 7, 24 Nov 2026) how each part works. The rules it follows are in [`AGENTS.md`](../AGENTS.md).

## The window

Five bands, from Republic Observatory's `docs/dashboard-and-interface.md` (the command bar became the page list down the left in
0.66.0, below):

| Band | Holds |
| --- | --- |
| Command bar | The crest and name, the pages |
| Observation bar | What you are looking at, and whether anything can change |
| Navigator | Your games |
| Canvas | The answer first, then the detail |
| Inspector | Where it came from, and how the tools are |

**For unreliable fine motor control:** controls are at least 44 px, nothing needs a drag, nothing appears only on hover, and
every control is reachable from the keyboard. **For reading:** the answer comes first, body text is 16 px and the floor is
12 px, and text scales with the operating system.

**When something fails, say four things in order:** what happened, what stayed safe, what to do, then the technical detail
folded away (Observatory's `docs/accessibility-guidance-and-notifications.md`).

**Fonts are the system's** (Georgia for headings, Segoe UI for text), as Observatory's are, so nothing is downloaded or
bundled.

## The House D'thorga theme (agent's proposal, owner to judge)

The owner's Dragonself is the palette, in `themes/house-dthorga.json`:

| Role | Colour | From | Means |
| --- | --- | --- | --- |
| `accent` | Amber `#F2A93B` | The eyes | The brand, focus, what needs attention |
| `comparison` | Purple `#B79CFF` | The crest | Worked out from what was read |
| `observed` | Teal `#4FD1C5` | The tail | Read from a file or a save |
| `risk` | Red `#FF8A7A` | The body | Something went wrong |
| `success` | Green `#8BD17C` | The crest's streaks | It worked |
| `canvas` | Near-black `#0E0B10` | | The ground |

A test holds every colour to Observatory's contrast rules: 4.5:1 for text, 1.5:1 for dividers. **Colour never carries a
meaning alone.**

## "Where was I?" (built 9 Nov 2026)

**Each game is a list of repositories** in `.local/games.json`, never committed because it holds paths; nothing about any game is
built in. **Git is read without changing anything** (`--no-optional-locks`, `core.fsmonitor=false`), because background watchers
leaked daemons on the owner's PC in November 2026.

**Agent choices, owner to revise:** a JSON file and not SQLite (the list is short, written by hand or by an agent, and backed up
with the repository); teal for a date read and purple for "how long ago"; Reports and Copy as command left out of the mock-up
until the report viewer gave them something to do.

## The report viewer, first stage (built 9 Nov 2026)

**The Reports page lists every report the kit marks `reads`, gives a plain question and needs nothing typed** (19 for RimWorld when
built). The questions live with the tools, in each adapter's manifest, so the program still names no game. **The host decides**:
it reads the manifest again at the press and builds the arguments itself.

| Behaviour | What it lets them do | What it stops them doing | How it changes the way they work |
| --- | --- | --- | --- |
| Reports by question | Ask 19 questions of their game with a click | Run anything that writes, goes online or needs typing | No more long quoted commands for these |
| Sorting and Show more | Reorder a table and see all of it | Nothing | "Raise --top" and scanning for the biggest number are gone |
| Copy as command | Hand a session exactly what they're looking at | Nothing | Sessions and the program stay in step |

**Agent choice:** columns take the width their words need and the table scrolls sideways, after a real pawn list showed words
broken mid-letter.

## Charts (built 10 Nov 2026)

**Owner's request (10 Nov 2026): "pretty graphs and the like", learning from our other repositories.** Republic Observatory and
OnAir WyrmGrid both draw with Apache ECharts 6.1.0 behind one component fed a small declarative spec (Observatory's ADR-0003,
WyrmGrid's ADR-0004); the Companion does the same. **The tools decide what to draw; the window decides how.**

**What we changed from the sibling programs** (agent choices, owner to revise):

| Theirs | Ours | Why |
| --- | --- | --- |
| Tooltips on hover only (WyrmGrid has no other path) | Each bar's value written at its end, and **Show the numbers** for a sortable table | Nothing may need hover or a steady hand |
| Legend and line labels drawn by ECharts | A key in the page's own text under the chart, dashed swatches for lines | ECharts measured our font wrongly and the labels overlapped; page text is read aloud too |
| Axis text at 10 px | 13 px | The window's floor is 12 px |
| WyrmGrid ignores reduced motion | Motion stops when Windows asks for less | Observatory's rule, adopted |
| Canvas, loaded with the page | SVG, loaded only when a report has a chart; a failed load shows the numbers instead | Crisp at any display scale; a report without charts costs nothing |

**Does ECharts earn its place?** (the five tests in AGENTS.md): a real need now (four charts in the mood report); less upkeep than
our own, since two sibling programs already maintain the same code; one place to replace it from (`echartsCore.ts`); tests on the
option builder and in the browser; and when it fails the table shows.

| Behaviour | What it lets them do | What it stops them doing | How it changes the way they work |
| --- | --- | --- | --- |
| Charts | See the shape of an answer at a glance: who is lowest, what costs most | Nothing | Long tables stop being the first thing to read |
| Show the numbers | Read and sort every figure behind a chart | Nothing | A chart never hides a number |

## Colony mood (built 10 Nov 2026)

**Owner's request (10 Nov 2026), from a play session showing "Extreme break risk x29":** "That might be actually worthwhile
integrating into our Companion, to see where you are lacking mood-wise." They handle mood mostly "with extreme amounts of drugs and
their addictions". The proposal came as a handoff from a phobos-rimworld session
([history/handoff-2026-11-10-mood-report.md](history/handoff-2026-11-10-mood-report.md)).

**Gotcha: a save holds only half of a colonist's mood.** The game saves remembered events (a death, a meal off the floor, a party)
and works out situational thoughts (bedrooms, pain, cold, beliefs, a drug's high) while it runs. So the report counts remembered
events exactly, by the game's own rules, and gives the rest as one figure: mood minus the remembered events. The tool is the kit's
`rimworld-save mood` (1.5.0), which needs no mod running. **Found while building, and fixed:** the game leaves a need's level out
of the save when it is 0; read as unknown, five colonists at 0% mood showed as fine.

| Behaviour | What it lets them do | What it stops them doing | How it changes the way they play |
| --- | --- | --- | --- |
| Colony mood | See in one place which few problems cost the colony the most mood, instead of opening forty Needs tabs | Nothing: it only reads | Fixing the top two or three causes before reaching for drugs (the owner's own words prompted it) |

**The owner's answers (10 Nov 2026), all yes, built the same day:**

- **The snapshot route.** D'thorga Framework 0.64.0 writes the colony mood file at each save (phobos-rimworld's
  [design record](https://github.com/phobos-dthorga/phobos-rimworld/blob/main/docs/development/mood-snapshot.md)); kit 1.6.0
  reads it when its tick count and world seed match the save, so every thought is named as the game counted it. Without a
  matching file the report works from the save and says so. Not yet tested in game.
- **Suggested fixes, labelled as advice.** "Where to start" comes first: the costliest causes the player can act on, each with a
  suggestion. The suggestions are agent-authored, held for the owner's review, in the kit's `mood-advice.json`; a cause only time
  removes stays out of "Where to start".
- **Colonists, slaves and prisoners** together, each labelled; the tool's `--who` narrows it, for the window once reports take
  inputs.

**Agent choice:** a need counts as running low under 30%.

## The atlas (built 10 Nov 2026)

**The owner chose a hex globe drawn with three.js over MapLibre (10 Nov 2026)**, once the owner's world turned out to have
590,492 tiles: MapLibre could only have drawn the land as a flat picture, soft up close and missing at the poles. WyrmGrid
uses three.js too. **The owner asked for every layer in the first version**: biomes, settlements and tile details; pollution;
climate and terrain views; roads and rivers.

**The planet sits as the game's does.** The game builds its world from the same icosahedron our kit rebuilds and never rotates
it (read from the 1.7 code, 10 Nov 2026), so no in-game reading was needed. Reading the game's code also found that the kit kept
each tile's neighbours in its own order, not the game's; kit 1.7.0 fixes it, and the owner's 17,900 river pieces join into 233
river systems.

**Agent choices, owner to revise:** the ramps and their stops; line colours (river blue, road tan); the purple glow from the theme's
comparison colour; amber for the picked tile; the label thresholds; the biome colours (`atlas-palette.json`).

## The Tests page (built 17 Nov 2026)

**The owner asked for it (17 Nov 2026):** passes they saw in play rarely reached the test list, and the checklist should live
here rather than in the game ("Companion only", over an in-game window or both). **The owner's rules:** a note from the game is
evidence, never a pass ("seen working, awaiting your word"), and the owner has the final say on every row.

**The one write.** Recording a verdict was the first thing this program wrote, and only in its own data folder. **Agent choice,
owner to revise:** no extra "are you sure?" step, since it costs a precise second press and changes nothing outside this program;
Take it back undoes it.

## The installer (built 17 Nov 2026)

The owner had trouble finding the program each time and asked for an NSIS setup (17 Nov 2026).

| Choice | What it is | Who chose |
| --- | --- | --- |
| NSIS | Tauri's own Windows installer: Start menu and desktop shortcuts, an uninstaller, updates over the top | Owner |
| For the current user | Installs under the user's local application data, no administrator prompt | Agent |
| Curly apostrophe in `productName` | Tauri's NSIS script broke on the straight one (`IsShortcutTarget`, 17 Nov 2026). The window title keeps the straight one | Agent |
| Not in the gate | The gate still builds with `--no-bundle`; the installer is built on request | Agent |

The data folder is named by the identifier, which is unchanged, so test verdicts carry over. A clean PC came later (0.36.0, below).

## The Mods page (built 18 Nov 2026)

**The owner asked for it (18 Nov 2026):** a part "dedicated to the updating, reversing changes, making backups, etc. all with regard
to our mods", starting with seeing the changelogs "track and update to what I'm either benefitting from or losing as certain changes
are made". The design behind it is phobos-rimworld's
[mod installs record](https://github.com/phobos-dthorga/phobos-rimworld/blob/main/docs/development/mod-installs.md); the tool is
phobos-modkit 1.20.0's `installs`.

| Question | Answer |
| --- | --- |
| What does it let the owner do? | See, mod by mod, what installing from the repository or going back to any backup would give or take away, by changelog entry, with save notes first; then make that move with one confirmed press |
| What does it stop them doing? | Going back or installing while the game runs; making a move without being asked first; losing the install a move replaces |
| How does it change the way they work? | Updating no longer needs a session to run deploy; a bad update can be undone from here without knowing where backups live |

**Round two (built 18 Nov 2026, 0.11.0).** The owner asked, after seeing the page, for a way to compile as needed, a refresh
after it, before and after shown ahead of a compile, and to know whether textures need encoding before a launch ("it's always a wild
guess currently"). **Owner's picks:** check and fix textures (Workshop mods included); Build plus Install everything that changed; all
four before-and-after extras (files, settings, test rows, side by side); a Before you play strip.

**The second write, and the first outside this program's folder.** **Agent choices, owner to revise:** a confirmation step for
every move (unlike verdicts, these change the game's files); Build asks nothing and runs while the game runs, since it writes only
inside the repository; the backup button stays live while the game runs, since it only reads; lists show eight entries before Show
all.

## Who it is for, and what follows from that (owner, 19 Nov 2026)

**"A multi-game, multi-framework, viewer to primarily help me but maybe also others."** From this version on, every design,
change and removal starts from that sentence (the rule is in `AGENTS.md`):

| It means | So |
| --- | --- |
| Every game the owner mods, and every modding framework under them | A page reads what any repository has (a changelog, git, a file it opts in with). A game's own knowledge comes through the kit's manifest and adapters, never from the window or the host |
| Mainly the owner | Their questions lead: where was I, what changed, is it installed, is it ready to play |
| Maybe others | Nothing personal is built in; words say "your mods", not one game's terms; and what stands between this and another person is written down |

**Where each page stood (19 Nov 2026):**

| Page | Any game then? | What a game needs |
| --- | --- | --- |
| Home ("where was I?") | Yes | A repository on the list |
| Changes and the code viewer | Yes | A `CHANGELOG.md` in the repository |
| Tests | Yes, where a repository keeps a test list | `config/test-evidence.json` |
| Mods (install, back up, go back) | Where the kit has an install adapter: RimWorld today | `config/installs.json`, and `games/<game>/installs.py` in the kit |
| Mods (textures) | RimWorld only | A kit command with the `textures` surface; most games have no such step |
| Reports, Atlas | RimWorld only | Kit commands for that game's saves and logs |
| Mods (0.26.2), Atlas, Logs, Memory, Game files, for a set of tools (0.24.0) | Never: a set of tools has none of what they read | Nothing: the page says so in words; Mods points to About |

**What stands between this and another person** is the [release audit](release-audit.md) (20 Nov 2026, after the owner's word
that the Companion is to be released for others).

## Progress (built 19 Nov 2026)

**The owner asked for "progress bars along with some associated status updates, wherever the two would be appropriate".**

| Question | Answer |
| --- | --- |
| What does it let the person do? | See that work is going on, what it is doing right now, and how far along it is where that can be counted |
| What does it stop them doing? | Guessing whether the program has hung, and pressing a button twice |
| How does it change the way they work? | A build or an install can be left to run and glanced at |

**Agent choices:** a step being worked on counts as not yet done, so step 3 of 23 shows two done; where a tool says nothing, the
bar moves under the page's own words.

## The Changes page and the code viewer (built 19 Nov 2026)

**The owner asked for "a code-viewer that helps show off all the new and shiny code associated with any particular CHANGELOG
item", with "a decent syntax highlighter", for the Mods page "and for any future modding I do as well".**

| Question | Answer |
| --- | --- |
| What does it let the person do? | Read what changed in any game's mods, and open the code behind any entry: which files, which lines, coloured by language |
| What does it stop them doing? | Mistaking a whole commit for one entry's work: when a commit wrote several entries, the viewer says so and names them |
| How does it change the way they work? | A changelog becomes a way in to the code, without a terminal or a git client |

**What it means for how changes are written** (the owner asked to be told): nothing new is written in a changelog. The view is
as sharp as the commit is small, so one commit that wrote eight entries shows the same 21 files for each of them. Of three choices
(leave commits as they are; commit separate changes separately where they are separate anyway; one commit for every entry), **the
owner chose the second (19 Nov 2026)**. It is a rule for every repository now, in phobos-modkit's `rules/every-session.md`.

## Tidying, and telling a rebuild from a change (built 19 Nov 2026, 0.13.0)

The owner, on 0.12.0: "I absolutely love how the code is tracked to every particular item", asked for the busiest areas tidied, and
saw "changes in DLLs, across the board, where there might not be any".

| Found | Done |
| --- | --- |
| A button under every entry, all opening the same commit | One button per run of entries one commit wrote |
| Bold marks inside an entry shown as asterisks | Shown as bold and code, never as markup |
| Unchanged code read as changed | .NET stamped the git commit into every assembly; phobos-rimworld turned it off, and the kit tells "only rebuilt" from "files differ" |
| A tall, empty Installed now column | Columns sit at the top; the after column is wider |

## The Timeline page and the Settings page (built 19 Nov 2026, 0.14.0)

**The owner asked for "a timeline (with suitable graph(ic)s) that records/shows how updates were applied, changed, removed, etc.
over time with a suitably recorded history and its facts", because "I like coming back and reading the CHANGELOGs from a particular
update-in-moment but I can't because it is now lost to time"**, and, once the history log needed a home, "a central settings page
where everything or at least, most, of these sorts of things are managed".

| Question | Timeline | Settings |
| --- | --- | --- |
| What does it let the person do? | See what happened to every mod over time at a glance, read any day's facts, and read any changelog exactly as it stood then | See every path the tools read and where each value comes from, and change one for every repository at once |
| What does it stop them doing? | Losing a version's words once a later version rewords or removes them; mistaking today's changelog for what was installed then | Hunting through repositories' ignored files and environment variables to learn why a tool looks where it does |
| How does it change the way they work? | A changelog becomes a history to walk back through, not only today's page | Settings that hold everywhere live in one place, the Companion's own folder |

**Owner's choices (19 Nov 2026):** both views (the lanes and the day-by-day list); the history log in this program's own folder,
with a central settings page to change it; installs recorded from now on, not recovered from backups; the first-class citizens
written up as a design to edit (phobos-modkit's `docs/first-class.md`: Change, Version, Product, Install and Event; nothing there
is a rule until the owner says so). Read it as it stood gained Show the code in 0.15.0, after the owner found it missing, and
mods moved together became one row in 0.15.1, at their request.

**Agent choices:** the marks and their order of strength, ten days at a time, quiet days left out of the overview, and paths only
on the Settings page for now.

## How code connects (built 19 Nov 2026, 0.17.0)

**The owner asked for "flow-charts and the such which show relationships between functions, classes, etc. of the code I'm viewing,
wherever it might be. Such as when I'm viewing a code-slice that I was sent towards from a CHANGELOG"**, pointing at the style of
their Relationships and Factions screens: one thing in the middle, its connections grouped around it by kind, filters with counts,
and a press to put anything in the middle.

| Question | Answer |
| --- | --- |
| What does it let the person do? | See how any piece of code fits in (what calls it, what it calls, what it belongs to, builds on, overrides, patches and uses) and walk from one piece to the next, from a changelog entry or a search |
| What does it stop them doing? | Reading a change as if it stood alone: what a changed method affects, and what affects it, is on screen |
| How does it change the way they work? | A changelog entry leads to its code and from there to the code around it, in any game, without an editor or a terminal |

**Owner's choices (19 Nov 2026):** exact C# from built code; C#, XML Defs, Lua and Python; both layouts (around it, and a flow of
calls); both places (the code viewer's third view, and a Code map page).

**Agent choices, owner to revise:** which connections show at first (all but "holds", which lists a type's every member), 14 members
fanned per hub, two steps each way in the flow, and .NET's own library left out of the connections.

## Keyboard shortcuts (built 19 Nov 2026, 0.18.0)

**The owner asked for "some common-sense keyboard shortcuts as a default setting, and the ability for the end-user to configure
those further to their needs within the Settings Dialog somewhere, perhaps as its own modal deeper within".**

| Question | Answer |
| --- | --- |
| What does it let the person do? | Move between pages, games, views and pictures with one key, and choose those keys |
| What does it stop them doing? | Reaching for the mouse for every move; and, since nothing acts in a text box and each key can be turned off, a stray key doing something unasked |
| How does it change the way they work? | The common moves are a key away, and the full list is one more (?) |

**Owner's choice:** a dialog deeper within Settings. **Agent choices, owner to change:** the default keys, one key each, never two
held at once (numbers for pages, brackets for games, letters for views, + - 0 for zoom). **Once every letter was taken**, the owner
allowed a key to repeat where never on screen together and to be held with Shift, Ctrl or Alt (23 Nov 2026; the rule is in
`AGENTS.md`).

## Cross-links (built 19 Nov 2026, 0.19.0)

**The owner asked for the whole proposed order of cross-links to be built overnight: "Proceed with your entire proposed order,
step-wise if necessary".** The proposal, its order and where each build differed are in
[history/cross-links-proposal.md](history/cross-links-proposal.md); the address form and each page's keys stay in
[cross-links.md](cross-links.md).

| Item | What does it let the person do? | What does it stop them doing? | How does it change the way they work? |
| --- | --- | --- | --- |
| N1 Back and Forward | Follow any link and return exactly where they were, dialogs included | Losing their place when a link jumps pages | Wandering is safe, so links can be followed freely |
| N2 Go to anything | Reach a method, entry, row, setting or report by name from any page | Hunting through pages for where a thing lives | One search box first, pages second |
| N3 Addresses | Keep or share a pointer to any place, and paste it back in | Describing a place in words to find it again | A place can be noted in a file and reopened later, which suits re-reading |
| L4 What was I running then? | See every mod's installed version at the end of any day | Guessing which versions a fault or a memory belongs to | A fault report starts from the versions that were in play |
| L1 The log chain | Go from an error in the game's log to the code it happened in, the change that touched that code, and the backup from before that change | Reading a log of hundreds of thousands of lines, and searching the code, history and backups by hand | "What broke it, and how do I undo it?" is a walk of links rather than a terminal session |
| L3 Test rows joined | Go from a test row to the code that notes it, from a method to the rows that watch it, and from a version to the rows still waiting on it | Searching code for a note's key, or the test list for a version, by hand | "What needs testing" and "what it is" sit one press apart, both ways |
| L5 Patch badges | See, on the method itself, how many other mods patch the same method and whether the last update changed it | Running the patches and upstream tools by hand before trusting a patch | Risk shows where it sits, before an update bites |
| S2 Tool kit pins | See which repositories lag the tool kit, and what moving each pin would bring | Remembering or guessing which kit each repository uses | Moving a pin becomes a choice made with the gains in view |
| S3 Merges on the Timeline | Follow a mod that ended into the mod that took it in, and back | Guessing where a merged mod's story continues | The Timeline reads across a merge as one story |
| S4 Home items as links | Start from "where was I?" and open the commit or the changelog in one press | Hunting for the same commit or changelog on another page | Home becomes a starting point, not only a summary |
| L2 A thing's history | See every commit that changed a method, class, Def or function, with the changelog entries each wrote, and open any of them | Reading git's history by hand to learn why code is as it is | From any node in a picture, "why is it like this?" is one button away |

**Agent choices, owner to change:** the keys , and . (one key each) rather than Alt+Left and Alt+Right; Logs as a tenth page with
the key G; a red dotted ring for a method three or more other mods patch; S1 and S5 not built that night (S1's matching of names in
prose is noisy enough to want the owner's view first; S5 needs rules given ids, the owner's to settle). Both are in
[later.md](later.md).

**Shared code, on the owner's word** (19 Nov 2026): an audit ([shared-code-audit.md](history/shared-code-audit.md)) found code written 3 to 17
times across the host and the window; the owner chose a `companion-core` library crate for the host and a grown
`src/lib/shell/` for the window, all four steps, built in 0.16.0.

**Still open from that night** (19 Nov 2026; [later.md](later.md) keeps the build list):

- **The rest of the report viewer:** forms built from the manifest for the 19 reports that need an input, and the 7 that read
  online. Three tools need extra paths from phobos-rimworld's wrapper scripts (`query-code`, `query-defs patched`,
  `mod-settings`) in the game list first, and the reports' opening lines are written for agents and want moving out of the answer's
  way.
- **Saves and logs as they appear:** Rust watching the folders, with file events as hints, a full check every 15 seconds and a 1.5
  second wait until a file stops changing (Observatory's `recorder_service.rs`).
- **SQLite arrives with the first thing to keep**: two files under the user's local application data, never a synced folder, one
  for what can be rebuilt and one for the owner's own pins and history, with an export.

## Make-up (built 19 Nov 2026, 0.20.0)

**The owner asked to show "how the contents of our mods, code, etc. is consisted of in a graphical manner"**, and chose all six
views, lines as the first measure, and "a mix of new page and inside code map, as appropriate".

| Question | Answer |
| --- | --- |
| What does it let the person do? | See at a glance what each mod is made of, how it grew, where the work goes, how much is tested in game and what players get |
| What does it stop them doing? | Guessing sizes and balance from a file browser, or counting Defs and test rows by hand |
| How does it change the way they work? | Where effort and risk sit is visible: a big, busy, untested part stands out before it bites |

**Agent choices, owner to revise:** a new page (key M) for the content views and the Code map's busiest code for where the work
goes; the 30-day window for changes; "Size as installed" left out (it needs each game's install records; in `later.md`).

## Screen notes (built 19 Nov 2026, 0.22.0)

**The owner said yes to a "something's off" key** (19 Nov 2026), the first of four tools proposed for working with agent sessions.

| Question | Answer |
| --- | --- |
| What does it let the person do? | Flag a page that looks wrong in one key press, with the picture and the page's address kept for them, and a few words if they like |
| What does it stop them doing? | Describing in a conversation where on which page something looked off, and losing the moment when no session is open |
| How does it change the way they work? | Oddities get noted as they are seen, and every session starts by reading them; Home shows what was done about each |

**Agent choices, owner to revise:** the ! key (Shift+1); the button's words "Something's off"; five dealt-with notes on Home; the
folder fixed in the Companion's own folder, not a setting, because the Companion and the kit must agree on it.

## Records backup (built 19 Nov 2026, 0.22.0)

**The owner said yes to backing up the Companion's own records** (19 Nov 2026): Synology does not back up the local application data
where they live.

| Question | Answer |
| --- | --- |
| What does it let the person do? | Keep a copy of every verdict, mark, note and history line somewhere their NAS keeps, in one press |
| What does it stop them doing? | Losing weeks of test verdicts and history to a disk failure or a reinstall |
| How does it change the way they work? | Home says when the copy is old, so backing up is a nudge, never a chore to remember |

**Agent choices, owner to revise:** seven days before Home speaks up; never deleting old copies (the owner prunes by hand); saves
left out (a separate, larger question, in `later.md`); everything in the program's folder but WebView2's cache, so a new kind of
record is included without a change.

## Claims board (built 19 Nov 2026, 0.22.0)

**The owner said yes to a claims board** (19 Nov 2026), after an evening of sessions messaging each other to ask which version
number was free.

| Question | Answer |
| --- | --- |
| What does it let the person do? | See which agent session is working on what, and spot one that ended holding something |
| What does it stop them doing? | Relaying "is 0.174.0 yours?" between sessions, and two sessions shipping the same version number |
| How does it change the way they work? | Sessions sort out shared numbers among themselves; the owner reads the board instead of asking |

**The rule** is the kit's `rules/every-session.md`: take before using, release once committed, ask a holder rather than pick
around them. **Agent choices, owner to revise:** a day before a claim is called old; nothing expires by itself.

## Decisions page and the grouped bar (built 19 Nov 2026, 0.22.0)

**The owner said yes to a Decisions page** (19 Nov 2026), the "Decisions waiting for you" idea of 10 Nov grown into a page, with the
page bar grouped in the same change.

| Question | Answer |
| --- | --- |
| What does it let the person do? | Answer every open choice in one place, with the options and the agent's reasoning beside it, in one press when the lean is right |
| What does it stop them doing? | Hunting through design records for "agent choice, owner to revise" lines, and choices going unrevised because nobody asked |
| How does it change the way they work? | Agents leave questions on a page instead of in prose; sessions start by acting on the answers |

**Agent choices, owner to revise:** the lean chosen to begin with (one press to agree, at the cost of agreeing too easily); the D
key; the groups' names and order (Play, Code and Tools); keys left as they were until the owner answers `page-keys` on the page. **The owner answered "Renumber them"**, and on
25 Nov 2026, by card, since the Mod list had taken S and every letter was in use somewhere, chose **numbers along the bar**
(built 0.94.0): 1 Home, 2 Mods, 3 Mod list, 4 Tests, 5 Logs, 6 Atlas, 7 Changes, 8 Timeline, 9 Code map; **S** Settings,
**G** Reports; Search, when built, **Shift+S**. Keys the person changed themselves stay as they set them.

## Game files (built 19 Nov 2026, 0.22.0)

**The owner asked what the games themselves write that the Companion could show**, made general so a new game needs little setting
up (19 Nov 2026), and said yes to the views proposed (the survey is in [later.md](later.md), item 5).

| Question | Answer |
| --- | --- |
| What does it let the person do? | See before playing what updated since last time, find a save or a screenshot, and see where a game's space goes, for any Steam game |
| What does it stop them doing? | Digging through AppData and Steam's folders, or guessing which mods updated overnight |
| How does it change the way they work? | A start-of-session look tells them what to expect; a new game shows something before it is set up at all |

**Checked on three games:** RimWorld (everything), Farming Simulator 25 (Steam's records; its data folder was not guessed) and
Project Zomboid (saves and space with its data folder named). **Agent choices, owner to revise:** the W key; twelve screenshots and
ten saves a page; space as plain bars rather than a chart.

## Memory (built 19 Nov 2026, 0.23.0)

**A mark from the game** (built 0.98.0; the owner's answer on the Decisions page, "Add a key that works in the game"): while a
watch runs, **Ctrl+Alt+M** marks the moment at once, "Marked from the game", without leaving the game. Agent choices, owner to
revise: the key is the system's only while a watch runs (taken when the page sees one, let go when it ends, the page goes or the
program closes); it must be held with Ctrl or Alt, and a default may hold two of them (the only one that does), so no game loses a
key; words are added on the Memory page afterwards. It needs Tauri's global shortcut plugin, used from the host only. **Risk:
low**: it marks, nothing else, and takes the key from other programs only while a watch runs. **Not tested in game.**

**The owner decided (19 Nov 2026) that memory profiling is done from the Companion**, not by asking agent sessions to run watches.
The tool kit already had the watch (phobos-modkit 1.42.0, fixed in 1.45.1); 1.47.0 added what a program needs to follow and steer it.

| Question | Answer |
| --- | --- |
| What does it let the person do? | Watch the game's memory for a few minutes at a press, see it as it goes, mark what they do ("reloading now") at the moment they do it, stop early, and read any kept watch's report |
| What does it stop them doing? | Starting a watch by accident or without a warning: a watch that attaches to the game asks first, every time. Reading figures before knowing what happened: the report opens with the saves the log shows loaded, the marks, and a bold line when a marked reload never reached the log |
| How does it change the way they work? | No agent session and no console: the owner runs short watches between restarts themselves, and the marks put their intentions beside the figures |

**Checked on:** RimWorld, the one game whose tools have a memory watch; for every other game the page says so in words.

**Agent choices, owner to revise:** the lengths offered (5, 10, 15, 20, 30 and 60 minutes, 15 first, from the owner's word that 60 was
"a bit generous" and 15 to 20 workable); .NET's figures on by default; the keys U (page), T (start), B (mark) and X (stop); the five
quick marks' words; stopping without a confirmation, since nothing is lost; the page under Play, after Logs. Four questions are on the
Decisions page: marking from inside the game, starting a watch by itself when the game starts, the first length, and the keys.

**Not built:** marking without switching from the game (a global key), carrying a watch across a game restart or starting one when
the game starts, editing or removing a mark, and the heap snapshot's comparison.

## Tools beside the games, loading pages, the atlas's top (built 19 Nov 2026, 0.24.0)

**The owner asked (19 Nov 2026) for the Companion "as its own game"**, knowing it would need exceptions, and chose one entry
holding all three tools (the Companion, phobos-modkit and phobos-log), with the pages that cannot serve it saying so. In the same
request: pages that showed only a progress bar and empty space (all Save a picture caught while one loaded), and a tidier atlas.

| Question | Answer |
| --- | --- |
| What does it let the person do? | Follow the tools' own work where they follow a game's: where was I, what changed, the timeline, the make-up, the decisions waiting. Take a picture of a page that is still loading and get the page, not its bar |
| What does it stop them doing? | Opening a game-only page for the tools and meeting a failed reading or a blank: the page says why there is nothing. Sharing a picture of a loading bar by accident |
| How does it change the way they work? | No switching to a terminal or GitHub to see what the tools did; P can be pressed as soon as a page is opened |

**Owner's choice (0.26.2):** Mods counts as game-only, since its words are a game's and a tool's installed version is About's.
Tests and Reports stay for a tools entry: each already says when a repository has nothing for it.

**Agent choices, owner to revise:** the entry's name (D'thorga Tools) and id (`tools`); which pages count as game-only; the dashed
edge; half a second of staying loaded before the picture; the side column's width (300 to 380 px) and the 960 px point where it
appears. Two questions went to the Decisions page: Code map readers for TypeScript, Svelte and Rust, and how much of decompiling to
take on.

## About (built 19 Nov 2026, 0.25.0)

**The owner asked (19 Nov 2026) for "a proper, About, page"**: they kept forgetting which version was installed and could find no
version number anywhere.

| Question | Answer |
| --- | --- |
| What does it let the person do? | See at a glance which version is running, and from any page; learn whether a newer one is waiting and where its installer is; read what this version brought |
| What does it stop them doing? | Guessing whether the last install took, or running an old version without knowing |
| How does it change the way they work? | No asking an agent session or digging through folders for a version: it is in the status bar, and About answers the rest |

It serves every game the same: it is about the program, not a game. **Agent choices, owner to revise:** the I key; the page under
Tools, last; the version in the status bar's right end; at most ten newer versions listed; no Show in folder buttons (the paths are
plain text to copy).

## Their code and updates (built 19 Nov 2026, 0.26.0)

**The owner chose "Read and compare, on your press" (19 Nov 2026)** for how much of decompiling the Companion takes on, and was
delighted by the idea of reading third-party code: "I like that we can delve even deeper into code now".

| Question | Answer |
| --- | --- |
| What does it let the person do? | Follow a patch of ours into the method it patches and read it; read any outside thing on the map; see what a mod's or the game's update changed, down to one method's diff |
| What does it stop them doing? | Guessing what a method we patch does, or asking an agent session to decompile and read it out. Decompiling a file the tools did not name |
| How does it change the way they work? | When an update breaks something, the trail is Code map → the patch → See what changed → Their code, all in the window |

**Checked on:** RimWorld, against the owner's real clones, decompiles and archive; every other game has no `other-code` or
`updates` surface, and the Code map says so in words.

**Agent choices, owner to revise:** Decompile asks no second question (it writes only into the tools' cache, like Build); the
panels' places on the Code map; files kept only once are left out of the updates list; the first lines shown (400).

## Clean up, and the settings list at once (built 20 Nov 2026, 0.27.0)

**The owner asked (20 Nov 2026)** for the Mods page's settings list not to sit on its bar after a start, for the tools' cache to
move off Windows' Temp folder to K:, and for "some kind of ongoing cleanup process", with their yes before anything goes.

| Question | Answer |
| --- | --- |
| What does it let the person do? | See what the tools, builds and tests left behind, by group, and clear the groups they choose; see their settings list the moment the page opens |
| What does it stop them doing? | Deleting a way back by accident (install backups start unchosen), or deleting anything without a confirmation; waiting on a bar that looks stuck |
| How does it change the way they work? | Room is reclaimed from the window when Home says it is worth it, with no command line |

**Why the list looked stuck (found 20 Nov 2026):** the read takes about 4 s with its cache warm; just after the program starts,
Home's git reads and the Mods page's three Python reads start together, beside the game. With an empty cache the history takes
about 3 minutes; the cache now lives on K: (`modkitCachePath`), where Windows' clean-ups do not reach.

**Agent choices, owner to revise (both on the Decisions page):** Home's 5 GB threshold; install backups starting unchosen. Also:
the half-hour between Home's looks; the panel's place under Back up your records.

## Since you last played (built 20 Nov 2026, 0.28.0)

**The owner chose it as the next build (20 Nov 2026)**, from three offered: the question they have before launching, answered by
joining parts that already existed (Game files, the patch targets' updates, the archive, the code compare).

| Question | Answer |
| --- | --- |
| What does it let the person do? | See before playing what updated since the session before, and whether any update changed a method our mods patch, going straight to the change |
| What does it stop them doing? | Launching into a broken patch unawares; trusting "nothing changed" when the new build was never compared (it says so, and offers to keep it) |
| How does it change the way they work? | No agent session or script before a launch to ask what an update did |

**Checked on:** RimWorld, with the owner's real data (Vanilla Furniture Expanded - Factory's update of 19 Nov 2026 changed
`Building_Conveyor.Tick` and `PeriodicCacheCheck`, which D'thorga Factory Additions patches).

**Agent choices, owner to revise:** matching updated items to kept files by name (a mod renamed between builds would be missed);
the line's place in Before you play; Keep the new builds without a second question (it writes only into the tools' archive).

## Records copy themselves, and Windows' pickers (built 20 Nov 2026, 0.29.0)

**The owner found backups not working** (20 Nov 2026): no folder had ever been saved for the records backup, and nothing ran by
itself. They chose copies "every few hours when it's open, and if the schedule is missed, the soonest next opportunity", records
only (saves stay a separate question), and pickers wherever a folder is chosen, keeping the type-in box.

| Question | Answer |
| --- | --- |
| What does it let the person do? | Keep their records copied without remembering to; choose any folder or file with Windows' own picker |
| What does it stop them doing? | Losing weeks of verdicts and notes to a forgotten backup; typing long paths by hand, which their hands make hard |
| How does it change the way they work? | Choose the folder once; Home speaks only when a copy failed |

**Agent choices, owner to revise:** 6 hours, the 10-minute look and the 20-second first look; no event channel (the window asks).

## Add a game from Steam (built 20 Nov 2026, 0.31.0)

**Item 5 of `later.md`, agreed by the owner on 19 Nov 2026**, built overnight on their go-ahead of 20 Nov 2026 ("proceed at your
leisure and even agency").

| Question | Answer |
| --- | --- |
| What does it let the person do? | Put a game Steam has installed on the list in a few presses, its data folder chosen from guesses or with the picker, its repositories ticked |
| What does it stop them doing? | Hand-editing `games.json`, where one misplaced comma stops the program reading every game |
| How does it change the way they work? | A new game is one press away from the Game files page; the list is no longer a file to maintain |

**Not built:** changing or removing an entry (still by hand), giving an older entry its Steam app ID, and a game Steam does not
install. **Agent choices, owner to revise:** the id from the name, one copy of the list as it was (replaced at each add), the
scoring of guesses (phobos-modkit's `docs/game-files.md`).

## Screenshots on the Timeline (built 20 Nov 2026, 0.32.0)

**Item 5 of `later.md`, agreed by the owner on 19 Nov 2026** ("a gallery, each picture placed on the Timeline on its day"), built
overnight on their go-ahead of 20 Nov 2026.

| Question | Answer |
| --- | --- |
| What does it let the person do? | See the pictures they took beside what changed that day, and open any one whole |
| What does it stop them doing? | Hunting through Steam's numbered screenshot folders to remember what a day in the game looked like |
| How does it change the way they work? | The Timeline holds play as well as work: a day of only screenshots gets its place, and a fault's day shows what was on screen |

No image library was needed. **Agent choices, owner to revise:** 360 pixels, two at a time, six a day before Show all, twelve on
the Game files page, 64 MB at most. **Not built:** the RimWorld extras (start-up chart, crashes on the Timeline, the creations
shelf), in `later.md`.

## Themes (built 20 Nov 2026, 0.33.0)

**The owner asked for themes (20 Nov 2026), with their OnAir WyrmGrid as the best reference**, and chose everything OnAir has
(choosing, import, export, removal and the authoring tool) and two built-ins beside House D'thorga: Phobos D'thorga and High contrast.

| Question | Answer |
| --- | --- |
| What does it let the person do? | Choose how the Companion looks, share a theme as a file, and make their own with every colour checked as they go |
| What does it stop them doing? | Making a theme whose words cannot be read; bringing in anything but colours (no CSS, fonts, pictures or addresses) |
| How does it change the way they work? | High contrast for tired eyes or a bright room is one press away; a theme made once travels with the records backup |

**Phobos D'thorga** is OnAir's of that name, mapped to the Companion's roles: ember-red accent, amber for what was read, lilac for
what was worked out, pale coral for what went wrong (so it is not the accent's red). **High contrast** is OnAir's, with yellow as
the accent. Both pass every check (weakest words 6.0:1). **Agent choices, owner to revise:** those mappings; the role names the maker
shows; the author line shown only on the owner's themes. **Not built** (as OnAir): fonts, pictures, layouts or any CSS, which stay
refused. The rest of the theme ideas are in [later.md](later.md), Theming, round two.

## Code in VS Code's colours (built 24 Nov 2026, 0.76.0)

**The owner asked to bring the code viewer's colours "more inline with that of VS Code"** (24 Nov 2026), and chose by card the
switch to VS Code's own grammars with a VS Code theme brought in for the colours. This is step 1 of [Reading code
closer](code-reading.md); bringing in a theme is step 2.

| Question | Answer |
| --- | --- |
| What does it let the person do? | Read code in the colours they know from their editor: keywords, flow words, types, methods, variables, constants, strings, numbers, comments and tags each their own colour |
| What does it stop them doing? | Reading names, calls and variables as one undivided colour, as the five colours of 0.12.0 showed them |
| How does it change the way they work? | Moving between the editor and the Companion costs nothing: the same piece of code looks the same in both |
| What outside it notices? | Every theme (twelve code colours, checked) and the maker (a Code group and a code sample in its preview); the Guide's theme entries |

**House D'thorga takes Dark+'s colours**, keywords and tags (#569CD6 → #5CA2DC) and comments (#6A9955 → #78A964) a shade lighter,
since Dark+'s own fall below 4.5:1 on a removed line (4.49 and 3.97). A theme without code colours takes the roles code used
before, so the owner's own themes look as they did. **Checked on several games:** phobos-rimworld (C#, XML), phobos-ostranauts (C#,
JSON), Project Zomboid's PhobosLib and Chemistry Pathways (Lua), phobos-modkit (Python), the Companion (Svelte, Rust, TypeScript,
TOML, Markdown).

**Agent choices, owner to revise:** the twelve roles and their words; mapping Dark+'s selectors to roles (`scopeRoles.json`); Dark+'s
regex red to strings and its tag brackets' grey to operators; Phobos D'thorga's and High contrast's code colours; comments not
italic (VS Code's Dark+ does not italicise them; the old colours did).

## Code colours from VS Code (built 24 Nov 2026, 0.77.0)

**The owner chose "Switch, plus bring in a theme" by card** (24 Nov 2026): step 2 of [Reading code closer](code-reading.md).

| Question | Answer |
| --- | --- |
| What does it let the person do? | Read code in exactly the colours of the VS Code theme they use, chosen from a list of the themes on their computer, or from any theme file |
| What does it stop them doing? | Hunting through AppData for a theme file; bringing in anything but colours; code they cannot read because a theme was made for another background |
| How does it change the way they work? | Code in the Companion looks the same as in their editor, whichever theme the editor uses |
| What outside it notices? | Every place code is shown (code viewer, Their code, the sample), which colours again at once; the records backup, which copies `code-colours/` with the rest |

**Agent choices, owner to revise:** files a theme builds on are **followed, from the same folder only**, against the design's
"refused": VS Code's own Dark Modern builds on Dark+, which builds on Visual Studio Dark, so refusing `include` would have refused
the theme the owner most likely uses. A colour that cannot be read on the theme in use takes the theme's own code colour for its
kind. **Owner's choice since** (by card, 24 Nov 2026: "Replace it, and say so").

**Measured by hand on this PC's VS Code** (an ignored test, `vs_codes_own_themes_on_this_computer_are_read`): Dark Modern 65
rules, 26 swapped on House D'thorga; Dark 2026 118 and 32; Dark+ 65 and 26; Dark High Contrast 54 and 19; Light Modern 64 and 61.
Nearly every swap on a dark theme is Dark+'s blue, `#569CD6` (4.49:1 on a removed line, 0.01 short), which takes House
D'thorga's `#5CA2DC`.

## Lines and pictures lit together (built 24 Nov 2026, 0.78.0)

**The owner chose "Lines and boxes lit together" by card** (24 Nov 2026): step 3 of [Reading code closer](code-reading.md).

| Question | Answer |
| --- | --- |
| What does it let the person do? | See which lines of a change are one method's, and go from those lines to the method's picture and back without losing their place |
| What does it stop them doing? | Reading a long change as one undivided run of lines, and matching a box in the picture to its code by eye |
| How does it change the way they work? | "What did this change do to this method?" is two presses: light it, then How it connects |
| What outside it notices? | The kit (`connections changed` gives `at`, 1.112.0) and the connections picture, which now hands its centre to the viewer |

**Owner's choice** (by card, 24 Nov 2026): the picture above the lines ("Picture above lines"). **Agent choices, owner to
revise:** lit by an
accent bar and bold accent numbers, not by colour alone; **Shift + N** for The code as it was, since every single letter is taken.
**Not built here:** calls gone and added and the ring finder (step 6), which wait for the owner's word.

## Names to follow in C# (built 24 Nov 2026, 0.79.0)

**The owner chose "Roslyn for C#, by name elsewhere" by card** (24 Nov 2026): step 4 of [Reading code closer](code-reading.md),
on phobos-modkit 1.111.0's `connections names` (its names reader, Microsoft's Roslyn, the kit's second C# package).

| Question | Answer |
| --- | --- |
| What does it let the person do? | Press any name in C# code and see what it is, its signature and where it is declared, then go there, see how it connects, or read the game's or another mod's code for it |
| What does it stop them doing? | Searching by hand, or opening an editor, to learn what a name is and where it comes from |
| How does it change the way they work? | A changelog entry leads to its code, and the code leads on to whatever it names, from the keyboard as well as the pointer |
| What outside it notices? | The kit (its names reader, built on first use with the .NET SDK), the connections picture (How … connects) and Their code (Read their code) |

**Agent choices, owner to revise:** the card above the lines rather than a step of the trail, so no Back is needed (the design had
"a step of the trail"); Go to its declaration moves within the lines when they show it and opens its lines on the card otherwise;
uses ringed by outline, never a background, to keep the code's contrast; **F12** beside **Enter**, as in VS Code; the arrow keys
act only once a name is chosen, so they still scroll the code otherwise; **Read their code** offered for the game's and other
mods' assemblies, never .NET's own. **Risks:** the reader needs the .NET SDK (without it a line says so and the code still shows);
about 3 to 7 s a file, not yet cached by the kit; other files are read as they stand now, not as they stood at the commit. **Not
built here:** names by name for Lua, Python and XML (step 5). **Not tested on screen**, nor through the window with the real reader.

## Names found by name in Lua, Python and XML (built 24 Nov 2026, 0.81.0)

**The owner said "proceed with steps 5 and 6"** (24 Nov 2026): step 5 of [Reading code closer](code-reading.md), on
phobos-modkit 1.115.0, where `connections names` reads Lua, Python and XML by name from the connections graph.

| Question | Answer |
| --- | --- |
| What does it let the person do? | Follow a name in a Lua script, a Python tool or a Def file to what it names, as in C# |
| What does it stop them doing? | Searching the Code map by hand for a function or Def a line names |
| How does it change the way they work? | One way to follow a name in every language their mods are written in, with the same card and keys |
| What outside it notices? | The kit's connections graph, which it reads; nothing new is written |

**Agent choices, owner to revise:** the kit's `names` answers every language (rather than the window asking `find` word by word,
as the design had it), so the card, marks and keys are one for all; a dotted name matched whole first, then each part; up to
eight things listed for a name that may stand for several, the first chosen. **Risks:** a common word that is also a function's
name is marked (by name means it may be wrong, and the card says so); the things are read as the repository now stands, the file
as it stood at the commit. **Not tested on screen.**

## Calls gone and added, and the ring finder (built 24 Nov 2026, 0.82.0)

**The owner said "proceed with steps 5 and 6"** (24 Nov 2026), having chosen "calls gone and calls added" and "a ring finder"
from the picture card: step 6 of [Reading code closer](code-reading.md), on phobos-modkit 1.116.0's `connections calls`.

| Question | Answer |
| --- | --- |
| What does it let the person do? | See which calls a commit took away from a method, which it added and which moved whole to another, and whether it made or cut a ring of calls, before reading its lines |
| What does it stop them doing? | Reading a change line by line and missing what it did to the shape: the ring behind the crashes of 23 Nov 2026 was one call from our override to the game's and one back |
| How does it change the way they work? | "Did this fix break the loop?" is answered by a drawing and a sentence under the picture |
| What outside it notices? | The kit (its names reader, run on the commit's files before and after it; its assembly reader, for the game's methods a change hands on to, from the game's install) and the connections picture, which shares its middle with the calls shown |

**Agent choices, owner to revise:** the calls sit under the picture (as the lines do, the owner's choice by card of
24 Nov 2026); only rings a commit made or cut are drawn, those it left standing are counted in one line; a ring
cut is dashed, one made solid and heavy, with the words "cut" and "made" in its middle; a call gone dashed and struck through, a
new one heavy, a kept one thin, each with its word; Before, After and The change belong to the calls, not yet to the lines; the
game named for every commit, so a game with no reader of its assemblies gets the kit's limit line rather than silence. **Risks:**
about 7 s a commit (the methods read twice; the game's for about 2 s of it), not cached by the kit; files the commit did not
change are read as they stand now; at most 12 changed files are read; a ring is followed only one level into a base method of
ours and through the game's methods a change hands on to. Checked on phobos-rimworld's stove-bills fix (`5c122faf`): one ring
cut, `AvailableOnNow → AvailableReport → the game's RecipeWorker.AvailableReport`, and 6 calls moved into `Check`. **Not tested on
screen.**

## Setup: what the pages need (built 25 Nov 2026, 0.87.0)

**The owner asked** (25 Nov 2026): "what can we do to help the user in setting anything up that might be necessary for them? Via
Companion, of course."

| Question | Answer |
| --- | --- |
| What does it let the person do? | See in one place every program the pages use beyond the Companion, whether each is here, and fetch a missing one with a press |
| What does it stop them doing? | Finding out a program was missing from a page that failed in a tool's words, then hunting for where to get it |
| How does it change the way they work? | Setting up becomes a list to work down, once; Home says when an everyday page is missing something |
| What outside it notices? | Windows: a fetch installs a program for the whole computer or the person, through winget or .NET, and Windows may ask for an administrator's yes |

**Owner's choices (by card, 25 Nov 2026):** build all four kinds of help (this **setup check** first; **"say it on the page"**
built in 0.88.0; **starter files for a repository** built in 0.89.0; an **AI helper** built in 0.90.0); a missing program's command is **shown, and run on a press**;
the check is **a Settings tab with a line on Home**; a clean-PC trial in Windows Sandbox **later**.

**Agent choices, owner to revise:** the commands live in the tool kit's program rows (kit 1.118.0), so every game and the
command line share them; **winget** for git, .NET 10 and Steam, **`dotnet tool install`** for ilspycmd, page only for the rest;
winget told to accept its catalogue's agreements, since the person saw the command and pressed (it cannot ask on a console nobody
sees); the .NET SDK split from the runtime into a row of its own; **I don't need it** sets a row aside and Home stops naming it;
Home names only everyday programs (git and Steam), and git keeps its own line on every page; after a fetch, the search path is
read again from Windows so a new program is found without a restart; one fetch at a time; output kept to its last 6,000
characters. **Say it on the page** (0.88.0): which pages use which program is the Companion's own data
(`config/setup-pages.json`), since pages are its own, not the kit's; the line shows for a program set aside too, since the page
still can't work without it; it sits above the page's own content and never replaces a failure the page shows. **Starter
files** (0.89.0): three starters, as data in `config/repository-starters.json`: a changelog (ticked by default, offered where the
repository has none up to three folders down), the open-work list and, for agent sessions, an empty decisions file. The files that
need the person's own facts (`installs.json`'s install command, `test-evidence.json`'s test list, `settings.json`'s folders) are
not offered: a starter would only be wrong. Nothing is committed; `git init` is not run for a repository without git, only said.
**Risk: low**, since a starter is only ever a new file, shown first, and git shows it as new. **Forms** (0.93.0; the owner's
"Yes, build forms"): `installs.json` (offered only where the tool kit has an install adapter for the game; the install command
must name `{mod}`), `test-evidence.json` (a test list already in the repository; no rows, which the tool kit's own page explains)
and `settings.json` (one setting; more are added by hand). Agent choices: the fields' words are English in the data, as the chat
agents' are; a form's file is shown with Show the file and can be ticked only then, and any change shows it again; a path chosen
in Windows' picker is written relative to the repository and refused outside it; the install command's words split at spaces,
"double quotes" keeping a word whole. **AI helper** (0.90.0): a section
last on the tab, "AI, if you want it". Local model runners (Ollama, LM Studio) are looked for only on a press, by asking for their
models, the same call Settings → AI makes; a found model is used with one press. Online services are left to Settings → AI, since
they need a key and the Going online switch. Each chat agent is found or not as Settings → AI already says; **Try** starts a found
one in the Companion's own folder for the protocol's handshake only (its name, version and ways to sign in), then ends it; **Use it
for chat** chooses it. The Chat page's switch is not turned on from here: it is said, with a button to it, since its risk was graded
high. **Risk of Try: low**: the agent is given no repository, terminal, reports or conversation, so it can read or change nothing
through the Companion, though as its own program it runs with the person's own access for the moment it is up.

**The owner's word on the agent's choices (by card, 25 Nov 2026):** winget accepting its catalogue's agreements: **keep it**;
Home names **Steam and .NET 10** (the .NET 10 runtime is everyday since kit 1.124.0; built 0.92.0); **guided forms** for
`installs.json`, `test-evidence.json` and `settings.json`: **yes, build them**; Setup switching the Chat page on: **link only**.
**Linux fetch commands** (0.92.0, kit 1.124.0): git and .NET 10 from the distribution's own feed through `pkexec`, which may start
only `apt-get`, `dnf` or `pacman` (`setup::command_of`); no Linux build exists yet, so none has run.

**Risk, graded by the agent: low.** A fetch installs a program the person named, from the system's own catalogue, after they read
the command and pressed Run it; Windows asks its own yes where it needs one. Nothing is removed or changed beyond that install, and
it never runs by itself, so it has no setting to switch it off. **Limits:** commands are known for Windows only (and ilspycmd on
every system); a Linux or macOS row gives the page alone until a `fetch` entry for that system is added to the kit's row; whether
an installed program works is not checked, only that it is found. **Not tested on screen, and no fetch has been run.**

## System activity in the status bar (built 25 Nov 2026, 0.86.0)

**The owner asked** (25 Nov 2026): "in Companion somewhere on all windows, I want there to be shown a little display of your
system activity, perhaps things like CPU, Disk, and Network, since GPU doesn't really come into it for this app".

| Question | Answer |
| --- | --- |
| What does it let the person do? | See at a glance how busy the computer is, and how much of that is the Companion and what it started |
| What does it stop them doing? | Opening Task Manager to learn whether a slow moment is the Companion's doing |
| How does it change the way they work? | A long report, an agent's command or a game starting shows as it happens, in the bar they already look at |
| What outside it notices? | Nothing outside the window: it only reads the computer (stated as a choice) |

**Owner's choices (by card, 25 Nov 2026):** the whole PC **with the Companion's share** beside it; **CPU, disk, network and
memory**; **in the status bar**; **a number and a tiny graph** of the last minute. GPU: "fit it if you truly feel it's necessary";
**the agent left it out** (the Companion barely uses one; a local AI model's use of it would be the case for it, and `sysinfo`
can read it should that come). **Agent choices, owner to revise:** once a second; the last minute kept; the Companion's share
taken as its process and every descendant, re-listed every fifth second (a measured halving of the cost); disk as reading plus
writing a second, not how busy, which `sysinfo` does not give; a rate graph's top the minute's busiest moment, never under
1 MB/s so a quiet minute draws flat; the loopback left out of network; graphs and shares folded away under 900 px; no setting to
hide it yet. **Limits:** network has no share; a program the Companion starts joins its share within five seconds. **Not tested
on screen.**

## Jumps between data files and code (built 24 Nov 2026, 0.83.0)

**The owner said "go ahead with Step #7"** (24 Nov 2026), having chosen "jumps between XML and C#" from the picture card: step 7
of [Reading code closer](code-reading.md), on phobos-modkit 1.117.0's `connections --game` and `connections jumps`.

| Question | Answer |
| --- | --- |
| What does it let the person do? | Press a translation key in code and read its English words; press a class, a Def or a parent in a data file and land on it; press a DefOf field and see its Def; from an English line or a Def, see every method that names it |
| What does it stop them doing? | Searching by hand for the line a key or a Def is declared on, or for the code that uses one; not noticing a key the code asks for that no English line gives |
| How does it change the way they work? | Data and code read as one body: a change to a Def leads to the class that runs it, and a change to an English line to the code that says it |
| What outside it notices? | The Code map and How it connects (translation keys and data objects are things, with what uses them), a thing's history, Go to anything, and the changed things of a commit (a changed English line is its key) |

**Counted first, as the design asked.** Every rule was run on phobos-rimworld and phobos-ostranauts before it was kept: about
9,400 names in the first and 4,400 in the second. The count threw out or narrowed eight rules, the worst being `.Named("X")`
read as a Def's name (2,013 of 2,019 were the arguments of translations) and "any string that is a translation key" in
Ostranauts (short keys such as `status`). The figures and what was left out are in phobos-modkit's `docs/connections.md`,
"What the count found". **A rule that could not be counted is not kept.**

**Owner choices:** jumps between a game's data files and its code (the picture card); the count before building (this design's
own rule, agreed with the record); and, by card after it was built (24 Nov 2026): any plain string that is a key's or a Def's
name can be pressed in RimWorld C# ("Keep them"), and a name of nothing here can still be pressed and says so ("Yes, say so on
card"). **Agent choices, owner to revise:** which rules each game has (the kit's two tables); a name a
rule found says so on its card, with the rule's own words, and that a rule can be wrong; a C# name read exactly keeps that
reading and gains what it also stands for beneath it, never in its place; every `connections` question names the game, so the Code map shows the same things the viewer does; a
translation file's prose is never read word by word; the name card keeps to half its pane and scrolls within itself. **Risks:** a
rule reads text, so a name passed about in a variable is read where its string is written and a key built from pieces is not read
at all; with the game named the kit keeps a second store for the repository, read once (about 17 s for phobos-rimworld); the
game's own Defs and translation lines are not opened ("the Def as patched" in the first design needs a Defs page the Companion
does not have); Project Zomboid has no table yet (it needs only one). **Risk grade: none to the person's things**: it only reads.
**Not tested on screen.**

## The Guide (built 20 Nov 2026, 0.34.0)

**The owner asked for "documentation, or an encyclopedia, into the Companion, so I know what to do or how to find something"**,
and chose the Companion's own guide first (game guides later) and F1 to open it at the page shown.

| Question | Answer |
| --- | --- |
| What does it let the person do? | Find how to do something, or what a page or word means, without leaving the Companion; go straight there |
| What does it stop them doing? | Hunting through pages, or asking an agent, for something the program already does |
| How does it change the way they work? | F1 on any page answers "what is this?"; a search answers "how do I…?"; re-reading is easy |

**Agent choices, owner to revise:** the entries' wording (agent-authored, written to the player-language rules), the three kinds and
their names (How do I…?, Pages, Words), and the search's weighting (title over search words over text). **Next, on the owner's
word:** each game's own player guide (RimWorld's `docs/player-guide/` first) on the same page. Since the docs rewrite (step 7,
24 Nov 2026) **the Guide is the manual**: the README is a front door that points to F1.

## Check what they mean for ours (built 20 Nov 2026, 0.35.0)

**The owner asked "Can this be implemented into Companion, actually, if not already the case? This kind of check?"** (20 Nov 2026),
after an agent answered "what do these updates mean for our mods?" by hand with five tools, and chose all four missing checks by
question card. Since you last played already flagged methods we patch that an update changed (0.28.0); this adds the rest.

| Question | Answer |
| --- | --- |
| What does it let the person do? | After an update, see in one press whether our code and XML patches still find what they name, whether a temporary patch's fault was touched, and how big each update was |
| What does it stop them doing? | Asking an agent to run five tools and read the answers, after every round of updates |
| How does it change the way they work? | Before playing after updates: press, read the ticks, open **See what changed** for a touched temporary patch |

**Agent choices, owner to revise:** it runs **on the owner's press**, not by itself when the page opens, because it may decompile
new builds (the owner's "Read and compare, on your press" of 19 Nov 2026), and the first run took 1 min 46 s on the owner's game
(Decisions page: `update-check-when`); it checks the first repository of the game only; five updates are shown before "and N
smaller ones"; no keyboard shortcut, as Keep the new builds has none.

## A clean PC can install it and start (built 20 Nov 2026, 0.36.0)

**The release audit's first step** (A1, A2, A3 and A5), chosen by the owner on 20 Nov 2026 after saying the Companion is to be
released for others; they chose to bundle Python and the kit.

| Question | Answer |
| --- | --- |
| What does it let the person do? | Install the Companion on any Windows PC and start, with nothing else to install but git |
| What does it stop them doing? | Hand-editing a JSON file before anything works; meeting "python not found" or a path from someone else's PC |
| How does it change the way they work? | The first launch is a welcome with two steps; the owner's own PC is unchanged |

**Also fixed here:** the window's content-security policy did not allow `blob:` pictures, so 0.32.0's screenshots could not be
drawn in the installed program (the browser checks ran without that policy). **Agent choices, owner to revise:** Python 3.14.10;
the words of First steps. **Not tried on a clean PC yet**: the next check is an install under a fresh Windows account.

## It speaks to a stranger (built 20 Nov 2026, 0.37.0)

**The release audit's second step** (B1, B3 and part of B4). The owner's answer for features for agent sessions: "Hidden unless
switched on, or otherwise detected".

| Question | Answer |
| --- | --- |
| What does it let the person do? | Use the Companion without AI agent sessions and never meet their features; learn from the Guide what a repository needs for each page |
| What does it stop them doing? | Reading notes for sessions they don't have, a claims board that is always empty, and pages that say "nothing" with no way to learn why |
| How does it change the way they work? | Nothing changes on the owner's PC (their repositories carry `AGENTS.md`); another person sees a quieter program, and a page with nothing to show leads to the Guide |
| What outside it notices? | The Guide's entries for those features, marked and grouped, and Go to anything, which leaves their page out while they are hidden |

**Agent choices, owner to revise:** the signs looked for; the default (found); what counts as a feature for agent sessions (the
test verdicts' "written by an agent" became "the tool kit's test-pass apply, run by you or an agent session", since a person can
run it); the words of the new entries.

## Its tools are ready to use (built 20 Nov 2026, 0.38.0)

**The release audit's third step** (A4 and B7).

| Question | Answer |
| --- | --- |
| What does it let the person do? | Read a save, and see the Code map's C# links, without installing Rust or the .NET SDK; learn in one place what else a page needs |
| What does it stop them doing? | Meeting "cargo is not installed" the first time they open a save |
| How does it change the way they work? | Nothing on the owner's PC (the kit there finds its own builds as before); another PC uses what the installer brought |
| What outside it notices? | The kit's other tools: every one that reads saves or assemblies finds the ready-built copies first |

**Agent choices, owner to revise:** the reader is framework-dependent (about 0.25 MB, needing the .NET 10 runtime) rather than
self-contained (tens of megabytes, unmeasured); the .NET runtime is not carried.

## A mod never installed, in Before you play (built 20 Nov 2026, 0.39.0)

**The owner's request** (20 Nov 2026: a new mod in their repository was never installed, and they had only ever pressed Install
everything that changed, which leaves out a mod with nothing installed to change; they asked for it to be offered, "neat", where it
belongs).

| Question | Answer |
| --- | --- |
| What does it let the person do? | See, beside the rest of Before you play, which of the repository's mods were never installed, and install them on one press with **Install for the first time** |
| What does it stop them doing? | Nothing: the card's own Install button stays, and Install everything that changed still installs only changes |
| How does it change the way they work? | A new mod is found where they already look before a launch, instead of only on its card further down |
| What outside it notices? | Nothing new: the kit's `installs install` with the mods named, as a card's Install runs it |

**Agent choices, owner to revise:** the line is information, not a to-do (a repository may hold mods the person does not want, and
counting them would keep Ready to play away forever); one button installs every new mod at once (each card's Install remains for
one). Tried on phobos-rimworld only; the line reads only the kit's general `not-installed` state, so any game's repository that
adopts `config/installs.json` gets it.

## Explorer: look inside the running game (built 21 Nov 2026, 0.41.0)

**The owner's request** (20 Nov 2026: debugging tools "that you can attach to the games (supported) ... see things like
relationships between things ... While looking at variables in memory"). The design, its three layers and the owner's choices are
in [debugging.md](debugging.md); the probe and layer 1's plan are in [history/debugging-layer-1.md](history/debugging-layer-1.md).
This is layer 1, "Look inside", on the page the Save explorer will share (the owner's choice of one explorer for saves and the
running game).

| Question | Answer |
| --- | --- |
| What does it let the person do? | Take a snapshot of their running game and browse it: memory by kind and by mod, one kind's objects, any object with every value it holds, each link a press to the next, what holds it, and why it is still in memory |
| What does it stop them doing? | Guessing from code, or from a heap snapshot that stops near ten million objects, why memory grows or a value is wrong; taking a snapshot by accident (every one asks first); changing the game (nothing is written) |
| How does it change the way they work? | A question for a debugger, a many-gigabyte dump or an agent session becomes a few presses beside the Memory page and the Code map |
| What outside it notices? | **The game pauses for about half a second at each snapshot** (431 to 470 ms on the owner's colony). Nothing else |

**Owner's choice:** a held snapshot is let go after ten minutes, because Windows keeps a snapshot by copying each page the game
changes after it. **Games:** RimWorld 1.7 (its tools have the reader); any other game is told in words. Not checked on a second game,
as none of the owner's other games runs on .NET's CoreCLR.

**Agent choices, owner to revise:** the page's key (V, on the Decisions page), its place under Play after Game files, its words;
the page's own keys **E** (look inside, asks first), **Q** (let it go) and **O** (back to the overview); leaving the page, even for
the Guide, lets the snapshot go; and it is shown to everyone, not hidden as an agent feature. **First real use** (21 Nov 2026,
with the kit's command line): 453 MB of every mod's patch XML kept alive, read back by Vanilla Expanded Framework's settings code
after the game had let it go.

### The checks on the snapshot held (built 25 Nov 2026, 0.91.0)

**The owner's choice** (25 Nov 2026, of ways to automate an in-game test list: "I especially want to do #4"; phobos-rimworld's
`docs/development/test-automation.md`). A repository keeps rules for its game's running state in `config/checks.json` (phobos-modkit
`docs/checks.md`); **Run the checks** asks the snapshot already held every one of them through the kit's `look-serve`
(`{"op": "checks"}`, kit 1.123.0), so the person's one snapshot answers them with no second pause and no second card. The view shows
how many ran, the faults and what is worth a look, then the tools' own report through `ReportView`.

| Question | Answer |
| --- | --- |
| What does it let the person do? | Learn of a state their game should never be in, from the snapshot they took anyway |
| What does it stop them doing? | Nothing; it only reads. A request carries nothing from the window: the host drops any part sent with it |
| How does it change the way they work? | A fault an agent would hunt for in code is named on a press, with where it was found |
| What outside it notices? | Nothing: the snapshot is already held |

**Games:** any game whose tools have a look inside and whose repositories on the games list keep live checks; RimWorld today. A
game whose repositories keep none is told so by the tools' own words. **Agent choices, owner to revise:** the button beside Back to
the overview, its key **C**, and the view's words. The save checks need no page of their own: `rimworld-save checks` only reads, asks
a plain question and needs nothing typed, so the Reports page offers it once the kit's pin is at 1.122.0 or later.

### The checks with the game frozen (built 27 Nov 2026, 0.102.0)

**The owner's request** (27 Nov 2026: "Build the freeze button for Companion's Run the checks"). The first live check on the owner's
game failed: Windows copies a game for a snapshot, and RimWorld's 21.3 GB of private memory was more than the 19.6 GB of commit
left, so Windows refused with error 1450. Of four ways offered, the owner chose reading the game frozen, built as phobos-modkit
1.132.0's `look-check --freeze`: the game stands still for the whole read (28.6 s on the owner's colony), 120 s at most, and the
kit thaws it if its reader is stopped first. This page runs it on a press and its own confirmation card, through the manifest's
`look-check` on the `look-inside` surface (`runs`), and shows the answer in the same checks view as the snapshot's. It holds
nothing, so there is nothing to browse; any snapshot held is let go first, so the game is never read two ways at once. A snapshot
refused with error 1450 says why and points to it.

| Question | Answer |
| --- | --- |
| What does it let the person do? | Run their live checks on a machine with too little free memory for a snapshot |
| What does it stop them doing? | Playing for the read: the game stands still, half a minute on a large colony, two minutes at most |
| How does it change the way they work? | The checks need no larger page file or closed programs first |
| What outside it notices? | The game, frozen and then let go; nothing in it is changed |

**Games:** any game whose tools offer `look-check` on the `look-inside` surface; RimWorld today (phobos-modkit 1.132.0). Phobos
Ostranauts' tools have no look inside, so its Explorer says so as before; a game whose tools look inside but cannot freeze is
simply not offered the panel. **Agent choices, owner to revise:** the panel below Take a snapshot rather than a second button
beside it, the key **F**, the card's words, and showing the panel always rather than only after a refusal. **Not done:** a frozen
read of anything but the checks (the overview, one kind): each would freeze the game again, so it waits for the owner's word.
**Built in 0.103.0** (below).

### Browsing with the game frozen (built 27 Nov 2026, 0.103.0)

**The owner's choice** (27 Nov 2026, of building it, setting it aside for a larger page file, or both: "Build frozen overview +
kinds"). One card starts a frozen session in place of a held snapshot; then each view is one frozen read through the game's tools
(`look`, `look-kind` and `look-check`, each with `--freeze`, phobos-modkit 1.135.0), answered in the held snapshot's shape so the
same views show it. A view already read is shown again from memory. Nothing is held, so an address means nothing after its read:
no object view, no holders, no "why", and only a kind's first page.

| Question | Answer |
| --- | --- |
| What does it let the person do? | See what is in memory, by kind and by owner, on a machine with no room for a snapshot |
| What does it stop them doing? | Playing while each view is read: about half a minute each, two minutes at most |
| How does it change the way they work? | The Explorer works without a larger page file, its deeper views apart |
| What outside it notices? | The game, frozen once a view and let go; nothing in it is changed |

**Games:** any game whose tools offer `look` and `look-kind` on the `look-inside` surface; RimWorld today. **Agent choices, owner to
revise:** no card per view after the first (the first card says every view freezes the game), the key **B**, and **Stop browsing**
on **Q**.

### The checks on each new save (built 26 Nov 2026, 0.101.0)

**The owner's choice** (26 Nov 2026, "#1 through #3" of the ways offered to improve the test automation; phobos-rimworld's
`docs/development/test-automation.md`, "Round two"): the save checks run by themselves, so a state the rules say should never be is
found the morning it begins. (The HEMTT's 975 steel sat in every save for a day because nobody ran the check.) The kit's manifest
marks a report that counts what waits on the person with `waits` (kit 1.129.0); the host reads that count from the report's data
(`reports::waits_of`), and the page list's scan runs each such report, one at a time, keeping its count (`watched.svelte.ts`).

| Question | Answer |
| --- | --- |
| What does it let the person do? | Learn that their newest save holds a state their mods should never be in without running anything: a number beside Reports, a count beside the report, a note on Home leading to it |
| What does it stop them doing? | Nothing; the report only reads, as it did on a press |
| How does it change the way they work? | Saving while playing is enough: the next look at the Companion checks that save |
| What outside the thing notices? | Nothing in the game: it reads a copy of the save. The kit indexes a new save once (a few seconds), in its own cache |

**Games:** any game whose tools mark a report with `waits`; RimWorld's save checks today. Phobos Ostranauts has none, so no number
and no note. **Owner's choice** (Decisions page, 26 Nov 2026: "At each scan"): the checks run at each scan, never the moment a save
is written, so they never take processor time from the game while it is played. **Agent choices, owner to revise:** faults and
things worth a look counted together; the note's words and its place on Home, under the mod list's. **Risk (agent's grade): none**: nothing is written but the kit's index.

## Safe copies on Home (built 21 Nov 2026, 0.42.0)

**Moved to a page of its own in 0.95.0** (the owner's answer on the Decisions page, "A page of its own"; its key **Shift+B** by
card, 25 Nov 2026, after Shift+K proved to be the Picks page's). Home keeps one line, Safe copies wait, while something waits.

**The owner's request** (21 Nov 2026: "backup functionality for our training sets, models, etc. ... within Companion"), after the
first style model of their own art took 158 minutes of the graphics card. The tool, its rules and the owner's answers (the name
"safe copies", the places: a local disk and a private repository; files made from a game's own on the local disk only) are in
phobos-modkit's `docs/safe-copies.md` and phobos-rimworld's `docs/development/art-backups-handoff.md`.

| Question | Answer |
| --- | --- |
| What does it let the person do? | See at a glance whether what cannot be made again is copied, changed since its copy, or never copied, at each place copies go; copy it now; check every copy is whole |
| What does it stop them doing? | Losing a training to a failed drive without knowing it was never copied; sending anything made from a game's files to a shared place (the kit refuses, and the card says "Not kept here") |
| How does it change the way they work? | Copies happen after every night of art work by themselves; Home says when something waits, and one press catches up at any time, even mid-game (no graphics card) |
| What outside it notices? | Copy now pushes to the private repository the owner chose, and reads and writes the disks. Nothing else |

**Agent choice:** no second yes on Copy now, since it never deletes or replaces at the source and the owner chose automatic pushes.

**0.43.0** (the owner's go of 22 Nov 2026 for the follow-ups): a copy not sent to the repository stays said until it is sent;
**Restore…** on each row (Windows' picker, then a yes on the card, then Replace older files offered if anything differed; a newer
file is never replaced from here); and **Kept, no longer copied** with **Let go…** (a yes on the card first). Agent choices: the
yes is on the card, not a dialog; Restore takes the plain-folder copy; one copy at a time is let go, never all at once from here.

**0.44.0, every game** (the owner, 22 Nov 2026: "work across as many individual games and their mods from the get go, or with
lesser follow-up at the very least"; kit 1.71.0 and the shared rule `rules/safe-copies.md`): a game's own files, its saves and
settings, are listed once for the game in any repository on the owner's list (the kit keeps the owner's: RimWorld, Ostranauts,
Kenshi, Project Zomboid), and that list shows on the game's Home under "The game's own files". A save that is a folder is kept and
let go whole. **The daily run** is one Windows scheduled task of the owner's own, "D'thorga Safe Copies", and nothing else. Agent
choices: the times offered (03:00, 09:00, 13:00, 19:00); a press sets the run with no second yes, since it only copies and is
undone with Turn off.

**Agent choices, owner to revise:** the card's place on Home (asked on the Decisions page, lean Home), below the records note; the
words "Ours", "Made from a game's files" and "Not kept here"; no keys of its own; and that it shows for every game, saying "none
listed" where a repository lists nothing.

## Mod list (built 22 Nov 2026, 0.45.0)

**The owner's request** (22 Nov 2026): after RimSort said only "1 missing mod" for RimMarket's Hospitality patch, which its author
had taken off the Workshop: "We actually should have our own, third-party, mod managing", "just something like RimSort does". The
first step of the program's own mod manager. The tool is phobos-modkit's `mod-list` (`docs/mod-list.md` there).

| Question | Answer |
| --- | --- |
| What does it let the person do? | See what is wrong with each list of active mods and why: a missing mod's likeliest reason (taken off the Workshop, no longer subscribed, download unfinished, folder gone), who needs it, and a clue when another mod now does its job; needs, order, clashes, a mod listed twice, early warnings from Steam, game versions. Make the change offered with one press and a yes; undo it |
| What does it stop them doing? | Changing a list while the game or RimSort is open (either would write over it); undoing over changes saved since; any change without a backup |
| How does it change the way they work? | A missing-mod complaint is answered with a name and a reason in Companion, not a hunt; Home says when a list has problems, so nothing needs remembering |
| What outside it notices? | The game's own list file (ModsConfig.xml; Project Zomboid's default.txt and each save's mods.txt), so the game and RimSort see the change; Steam's public Workshop API is asked which items still exist; the history log records each change. Nothing else |

**Risk (agent's grade, owner to confirm): low.** What can be lost: one list's order or entries, never a mod's files or a save. One
entry at a time, after a yes, with a byte-for-byte backup and Undo; refused while the game runs. So, by the shared rule, no setting
to switch it off; it never acts unless pressed.

**0.46.0, Edit the list** (step 2; the owner's choices of 22 Nov 2026 on question cards: **each change saved at once**; moving by
**Move up/Move down, a place typed, and Move… then Put it at** (both ways); **on the Mod list page**, as a second view; **a search box
with filters**). What it lets the person do: switch any mod on or off and put it anywhere in the load order from the keyboard,
without RimSort. What it stops: a change while the game or RimSort is open; losing a list (a backup before every press). How it
changes the way they work: one press per change, undone one at a time. What outside notices: the game's list file, as before.
**Risk (agent's grade): low**, as before. Agent choices: 40 rows a page; a switched-on mod goes just before the first that needs
it, else last; Put it at takes the place number of the row pressed.

**0.47.0, Sort, and moving freely** (step 3; the owner, 22 Nov 2026: "Start the sorter now and we also need to have the ability
to move mods around more freely, right now it's too restrictive and asks too much of the user ... neaten/tidy things up ... some
extra colours/shades ... as appropriate to each theme"). The owner's choices on question cards: moving by **carrying with the keys,
putting beside a mod found by name, several at once, and dragging too**; the sorter **both ways, chosen at the press** (fewest
moves, or a full re-sort); **your rules from RimSort read as they are, plus new ones kept by the tools**; **shades worked out from
each theme**, not new theme roles.

- What it lets the person do: put any number of mods anywhere in a few keys (Enter, arrows, Enter) or by typing a neighbour's name;
  sort the list without RimSort, seeing every move and whose rule asked for it first; keep rules of their own without RimSort's
  mouse-heavy editor.
- What it stops: a sort written unseen (only **Use this order** writes); a loop of rules stopping the sort (its weakest rule is set
  aside and named, where RimSort refuses); RimSort's files being changed (only read).
- How it changes the way they work: the list is one scroll, chosen mods stay chosen across moves, and the row buttons of 0.46.0
  give way to one bar of actions for the chosen; several mods moved together are one change and one undo.
- What outside notices: the game's list file, as before, and the tools' own `rules.json`; RimSort keeps its own rules untouched.
- **Risk (agent's grade): low.** A sort can move many mods at once, but nothing is written before the press, a backup comes first,
  and one Undo restores the whole list. No setting: the owner chose each change by its own press.
- Agent choices, owner to revise: strength order for loops (yours, own, needs, community); "at the top" never above the game's own
  unless a rule puts it there; the full re-sort puts the game's own first, then by name; the first 60 moves shown; at most 500 mods
  in one change; shades at 14 % of a role over the raised surface (every built-in theme reads at 4.85:1 or better); the carry keys
  are the list's own, not new page shortcuts, since nearly every single key is taken; filters wait while mods are carried.
- Seen on the owner's list (read only): the fewest-moves sort finds 2 moves on a list RimSort sorted, both "load at the top" rules
  RimSort reads more loosely (XML Extensions up to just after the expansions; Vehicle Framework up to just after the Vanilla
  Expanded Framework).

**0.48.0, Saved lists** (step 4; the owner, 22 Nov 2026: "Start step 4, saved lists"). The owner's choices on question cards:
lists **saved by name, from each save's own mods, RimSort's history and files**; loading **shows the difference, then a yes**;
mods not on this PC are **left out, named with why, and offered in Steam**; and a copy **kept at each game start** (the owner chose
this over leaning on the change backups).

- What it lets the person do: keep lists by name and go back to any of them, to the list any save was played with, or to any of
  RimSort's; share a list as the game's own `.rml`; see before loading what would switch on, off and move, and what is missing.
- What it stops: a list loaded unseen (only **Use this list** writes); a list half-loaded with mods that are not there (they are
  left out and named); a save or RimSort's files being changed (only read).
- How it changes the way they work: setting up a colony's mods again is one press after a look, not a rebuild in RimSort; a
  missing mod leads straight to Steam, and loading again after subscribing adds it.
- What outside notices: the game's list file, as before; the tools' own `lists/` and `kept/` folders; a written `.rml` the game's
  own mod menu reads.
- **Risk (agent's grade): low.** A load can change the whole list at once, but nothing is written before the press, a backup comes
  first, and one Undo restores it. No setting: each load is the owner's own press. The copy kept at each start writes only into the
  Companion's own folder.
- Agent choices, owner to revise: what counts as a game start, and keeping the copy only when the list is unchanged two minutes
  after the game last wrote its log; kept copies are never deleted (about 15 KB each); 8 lists shown per source; a save's Steam
  numbers are taken only for Workshop items (missing mods from saves offer **Find on the Workshop** by name); exported files are
  `.rml`, offered under the list's name.
- Seen on the owner's PC (read only): 46 saves and 100 RimSort lists, read in 0.2 s.

**0.49.0, Subscribing through Steam** (step 5; the owner, 22 Nov 2026: "Start step 5, subscribing through Steam"). The owner's
choices on question cards: **through the running Steam client, at once**, by borrowing the game's own Steam library (as RimSort
does); **Subscribe** beside missing mods on What's wrong and in Saved lists, **a box for a Workshop link or number**, and
**Unsubscribe** in Edit the list; unsubscribing **asks first and switches the mods off**; **a bar while Steam downloads, then an
offer**.

- What it lets the person do: get a missing mod back, or one from a pasted link, with one press and see it arrive; let go of
  Workshop mods without opening Steam's pages; all from the keyboard.
- What it stops: an unsubscribe without a yes; a list left naming mods whose files Steam deleted (they are switched off first);
  a change while the game or RimSort runs (unsubscribe waits like any list change).
- How it changes the way they work: Open in Steam stays for reading a mod's page; subscribing no longer needs it.
- What outside notices: **Steam** (the subscription, the download, and the person shown as playing the game for the seconds a
  press takes); the game's list file (switched off before an unsubscribe).
- **Risk (agent's grade): moderate for Unsubscribe** (Steam deletes the files; a backup of the list and a yes first, and the files
  come back by subscribing again), **low for Subscribe** (only adds). No setting: each is the owner's own press.
- Agent choices, owner to revise: downloads waited for up to 15 minutes; at most 500 items a press; each call waited for up to
  30 s; success read back from Steam's own item state.
- **Untested against a real Steam client**: agents never subscribe on the owner's account, so the Steamworks calls meet Steam
  first on the owner's own press.

**The manager's next steps** (owner's choices, 22 Nov 2026): with subscribing built, RimSort can retire; each further step gets
its own design record.

**Agent choices, owner to revise:** the page's place in the bar (after Mods) and its key (**S**); Ask Steam too on by default on
the page (about 9 s with 400 mods) and off for Home's note; the version notes folded behind a button; the clue's minimum word length
(5 letters) and the words it ignores ("patch", "compatibility", "framework" and the like); a missing mod never seen by a check is
named by its id only. Checked on the owner's RimWorld (407 mods) and Project Zomboid lists.

## Pictures and sounds in the code viewer (built 22 Nov 2026, 0.50.0)

**The owner's request** (22 Nov 2026, of the code behind Vehicles 0.105.2, whose whole point was thin stray lines taken off truck
armour pictures, shown only as "a picture ... nothing to show line by line"): "We should support the ability to display multimedia
in parts like this". **The owner's choices on question cards:** pictures, sounds **and DDS textures** in the first version; all four
ways to compare a picture (side by side, flicking, what changed marked, zoom and backdrop buttons); for a sound, players,
spectrograms, waveform and loudness, **and the "whine alone" copy**; for anything else, its kind and sizes in words, **Save a copy of
either side** and **Open with its own program**.

| Question | Answer |
| --- | --- |
| What does it let the person do? | See a changed picture or texture before and after, flick between them in one place, see every changed pixel marked and counted, at a zoom and on a ground of their choosing; play a changed sound's two versions and see each one's spectrogram, waveform, loudness, peak, highs and any steady whine, and hear that whine moved down to where ears hear well; save either version of any file, or open it with its own program |
| What does it stop them doing? | Opening a program, or a kind the kit does not know, with its own program (it could run something); drawing a picture larger than 8,192 pixels a side |
| How does it change the way they work? | A change to art or sound is checked in the viewer that shows its code, instead of digging both versions out of git by hand. A sound is judged by sight as well as by ear, which matters to anyone who cannot hear the highest frequencies |
| What outside it notices? | Save a copy writes one file where the person chose in Windows' Save dialog. Open with its own program writes a copy into this program's own folder (`opened-copies`, let go after a day) and asks the system to open it |

**Checked on more than one game:** the kit on phobos-rimworld (30 pictures in one commit) and phobos-ostranauts (4 sounds).

**Agent choices, owner to revise:** the keys **Z** (flick or choose the other sound), **Y** (play or stop) and **=** (zoom); the
dimmed level (30 %) and the accent colour for marks; checks as the first backdrop; the 8,192-pixel limit; 48 kHz for measuring; the
spectrogram's linear frequency scale, 90 dB range and theme-made ramp, with marks at 4 kHz and 15 kHz; a day before an opened copy
is let go; **a band more than 80 dB under the sound's loudest part is held at that floor in the whine search** (a sound with nothing
above 4 kHz showed a false whine 60 dB proud; holding silent bands at a floor, as ffmpeg's -91 dB does for the review tool, finds the
same 13.5 kHz whine the review tool finds in Ostranauts' washer pump loop, at 14.1 dB to its 12.8).

**Seen on screen (the owner's screenshot, 22 Nov 2026):** a new picture drawn, with its size and its two copy buttons. **That
screenshot showed Fit fitting the width alone**, cutting off the bottom of a 128 × 128 icon, so **0.52.0** fits the whole picture
in its frame (the owner's yes on a card): no taller than half the window (agent default), enlarged by a whole number when small,
shrunk when large.

## Pictures and sounds beyond the code viewer (built 23 Nov 2026, 0.53.0)

**The owner's request** (23 Nov 2026): "Can we introduce these new features anywhere else?" **The owner's choices on question
cards:** all four smaller places (the Mods page before installing, repositories with no changelog, the Mod list's previews,
screenshots), the encoded texture check, the picks page as a design first ([picks-page.md](picks-page.md)), one batch and one
version.

| Question | Answer |
| --- | --- |
| What does it let the person do? | Compare a changed picture or sound installed now with the repository's copy or a backup before installing or going back; compare each of a mod's pictures with the encoded texture the game loads; reach the commits, textures and models of a repository that keeps no changelog; know a mod by its picture on Edit the list; compare two screenshots, flicked or with what changed marked |
| What does it stop them doing? | Nothing they could do before. A picture or sound is handed over only when a page's own answer named it |
| How does it change the way they work? | Art changes are judged where the install is decided, and encoding is checked by eye rather than by date alone. Workers & Resources' 208 DDS textures can be seen for the first time |
| What outside it notices? | Nothing: everything only reads |

**Why a tolerance:** on the owner's armour kits 66 to 80 % of pixels differ after encoding, 0.5 % by more than 16 levels, 0.1 % by
more than 32; the owner's screenshot of 23 Nov showed the need in the code viewer too (tanks exported again marked 92,971 pixels for
a pale line round their edges). **Games:** the Mods page and texture pairs serve RimWorld; commits any repository (checked on
Workers & Resources, 45 commits); previews RimWorld and Project Zomboid; screenshots any game with a Steam screenshots folder.

**Agent choices, owner to revise:** five newest backups offered to compare with; twelve texture pairs a page and twenty commits a
page; 16 levels to start for encoded textures and Exact elsewhere; **The mod in focus** always shown at one height above the lists
(it first appeared only once a mod had focus, which moved the list between a press and its release so the click landed on another
mod, found by the browser tests); compare with the screenshot just before or after, not any one.

**Seen on screen (the owner's screenshot, 23 Nov 2026):** What changed marking the Bulk Tanker's re-exported tanks at 1×.

## Picks (built 23 Nov 2026, 0.55.0)

**The owner's request** (23 Nov 2026): "Go ahead and build the picks page", designed first in [picks-page.md](picks-page.md),
whose three questions the owner answered that day: picks from a file each repository keeps, a pick kept as an answer, and keys that
may repeat where never on screen together or be held with Shift, Ctrl or Alt.

| Question | Answer |
| --- | --- |
| What does it let the person do? | Pick among an art tool's tries on one page, each against the one in use, flicked, with what changed marked, at game size on the game's grounds, or hear a sound's tries measured; say none will do, with words; change a pick until it is applied |
| What does it stop them doing? | Nothing: cards in a conversation still work for a session without the Companion |
| How does it change the way they work? | A batch of picks becomes one sitting at their own pace, keyboard first, instead of links and one question card each in a conversation (where the dialog hid the links) |
| What outside it notices? | The repository's art records, once a session applies the pick |

**Games:** any repository with a picks file; offered today by phobos-rimworld's art tools, and a next game's tools offer with the
kit's `picks offer`. **Agent choices, owner to revise:** **Shift + P** for the page, **Shift + J/K**, **Ctrl + Enter** and
**Shift + N**; the page under Tools after Decisions, shown with the features for agent sessions; the next waiting pick opening after
a press; every try drawn 128 pixels square on the first ground; a pick's words optional, even for none of these.

## Picks made easier to compare (built 23 Nov 2026, 0.57.0)

**The owner's request** (23 Nov 2026): settings "remembered between each pick", and whether the compare tool belongs on Picks
"in an altered form": both forms offered on a card were chosen. Then (0.58.0) "save the view settings between sessions too".

**Agent choices, owner to revise:** marks for loose bits offered everywhere a picture is compared, not only on Picks (ported from
phobos-rimworld's `edge_check.py`, its thresholds naming no game); one accent colour for every kind of mark, the kinds told apart by
the counts in words.

## Going online, slice 1: gate lights and the switches (built 23 Nov 2026, 0.61.0)

**The owner's request** (23 Nov 2026): O2 to O4 of `later.md` together, designed in [online.md](online.md) with their four answers;
calls "on for listed repositories with a setting to disable otherwise, with applicable warnings of severe loss of functionality".

| Question | Answer |
| --- | --- |
| What does it let the person do? | See on Home whether each repository's last push passed its checks on GitHub, with commits not pushed and files changed; see a nightly run that stopped; switch each kind of online call off, told first what it costs |
| What does it stop them doing? | Nothing; a switch off stops only that kind of call |
| How does it change the way they work? | A failed check is seen at the next look at Home, not days later on GitHub |
| What outside the thing notices? | Nobody: GitHub sees a keyless request naming a public repository |

**Agent choices, owner to revise:** the panel's name "Checks on GitHub"; the kind's name "Gate lights"; a nightly run counted late
after two days; a press asking again after a minute; off meaning no call even on a press. **Risk (agent's grade): low**; nothing
of the person's is changed or sent.

## Going online, slice 2: the nightly watch (built 23 Nov 2026, 0.63.0)

**The owner's request**: O3 of [online.md](online.md), with their answer "a results branch", written only when the result changes.

| Question | Answer |
| --- | --- |
| What does it let the person do? | See on Home, before an update arrives, which commits in other authors' public source touch a method their code names, with the line of theirs that names it |
| What does it stop them doing? | Nothing; switching Nightly watch off stops only the reading |
| How does it change the way they work? | The look happens each night on GitHub's machine, with the PC off; a fix can be ready before the update lands |
| What outside the thing notices? | Nobody is told: the results branch is public, and GitHub runs the job |

**Agent choices, owner to revise:** the panel's name "Their code changed"; ten findings shown before "and N more"; 30 days looked
back; 16:17 UTC. **Risk (agent's grade): low.** Slices 3 and 4 (known problems, report links) are recorded in
[online.md](online.md).

## The pages down the left, and tabs (built 23 Nov 2026, 0.66.0)

**The owner's request** (23 Nov 2026): "clean-up the settings page and perhaps others too, where there's just a huuuuuuuge vertical
trail of information", with tabs proposed, and "the main-menu at the top, which I also want to declutter somehow". Shown first as a
mock-up (a private claude.ai page). **Owner's choices, by card:** the pages down the left, the games as a picker in the top bar;
tabs across the page; Settings, Mods and About this round (Home's two columns not chosen); ; and ' to step and Alt + a number to
jump; counts only for what waits on you; the list's rows 40 px; each game's last worked date in the picker and on Home.

| Question | Answer |
| --- | --- |
| What does it let the person do? | Find a page in one list, each with its key; see from the list what waits on them; reach one part of Settings, Mods or About without scrolling past the rest, by press, key or address |
| What does it stop them doing? | Seeing every part of those pages in one scroll: a part is one press away. The games column, always in sight until now, is one press away in the picker, and on Home |
| How does it change the way they work? | One bar on top where there were two; a part of a page is a place of its own, so Back, Go to anything and a copied address reach it |
| What outside the thing notices? | Nothing outside the window: it only moves what is shown |

**Agent choices, owner to revise:** the tabs' names and order; which counts the Tests page gives (the "seen" shelf only); the right
column (where the page's information comes from, the colours' key, the tools found) kept as it was, since the mock-up left it out
but nobody asked for it to go; the page list 224 px wide. **The list's 40 px rows** are the owner's choice, below the 44 px rule
for a control; AGENTS.md says so beside the rule. **Risk (agent's grade): none**: nothing is written.

## Scans for the page list's numbers (built 23 Nov 2026, 0.67.0)

**The owner's request** (23 Nov 2026, on seeing 0.66.0): "do a scan after updating to see if a sort is needed and then, perhaps
display some sort of sign/figure next to Mod List on the left? If there are other scans we need to do as well you can think of,
then feel free to suggest them!" **Owner's choices, by card:** Mod list counts faults plus sort moves; and all four scans offered:
Mods' things to do, Logs' new errors, Mods' updates that touch ours, and a mark beside About for a newer version.

| Question | Answer |
| --- | --- |
| What does it let the person do? | See from any page that the mod list wants sorting or has a fault, that the last change brought new errors, that something is to do before playing, or that a newer Companion waits |
| What does it stop them doing? | Nothing: the scans only read, and no number is ever a reason anything is refused |
| How does it change the way they work? | No need to open a page to learn whether it has anything for them; after an update, coming back to the window is enough |
| What outside the thing notices? | Nothing: no file is written. The activity strip shows each reading while it runs |

**Agent choices, owner to revise:** the five minutes before a scan is stale; the first list a check names is the one a sort is
previewed for; the Mod list check is asked without Steam (no call to the internet); a scan's readings show in the activity strip
like any other. **Risk (agent's grade): none**: nothing is written.

## Publish (built 23 Nov 2026, 0.69.0)

**The owner's request** (23 Nov 2026): Ostranauts' Workshop publishing scripts brought "over to the Companion now, especially in a
visual way for the user to modify and upload their mods easily", and "The Steam Workshop uploader should be genericized as far as
is possible". The owner's card answers and the design are in [publishing.md](publishing.md); the tool is phobos-modkit's
`steam-publish` (1.97.0 to 1.101.0).

| Question | Answer |
| --- | --- |
| What does it let the person do? | See every mod's Workshop state for any game; edit its Workshop page beside Steam's look; read the exact change note; prepare, upload privately, make public, update every waiting item and read Steam back, from buttons and keys |
| What does it stop them doing? | Uploading without a yes; going public without a second; uploading while the setting is off or the kit no longer calls it the owner's to press; saving a page with problems; any upload wider than private from uncommitted work, a second create, or a version already sent (the kit's rules) |
| How does it change the way they work? | No console or password on the default route; one card shows the next step; the changelog's Released date comes from Steam, not by hand |
| What outside it notices? | Steam (the item and every subscriber); the repository (page, release notes, catalogue, the game's ID file, the changelog); Home's note |

**Risk (agent's grade, owner confirmed the default on 23 Nov 2026): moderate.** A broken version can reach players, and public is
not undone by a press; never sudden (private first, two yeses for public). **Workshop uploads** (Settings, Publishing) starts on.

## Finishing the update check's loop (built 27 Nov 2026, 0.104.0)

**The owner's request** (27 Nov 2026): "What can we do to integrate more of the toolkit with the Companion and its UI?" The agent
measured the kit's manifest against the program (186 of 212 reports reachable) and offered four steps; the owner chose all four,
this first. That day an agent had to edit a JSON file to mark eight temporary patches reviewed, an 8-day-old patched-Defs file
went unnoticed, and the program's own kit was behind the repository's.

| Question | Answer |
| --- | --- |
| What does it let the person do? | Mark a touched temporary patch as read with **I've read it**, and take it back with **Undo**; see when the check's kit or patched-Defs file is older than what it checks, and how to refresh the file |
| What does it stop them doing? | Nothing: a mark names one build, so a newer one asks again |
| How does it change the way they work? | No agent or file editing to quiet a row already read; a stale answer says so instead of looking clean |
| What outside it notices? | The kit's update check, in the program or a session (the mark is in the program's folder, which the kit reads) |

**Risk: low (agent's grade).** A mark only hides a row until its mod's next build. **Agent choices, owner to revise:** marks kept
in the program's folder rather than the repository (as picks and decisions are, so the program never writes a repository); no
second yes before marking, since Undo is beside it.

## Home notices after a crash (built 27 Nov 2026, 0.105.0)

**The owner's request** (27 Nov 2026), the second of four steps chosen together: "Home notices by itself". The owner has had
sudden power cuts since 25 Oct 2026, and a zero-filled file is silent until a program trips over it.

| Question | Answer |
| --- | --- |
| What does it let the person do? | See which programs crashed since they last looked, open why, and learn what a crash or power cut left filled with zeros without remembering to ask |
| What does it stop them doing? | Nothing |
| How does it change the way they work? | No command to remember after a power cut: Home looks once, by itself, and says what it found and what puts it right |
| What outside it notices? | Windows' own records only; nothing is changed |

**Risk: low (agent's grade).** It only reads; the look reads the disk for about two minutes, once per crash. **Agent choices,
owner to revise:** the look runs by itself only after Windows recorded an unexpected shutdown (a half-hourly look would read the
disk for two minutes each time); crashes from the last week show before any was seen; WebView2's cache is left out of the look
(its spare metrics file is zeros by design, and the first look reported it); **no Put back button**, since putting a file back
writes into a repository, which this program never does: the question is on the Decisions page.

## Look up one definition (built 27 Nov 2026, 0.106.0)

**The owner's request** (27 Nov 2026), the third of four steps chosen together: "Look up a Def page". The question behind the
C-17 warning that day was "who adds `modExtensions` to this Def?", which only an agent's command line could answer.

| Question | Answer |
| --- | --- |
| What does it let the person do? | Type a definition's name and see who defines and patches it, it as written with its parents, and it as the game reads it |
| What does it stop them doing? | Nothing |
| How does it change the way they work? | No command line or agent to see a definition, or what patches did to it |
| What outside it notices? | Nothing: it only reads |

**Risk: none (agent's grade).** **Agent choices, owner to revise:** a tab on Reports rather than a page of its own, since a
23rd page would push the page list past the 940 px window the owner sized its rows for; found by the kit's new `definitions`
surface, so another game's look-up can serve the same tab. Building it found two faults in the kit's `rimworld-defs patched`
(fixed in 1.140.0).

Everything proposed and agreed but not yet built is in [later.md](later.md), with each item's status.

## Limits

- Run beside the repository it was built from, it uses that repository's kit and the Python on the PATH; elsewhere it uses the
  Python and kit its installer brought (from 0.36.0), or those `PHOBOS_COMPANION_KIT` and `PHOBOS_COMPANION_PYTHON` name. What
  still stands between it and other people is in the [release audit](release-audit.md).
- `node_modules` sits inside this repository, in a synced folder if the clone is in one, as Observatory's does.
- The Timeline finds a game's history log by the game's ID on the owner's list, which must match the name in each repository's
  `config/installs.json`. A game whose tools write no log shows only what its repositories did, and says so.

## Who chose what

**Each section above names its owner's choices and its agent choices**, with their dates, from 9 Nov 2026 to the newest; the
choices still open for the owner are on the Decisions page. The first ones, before the sections had their own lines:

- **Owner (9 Nov 2026):** the seven decisions in [Read this first](#read-this-first). **Owner (10 Nov 2026):** charts; the colony
  mood report, its snapshot route, advice labelled as such, and colonists, slaves and prisoners together; the atlas as a three.js
  hex globe, with every layer.
- **Agent, with the owner's go-ahead on the order of work:** the stack, the boundary to the tools, the five-band layout as
  borrowed, read-only first, the kit changes (phobos-modkit 1.0.0).
- **Agent defaults, owner to revise:** the palette and what each colour means; system fonts; the empty window's wording.

## Open questions for the owner

| Question | Agent lean |
| --- | --- |
| Do the colours and the crest feel like House D'thorga? | Keep them until the owner says otherwise |
| Should older mods' pages link to Companion once it is public? | Not until it can be handed to someone else |
| In what order do other games get their saves and logs read? | Whichever game the owner is on when step 6 is done |
| Does the mood advice read right for your colony? It is agent-authored | Keep it until the owner edits or asks for changes |
| Do the atlas's biome colours and ramps read right? They are agent-authored | Keep them until the owner asks for changes |
