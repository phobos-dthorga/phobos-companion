---
title: Explorer
kind: page
page: explorer
go: explorer
words: explorer, look inside, snapshot, memory, heap, objects, leak, what holds it, debug
see: task-find-memory-use, task-find-why-in-memory, term-snapshot, term-garbage, term-check
---
**A look inside your running game's memory**, from a [snapshot](term-snapshot): what is in it by kind and by who it belongs to, any one thing with every value it holds, and why something is still in memory. It only reads: nothing in the game is changed.

- **Look inside the running game…** asks first, every time. Press **Take the snapshot** to go ahead. **Save your game first**: taking it pauses the game for about half a second.
- **What is in memory**: how many objects, the memory they take, and the free space between them (not counted). **Who it belongs to** lists each mod, the game and the runtime, biggest first. **The largest kinds** each open with a press.
- **One kind**: its objects a page at a time, **Largest first** or as found, and a filter by a word in their descriptions (a name, for one). Each opens the thing in full.
- **One thing in full**: every value it holds; another thing it names is a button that opens it. **What holds it** and **Why is it still in memory?** answer a memory leak.
- **Run the checks** asks the snapshot you already hold every rule your repositories keep for the running game (their `config/checks.json`), so the game is not paused again. **The checks** shows how many ran, the faults and what is worth a look, each with where it was found and why the rule holds. A finding is something to look at, not a test: a snapshot holds one moment, and a rule can be wrong. A game whose repositories keep no rules is told so.
- **Let it go** frees the snapshot. It also goes after ten minutes, and when you leave the page. Take another to look again.
- **Run the checks with the game frozen…** is for when no snapshot can be taken because **Windows has no room to copy the game** (the page says so when a snapshot is refused with error 1450: the game holds more memory than Windows has free). It asks first, every time. The game is read where it is instead, so **it stands still for the whole read**: about half a minute on a large colony, and two minutes at most, after which the tools let it go by themselves. Only the checks are run, shown in **The checks** as above; nothing is held afterwards, so there is nothing to browse. Any snapshot you hold is let go first. Giving Windows more room (a larger page file, or fewer programs open) makes snapshots work again.
- **Browse with the game frozen…** is the rest of the Explorer for the same case. It asks first, once. Then **every view you open freezes the game again**, about half a minute each: **What is in memory** and **Who it belongs to** first, then any kind you press, as its first page (largest first, or filtered by a word). A view you have already seen is shown again from what it read, with no new freeze. **Run the checks** works here too, as one more frozen read. Nothing is held between views, so a thing cannot be opened in full, and **Why is it still in memory?** is not offered. **Stop browsing** forgets what was read.

The checks on your saves run by themselves instead, with no snapshot (see [find out whether my game is in a state it should never be](task-check-saves)). Reading saves here comes later, with the save explorer. Only a game whose tools can look inside it has this page; any other is told so.

### Keys
- **V** opens Explorer. On the page: **E** looks inside (it asks first), **Q** lets the snapshot go, **O** goes back to the overview, **C** runs the checks on the snapshot held, **F** runs the checks with the game frozen (it asks first), **B** browses with the game frozen (it asks first; **Q** stops it).
