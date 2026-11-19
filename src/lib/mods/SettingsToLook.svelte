<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import { openDialog } from "../navigation/navigation.svelte";
  import { commitRequest } from "../code/presentation";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import Pager from "../shell/Pager.svelte";
  import { heard, started } from "../shell/progress";
  import { pageOf } from "../shell/paging";
  import { formatDay } from "../shell/dates";
  import type { Failure } from "../shell/types";
  import { markSettings, readLedger } from "./desktopClient";
  import {
    idsByRepository,
    split,
    WHAT_WORDS,
    type Ledger,
    type LedgerItem,
  } from "./ledger";

  /**
   * Settings to look at (the owner's request, 19 Nov 2026): every setting the game's mods ever added, removed or gave a new
   * default, newest first, until the owner marks it as looked at. The marks are kept in this program's own folder; marking can be
   * undone from the list of those looked at. The same changes are on the Timeline, on the day each was made.
   */
  let { game }: { game: string } = $props();

  const PER_PAGE = 10;

  type Reading =
    | { state: "reading" }
    | { state: "ready"; ledgers: Ledger[] }
    | { state: "failed"; failure: Failure };

  let reading = $state<Reading>({ state: "reading" });
  let progress = $state(started());
  let showLooked = $state(false);
  let lookPage = $state(1);
  let lookedPage = $state(1);
  let busy = $state(false);
  let said = $state("");

  async function read() {
    reading = { state: "reading" };
    progress = started();
    reading = await readLedger(game, (message) => {
      progress = heard(progress, message);
    });
  }

  onMount(read);

  const ledgers = $derived(reading.state === "ready" ? reading.ledgers : []);
  const parts = $derived(split(ledgers));
  const toLookPage = $derived(pageOf(parts.toLook, lookPage, PER_PAGE));
  const lookedPaged = $derived(pageOf(parts.looked, lookedPage, PER_PAGE));

  /** Marks some items, repository by repository, then shows the marks at once; the host's answer decides whether they stand. */
  async function mark(items: LedgerItem[], seen: boolean) {
    if (items.length === 0) return;
    busy = true;
    for (const [repository, ids] of idsByRepository(items)) {
      const answer = await markSettings(game, repository, ids, seen);
      if (answer.state === "failed") {
        busy = false;
        said = t("ledger-mark-failed", { reason: answer.failure.detail });
        return;
      }
      const ledger = ledgers.find((l) => l.repository === repository);
      if (ledger)
        ledger.seen = seen
          ? [...new Set([...ledger.seen, ...ids])]
          : ledger.seen.filter((id) => !ids.includes(id));
    }
    reading = { state: "ready", ledgers: [...ledgers] };
    busy = false;
    said = seen
      ? t("ledger-marked", { count: items.length })
      : t("ledger-unmarked", { count: items.length });
  }

  function seeChange(item: LedgerItem) {
    if (!item.change.commit) return;
    openDialog({
      kind: "code",
      request: commitRequest(
        item.repository,
        item.change.commit,
        item.change.subject ?? item.change.key,
      ),
    });
  }

  function valueWords(item: LedgerItem): string {
    const c = item.change;
    return c.what === "default"
      ? t("ledger-value-default", {
          before: c.before ?? "",
          after: c.after ?? "",
        })
      : c.what === "removed"
        ? t("ledger-value-removed", { before: c.before ?? "" })
        : t("ledger-value-added", { after: c.after ?? "" });
  }
</script>

<section
  class="ledger"
  id="settings-to-look"
  aria-labelledby="settings-to-look-title"
>
  <div class="head">
    <h2 id="settings-to-look-title">
      {t("ledger-title")}
      {#if reading.state === "ready"}
        <span class="count" class:none={parts.toLook.length === 0}
          >{parts.toLook.length}</span
        >
      {/if}
    </h2>
    {#if reading.state === "ready" && parts.toLook.length > 0}
      <button
        type="button"
        class="action"
        disabled={busy}
        onclick={() => mark(parts.toLook, true)}
        >{t("ledger-mark-all", { count: parts.toLook.length })}</button
      >
    {/if}
  </div>
  <p class="muted small">{t("ledger-how")}</p>
  <p class="ledger-status" role="status" aria-live="polite">{said}</p>

  {#if reading.state === "reading"}
    <ProgressBar {progress} fallback={t("ledger-reading")} />
  {:else if reading.state === "failed"}
    <FailurePanel failure={reading.failure} onretry={read} />
  {:else if ledgers.length === 0}
    <p class="small">{t("ledger-none-kept")}</p>
  {:else}
    {#if parts.toLook.length === 0}
      <p class="small">{t("ledger-all-looked")}</p>
    {:else}
      {#if parts.looked.length === 0}
        <p class="small first-time">
          {t("ledger-first-time", { count: parts.toLook.length })}
        </p>
      {/if}
      {@render list(parts.toLook, toLookPage.items, true)}
      <Pager
        page={toLookPage.page}
        pages={toLookPage.pages}
        first={toLookPage.first}
        last={toLookPage.last}
        total={toLookPage.total}
        label={t("ledger-pages-to-look")}
        onchange={(page) => (lookPage = page)}
      />
    {/if}
    {#if parts.looked.length > 0}
      <button
        type="button"
        class="action"
        aria-expanded={showLooked}
        onclick={() => (showLooked = !showLooked)}
        >{showLooked
          ? t("ledger-hide-looked")
          : t("ledger-show-looked", { count: parts.looked.length })}</button
      >
      {#if showLooked}
        {@render list(parts.looked, lookedPaged.items, false)}
        <Pager
          page={lookedPaged.page}
          pages={lookedPaged.pages}
          first={lookedPaged.first}
          last={lookedPaged.last}
          total={lookedPaged.total}
          label={t("ledger-pages-looked")}
          onchange={(page) => (lookedPage = page)}
        />
      {/if}
    {/if}
  {/if}
</section>

{#snippet list(all: LedgerItem[], items: LedgerItem[], toLook: boolean)}
  <ol
    class="items"
    aria-label={toLook ? t("ledger-title") : t("ledger-looked-title")}
  >
    {#each items as item (`${item.repository}/${item.id}`)}
      <li class="item what-{item.change.what}">
        <div class="item-text">
          <p class="item-head">
            <span class="what">{t(WHAT_WORDS[item.change.what])}</span>
            <strong>{item.change.label ?? item.change.key}</strong>
            <span class="muted small"
              >{item.change.product ?? item.change.mod ?? ""}</span
            >
          </p>
          <p class="small">
            {valueWords(item)}
            {#if item.change.label}<code class="key">{item.change.key}</code
              >{/if}
          </p>
          <p class="muted small">
            {item.change.commit
              ? t("ledger-when", {
                  day: formatDay(item.change.time),
                  subject: item.change.subject ?? "",
                })
              : t("ledger-not-committed")}
          </p>
        </div>
        <div class="buttons">
          {#if item.change.commit}
            <button
              type="button"
              class="action"
              aria-label={t("ledger-see-change-for", {
                name: item.change.label ?? item.change.key,
              })}
              onclick={() => seeChange(item)}>{t("ledger-see-change")}</button
            >
          {/if}
          <button
            type="button"
            class="action"
            disabled={busy}
            aria-label={toLook
              ? t("ledger-look-for", {
                  name: item.change.label ?? item.change.key,
                })
              : t("ledger-unlook-for", {
                  name: item.change.label ?? item.change.key,
                })}
            onclick={() => mark([item], toLook)}
            >{toLook ? t("ledger-look") : t("ledger-unlook")}</button
          >
        </div>
      </li>
    {/each}
  </ol>
  {#if all.length === 0}
    <p class="small">{t("ledger-none-here")}</p>
  {/if}
{/snippet}

<style>
  .ledger {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-block: 16px;
    padding: 16px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
    overflow-wrap: anywhere;
  }

  .ledger > p {
    margin: 0;
  }

  .ledger > .action {
    align-self: flex-start;
  }

  .head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px 16px;
  }

  h2 {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0;
    font-size: 1.25rem;
  }

  .count {
    min-width: 1.8em;
    padding: 1px 8px;
    font-size: var(--type-small);
    font-variant-numeric: tabular-nums;
    text-align: center;
    color: var(--colour-canvas);
    background: var(--colour-accent);
    border-radius: 999px;
  }

  .count.none {
    color: var(--colour-text);
    background: var(--colour-surface-soft);
  }

  .first-time {
    padding: 8px 10px;
    border-inline-start: 3px solid var(--colour-accent);
    background: var(--colour-surface-soft);
  }

  .items {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .item {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 6px 12px;
    padding: 8px 12px;
    background: var(--colour-surface);
    border: 1px solid var(--colour-line);
    border-inline-start-width: 3px;
    border-radius: 4px;
  }

  .what-added {
    border-inline-start-color: var(--colour-accent);
  }

  .what-default {
    border-inline-start-color: var(--colour-observed);
  }

  .what-removed {
    border-inline-start-color: var(--colour-risk);
  }

  .item-text {
    flex: 1 1 22em;
    min-width: 0;
  }

  .item-text p {
    margin: 0;
  }

  .item-head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 2px 10px;
  }

  .what {
    font-size: var(--type-small);
    font-weight: 600;
    color: var(--colour-text-muted);
  }

  .key {
    margin-inline-start: 6px;
    color: var(--colour-text-muted);
  }

  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
</style>
