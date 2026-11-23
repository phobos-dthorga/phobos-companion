# Writing the Guide's entries

**Status (24 Nov 2026):** built in 0.34.0 with 53 entries; 82 now. **The Guide is the program's manual**: the README points to it. The Guide page shows them; F1 opens the one for the page shown.

Each entry is one file in `guide/`, named for its id (`task-go-back.md`), built into the window. A few header lines, then the
words:

```text
---
title: Go back to an older version of a mod
kind: task
go: mods
words: restore, undo, rollback
see: term-backup, task-back-up-mod
---
1. **Close the game** first: going back waits until it is closed.
2. Open **Mods** (the **5** key) and find the mod.
```

| Header | Says |
| --- | --- |
| `title` | Its name in the lists and at its top. A task is worded as what you want to do |
| `kind` | `task` (How do I…?), `page` (one per page) or `term` (a word the Companion uses) |
| `page` | For a page entry: which page (`mods`, `settings`…). F1 on that page opens it |
| `go` | Take me there: a page, and what it should show, as `settings?panel=records` (the keys each page reads are in `cross-links.md`, under N3) |
| `words` | More words a search finds it by, comma-separated |
| `see` | See also: other entries' ids, comma-separated |
| `for` | Optional, `agents` only (0.37.0): about a feature for AI agent sessions. Marked so at its top, with the way to show those features while they are hidden, and listed in a group of its own after the rest |

The words: short paragraphs; `1.` for steps and `-` for bullets; `###` for a small heading; `**bold**` for what to press or must not
miss; `` `code` `` for names; `[words](entry-id)` links to another entry. Nothing else is read as markup.

**How to write one** (the owner reads fast, retains by re-reading, and finds dense text hard): answer first; steps in the order
they're done; every button named exactly as the page shows it, in bold, with its key beside it; say what can't be undone and what
waits for the game to close; restate a detail where it matters rather than "see above". Keep it short enough to read at a glance.

**Checks** (`src/lib/guide/entries.test.ts`): every page has an entry; every link and See also leads to one; every Take me there
names a page and only keys that page reads; every How do I…? either takes you there or names a key; no entry is reached only from
the index; search finds the obvious answers.
