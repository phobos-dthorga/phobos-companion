---
title: Chat with an agent in a repository
kind: task
go: settings?panel=chat
words: chat, agent, Claude, Codex, Gemini, Copilot, Goose, install, switch on, ACP, commands, automatic, ask every time
see: page-chat, page-settings
---
**The Chat page lets you talk to a whole agent (Claude, Codex, Gemini CLI, GitHub Copilot or Goose) while it works in one of your repositories.** It starts off, because an agent can change files by itself.

1. **Install the agent yourself** and log in with its own program once. Settings says where to get each one; the Companion never installs anything.
2. Open **Settings** (the **9** key), on the **AI** tab.
3. Under **Chat with an agent**, press **On**, then the agent. Each one says whether it is **on this computer**.
4. **Chat** now shows in the page list (**Shift + C**). Choose a repository, read **Before you start**, and press **Start …**.

**Off** hides the page again and ends any agent running.

**Commands it runs** chooses how a command the agent wants to run is handled. It starts on **Ask every time**:

- **Refused**: the Companion runs none; the agent's own permission questions still come to you.
- **Ask every time**: each is shown whole, with what it does, and runs only when you press **Run it**.
- **Automatic**: a command that only reads, runs the tests or asks the tool kit's reports that read runs by itself; anything else asks.

In every mode, what agents never do here is refused even with a yes. A change reaches the next agent you start.

**Good to know:** the agent may change or delete files in the repository by itself, as it would in a terminal. Through the Companion it may read files there, ask your permission, change a file only after you see the change and press **Make this change**, and run commands as you chose above. Keep your work committed, and git will show anything it changed.
