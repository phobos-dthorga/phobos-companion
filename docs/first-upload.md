# First uploads from the Publish page: a checklist

**Answer first.** Do **one private update** and then **one public update** of an Ostranauts item that already exists on Steam.
Those are the two real uploads the owner chose as proof (23 Nov 2026) before Ostranauts' old PowerShell uploader is retired.
A RimWorld mod's first upload comes later, when a mod's hold is lifted; its steps are at the end. Nothing here has been tried
yet: **this checklist is the first real test of the Steam client route**, so note anything odd and tell Claude.

The Publish page's own help is in the Guide (**Publish**, and **Put a mod on the Steam Workshop, or update one**); the design is
in [publishing.md](publishing.md).

## Read this first (gotchas)

- **Steam must be running and signed in** for **The Steam client** route. Nothing is typed and no password is used. While it
  uploads, Steam shows you as playing that game.
- **Close the game first** (Ostranauts or RimWorld). The upload speaks to Steam as that game; the game running at the same
  time is untried. (Agent's precaution, not a known fault.)
- **Reinstall Ostranauts first.** On 23 Nov 2026 the game was not installed on this PC (only a leftover BepInEx folder), so
  no Ostranauts mod can be built, and every package there is out of date. Each needs a fresh build that passes.
- **Build first works in Ostranauts too** (from 23 Nov 2026): it runs the mod's own `scripts/build-<mod>.ps1` with the game's
  folder from `.local/install-settings.json` (`OstranautsPath`). Use Companion 0.69.2 or newer: before it, Build first's
  output could spoil the page's answer. **Update all waiting** builds each mod the same way.
- **A private upload may come from uncommitted work; a public one may not.** Commit first, then **Prepare** again.
- **Never press Upload again after a create that gave no item number.** Look at your Workshop items on Steam first: a blind
  retry can make a duplicate item. (Updates of existing items, as below, cannot make duplicates.)
- **If the Steam client route fails, SteamCMD is beside it**: choose **SteamCMD** on the page. It opens in a window of its own,
  where you type your Steam login and Steam Guard code. The Companion never sees them.
- **Settings → Publishing → Workshop uploads** must be **On** (its default), or the upload buttons are hidden.

## Before you start (once)

- [ ] Install **D'thorga Companion 0.69.2 or newer** (the newest installer is in
      `C:\Users\phobo\AppData\Local\phobos-modkit\target\release\bundle\nsis\`).
- [ ] Ostranauts installed, with BepInEx; Steam running and signed in; the game closed.
- [ ] In the Companion, **Settings → Publishing**: **Workshop uploads** is **On**.

## Test 1: a private update (Phobos Exchange)

Phobos Exchange is a **private** item already on Steam (item 3815077672), with an update due: **0.5.2 on Steam, 0.6.0 here**.
Being private, nobody else sees it, so it is the safest first send.

- [ ] Open **Publish** (**Shift + W**), choose **Ostranauts**, and step to **Phobos Exchange** with **J** and **K**.
- [ ] Read the **Change note** tab: it should cover version 0.6.0 (and anything between 0.5.2 and 0.6.0).
- [ ] With **Build first** on, press **Prepare** (**E**). It builds the mod with `scripts/build-exchange.ps1`, then stages it;
      the build must pass, and the card should then show no blockers. (By hand, the same build is
      `python scripts/workshop_build.py PhobosExchange` in the phobos-ostranauts folder.)
- [ ] Check the sender is **The Steam client**.
- [ ] Press **Send the update** (**Shift + U**), read the question, and confirm.
- [ ] **What success looks like:** a bar while it uploads, then the card shows 0.6.0 as sent, and the **Uploads** tab has a new
      receipt marked submitted (unverified until you look).
- [ ] Open the item (**O**) and check: the title, the page text, the new change note under **Change Notes**, the cover, and that
      it is still **private**.
- [ ] Subscribe and try it in the game, as you normally would.
- [ ] Commit `config/workshop-publishing.json` in phobos-ostranauts: the upload recorded 0.6.0 there.

## Test 2: a public update

Choose a **public** item whose new version you are happy to release now. On 23 Nov 2026 these public items had updates waiting:
**Phobos Framework** (0.133.0 to 0.134.0), **Phobos Agriculture** (0.66.2 to 0.67.0), **Phobos Bank** (0.8.1 to 0.9.0) and
**Phobos Spacer Stories** (0.3.1 to 0.4.0; its build failed on 23 Nov). **Dependencies go first**: if the mod you choose
needs the newer Framework, send Framework first.

- [ ] **Commit everything first.** A public upload refuses a candidate prepared from uncommitted work.
- [ ] **Prepare** (**E**) with **Build first** on, as in Test 1. The build must pass.
- [ ] **Send the update** (**Shift + U**). The item stays public; no "make public" question, as it already is.
- [ ] Open the item (**O**) and check it as in Test 1. Here the Draft heading in the change note should read **Released**.
- [ ] Press **Read Steam back** (**B**): it marks the version **Released** in the mod's changelog, dated as Steam shows it.
- [ ] Commit the catalogue and the changelog.

## When both tests work

- [ ] Tell Claude: "both Workshop tests worked" (with anything that looked wrong). The old Ostranauts scripts
      (`prepare-workshop`, `upload-workshop`, `update-workshop`, `pull-workshop`) are then retired, as you chose.

## Later: a RimWorld mod's first upload

Every RimWorld mod is **held** (`config/workshop-publishing.json` in phobos-rimworld). D'thorga Framework goes first, as the others
need it.

- [ ] Read and approve the mod's Workshop page draft (the **Workshop page** tab, or `workshop/<Mod>/page.bbcode`).
      Eight wording points were raised for you on 23 Nov 2026.
- [ ] Make sure the mod has a cover, `About/Preview.png`. **D'thorga Farming has none yet.**
- [ ] Lift its hold: in the catalogue, set the mod's `"hold"` to `null`. Commit.
- [ ] **Prepare** with **Build first** on (RimWorld's catalogue builds with `scripts/deploy.py --build-only`).
- [ ] **Upload privately** (**Shift + U**). Steam gives the new item its number; the tools write it into the catalogue and
      `About/PublishedFileId.txt`.
- [ ] Accept Steam's Workshop agreement if the page asks. Then check on the item: the **Mod** and **1.7** tags, and the Required
      items (Framework needs Harmony), which the Steam client route sets.
- [ ] Subscribe and test in the game, then **Make public** (**Shift + M**): it asks twice, the second time naming the item, the
      version and everyone.
- [ ] **Read Steam back** (**B**), then commit the catalogue, the changelog and `About/PublishedFileId.txt`.

## If something goes wrong

| What you see | What to do |
| --- | --- |
| "The game's own Steam library was not found" | Choose **SteamCMD**, or tell Claude: the game's install wasn't found from Steam's records |
| "Steam could not be reached" | Start Steam, sign in, and wait until it has finished starting |
| "Steam refused: …" | Nothing was sent. Tell Claude which part (Title, Preview and so on) |
| The upload ends with "Steam did not confirm the upload" | Open the item on Steam. If the new version is there, tell Claude to reconcile the receipt; if not, try again |
| A create gave no item number | **Stop.** Look at your Workshop items on Steam first, then tell Claude; never press Upload again before that |
| Steam asks for the Workshop legal agreement | Accept it on the item's page; until then others cannot see the item |
| "The game's folder was not found" (an Ostranauts build) | Set `OstranautsPath` in phobos-ostranauts' `.local/install-settings.json`, or reinstall the game |
| "Supply OstranautsPath for a local game installation" | The game is missing from that folder: reinstall Ostranauts (with BepInEx) |
| "The build failed for …; no candidate prepared" | The build's own words are in the page's output: fix what it names, or tell Claude |
