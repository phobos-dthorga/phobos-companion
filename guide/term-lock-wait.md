---
title: Lock wait
kind: term
words: lock, wait, contention, held by, GetComp, threads
see: page-performance, term-finding
---
A **lock** lets one thread at a time into a piece of code; a **lock wait** is another thread standing at the door until it is free. When the game's main thread waits, the game waits.

A recording lists where the main thread waited, for how long in all and at the longest, which thread held the lock and what it was running then, and the mods whose code led there. A lock many mods' code passes through, such as the one inside the game's own `GetComp`, can cost a great deal while no single mod looks expensive.
