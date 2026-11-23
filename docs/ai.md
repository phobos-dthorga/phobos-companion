# AI in the Companion: tools for AI programs, help on pages, and a chat page (A1 to A3)

**Status (23 Nov 2026):** **slice 1 (A1) built** in Companion 0.70.0 with phobos-modkit 1.109.0: the kit's `mcp serve` and
`mcp setup`, and Settings → AI. Checked by tests and one real run of the server over standard input and output; **not yet tried
from any AI program, and the panel not yet tested on screen.** **Slice 2 (A2's first button) built** in Companion 0.71.0 (the
owner, 23 Nov 2026: "go ahead with A2"): Settings → AI services, **Explain this fault** on Logs, keys in the system's key store,
and the AI services kind of going online. Checked by tests and a real listing of the models of the owner's running Ollama;
**no real question has been sent yet, and nothing tested on screen.** **Slice 3's buttons built** in Companion 0.72.0 (the owner,
23 Nov 2026: "You can proceed with the others"): **Summarise this version** on Changes and **What does this mean for my
mods?** under the Mods page's update check, through one shared card. **Slice 3b built** in Companion 0.73.0 with phobos-modkit
1.110.0: the model may ask the kit's read-only reports. **Slice 4 (A3's first slice) built** in Companion 0.74.0: the Chat page,
its switch off until turned on; **no real agent started yet** (none is on the owner's computer), and nothing tested on screen.
**Slice 5 built** in Companion 0.75.0 (the owner, 23 Nov 2026: "go ahead with slice 5"): an agent may change a file through the
Companion, shown line by line, only on the person's yes; commands through it stay refused, pending the decision `chat-commands`.
Every slice of the build order is now built; none is tested on screen or with a real model or agent. The owner asked for "AI integration
directly into Companion", through an open framework that reaches "a multitude of services, preferably with some of the bigger
ones at least", chose all three parts below by card the same day, and then took the agent's lean on all four open questions
("go with your leans on all four and start building"). Agent choices are labelled so the owner can revise them.

**The whole design in four lines:**

- **A1, tools for AI programs**: the kit's read-only reports offered over **MCP**, so any AI program that speaks it can ask them.
- **A2, help on pages**: a button such as **Explain this fault** sends what the page already shows to a model the person chose.
- **A3, a chat page**: a whole agent (Claude, Gemini CLI, Codex and others) runs in a page, over **ACP**.
- **The Companion works exactly as now with none of it switched on.** AI is a convenience, never something a page needs.

## Read this first (gotchas)

- **MCP changed shape in 2026.** Its current revision, **2026-07-28**, removed the `initialize` handshake: each request now
  carries the protocol version in `_meta`, and a server must answer `server/discover`. Programs in use still speak the older
  revisions, so a server answers both (below). The official Python package `mcp` is on a rewritten 2.x line for the same reason.
- **The kit's Python is standard library only** (its own rule), and the installer ships Python with no extra packages. So A1's
  server is a small one of our own (the owner's choice, by the agent's lean), not the official package.
- **Never pass `--no-redact` for a model.** Every report has it. A1 and A2 take a report's answer only as redacted, so the home
  folder reads `~` in anything a model sees. The one exception is `mcp setup`'s lines, shown only to the person, since they must
  name real folders.
- **A Claude, ChatGPT or Gemini subscription does not pay for calls a program of ours makes** (agent's knowledge, not checked on
  23 Nov 2026). A2 needs a key charged per use, or a model on the person's own computer, which costs nothing. A3 is different:
  the agent is its own program with its own login, so it uses whatever that login includes.
- **An agent in A3 is not bounded by the Companion's gates.** It is another program, started with the person's own access to
  the disk. The Companion answers only the questions the agent chooses to ask. The page says so in words before a first start.
- **Text from a log or another author's code can be aimed at a model** ("ignore your instructions and ..."). In A2 the model's
  only tools (since 0.73.0) are the kit's three read-only ones, so such text can make an answer wrong, or make the model ask for
  another report that only reads, but can never make anything change. For an online model, every report it asks for is shown
  to the person, whole, before anything of it is sent.
- **A model's answer is text to show, never anything to act on.** It reaches the page escaped, as file text does; no address in
  it is opened, and nothing in it is run.
- **Two of this repository's rules change with A2**, on the owner's word (below): "the program never holds credentials" and
  "nothing is ever sent about the person". `AGENTS.md` changes in the commit that builds A2, not before.
- **Every operating system from the start** (the owner, 23 Nov 2026: "I wish to make Companion work across multiple operating
  systems"). None of A1 to A3 may use a Windows-only piece; where the rest of the program still does, this record says so.

## The owner's answers (23 Nov 2026, by card)

| Question | The owner's answer |
| --- | --- |
| Which do you want to have? | **All three**: buttons on pages, a chat page, tools for other AI programs |
| May the Companion keep keys for AI services? | "I wish to make Companion work across multiple operating systems and am willing to bend this rule now; it was an old one just to maintain security while we were growing, to not stray off course accidentally. How does all this shape our choices now?" |
| What may be sent to an online model? | "Read before." |
| The four questions that followed (Decisions page) | **The agent's lean on all four** (the owner, 23 Nov 2026), and of the chat page's switch starting off: "a very good choice" |

**The four, as answered:**

| Id | Answer |
| --- | --- |
| `ai-credentials-rule` | **Keys for AI services only**: kept in the operating system's own key store (or read from an environment variable), never in a file of ours. Steam passwords stay never held |
| `ai-what-is-sent` | **Shown first, then the person's press**, under an AI services switch that starts off |
| `ai-mcp-server` | **A small server of our own**, standard library only: built (A1) |
| `ai-chat-changes` | **Reads only at first**, then a yes on each change through the Companion |

## What the three share

| # | Shared part | Where | Used by |
| --- | --- | --- | --- |
| H1 | **One list of what a model may be given**: the kit's reports whose manifest effect is `reads`, as the report viewer already offers them (`runnable`, `src-tauri/src/reports.rs`). Never `writes`, `runs`, `owner-press` or `owner-only` | phobos-modkit's manifest | A1, A3; A2 from its third slice |
| H2 | **Redaction is the kit's**: every report goes through `phobos_modkit.report`, which redacts everywhere. A model only ever sees a report's answer, never a raw file read by the host | phobos-modkit | A1, A2 |
| H3 | **One switch for each part**, off until the person turns it on (the risk rule in `rules/designs.md`, graded below), in Settings | companion-core | A1, A2, A3 |
| H4 | **One new kind of going online**, `ai-services`, in `companion_core::online::KINDS`: off means no call to an online model, on a press or otherwise. A model at a loopback address (`localhost`, `127.0.0.1`, `::1`) is not going online and needs no such switch | companion-core `online.rs` | A2 |
| H5 | **Services and agents are data, never code**: a small checked file names each one (below), so a new service is a row | `config/ai-services.json`, `config/chat-agents.json` | A2, A3 |
| H6 | **Words in `locales/en-AU.json`, entries in the Guide**, as for every page: a Guide entry for each part, and a How do I…? answer for "use my own AI program with the Companion" | phobos-companion | A1, A2, A3 |

## The four questions, and the risk (`rules/designs.md`)

| | A1, tools for AI programs | A2, help on pages | A3, a chat page |
| --- | --- | --- | --- |
| **Lets the person** | Ask their own AI program about their mods, logs and saves in plain words | Get a fault, a change or a report explained where they already are | Work with a whole agent beside the pages it is talking about |
| **Stops them** | Nothing. The program can only read: it cannot install, publish or change a list | Sending text they have not seen, or to a service they did not choose | Starting an agent the person did not choose and name |
| **Changes how they work** | A question in words in place of finding the right report | Read the explanation first, then the detail | One window in place of a terminal beside the Companion |
| **What outside notices** | The AI program. The kit's history log records each report run, so the Timeline page shows it | The service chosen (it receives the text). A count of what was sent is kept for the person | The agent, and through it the repository it works in; git shows what it changed |
| **Risk (agent's grade)** | **Low**: reads only, redacted, nothing leaves except to a program the person set up | **Moderate**: text leaves the computer, and a key costs money per use; both are seen before each press | **High**: an agent can change or delete files in a repository at once |
| **Its switch starts** | Off (nothing to switch on until a program is set up) | **Off** | **Off** |

## A1: tools for AI programs (MCP)

**What it is.** A kit command, `python -m phobos_modkit mcp serve`, that an AI program starts itself and talks to over standard
input and output. It is game-free: what it offers comes from the manifest, so every game with an adapter is reached.

| Part | Design | Whose choice |
| --- | --- | --- |
| Where it lives | phobos-modkit, core. The Companion need not be running | Agent |
| Transport | stdio only: one JSON-RPC message a line, as the specification says. No HTTP server, so nothing listens on a port | Agent |
| Revisions answered | **2026-07-28** (`server/discover`, the version in each request's `_meta`, error −32022 for an unknown version) **and the older handshake** (`initialize`), which the specification allows a server to serve side by side | Agent |
| What it offers | **Three tools, not 118.** `find_reports` (search the reports by words and game), `describe_report` (its question, options and limits) and `ask_report` (run it). Measured 23 Nov 2026: the manifest holds 198 reports, 118 of them `reads`, 61 with a question. One tool each would fill a model's context | Agent |
| What `ask_report` may run | Only a report whose effect is `reads`, checked from the manifest at each call. `reads-online` only when the person started the server with `--online`. Nothing else, ever | Agent |
| What it returns | The report's Markdown summary as `content` and its JSON envelope as `structuredContent`, always redacted | Agent |
| Which repositories | Those on the games list, by name. A path a model types is refused | Agent |
| The Companion's part | **Settings → AI programs**: the exact lines to paste into each program's own settings, with **Copy**. The Companion writes nothing into another program's files | Agent |

**Not verified:** which revision each AI program speaks today, and so how much use the older handshake gets. Check the
specification's stdio and versioning pages again before building; the facts above were read on 23 Nov 2026.

**As built (0.70.0, kit 1.109.0), where it differs from the table above** (agent choices):

- **The server's name is `dthorga-reports`, shown as "D'thorga Reports"**: the brand's form, the word saying what it offers.
- **An answer is the report's Markdown summary**; `form: "json"` asks for the whole envelope instead. Giving both every time
  doubled the run, and an envelope can be large (a globe's tiles).
- **Without a repository, a report runs in an empty temporary folder**, so a report's "current folder" default never reads
  wherever the AI program happened to start.
- **A value holding a slash is refused even when it is not a path** (a SQL query that divides): the simple check is the safe
  one. A report is stopped after 300 seconds; an answer is cut at 60,000 characters, saying so.
- **The panel offers no `--online` choice yet.** The server can take it, but going online from a program the Companion did not
  start would sit outside Settings → Going online's switches; that waits until someone needs it.
- **The kit reads the games list in one place now** (`games_list.py`), shared with the daily safe copies.

## A2: help on pages (the Companion calls a model itself)

**What it is.** A button on a page sends the kit's answer the page already shows, with one fixed instruction, to the model the
person chose, and shows the answer beneath as it arrives.

| Part | Design | Whose choice |
| --- | --- | --- |
| Where it lives | The host: a new `companion_core::ai`. The window never calls a service and never sees a key | The repository's rule |
| The library | **genai** (Rust; 0.7.1 seen on 23 Nov 2026): one interface to Anthropic, OpenAI, Gemini, Ollama and any address that speaks OpenAI's format (LM Studio and others). Built with rustls, so Linux needs no OpenSSL. `rig` is the larger alternative: a whole agent framework, more than A2 needs | Agent (`ai-library`) |
| Services | `config/ai-services.json`: for each, a name, its kind, its address and the environment variable that may hold its key. **Local models are listed first** | Agent |
| Models | **The person picks, from the service's own list of models where it has one.** No model name is written into code | Agent |
| Keys | The operating system's own key store through `keyring-core` (1.0.0) and one store for each system: Windows Credential Manager, macOS Keychain, Secret Service or the kernel's keyutils on Linux. **An environment variable is read first**, so a Linux desktop with no key service still works. A key is typed once, never shown again, never written to a file of ours, and **Forget this key** removes it | Owner (keys allowed); agent (how) |
| What is sent | Only a kit answer this run showed the person (H2), plus the instruction. **Shown in full first, with the service named, then sent on the person's press** | Owner, as the agent read it |
| The instruction | A small file for each button in `prompts/`, as Guide entries are files: data, checked by the host, never built from page text | Agent |
| Tools for the model | **None in the first two slices** (the gotcha above). Later, the same three tools as A1, in the host | Agent |
| Cost in view | Each answer shows the tokens the service counted. A month's total is kept in the program's own folder. Answer length is a preset button (short, medium, long) | Agent |
| When it fails | The house rule: what happened, what stayed safe, what to do. A refused or cut-off answer says so in words | The repository's rule |

**The first buttons (agent's proposal, `ai-first-buttons`):** **Explain this fault** on Logs, then **Summarise what changed**
on Changes and **What does this update mean for my mods?** on What did an update change.

**As built (0.72.0), where it differs** (agent choices): **Summarise this version** sits on each version of the Changes page,
since a version is what a changelog groups and a person reads, rather than one button for the whole changelog. **What does this
mean for my mods?** sits under a finished update check on the Mods page (Since you last played), not on What did an update
change, because the check is what says what the updates mean for our code; it is offered only after a check this run made, and
sends that check's report as plain text (`ai_help::report_text`: its title, facts, lines, bullets, tables cut at 30 rows, code,
and charts by their description). All three buttons share one card (`src/lib/ai/AskAi.svelte`) and one way to prepare
(`ai_help::keep`); each has its own instruction file.

**The kit's tools for the model, as built (0.73.0, phobos-modkit 1.110.0; the owner, 23 Nov 2026: "go ahead with the kit's tools
for the model")** (agent choices, to revise):

- **The same three tools and the same checks as A1**, through two new kit commands: `mcp tools` lists them, and `mcp call` answers
  one call, one process each, so no server runs. The Companion only hands the call over and reads the answer (`ai_tools.rs`).
- **A model on this computer**: each report runs and is sent at once, and the card lists it. **An online model**: each report runs
  on this computer first, then waits, shown whole, for **Send this report** or **Don't send**, which tells the model it was
  declined. This keeps "shown first, then my press" for every word that leaves the computer.
- **At most six reports a question**; after that the model is told to answer with what it has.
- **On by default**, with **Let the AI ask the tool kit's reports** (On or Off) in Settings → AI services. Risk graded low: the
  reports only read, and nothing goes online without a yes.
- **A model that cannot take tools** (the service refuses the request with a 400 naming tools) is asked again once without them,
  and the card says so.
- **Claude's own message goes back unchanged**, its thinking blocks included, as Claude's API requires between tool calls.
- **Not verified**: whether each local model handles tools well. Not tried with a real model yet.

**The two rules, as they read since A2 was built** (AGENTS.md, 0.71.0, on the owner's answers; the wording is the agent's, for
the owner to revise):

- "The program holds no credentials but keys for AI services the person adds: kept in the operating system's own key store,
  never in a file, never shown again and never sent to the window. Steam passwords and every other credential stay never held."
- "Nothing is ever sent about the person by itself: calls only read public pages, keyless, except AI services, which sends only
  text the person was shown and chose to send, with their key, on their press; it starts off."

**As built (0.71.0), where it differs from the table above** (agent choices):

- **No AI library: `ureq` and two request shapes of our own** (`companion_core::ai_client`), not `genai`. Two shapes cover
  every service: Claude's own Messages API (Rust has no official Anthropic library, and Anthropic documents its API as plain
  HTTPS), and the chat completions API OpenAI, Gemini, Ollama and LM Studio all offer. Far less is carried in, and what is sent
  is in plain view in one file.
- **Claude's requests use API version `2026-10-21`**: no `temperature` or other sampling field, no `thinking` field (each model
  then thinks as it does by default), and `max_tokens` from the answer length (4,000, 8,000 or 16,000, thinking included). A
  `refusal` stop is said in words. **Claude's server-side fallbacks are not asked for**: they need a beta header and a model that
  allows them, and the person picks the model; a later slice can add them for the models that do.
- **The chat completions request sets no length**, since OpenAI's newer models refuse `max_tokens`: the instruction asks for the
  length instead. Token counts are asked for only where the services file says the service gives them in a stream (OpenAI's);
  elsewhere an answer may say the service did not count them.
- **Five services, two of them on this computer**: Ollama and LM Studio at their usual addresses, then Claude, OpenAI and Gemini.
  **No typed address yet**, for a local server on another port or another service: a later slice, with its own checks.
- **The question is built by the host, by the fault's id**, from the Logs page's last reading (`logs_page::remember`); the window
  sends no words of its own. At most 12,000 characters, cut with a note.
- **No Stop button yet** while an answer streams: a long one can only be waited out (10 minutes at most, then it fails in words).
- **Linux and macOS key stores are chosen and written but not yet built or tried**: the Companion is built on Windows only today
  (`docs/release-audit.md`, C2).
- **A question to a model on the owner's computer loads their graphics card**, so no agent sends one without the owner's word;
  only the model list (which loads nothing) was read for real.

## A3: a chat page (ACP)

**As built (0.74.0; the owner, 23 Nov 2026: "go ahead with A3")**, where it differs from the table below (agent choices, to
revise):

- **No ACP library: a small client of our own** (`companion_core::acp`), not the `agent-client-protocol` crate. The protocol is
  one JSON-RPC message a line, and the page needs seven kinds of message; the crate is asynchronous and far larger. Tested
  against a stand-in agent on in-memory pipes (handshake, a streamed turn, reads in and out of the repository, a refused write
  and command, permissions answered only with an offered option, stopping, the agent ending).
- **The agents** (`config/chat-agents.json`): Claude (`claude-agent-acp`), Codex (`codex-acp`), Gemini CLI (`gemini --acp`),
  GitHub Copilot (`copilot --acp`) and Goose (`goose acp`), each its command as its own pages gave it on 23 Nov 2026. **Never
  `npx -y`**, which would install a package by itself. On Windows an npm command is found as its `.cmd` file.
- **The kit's reports are handed over from the first slice**: the agent's conversation starts with the kit's MCP server (from
  `mcp setup`), so it can ask the reports that read. Changes through the Companion stay refused (slice 5).
- **The page shows** the agent's answer, its thinking folded away, each step with its status, its plan, each file read through
  the Companion, each refused change or command, and permission cards with the agent's own choices and **Neither**.
- **Process trees on Linux and macOS**: the agent starts as the leader of a process group of its own, and ending it ends the
  group (`process::own_group`, `end_tree`). Written, **not yet built or tried** there.
- **None of the agents is on the owner's computer** on 23 Nov 2026, so no real agent has been started.

**What it is.** A page where the person talks to an agent they already have installed. The Companion is an ACP *client*: it
starts the agent as a process, in a repository from the games list, and shows what it says and asks.

| Part | Design | Whose choice |
| --- | --- | --- |
| The protocol | The Agent Client Protocol: JSON-RPC 2.0, the agent run as a subprocess of the client. Version 1 is stable; version 2 is in preview. Started by Zed in August 2025 with Gemini CLI | Read 23 Nov 2026 |
| The library | The Rust crate `agent-client-protocol` (5.5.1, published 21 Nov 2026), which has a client side. The protocol runs both ways (the agent asks the client too), so the host's one-question-a-line `serve.rs` does not fit as it is | Agent (`ai-chat-library`) |
| Agents | `config/chat-agents.json`: a name, the command that starts it and where to get it. Seen listed on 23 Nov 2026: Claude Agent (through Zed's adapter, `claude-agent-acp`), Gemini CLI, Codex CLI (through `codex-acp`), GitHub Copilot (preview), Goose, OpenCode | Agent |
| Installing an agent | **Never by the Companion.** The page says where to get it; the person installs it and logs in with the agent's own program | Agent |
| Keys | **None of ours.** Each agent keeps its own login | The protocol |
| What the agent asks the Companion | Its permission questions (`session/request_permission`) appear as the house confirm card. File reads through the Companion are kept inside the chosen repository. **File writes and terminals through the Companion are refused in the first slice** | Agent (`ai-chat-changes`) |
| The honest limit | The agent's own tools are not the Companion's: it may still change files by itself, as it would in a terminal (the gotcha above). The page says this before a first start, and git shows what changed | Fact |
| The Companion's tools | From the second slice, the agent is handed A1's server when a session starts, so it can ask the kit's reports | Agent |
| Ending | Leaving the page or closing the program ends the agent's whole process tree | Agent |

**Not verified:** which logins the Claude adapter accepts, and whether Goose and OpenCode run with a local model through ACP.

## Every operating system

| Part | Windows | Linux | macOS | Note |
| --- | --- | --- | --- | --- |
| A1's server | Yes | Yes | Yes | Standard-library Python over stdio |
| A2's calls | Yes | Yes | Yes | rustls, no system TLS library |
| A2's key store | Credential Manager (built and tested) | Secret Service through a pure-Rust store, else the environment variable (not yet built) | Keychain (not yet built) | The page says which is in use |
| A3's agents | Yes | Yes | Yes | Each agent's own support decides |
| Ending a process tree | `taskkill /T` | **To build** | **To build** | `process::end_tree` is Windows-only today (`docs/release-audit.md`, C2) |

**What a next game would need: nothing.** A game reaches all three through the manifest and its adapter, as it reaches the
report viewer.

## Design for a stranger

- **Hidden until set up.** A page shows no AI button until a service is added and the switch is on; the chat page is not in
  the page list until an agent is chosen.
- **Nothing personal is built in**: no service, model, key or agent of the owner's in code, words or tests.
- **Tests never call a service.** The host's tests stand in a service that answers from a file; browser tests stand in a host.
  A1's tests speak scripted lines to the server. **A real call, which costs money, is only ever the person's press.**
- **This adds to what stands between the Companion and another person**: a key or a local model for A2, an installed agent for
  A3. Each is optional, and `docs/release-audit.md` gains a line when the first is built.

## Build order

Each slice is a working thing by itself, with its own version and commit.

| Slice | What | Where | Rules it changes |
| --- | --- | --- | --- |
| 1 | **A1**: `mcp serve`, its three tools, both handshakes; Settings → AI programs | phobos-modkit, then phobos-companion | None |
| 2 | **A2, first button**: `companion_core::ai`, services, the key store, the `ai-services` kind, Settings → AI services, **Explain this fault** on Logs, a local model and one online service | phobos-companion | Credentials; what is sent; a new online kind |
| 3 | **A2, the other buttons** (built, 0.72.0) | phobos-companion | None |
| 3b | **The kit's tools for the model** (built, 0.73.0 with phobos-modkit 1.110.0): the model may ask A1's read-only reports while it answers, with each call shown | phobos-modkit, then phobos-companion | None |
| 4 | **A3, first slice** (built, 0.74.0): one agent, the chat page, permission cards, reads only through the Companion | phobos-companion | A new page; process tree ending on every system |
| 5 | **A3 with the kit's tools**, and changes through the Companion with a yes on each (built, 0.75.0; the kit's tools came in 0.74.0) | phobos-companion | None |

**Slice 5 as built (0.75.0)** (agent choices, to revise): the Companion now offers `fs.writeTextFile`. Each `fs/write_text_file`
is checked first (an absolute path inside the repository, its nearest existing folder followed through links, never inside
`.git` in any letter case, not a folder, at most 2 MB each way), then shown on a card as a line-by-line difference against what
is there (a new file all added; kept lines more than two away from a change folded), with **+** and **−** marks so colour never
carries it alone. **Make this change** writes it, making missing folders, after checking the target again; **Don't** answers the
agent with "the person chose not to make this change"; **Stop** declines every change still waiting. Running commands through
the Companion (`terminal/*`) stays refused: that is the owner's decision `chat-commands`, with the agent's lean to keep it so.

## Open, for the owner to revise

The four questions are answered (above). Smaller agent choices, revisable here: `ureq` and our own two request shapes over
genai or rig (`ai-library`, changed while building A2); the ACP crate over a reader of our own
(`ai-chat-library`); the first buttons (`ai-first-buttons`); three MCP tools in place of one for each report; every switch
starting off; local models listed first; a month's token total kept.

**A later use, not part of this design:** the same key store could hold a GitHub token, which would lift Going online's 60
calls an hour to 5,000 (`docs/online.md`). The kit's own rule ("never logs in or holds a token") would need the owner's word.

## Sources

Read on 23 Nov 2026. Versions are what the pages showed that day; pin from crates.io when building.

- Model Context Protocol, revision 2026-07-28: [specification](https://modelcontextprotocol.io/specification/2026-07-28)
  (stdio transport, Versioning and Compatibility, changelog, server tools). The official Python package:
  [mcp on PyPI](https://pypi.org/pypi/mcp).
- Agent Client Protocol: [agents](https://agentclientprotocol.com/get-started/agents.md),
  [clients](https://agentclientprotocol.com/get-started/clients.md),
  [protocol overview](https://agentclientprotocol.com/protocol/overview.md), the
  [Rust crate](https://docs.rs/crate/agent-client-protocol/latest), and Zed's [ACP page](https://zed.dev/acp).
- Model libraries: [genai 0.7.1](https://docs.rs/crate/genai/0.7.1), [rig-core](https://docs.rs/crate/rig-core/latest).
- Key stores: [keyring-core 1.0.0](https://docs.rs/crate/keyring-core/1.0.0/source/README.md),
  [keyring 4.0.1](https://docs.rs/crate/keyring/4.0.1) (which says new programs should depend on keyring-core).
