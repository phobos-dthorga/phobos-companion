---
title: Publish
kind: page
page: publish
go: publish
words: publish, workshop, steam, upload, release, page, description, change note, bbcode, public, private, steamcmd
see: task-publish-mod, task-going-online, page-settings
---
**Your mods' place on the Steam Workshop, and the steps to send them**, for every repository of the game that keeps a Workshop catalogue (`config/workshop-publishing.json`).

Each mod has a card, dependencies first: its item number or **Not on Steam yet**, the version here against the one on Steam, its visibility, and its next step. Choose one to see:

- **Workshop page**: the page's BBCode on the left and Steam's look on the right, with a byte counter and every problem the tools find. **Save the page** writes the file in the repository, only when it has no problems.
- **Change note**: exactly what Steam will get with the next upload: every version since the last one sent.
- **On Steam**: the item, its visibility, tags, Required items, cover, any hold, and what is still to do on Steam.
- **Uploads**: each upload sent from this PC.

**Prepare** (**E**) writes the release notes and stages a checked copy, without reaching Steam. **Upload privately** or **Send the update** (**Shift + U**) and **Make public** (**Shift + M**) ask first; making an item public asks twice. **Update all waiting** (**Shift + A**) sends every item with a newer version. **Read Steam back** (**B**) reads your items' state from Steam's public pages.

**How uploads reach Steam:** **The Steam client** (signed in, no password) or **SteamCMD** (its own window, where you type your login). Uploads can be switched off in **Settings**, on the **Publishing** tab.

### Keys
- **Shift + W** opens Publish.
- **J** and **K** step through the mods.
- **O** opens the mod's item in Steam.
