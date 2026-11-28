# Cross-links: addresses, and what each page reads from one

**Status (24 Nov 2026):** reference, kept current. Every place in the Companion has an address, and every move goes through the
window's trail (`AGENTS.md`). **A new page lists here the focus keys it reads, and any `tab` values.** The proposal these came
from (N1 to N3, L1 to L5, S1 to S5, 19 Nov 2026), and how each was built, is history:
[history/cross-links-proposal.md](history/cross-links-proposal.md).

## The items, by id

Code comments name these ids (`docs/cross-links.md, N1`).

| Id | What | Built |
| --- | --- | --- |
| N1 | Back and Forward: one trail of pages, games, choices and dialogs (the , and . keys) | 0.19.0 |
| N2 | Go to anything (the / key); from 0.110.0 also mods, recent commits, the Guide's whole text and Look up; Ctrl + F filters the page's own list | 0.19.0 |
| N3 | An address for every place, below | 0.19.0 |
| L1 | The log chain: a log error to its code, the change that touched it, and the backup from before it | 0.19.0 |
| L2 | A thing's own history on the Code map | 0.19.0 |
| L3 | Test rows joined to code and to the versions they wait on | 0.19.0 |
| L4 | What was I running then? on the Timeline | 0.19.0 |
| L5 | Patch badges under the Code map's picture | 0.19.0 |
| S1 | Design records joined to code | Not built: [later.md](later.md) |
| S2 | Tool kit pins on Home | 0.19.0 |
| S3 | Merges followed on the Timeline | 0.19.0 |
| S4 | Home's items as links | 0.19.0 |
| S5 | Rules joined to the checks that enforce them | Not built: [later.md](later.md) |

## N3: the address, and what each page takes from one

An address is written `dthorga://page/game?key=value`, with `dialog=code`, `dialog=stood` or (0.32.0) `dialog=picture` and
`dialog.`-prefixed fields for an open dialog (a picture's `path`, `name` and `taken`, in Unix seconds).

| Page | Keys |
| --- | --- |
| Changes | `repository`, and `changelog` or `product`; `page` (0.21.0); `commits`, a repository with no changelog whose commits are listed (0.53.0) |
| Picks | `pick`, as `repository/id` (0.55.0) |
| Publish | `repository`, `mod` (a mod's catalogue name), and `tab` (`page`, `note`, `steam` or `history`) (0.69.0) |
| Code map | `repository`, `node` (a thing's id, `cs:...`, `def:...`, `lua:...`, `py:...`); `their` (another author's type or member, 0.26.0); `update` (a kept file, such as `Vehicles.dll`), `owner` (its mod's id) and `member` (one declaration's change), 0.26.0 |
| Timeline | `day` (YYYY-MM-DD) |
| Tests | `repository`, `row` |
| Settings | `tab` (0.66.0): `look`, `games`, `folders`, `online`, `backups`, `agents`, `publishing` (0.69.0), `ai` (0.70.0); `key` opens that setting on `folders`; `show` (`all`, `every`, `needs` or a game's id) chooses which settings `folders` lists; `panel` still lands on the tab holding it and brings it into view: `records`, `cleanup`, `themes`, `games`, `ahead` (0.116.0), `agents`, `online` (0.37.0), `publishing` (0.69.0), `ai-programs` (0.70.0), `ai-services` (0.71.0) |
| Mods | `tab` (0.66.0): `before`, `installed`, `textures`; `repository`, and `mod` or `changelog` (on `installed`); `before` (a moment) marks the newest backup from before it; `panel=settings` lands on `before` and brings the settings to look at into view (0.21.0) |
| Logs | `signature` |
| Chat | `repository` (0.74.0) |
| Memory | `watch` (a kept watch's name, such as `20261119-205419-reload-test-2`; 0.23.0) |
| Save explorer | `save` (a save's name; the newest when none), `place` (a part of the save by its element path), `thing` (one thing's ID) and `search` (the words searched for); 0.122.0 |
| Performance | `recording` (a kept recording's name, such as `20261118-081449-after-engine-loads`; the newest when none), `look` (`callers`, `mod`, `compare` or `trend`) and `text` (the method, the mod, or the other recording, for the first three; 0.118.0) |
| Explorer | `view` (`kind`, `object` or `checks`, the live checks on the snapshot held, 0.91.0; none for the overview), `kind` (a type's full name, such as `Verse.Pawn`), with `match` (a word filter), `largest` (`yes`) and `page`; `object` (a token such as `o7`, never a memory address) with `snapshot` (the snapshot's number in this run of the program): a step back to an object from a snapshot let go says it is gone and offers the overview; `start` (`yes`: asks at once whether to take a snapshot, as Go to anything's **Look inside the running game** does) |
| Home | `tab` (0.109.0): `needs`, `recent`, `repositories`; `panel=pins` lands on `repositories` |
| Mod list | `view=edit` opens Edit the list, with `mod` (a mod's key) chosen and scrolled to (0.110.0: Go to anything's mods) |
| Reports | `command`, `report`; `tab` (`questions`, `lookup`; 0.106.0); on Look up, `name` and `look` (`who`, `show`, `patched`) |
| About | `tab` (0.66.0): `version`, `where`, `online`, `built` |
| Guide | `entry` (an entry's id, such as `task-go-back`; 0.34.0). Each entry opened is a step |
