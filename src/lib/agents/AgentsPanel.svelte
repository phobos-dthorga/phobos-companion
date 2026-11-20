<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import { chooseAgentFeatures, readAgentFeatures } from "./desktopClient";
  import { agents, useAgents } from "./state.svelte";
  import type { AgentChoice, AgentSign } from "./types";

  /**
   * Features for AI agent sessions, on the Settings page (0.37.0; the owner, 20 Nov 2026: "Hidden unless switched on, or
   * otherwise detected"): when to show them, what on this PC was found, and whether they are shown now. The host keeps the choice.
   */
  const CHOICES: { choice: AgentChoice; key: string }[] = [
    { choice: "found", key: "agents-choice-found" },
    { choice: "on", key: "agents-choice-on" },
    { choice: "off", key: "agents-choice-off" },
  ];
  const SHOWN_SIGNS = 6;

  let unread = $state<string | null>(null);
  let busy = $state(false);
  let said = $state<{ ok: boolean; words: string } | null>(null);

  async function load() {
    const answer = await readAgentFeatures();
    if (answer.state === "ready") useAgents(answer.status);
    else if (answer.state === "failed") unread = answer.failure.detail;
  }

  async function choose(choice: AgentChoice, key: string) {
    busy = true;
    said = null;
    const answer = await chooseAgentFeatures(choice);
    busy = false;
    if (answer.state !== "ready") {
      said = {
        ok: false,
        words: t("agents-failed", { reason: answer.failure.detail }),
      };
      return;
    }
    useAgents(answer.status);
    said = {
      ok: true,
      words: t(
        answer.status.shown ? "agents-kept-shown" : "agents-kept-hidden",
        {
          choice: t(key),
        },
      ),
    };
  }

  function signWords(sign: AgentSign): string {
    if (sign.repository !== null)
      return t("agents-sign-repository", {
        what: sign.what,
        repository: sign.repository,
      });
    return sign.what === "screen-notes"
      ? t("agents-sign-screen-notes")
      : t("agents-sign-decisions");
  }

  onMount(load);
</script>

<section id="settings-agents" class="agents" aria-labelledby="agents-title">
  <h2 id="agents-title">{t("agents-title")}</h2>
  <p class="small">{t("agents-body")}</p>

  {#if unread}
    <p class="refused-line" role="status">
      {t("agents-unread", { reason: unread })}
    </p>
  {:else if agents.status}
    {@const status = agents.status}
    <div class="toggles" role="group" aria-label={t("agents-choice-label")}>
      {#each CHOICES as option (option.choice)}
        <button
          type="button"
          class="toggle"
          aria-pressed={status.choice === option.choice}
          disabled={busy}
          onclick={() => void choose(option.choice, option.key)}
          >{t(option.key)}</button
        >
      {/each}
    </div>
    <p class="small now">
      {status.shown ? t("agents-now-shown") : t("agents-now-hidden")}
    </p>
    {#if status.signs.length > 0}
      <p class="small">{t("agents-found")}</p>
      <ul class="small signs">
        {#each status.signs.slice(0, SHOWN_SIGNS) as sign, index (index)}
          <li>{signWords(sign)}</li>
        {/each}
      </ul>
      {#if status.signs.length > SHOWN_SIGNS}
        <p class="muted small">
          {t("agents-found-more", {
            count: status.signs.length - SHOWN_SIGNS,
          })}
        </p>
      {/if}
    {:else}
      <p class="muted small">{t("agents-none-found")}</p>
    {/if}
  {:else}
    <p class="muted small">{t("agents-browser")}</p>
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
  .agents {
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

  .now {
    font-weight: 600;
  }

  .signs {
    margin: 4px 0 0;
    padding-inline-start: 20px;
  }
</style>
