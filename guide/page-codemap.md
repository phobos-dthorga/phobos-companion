---
title: Code map
kind: page
page: codemap
go: codemap
words: code, class, method, def, function, calls, patches, harmony, connections
see: page-logs, task-code-behind
---
**How the code fits together.** Search for any class, method, Def or function, then follow how it connects: what it calls and what calls it, what holds it, what it builds on, overrides, patches and uses.

- **Before you search**, it lists the busiest code: where the work has gone lately.
- **Press anything** in the picture to put it in the middle. The same picture is in the code viewer, as **How it connects**.
- **C# is exact from what was last built, so build first.** Lua, and C# with nothing built, are read by name, and their lines are drawn dashed.
- **Around it**, **Flow of calls** and **As a list** are three ways to see the same connections.
- **Show its history** reads every commit that changed it.
- Patches on another author's method say who else patches it and whether their last update changed it; **Read their code** opens it. In the picture, **a red dotted ring** marks a method many other mods patch, or one the last update changed.

### Keys
- **8** opens the Code map. On the page: **A** around it, **F** flow of calls, **L** as a list, **+** and **-** zoom, **0** fits it all, **Backspace** goes back in the picture.
