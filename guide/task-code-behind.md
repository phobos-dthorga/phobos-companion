---
title: See the code behind a changelog entry
kind: task
go: changes
words: code, commit, diff, what changed in code, show the code, calls gone, calls added, ring
see: term-changelog-entry, page-changes, task-compare-pictures-sounds, term-ring-of-calls
---
1. Find the entry on **Changes** (the **6** key), or on **Mods**.
2. Press **Show the code**. The viewer opens on the commit that wrote it.
3. Four ways to read it: **What changed** (the lines added and removed), **The code as it now stands**, **The code as it was**,
   and **How it connects**.
4. Above a file's lines, a button for each method, class or Def the commit changed in it. Press one to light its lines (an accent
   bar at their end); press it again to put them out. **How … connects** then shows its picture, with its lines beneath.

Code is coloured as VS Code colours it, with VS Code's own grammars, in your theme's code colours (see [themes](task-change-theme)).

### Follow a name
1. In a C#, Lua, Python or XML file, press any name once the line saying the names are being read has gone (a few seconds).
2. A card says what it is, its signature and where it is declared; its other uses in the lines are ringed. In Lua, Python and
   XML it says **Found by name**; when a name may stand for several things, choose one from its list.
3. **Go to its declaration** moves to its line, or opens its lines on the card; **How … connects** shows its picture;
   **Read their code** opens the game's or another mod's code for it.
4. From the keyboard: **Step through the names**, then **←** **→** along the names, **↑** **↓** between lines, **Enter** (or **F12**)
   to its declaration, **Escape** to let it go.

C# names are read with Microsoft's Roslyn by the tool kit, which needs the .NET SDK; without it, a line says so and the code
still shows. Lua, Python and XML names are matched by name against what the tool kit knows of the repository.

### See what a change did to its calls
1. Open **How it connects** on a commit that changed C#. Under the picture, **What this commit did to its calls** follows once the
   methods have been read before and after the commit (several seconds).
2. A [ring of calls](term-ring-of-calls) the commit **cut** is drawn dashed; one it **made** is drawn solid and heavy. Each is
   also said in words, round from the method the commit changed and back.
3. Below, the calls of what is in the middle of the picture: **gone** (dashed, struck through), **new** (heavy) and **kept**.
   **Before**, **After** and **The change** choose which to show. A call that went whole to another method says **moved to** it;
   **through base** and **in Assembly-CSharp** say how and where a call goes.
4. Press one of our calls to put it in the middle, or one of **Other methods whose calls changed**.

For a ring through the game's own code, the tool kit reads the game's methods a change hands on to, from the game's installed
files; it never loads or runs them. A game the tool kit cannot read that way gets a line saying so.

An entry not yet committed shows every change not yet committed, new files included. A commit that wrote several entries is shown whole, and says so. In the viewer: **C**, **N**, **Shift + N** and **H** switch the views, **J** and **K** step through the files.

A changed picture, texture or sound is drawn or played instead of lines: see [Compare a changed picture or sound](task-compare-pictures-sounds).
