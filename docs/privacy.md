# Privacy: what D'thorga Companion sends, and to whom

**The Companion collects nothing about you and sends nothing about you by itself.** It has no account, no analytics, no crash
reporting and no telemetry. Everything it keeps (your games list, your choices, your test verdicts, your notes) stays on your
computer, in its own folder.

## What it asks the internet, and why

It reads a few public pages, without an account or a key, so some pages can show what changed. **Each kind has its own switch in
Settings → Going online**, and About lists them too. **Off means off**: a kind switched off makes no call, even on a press.

| Kind | Asks | What for | Starts |
| --- | --- | --- | --- |
| Gate lights | `api.github.com` | Whether each of your repositories' last push passed its checks | On |
| Nightly watch | `raw.githubusercontent.com` | What your repositories' nightly runs found, read from their public results | On |
| Known problems | `raw.githubusercontent.com` | Public lists of mods known to go wrong together | On |
| Their reports | `api.github.com` | Another author's existing issues for a fault, only when you press it | On |
| Workshop pages | `api.steampowered.com`, `steamcommunity.com` | How your Steam Workshop items stand, and what players say on a mod's Workshop page, only when you press it | On |
| Updates | `github.com` | Whether a newer Companion is published, and the installer when there is | On |
| AI services | The AI service you chose | Help on a page, only text you were shown, only when you press Send, with your own key | **Off** |

These calls send what any web page request sends (your internet address, and which public page is asked for), and nothing about
you, your games, your mods or your files. The AI services are the one exception, and only on your press: they send exactly the
text shown to you first, to the service you chose, under that service's own privacy terms. A model on your own computer (Ollama,
LM Studio) sends nothing anywhere.

## What it never does

- It never sends your files, saves, logs, notes or pictures anywhere by itself.
- **Something's off** opens a GitHub issue in your browser, filled in, for you to read and send yourself; the Companion sends
  nothing, and your home folder's name is hidden in its picture.
- It holds no password and no login, for Steam or anything else. A key for an AI service is kept in Windows' own Credential
  Manager, never in a file, and never shown again.
- It never posts, uploads or publishes anything without your press and, for anything public, your yes.

## Questions

Open an issue on [the Companion's GitHub page](https://github.com/phobos-dthorga/phobos-companion/issues). This statement is
kept beside the code, and changes with it: [the changelog](../CHANGELOG.md) says when.
