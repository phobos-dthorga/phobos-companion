<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import { heard, started } from "../shell/progress";
  import { fetchAgain, readWorkshopUpdates } from "./desktopClient";
  import type { WorkshopUpdate, WorkshopUpdates } from "./types";

  /**
   * Workshop updates waiting (0.114.0; the owner's choice of 28 Nov 2026, the last piece of retiring RimSort): the Workshop items
   * Steam has not brought up to date, from Steam's own record of them, and **Fetch them again**, which asks the running Steam client
   * to download them now. Shown only when there is something to say.
   */
  let { game, name }: { game: string; name: string } = $props();

  const STATE_WORDS: Record<WorkshopUpdate["state"], string> = {
    waiting: "modlist-updates-waiting",
    downloading: "modlist-updates-downloading",
    missing: "modlist-updates-missing",
  };

  let updates = $state<WorkshopUpdates | null>(null);
  let busy = $state(false);
  let progress = $state(started());
  let said = $state<{ text: string; refused: boolean } | null>(null);

  async function read() {
    const answer = await readWorkshopUpdates(game);
    if (answer.state === "ready") updates = answer.updates;
  }

  async function again() {
    if (!updates || busy) return;
    said = null;
    busy = true;
    progress = started(t("modlist-updates-asking"));
    const answer = await fetchAgain(
      game,
      updates.items.map((i) => i.workshop_id),
      (m) => {
        progress = heard(progress, m);
      },
    );
    busy = false;
    const refusal =
      answer.state === "failed"
        ? answer.failure.detail
        : !answer.result.ok
          ? (answer.result.refusal ?? "")
          : null;
    said =
      refusal !== null
        ? {
            text: t("modlist-updates-refused", { reason: refusal }),
            refused: true,
          }
        : { text: t("modlist-updates-asked"), refused: false };
    await read();
  }

  onMount(() => {
    void read();
  });
</script>

{#if updates && (updates.items.length > 0 || said)}
  <section class="updates" aria-labelledby="workshop-updates-title">
    <h2 id="workshop-updates-title">
      {t("modlist-updates-title", { count: updates.items.length })}
    </h2>
    <p class="muted">
      {updates.gameRunning
        ? t("modlist-updates-running", { game: name })
        : t("modlist-updates-intro")}
    </p>
    {#if said}
      <p class="told" class:refused={said.refused} role="status">
        {said.text}
      </p>
    {/if}
    {#if busy}
      <ProgressBar {progress} fallback={t("modlist-updates-asking")} />
    {/if}
    {#if updates.items.length > 0}
      <ul>
        {#each updates.items as item (item.workshop_id)}
          <li>
            <strong>{item.name || item.workshop_id}</strong>
            <span class="muted small">{t(STATE_WORDS[item.state])}</span>
          </li>
        {/each}
      </ul>
      <button
        type="button"
        class="action"
        disabled={busy || updates.gameRunning}
        onclick={again}>{t("modlist-updates-fetch")}</button
      >
    {/if}
  </section>
{/if}

<style>
  .updates {
    margin-bottom: 16px;
    padding: 16px 20px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  h2 {
    margin-top: 0;
  }

  ul {
    margin: 0 0 12px;
    padding-left: 20px;
  }

  li span {
    margin-left: 8px;
  }

  .told {
    margin-bottom: 12px;
  }

  .told.refused {
    color: var(--colour-risk);
  }
</style>
