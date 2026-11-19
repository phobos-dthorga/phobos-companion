# Cross-links: joining what the Companion already shows

**Status (19 Nov 2026):** the owner asked for the whole proposed order to be built overnight ("Proceed with your entire proposed
order, step-wise if necessary"), in Companion 0.19.0, one commit a step. Built so far: N1, N2, N3, L4, L2, L1, L3, L5, S3, S4, S2; S1 and S5 are not built (see As built). "As built" below says where a
build differs from its proposal.

## Read this first (gotchas)

- **Links go on the things already on screen, as small chips, not on new pages.** The page bar holds nine pages; the one new page
  proposed here is Logs (L1).
- **The way back comes before more links** (N1 to N3). Jumping from a Timeline fact to its code to the Code map loses your place
  today; more links would make that worse.
- **One thing in the middle stays the rule for pictures.** A picture of a whole repository at once would be an unreadable tangle.
- **Some links serve one game until its tools exist for others**, and say so in the table (the Companion's rule: a feature that
  serves one game says so, and a game that cannot use it yet is told in words, never shown a blank).
- **Each item still answers the three questions when it is built** (what it lets the person do, what it stops, how it changes the
  way they work), in `design-record.md`. The tables below give the first of the three, briefly.

## N: finding your way (build first)

| # | Proposal | What it lets you do | Needs |
| --- | --- | --- | --- |
| N1 | **Back and Forward across pages**: a trail of where you have been, dialogs included, with a key for each (Alt+Left, Alt+Right as defaults, changeable like every shortcut) | Follow a link and return exactly where you were | The window only: page, game and open dialog kept as one trail |
| N2 | **Go to anything**: one search box (the `/` key) over changelog entries, methods and classes, Defs, test rows, timeline facts, settings and reports, each result labelled by its kind | Reach a thing by name without knowing which page holds it | The tools' existing searches (`connections find`, `changes list`, `settings list`), asked together |
| N3 | **An address for every thing**: a link that can be copied and pasted back in, to a version, an entry, a method, a Def, a test row, a fact | Keep and share a pointer; every link below is one of these | The "address" property in phobos-modkit's `rules/first-class.md`, given one written form |

## L: the links worth most

| # | Proposal | What it lets you do | Needs | Games |
| --- | --- | --- | --- | --- |
| L1 | **Log error to code to change to backup**: a Logs page showing the tools' triage of the game's log; a stack line naming a method opens it in the Code map; from there, the changelog entry that last changed it (L2), and from that, "go back to the backup before it" on the Mods page | Walk the whole "what broke it?" chain without a terminal | The kit's log triage as a page; L2; the Mods page taking a mod and a moment | RimWorld first (its log triage exists); others when theirs do |
| L2 | **A thing's own history**: on any Code map node, when it last changed and every changelog entry that touched it | See why a method is as it is, and what else changed with it | A kit addition: commits that touched a thing's lines, joined to the entries those commits wrote | Every game with a changelog |
| L3 | **Test rows joined to code and changes**: on a changelog entry, the test rows waiting on it; on a method, the row that watches it; on a test row, the code that notes it and the version that brought it | Go from "what needs testing" to "what it is" and back | A kit addition: which code notes which key (the note's key is a string in the call) | Repositories with a test list (phobos-rimworld today) |
| L4 | **"What was I running then?"**: pick any moment on the Timeline and see every mod's installed version at that moment; later, tie each save to that set | Know which versions a save, a fault or a memory belongs to | Only the history log (kept from 19 Nov 2026), so nothing new from the kit | Every game whose installs are recorded |
| L5 | **Upstream and patch badges**: a Code map node says when the game or mod method it patches changed in the last update, and how many other mods patch the same method | See risk where it sits, before an update bites | The kit's `rimworld-upstream` and `rimworld-patches`, joined to the connections | RimWorld |

## S: smaller ones

| # | Proposal | What it lets you do | Needs |
| --- | --- | --- | --- |
| S1 | **Design records joined to code**: a record naming a class or method links to its node, and the node lists the records that name it | Go from "why" to "what" and back; suits re-reading | A kit addition: names in `docs/` matched to things, by name |
| S2 | **Tool kit pins as installs**: each repository's pinned phobos-modkit version, with what moving the pin would gain or lose, as the Mods page shows for a mod | See which repositories lag the kit, and by what (on 19 Nov 2026 phobos-rimworld pinned 1.30.0 and the Companion 1.33.0) | The kit's changelog compared between two tags, as `installs` compares two copies |
| S3 | **Merge arrows on the Timeline**: a line from an ended mod's lane into the lane of the mod that took it in | See at a glance where a mod went | The window only: the fact already names where it merged |
| S4 | **Home page items become links**: a latest commit opens its code; something not yet released opens its changelog on the Changes page | Start from "where was I?" and keep going | The window only |
| S5 | **Rules joined to checks**: each shared rule shows which check enforces it, if any | See which rules are held by tools and which only by memory | Rules given IDs (an open question in `rules/first-class.md`), and each gate step naming the rule it holds |

## As built

| # | Differs from the proposal |
| --- | --- |
| N1 | **Keys , and . rather than Alt+Left and Alt+Right**: the Companion's own rule is one key each, never two held together (agent's choice, owner to change in Settings); the mouse's side buttons work too. A link to a dialog on another page arrives in two steps, so Back closes the dialog first. On the Code map, each new thing in the middle is a step, so the window's Back walks the picture; the picture's own button is renamed "Previous in the picture" |
| N2 | The / key now opens it (it used to jump to the page's search box). Timeline facts are searched as versions written, released, installed or gone back to |
| L4 | Built on the Timeline: a "What was I running then?" button on every day. **Tying each save to its set is not built yet**: it needs each game's saves read with their dates, which only RimWorld's tools do today |
| L2 | Under every picture, for a thing in this repository: **Show its history** reads it only when asked (git follows its lines back through every commit, which takes a moment). Newest 25 commits; an entry or a commit opens the code viewer on that commit, as a step Back returns from. Needs phobos-modkit 1.34.0 (`connections history`) |
| L1 | **A tenth page, Logs**, at the end of the bar so the number keys keep their pages; its key is G (agent's choice). It shows the tools' grouping (the 60 most serious kinds, phobos-modkit 1.35.0's `--brief`), and each stack step's **Find in the code** searches every repository of the game for that method. The way back is on each change in a thing's history: **backups from before this** opens the Mods page at that mod's newest backup from before the change. Any game whose tools mark a log reader in the manifest gets the page |
| L3 | **Waiting rows are shown by version, not by entry**: a test row names the versions it covers ("Framework 0.36.0"), not the entry, so each version on the Changes page lists the rows still waiting on it (no verdict yet). That works for the products the test list's `versionNames` names (Framework, Medical and Factory Additions in phobos-rimworld); rows naming another product's version are not matched. The code that notes a row comes from phobos-modkit 1.36.0's `test-pass code`: every string in the code that is a mapped key, or starts with a mapped prefix, placed in the thing holding it. A type watches what its members note |
| L5 | Under the picture rather than on every node: a section lists, for the thing in the middle, each method it patches (or that it is, or that its type's patches touch), with the other active mods on it (phobos-modkit 1.37.0's `rimworld-patches targets`, the repository's own assemblies left out) and what the archive's newest update of that file changed in it (rimworld-upstream's comparison, the last 30 days). In the picture, **a red dotted ring** marks a method three or more other mods patch (agent's threshold, owner to change), or one the last update changed, and our patches on it; its spoken label says so. Found through the manifest's `patch-targets` surface (1.37.1), so the Companion names no game |
| S3 | **Words and a button rather than an arrow**: an ended lane says "(merged into X)", and with it chosen, **Follow it into X** shows X's lane; X offers the way back. A line across the grid would cross other lanes' marks and could not be read aloud. The lane names' column is now a fixed 160 px, wrapping a long name, so it never covers the marks |
| S4 | A latest commit opens its code (the host now sends each commit's hash); a mod not yet released opens the Changes page at its changelog (the Changes page takes `product` in an address) |
| S2 | **On the Home page**, a panel per game: each repository's pin, how many versions newer the kit is, and what a move would bring, from phobos-modkit 1.38.0's `pins status` (the pin HEAD records, read against the kit's own changelog). Not on the Mods page, since a pin is not an installed mod |
| S1, S5 | **Not built tonight** (agent's call). S1 matches names in prose to code by name, which is noisy enough to want the owner's view of what counts first. S5 needs rules given IDs, an open question in phobos-modkit's `rules/first-class.md` that is the owner's to settle |
| N3 | Written as `dthorga://page/game?key=value`, with `dialog=code` or `dialog=stood` and `dialog.`-prefixed fields for an open dialog. The keys each page reads are in the table below |

**What each page takes from an address:**

| Page | Keys |
| --- | --- |
| Changes | `repository`, and `changelog` or `product`; `page` (0.21.0) |
| Code map | `repository`, `node` (a thing's id, `cs:...`, `def:...`, `lua:...`, `py:...`) |
| Timeline | `day` (YYYY-MM-DD) |
| Tests | `repository`, `row` |
| Settings | `key` |
| Mods | `repository`, and `mod` or `changelog`; `before` (a moment) marks the newest backup from before it; `panel=settings` brings the settings to look at into view (0.21.0) |
| Logs | `signature` |
| Memory | `watch` (a kept watch's name, such as `20261119-205419-reload-test-2`; 0.23.0) |
| Reports | `command`, `report` |

## Proposed order

1. **N1, N2, N3**: the way back, the search, the address. Every later link leans on them.
2. **L4**: nearly free, and useful from the first install recorded.
3. **L2**: a thing's own history, which L1 needs.
4. **L1**: the log chain.
5. **L3, L5**, then the S items as they earn their place.

## Open questions for the owner

| Question | Agent lean |
| --- | --- |
| Is a Logs page worth a tenth place in the page bar, or should the bar be grouped first? | Add Logs; group the bar when an eleventh page appears |
| Should Back and Forward also remember scroll position and which mod or changelog was chosen? | Yes for the choice, scroll position if it proves cheap |
| Should an address open the Companion from outside it (a link in a note or a commit message)? | Later; copy and paste inside the Companion first |
