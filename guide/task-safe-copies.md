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
3. Press **Check the copies** now and then: it reads every copy again and says if one is missing or damaged.

A set made from a game's own files says **Made from a game's files**. It goes only to a folder marked private and local, and **Not kept here** shows where it may not go. Nothing at its source is ever deleted, and no copy in use. A set that keeps a set number of older copies, such as your saves (the newest pair, with five older copies of each), lets the oldest go; every other older copy stays.

The card appears for a repository that lists what to copy (`config/safe-copies.json`) once the places are chosen and marked; phobos-modkit's guide to safe copies says how. To get files back, the tools' `safe-copies restore` copies a set into a folder you name, and never writes over a different file without asking.
