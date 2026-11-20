<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import { setFocus } from "../navigation/navigation.svelte";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import Pager from "../shell/Pager.svelte";
  import Placeholder from "../shell/Placeholder.svelte";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import { heard, started } from "../shell/progress";
  import PathChain from "./PathChain.svelte";
  import {
    formatCount,
    formatMemory,
    kindPager,
    MAX_MATCH,
    PAGE_SIZE,
    skipOf,
    WHY_SAMPLE,
  } from "./presentation";
  import { openObject, question, remembered } from "./snapshot.svelte";
  import type { AnswerReading, KindPage, Request, WhyAnswer } from "./types";

  /**
   * One kind's objects in the held snapshot, a page at a time, as found or largest first, narrowed by a word in their
   * descriptions; each opens the object. **Why is it still in memory?** follows paths from where the game keeps them down to a few
   * of the largest. The filter, the order and the page are part of the place, so Back returns to them.
   */
  let {
    kind,
    match,
    largest,
    page,
  }: { kind: string; match: string; largest: boolean; page: number } = $props();

  let reading = $state<AnswerReading<KindPage>>({ state: "reading" });
  let progress = $state(started());
  // svelte-ignore state_referenced_locally
  let filter = $state(match);
  let why = $state<AnswerReading<WhyAnswer> | null>(null);
  let whyProgress = $state(started());

  const request = $derived<Request>({
    op: "kind",
    type: kind,
    skip: skipOf(page),
    take: PAGE_SIZE,
    sort: largest ? "size" : "",
    match,
  });
  const whyRequest = $derived<Request>({
    op: "why",
    type: kind,
    sample: WHY_SAMPLE,
  });
  const found = $derived(
    reading.state === "ready" && reading.answer.ok ? reading.answer.data : null,
  );
  const pager = $derived(found ? kindPager(found, page) : null);
  const whyAnswer = $derived(
    why?.state === "ready" && why.answer.ok ? why.answer.data : null,
  );

  async function load(asked: Request) {
    const known = remembered<KindPage>(asked);
    if (known) {
      reading = { state: "ready", answer: known };
      return;
    }
    reading = { state: "reading" };
    progress = started();
    const answer = await question<KindPage>(asked, (message) => {
      progress = heard(progress, message);
    });
    if (JSON.stringify(asked) === JSON.stringify(request)) reading = answer;
  }

  $effect(() => {
    void load(request);
  });

  // Back and Forward bring the filter of that step with them.
  $effect(() => {
    filter = match;
  });

  onMount(() => {
    const known = remembered<WhyAnswer>(whyRequest);
    if (known) why = { state: "ready", answer: known };
  });

  async function askWhy() {
    why = { state: "reading" };
    whyProgress = started();
    why = await question<WhyAnswer>(whyRequest, (message) => {
      whyProgress = heard(whyProgress, message);
    });
  }

  function applyFilter(event: SubmitEvent) {
    event.preventDefault();
    setFocus({ match: filter.trim(), page: "1" });
  }

  function clearFilter() {
    filter = "";
    setFocus({ match: "", page: "1" });
  }
</script>

<section class="view" aria-labelledby="explorer-kind">
  <h2 id="explorer-kind">{kind}</h2>
  {#if found}
    <p class="small">
      {t("explorer-kind-figures", {
        count: formatCount(found.count),
        memory: formatMemory(found.totalBytes),
      })}
    </p>
  {/if}

  <div class="controls">
    <form class="filter" onsubmit={applyFilter}>
      <label for="explorer-filter" class="small muted"
        >{t("explorer-filter-label")}</label
      >
      <div class="row">
        <input
          id="explorer-filter"
          type="text"
          maxlength={MAX_MATCH}
          bind:value={filter}
          placeholder={t("explorer-filter-placeholder")}
        />
        <button type="submit" class="action"
          >{t("explorer-filter-button")}</button
        >
        {#if match}
          <button type="button" class="action" onclick={clearFilter}
            >{t("explorer-filter-clear")}</button
          >
        {/if}
      </div>
    </form>
    <div class="toggles" role="group" aria-label={t("explorer-order-label")}>
      <button
        type="button"
        class="toggle"
        aria-pressed={!largest}
        onclick={() => setFocus({ largest: "", page: "1" })}
        >{t("explorer-order-found")}</button
      >
      <button
        type="button"
        class="toggle"
        aria-pressed={largest}
        onclick={() => setFocus({ largest: "yes", page: "1" })}
        >{t("explorer-order-largest")}</button
      >
    </div>
  </div>

  {#if reading.state === "reading"}
    <ProgressBar {progress} fallback={t("explorer-bar-kind")} />
    <Placeholder shape="rows" rows={5} />
  {:else if reading.state === "failed"}
    <FailurePanel
      failure={reading.failure}
      onretry={() => void load(request)}
    />
  {:else if reading.state === "ready" && !reading.answer.ok && !reading.answer.released}
    <p class="said wrong" role="status">
      {t("explorer-could-not-answer", { reason: reading.answer.error ?? "" })}
    </p>
  {:else if found && pager}
    {#if found.items.length === 0}
      <p class="muted">
        {match
          ? t("explorer-kind-none-match", { match })
          : t("explorer-kind-none")}
      </p>
    {:else}
      <ul class="items" aria-label={t("explorer-kind-items", { kind })}>
        {#each found.items as item (item.address)}
          <li>
            <button
              type="button"
              class="action item"
              onclick={() =>
                openObject({
                  address: item.address,
                  type: kind,
                  summary: item.summary,
                })}
            >
              <span class="address">{item.address}</span>
              <span class="size">{formatMemory(item.size)}</span>
              <span class="summary"
                >{item.summary || t("explorer-no-summary")}</span
              >
            </button>
          </li>
        {/each}
      </ul>
    {/if}
    <Pager
      page={pager.page}
      pages={pager.pages}
      first={pager.first}
      last={pager.last}
      total={pager.total}
      more={found.more}
      plain
      label={t("explorer-kind-items", { kind })}
      onchange={(next) => setFocus({ page: String(next) })}
    />
  {/if}

  <section class="panel" aria-labelledby="explorer-kind-why">
    <h3 id="explorer-kind-why">{t("explorer-why-title")}</h3>
    <p class="small muted">
      {t("explorer-kind-why-how", { sample: WHY_SAMPLE })}
    </p>
    <button
      type="button"
      class="action"
      disabled={why?.state === "reading"}
      onclick={() => void askWhy()}
      >{why?.state === "reading"
        ? t("explorer-working")
        : t("explorer-why-button")}</button
    >
    {#if why?.state === "reading"}
      <ProgressBar progress={whyProgress} fallback={t("explorer-bar-why")} />
    {:else if why?.state === "failed"}
      <FailurePanel failure={why.failure} onretry={() => void askWhy()} />
    {:else if why?.state === "ready" && !why.answer.ok && !why.answer.released}
      <p class="said wrong" role="status">
        {t("explorer-could-not-answer", { reason: why.answer.error ?? "" })}
      </p>
    {:else if whyAnswer}
      {#if whyAnswer.noneReachable}
        <p>{t("explorer-why-none-held", { checked: whyAnswer.checked })}</p>
      {:else if whyAnswer.paths.length === 0 && whyAnswer.timedOut}
        <p>{t("explorer-path-timed-out")}</p>
      {:else if whyAnswer.paths.length === 0}
        <p>{t("explorer-why-none")}</p>
      {/if}
      {#each whyAnswer.paths as path, index (index)}
        <PathChain
          {path}
          label={t("explorer-path-label", { number: index + 1 })}
          onopen={openObject}
        />
      {/each}
      {#if whyAnswer.paths.length > 0 && whyAnswer.timedOut}
        <p class="small muted">{t("explorer-why-partial")}</p>
      {/if}
    {/if}
  </section>
</section>

<style>
  .view {
    margin-block: 12px;
    overflow-wrap: anywhere;
  }

  h2 {
    margin: 0 0 4px;
    font-size: var(--type-lead);
  }

  h3 {
    margin: 0 0 4px;
    font-size: var(--type-body);
  }

  .controls {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 10px 20px;
    margin-block: 10px;
  }

  .filter {
    flex: 1 1 320px;
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 4px;
  }

  input[type="text"] {
    flex: 1 1 200px;
    min-height: var(--control-min);
    padding-inline: 10px;
    font: inherit;
    color: var(--colour-text);
    background: var(--colour-surface);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .items {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .item {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 14px;
    width: 100%;
    text-align: start;
  }

  .address {
    font-family: var(--font-mono, ui-monospace, Consolas, monospace);
  }

  .size {
    font-variant-numeric: tabular-nums;
    color: var(--colour-text-muted);
  }

  .panel {
    margin-block: 16px;
    padding: 12px 14px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .said.wrong {
    color: var(--colour-risk);
  }
</style>
