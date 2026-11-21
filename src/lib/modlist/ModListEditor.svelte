<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import type { GameHome } from "../home/types";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import Pager from "../shell/Pager.svelte";
  import Placeholder from "../shell/Placeholder.svelte";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import { pageOf } from "../shell/paging";
  import { heard, started } from "../shell/progress";
  import type { Failure } from "../shell/types";
  import { register } from "../shortcuts/registry";
  import { editModList, readMods, undoEdit } from "./desktopClient";
  import {
    type From,
    type OnRow,
    type Show,
    fits,
    nameOf,
    offRows,
    onRows,
    placeFrom,
    withList,
  } from "./editor";
  import type { ModRow, ModsListing } from "./types";

  /**
   * Edit the list (0.46.0; the owner's choices of 22 Nov 2026): switch mods on and off and move them, each change saved at once
   * by the tools after a backup of the list; Undo the last change walks back one change at a time. Moves are by Move up and
   * Move down, a place typed into the box, or Move… then Put it here. Nothing needs a drag.
   */
  let { game }: { game: GameHome } = $props();

  const PER_PAGE = 40;
  const SHOWS: { id: Show; key: string }[] = [
    { id: "both", key: "modlist-edit-show-both" },
    { id: "on", key: "modlist-edit-show-on" },
    { id: "off", key: "modlist-edit-show-off" },
  ];
  const FROMS: { id: From; key: string }[] = [
    { id: "all", key: "modlist-edit-from-all" },
    { id: "workshop", key: "modlist-edit-from-workshop" },
    { id: "local", key: "modlist-edit-from-local" },
    { id: "game", key: "modlist-edit-from-game" },
  ];
  const SOURCE: Record<string, string> = {
    workshop: "modlist-edit-source-workshop",
    local: "modlist-edit-source-local",
    game: "modlist-edit-source-game",
  };

  type Reading =
    | { state: "reading" }
    | { state: "ready"; listing: ModsListing }
    | { state: "failed"; failure: Failure };

  let reading = $state<Reading>({ state: "reading" });
  let listKey = $state("");
  let search = $state("");
  let show = $state<Show>("both");
  let from = $state<From>("all");
  let onPage = $state(1);
  let offPage = $state(1);
  let picked = $state<{ id: string; name: string } | null>(null);
  let typed = $state<Record<string, string>>({});
  let busy = $state(false);
  let progress = $state(started());
  let said = $state<{ text: string; refused: boolean } | null>(null);

  function hearing() {
    return (m: Parameters<typeof heard>[1]) => {
      progress = heard(progress, m);
    };
  }

  async function load() {
    busy = true;
    progress = started(t("modlist-edit-reading"));
    const answer = await readMods(game.id, hearing());
    busy = false;
    if (answer.state === "ready") {
      reading = { state: "ready", listing: answer.listing };
      if (!answer.listing.lists.some((l) => l.key === listKey)) {
        listKey = answer.listing.lists[0]?.key ?? "";
      }
    } else if (answer.state === "failed") {
      reading = { state: "failed", failure: answer.failure };
    }
  }

  async function act(
    action: "remove" | "enable" | "move",
    id: string,
    place: number | null,
  ) {
    if (reading.state !== "ready") return;
    said = null;
    busy = true;
    progress = started(t("modlist-changing"));
    const answer = await editModList(
      game.id,
      listKey,
      action,
      id,
      place,
      hearing(),
    );
    busy = false;
    settle(answer, 1);
  }

  async function undo() {
    said = null;
    busy = true;
    progress = started(t("modlist-changing"));
    const answer = await undoEdit(game.id, listKey, hearing());
    busy = false;
    settle(answer, -1);
  }

  function settle(answer: Awaited<ReturnType<typeof undoEdit>>, step: 1 | -1) {
    if (answer.state === "failed") {
      said = {
        text: t("modlist-change-failed", { reason: answer.failure.detail }),
        refused: true,
      };
      return;
    }
    if (!answer.result.ok) {
      said = {
        text: t("modlist-change-failed", {
          reason: answer.result.refusal ?? "",
        }),
        refused: true,
      };
      return;
    }
    const { ids, keys } = answer.result.data;
    if (reading.state === "ready" && ids && keys) {
      reading = {
        state: "ready",
        listing: withList(reading.listing, listKey, ids, keys, step),
      };
    }
    picked = null;
    said = {
      text:
        step === 1
          ? t("modlist-edit-done", { change: answer.result.data.change ?? "" })
          : t("modlist-undone", { change: answer.result.data.undoes ?? "" }),
      refused: false,
    };
  }

  function moveTo(row: OnRow, length: number) {
    const place = placeFrom(typed[row.entry.key] ?? "", length);
    if (place === null) {
      said = {
        text: t("modlist-edit-place-bad", { count: length }),
        refused: true,
      };
      return;
    }
    typed = { ...typed, [row.entry.key]: "" };
    void act("move", row.entry.id, place);
  }

  const sourceWords = (mod: ModRow | null) =>
    mod
      ? t(SOURCE[mod.source] ?? "modlist-edit-source-local")
      : t("modlist-edit-not-here");

  onMount(() => {
    void load();
    return register({
      scope: "everywhere",
      inDialog: false,
      run: { "look-again": () => void load() },
    });
  });
</script>

{#if said}
  <p class="told" class:refused={said.refused} role="status">{said.text}</p>
{/if}

{#if reading.state === "reading"}
  <ProgressBar {progress} fallback={t("modlist-edit-reading")} />
  <Placeholder shape="rows" />
{:else if reading.state === "failed"}
  <FailurePanel failure={reading.failure} onretry={load} />
{:else if !reading.listing.supported}
  {#each reading.listing.notes as note, index (index)}
    <p>{note}</p>
  {/each}
{:else}
  {@const listing = reading.listing}
  {@const list = listing.lists.find((l) => l.key === listKey)}
  {@const running = listing.running.length > 0}
  {@const locked = busy || running || !list?.writable}
  {@const on = onRows(listing, listKey).filter((r) =>
    fits(r.mod, nameOf(r), search, from),
  )}
  {@const off = offRows(listing, listKey).filter((m) =>
    fits(m, m.name, search, from),
  )}
  {@const onPaged = pageOf(on, onPage, PER_PAGE)}
  {@const offPaged = pageOf(off, offPage, PER_PAGE)}
  {@const length = list?.entries.length ?? 0}

  {#if running}
    <p class="told refused" role="status">
      {t("modlist-running", { names: listing.running.join(", ") })}
    </p>
  {/if}

  <section class="panel controls" aria-label={t("modlist-edit-controls")}>
    {#if listing.lists.length > 1}
      <div
        class="buttons"
        role="group"
        aria-label={t("modlist-edit-which-list")}
      >
        {#each listing.lists as choice (choice.key)}
          <button
            type="button"
            class="action toggle"
            aria-pressed={choice.key === listKey}
            onclick={() => {
              listKey = choice.key;
              picked = null;
            }}>{choice.label}</button
          >
        {/each}
      </div>
    {/if}
    <label class="find">
      <span>{t("modlist-edit-find")}</span>
      <input
        type="search"
        bind:value={search}
        oninput={() => {
          onPage = 1;
          offPage = 1;
        }}
      />
    </label>
    <div class="buttons" role="group" aria-label={t("modlist-edit-show")}>
      {#each SHOWS as choice (choice.id)}
        <button
          type="button"
          class="action toggle"
          aria-pressed={show === choice.id}
          onclick={() => (show = choice.id)}>{t(choice.key)}</button
        >
      {/each}
    </div>
    <div class="buttons" role="group" aria-label={t("modlist-edit-from")}>
      {#each FROMS as choice (choice.id)}
        <button
          type="button"
          class="action toggle"
          aria-pressed={from === choice.id}
          onclick={() => {
            from = choice.id;
            onPage = 1;
            offPage = 1;
          }}>{t(choice.key)}</button
        >
      {/each}
    </div>
    <div class="buttons">
      <button
        type="button"
        class="action"
        disabled={locked || (listing.changes[listKey] ?? 0) === 0}
        onclick={undo}>{t("modlist-undo")}</button
      >
      <button type="button" class="action" disabled={busy} onclick={load}
        >{t("modlist-check-again")}</button
      >
    </div>
    {#if busy}
      <ProgressBar {progress} fallback={t("modlist-changing")} />
    {/if}
  </section>

  {#if picked}
    {@const moving = picked}
    <p class="told picking" role="status">
      {t("modlist-edit-picked", { name: moving.name })}
      <button type="button" class="action" onclick={() => (picked = null)}
        >{t("modlist-cancel")}</button
      >
    </p>
  {/if}

  {#if show !== "off"}
    <section class="panel" aria-labelledby="modlist-edit-on">
      <h2 id="modlist-edit-on">
        {t("modlist-edit-on-title", { count: length })}
      </h2>
      {#if on.length === 0}
        <p class="muted">{t("modlist-edit-none-found")}</p>
      {:else}
        <ul class="rows">
          {#each onPaged.items as row (row.entry.key + row.place)}
            <li>
              <span class="place">{row.place}</span>
              <span class="who">
                <strong>{nameOf(row)}</strong>
                <span class="muted small"
                  >{sourceWords(row.mod)}{row.mod?.authors
                    ? ` · ${row.mod.authors}`
                    : ""}</span
                >
              </span>
              <span class="buttons">
                {#if picked}
                  <button
                    type="button"
                    class="action"
                    disabled={locked || picked.id === row.entry.id}
                    onclick={() => picked && act("move", picked.id, row.place)}
                    >{t("modlist-edit-put-here", { place: row.place })}</button
                  >
                {:else}
                  <button
                    type="button"
                    class="action"
                    disabled={locked || row.place === 1}
                    aria-label={t("modlist-edit-up-label", {
                      name: nameOf(row),
                    })}
                    onclick={() => act("move", row.entry.id, row.place - 1)}
                    >{t("modlist-edit-up")}</button
                  >
                  <button
                    type="button"
                    class="action"
                    disabled={locked || row.place === length}
                    aria-label={t("modlist-edit-down-label", {
                      name: nameOf(row),
                    })}
                    onclick={() => act("move", row.entry.id, row.place + 1)}
                    >{t("modlist-edit-down")}</button
                  >
                  <form
                    class="to"
                    onsubmit={(event) => {
                      event.preventDefault();
                      moveTo(row, length);
                    }}
                  >
                    <input
                      type="text"
                      inputmode="numeric"
                      size="4"
                      aria-label={t("modlist-edit-place-label", {
                        name: nameOf(row),
                      })}
                      disabled={locked}
                      value={typed[row.entry.key] ?? ""}
                      oninput={(event) =>
                        (typed = {
                          ...typed,
                          [row.entry.key]: event.currentTarget.value,
                        })}
                    />
                    <button type="submit" class="action" disabled={locked}
                      >{t("modlist-edit-move-to")}</button
                    >
                  </form>
                  <button
                    type="button"
                    class="action"
                    disabled={locked}
                    onclick={() =>
                      (picked = { id: row.entry.id, name: nameOf(row) })}
                    >{t("modlist-edit-pick")}</button
                  >
                  <button
                    type="button"
                    class="action"
                    disabled={locked}
                    aria-label={t("modlist-edit-off-label", {
                      name: nameOf(row),
                    })}
                    onclick={() => act("remove", row.entry.id, null)}
                    >{t("modlist-edit-off")}</button
                  >
                {/if}
              </span>
            </li>
          {/each}
        </ul>
        <Pager
          page={onPaged.page}
          pages={onPaged.pages}
          first={onPaged.first}
          last={onPaged.last}
          total={onPaged.total}
          label={t("modlist-edit-on-pages")}
          onchange={(page) => (onPage = page)}
        />
      {/if}
    </section>
  {/if}

  {#if show !== "on"}
    <section class="panel" aria-labelledby="modlist-edit-off">
      <h2 id="modlist-edit-off">
        {t("modlist-edit-off-title", {
          count: offRows(listing, listKey).length,
        })}
      </h2>
      {#if off.length === 0}
        <p class="muted">{t("modlist-edit-none-found")}</p>
      {:else}
        <ul class="rows">
          {#each offPaged.items as mod (mod.key)}
            <li>
              <span class="who">
                <strong>{mod.name}</strong>
                <span class="muted small"
                  >{sourceWords(mod)}{mod.authors
                    ? ` · ${mod.authors}`
                    : ""}</span
                >
                {#if mod.needs.length > 0}
                  <span class="muted small"
                    >{t("modlist-edit-needs", {
                      names: mod.needs.join(", "),
                    })}</span
                  >
                {/if}
              </span>
              <span class="buttons">
                <button
                  type="button"
                  class="action"
                  disabled={locked}
                  aria-label={t("modlist-edit-on-label", { name: mod.name })}
                  onclick={() => act("enable", mod.id, null)}
                  >{t("modlist-edit-switch-on")}</button
                >
              </span>
            </li>
          {/each}
        </ul>
        <Pager
          page={offPaged.page}
          pages={offPaged.pages}
          first={offPaged.first}
          last={offPaged.last}
          total={offPaged.total}
          label={t("modlist-edit-off-pages")}
          onchange={(page) => (offPage = page)}
        />
      {/if}
    </section>
  {/if}
{/if}

<style>
  .panel {
    margin-bottom: 16px;
    padding: 20px 24px;
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

  .buttons {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin: 6px 0;
  }

  .find {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin: 6px 0;
  }

  .find input {
    min-height: 44px;
    min-width: min(24em, 100%);
  }

  .rows {
    list-style: none;
    padding: 0;
  }

  .rows li {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 12px;
    padding: 8px 0;
    border-bottom: 1px solid var(--colour-line);
    overflow-wrap: anywhere;
  }

  .place {
    min-width: 2.5em;
    font-variant-numeric: tabular-nums;
    color: var(--colour-text-muted);
  }

  .who {
    display: flex;
    flex-direction: column;
    flex: 1 1 16em;
  }

  .to {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .to input {
    min-height: 44px;
    width: 4.5em;
  }

  .told {
    margin-bottom: 12px;
  }

  .told.refused {
    color: var(--colour-risk);
  }

  .picking {
    padding: 10px 14px;
    border-inline-start: 3px solid var(--colour-accent);
    background: var(--colour-surface-soft);
  }
</style>
