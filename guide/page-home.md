---
title: Home
kind: page
page: home
go: home
words: where was I, start, overview, last time, summary
see: task-first-steps, term-repository, task-repository-ready, task-agent-features, task-safe-copies, task-going-online, task-after-a-crash
---
**Where was I?** The page to come back to after a break, for the game you are looking at (chosen at the top of the window). Under its opening sentence (how long since you were here, and the last thing you did) are three tabs; **Alt + 1, 2, 3** jump between them.

### Needs you
**Everything waiting on you, one line each, with its button.** Nothing else is on this tab, and when nothing waits it says so. The tab's name says how many wait. A line marked down its edge needs you first. Any of these may show:

- **A newer version of the Companion is ready**, and **a program the pages use isn't here**.
- **Settings to look at**: mod settings added or changed since you last looked.
- **Your mod list**: problems in it, or new errors after your last change.
- **The checks found something** in your newest save (see [find out whether my game is in a state it should never be](task-check-saves)).
- **A program crashed**, and **after the unexpected shutdown**: files a crash or power cut left filled with zeros (see [find out what a crash or power cut did](task-after-a-crash)).
- **Decisions** and **picks** waiting for your answer, and open **[screen notes](term-screen-note)**, when you work with [AI agent sessions](task-agent-features).
- **Your records want a copy**, **mods ready to publish**, and **room to clear**.

### Recent work
- **Your games**, each with when you last worked on it, and **Look at this** to switch to another.
- **Left unfinished:** files changed but not yet committed.
- **The latest work**: the newest commits in its repositories. Each opens its code.
- **Not released yet:** mods with changelog entries no released version holds; each opens its changelog on the Changes page.
- **Open work**, from each repository's list of what is still to do, where it keeps one (see [make a repository ready](task-repository-ready)).

### Repositories
- **Checks on GitHub**, for each repository: commits not pushed, files changed, and whether its last push passed its checks, with any nightly run that has stopped. **Look now** asks GitHub at once; **Going online settings** switches it off (see [choose what the Companion asks the internet](task-going-online)).
- **Their code changed**, when a repository's nightly watch found commits in other authors' public source that touch a method your code names. An early warning: read the commit before acting.
- **Safe copies**, for a repository that lists what cannot be made again (see [safe copies](task-safe-copies)).
- **Which [tool kit](term-tool-kit) each repository uses**, how far behind the newest it is, and what moving its pin would bring.
- **Who is working on what** (agent sessions' [claims](term-claim)), and any repository that **couldn't be read**.

The very first time, with no games listed yet, Home shows [First steps](task-first-steps) instead. If **git** isn't installed, a line at the top of every page says so, with where to get it.

### Around the window
- **The pages are listed down the left**, under Play, Code and Tools, each with its key beside it. A number beside a page says how many things there wait on you. No number means nothing waits.
  - **Mod list:** problems and warnings in your list of active mods, plus how many mods a sort would move.
  - **Logs:** new errors the game's first run showed after your last change to the mod list.
  - **Mods:** things to do before you play (a build, changes not installed, textures to encode), updates that changed a method your mods patch, and mod settings to look at.
  - **Tests:** rows the game saw working that nobody has judged.
  - **Reports:** what the save checks found in your newest save, faults and things worth a look together.
  - **Decisions** and **Picks:** those waiting for your answer.
  - **About** shows a mark, not a number, when a newer version of the Companion waits.
- **The numbers come from scans made by themselves**, which only read: when the Companion starts, on **Look again**, and when you come back to its window after five minutes or more away, such as after an update.
- **The game you are looking at is at the top**: press it to choose another, each with when you last worked on it.
- **Settings, Mods and About are in tabs**, one part at a time; a tab says when something in it needs you.
- **Anything that takes a while shows a progress bar**: what it is doing, the steps already done, and a count where the work can be counted (else about how long is left, from last time). A strip along the bottom follows any work, on any page.

### Keys
- **1** opens Home. **[** and **]** step to the game before or after. **R** reads everything again.
