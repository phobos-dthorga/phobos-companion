<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import Pager from "../shell/Pager.svelte";
  import Placeholder from "../shell/Placeholder.svelte";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import { pageOf } from "../shell/paging";
  import { heard, started } from "../shell/progress";
  import {
    formatCount,
    formatMemory,
    ownerKindKey,
    TABLE_PAGE,
  } from "./presentation";
  import { openKind, question, remembered } from "./snapshot.svelte";
  import type { AnswerReading, Overview } from "./types";

  /**
   * What is in the held snapshot: its figures, who the memory belongs to and the largest kinds, each kind a press away. Asked at
   * once when the snapshot is taken (reading every object takes a while on a large game), and remembered while it is held.
   */
  const REQUEST = { op: "overview" } as const;

  let reading = $state<AnswerReading<Overview>>({ state: "reading" });
  let progress = $state(started());
  let ownersPage = $state(1);
  let kindsPage = $state(1);

  const overview = $derived(
    reading.state === "ready" && reading.answer.ok ? reading.answer.data : null,
  );
  const owners = $derived(
    pageOf(overview?.owners ?? [], ownersPage, TABLE_PAGE),
  );
  const kinds = $derived(pageOf(overview?.types ?? [], kindsPage, TABLE_PAGE));

  async function load() {
    const known = remembered<Overview>(REQUEST);
    if (known) {
      reading = { state: "ready", answer: known };
      return;
    }
    reading = { state: "reading" };
    progress = started();
    reading = await question<Overview>(REQUEST, (message) => {
      progress = heard(progress, message);
    });
  }

  onMount(() => void load());
</script>

<section class="view" aria-labelledby="explorer-overview">
  <h2 id="explorer-overview">{t("explorer-overview-title")}</h2>
  {#if reading.state === "reading"}
    <ProgressBar {progress} fallback={t("explorer-bar-overview")} />
    <Placeholder shape="rows" rows={6} />
  {:else if reading.state === "failed"}
    <FailurePanel failure={reading.failure} onretry={() => void load()} />
  {:else if reading.state === "ready" && !reading.answer.ok && !reading.answer.released}
    <p class="said wrong" role="status">
      {t("explorer-could-not-answer", { reason: reading.answer.error ?? "" })}
    </p>
    <button type="button" class="action" onclick={() => void load()}
      >{t("action-try-again")}</button
    >
  {:else if overview}
    <dl class="tiles">
      <div class="tile">
        <dt>{t("explorer-tile-objects")}</dt>
        <dd>{formatCount(overview.totalObjects)}</dd>
      </div>
      <div class="tile">
        <dt>{t("explorer-tile-memory")}</dt>
        <dd>{formatMemory(overview.totalBytes)}</dd>
      </div>
      <div class="tile">
        <dt>{t("explorer-tile-free")}</dt>
        <dd>{formatMemory(overview.freeBytes)}</dd>
      </div>
      <div class="tile">
        <dt>{t("explorer-tile-kinds")}</dt>
        <dd>{formatCount(overview.typeCount)}</dd>
      </div>
    </dl>
    <p class="small muted">{t("explorer-free-how")}</p>
    <p class="small">{t("explorer-garbage-note")}</p>
    {#if overview.notes.length > 0}
      <ul class="notes">
        {#each overview.notes as note, index (index)}
          <li class="small muted">{note}</li>
        {/each}
      </ul>
    {/if}

    <h3 id="explorer-owners">{t("explorer-owners-title")}</h3>
    <p class="small muted">{t("explorer-owners-how")}</p>
    <div class="table-wrap">
      <table aria-labelledby="explorer-owners">
        <thead>
          <tr>
            <th scope="col">{t("explorer-column-owner")}</th>
            <th scope="col">{t("explorer-column-what")}</th>
            <th scope="col" class="number">{t("explorer-column-memory")}</th>
            <th scope="col" class="number">{t("explorer-column-objects")}</th>
          </tr>
        </thead>
        <tbody>
          {#each owners.items as owner (owner.name + owner.kind)}
            <tr>
              <td>{owner.name}</td>
              <td>{t(ownerKindKey(owner.kind))}</td>
              <td class="number">{formatMemory(owner.bytes)}</td>
              <td class="number">{formatCount(owner.count)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <Pager
      page={owners.page}
      pages={owners.pages}
      first={owners.first}
      last={owners.last}
      total={owners.total}
      plain
      label={t("explorer-owners-title")}
      onchange={(page) => (ownersPage = page)}
    />

    <h3 id="explorer-kinds">{t("explorer-kinds-title")}</h3>
    <p class="small muted">
      {t("explorer-kinds-how", {
        shown: overview.types.length,
        count: overview.typeCount,
      })}
    </p>
    <div class="table-wrap">
      <table aria-labelledby="explorer-kinds">
        <thead>
          <tr>
            <th scope="col">{t("explorer-column-kind")}</th>
            <th scope="col">{t("explorer-column-owner")}</th>
            <th scope="col" class="number">{t("explorer-column-memory")}</th>
            <th scope="col" class="number">{t("explorer-column-objects")}</th>
          </tr>
        </thead>
        <tbody>
          {#each kinds.items as kind (kind.type + kind.module)}
            <tr>
              <td>
                <button
                  type="button"
                  class="action kind"
                  onclick={() => openKind(kind.type)}>{kind.type}</button
                >
              </td>
              <td>
                {kind.owner}
                <span class="small muted"
                  >{t(ownerKindKey(kind.ownerKind))}</span
                >
                {#if kind.through}
                  <span class="small muted"
                    >{t("explorer-through-type", { type: kind.through })}</span
                  >
                {/if}
              </td>
              <td class="number">{formatMemory(kind.bytes)}</td>
              <td class="number">{formatCount(kind.count)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <Pager
      page={kinds.page}
      pages={kinds.pages}
      first={kinds.first}
      last={kinds.last}
      total={kinds.total}
      plain
      label={t("explorer-kinds-title")}
      onchange={(page) => (kindsPage = page)}
    />
    <p class="how muted">
      {t("explorer-overview-read", {
        seconds: overview.seconds,
        kept: overview.kept,
      })}
    </p>
  {/if}
</section>

<style>
  .view {
    margin-block: 12px;
    overflow-wrap: anywhere;
  }

  h2 {
    margin: 0 0 8px;
    font-size: var(--type-lead);
  }

  h3 {
    margin: 18px 0 4px;
    font-size: var(--type-body);
  }

  .tiles {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 10px;
    margin: 8px 0 6px;
  }

  .tile {
    padding: 8px 10px;
    background: var(--colour-surface-soft);
    border-radius: 4px;
  }

  .tile dt {
    font-size: var(--type-small);
    color: var(--colour-text-muted);
  }

  .tile dd {
    margin: 2px 0 0;
    font-size: var(--type-lead);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .notes {
    margin: 4px 0;
    padding-inline-start: 20px;
  }

  .table-wrap {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th,
  td {
    padding: 4px 8px;
    text-align: start;
    vertical-align: middle;
    border-bottom: 1px solid var(--colour-line);
  }

  th {
    font-size: var(--type-small);
    color: var(--colour-text-muted);
  }

  .number {
    text-align: end;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .kind {
    text-align: start;
    overflow-wrap: anywhere;
  }

  .said.wrong {
    color: var(--colour-risk);
  }
</style>
