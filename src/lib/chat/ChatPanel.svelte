<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import type { Failure } from "../shell/types";
  import { chatChoose, chatSwitch, readChatStatus } from "./desktopClient";
  import { chat, useChat } from "./state.svelte";
  import type { ChatStatus } from "./types";

  /**
   * Settings → AI, Chat with an agent (0.74.0; `docs/ai.md`, A3): the Chat page's switch, which starts off, and the agent it starts.
   * Each agent is its own program the person installs; the panel says whether it is on this computer and where to get it.
   */
  let unread = $state<Failure | null>(null);
  let browser = $state(false);
  let busy = $state(false);
  let said = $state<{ ok: boolean; words: string } | null>(null);

  async function load() {
    unread = null;
    const answer = await readChatStatus();
    if (answer.state === "ready") useChat(answer.status);
    else if (answer.state === "failed") unread = answer.failure;
    else browser = true;
  }

  async function change(
    work: () => Promise<
      | { state: "ready"; status: ChatStatus }
      | { state: "failed"; failure: Failure }
    >,
    told: string,
  ) {
    busy = true;
    said = null;
    const answer = await work();
    busy = false;
    if (answer.state === "ready") {
      useChat(answer.status);
      said = { ok: true, words: told };
    } else {
      said = {
        ok: false,
        words: t("chat-settings-failed", { reason: answer.failure.detail }),
      };
    }
  }

  onMount(load);
</script>

<section
  id="settings-chat"
  class="chat-panel"
  aria-labelledby="chat-panel-title"
>
  <h2 id="chat-panel-title">{t("chat-panel-title")}</h2>
  <p class="small">{t("chat-panel-body")}</p>
  <p class="small refused-line">{t("chat-panel-risk")}</p>

  {#if browser}
    <p class="muted small">{t("chat-panel-browser")}</p>
  {:else if unread}
    <FailurePanel failure={unread} onretry={load} />
  {:else if chat.status}
    {@const status = chat.status}
    <div class="toggles" role="group" aria-label={t("chat-panel-switch-label")}>
      {#each [false, true] as on (on)}
        <button
          type="button"
          class="toggle"
          aria-pressed={status.on === on}
          disabled={busy}
          onclick={() =>
            void change(
              () => chatSwitch(on),
              on ? t("chat-panel-kept-on") : t("chat-panel-kept-off"),
            )}>{on ? t("chat-panel-on") : t("chat-panel-off")}</button
        >
      {/each}
    </div>

    <h3 id="chat-panel-agent-title">{t("chat-panel-agent-title")}</h3>
    <div
      class="toggles agents"
      role="group"
      aria-labelledby="chat-panel-agent-title"
    >
      {#each status.agents as agent (agent.id)}
        <button
          type="button"
          class="toggle"
          aria-pressed={status.chosen === agent.id}
          disabled={busy}
          onclick={() =>
            void change(
              () => chatChoose(agent.id),
              t("chat-panel-chosen", { agent: agent.name }),
            )}
          >{agent.name}
          <span class="where"
            >{agent.found
              ? t("chat-panel-found")
              : t("chat-panel-not-found")}</span
          ></button
        >
      {/each}
    </div>
    {#each status.agents.filter((a) => a.id === status.chosen && !a.found) as agent (agent.id)}
      <p class="small">{agent.get}</p>
    {/each}
    <p class="small now">
      {status.on && status.chosen
        ? t("chat-panel-shown")
        : t("chat-panel-hidden")}
    </p>
  {/if}

  <div aria-live="polite">
    {#if said}
      <p class={said.ok ? "told" : "told refused"} role="status">
        {said.words}
      </p>
    {/if}
  </div>
</section>

<style>
  .chat-panel {
    margin-bottom: 20px;
    padding: 16px 20px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  h2 {
    margin-bottom: 6px;
    font-family: var(--font-display);
    font-size: 1.25rem;
    font-weight: 600;
  }

  h3 {
    margin: 16px 0 4px;
    font-size: 1rem;
    font-weight: 600;
  }

  .agents {
    flex-wrap: wrap;
  }

  .where {
    display: block;
    font-size: var(--type-small);
    font-weight: 400;
  }

  .now {
    font-weight: 600;
  }

  .refused-line {
    padding-inline-start: 8px;
    border-inline-start: 3px solid var(--colour-risk);
    overflow-wrap: anywhere;
  }

  .told {
    margin-top: 10px;
    padding: 6px 10px;
    border: 1px solid var(--colour-success);
    border-radius: 4px;
    overflow-wrap: anywhere;
  }

  .told.refused {
    border-color: var(--colour-risk);
  }
</style>
