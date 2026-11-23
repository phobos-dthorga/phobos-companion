---
title: Chat
kind: page
page: chat
go: chat
words: chat, agent, Claude, Codex, Gemini, Copilot, Goose, ACP, agent client protocol, assistant, AI
see: task-chat-agent, page-settings, task-ai-services
---
**Talk to a whole agent while it works in one of your repositories**: Claude, Codex, Gemini CLI, GitHub Copilot or Goose, installed and logged in with its own program. The page shows only once it is switched on in Settings → AI ([set it up](task-chat-agent)).

1. Choose the repository it works in.
2. Read **Before you start**, then press **Start …**.
3. Type in **Your message to …** and press **Send** (or **Ctrl + Enter**).

**What you see:** its answer as it comes; its thinking, folded away; each step it takes, with how it went; its plan; and every file it read through the Companion.

**When it asks your permission**, a card shows what it wants to do and its own choices, such as **Allow once** or **Reject**, and **Neither**. It waits for you.

**When it asks to change a file through the Companion**, a card shows the file and the change line by line: lines marked **+** are added, lines marked **−** removed. Nothing is written until you press **Make this change**; **Don't** tells it you said no. It may never change anything inside `.git`, or outside the repository.

**Stop** asks it to stop its turn. **End** ends it, and everything it started; so does leaving the page.

**What it can and can't do:**

- **It is its own program, with your own access to the disk.** It may change or delete files in the repository by itself, as it would in a terminal, and the Companion cannot stop that. git shows everything that changed.
- **Through the Companion it may read files in that repository**, each one listed, ask your permission, and **change a file only on your yes**. If it asks the Companion to run a command, the Companion refuses and says so.
- It can ask the tool kit's reports that read, as an AI program can ([more](task-ai-programs)).

### Keys
- **Shift + C** opens Chat, once it is shown.
- **Ctrl + Enter** sends your message.
