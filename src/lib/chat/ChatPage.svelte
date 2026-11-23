<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import type { GameHome } from "../home/types";
  import { t } from "../i18n/runtime";
  import { go, here, setFocus } from "../navigation/navigation.svelte";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import { started as fresh } from "../shell/progress";
  import {
    chatCancel,
    chatEnd,
    chatPermission,
    chatPrompt,
    chatStart,
    chatWrite,
  } from "./desktopClient";
  import {
    answered,
    answeredWrite,
    apply,
    lineDiff,
    refusedWrite,
    waitingPermissions,
    type Entry,
  } from "./presentation";
  import { chat, loadChat } from "./state.svelte";
  import type { ChatOption, ChatStarted } from "./types";

  /**
   * The Chat page (0.74.0; `docs/ai.md`, A3; the owner, 23 Nov 2026: "go ahead with A3"): a whole agent, chosen in Settings → AI,
   * working in one of the game's repositories. Before a first start the page says plainly what an agent can do by itself; through
   * the Companion it may only read files in the repository and ask the person's permission. Leaving the page ends it.
   */
  let { game }: { game: GameHome } = $props();

  type Run =
    | { state: "idle" }
    | { state: "starting" }
    | { state: "running"; started: ChatStarted; busy: boolean }
    | { state: "failed"; reason: string };

  let run = $state<Run>({ state: "idle" });
  let entries = $state<Entry[]>([]);
  let message = $state("");
  let said = $state<string | null>(null);

  const agent = $derived(
    chat.status?.agents.find((a) => a.id === chat.status?.chosen) ?? null,
  );
  const repository = $derived(
    game.repositories.includes(here().focus.repository ?? "")
      ? (here().focus.repository as string)
      : (game.repositories[0] ?? null),
  );

  async function start() {
    if (!repository) return;
    run = { state: "starting" };
    entries = [];
    said = null;
    const answer = await chatStart(game.id, repository, (event) => {
      entries = apply(entries, event);
      if (event.kind === "ended" && run.state === "running")
        run = { ...run, busy: false };
    });
    run =
      answer.state === "ready"
        ? { state: "running", started: answer.started, busy: false }
        : { state: "failed", reason: answer.failure.detail };
    void loadChat();
  }

  async function send() {
    const text = message.trim();
    if (run.state !== "running" || run.busy || !text) return;
    message = "";
    entries = [...entries, { kind: "you", text }];
    run = { ...run, busy: true };
    const answer = await chatPrompt(text);
    if (run.state !== "running") return;
    run = { ...run, busy: false };
    if (answer.state !== "ready")
      said = t("chat-failed", { reason: answer.failure.detail });
    else if (answer.stop !== "end_turn")
      entries = [...entries, { kind: "stopped", reason: answer.stop }];
  }

  async function choose(request: string, option: ChatOption | null) {
    const answer = await chatPermission(request, option?.id ?? null);
    if (answer.state === "ready")
      entries = answered(entries, request, option?.name ?? "");
    else said = t("chat-failed", { reason: answer.failure.detail });
  }

  /** The person's answer to a change the agent asked to make through the Companion (0.75.0). */
  async function decideWrite(request: string, allow: boolean) {
    const answer = await chatWrite(request, allow);
    if (answer.state === "ready")
      entries = answeredWrite(entries, request, allow);
    else said = t("chat-failed", { reason: answer.failure.detail });
  }

  async function stop() {
    await chatCancel();
    entries = entries.map((e) =>
      e.kind === "permission" && e.answered === null
        ? { ...e, answered: "" }
        : e.kind === "write" && e.answered === null
          ? { ...e, answered: false }
          : e,
    );
  }

  async function end() {
    await chatEnd();
    run = { state: "idle" };
    void loadChat();
  }

  function keys(event: KeyboardEvent) {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      void send();
    }
  }

  function stopWords(reason: string): string {
    if (reason === "cancelled") return t("chat-stop-cancelled");
    if (reason === "refusal") return t("chat-stop-refusal");
    if (reason === "max_tokens" || reason === "max_turn_requests")
      return t("chat-stop-limit");
    return t("chat-stop-other", { reason });
  }

  onMount(() => void loadChat());
  // Leaving the page ends the agent with every process it started.
  onDestroy(() => void chatEnd());
</script>

<div class="eyebrow accent">{t("chat-kicker")}</div>
<h1>{agent ? t("chat-title", { agent: agent.name }) : t("chat-title-none")}</h1>

{#if !chat.status}
  <p class="muted">{t("chat-reading")}</p>
{:else if !chat.status.on || !agent}
  <p class="lead">{t("chat-off")}</p>
  <button
    type="button"
    class="action"
    onclick={() =>
      go({
        page: "settings",
        game: game.id,
        focus: { panel: "chat" },
        dialog: null,
      })}>{t("chat-open-settings")}</button
  >
{:else if game.repositories.length === 0}
  <p class="lead">{t("chat-no-repositories", { game: game.name })}</p>
{:else if run.state === "idle" || run.state === "failed"}
  <div class="toggles" role="group" aria-label={t("chat-repository-label")}>
    {#each game.repositories as name (name)}
      <button
        type="button"
        class="toggle"
        aria-pressed={repository === name}
        onclick={() => setFocus({ repository: name })}>{name}</button
      >
    {/each}
  </div>
  <section class="warning" aria-labelledby="chat-warning-title">
    <h2 id="chat-warning-title">{t("chat-warning-title")}</h2>
    <p>
      {t("chat-warning-own", {
        agent: agent.name,
        repository: repository ?? "",
      })}
    </p>
    <p>{t("chat-warning-through")}</p>
    <p>{t("chat-warning-git")}</p>
  </section>
  {#if !agent.found}
    <p class="refused-line">{t("chat-not-found", { agent: agent.name })}</p>
    <p class="small">{agent.get}</p>
  {/if}
  <button
    type="button"
    class="action"
    disabled={!agent.found || !repository}
    onclick={() => void start()}
    >{t("chat-start", { agent: agent.name })}</button
  >
  {#if run.state === "failed"}
    <p class="told refused" role="status">
      {t("chat-start-failed", { reason: run.reason })}
    </p>
  {/if}
{:else if run.state === "starting"}
  <ProgressBar
    progress={fresh()}
    fallback={t("chat-starting", { agent: agent.name })}
  />
{:else}
  {@const running = run}
  <p class="small muted">
    {t("chat-running", {
      agent: running.started.agent,
      repository: running.started.repository,
    })}
    {running.started.kitReports
      ? t("chat-kit-reports")
      : t("chat-no-kit-reports")}
  </p>

  <ol class="talk" aria-label={t("chat-conversation-label")}>
    {#each entries as entry, index (index)}
      <li class="entry {entry.kind}">
        {#if entry.kind === "you"}
          <span class="who">{t("chat-you")}</span>
          <div class="text">{entry.text}</div>
        {:else if entry.kind === "agent"}
          <span class="who">{running.started.agent}</span>
          <div class="text">{entry.text}</div>
        {:else if entry.kind === "thought"}
          <details>
            <summary>{t("chat-thinking")}</summary>
            <div class="text small">{entry.text}</div>
          </details>
        {:else if entry.kind === "tool"}
          <p class="small">
            <span class="mark" aria-hidden="true">◆</span>
            {t("chat-step", {
              title: entry.title,
              status: entry.status ?? "pending",
            })}
          </p>
        {:else if entry.kind === "plan"}
          <p class="small">{t("chat-plan")}</p>
          <ul class="small">
            {#each entry.entries as step, i (i)}
              <li>{t("chat-plan-step", step)}</li>
            {/each}
          </ul>
        {:else if entry.kind === "permission"}
          <section class="ask" aria-labelledby={`chat-ask-${entry.request}`}>
            <h3 id={`chat-ask-${entry.request}`}>
              {t("chat-asks", {
                agent: running.started.agent,
                title: entry.title,
              })}
            </h3>
            {#if entry.answered === null}
              <div class="buttons">
                {#each entry.options as option (option.id)}
                  <button
                    type="button"
                    class="action"
                    onclick={() => void choose(entry.request, option)}
                    >{option.name}</button
                  >
                {/each}
                <button
                  type="button"
                  class="action"
                  onclick={() => void choose(entry.request, null)}
                  >{t("chat-answer-none")}</button
                >
              </div>
            {:else}
              <p class="small">
                {entry.answered
                  ? t("chat-answered", { option: entry.answered })
                  : t("chat-answered-none")}
              </p>
            {/if}
          </section>
        {:else if entry.kind === "write"}
          <section class="ask" aria-labelledby={`chat-write-${entry.request}`}>
            <h3 id={`chat-write-${entry.request}`}>
              {entry.before === null
                ? t("chat-write-create", {
                    agent: running.started.agent,
                    path: entry.path,
                  })
                : t("chat-write-change", {
                    agent: running.started.agent,
                    path: entry.path,
                  })}
            </h3>
            <p class="small">{t("chat-write-key")}</p>
            <ol class="diff" aria-label={t("chat-write-diff-label")}>
              {#each lineDiff(entry.before, entry.after) as line, i (i)}
                {#if line.mark === "…"}
                  <li class="kept small muted">
                    {t("chat-write-unchanged", { count: line.count })}
                  </li>
                {:else}
                  <li
                    class={line.mark === "+"
                      ? "added"
                      : line.mark === "-"
                        ? "removed"
                        : "kept"}
                  >
                    <span class="mark" aria-hidden="true"
                      >{line.mark === "-" ? "−" : line.mark}</span
                    ><span class="sr-only"
                      >{line.mark === "+"
                        ? t("chat-write-added")
                        : line.mark === "-"
                          ? t("chat-write-removed")
                          : ""}</span
                    >{line.text}
                  </li>
                {/if}
              {/each}
            </ol>
            {#if entry.answered === null}
              <div class="buttons">
                <button
                  type="button"
                  class="action"
                  onclick={() => void decideWrite(entry.request, true)}
                  >{t("chat-write-yes")}</button
                >
                <button
                  type="button"
                  class="action"
                  onclick={() => void decideWrite(entry.request, false)}
                  >{t("chat-write-no")}</button
                >
              </div>
            {/if}
          </section>
        {:else if entry.kind === "written"}
          <p class={entry.written ? "small" : "small refused-line"}>
            {entry.written
              ? t("chat-written", { path: entry.path })
              : entry.reason
                ? t("chat-not-written-refused", {
                    path: entry.path,
                    reason: entry.reason,
                  })
                : t("chat-not-written", { path: entry.path })}
          </p>
        {:else if entry.kind === "read"}
          <p class="small muted">
            {entry.allowed
              ? t("chat-read", { path: entry.path })
              : t("chat-read-refused", {
                  path: entry.path,
                  reason: entry.reason ?? "",
                })}
          </p>
        {:else if entry.kind === "refused"}
          <p class="small refused-line">
            {refusedWrite(entry.what)
              ? t("chat-refused-write")
              : t("chat-refused-command")}
          </p>
        {:else if entry.kind === "stopped"}
          <p class="small muted">{stopWords(entry.reason)}</p>
        {:else}
          <p class="refused-line">{t("chat-ended")}</p>
        {/if}
      </li>
    {/each}
  </ol>

  {#if running.busy}
    <ProgressBar
      progress={fresh()}
      fallback={waitingPermissions(entries) > 0
        ? t("chat-waiting-on-you")
        : t("chat-working", { agent: running.started.agent })}
    />
  {/if}

  <div class="compose">
    <label for="chat-message"
      >{t("chat-message-label", { agent: running.started.agent })}</label
    >
    <textarea
      id="chat-message"
      rows="3"
      bind:value={message}
      onkeydown={keys}
      disabled={running.busy}></textarea>
    <div class="buttons">
      <button
        type="button"
        class="action"
        disabled={running.busy || message.trim() === ""}
        onclick={() => void send()}>{t("chat-send")}</button
      >
      {#if running.busy}
        <button type="button" class="action" onclick={() => void stop()}
          >{t("chat-stop")}</button
        >
      {/if}
      <button type="button" class="action" onclick={() => void end()}
        >{t("chat-end")}</button
      >
    </div>
  </div>
  <div aria-live="polite">
    {#if said}
      <p class="told refused" role="status">{said}</p>
    {/if}
  </div>
{/if}

<style>
  .warning,
  .ask {
    margin: 12px 0;
    padding: 12px 16px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-inline-start: 3px solid var(--colour-risk);
    border-radius: 4px;
  }

  h2,
  h3 {
    margin: 0 0 6px;
    font-size: 1rem;
    font-weight: 600;
  }

  .talk {
    margin: 12px 0;
    padding: 0;
    list-style: none;
  }

  .entry {
    margin: 0 0 10px;
  }

  .who {
    display: block;
    font-weight: 600;
  }

  .text {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  details summary {
    min-height: 44px;
    display: flex;
    align-items: center;
    cursor: pointer;
  }

  .compose label {
    display: block;
    margin-bottom: 4px;
  }

  .compose textarea {
    width: 100%;
    box-sizing: border-box;
  }

  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 6px;
  }

  /* Every line wraps rather than scrolls; each carries its mark, so colour never says alone what changed. */
  .diff {
    margin: 6px 0;
    padding: 6px 8px;
    list-style: none;
    font-size: var(--type-small);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    background: var(--colour-canvas);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .diff .mark {
    display: inline-block;
    width: 1.5ch;
  }

  .diff .added {
    border-inline-start: 3px solid var(--colour-success);
  }

  .diff .removed {
    border-inline-start: 3px solid var(--colour-risk);
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .refused-line {
    padding-inline-start: 8px;
    border-inline-start: 3px solid var(--colour-risk);
    overflow-wrap: anywhere;
  }

  .told {
    margin-top: 8px;
    padding: 6px 10px;
    border: 1px solid var(--colour-success);
    border-radius: 4px;
    overflow-wrap: anywhere;
  }

  .told.refused {
    border-color: var(--colour-risk);
  }
</style>
