# The picks page: picture and sound picks inside the Companion

**Status (23 Nov 2026): built in 0.55.0; a second round proposed the same day, not built ([round two](#round-two-what-the-first-day-of-use-showed-proposal-23-nov-2026))** (the owner's "Go ahead and build the picks page"), with kit 1.83.0's `picks` and
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

## Round two: what the first day of use showed (proposal, 23 Nov 2026)

**Status (23 Nov 2026): a proposal, not built.** The owner, 23 Nov 2026, after the first real batch was picked on the page: "Just point
out any irregularities to me, I think the Picker could do with some improvements", then "write up the Picker proposal for Companion".
These come from applying that batch in phobos-rimworld (night 11's purge-button icon in eight cards, five sounds, and three pictures of
an earlier batch). Four choices are on the Decisions page (`picks-one-slot`, `picks-applied`, `picks-none-words`, `picks-where`); the
rest are agent defaults, labelled.

### What went wrong

| # | What happened | Why | Where it lives |
| --- | --- | --- | --- |
| R1 | **One icon, several cards.** The purge button's icon was asked in four wordings on two style models, so it came as eight cards. The owner approved a try on five of them, and one file can ship. A session had to ask again, by question card, which of the five | Each card is its own pick; nothing says that several cards are tries for the same file | The kit's `picks` (the pick file has no field for it); the art tools (they know the file each try ships as, `art_plan.ships_as`); this page |
| R2 | **Picks already applied stay "picked".** Three pictures had been in the game for hours, byte for byte the owner's try 2, and were still listed, because the session that shipped them never settled them | Settling is a separate step a session must remember | The kit's `picks list` and `settle` |
| R3 | **"0 waiting" from the wrong folder.** `picks list` with no `--root`, run from the kit's own folder (where its commands are run from), read the kit and said nothing waited, while five sounds did | It reads the current folder, and does not say which folder it read | The kit's `picks list` |
| R4 | **Settling says nothing.** A settle that works prints nothing; one refused (already settled) prints only "Refused", with no reason | Its report has no lines for either | The kit's `picks settle` |
| R5 | **The night's record went stale.** The art backlog still said the purge cards were "waiting for the owner's pick" after the owner had answered them | A record copies the state at the time it is written | phobos-rimworld's art records |
| R6 | **"None" with no words.** Two purge cards were answered "none" with nothing to say why; one other "none" carried a useful note ("They both look like you are POURING INTO a tank"), which shaped the next wording | Words are optional and not asked for | This page |

### What would put it right (agent's proposal)

| # | Change | Lets | Stops | Changes |
| --- | --- | --- | --- | --- |
| R1 | **Cards that ship as the same file are one pick.** The art tools give each card the file its tries ship as; the pick file gains a `slot` (that path, relative to the repository); this page shows the cards of a slot together, as one pick with every try of every card, and answering it answers the slot | Choosing once among every try for one icon, side by side | Approving several tries for one file | A wording round becomes one sitting per icon |
| R2 | **`picks list` sees a pick already in the game**: where the picked try's exported file matches the file in use byte for byte, it says "in the game" and the page offers **Settle** (or settles by itself; Decisions `picks-applied`) | Clearing the list of done picks | Old picks hiding new ones | Settling is no longer a step to remember |
| R3 | **`picks list` with no `--root` reads every repository on the games list**, and says which folders it read; a folder with no pick file is named as such | One command for all waiting picks, from anywhere | "0 waiting" when picks wait | Nothing for the person on the page; agents stop missing picks |
| R4 | **`picks settle` says what it did**: "Settled ID (its answer)", and a refusal with its reason ("already settled", "no answer yet", "no such pick") | Seeing a settle worked | Silent success and bare refusals (the shared rule on silent refusals) | Nothing else |
| R5 | **Art records point to the page while a pick waits** ("offered on the Picks page") and are written only when the pick is applied; `settle` can append the answer to the request file's `art_plan` as `picked`, so the record and the request agree (agent default) | Records that never claim a pick is waiting after it was answered | Stale "waiting" lines | Nothing for the person on the page |
| R6 | **"None of these" asks for words**, with the box focused and a few quick reasons to press (wrong subject, wrong style, hard to read small, other) (Decisions `picks-none-words`) | Saying what to try next in a key or two | A "none" that teaches nothing | The next wording starts from the owner's reason |

**What outside the page notices:** the repositories' art records (applied picks, R2 and R5), and the agent sessions, which read one
list of what waits (R3). **Nothing else changes:** answers stay in the Companion's own folder, and a session still applies them.

### Where the work falls

- **phobos-modkit `picks`:** the `slot` field and grouping in `list` (R1), "in the game" by hash (R2), every repository on the games
  list by default (R3), `settle`'s lines and reasons (R4), and `settle` writing `picked` into a request's `art_plan` (R5).
- **This page:** showing a slot as one pick (R1), the Settle button or the automatic settle (R2), the words box for "none" (R6).
- **phobos-rimworld's art tools:** `review_cards.py` and `sound_review.py` give each card its `slot` from the request's `art_plan.ships_as`
  (a sound's from its export target) (R1), and the records' wording while a pick waits (R5).

### What a next game needs

Nothing game-specific: a slot is a path in the repository, and the hash check compares two files. A next game's art tools need only
write `slot` beside each card.

## What a next game needs

Nothing in the page names a game. A game's art tools write the pick file (P1); RimWorld's would come from phobos-rimworld's
`review_cards.py` and `sound_review.py`, which already know every try they made.
