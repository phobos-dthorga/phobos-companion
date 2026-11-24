---
title: Chat
kind: page
page: chat
go: chat
words: chat, agent, Claude, Codex, Gemini, Copilot, Goose, ACP, agent client protocol, assistant, AI, command, terminal, run, automatic
see: task-chat-agent, page-settings, task-ai-services
---
**Talk to a whole agent while it works in one of your repositories**: Claude, Codex, Gemini CLI, GitHub Copilot or Goose, installed and logged in with its own program. The page shows only once it is switched on in Settings → AI ([set it up](task-chat-agent)).

1. Choose the repository it works in.
2. Read **Before you start**, then press **Start …**.
3. Type in **Your message to …** and press **Send** (or **Ctrl + Enter**).

**What you see:** its answer as it comes; its thinking, folded away; each step it takes, with how it went; its plan; and every file it read through the Companion.

**When it asks your permission**, a card shows what it wants to do and its own choices, such as **Allow once** or **Reject**, and **Neither**. It waits for you.

**When it asks to change a file through the Companion**, a card shows the file and the change line by line: lines marked **+** are added, lines marked **−** removed. Nothing is written until you press **Make this change**; **Don't** tells it you said no. It may never change anything inside `.git`, or outside the repository.

**When it wants to run a command**, the Companion first sorts it by what it does, as **Settings → AI** says ([choose how](task-chat-agent)):

- **What agents never do here is refused, in every mode, even with a yes**: force-pushing or rewriting git history, skipping the repository's checks, touching your saves, publishing to Steam, reading credentials, changing a repository's visibility, or changing anything outside the repository. A line says it was answered no, and why.
- **In Automatic, a command that only reads, runs the tests or asks the tool kit's reports that read runs by itself**: a line says **Ran by itself**, then how it ended, with its output folded away.
- **Anything else waits on a card**: the command whole, the folder it runs in, **What it does**, and **Look twice** when it can delete, throw work away, install or stop something. Press **Run it**, **Not this**, or **Allow for this chat** (the same command then runs by itself until the agent ends). The agent's own permission questions that name a command show the same, with **Allow for this chat** beside its own choices.

**Stop** asks it to stop its turn, says no to anything waiting, and ends every command still running. **End** ends it, and everything it started; so does leaving the page.

**What it can and can't do:**

- **It is its own program, with your own access to the disk.** It may change or delete files in the repository by itself, as it would in a terminal, and the Companion cannot stop that. git shows everything that changed.
- **Through the Companion it may read files in that repository**, each one listed, ask your permission, **change a file only on your yes**, and **run commands as you chose**, sorted first.
- **The sorting reads a command's words. It is not a sandbox**: that is why only commands that plainly read or test run by themselves, and a script always asks.
- It can ask the tool kit's reports that read, as an AI program can ([more](task-ai-programs)).

### Keys
- **Shift + C** opens Chat, once it is shown.
- **Ctrl + Enter** sends your message.
