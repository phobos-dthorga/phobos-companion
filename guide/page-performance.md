---
title: Performance
kind: page
page: performance
go: performance
words: performance, slow, lag, stutter, stall, ticks, frames, TPS, FPS, profile, recording, lock, hot spot
see: page-memory, page-explorer, page-codemap
---
**Where your running game spends its time, and whose code it is.** A recording follows the game for a few seconds; its report opens on **the few things that matter most** (a lock the game waits on, the longest stall and who caused it, the busiest mod) and the game's own figures, then every table.

- **Record for … seconds…** asks first, every time. **Save your game first**, and unpause at the speed that feels slow: recording can make the game stutter for a moment. Nothing in the game is changed.
- **Ctrl + Alt + P records from inside the game**, at once and for 30 seconds, while this program runs: press it the moment the game stutters. The recording opens here when it ends (change the key in Settings).
- **Every mod, method and type in a finding or a table is a link**: a mod opens in the Mod list, a method on the Code map, a type in the Explorer.
- **Look closer**: who calls a method, one mod, compare with another recording, or our own mods across every recording.
- **Around this recording**: what changed that day on the Timeline, and the Memory page's watches.
- With D'thorga Framework running, the figures include **ticks and frames a second** and **milliseconds a tick**, the fair way to compare two recordings.

### Keys
- **Shift + F** opens Performance. On the page: **T** asks to record.
