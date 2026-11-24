---
title: Find out what is using my game's memory
kind: task
go: explorer?start=yes
words: memory, RAM, heap, big, slow, which mod, using memory
see: page-explorer, term-snapshot, task-memory-watch, term-system-activity
---
1. **Save your game first.** Taking a snapshot pauses it for about half a second.
2. Open **Explorer** (the **V** key) and press **Look inside the running game…** (or the **E** key).
3. Read the question and press **Take the snapshot**.
4. Wait for **What is in memory**: reading every object takes a while on a large game.
5. **Who it belongs to** shows each mod, the game and the runtime, biggest first. **The largest kinds** shows what the memory is made of; press one to see its objects.
6. Press **Let it go** (the **Q** key) when you are done. It goes by itself after ten minutes.

A snapshot includes [garbage not yet collected](term-garbage), so a figure here can be higher than what the game really keeps. To see memory over time instead, [watch it while you play](task-memory-watch).
