---
title: Let an AI program ask the tool kit's reports
kind: task
go: settings?panel=ai-programs
words: AI, MCP, model context protocol, Claude, Claude Desktop, Claude Code, ChatGPT, LM Studio, Gemini, chat, assistant, server
see: term-tool-kit, page-settings, page-reports
---
**An AI program you already use can ask the [tool kit's](term-tool-kit) reports in plain words**: why the game logged errors, what is in a save, what changed. You paste a few lines into the program once; **it starts the kit's server by itself** whenever it needs it.

1. Open **Settings** (the **S** key), on the **AI** tab.
2. For Claude Desktop, LM Studio, Gemini CLI and most others: press **Copy the list**, then paste it into the program's own list of servers, beside any already there.
3. For Claude Code: press **Copy the command**, then run it once in a terminal.
4. Restart the AI program, then ask it something like "why did my game log errors?".

**What it can and can't do:**

- **It can only ask reports that read**, the same ones the [Reports](page-reports) page offers and more. It can never install, publish, change a mod list or run your code.
- It names a repository only from your games list, never a folder of its own choosing.
- Home folders show as `~` in everything it sees.
- Nothing goes online.

**The lines hold this computer's own folders**, so they work only on this computer. They have not yet been tried in every program: each program's own help says where its list of servers lives.
