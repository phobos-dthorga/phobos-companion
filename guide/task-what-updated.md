---
title: See what updated since you last played
kind: task
go: mods
words: updated, steam update, workshop, since last played, new version, changed, update check, temporary patch, broke, xml patch, AI, read it, reviewed, mark as read
see: page-gamefiles, page-mods, task-ai-services
---
1. Open **Mods** (the **2** key). **Since you last played**, in Before you play, says what updated since the session before, and whether any update changed something our mods patch.
2. **See what changed** opens the change itself. **Keep the new builds** keeps them to compare with later.
3. **Check what they mean for ours** asks the tools what the updates mean for our mods. It takes a couple of minutes the first time, while the tools read the new builds, and changes nothing. The button is always there, even when nothing is new.

**An update stays listed until a check has looked at it**, even after you launch the game again. Since you last played reaches back to your last check when that is earlier than your last launch, and says so; before your first check it reaches back a week. Once a check has looked, the card says so, and the updates it looked at leave the list the next time Mods opens (Read again does not redraw this part).

It answers four things:
- whether every method and field **our code** names is still there (one that is gone means our patch fails to load);
- whether an update touched the code behind one of our **temporary patches** (the ones that work around another author's fault): if so, **See what changed** opens it, to read whether the fault is fixed and our patch can come out. Once you have read it, press **I've read it**: the patch leaves the list until its mod updates again, and **Undo** brings it back. The mark is kept in this program's own folder; nothing in the repository changes;
- how big each update was, and the new things it brought, in case a mod now does something ours does too;
- whether everything **our XML patches** name is still there.

It says names and files still match; it does not show that anything works in play. It also says when its own answer may be out of date: when **the tool kit that ran it is older** than the one your repository uses (updating D'thorga Companion brings the newer one), and when **the file of every definition as patched** was written before the moment compared with, with your repository's own words for writing it again.

Once [an AI is chosen](task-ai-services), **What does this mean for my mods?** appears under a finished check: it puts the check in plain words, most urgent first, with a next step for each problem. It shows you what it would send first, and sends it only on **Send**.

For every Workshop item updated, and whether Steam updated the game, open **Game files** (the **W** key): **What changed** looks back to your last launch, the last day or the last week.
