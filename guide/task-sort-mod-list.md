---
title: Sort the mod list, and keep a rule of your own
kind: task
go: modlist
words: sort mods, sorter, load order, rimsort sort, auto sort, rules, load after, load before, loop, circular dependency
see: page-modlist, term-load-order-rule, task-edit-mod-list
---
1. **Close the game and RimSort** first: the order waits until both are closed.
2. Open **Mod list** (the **S** key) and press **Sort**.
3. Press **Sort: fewest moves**, which keeps your order and moves only what a rule says is out of place. Or press **Full re-sort** to rebuild the whole order, as RimSort does.
4. Read the moves. **Moves a rule asks for** come first, each with whose rule. Below them, folded: mods moved **into their group** (the game's own and frameworks first, "bottom" mods last) and, in a full re-sort, mods moved **only to put names in order**.
5. Press **Use this order** to write it, or **Not now**. A backup of the list is kept first, and **Undo the last change** takes it back.

**To keep a rule of your own:** under **Your rules**, type part of the mod's name and press **Enter**. Press **After a mod**, **Before a mod**, **At the top** or **At the bottom**. For after or before, find the other mod and press **Keep: …**. Then sort again. **Take away** removes one of your rules.

**Rules that go round in a loop** (RimSort calls it a circular dependency) do not stop the sort: the weakest rule of the loop is set aside, and the page names it and the loop.
