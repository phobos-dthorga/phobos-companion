<script lang="ts">
  import { LOCALE, t } from "../i18n/runtime";
  import type { GameHome } from "../home/types";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import Pager from "../shell/Pager.svelte";
  import Placeholder from "../shell/Placeholder.svelte";
  import { formatUnixDate, formatWhen } from "../shell/dates";
  import { pageOf } from "../shell/paging";
  import { formatSize } from "../shell/sizes";
  import type { Failure } from "../shell/types";
  import { savePath, sinceMoment, spaceRows } from "./presentation";
  import type { GameFiles, Since } from "./types";
  import { readGameFiles, showGameFile } from "./desktopClient";

  /**
   * Game files (0.22.0; docs/later.md, item 5), for any Steam game: what changed since you last played, the saves, the
   * screenshots, and where the space goes. Read only: Show in folder opens the file manager on a file the page listed.
   */
  let { game }: { game: GameHome } = $props();

  const SAVES_PER_PAGE = 10;
  const SHOTS_SHOWN = 12;
  const MODS_SHOWN = 30;
  const SPACE_ROWS = 12;
  const SINCE: { id: Since; key: string }[] = [
    { id: "launch", key: "gamefiles-since-launch" },
    { id: "day", key: "gamefiles-since-day" },
    { id: "week", key: "gamefiles-since-week" },
  ];

  type Reading =
    | { state: "reading" }
    | { state: "ready"; files: GameFiles }
    | { state: "failed"; failure: Failure };

  let reading = $state<Reading>({ state: "reading" });
  let since = $state<Since>("launch");
  let savesPage = $state(1);
  let shown = $state<string | null>(null);

  async function load() {
    reading = { state: "reading" };
    const answer = await readGameFiles(game.id, sinceMoment(since, new Date()));
    reading =
      answer.state === "ready"
        ? { state: "ready", files: answer.files }
        : { state: "failed", failure: answer.failure };
  }

  async function show(path: string | null) {
    if (!path) return;
    const answer = await showGameFile(path);
    shown = answer.state === "ready" ? null : answer.failure.detail;
  }

  $effect(() => {
    void since;
    void load();
  });

  const size = (bytes: number | null | undefined) =>
    bytes == null ? "" : formatSize(bytes, LOCALE);
</script>

<div class="eyebrow accent">{t("gamefiles-kicker")}</div>
<h1>{t("gamefiles-title", { game: game.name })}</h1>
<p class="lead">{t("gamefiles-lead")}</p>

{#if shown}
  <p class="told refused" role="status">
    {t("gamefiles-show-failed", { reason: shown })}
  </p>
{/if}

{#if reading.state === "reading"}
  <p class="muted">{t("gamefiles-reading")}</p>
  <Placeholder shape="rows" />
{:else if reading.state === "failed"}
  <FailurePanel failure={reading.failure} onretry={load} />
{:else}
  {@const files = reading.files}
  <section class="panel" aria-labelledby="gamefiles-changed">
    <h2 id="gamefiles-changed">{t("gamefiles-changed-title")}</h2>
    <div class="since" role="group" aria-label={t("gamefiles-since-label")}>
      {#each SINCE as choice (choice.id)}
        <button
          type="button"
          class="action"
          aria-pressed={since === choice.id}
          onclick={() => (since = choice.id)}>{t(choice.key)}</button
        >
      {/each}
    </div>
    {#if files.game === null}
      <p>{t("gamefiles-not-steam", { game: game.name })}</p>
    {:else}
      <p class:news={files.changed.gameUpdated}>
        {files.changed.gameUpdated
          ? t("gamefiles-game-updated", {
              build: files.game.buildId ?? "",
              when: formatWhen(files.game.lastUpdatedAt),
            })
          : t("gamefiles-game-same", {
              build: files.game.buildId ?? "",
              when: formatWhen(files.game.lastUpdatedAt),
            })}
      </p>
      <p class="muted small">
        {t("gamefiles-since-words", { when: formatWhen(files.changed.since) })}
      </p>
      <p class="count">
        {t("gamefiles-mods-updated", {
          count: files.changed.workshopCount,
          installed: files.changed.workshopInstalled,
        })}
      </p>
      {#if files.changed.workshop.length > 0}
        <ul class="rows">
          {#each files.changed.workshop.slice(0, MODS_SHOWN) as item (item.id)}
            <li>
              <span>{item.title ?? t("gamefiles-mod-id", { id: item.id })}</span
              >
              <span class="muted small">{formatWhen(item.updatedAt)}</span>
            </li>
          {/each}
        </ul>
      {/if}
    {/if}
  </section>

  <section class="panel" aria-labelledby="gamefiles-saves">
    <h2 id="gamefiles-saves">{t("gamefiles-saves-title")}</h2>
    {#if files.places.saves === null}
      <p>{t("gamefiles-no-saves")}</p>
    {:else}
      <p class="count">
        {t("gamefiles-saves-count", {
          count: files.saves.count,
          size: size(files.saves.bytes),
          autosaves: files.saves.autosaves,
        })}
      </p>
      {@const paged = pageOf(files.saves.list, savesPage, SAVES_PER_PAGE)}
      <table>
        <thead>
          <tr>
            <th scope="col">{t("gamefiles-save")}</th>
            <th scope="col">{t("gamefiles-size")}</th>
            <th scope="col">{t("gamefiles-modified")}</th>
            <th scope="col"
              ><span class="visually-hidden">{t("gamefiles-actions")}</span></th
            >
          </tr>
        </thead>
        <tbody>
          {#each paged.items as save (save.name)}
            <tr>
              <td>
                {save.name}
                {#if save.auto}<span class="tag">{t("gamefiles-autosave")}</span
                  >{/if}
              </td>
              <td class="number">{size(save.bytes)}</td>
              <td>{formatUnixDate(save.modified)}</td>
              <td>
                <button
                  type="button"
                  class="action"
                  aria-label={t("gamefiles-show-named", { name: save.name })}
                  onclick={() => show(savePath(files, save.file, save.name))}
                  >{t("gamefiles-show")}</button
                >
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
      <Pager
        page={paged.page}
        pages={paged.pages}
        first={paged.first}
        last={paged.last}
        total={paged.total}
        label={t("gamefiles-saves-title")}
        onchange={(next) => (savesPage = next)}
      />
    {/if}
  </section>

  <section class="panel" aria-labelledby="gamefiles-shots">
    <h2 id="gamefiles-shots">{t("gamefiles-shots-title")}</h2>
    {#if files.places.screenshots.length === 0}
      <p>{t("gamefiles-no-shots")}</p>
    {:else}
      <p class="count">
        {t("gamefiles-shots-count", {
          count: files.screenshots.count,
          size: size(files.screenshots.bytes),
        })}
      </p>
      <ul class="rows">
        {#each files.screenshots.list.slice(0, SHOTS_SHOWN) as shot (shot.path)}
          <li>
            <span>{shot.name}</span>
            <span class="muted small">{formatUnixDate(shot.taken)}</span>
            <button
              type="button"
              class="action"
              aria-label={t("gamefiles-show-named", { name: shot.name })}
              onclick={() => show(shot.path)}>{t("gamefiles-show")}</button
            >
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section class="panel" aria-labelledby="gamefiles-space">
    <h2 id="gamefiles-space">{t("gamefiles-space-title")}</h2>
    {#if files.places.data === null && files.game === null}
      <p>{t("gamefiles-no-data")}</p>
    {:else}
      {#if files.places.data === null}<p>{t("gamefiles-no-data")}</p>{/if}
      <ul class="space">
        {#each spaceRows(files, t("gamefiles-space-install"), t("gamefiles-space-workshop"), SPACE_ROWS) as row (row.name)}
          <li>
            <span class="space-name">{row.name}</span>
            <span class="meter" aria-hidden="true"
              ><span style:width={`${Math.max(1, row.share * 100)}%`}
              ></span></span
            >
            <span class="number">{size(row.bytes)}</span>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
  <p class="muted small">{t("gamefiles-places-how")}</p>
{/if}

<style>
  .panel {
    margin-bottom: 16px;
    padding: 18px 22px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  h2 {
    margin-bottom: 8px;
    font-family: var(--font-display);
    font-size: 1.375rem;
    font-weight: 600;
  }

  .since {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 10px;
  }

  .since [aria-pressed="true"] {
    font-weight: 600;
    border-color: var(--colour-accent);
  }

  .news {
    font-weight: 600;
    color: var(--colour-accent);
  }

  .count {
    color: var(--colour-comparison);
  }

  .rows {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .rows li {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 14px;
    padding-block: 6px;
    border-top: 1px solid var(--colour-line);
    overflow-wrap: anywhere;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th,
  td {
    padding: 6px 8px;
    text-align: start;
    border-top: 1px solid var(--colour-line);
    overflow-wrap: anywhere;
  }

  .number {
    text-align: end;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .tag {
    margin-left: 8px;
    padding: 1px 8px;
    font-size: var(--type-small);
    color: var(--colour-text-muted);
    border: 1px solid var(--colour-line);
    border-radius: 999px;
  }

  .space {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .space li {
    display: grid;
    grid-template-columns: minmax(8rem, 14rem) 1fr auto;
    align-items: center;
    gap: 12px;
    padding-block: 5px;
  }

  .space-name {
    overflow-wrap: anywhere;
  }

  .meter {
    height: 10px;
    background: var(--colour-surface);
    border-radius: 4px;
    overflow: hidden;
  }

  .meter span {
    display: block;
    height: 100%;
    background: var(--colour-comparison);
    border-radius: 4px;
  }

  .told {
    padding: 6px 10px;
    border: 1px solid var(--colour-risk);
    border-radius: 4px;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
</style>
