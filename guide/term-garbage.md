---
title: Garbage (not yet collected)
kind: term
words: garbage, garbage collection, collected, unreachable, leak, GC
see: term-snapshot, task-find-why-in-memory
---
**Garbage** is memory nothing uses any more. A game on .NET does not free it at once: its runtime clears it away from time to time (**garbage collection**).

A [snapshot](term-snapshot) is taken as the memory stands, so it includes garbage not yet collected. When **Why is it still in memory?** finds that nothing holds a thing, it is garbage of this kind, **not a leak**: it will be cleared away.

A **leak** is the opposite: something still holds a thing the game no longer needs, so it is never cleared. The path from where the game keeps it shows what holds it.
