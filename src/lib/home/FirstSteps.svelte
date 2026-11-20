<script lang="ts">
  import { t } from "../i18n/runtime";
  import { go } from "../navigation/navigation.svelte";
  import { place } from "../navigation/place";
  import AddGamePanel from "../games/AddGamePanel.svelte";
  import { startGamesList } from "../games/desktopClient";
  import { pickPath } from "../settings/desktopClient";

  /**
   * First steps (0.36.0; docs/release-audit.md, A3): what a person sees the first time, on a PC where no games list is kept yet.
   * One: where their mod projects are (or that they are not in one folder), which starts the list in their own data folder. Two:
   * their first game, added from Steam. The Guide's First steps entry says the same, for later.
   */
  let {
    listFound,
    listFile,
    onchanged,
  }: { listFound: boolean; listFile: string; onchanged: () => void } = $props();

  let working = $state(false);
  let said = $state<{ ok: boolean; words: string } | null>(null);

  async function start(root: string | null) {
    working = true;
    said = null;
    const answer = await startGamesList(root);
    working = false;
    if (answer.state !== "done") {
      said = {
        ok: false,
        words: t("first-steps-failed", { reason: answer.failure.detail }),
      };
      return;
    }
    onchanged();
  }

  async function chooseFolder() {
    const picked = await pickPath("folder", t("first-steps-pick-title"), null);
    if (picked.state === "picked") await start(picked.path);
    else if (picked.state === "closed")
      said = { ok: true, words: t("first-steps-pick-closed") };
    else
      said = {
        ok: false,
        words: t("first-steps-failed", { reason: picked.failure.detail }),
      };
  }
</script>

<div class="eyebrow accent">{t("first-steps-kicker")}</div>
<h1>{t("first-steps-title")}</h1>
<p class="lead">{t("first-steps-lead")}</p>

{#if !listFound}
  <section class="step" aria-labelledby="first-steps-one">
    <h2 id="first-steps-one">{t("first-steps-one-title")}</h2>
    <p>{t("first-steps-one-body")}</p>
    <div class="buttons">
      <button
        type="button"
        class="action"
        disabled={working}
        onclick={chooseFolder}>{t("first-steps-choose")}</button
      >
      <button
        type="button"
        class="action"
        disabled={working}
        onclick={() => start(null)}>{t("first-steps-no-folder")}</button
      >
    </div>
  </section>
{:else}
  <section class="step" aria-labelledby="first-steps-two">
    <h2 id="first-steps-two">{t("first-steps-two-title")}</h2>
    <p>{t("first-steps-two-body")}</p>
    <AddGamePanel taken={[]} {onchanged} />
  </section>
{/if}

<div aria-live="polite">
  {#if said}
    <p class={said.ok ? "told" : "told refused"} role="status">{said.words}</p>
  {/if}
</div>

<p class="muted small">
  {t("first-steps-list", { path: listFile })}
</p>
<button
  type="button"
  class="action"
  onclick={() => go(place("guide", null, { entry: "task-first-steps" }))}
  >{t("first-steps-guide")}</button
>

<style>
  .step {
    margin-bottom: 16px;
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

  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .told {
    margin: 10px 0;
    padding: 6px 10px;
    border: 1px solid var(--colour-success);
    border-radius: 4px;
    overflow-wrap: anywhere;
  }

  .told.refused {
    border-color: var(--colour-risk);
  }

  p.muted {
    overflow-wrap: anywhere;
  }
</style>
