<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import Pager from "../shell/Pager.svelte";
  import Placeholder from "../shell/Placeholder.svelte";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import { heard, started } from "../shell/progress";
  import FieldList from "./FieldList.svelte";
  import PathChain from "./PathChain.svelte";
  import {
    formatCount,
    formatMemory,
    HOLDERS_MAX,
    PAGE_SIZE,
    pagerOf,
    skipOf,
  } from "./presentation";
  import {
    openKind,
    openObject,
    question,
    remembered,
    type Opened,
  } from "./snapshot.svelte";
  import type {
    AnswerReading,
    Holders,
    ObjectData,
    PathAnswer,
    Request,
  } from "./types";

  /**
   * One object of the held snapshot in full: every value it holds, a list's, dictionary's or set's items a page at a time, and
   * on request **What holds it** and **Why is it still in memory?** (one path from where the game keeps it). Every other object it
   * names opens with a press, as a step on the trail.
   */
  let { object }: { object: Opened } = $props();

  let itemsPage = $state(1);
  let reading = $state<AnswerReading<ObjectData>>({ state: "reading" });
  let progress = $state(started());
  let holders = $state<AnswerReading<Holders> | null>(null);
  let holdersProgress = $state(started());
  let path = $state<AnswerReading<PathAnswer> | null>(null);
  let pathProgress = $state(started());

  const request = $derived<Request>({
    op: "object",
    address: object.address,
    skip: skipOf(itemsPage),
    take: PAGE_SIZE,
  });
  const holdersRequest = $derived<Request>({
    op: "holders",
    address: object.address,
    max: HOLDERS_MAX,
  });
  const pathRequest = $derived<Request>({
    op: "path",
    address: object.address,
  });
  const found = $derived(
    reading.state === "ready" && reading.answer.ok ? reading.answer.data : null,
  );
  const listed = $derived(
    found?.kind === "array"
      ? {
          items: found.elements ?? [],
          total: found.length ?? 0,
          kind: "array",
        }
      : found?.items
        ? {
            items: found.items.items,
            total: found.items.count,
            kind: found.items.kind,
          }
        : null,
  );
  const pager = $derived(
    listed ? pagerOf(itemsPage, listed.items.length, listed.total) : null,
  );
  const holdersAnswer = $derived(
    holders?.state === "ready" && holders.answer.ok
      ? holders.answer.data
      : null,
  );
  const pathAnswer = $derived(
    path?.state === "ready" && path.answer.ok ? path.answer.data : null,
  );

  async function load(asked: Request) {
    const known = remembered<ObjectData>(asked);
    if (known) {
      reading = { state: "ready", answer: known };
      return;
    }
    reading = { state: "reading" };
    progress = started();
    const answer = await question<ObjectData>(asked, (message) => {
      progress = heard(progress, message);
    });
    if (JSON.stringify(asked) === JSON.stringify(request)) reading = answer;
  }

  $effect(() => {
    void load(request);
  });

  onMount(() => {
    const knownHolders = remembered<Holders>(holdersRequest);
    if (knownHolders) holders = { state: "ready", answer: knownHolders };
    const knownPath = remembered<PathAnswer>(pathRequest);
    if (knownPath) path = { state: "ready", answer: knownPath };
  });

  async function askHolders() {
    holders = { state: "reading" };
    holdersProgress = started();
    holders = await question<Holders>(holdersRequest, (message) => {
      holdersProgress = heard(holdersProgress, message);
    });
  }

  async function askPath() {
    path = { state: "reading" };
    pathProgress = started();
    path = await question<PathAnswer>(pathRequest, (message) => {
      pathProgress = heard(pathProgress, message);
    });
  }

  const itemsKey = $derived(
    listed
      ? {
          array: "explorer-items-array",
          list: "explorer-items-list",
          dictionary: "explorer-items-dictionary",
          set: "explorer-items-set",
        }[listed.kind as "array" | "list" | "dictionary" | "set"]
      : "",
  );
</script>

<section class="view" aria-labelledby="explorer-object">
  <h2 id="explorer-object">{object.type}</h2>
  <p class="small">
    <span class="address">{object.address}</span>
    {#if object.summary}· {object.summary}{/if}
  </p>
  <button type="button" class="action" onclick={() => openKind(object.type)}
    >{t("explorer-object-kind-button")}</button
  >

  {#if reading.state === "reading"}
    <ProgressBar {progress} fallback={t("explorer-bar-object")} />
    <Placeholder shape="rows" rows={6} />
  {:else if reading.state === "failed"}
    <FailurePanel
      failure={reading.failure}
      onretry={() => void load(request)}
    />
  {:else if reading.state === "ready" && !reading.answer.ok && !reading.answer.released}
    <p class="said wrong" role="status">
      {t("explorer-could-not-answer", { reason: reading.answer.error ?? "" })}
    </p>
  {:else if found}
    <dl class="facts">
      <div>
        <dt>{t("explorer-object-size")}</dt>
        <dd>{formatMemory(found.size)}</dd>
      </div>
      <div>
        <dt>{t("explorer-object-module")}</dt>
        <dd>{found.module || t("explorer-unknown")}</dd>
      </div>
      {#if found.static}
        <div>
          <dt>{t("explorer-object-static")}</dt>
          <dd>{found.static}</dd>
        </div>
      {/if}
    </dl>

    {#if found.kind === "text"}
      <h3>{t("explorer-object-text")}</h3>
      <pre class="text">{found.text ?? ""}</pre>
    {/if}
    {#if found.fields && found.fields.length > 0}
      <h3 id="explorer-fields">{t("explorer-object-fields")}</h3>
      <FieldList
        fields={found.fields}
        label={t("explorer-object-fields")}
        onopen={openObject}
      />
    {:else if found.kind === "object"}
      <p class="muted">{t("explorer-object-no-fields")}</p>
    {/if}
    {#if listed && pager}
      <h3>{t(itemsKey, { count: formatCount(listed.total) })}</h3>
      {#if listed.items.length > 0}
        <FieldList
          fields={listed.items}
          label={t(itemsKey, { count: formatCount(listed.total) })}
          onopen={openObject}
        />
      {:else}
        <p class="muted">{t("explorer-items-none")}</p>
      {/if}
      <Pager
        page={pager.page}
        pages={pager.pages}
        first={pager.first}
        last={pager.last}
        total={pager.total}
        plain
        label={t(itemsKey, { count: formatCount(listed.total) })}
        onchange={(next) => (itemsPage = next)}
      />
    {/if}
  {/if}

  <section class="panel" aria-labelledby="explorer-holders">
    <h3 id="explorer-holders">{t("explorer-holders-title")}</h3>
    <p class="small muted">{t("explorer-holders-how")}</p>
    <button
      type="button"
      class="action"
      disabled={holders?.state === "reading"}
      onclick={() => void askHolders()}
      >{holders?.state === "reading"
        ? t("explorer-working")
        : t("explorer-holders-button")}</button
    >
    {#if holders?.state === "reading"}
      <ProgressBar
        progress={holdersProgress}
        fallback={t("explorer-bar-holders")}
      />
    {:else if holders?.state === "failed"}
      <FailurePanel
        failure={holders.failure}
        onretry={() => void askHolders()}
      />
    {:else if holders?.state === "ready" && !holders.answer.ok && !holders.answer.released}
      <p class="said wrong" role="status">
        {t("explorer-could-not-answer", { reason: holders.answer.error ?? "" })}
      </p>
    {:else if holdersAnswer}
      {#if holdersAnswer.static}
        <p>{t("explorer-held-static", { name: holdersAnswer.static })}</p>
      {/if}
      {#if holdersAnswer.roots.length > 0}
        <p>
          {t("explorer-held-roots", { roots: holdersAnswer.roots.join(", ") })}
        </p>
      {/if}
      {#if holdersAnswer.holders.length === 0}
        <p>{t("explorer-holders-none")}</p>
      {:else}
        <ul class="holders" aria-labelledby="explorer-holders">
          {#each holdersAnswer.holders as holder (holder.address)}
            <li>
              <button
                type="button"
                class="action item"
                onclick={() =>
                  openObject({
                    address: holder.address,
                    type: holder.type,
                    summary: holder.summary,
                  })}
              >
                <span class="kind">{holder.type}</span>
                {#if holder.summary}<span class="muted">{holder.summary}</span
                  >{/if}
                <span class="small muted"
                  >{holder.address} · {formatMemory(holder.size)}</span
                >
              </button>
              {#if holder.field}
                <span class="small muted"
                  >{t("explorer-path-through", { field: holder.field })}</span
                >
              {/if}
            </li>
          {/each}
        </ul>
        {#if holdersAnswer.more}
          <p class="small muted">
            {t("explorer-holders-more", { count: HOLDERS_MAX })}
          </p>
        {/if}
      {/if}
    {/if}
  </section>

  <section class="panel" aria-labelledby="explorer-path">
    <h3 id="explorer-path">{t("explorer-why-title")}</h3>
    <p class="small muted">{t("explorer-path-how")}</p>
    <button
      type="button"
      class="action"
      disabled={path?.state === "reading"}
      onclick={() => void askPath()}
      >{path?.state === "reading"
        ? t("explorer-working")
        : t("explorer-why-button")}</button
    >
    {#if path?.state === "reading"}
      <ProgressBar progress={pathProgress} fallback={t("explorer-bar-why")} />
    {:else if path?.state === "failed"}
      <FailurePanel failure={path.failure} onretry={() => void askPath()} />
    {:else if path?.state === "ready" && !path.answer.ok && !path.answer.released}
      <p class="said wrong" role="status">
        {t("explorer-could-not-answer", { reason: path.answer.error ?? "" })}
      </p>
    {:else if pathAnswer}
      {#if pathAnswer.path}
        <PathChain
          path={pathAnswer.path}
          label={t("explorer-path-label", { number: 1 })}
          onopen={openObject}
        />
      {:else if pathAnswer.unreachable}
        <p class="said">{t("explorer-path-unreachable")}</p>
      {:else}
        <p>{t("explorer-path-timed-out")}</p>
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
    margin: 16px 0 4px;
    font-size: var(--type-body);
  }

  .panel h3 {
    margin-top: 0;
  }

  .address {
    font-family: var(--font-mono, ui-monospace, Consolas, monospace);
  }

  .facts {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 24px;
    margin: 10px 0;
  }

  .facts dt {
    font-size: var(--type-small);
    color: var(--colour-text-muted);
  }

  .facts dd {
    margin: 0;
  }

  .text {
    margin: 0;
    padding: 8px 10px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    background: var(--colour-surface-soft);
    border-radius: 4px;
    font-family: var(--font-mono, ui-monospace, Consolas, monospace);
  }

  .panel {
    margin-block: 16px;
    padding: 12px 14px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .holders {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 8px 0 0;
    padding: 0;
    list-style: none;
  }

  .item {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 12px;
    max-width: 100%;
    text-align: start;
  }

  .kind {
    font-weight: 600;
  }

  .said.wrong {
    color: var(--colour-risk);
  }
</style>
