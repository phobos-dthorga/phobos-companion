---
title: Choose what the Companion asks the internet
kind: task
go: settings?panel=online
words: online, internet, GitHub, network, privacy, gate lights, checks, switch off, offline, AI services, updates, updater
see: page-settings, page-home, page-about, page-logs, page-modlist, page-publish, task-ai-services
---
**The Companion asks the internet only for what Settings lists under Going online.** Every kind but one only reads public pages: nothing about you is sent. Those kinds are **on** for the repositories on your list, and you can switch any of them off. **AI services is the one exception: it starts off**, because it sends text you chose.

1. Open **Settings** (the **S** key), on the **Going online** tab.
2. Each kind says what it does and the address it contacts. Press **On** or **Off**.
3. Switching off a kind you would miss a lot asks first, and says what stops working. Press **Switch it off** or **Keep it on**.

**AI services**: help on pages, such as **Explain this fault** on the [Logs](page-logs) page, from an online AI service you chose, with your own key ([set it up](task-ai-services)). It sends only what the page showed you, and only when you press **Send**. **Off until you turn it on.** A model on this computer, such as Ollama or LM Studio, is not going online and works either way.

**Workshop pages**: on the [Publish](page-publish) page, **Read Steam back** asks Steam's public pages, without an account, how each of your Workshop items stands: whether it is public, and the day it went public, which it writes into the changelog. On the [Mod list](page-modlist), **What players say** reads a Workshop mod's public page and comments, or the game's and its DLCs' Steam reviews. Each only when you press it.

**Their reports**: on the [Logs](page-logs) page, lists another author's existing issues for a fault in their mod, only when you press it. Opening a new-issue form is your browser's own visit, so it has no switch.

**Community lists**: the Mod list's sorter and What's wrong read four lists the RimWorld community keeps on GitHub: load-order rules, each Workshop item's required mods, mods known to work on a version they don't name, and replacements for old mods. The Companion fetches any older than a week when the Mod list opens, and when you press **Fetch them now** on its Sort view, without using any of GitHub's hourly calls. Whichever copy is newer is read, the Companion's or RimSort's, so it works the same while you still have RimSort.

**Known problems**: the Mod list's What's wrong warns when mods on your list are known to go wrong together, with what goes wrong and what to do. The problems come from the feeds your repositories publish (a `feeds` folder), each checked against the authors' own work before it was published. The Companion reads them at most every six hours, without using any of GitHub's hourly calls, and uses the last copy it has when GitHub can't be reached.

**Nightly watch**: each night GitHub's own machine looks through the public source of the mods yours patch, for commits that touch a method your code names. Home's **Their code changed** lists what it found, before those authors' updates reach you. The Companion reads each repository's results at most every six hours, without using any of GitHub's hourly calls. A repository needs its own nightly run to have results; one without simply shows nothing.

**Updates**: once each time the Companion starts, it asks GitHub whether a newer version is published, fetches it in the background and installs it when you close the Companion ([how](task-update-companion)). Only a version signed with the owner's update key is installed.

**Gate lights**: Home shows whether each repository's last push passed its checks on GitHub, and whether its nightly runs still run. It asks GitHub once for each repository, then again only after you push, or while a check is still running. **Look now** on Home asks at once.

GitHub lets a computer that doesn't sign in ask 60 times an hour, shared by every tool. When fewer than 16 are left, the Companion stops asking by itself and keeps the rest for **Look now**. When GitHub can't be reached, Home shows its last answer and says how old it is.

About lists the same kinds, with whether each is on.
