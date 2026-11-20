---
title: Explorer
kind: page
page: explorer
go: explorer
words: explorer, look inside, snapshot, memory, heap, objects, leak, what holds it, debug
see: task-find-memory-use, task-find-why-in-memory, term-snapshot, term-garbage
---
**A look inside your running game's memory**, from a [snapshot](term-snapshot): what is in it by kind and by who it belongs to, any one thing with every value it holds, and why something is still in memory. It only reads: nothing in the game is changed.

- **Look inside the running game…** asks first, every time. Press **Take the snapshot** to go ahead. **Save your game first**: taking it pauses the game for about half a second.
- **What is in memory**: how many objects, the memory they take, and the free space between them (not counted). **Who it belongs to** lists each mod, the game and the runtime, biggest first. **The largest kinds** each open with a press.
- **One kind**: its objects a page at a time, **Largest first** or as found, and a filter by a word in their descriptions (a name, for one). Each opens the thing in full.
- **One thing in full**: every value it holds; another thing it names is a button that opens it. **What holds it** and **Why is it still in memory?** answer a memory leak.
- **Let it go** frees the snapshot. It also goes after ten minutes, and when you leave the page. Take another to look again.

Reading saves here comes later, with the save explorer. Only a game whose tools can look inside it has this page; any other is told so.

### Keys
- **V** opens Explorer. On the page: **E** looks inside (it asks first), **Q** lets the snapshot go, **O** goes back to the overview.
