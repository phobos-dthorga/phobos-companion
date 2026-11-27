<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import { aheadChosen, aheadOn, readingAhead } from "../shell/ahead.svelte";
  import { chooseReadingAhead } from "../shell/desktopClient";

  /**
   * Read the slow pages ahead, on Settings → Games (0.116.0; the owner's choice of 28 Nov 2026, "Yes, one at a time"). On by
   * default: it only reads. On, the Companion reads the slow pages of the game in view by itself, one at a time and behind anything
   * you ask, so they open at once; off, nothing slow runs by itself, and the page list's numbers come from each page's last reading.
   */
  let busy = $state(false);
  let said = $state<{ ok: boolean; words: string } | null>(null);

  async function choose(next: boolean) {
    busy = true;
    said = null;
    const answer = await chooseReadingAhead(next);
    busy = false;
    if (answer.state !== "ready") {
      said = {
        ok: false,
        words: t("ahead-setting-failed", { reason: answer.failure.detail }),
      };
      return;
    }
    aheadChosen(answer.on);
    said = {
      ok: true,
      words: answer.on
        ? t("ahead-setting-kept-on")
        : t("ahead-setting-kept-off"),
    };
  }

  onMount(() => void aheadOn());
</script>

<section
  id="settings-ahead"
  class="panel"
  aria-labelledby="ahead-setting-title"
>
  <h2 id="ahead-setting-title">{t("ahead-setting-title")}</h2>
  <p class="small">{t("ahead-setting-body")}</p>
  {#if readingAhead.known}
    <div class="toggles" role="group" aria-label={t("ahead-setting-title")}>
      <button
        type="button"
        class="toggle"
        aria-pressed={readingAhead.on}
        disabled={busy}
        onclick={() => void choose(true)}>{t("ahead-setting-on")}</button
      >
      <button
        type="button"
        class="toggle"
        aria-pressed={!readingAhead.on}
        disabled={busy}
        onclick={() => void choose(false)}>{t("ahead-setting-off")}</button
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

  .said.refused {
    color: var(--colour-risk);
  }
</style>
