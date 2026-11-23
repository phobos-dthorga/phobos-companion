# Publishing to the Steam Workshop

**Answer first.** A **Publish** page in D'thorga Companion takes any game's mods to the Steam Workshop: each mod's state on
Steam, its Workshop page edited with a live preview, the change note built from its changelog, and buttons to prepare, upload
privately, make public and read Steam back. It sits on phobos-modkit's `steam-publish`, which came from phobos-ostranauts'
scripts on 8 November 2026. **Designed and built 23 November 2026 (Companion 0.69.0, kit 1.97.0 to 1.102.0).** Not yet tested
on screen, and **nothing has been sent to Steam from it yet**: the first real upload is the owner's press. **The owner's
checklist for the first uploads** (a private and a public Ostranauts update as proof, then a RimWorld mod's first) is
[first-upload.md](first-upload.md). **The plan as it was, its build order and the planned-against-built table are history:
[history/publishing-plan.md](history/publishing-plan.md).**

## The owner's request and choices

**Request** (23 Nov 2026): "I had an excellent set of scripts for Ostranauts that allowed for easy publishing of mods to the Steam
Workshop including things like the CHANGELOGs and so on. I wish to bring that over to the Companion now, especially in a visual way
for the user to modify and upload their mods easily." And, while it was being designed: "The Steam Workshop uploader should be
genericized as far as is possible."

**Owner's choices (question cards, 23 Nov 2026):**

| Question | Choice |
| --- | --- |
| How the Upload button reaches Steam | **Both, chosen per upload**: the running Steam client by default, SteamCMD beside it |
| Which repository first | **Both together**: phobos-ostranauts (10 real items) and phobos-rimworld, which adopts the tool now with every mod held. This lifts phobos-rimworld's "not before the first public beta gate" rule |
| Editing the Workshop page | **In the Companion**, with a live preview and a byte counter; Save writes the file in the repository |
| Other games this round | **Project Zomboid, Kenshi and Workers & Resources** |
| How generic | **As far as is possible** |

## Read this first (gotchas)

- **Only the owner's press uploads.** Agents, tests and CI never send anything to Steam; tests use a stand-in host and a stand-in
  Steam library. The first real upload from this page is the owner's.
- **No password, ever, on the Steam client route.** It speaks to the Steam client already running and signed in, as the Subscribe
  button does (kit 1.77.0). While it uploads, Steam shows the owner as playing that game. The SteamCMD route opens SteamCMD in its
  own console window; the owner types the login there, and the Companion never sees it.
- **New items are always created Private.** Making one public is a second, separate press with a stronger yes, and only from
  committed work.
- **Never create twice.** If Steam gives back no item number, the page says to look on Steam first and settle the receipt; it
  refuses a second create until then (the kit's rule, carried over).
- **Not tested against Steam from the kit yet.** The logic matched phobos-ostranauts' records byte for byte (444 release notes, the
  same 5 of 10 items due), but the kit's uploader has only run against a stand-in. Ostranauts' 10 items went up through its
  PowerShell uploader.

## The four questions

| Question | Answer |
| --- | --- |
| What does it let the person do? | See every mod's Workshop state in one place, for any game: the version on Steam against the repository's, the versions waiting, what blocks an upload. Edit the Workshop page with a live preview. Read the exact change note Steam will get. Prepare, upload privately, make public and read Steam back, from buttons. Set tags and Required items without visiting Steam (Steam client route) |
| What does it stop them doing? | Uploading uncommitted work wider than Private; creating an item twice; a page or change note over Steam's limits; sending a version already on the item; going public without the second yes; uploading a held mod except privately with the hold acknowledged; a mod and its ID file disagreeing |
| How does it change the way they work? | The scripts' sequence becomes one card per mod showing the next step; no console or password on the default route; a changelog entry turns Released after Steam is read back, not by hand |
| What outside it notices? | Steam: the item, its change notes, and every subscriber's next download. The repository: the catalogue, the game's ID file, the changelog's Released date. The Timeline (history log) records each upload. Home notes "versions waiting" |

**Risk (agent's grade, owner to confirm): moderate.** What can be lost: a broken or unfinished version reaching players, or text
published that should not be. Once public, subscribers download it at once; a fix is a new upload, not an undo. It is never sudden:
Private first, then a second press, and every check runs before each. By the shared design rule, a moderate risk has its own setting
that **starts on**: **Workshop uploads** on the Settings page, which hides the upload buttons when off (reading and preparing stay).

## How the kit publishes (moved to the kit's docs, 23 Nov 2026)

**How publishing works for every game is phobos-modkit's `docs/workshop-publishing.md`, its one home**: the game files and what they say as data, the repository's catalogue, the two senders (the Steam client by default, SteamCMD beside it), Steam's limits and our 7,500-byte budget, staging, receipts and reading Steam back. This page's design of those, written before they were built, was taken out in the docs rewrite (the owner's word of 23 Nov 2026: one home per topic); it is in this file's history. This page keeps what is the Companion's own: the owner's choices, the Publish page, its rules and what was built here.

## Who chose what

**Owner (23 Nov 2026):** the page itself; both senders, chosen per upload; Ostranauts and RimWorld together, with RimWorld's rule
lifted and every mod held; editing in the Companion; Project Zomboid, Kenshi and Workers & Resources; as generic as possible.

**Agent choices, owner to revise:** the game file as data with code only where needed, and the plain-folder game; `owner-press`; the
page's layout, tabs and buttons; the risk grade (moderate) and the Workshop uploads setting starting on; the build order.

## Answered (question cards, 23 Nov 2026)

| Question | The owner's answer |
| --- | --- |
| Retire Ostranauts' PowerShell uploader once the kit has made a real upload? | **Yes, after proof**: one private upload and one public update that work |
| Write a Workshop page draft for each RimWorld mod now, every mod held? | **Yes**: agent-written drafts, held for the owner's review |
| Workshop uploads setting: on or off at first? | **On** |
| When to build | **All six steps in one run** |

## Open questions for the owner

| Question | Agent lean |
| --- | --- |
| Show each cover's size on its card? The kit would first have to report it | Only if the blockers' words are not enough |
| Timeline marks for uploads? The kit would first have to write a history fact per upload | Yes, once uploads have run a few times |
| Do the page's keys suit you (Shift + W, E, Shift + U, Shift + M, B, Shift + A, O)? | Keep them until you change them in Settings |
