---
title: Find why something is still in memory
kind: task
go: explorer
words: leak, still in memory, held, holds, path, root, why
see: page-explorer, term-garbage, term-snapshot
---
1. Take a snapshot on **Explorer** (the **V** key, then **Look inside the running game…** and **Take the snapshot**). [Save first](task-find-memory-use).
2. Under **The largest kinds**, press the kind you suspect.
3. Press **Why is it still in memory?** for a few of its largest. Or press one of its objects, then **Why is it still in memory?** for that one.
4. Read the path from the top: where the game keeps it (often a static field, named), then each thing that holds the next, down to the one you chose. Press any of them to open it.

**What holds it** lists everything that points to one thing, one step up. When nothing holds it, the page says so: that is [garbage not yet collected](term-garbage), **not a leak**.

Following a path can take a few minutes on a large game; the bar says what it is doing.
