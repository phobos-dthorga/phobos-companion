# Publishing: the plan of 23 Nov 2026, and how it was built

**History** (moved here from `docs/publishing.md` on 24 Nov 2026, the owner's docs rewrite, step 7). All six steps were built
in one run on 23 Nov 2026 (Companion 0.69.0, phobos-modkit 1.97.0 to 1.102.0). The owner's request, choices and the open
questions stay in [publishing.md](../publishing.md); the Publish page is described in the Guide (F1 on the page).

## The Publish page (agent's layout, owner to revise)

- **Top:** the game and repository, as elsewhere; the Workshop uploads setting's state; the sender chosen (Steam client or SteamCMD).
- **A card per mod, dependencies first:** cover with its size; item number or "not on Steam yet"; the version on Steam against the
  repository's; a **versions waiting** count; visibility; blockers in words (held, cover missing, page too long, ID file disagrees);
  and **one next step** as the card's main button.
- **The mod's own view, in tabs:**
  - **Page:** the BBCode on the left, the live preview on the right (Steam's look, in the chosen theme), a byte counter against
    7,500, problems listed as they are found. **Save** writes `page.bbcode` through the kit, which checks it first.
  - **Change note:** exactly what Steam will get: every version since the last upload, newest first, and what was cut if it is long.
  - **Steam:** tags and Required items as Steam will be told, visibility, the last receipt, and **Read Steam back**.
  - **History:** each upload's receipt, from the repository's records.
- **Buttons, in order:** Prepare (offline, writes only to the kit's staging folder) → **Upload privately** (one yes) → the owner's
  subscription test (the page says what to check) → **Make public** (a second yes naming the item, the version and "everyone") →
  **Read Steam back** (marks the changelog Released, writes the date). **Update all waiting** does every due item, dependencies
  first, and stops at the first failure.
- Every action has a key; nothing needs the mouse.

## What changes in the rules (owner's word given by the cards above)

- **phobos-modkit `AGENTS.md`, "Steam, read-only and slow":** the uploader's exception grows from "only the owner runs it, in their
  own console" to that **or the owner's press in D'thorga Companion**, through the signed-in Steam client or SteamCMD in its own
  console; still never a password held, and never an agent, test or CI.
- **The kit's manifest gains `owner-press`:** a program may run it only on the person's press and yes, in a window they see; agents
  never. `upload` and `update` move from `owner-only` to it. `owner-only` stays for what a program must never run.
- **The Companion's `AGENTS.md`:** the Publish page is a third place, beside the Mods and Mod list pages, where the program changes
  something outside itself, on press and confirmation only, while the manifest calls it `owner-press`.
- **phobos-rimworld `mods/AGENTS.md`:** the publishing tooling is adopted now, not at the first public beta gate; every mod's
  catalogue entry starts held.

## Build order

| Step | Where | What |
| --- | --- | --- |
| 1 | kit | Game files as data; RimWorld and Ostranauts moved to them with the same output; the plain-folder game |
| 2 | kit | The sender interface; the Steam client sender; SteamCMD in its own console; `owner-press`; the rule wording |
| 3 | kit | `steam-publish page` (read, check, write a page) and JSON for everything the page shows |
| 4 | Companion | The Publish page, the Workshop uploads setting, Home's note, the Timeline's upload marks |
| 5 | phobos-rimworld | Adopt: catalogue (all held), a Workshop page draft per mod (agent-written, held for the owner), the wrapper, the rule |
| 5 | phobos-ostranauts | Adopt: catalogue layout keys, its package checks as a payload hook, the wrapper; the PowerShell uploader kept until the kit's first real upload works |
| 6 | kit | Game files for Project Zomboid, Kenshi and Workers & Resources, each after reading its format (below) |

### The three new games: format facts to confirm before each file

Agent's current understanding, **not yet checked**; each is confirmed from the game's own files and public documentation before
its game file is written, and written in our own words.

| Game | App | Understanding to check |
| --- | --- | --- |
| Project Zomboid | 108600 | The Workshop item wraps mods: `workshop.txt`, `preview.png` (256 by 256) and `Contents/mods/<mod>/` with each `mod.info` (`name=`, `modversion=`). The game writes the item number into `workshop.txt` |
| Kenshi | 233860 | A mod folder holds `<name>.mod`, `<name>.img` (the cover) and `<name>.info`, which the game's tool writes with the item number, title and visibility. The version may live only in the `.mod` file's header, which may need a code hook |
| Workers & Resources | 784150 | A mod folder carries a `workshopconfig.ini` whose `$` keys hold the item number, name, visibility and preview |

Each repository of those games adopts the tool when the owner next works in it, not in a sweep.

## As built (0.69.0)

| Planned | Built |
| --- | --- |
| A card per mod with cover size | The card names the item, versions, visibility, blockers and next step. **The cover's size is not shown**: the kit's answers carry the cover's path and blockers (missing, over budget, and from kit 1.100.0 a game's own size rules), not its size. A next step if wanted |
| The game and repository at the top | The game is the one chosen, as on every page; a repository choice shows when more than one of the game's repositories keeps a catalogue |
| Upload, Make public | **Upload privately** (a new item) or **Send the update** (an item with a newer version), one yes; **Make public** for an up-to-date private item, two: **Go on**, then **Make it public for everyone**, naming the item and version |
| Update all waiting | The kit's `update`, which builds each due item unless told not to, then prepares and sends it, dependencies first, stopping at the first failure |
| Read Steam back | The kit's `pull --visibility --changelog --write`, under a new going-online kind, **Workshop pages** (`api.steampowered.com`, small loss), on by default as every kind is |
| Timeline marks for uploads | **Not built.** Uploads are recorded in each repository's receipts (`.local/workshop-receipts/`) and the catalogue's commits, not in the history log the Timeline reads; the kit would first have to write a history fact per upload. Shown meanwhile on the mod's **Uploads** tab |
| Every action has a key | **Shift + W** the page; **J**/**K** mods; **E** Prepare; **Shift + U** Upload or Send the update (asks first); **Shift + M** Make public (asks twice); **B** Read Steam back; **Shift + A** Update all waiting (asks first); **O** Open in Steam (agent's defaults, changeable in Settings) |

**Checked**: the host's names, arguments and refusals (Rust tests: an upload is refused while the setting is off before the kit is
asked; public only with `--confirm-public` after the window's second yes; SteamCMD always in its own window); the BBCode preview's
parser (only the kit's tags become anything, a link is never followed, nothing is drawn as HTML); the cards' next steps; and the
page against a stand-in host in the browser, both widths, with the accessibility audit: an update asks first and nothing is asked
of the host until the yes, making public asks twice, and the editor shows the tools' problems and keeps Save off. The kit's
manifest at the pin was read to say `upload` and `update` are `owner-press`, `page`, `notes` and `pull` `writes`, `prepare` `runs`.
