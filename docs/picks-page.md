# The picks page: picture and sound picks inside the Companion

**Status (23 Nov 2026): built in 0.55.0** (the owner's "Go ahead and build the picks page"), with kit 1.83.0's `picks` and
phobos-rimworld's art tools offering picks. What was built is in [design-record.md](design-record.md), "Picks". The owner chose
"design first" on 23 Nov 2026, when asked where else the code viewer's pictures and sounds could go, and answered its three
questions the same day (below).

## Why

Picks today happen in chat. An agent session draws review cards (phobos-rimworld's `scripts/art/review_cards.py`: every try of
one picture, exported as it ships, enlarged and at game size, on two grounds) or a sound review page (`scripts/art/sound_review.py`:
each candidate with its spectrogram, loudness, whine and a lowered listening copy), sends clickable links in one message, waits,
then asks one question card per picture. It works, but:

- **Long paths and opened windows failed the owner** (20 Nov 2026: windows "closed suddenly"; long temp paths "truly... something").
- **A card is a still picture.** It cannot flick between a try and the picture in use, zoom, or mark what differs, all of which the
  Companion now does.
- **The question dialog hides the chat**, so the links and the cards cannot be on screen together.
- **A sound is judged on a web page and in chat**, two places.

## What it would let the owner do

Open **Picks**, see every pick waiting in every repository of the game, and for each one:

- **A picture**: the picture in use (if any) and each try, with the code viewer's views: side by side, flick with **Z** between
  the one in use and the try in focus, what changed marked, zoom, grounds, and the game's own grounds the cards use (soil, stone).
- **A sound**: each try with its player, spectrogram, waveform, loudness, highs, whine and the band alone, as the code viewer shows a
  changed sound.
- **Pick one with a press or a key**, or **none of these** with words for what to try next, and move to the next pick.

What it stops: nothing; the cards and review pages stay for sessions without the Companion.
How it changes the way they work: a batch of picks becomes one sitting on one page, at their own pace, keyboard first; the agent
session reads the answers when it next starts, as it does the Decisions page's.
What outside it notices: the repository's art records, once a session applies the picks.

## How it would work (agent's proposal)

| Part | How |
| --- | --- |
| Where picks come from | A kit tool, `picks list`, game-free, reading what a repository says it has waiting: for each pick, an id, a title, picture or sound, the file in use (if any) and each try's file and label |
| The host | Hands over only the files `picks list` named, through `viewable.rs` (0.53.0) |
| The window | A Picks page under Tools: the waiting picks, one open at a time, built on `MediaCompare` with one side the picture in use and the other the try in focus; tries stepped through with keys |
| An answer | Kept in this program's own folder, `picks/<repository>.jsonl`, as the test verdicts and the decisions are; a session or a kit tool applies it (moves the try into place, writes the art record) |
| Grounds | A game's own grounds (RimWorld: soil and dark stone, as the cards use) come from the repository's pick file as colours, so the page names no game |

## The owner's answers (23 Nov 2026, on question cards)

- **P1, where picks come from: a file each repository keeps** (`config/picks.json`, written by the art tools), as leaned.
- **P2, what a pick does: kept as an answer** in this program's own folder, applied by the next session or a kit tool, as leaned.
- **P3, keys: both** ("repeat where never together (while trying to prevent confusion) and just using Shift, Ctrl, Alt, keys"):
  a key may do different things in places never on screen at once, chosen so the same key means a like move in each; and keys held
  with Shift, Ctrl or Alt are allowed. The shortcut rule in `AGENTS.md` now says so; the shortcut check that refuses any key used
  twice anywhere changes when the picks page is built.

## The questions as asked

| # | Question | Options | Agent's lean |
| --- | --- | --- | --- |
| P1 | **Where do the waiting picks come from?** | **A file each repository keeps** (`config/picks.json`, written by the art tools when a batch is made); or the kit **finds them by convention** in each art tool's working folders | The file: game-free, and the art tools already know what they made |
| P2 | **What does a pick do when pressed?** | **Kept as an answer**, applied by the next session or a kit tool (as decisions and test verdicts are); or **applied at once** by the Companion (it moves files into a repository) | Kept as an answer: the Companion writes only to its own folder today, and applying needs a repository's own steps (export, edge check, record) |
| P3 | **Keys, now that every letter is a shortcut** (all 26 since 0.50.0) | **Let a key repeat where two places are never on screen together** (the shortcut check would compare only those that can be); or pick keys from the symbols left (`;`, `'`, `\`); or no keys, buttons only | Let a key repeat: J and K could step through tries as they step through files in the code viewer, and Enter picks |

## What a next game needs

Nothing in the page names a game. A game's art tools write the pick file (P1); RimWorld's would come from phobos-rimworld's
`review_cards.py` and `sound_review.py`, which already know every try they made.
