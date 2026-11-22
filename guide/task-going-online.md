---
title: Choose what the Companion asks the internet
kind: task
go: settings?panel=online
words: online, internet, GitHub, network, privacy, gate lights, checks, switch off, offline
see: page-settings, page-home, page-about
---
**The Companion asks the internet only for what Settings lists under Going online**, and only reads public pages: nothing about you is sent. Each kind is **on** for the repositories on your list, and you can switch any of them off.

1. Open **Settings** (the **9** key), at **Going online**.
2. Each kind says what it does and the address it contacts. Press **On** or **Off**.
3. Switching off a kind you would miss a lot asks first, and says what stops working. Press **Switch it off** or **Keep it on**.

**Nightly watch**: each night GitHub's own machine looks through the public source of the mods yours patch, for commits that touch a method your code names. Home's **Their code changed** lists what it found, before those authors' updates reach you. The Companion reads each repository's results at most every six hours, without using any of GitHub's hourly calls. A repository needs its own nightly run to have results; one without simply shows nothing.

**Gate lights**: Home shows whether each repository's last push passed its checks on GitHub, and whether its nightly runs still run. It asks GitHub once for each repository, then again only after you push, or while a check is still running. **Look now** on Home asks at once.

GitHub lets a computer that doesn't sign in ask 60 times an hour, shared by every tool. When fewer than 16 are left, the Companion stops asking by itself and keeps the rest for **Look now**. When GitHub can't be reached, Home shows its last answer and says how old it is.

About lists the same kinds, with whether each is on.
