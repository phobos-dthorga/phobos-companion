---
title: Keep safe copies of what cannot be made again
kind: task
go: home
words: safe copies, backup, training set, style model, LoRA, copy now, check the copies, restore, private repository
see: term-safe-copy, page-home, task-records-backup
---
Training sets, the style models made from them, and the notes on which picture was picked are hours of work that no tool can make again. **Safe copies** keep them in the places you chose.

1. Open **Home** (the **1** key). The **Safe copies** card shows each set, its kind, and whether it is copied, changed since its copy, or never copied, at each place the copies go.
2. Press **Copy now** to copy whatever changed. The copy to a repository is sent at once.
3. Press **Check the copies** now and then: it reads every copy again and says if one is missing or damaged. Every night of art work does this by itself too.
4. To get files back, press **Restore…** on a set's row, choose a folder in Windows' own picker, and press **Copy it there**. A different file already in that folder is left alone; **Replace older files** then replaces the older ones, never a newer one.

If a copy could not be sent to the private repository, the card says how many are waiting until a later **Copy now** sends them.

**Kept, no longer copied** lists copies of files the tools no longer take: a save that left your newest pair, or a file gone from its folder. They stay until you press **Let go…** on one and **Remove the copy**; the file it was made from is never touched.

A set made from a game's own files says **Made from a game's files**. It goes only to a folder marked private and local, and **Not kept here** shows where it may not go. Nothing at its source is ever deleted, and no copy in use. A set that keeps a set number of older copies, such as your saves (the newest pair, with five older copies of each), lets the oldest go; every other older copy stays.

The card appears for a repository that lists what to copy (`config/safe-copies.json`) once the places are chosen and marked; phobos-modkit's guide to safe copies says how. The tools' `safe-copies restore` and `safe-copies let-go` do the same from a command line.
