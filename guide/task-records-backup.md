---
title: Keep the Companion's own records backed up
kind: task
go: settings?panel=records
words: backup records, NAS, OneDrive, synced folder, verdicts, history, automatic backup, copy
see: term-records, page-settings
---
Your test verdicts, the history log, screen notes, themes, shortcuts and settings live in this PC's local app data, which most backups leave out.

1. Open **Settings** (the **S** key), on the **Backups and space** tab, at **Back up your records**.
2. Press **Choose the folder** and pick a folder your backup keeps: a synced folder (OneDrive, Dropbox or the like), a network drive or an external disk.
3. That's all: **the Companion copies them every 6 hours while it is open**, and makes up a missed copy soon after it next opens. **Back up now** makes one at once.

Each file is kept once, compressed, however many copies hold it, so copies take little room. To look inside one, the tool kit's
`records restore` writes it out to an empty folder of your choosing.

Home reminds you when there is no copy yet, or the newest is a week old. Old copies are never deleted. If a copy fails (a network drive asleep, a disk unplugged), Home says so and why, and it tries again within minutes.
