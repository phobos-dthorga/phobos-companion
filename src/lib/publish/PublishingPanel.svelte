<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import { chooseUploads, readUploadsSetting } from "./desktopClient";

  /**
   * Workshop uploads, on the Settings page (0.69.0; `docs/publishing.md`): whether the Publish page offers Upload, Make public and
   * Update all waiting. On by default (the agent's grade of the risk is moderate: new items start private, and going public takes
   * two presses). Off hides those buttons, and the host refuses an upload; reading and preparing stay.
   */
  let on = $state<boolean | null>(null);
  let unread = $state<string | null>(null);
  let busy = $state(false);
  let said = $state<{ ok: boolean; words: string } | null>(null);

  async function load() {
    const answer = await readUploadsSetting();
    if (answer.state === "ready") on = answer.value;
    else if (answer.state === "failed") unread = answer.failure.detail;
  }

  async function choose(next: boolean) {
    busy = true;
    said = null;
    const answer = await chooseUploads(next);
    busy = false;
    if (answer.state !== "ready") {
      said = {
        ok: false,
        words: t("publish-setting-failed", { reason: answer.failure.detail }),
      };
      return;
    }
    on = answer.value;
    said = {
      ok: true,
      words: on ? t("publish-setting-kept-on") : t("publish-setting-kept-off"),
    };
  }

  onMount(() => void load());
</script>

<section class="panel" aria-labelledby="publish-setting-title">
  <h2 id="publish-setting-title">{t("publish-setting-title")}</h2>
  <p class="small">{t("publish-setting-body")}</p>
  {#if unread}
    <p class="refused">{t("publish-setting-failed", { reason: unread })}</p>
  {:else if on !== null}
    <div class="toggles" role="group" aria-label={t("publish-setting-title")}>
      <button
        type="button"
        class="toggle"
        aria-pressed={on}
        disabled={busy}
        onclick={() => void choose(true)}>{t("publish-setting-on")}</button
      >
      <button
        type="button"
        class="toggle"
        aria-pressed={!on}
        disabled={busy}
        onclick={() => void choose(false)}>{t("publish-setting-off")}</button
      >
    </div>
  {/if}
  <div aria-live="polite">
    {#if said}
      <p class={said.ok ? "said" : "said refused"} role="status">
        {said.words}
      </p>
    {/if}
  </div>
</section>

<style>
  .panel {
    margin-block: 12px;
  }

  h2 {
    margin-bottom: 6px;
    font-family: var(--font-display);
    font-size: 1.375rem;
    font-weight: 600;
  }

  .small {
    margin-bottom: 8px;
    max-width: 80ch;
  }

  .said {
    margin-top: 6px;
    color: var(--colour-success);
  }

  .refused,
  .said.refused {
    color: var(--colour-risk);
  }
</style>
