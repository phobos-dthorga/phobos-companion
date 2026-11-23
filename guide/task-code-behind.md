---
title: See the code behind a changelog entry
kind: task
go: changes
words: code, commit, diff, what changed in code, show the code
see: term-changelog-entry, page-changes, task-compare-pictures-sounds
---
1. Find the entry on **Changes** (the **6** key), or on **Mods**.
2. Press **Show the code**. The viewer opens on the commit that wrote it.
3. Four ways to read it: **What changed** (the lines added and removed), **The code as it now stands**, **The code as it was**,
   and **How it connects**.
4. Above a file's lines, a button for each method, class or Def the commit changed in it. Press one to light its lines (an accent
   bar at their end); press it again to put them out. **How … connects** then shows its picture, with its lines beneath.

Code is coloured as VS Code colours it, with VS Code's own grammars, in your theme's code colours (see [themes](task-change-theme)).

### Follow a name (C#)
1. In a C# file, press any name once the line saying the names are being read has gone (a few seconds).
2. A card says what it is, its signature and where it is declared; its other uses in the lines are ringed.
3. **Go to its declaration** moves to its line, or opens its lines on the card; **How … connects** shows its picture;
   **Read their code** opens the game's or another mod's code for it.
4. From the keyboard: **Step through the names**, then **←** **→** along the names, **↑** **↓** between lines, **Enter** (or **F12**)
   to its declaration, **Escape** to let it go.

The names are read with Microsoft's Roslyn by the tool kit, which needs the .NET SDK; without it, a line says so and the code
still shows.

An entry not yet committed shows every change not yet committed, new files included. A commit that wrote several entries is shown whole, and says so. In the viewer: **C**, **N**, **Shift + N** and **H** switch the views, **J** and **K** step through the files.

A changed picture, texture or sound is drawn or played instead of lines: see [Compare a changed picture or sound](task-compare-pictures-sounds).
