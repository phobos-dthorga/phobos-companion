---
title: Keep safe copies of what cannot be made again
kind: task
go: safecopies
words: safe copies, backup, training set, style model, LoRA, copy now, check the copies, restore, private repository, saves, daily, schedule
see: term-safe-copy, page-safecopies, task-records-backup
---
Training sets, the style models made from them, the notes on which picture was picked, and your saves and game settings are hours of work that no tool can make again. **Safe copies** keep them in the places you chose.

1. Open **Safe copies** (**Shift + B**, or **Open Safe copies** on Home's line when something waits). The page shows each set, its kind, and whether it is copied, changed since its copy, or never copied, at each place the copies go. **The game's own files** (its saves and settings) have a list of their own on the card.
2. Press **Copy now** to copy whatever changed. The copy to a repository is sent at once.
3. Press **Check the copies** now and then: it reads every copy again and says if one is missing or damaged. Every night of art work, and every daily run, does this by itself too.
4. To get files back, press **Restore…** on a set's row, choose a folder in Windows' own picker, and press **Copy it there**. A different file already in that folder is left alone; **Replace older files** then replaces the older ones, never a newer one.

**Daily safe copies**, at the foot of the card, runs every list of every game once a day by itself. Press a time (**Every day at 03:00**, and so on) to set it, or **Turn off**. A run missed while the PC was off happens at your next sign-in. It uses no graphics card, so it may run while you play; a save still being written waits for the next run.

If a copy could not be sent to the private repository, the card says how many are waiting until a later **Copy now** sends them.

**Kept, no longer copied** lists copies of files the tools no longer take: a save that left your newest pair, or a file gone from its folder. A save that is a folder, as in Kenshi or Ostranauts, is one row. They stay until you press **Let go…** on one and **Remove the copy**; the file it was made from is never touched.

A set made from a game's own files says **Made from a game's files**. It goes only to a folder marked private and local, and **Not kept here** shows where it may not go. Nothing at its source is ever deleted, and no copy in use. A set that keeps a set number of older copies, such as your saves (the newest pair, with five older copies of each), lets the oldest go; every other older copy stays.

The card appears for a repository that lists what to copy (`config/safe-copies.json`), and for a game whose own list a repository keeps (`config/safe-copies/` with the game's name), once the places are chosen and marked; phobos-modkit's guide to safe copies says how. The tools' `safe-copies restore`, `safe-copies let-go` and `safe-copies schedule` do the same from a command line.
