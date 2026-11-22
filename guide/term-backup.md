---
title: Backup
kind: term
words: backup, backups, restore, copy
see: task-go-back, task-back-up-mod, term-install-record, task-clean-up
---
A whole copy of an installed mod, kept so you can go back to it. **Every install makes one** of the copy it replaces, and **Back up the installed copy** makes one on request.

**Each backup is one zip file**, about a fifth of the size of the folder it holds: encoded textures shrink to an eighth, while pictures and sounds stay as they are. Windows opens one like a folder. A zip is checked file for file before anything is let go. Backups made before 0.68.0 were folders: **the next install or go-back packs them**, each checked the same way first, and says how much space that saved.

Backups are named for the moment they were made, and each carries the changelog it was installed with, so the Companion can say what going back would change.

**Every install and every go-back then removes repeated backups** of that mod: a backup the same as the one before it, file for file, or only rebuilt from source code that had not changed. The oldest of each run is kept, so nothing you could go back to is lost. Its report names each one removed. **Remove repeated backups** does the same for every mod at once, for repeats made before this. No other backup is deleted unless you choose to (see [clean up](task-clean-up)).

The Companion's own records have a separate backup: see [records](term-records).
