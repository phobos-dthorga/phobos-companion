<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import { started } from "../shell/progress";
  import { readAiProgramsSetup } from "./desktopClient";
  import type { AiProgramsReading } from "./types";

  /**
   * Settings → AI, AI programs (0.70.0; `docs/ai.md`, A1, the owner's choice of 23 Nov 2026): the lines to paste into an AI
   * program the person already uses, so it can start the kit's MCP server and ask the kit's reports that read. Only reads; a press
   * of Copy puts one block on the clipboard. The server is started by the AI program, never by this program.
   */
  let reading = $state<AiProgramsReading>({ state: "reading" });
  let copied = $state<{ ok: boolean; words: string } | null>(null);

  async function load() {
    reading = { state: "reading" };
    copied = null;
    reading = await readAiProgramsSetup();
  }

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      copied = { ok: true, words: t("ai-programs-copied", { what }) };
    } catch {
      copied = { ok: false, words: t("ai-programs-copy-failed") };
    }
  }

  onMount(load);
</script>

<section
  id="settings-ai-programs"
  class="ai-programs"
  aria-labelledby="ai-programs-title"
>
  <h2 id="ai-programs-title">{t("ai-programs-title")}</h2>
  <p class="small">{t("ai-programs-body")}</p>
  <p class="small">{t("ai-programs-safe")}</p>

  {#if reading.state === "reading"}
    <ProgressBar progress={started()} fallback={t("ai-programs-reading")} />
  {:else if reading.state === "browser"}
    <p class="muted small">{t("ai-programs-browser")}</p>
  {:else if reading.state === "failed"}
    <FailurePanel failure={reading.failure} onretry={load} />
  {:else}
    {@const setup = reading.setup}
    <h3 id="ai-programs-list-title">{t("ai-programs-list-title")}</h3>
    <p class="small">{t("ai-programs-list-body", { name: setup.name })}</p>
    <pre
      class="lines"
      aria-labelledby="ai-programs-list-title">{setup.serversJson}</pre>
    <button
      type="button"
      class="action"
      onclick={() => void copy(setup.serversJson, t("ai-programs-list-what"))}
      >{t("ai-programs-copy-list")}</button
    >

    <h3 id="ai-programs-claude-code-title">
      {t("ai-programs-claude-code-title")}
    </h3>
    <p class="small">{t("ai-programs-claude-code-body")}</p>
    <pre
      class="lines"
      aria-labelledby="ai-programs-claude-code-title">{setup.claudeCode}</pre>
    <button
      type="button"
      class="action"
      onclick={() =>
        void copy(setup.claudeCode, t("ai-programs-claude-code-what"))}
      >{t("ai-programs-copy-command")}</button
    >

    <p class="muted small limits">{t("ai-programs-limits")}</p>
  {/if}

  <div aria-live="polite">
    {#if copied}
      <p class={copied.ok ? "told" : "told refused"} role="status">
        {copied.words}
      </p>
    {/if}
  </div>
</section>

<style>
  .ai-programs {
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

  /* Long lines wrap rather than scroll: a box that scrolls sideways must be reachable by keyboard, and Copy takes the text exactly. */
  .lines {
    margin: 6px 0 8px;
    padding: 10px 12px;
    font-size: var(--type-small);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    background: var(--colour-canvas);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .limits {
    margin-top: 14px;
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
