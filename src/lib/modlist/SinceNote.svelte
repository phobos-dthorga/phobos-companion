<script lang="ts">
  import { t } from "../i18n/runtime";
  import { formatWhen } from "../shell/dates";
  import { stampMoment } from "./presentation";
  import type { Since } from "./types";

  /**
   * What the first game run after your last change showed (0.56.0; the owner's choice of 23 Nov 2026, after a full re-sort broke a
   * mod and nothing said so until the log was read by hand). New errors come with Undo (asked first, here) and a way to a list
   * that ran clean; a clean run, a list changed elsewhere and a change not yet run are said in a line.
   */
  let {
    since,
    busy = false,
    onundo,
    onsaved,
  }: {
    since: Since;
    busy?: boolean;
    onundo: () => void;
    onsaved: () => void;
  } = $props();

  let asking = $state(false);
  const why = $derived(since.change?.why ?? "");
  const when = $derived(formatWhen(stampMoment(since.change?.at ?? "")));
</script>

{#if since.verdict === "new-errors"}
  <div class="since broke" role="group" aria-labelledby="modlist-since-title">
    <h3 id="modlist-since-title">
      {t("modlist-since-new-title", { count: since.new_errors ?? 0 })}
    </h3>
    <p>{t("modlist-since-change", { why, when })}</p>
    <ul>
      {#each (since.new ?? []).slice(0, 5) as error (error.id)}
        <li>
          <span class="count">{error.count}×</span>
          {error.message}
          {#if error.mods.length > 0}
            <span class="muted small"
              >{t("modlist-since-points", {
                mods: error.mods.slice(0, 3).join(", "),
              })}</span
            >
          {/if}
        </li>
      {/each}
    </ul>
    <p class="muted small">{t("modlist-since-caution")}</p>
    {#if asking}
      <div class="confirm">
        <p>{t("modlist-since-undo-confirm", { why })}</p>
        <div class="buttons">
          <button
            type="button"
            class="action strong"
            disabled={busy}
            onclick={() => {
              asking = false;
              onundo();
            }}>{t("modlist-since-undo-yes")}</button
          >
          <button type="button" class="action" onclick={() => (asking = false)}
            >{t("modlist-cancel")}</button
          >
        </div>
      </div>
    {:else}
      <div class="buttons">
        <button
          type="button"
          class="action strong"
          disabled={busy}
          onclick={() => (asking = true)}>{t("modlist-since-undo")}</button
        >
        <button type="button" class="action" onclick={onsaved}
          >{t("modlist-since-saved")}</button
        >
      </div>
    {/if}
  </div>
{:else if since.verdict === "clean"}
  <p class="since clean" role="status">{t("modlist-since-clean", { why })}</p>
{:else if since.verdict === "changed-since"}
  <p class="since quiet">{t("modlist-since-changed", { why })}</p>
{:else if since.verdict === "not-run-since"}
  <p class="since quiet">{t("modlist-since-not-run", { why })}</p>
{/if}

<style>
  .since {
    margin: 8px 0 12px;
    padding: 10px 14px;
    border-radius: 4px;
    overflow-wrap: anywhere;
  }

  .broke {
    border: 2px solid var(--colour-risk);
    background: var(--shade-risk);
  }

  .clean {
    border-inline-start: 3px solid var(--colour-success);
    background: var(--shade-success);
  }

  .quiet {
    border-inline-start: 3px solid var(--colour-line);
    color: var(--colour-text-muted);
  }

  h3 {
    margin: 0 0 6px;
    font-size: 1.0625rem;
    font-weight: 600;
  }

  ul {
    margin: 6px 0;
    padding-inline-start: 18px;
  }

  li {
    margin-bottom: 4px;
  }

  li .muted {
    display: block;
  }

  .count {
    font-variant-numeric: tabular-nums;
    font-weight: 600;
  }

  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 8px;
  }

  .action.strong {
    border-width: 2px;
  }

  .confirm {
    margin-top: 8px;
    padding: 8px 12px;
    border: 2px solid var(--colour-accent);
    background: var(--colour-surface-raised);
    border-radius: 4px;
  }
</style>
