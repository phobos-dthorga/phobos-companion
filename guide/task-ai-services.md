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

When it says **Ready**, open a fault on the [Logs](page-logs) page and press **Explain this fault**.

**Good to know:**

- **Forget this key** removes a kept key from the key store.
- A key in the service's environment variable (such as `ANTHROPIC_API_KEY`) is used first, and the panel says so.
- **This month** counts your answers and the tokens the services counted, so you can see what you have used.
