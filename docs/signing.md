# Signing the installer: SignPath Foundation, and what else there is

Written for the owner on 25 Nov 2026, at their choice by card ("Write up SignPath"), for the release audit's B5: the installer is
not signed, so Windows SmartScreen warns a stranger ("Windows protected your PC") before it installs. This is research for a
decision, not a plan: **nothing has been applied for, set up or changed.** Tauri's own updater signature (minisign, 0.85.0) is
a separate thing and stays as it is.

## The answer first

**SignPath Foundation fits technically, with four catches:**

1. **Being accepted depends on reputation.** A young project with few users can be turned down (one project reports a decline in
   July 2026 for too little "project popularity"; second-hand).
2. **The publisher Windows shows is "SignPath Foundation"**, never the owner or the project.
3. **SmartScreen's warning fades as reputation builds**: signing does not remove it at once (even EV certificates stopped doing
   that in 2024).
4. **The release workflow has to change order**: Windows' signature must go on the installer before the updater's.

**If declined:** Certum's open-source certificate, about €49, is the cheapest other way, but it carries the owner's own legal name
and needs identity documents.

## What SignPath asks of a project

From its terms, [signpath.org/terms](https://signpath.org/terms) (its code of conduct says it is still a draft):

| Condition | How the Companion stands (agent's reading) |
| --- | --- |
| An OSI-approved licence for everything, no commercial dual licensing | MIT: fits |
| No proprietary components (system libraries allowed) | WebView2 is Microsoft's runtime, likely a system library: **not confirmed** |
| Already released, maintained, documented on its download page | **Needs a first published release** and a download page |
| The team develops the project and owns the repository | Fits |
| "A certain verifiable reputation" for programs, checked once at acceptance | **The open question** |
| MFA for every team member, on SignPath and on GitHub | The owner turns it on |
| Roles: Authors, Reviewers, Approvers; each signing approved by a trusted member | Whether one person may hold all three: **ask SignPath** |
| A "Code signing policy" page, linked from home and download pages, saying "Free code signing provided by SignPath.io, certificate by SignPath Foundation", the roles, and a privacy statement | To write |
| A privacy policy shown at install, with a way to switch off, for software that sends data the person wasn't told of | About already lists every call and Going online switches each (0.61.0); whether the installer must show it too: **ask** |
| Product name equals the project name; one version across a build | Fits, if the project is named "D'thorga Companion" |
| Built verifiably from source on CI; every release approved by hand | Fits: GitHub-hosted runners already build each tag |

**Applying:** [signpath.org/apply](https://signpath.org/apply). Its form loads by script, so its fields were read from an
applicant's write-up of February 2026 ([zenn.dev](https://zenn.dev/shm_7ec/articles/signpath-oss-code-signing), second-hand): the
repository, the licence, a download or release address, a description (what it does, who uses it, the file types), and a contact
email. **How long approval takes is not stated anywhere first-hand.**

## How signing would work in the release workflow

- SignPath's action is `signpath/github-action-submit-signing-request@v3` (v3.2 is its latest tag, 20 Nov 2026). The workflow
  uploads the unsigned installer with `actions/upload-artifact` and passes its id; `archive: false` with `skip-decompress: true`
  avoids a zip ([SignPath's GitHub docs](https://docs.signpath.io/trusted-build-systems/github)).
- SignPath checks the run's origin with GitHub itself; open-source projects must build on GitHub-hosted runners, and a policy can
  limit signing to tags or branches ([projects](https://docs.signpath.io/projects)).
- **The owner approves each request** in SignPath's web portal, from an email. **The action waits only 600 seconds by default**
  ([action.yml](https://github.com/SignPath/github-action-submit-signing-request/blob/v3.2/action.yml)), so the timeout would be
  raised, or the approval made within ten minutes.

**The order matters.** Today `npm run installer` writes the updater's `.sig` for the unsigned installer; Windows' signature then
changes the file's bytes and the `.sig` no longer matches. The agent's design, **untested**: build; upload the unsigned
installer; sign it through SignPath; sign the signed file with `tauri signer sign` ([Tauri CLI](https://v2.tauri.app/reference/cli/));
rebuild `latest.json` with `scripts/release-files.mjs`; attach all three to the draft. Tauri's own `signCommand` hook
([Tauri's Windows signing](https://v2.tauri.app/distribute/sign/windows/)) does not fit, since SignPath's signing is a step of its
own. **Only the outer `setup.exe` would be signed**; the program inside the NSIS installer stays unsigned unless signed in a
round of its own first (agent's inference, unconfirmed).

## The other ways

| Way | Cost | Catch |
| --- | --- | --- |
| **Certum Open Source Code Signing** ([Certum](https://shop.certum.eu/open-source-code-signing-on-simplysign.html)) | About €49 | The certificate shows "Open Source Developer" and the owner's own details; identity documents; its SimplySign phone app makes codes, awkward on CI |
| **Azure Artifact Signing** (formerly Trusted Signing; [Microsoft](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/code-signing-options)) | About US$9.99 a month | Individuals only in the USA and Canada: **not available** to an individual in Australia |
| A commercial OV certificate | About US$150–300 a year | Reputation still builds over time |
| The Microsoft Store (MSIX) | Free | No warning, but a different way to hand it out, and Store review |
| **Do nothing yet** | Free | Strangers see the warning; the Guide and download page say why and how past it |

## What the owner would do, in order

1. Turn on MFA for GitHub (and SignPath, once there is an account).
2. Publish a first release (not a draft) with a plain download page; check nothing bundled is proprietary.
3. Add a "Code signing policy" section to the README and the release page: the attribution line, the owner as Author, Reviewer
   and Approver, and a privacy statement (About's list of calls is most of it).
4. Apply at [signpath.org/apply](https://signpath.org/apply), asking whether one maintainer may hold every role.
5. If accepted: make the project, an artifact configuration for `setup.exe` and a release-signing policy with approval and
   origin checks in SignPath; keep its API token as a GitHub secret.
6. Then an agent changes `.github/workflows/release.yml` to the order above, and each release waits for the owner's approval in
   SignPath before the draft is made, published by hand as now.

**Agent's recommendation:** apply **after** the first few published releases, once the Companion has a download page and some
users, since reputation is what decides; until then, say plainly in the Guide and on the download page why Windows warns.
