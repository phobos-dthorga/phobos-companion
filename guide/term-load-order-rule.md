---
title: Load-order rule
kind: term
words: load order rule, load after, load before, loadAfter, loadBefore, community rules, user rules, load top, load bottom
see: task-sort-mod-list, page-modlist
---
Something that says one mod must load after another, or as near the top or the bottom as it can. The sorter reads these kinds, strongest first:

- **Your rule**: made on the Sort view, or in RimSort (read as it is, never changed).
- **Its code**: a mod loads after any mod whose classes its own code builds on, read from the mods' assemblies (RimWorld only). The game needs those classes first, so a mod that never says so in its files still fails to load its code without it.
- **Its own files**: a mod's own load-after and load-before.
- **Needs**: a mod loads after the mods it needs.
- **Its Workshop page**: a mod loads after the items its Workshop page lists as required (RimWorld only), read from RimSort's Workshop database. It catches needs a mod never wrote into its own files.
- **Community**: the rules RimSort's users share (RimWorld only), read where RimSort keeps them.

Strength matters only when rules go round in a loop: the weakest is set aside, and the page says which. **At the top** never goes above the game's own unless a rule puts it there.
