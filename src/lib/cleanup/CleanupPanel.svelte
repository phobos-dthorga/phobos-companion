<script lang="ts">
  import { onMount } from "svelte";
  import { LOCALE, t } from "../i18n/runtime";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import Placeholder from "../shell/Placeholder.svelte";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import { heard, started } from "../shell/progress";
  import { formatSize } from "../shell/sizes";
  import type { Failure } from "../shell/types";
  import { applyCleanup, readCleanup } from "./desktopClient";
  import { keep } from "./latest.svelte";
  import { chosenBytes, DAEMONS, firstChoice } from "./presentation";
  import type { CleanupListing } from "./types";

  /**
   * Clean up (0.27.0; the owner: "some kind of ongoing cleanup process"): what the tools, builds and tests left behind, by group,
   * with what each holds and why it may go. The owner chooses the groups (install backups, the Mods page's way back, start unchosen),
   * presses Clean up, and confirms; only then does anything go. Nothing is ever deleted that the listing did not name.
   */
  type Reading =
    | { state: "reading" }
    | { state: "ready"; listing: CleanupListing }
    | { state: "failed"; failure: Failure };

  let reading = $state<Reading>({ state: "reading" });
  let progress = $state(started());
  let chosen = $state<string[]>([]);
  let asking = $state(false);
  let working = $state(false);
  let said = $state<{ ok: boolean; words: string } | null>(null);

  async function load() {
    reading = { state: "reading" };
    progress = started();
    const answer = await readCleanup((m) => {
      progress = heard(progress, m);
    });
    if (answer.state === "ready") {
      keep(answer.listing);
      reading = answer;
      chosen = firstChoice(answer.listing.groups);
      if (answer.listing.daemons > 0) chosen = [...chosen, DAEMONS];
    } else {
      reading = answer;
    }
  }

  function toggle(group: string) {
    chosen = chosen.includes(group)
      ? chosen.filter((g) => g !== group)
      : [...chosen, group];
    asking = false;
  }

  const listing = $derived(reading.state === "ready" ? reading.listing : null);
  const bytes = $derived(listing ? chosenBytes(listing.groups, chosen) : 0);
  const size = (value: number) => formatSize(value, LOCALE);

  async function clean() {
    if (!listing) return;
    const before = listing.bytes;
    asking = false;
    working = true;
    said = null;
    progress = started();
    const answer = await applyCleanup(chosen, (m) => {
      progress = heard(progress, m);
    });
    working = false;
    if (answer.state !== "ready") {
      said = {
        ok: false,
        words: t("cleanup-failed", { reason: answer.failure.detail }),
      };
      return;
    }
    keep(answer.listing);
    said = {
      ok: true,
      words: t("cleanup-done", {
        size: size(Math.max(0, before - answer.listing.bytes)),
      }),
    };
    await load();
  }

  onMount(load);
</script>

<section id="settings-cleanup" class="cleanup" aria-labelledby="cleanup-title">
  <h2 id="cleanup-title">{t("cleanup-title")}</h2>
  <p class="small">{t("cleanup-body")}</p>

  {#if reading.state === "reading"}
    <ProgressBar {progress} fallback={t("cleanup-reading")} />
    <Placeholder shape="rows" rows={3} />
  {:else if reading.state === "failed"}
    <FailurePanel failure={reading.failure} onretry={load} />
  {:else if listing}
    {#if listing.groups.length === 0 && listing.daemons === 0}
      <p>{t("cleanup-nothing")}</p>
    {:else}
      <p>{t("cleanup-total", { size: size(listing.bytes) })}</p>
      <div class="groups" role="group" aria-label={t("cleanup-choose")}>
        {#each listing.groups as group (group.group)}
          <button
            type="button"
            class="toggle group"
            aria-pressed={chosen.includes(group.group)}
            disabled={working}
            onclick={() => toggle(group.group)}
          >
            <span class="name">{group.group}</span>
            <span class="small"
              >{t("cleanup-group-size", {
                size: size(group.bytes),
                count: group.items,
              })}</span
            >
            <span class="small muted">{group.why}</span>
          </button>
        {/each}
        {#if listing.daemons > 0}
          <button
            type="button"
            class="toggle group"
            aria-pressed={chosen.includes(DAEMONS)}
            disabled={working}
            onclick={() => toggle(DAEMONS)}
          >
            <span class="name">{t("cleanup-daemons")}</span>
            <span class="small"
              >{t("cleanup-daemons-count", { count: listing.daemons })}</span
            >
            <span class="small muted">{t("cleanup-daemons-why")}</span>
          </button>
        {/if}
      </div>
      <p class="small muted">{t("cleanup-backups-note")}</p>

      {#if working}
        <ProgressBar {progress} fallback={t("cleanup-working")} />
      {:else if asking}
        <div class="confirm" role="group" aria-label={t("cleanup-confirm")}>
          <p>{t("cleanup-confirm-words", { size: size(bytes) })}</p>
          <button type="button" class="action" onclick={clean}
            >{t("cleanup-confirm-yes")}</button
          >
          <button type="button" class="action" onclick={() => (asking = false)}
            >{t("cleanup-confirm-no")}</button
          >
        </div>
      {:else}
        <button
          type="button"
          class="action"
          disabled={chosen.length === 0}
          onclick={() => (asking = true)}
          >{t("cleanup-clean", { size: size(bytes) })}</button
        >
      {/if}
      {#each listing.notes as note (note)}
        <p class="small muted">{note}</p>
      {/each}
    {/if}
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
  .cleanup {
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

  .groups {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
    gap: 8px;
    margin: 10px 0;
  }

  .group {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    min-height: 44px;
    padding: 8px 12px;
    text-align: start;
    overflow-wrap: anywhere;
  }

  .name {
    font-weight: 600;
  }

  .confirm {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
    padding: 10px 14px;
    border: 2px solid var(--colour-accent);
    border-radius: 4px;
  }

  .confirm p {
    flex-basis: 100%;
    margin: 0;
  }
</style>
