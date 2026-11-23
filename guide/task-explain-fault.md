---
title: Have a fault in the log explained
kind: task
go: logs
words: explain, AI, error, exception, what does this mean, help, model, Claude, Ollama
see: task-ai-services, page-logs, task-log-fault
---
**Explain this fault asks the AI you chose what a fault in the game's log means**, in plain words: what went wrong, which mod is most likely involved, whether it matters, and what to try first. **It shows you everything it would send before anything goes.**

1. [Choose the AI that explains things](task-ai-services) first, once. The button shows only when it is ready.
2. Open **Logs** (the **G** key) and open a fault.
3. Press **Explain this fault**. The card shows where it would go (the service and model), the instruction, and the fault itself, word for word.
4. Press **Send**, or **Cancel** to send nothing.

The answer appears as it comes, with how many tokens the service counted. **An AI's answer can be wrong: check it before acting on it.**

**What is sent:** only the fault as the log reader grouped it (the message, how often, the stack, the mods it points at), with home folders shown as `~`, and the instruction kept with the Companion. Nothing else from your computer. With a model on this computer, nothing leaves it at all.
