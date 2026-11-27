---
title: Choose the AI that explains things
kind: task
go: settings?panel=ai-services
words: AI, model, Ollama, LM Studio, Claude, Claude Code, Anthropic, ChatGPT, OpenAI, Codex, Gemini, Gemini CLI, Google, key, API key, subscription, plan, Claude plan, login, no key, free, local, explain
see: task-explain-fault, task-going-online, task-ai-programs, task-chat-agent, page-settings
---
**Help on pages, such as Explain this fault on the Logs page, comes from a model you choose.** It shows only once a service and its model are ready.

**Three kinds, cheapest first:**

- **On this computer** (free; nothing leaves the computer): install **Ollama** or **LM Studio** yourself, download a model in it, and leave it running.
- **Programs you log in to** (no key; nothing charged per question): a program you already use on a plan you pay for, such as **Claude Code** on a Claude plan, **Codex** with ChatGPT, or **Gemini CLI** with Google. Each answer counts against your plan's usage limits, as your own use of the program does. **You install the program and log in to it yourself**; the Companion never sees your login. It starts the program for each answer with **its tools switched off**, in an empty folder, so it can read or change nothing of yours.
- **Charged per use** (your key): Claude, OpenAI or Gemini online, with your own key from that service's website. The service charges you for each question.

1. Open **Settings** (the **S** key), on the **AI** tab.
2. Under **AI services**, press the service you want.
3. For a **program you log in to**:
   - if it says **not on this computer**, install it as the panel says, run it once in a terminal and log in, then open this tab again;
   - turn on **AI services** in **Going online** (**Open Going online** takes you there). **It starts off**, because the program sends your question to its own service;
   - press **Check the login and models**: the panel says whether the program is logged in **with your plan** (nothing charged per question) or **with an API key** (charged per use).
4. For a service **charged per use**:
   - paste your key in **A key for …** and press **Keep this key**. It goes into your computer's own key store (Windows Credential Manager on Windows) and is **never shown again**;
   - turn on **AI services** in **Going online**.
5. Press **Read the models** (or **Check the login and models**), then choose one under **The model that answers**. For a program, **The program's own choice** lets it pick.
6. Choose an **Answer length**: **Short**, **Medium** or **Long**.
7. **Let the AI ask the tool kit's reports**: **On** (the usual) or **Off**. On, the AI may ask the tool kit's read-only reports for more facts while it answers, at most six a question. With a model on this computer each one runs and is listed. **With a program or an online service each one runs on your computer first, and waits for you**: read its answer, then press **Send this report** or **Don't send**.

When it says **Ready**, three buttons appear, each showing what it would send before **Send**:

- **Explain this fault**, on a fault on the [Logs](page-logs) page ([more](task-explain-fault));
- **Summarise this version**, on each version on the [Changes](page-changes) page;
- **What does this mean for my mods?**, under a finished update check on the [Mods](page-mods) page ([more](task-what-updated)).

**Good to know:**

- **A program marked "not yet tried"** has not been tried with the Companion yet, so it may not work at first.
- **A program never uses a key from your environment.** The Companion takes variables such as `ANTHROPIC_API_KEY` out of the program's environment, so a key set there never makes it charge per use. A program logged in with a key of its own still charges: the panel and the question's card say so.
- **Forget this key** removes a kept key from the key store.
- For a service charged per use, a key in its environment variable (such as `ANTHROPIC_API_KEY`) is used first, and the panel says so.
- **This month** counts your answers and the tokens counted, so you can see what you have used.
- To work with a whole agent instead, which can also change files, see [the Chat page](task-chat-agent).
