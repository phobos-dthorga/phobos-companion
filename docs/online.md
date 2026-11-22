# Going online: gate lights, report links, the nightly watch and data feeds (O2 to O4)

**Status (23 Nov 2026):** designed, not built. The owner asked for O2 to O4 of [later.md](later.md#going-online) together, "since
they might share a few things in common", and answered four questions by card the same day (below). Built in the order under
[Build order](#build-order); each slice moves its part of this record into `design-record.md` when it lands. Agent choices are
labelled so the owner can revise them.

## Read this first (gotchas)

- **Keyless GitHub allows 60 API calls an hour from one computer, shared by every tool.** The kit never logs in or holds a token
  (its own rule), so every online part here spends one shared allowance. Raw files (`raw.githubusercontent.com`) are outside that
  count, so feeds and the nightly results are read from raw files, never through the API.
- **"Unchanged" answers are not promised free for a keyless client.** GitHub's documentation says a conditional request answered
  "not modified" (304) does not count, but its current pages say so only for signed-in requests. The reader sends conditional
  requests anyway and **measures** what they cost from GitHub's own rate headers in the first build; nothing here relies on them
  being free.
- **Most of O3 already exists.** `rimworld-upstream pending` (phobos-modkit 1.23.0) finds commits in other authors' public source that
  touch a method our code names, against the 24 repositories the source register has confirmed. O3 moves that run to GitHub's own
  machine at night and leaves its answer where the Companion can read it.
- **GitHub switches a scheduled run off after 60 days without activity** in a public repository. The owner commits daily, but the
  Companion says so when the nightly run has not run for two days, so a run switched off is seen.
- **Nothing here posts anything, anywhere, under anyone's name.** Report links open GitHub's own new-issue form in the browser; the
  person reads it and presses Submit themselves.
- **Online parts are on for the repositories on the person's games list**, each with its own switch to turn it off, and switching
  one off says plainly what stops working (the owner's answer, below).

## The owner's answers (23 Nov 2026, by card)

| Question | The owner's answer |
| --- | --- |
| How should each kind of online call start? | **"On for listed repositories with a setting to disable otherwise, with applicable warnings of severe loss of functionality."** |
| Where does the nightly run leave its results? | **A results branch** in the game's repository, written only by the run and only when the result changes. No issue, no email |
| How public is the known-problems feed? | **Public, facts and links**: which mods, what goes wrong, what to do, the versions checked, a link to the author's issue where one exists; no blame |
| Whose repositories do report links reach? | **Ours first, theirs plain**: pre-filled reports only to our own repositories; for other authors, their existing issues listed and their blank new-issue form; drafts to other authors still go through the owner's private tracker (phobos-modkit `rules/reports.md`) |

**Agent's reading of "listed", to confirm:** the repositories on the games list, and the feeds the program itself names (D'thorga's
own, so a stranger's Companion gets the known problems too). A feed someone adds by its address starts on, since adding it is the
yes. Everything else starts off.

## What the three share

| # | Shared part | Where | Used by |
| --- | --- | --- | --- |
| S1 | **One online reader**: the kit's existing GitHub reader (`github.py`: keyless, a generic client name, paced, cached in SQLite) gains **the last answer kept and shown with its age when GitHub cannot be reached**, conditional requests, and **one hourly allowance shared by every tool** (below) | phobos-modkit | O2, O3, O4, and the tools that already read GitHub (`rimworld-sources`) |
| S2 | **One switch for each kind of call**, in the Companion's own `online.json` (as `features.json` keeps the agent features' choice): on, or off by the person's choice. The host makes no automatic call whose switch is off. **Settings → Going online** lists each kind: what it contacts, how often, its switch, and what stops working without it | phobos-companion | O2, O3, O4 |
| S3 | **One feed format**: an index naming each file, its kind, size and SHA-256, and files each checked by their kind's checker before use, with the last good copy kept | phobos-modkit (`feeds`); the host checks themes and Guide entries itself | O2 (written by people), O3 (written by the nightly run) |
| S4 | **A repository's GitHub name from its own git remote**, the same everywhere (`owner/repo`), so nothing is typed twice | companion-core `git.rs`; the kit's `github.links` | O2, O3, O4 |
| S5 | **One reusable nightly workflow** in phobos-modkit (`on: workflow_call`), which a game repository calls with the command to run and the branch to leave results on | phobos-modkit `.github/workflows/` | O3 first; any later nightly job |
| S6 | **One "as of" line in the window**: the answer's age, Read again, and "GitHub could not be reached; this is the answer from …" | phobos-companion `src/lib/shell/` | Every online panel |

### The shared allowance (S1)

Every answer from GitHub's API carries how many calls are left this hour and when the hour turns. The reader keeps the latest in
the kit's cache, so every tool sees the same figure.

| Who asks | How many calls | When |
| --- | --- | --- |
| Gate lights (O4) | One for each repository **whose pushed commit changed since the last look** (git knows when you pushed), one more every 5 minutes while a run is still going, and one a day for each repository's nightly run | Home, at most every 15 minutes |
| Their reports (O4) | One for each 100 issues of an author's repository | On a press, kept for a day |
| Feeds and nightly results (O2, O3) | **None from the allowance**: raw files | At start and every 6 hours (agent default) |
| `rimworld-sources` (existing) | Up to a few dozen, and searches | On a press or an agent's run |

**Automatic calls stop when 15 or fewer are left** (agent default), so a press always has room; a press stops only at none, and
then says when GitHub's hour turns.

## O4, part 1: gate lights

**What it gives:** Home shows, for each repository on the games list, whether its last push passed its checks on GitHub, and
whether its nightly run is still running.

| Question | Answer |
| --- | --- |
| What does it let the person do? | See a failed check on GitHub without opening GitHub; see commits not yet pushed; see a nightly run that GitHub switched off |
| What does it stop them doing? | Nothing; a light is a link to the run on GitHub |
| How does it change the way they work? | A failure is noticed at the next look at Home, not days later |
| What outside the thing notices? | Nobody. GitHub sees a keyless request from this computer naming a public repository |

- **Risk (agent's grade): low.** Nothing is changed or sent; a stale light says how old it is.
- **Without it (the warning when switched off):** "Home will no longer say whether your last push passed its checks on GitHub. A
  failed check goes unnoticed until you look there."
- **How:** the kit's `repos status` (game-free) reads, for each repository named: the branch, commits not pushed, files not
  committed (local git), and from GitHub the latest run of each workflow on the default branch for pushes and for the schedule
  (its name, result, time, commit and link). Home shows one line each: passed, failed (with the workflow's name), running, not
  pushed, no checks on GitHub, or "the nightly run last ran 3 days ago".
- **A next game needs nothing**: it reads any repository on GitHub.

## O4, part 2: report links

**What it gives:** a fault in our own work becomes a GitHub issue the person sends themselves, already filled in; for another
author's mod, their existing reports and their new-issue form are one press away.

| Question | Answer |
| --- | --- |
| What does it let the person do? | Send us a "Something's off" note or a fault in one of our mods as a GitHub issue, reading every word first (the release audit's C5); see whether another author already has a report of a fault |
| What does it stop them doing? | Sending anything without reading it: the form opens in their browser, and only they can press Submit |
| How does it change the way they work? | No copying log lines into GitHub by hand; no second report of a fault already reported |
| What outside the thing notices? | The author, only when the person sends it |

- **Risk (agent's grade): low.** Nothing is sent by the Companion.
- **Ours:** a repository on the games list with a GitHub remote, and the Companion's own repository. The kit builds the address
  `https://github.com/<owner>/<repo>/issues/new?title=…&body=…&labels=…`; the host opens only an address of that shape, for a
  repository the kit's answer named. The body holds the note's words, the page's address, the version and Windows' version; **the
  note's picture is attached by the person** (GitHub takes pictures only by dropping them on the form), with a button that shows
  the picture's folder.
- **Long reports:** GitHub refuses an address that is too long (its documentation names no figure). Above 6,000 characters (agent
  default), the body goes to the clipboard and the form opens with the title and one line saying to paste it.
- **Theirs:** for a mod whose public source the source register confirmed, **Their reports** lists its issues, open and closed, with
  the fault's words searched among them (one API call for each 100, on a press), and **Open their new-issue form** opens it blank.
  The owner's drafts still go through the private tracker and its checks (`rules/reports.md`).
- **Unchecked:** a repository that uses GitHub's issue forms (YAML) may ignore `body`; the first use tells.

## O3: the nightly watch

**What it gives:** Home and the Code map say when another author's public source changed a method our code patches, before their
Workshop update arrives.

| Question | Answer |
| --- | --- |
| What does it let the person do? | Prepare a fix before an update breaks a patch; see "changed upstream, not yet released" beside a patch |
| What does it stop them doing? | Nothing |
| How does it change the way they work? | The check runs while the PC is off; the Companion reads the answer at its next start |
| What outside the thing notices? | GitHub runs it. The results branch is public; nobody is told (the owner chose no issue and no email) |

- **Risk (agent's grade): low.** It reads public source and writes only its own branch.
- **Without it (the warning when switched off):** "You will hear that another author changed a method we patch only after their
  update reaches you. The check on your PC after an update still runs."
- **How:** phobos-rimworld calls the kit's reusable workflow each night (agent default: 16:17 UTC, 3:17 am in Melbourne in summer;
  off the hour, which GitHub delays). It checks out main with the kit, makes lean clones of the confirmed repositories (the kit's
  `source_clones`), runs `rimworld-upstream pending`, and writes the answer as a feed file (S3) to the branch **`companion-results`**,
  committing only when the answer changed. The job alone may write, and only to that branch; it never force-pushes.
- **What the results hold:** for each finding, the repository, the commit (hash, date, title line and link), the member of theirs it
  touched, and our line that depends on it. **No line of their code.**
- **What reads it:** Home ("Their code changed: 2 methods we patch"), the Code map's patch badges, and Since you last played.
- **Limit, said on the page:** public source can differ from the Workshop build, so this is an early warning; the check on the PC
  after an update stays the real one.
- **What a next game needs:** its own `upstream` adapter (what counts as ours, and the language git splits the changes by); the
  workflow and the feed are generic.

## O2: data feeds

**What it gives:** the Companion learns without a new installer: known problems between mods, sort rules, Guide entries and
themes, from feeds D'thorga publishes and any repository the person adds.

| Question | Answer |
| --- | --- |
| What does it let the person do? | Be warned of a known clash before it costs a save; get new Guide entries, rules and themes |
| What does it stop them doing? | Nothing; a feed only adds warnings and choices, never changes a list or a file |
| How does it change the way they work? | What we learn on one PC reaches every Companion |
| What outside the thing notices? | GitHub sees the reads. Authors named in a known problem can read it, as anyone can |

- **Risk (agent's grade): low.** A wrong known problem could lead someone to switch a mod off needlessly; the check only warns,
  with the source, and never acts.
- **Without the known problems (the warning when switched off):** "The mod-list check will no longer warn of known clashes between
  mods. It still finds missing mods and order faults." The other kinds say only what they would add.
- **The format:** a feed is an `index.json` (format 1, the feed's name, when it changed, and for each file its kind, path, size and
  SHA-256) beside its files. People write theirs in a repository's `feeds/` folder on its default branch; the nightly run writes its
  own at the top of `companion-results`. The kit's `feeds index --write` builds the index, and the gate refuses an index that no
  longer matches its files.
- **Reading:** the kit's `feeds read` fetches each index and file from raw files, checks the size and hash, then the kind:
  known problems and sort rules by the kit, themes and Guide entries by the host's own checks. **A file that fails never replaces
  the last good copy**; the page says what failed. An unknown kind is skipped, and said. Agent defaults: an index at most 64 KB, a
  file at most 1 MB.
- **Kinds in format 1:** `known-problems`, `sort-rules`, `guide`, `theme`, `upstream-watch` (O3's).
- **A known problem:** an id, the mods (package ID, Workshop number, name) and whether it needs all of them active, what goes wrong,
  what to do, the versions it was checked against and when, the author's issue where there is one, and a `gone` date once fixed.
  `mod-list check` shows a known problem that matches the active list under What's wrong, with its link. **Each one we publish is
  checked against the author's newest public source and our records first**, as a report would be.
- **What a next game needs:** its `mod-list` adapter's mod ids; the format is generic.

## Build order

Agent's lean: the smallest slice that proves the shared parts comes first.

| Slice | What | Proves |
| --- | --- | --- |
| 1 | **S1, S2, S4, S6 and gate lights**: the reader's last answer and allowance; `repos status`; Settings → Going online; Home's lights; About's list of what the Companion contacts (the release audit's C3) | The reader, the switches and the "as of" line, on the cheapest part |
| 2 | **S3, S5 and the nightly watch**: `feeds index/read/check`; the reusable workflow; phobos-rimworld's nightly run and `companion-results`; Home and Code map read it | The feed format, on machine-written data |
| 3 | **Data feeds**: the known problems (each re-checked) and `mod-list check` reading them; then sort rules, Guide entries and themes | People-written feeds |
| 4 | **Report links**: ours pre-filled, theirs plain | Opening addresses safely from the host |

## Open, for the owner to revise

| What | Agent default |
| --- | --- |
| Feeds read at start and every 6 hours | Every 6 hours |
| Automatic calls stop at 15 left this hour | 15 |
| The nightly run's time | 16:17 UTC |
| The results branch's name | `companion-results` |
| Long report bodies to the clipboard above | 6,000 characters |
| Feed sizes | Index 64 KB, a file 1 MB |

## Sources

- GitHub, [best practices for the REST API](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api)
  (conditional requests; read 23 Nov 2026).
- GitHub, [disable and enable workflows](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/disable-and-enable-workflows)
  (the 60-day rule; read 23 Nov 2026).
- GitHub, [query parameters for pull requests](https://docs.github.com/en/pull-requests/reference/using-query-parameters-to-create-a-pull-request)
  (an address too long is refused with 414; read 23 Nov 2026).
