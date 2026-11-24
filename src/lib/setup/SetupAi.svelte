<script lang="ts">
  import { onMount } from "svelte";
  import {
    chooseAiModel,
    chooseAiService,
    readAiModels,
    readAiStatus,
  } from "../ai/desktopClient";
  import type { AiStatus } from "../ai/types";
  import { chatChoose, chatTry, readChatStatus } from "../chat/desktopClient";
  import type { ChatStatus, ChatTried } from "../chat/types";
  import { t } from "../i18n/runtime";
  import { goPage } from "../navigation/navigation.svelte";

  /** The most models offered as buttons; the rest are in Settings → AI. */
  const SHOWN_MODELS = 6;

  function heardWords(heard: ChatTried): string {
    const name = heard.saidName ?? heard.agent;
    const answered = heard.version
      ? t("setup-ai-tried-version", { name, version: heard.version })
      : t("setup-ai-tried", { name });
    return heard.signIn.length > 0
      ? `${answered} ${t("setup-ai-sign-in", { ways: heard.signIn.join(", ") })}`
      : answered;
  }

  /**
   * AI, if you want it, on Settings → Setup (0.90.0; the owner's choice by card, 25 Nov 2026: an AI helper that "finds chat
   * agents already installed on the PC and offers them in Settings, with a 'try it' button that you press"). A model already
   * running on this computer is looked for on a press and can be used for help on pages; an agent on the search path can be
   * tried for a moment and chosen for the Chat page. Nothing here is needed. Presentation only: the host looks, tries and keeps.
   */
  let ai = $state<AiStatus | null>(null);
  let chat = $state<ChatStatus | null>(null);
  /** What a look for a local model found, by service: its models, or why not. */
  let looked = $state<Record<string, { models: string[] } | { why: string }>>(
    {},
  );
  /** What Try it heard, by agent. */
  let tried = $state<Record<string, { heard: ChatTried } | { why: string }>>(
    {},
  );
  let busy = $state<string | null>(null);
  let said = $state<string | null>(null);

  async function load() {
    const [aiAnswer, chatAnswer] = await Promise.all([
      readAiStatus(),
      readChatStatus(),
    ]);
    if (aiAnswer.state === "ready") ai = aiAnswer.status;
    if (chatAnswer.state === "ready") chat = chatAnswer.status;
  }

  async function look(id: string) {
    busy = id;
    const answer = await readAiModels(id);
    busy = null;
    looked = {
      ...looked,
      [id]:
        answer.state === "ready"
          ? { models: answer.models }
          : { why: answer.failure.detail },
    };
  }

  async function use(id: string, model: string) {
    said = null;
    const chosen = await chooseAiService(id);
    const kept =
      chosen.state === "ready" ? await chooseAiModel(id, model) : chosen;
    if (kept.state === "ready") {
      ai = kept.status;
      said = t("setup-ai-model-used", { model });
    } else said = kept.failure.detail;
  }

  async function tryAgent(id: string) {
    busy = id;
    const answer = await chatTry(id);
    busy = null;
    tried = {
      ...tried,
      [id]:
        answer.state === "ready"
          ? { heard: answer.tried }
          : { why: answer.failure.detail },
    };
  }

  async function choose(id: string, name: string) {
    said = null;
    const answer = await chatChoose(id);
    if (answer.state === "ready") {
      chat = answer.status;
      said = t("chat-panel-chosen", { agent: name });
    } else said = answer.failure.detail;
  }

  onMount(load);
</script>

{#if ai || chat}
  <section
    id="settings-setup-ai"
    class="setup-ai"
    aria-labelledby="setup-ai-title"
  >
    <h2 id="setup-ai-title">{t("setup-ai-title")}</h2>
    <p class="small">{t("setup-ai-lead")}</p>

    {#if ai}
      <h3>{t("setup-ai-models-title")}</h3>
      <ul class="items">
        {#each ai.services.filter((s) => s.local) as service (service.id)}
          {@const found = looked[service.id]}
          <li class="item">
            <strong>{service.name}</strong>
            {#if ai.chosen === service.id && service.model}
              <span class="tag"
                >{t("setup-ai-in-use", { model: service.model })}</span
              >
            {/if}
            {#if found && "models" in found}
              <p class="small" role="status">
                {t("setup-ai-models-found", { count: found.models.length })}
              </p>
              <div class="buttons">
                {#each found.models.slice(0, SHOWN_MODELS) as model (model)}
                  <button
                    type="button"
                    class="action"
                    onclick={() => void use(service.id, model)}
                    >{t("setup-ai-use-model", { model })}</button
                  >
                {/each}
              </div>
            {:else}
              {#if found}
                <p class="small" role="status">
                  {t("setup-ai-not-running", { name: service.name })}
                </p>
              {/if}
              <button
                type="button"
                class="action"
                disabled={busy !== null}
                onclick={() => void look(service.id)}
                >{busy === service.id
                  ? t("setup-ai-looking")
                  : t("setup-ai-look", { name: service.name })}</button
              >
            {/if}
          </li>
        {/each}
      </ul>
      <p class="small">
        {t("setup-ai-online")}
        <button
          type="button"
          class="action"
          onclick={() => goPage("settings", { panel: "ai-services" })}
          >{t("setup-ai-open-services")}</button
        >
      </p>
    {/if}

    {#if chat}
      <h3>{t("setup-ai-agents-title")}</h3>
      <ul class="items">
        {#each chat.agents as agent (agent.id)}
          {@const heard = tried[agent.id]}
          <li class="item">
            <strong>{agent.name}</strong>
            {#if chat.chosen === agent.id}
              <span class="tag">{t("setup-ai-chosen")}</span>
            {/if}
            {#if agent.found}
              {#if heard}
                <p
                  class={"heard" in heard ? "small" : "small refused-line"}
                  role="status"
                >
                  {"heard" in heard
                    ? heardWords(heard.heard)
                    : t("setup-ai-try-failed", { why: heard.why })}
                </p>
              {/if}
              <div class="buttons">
                <button
                  type="button"
                  class="action"
                  disabled={busy !== null}
                  onclick={() => void tryAgent(agent.id)}
                  >{busy === agent.id
                    ? t("setup-ai-trying")
                    : t("setup-ai-try", { name: agent.name })}</button
                >
                {#if chat.chosen !== agent.id}
                  <button
                    type="button"
                    class="action"
                    onclick={() => void choose(agent.id, agent.name)}
                    >{t("setup-ai-choose")}</button
                  >
                {/if}
              </div>
            {:else}
              <p class="small muted">
                {t("chat-panel-not-found")}: {agent.get}
              </p>
            {/if}
          </li>
        {/each}
      </ul>
      {#if !chat.on}
        <p class="small">
          {t("setup-ai-chat-off")}
          <button
            type="button"
            class="action"
            onclick={() => goPage("settings", { panel: "chat" })}
            >{t("setup-ai-open-chat")}</button
          >
        </p>
      {/if}
    {/if}
    <div aria-live="polite">
      {#if said}<p class="small">{said}</p>{/if}
    </div>
  </section>
{/if}

<style>
  .setup-ai {
    max-width: 90ch;
    margin-top: 20px;
    padding: 12px 16px;
    background: var(--colour-surface);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  h2 {
    margin: 0 0 8px;
    font-family: var(--font-display);
    font-size: 1.25rem;
    font-weight: 600;
  }

  h3 {
    margin: 14px 0 6px;
    font-size: var(--type-body);
    font-weight: 600;
  }

  p {
    margin: 0 0 6px;
  }

  .items {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .item {
    padding: 8px 12px;
    margin-bottom: 8px;
    background: var(--colour-surface-soft);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .tag {
    margin-inline-start: 8px;
    padding-inline: 6px;
    font-size: var(--type-caption);
    border: 1px solid var(--colour-line);
    border-radius: 3px;
  }

  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 6px;
  }

  .refused-line {
    padding-inline-start: 8px;
    border-inline-start: 3px solid var(--colour-risk);
    overflow-wrap: anywhere;
  }
</style>
