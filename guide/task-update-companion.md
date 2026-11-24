---
title: Install a newer version of the Companion
kind: task
go: about
words: update companion, new version, installer, upgrade, updater, auto-update, install now
see: page-about, task-going-online
---
**The Companion updates itself.** Each time it starts it asks GitHub whether a newer version is published, fetches it in the background, and **installs it when you close the Companion**: it is in place the next time you open it.

1. When one is ready, **Home** says **Version … is ready**, and **About** (the **I** key) says so on its first tab, with what's new.
2. To install it at once, press **Install now** on About: the Companion closes, Windows shows the installer's small progress window, and the new version opens.

It takes only a version the owner published on GitHub and signed with their update key. **Updates** can be switched off in **Settings → Going online** ([choose what the Companion asks the internet](task-going-online)); then download each installer from the project's GitHub releases page yourself.

If About says **Updates are not set up yet**, this version was built before the update key was made: install a newer one by hand once, and it looks for updates by itself from then on.

**Beside the repository it was built from** (the owner's own copy), About also says when the repository holds a newer version than the one running, with the full path of its installer when it is built.
