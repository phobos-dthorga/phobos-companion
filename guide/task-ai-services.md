---
title: Choose the AI that explains things
kind: task
go: settings?panel=ai-services
words: AI, model, Ollama, LM Studio, Claude, Anthropic, ChatGPT, OpenAI, Gemini, Google, key, API key, local, explain
see: task-explain-fault, task-going-online, task-ai-programs, page-settings
---
**Help on pages, such as Explain this fault on the Logs page, comes from a model you choose.** It shows only once a service and its model are ready.

**A model on this computer is free, and nothing leaves the computer.** Install **Ollama** or **LM Studio** yourself, download a model in it, and leave it running. **An online service** (Claude, OpenAI, Gemini) needs your own key from that service's website, and the service charges you for each question.

1. Open **Settings** (the **9** key), on the **AI** tab.
2. Under **AI services**, press the service you want.
3. For an online service:
   - paste your key in **A key for …** and press **Keep this key**. It goes into your computer's own key store (Windows Credential Manager on Windows) and is **never shown again**;
   - turn on **AI services** in **Going online** (**Open Going online** takes you there). **It starts off.**
4. Press **Read the models**, then choose one under **The model that answers**.
5. Choose an **Answer length**: **Short**, **Medium** or **Long**.
6. **Let the AI ask the tool kit's reports**: **On** (the usual) or **Off**. On, the AI may ask the tool kit's read-only reports for more facts while it answers, at most six a question. With a model on this computer each one runs and is listed. **With an online service each one runs on your computer first, and waits for you**: read its answer, then press **Send this report** or **Don't send**.

When it says **Ready**, three buttons appear, each showing what it would send before **Send**:

- **Explain this fault**, on a fault on the [Logs](page-logs) page ([more](task-explain-fault));
- **Summarise this version**, on each version on the [Changes](page-changes) page;
- **What does this mean for my mods?**, under a finished update check on the [Mods](page-mods) page ([more](task-what-updated)).

**Good to know:**

- **Forget this key** removes a kept key from the key store.
- A key in the service's environment variable (such as `ANTHROPIC_API_KEY`) is used first, and the panel says so.
- **This month** counts your answers and the tokens the services counted, so you can see what you have used.
