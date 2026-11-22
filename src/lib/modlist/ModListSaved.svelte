<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import type { GameHome } from "../home/types";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import Placeholder from "../shell/Placeholder.svelte";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import { formatWhen } from "../shell/dates";
  import { heard, started } from "../shell/progress";
  import type { Failure } from "../shell/types";
  import { register } from "../shortcuts/registry";
  import {
    compareList,
    exportList,
    findOnWorkshop,
    forgetList,
    openInSteam,
    openListFile,
    readLists,
    readMods,
    saveList,
    undoEdit,
  } from "./desktopClient";
  import { LIST_SOURCES } from "./sorting";
  import SteamSubscribe from "./SteamSubscribe.svelte";
  import type {
    CompareAnswer,
    ListInfo,
    ListsListing,
    MissingMod,
    ModsListing,
  } from "./types";

  /**
   * Saved lists (0.48.0; the owner's choices of 22 Nov 2026: lists saved by name, kept at each game start, each save's own,
   * RimSort's history and files; loading shows the difference, then a yes; mods not on this PC are left out, named with why, and
   * offered in Steam). Use this list writes it after a backup, and Undo takes it back.
   */
  let { game }: { game: GameHome } = $props();

  const SHOWN = 8;

  type Reading =
    | { state: "reading" }
    | { state: "ready"; mods: ModsListing; lists: ListsListing }
    | { state: "failed"; failure: Failure };
  type Chosen = { source: string; reference: string; label: string };

  let reading = $state<Reading>({ state: "reading" });
  let listKey = $state("");
  let name = $state("");
  let nameInUse = $state(false);
  let chosen = $state<Chosen | null>(null);
  let comparison = $state<CompareAnswer["data"] | null>(null);
  let shownAll = $state<Record<string, boolean>>({});
  let loaded = $state(false);
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
    progress = started(t("modlist-saved-reading"));
    const [mods, lists] = await Promise.all([
      readMods(game.id, hearing()),
      readLists(game.id),
    ]);
    busy = false;
    if (mods.state === "ready" && lists.state === "ready") {
      reading = { state: "ready", mods: mods.listing, lists: lists.listing };
      if (!mods.listing.lists.some((l) => l.key === listKey)) {
        listKey =
          mods.listing.lists.find((l) => l.writable)?.key ??
          mods.listing.lists[0]?.key ??
          "";
      }
    } else {
      const failed = mods.state === "failed" ? mods : lists;
      if (failed.state === "failed")
        reading = { state: "failed", failure: failed.failure };
    }
  }

  function refused(reason: string) {
    said = { text: t("modlist-change-failed", { reason }), refused: true };
  }

  async function compare(choice: Chosen) {
    said = null;
    chosen = choice;
    comparison = null;
    busy = true;
    progress = started(t("modlist-saved-comparing"));
    const answer = await compareList(
      game.id,
      listKey,
      choice.source,
      choice.reference,
      false,
      hearing(),
    );
    busy = false;
    if (answer.state === "failed") return refused(answer.failure.detail);
    if (!answer.result.ok) return refused(answer.result.refusal ?? "");
    comparison = answer.result.data;
  }

  async function useIt() {
    if (!chosen) return;
    said = null;
    busy = true;
    progress = started(t("modlist-changing"));
    const answer = await compareList(
      game.id,
      listKey,
      chosen.source,
      chosen.reference,
      true,
      hearing(),
    );
    busy = false;
    if (answer.state === "failed") return refused(answer.failure.detail);
    if (!answer.result.ok) return refused(answer.result.refusal ?? "");
    said = {
      text: t("modlist-saved-loaded", { name: chosen.label }),
      refused: false,
    };
    comparison = null;
    chosen = null;
    loaded = true;
  }

  async function undo() {
    said = null;
    busy = true;
    progress = started(t("modlist-changing"));
    const answer = await undoEdit(game.id, listKey, hearing());
    busy = false;
    if (answer.state === "failed") return refused(answer.failure.detail);
    if (!answer.result.ok) return refused(answer.result.refusal ?? "");
    loaded = false;
    said = {
      text: t("modlist-undone", { change: answer.result.data.undoes ?? "" }),
      refused: false,
    };
  }

  async function save(replace: boolean) {
    said = null;
    const answer = await saveList(game.id, listKey, name, replace);
    if (answer.state === "failed") return refused(answer.failure.detail);
    if (!answer.result.ok) {
      nameInUse = (answer.result.refusal ?? "").includes("kept already");
      return refused(answer.result.refusal ?? "");
    }
    said = {
      text: t("modlist-saved-kept", { name: name.trim() }),
      refused: false,
    };
    name = "";
    nameInUse = false;
    await reloadLists();
  }

  async function forget(list: ListInfo) {
    said = null;
    const answer = await forgetList(game.id, list.ref);
    if (answer.state === "failed") return refused(answer.failure.detail);
    if (!answer.result.ok) return refused(answer.result.refusal ?? "");
    said = {
      text: t("modlist-saved-forgotten", { name: list.label }),
      refused: false,
    };
    if (chosen?.source === "saved" && chosen.reference === list.ref) {
      chosen = null;
      comparison = null;
    }
    await reloadLists();
  }

  async function writeOut(list: ListInfo | null, label: string) {
    said = null;
    const answer = await exportList(
      game.id,
      listKey,
      list?.source ?? null,
      list?.ref ?? null,
      label,
      t("modlist-saved-export-title"),
    );
    if (answer.state === "failed") return refused(answer.failure.detail);
    if (answer.result === null) return;
    if (!answer.result.ok) return refused(answer.result.refusal ?? "");
    said = {
      text: t("modlist-saved-exported", { name: label }),
      refused: false,
    };
  }

  async function openFile() {
    said = null;
    const answer = await openListFile(game.id, t("modlist-saved-open-title"));
    if (answer.state === "failed") return refused(answer.failure.detail);
    if (answer.path === null) return;
    const label = answer.path.split(/[\\/]/).pop() ?? answer.path;
    await compare({ source: "file", reference: answer.path, label });
  }

  async function reloadLists() {
    const lists = await readLists(game.id);
    if (lists.state === "ready" && reading.state === "ready") {
      reading = { ...reading, lists: lists.listing };
    }
  }

  async function steam(mod: MissingMod) {
    const answer = mod.workshop_id
      ? await openInSteam(mod.workshop_id)
      : await findOnWorkshop(game.id, mod.name);
    if (answer.state === "failed") {
      said = {
        text: t("modlist-steam-failed", { reason: answer.failure.detail }),
        refused: true,
      };
    }
  }

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
  <ProgressBar {progress} fallback={t("modlist-saved-reading")} />
  <Placeholder shape="rows" />
{:else if reading.state === "failed"}
  <FailurePanel failure={reading.failure} onretry={load} />
{:else if !reading.mods.supported}
  {#each reading.mods.notes as note, index (index)}
    <p>{note}</p>
  {/each}
{:else}
  {@const mods = reading.mods}
  {@const lists = reading.lists}
  {@const lastClean = (lists.sources.kept ?? []).find(
    (k) => k.ran?.clean === true,
  )}
  {@const list = mods.lists.find((l) => l.key === listKey)}
  {@const running = mods.running.length > 0}
  {@const locked = busy || running || !list?.writable}

  {#if running}
    <p class="told refused" role="status">
      {t("modlist-running", { names: mods.running.join(", ") })}
    </p>
  {/if}

  <section class="panel" aria-labelledby="modlist-saved-keep">
    <h2 id="modlist-saved-keep">{t("modlist-saved-keep-title")}</h2>
    {#if mods.lists.length > 1}
      <div
        class="buttons"
        role="group"
        aria-label={t("modlist-edit-which-list")}
      >
        {#each mods.lists as choice (choice.key)}
          <button
            type="button"
            class="action toggle"
            aria-pressed={choice.key === listKey}
            onclick={() => {
              listKey = choice.key;
              comparison = null;
            }}>{choice.label}</button
          >
        {/each}
      </div>
    {/if}
    <form
      class="keep"
      onsubmit={(event) => {
        event.preventDefault();
        void save(false);
      }}
    >
      <label>
        <span>{t("modlist-saved-name")}</span>
        <input
          type="text"
          bind:value={name}
          maxlength="80"
          oninput={() => (nameInUse = false)}
        />
      </label>
      <button
        type="submit"
        class="action strong"
        disabled={busy || !list || name.trim() === ""}
        >{t("modlist-saved-keep")}</button
      >
      {#if nameInUse}
        <button
          type="button"
          class="action"
          disabled={busy}
          onclick={() => save(true)}>{t("modlist-saved-replace")}</button
        >
      {/if}
    </form>
    <div class="buttons">
      <button
        type="button"
        class="action strong"
        disabled={busy || !list || !lastClean}
        onclick={() =>
          lastClean &&
          compare({
            source: "kept",
            reference: lastClean.ref,
            label: lastClean.label,
          })}>{t("modlist-saved-last-clean")}</button
      >
      {#if !lastClean}
        <span class="muted small">{t("modlist-saved-no-clean")}</span>
      {/if}
    </div>
    <div class="buttons">
      {#if lists.files}
        <button
          type="button"
          class="action"
          disabled={busy || !list}
          onclick={() => writeOut(null, list?.label ?? "")}
          >{t("modlist-saved-export-now")}</button
        >
        <button
          type="button"
          class="action"
          disabled={busy || !list}
          onclick={openFile}>{t("modlist-saved-open")}</button
        >
      {/if}
      {#if loaded}
        <button type="button" class="action" disabled={locked} onclick={undo}
          >{t("modlist-undo")}</button
        >
      {/if}
    </div>
    {#if busy}
      <ProgressBar {progress} fallback={t("modlist-saved-reading")} />
    {/if}
  </section>

  {#if comparison && chosen}
    {@const on = comparison.on ?? []}
    {@const off = comparison.off ?? []}
    {@const missing = comparison.missing ?? []}
    <section class="panel compare" aria-labelledby="modlist-saved-compare">
      <h2 id="modlist-saved-compare">
        {t("modlist-saved-compare-title", { name: chosen.label })}
      </h2>
      {#if comparison.same}
        <p class="clean">{t("modlist-saved-same")}</p>
      {:else}
        <ul class="counts">
          <li class="chip on">
            {t("modlist-saved-count-on", { count: on.length })}
          </li>
          <li class="chip off">
            {t("modlist-saved-count-off", { count: off.length })}
          </li>
          <li class="chip moved">
            {t("modlist-saved-count-moved", { count: comparison.moved ?? 0 })}
          </li>
          <li class="chip missing">
            {t("modlist-saved-count-missing", { count: missing.length })}
          </li>
        </ul>

        {#if missing.length > 0}
          {@const numbers = missing
            .map((m) => m.workshop_id)
            .filter((n) => n !== "")}
          <h3>{t("modlist-saved-missing-title")}</h3>
          {#if numbers.length > 1}
            <SteamSubscribe
              game={game.id}
              {numbers}
              label={t("modlist-steam-subscribe-all", {
                count: numbers.length,
              })}
              disabled={busy}
              ondone={() => chosen && void compare(chosen)}
            />
          {/if}
          <ul class="missing-list">
            {#each missing as mod (mod.key)}
              <li>
                <div>
                  <strong>{mod.name}</strong>
                  <span class="muted small">{mod.why}</span>
                </div>
                <div class="buttons">
                  {#if mod.workshop_id}
                    <SteamSubscribe
                      game={game.id}
                      numbers={[mod.workshop_id]}
                      label={t("modlist-steam-subscribe")}
                      disabled={busy}
                      ondone={() => chosen && void compare(chosen)}
                    />
                  {/if}
                  <button
                    type="button"
                    class="action"
                    onclick={() => steam(mod)}
                    >{mod.workshop_id
                      ? t("modlist-open-steam")
                      : t("modlist-saved-find")}</button
                  >
                </div>
              </li>
            {/each}
          </ul>
        {/if}

        {#if on.length > 0}
          <details>
            <summary
              >{t("modlist-saved-names-on", { count: on.length })}</summary
            >
            <p class="names">{on.map((m) => m.name).join(", ")}</p>
          </details>
        {/if}
        {#if off.length > 0}
          <details>
            <summary
              >{t("modlist-saved-names-off", { count: off.length })}</summary
            >
            <p class="names">{off.map((m) => m.name).join(", ")}</p>
          </details>
        {/if}

        <div class="confirm">
          <p>{t("modlist-saved-confirm", { name: chosen.label })}</p>
          <div class="buttons">
            <button
              type="button"
              class="action strong"
              disabled={locked}
              onclick={useIt}>{t("modlist-saved-use")}</button
            >
            <button
              type="button"
              class="action"
              onclick={() => {
                comparison = null;
                chosen = null;
              }}>{t("modlist-sort-set-aside")}</button
            >
          </div>
        </div>
      {/if}
    </section>
  {/if}

  {#each LIST_SOURCES as source (source.id)}
    {@const items = lists.sources[source.id] ?? []}
    <section class="panel" aria-labelledby="modlist-saved-{source.id}">
      <h2 id="modlist-saved-{source.id}">
        {t(source.title, { count: items.length })}
      </h2>
      <p class="how">{t(source.how)}</p>
      {#if items.length === 0}
        <p class="muted">{t("modlist-saved-none")}</p>
      {:else}
        <ul class="lists">
          {#each shownAll[source.id] ? items : items.slice(0, SHOWN) as item (item.ref)}
            <li
              class:picked={chosen?.source === source.id &&
                chosen.reference === item.ref}
            >
              <div class="who">
                <strong
                  >{item.label}
                  {#if item.ran?.clean === true}
                    <span class="chip ran-clean"
                      >{t("modlist-saved-ran-clean")}</span
                    >
                  {:else if item.ran?.clean === false}
                    <span class="chip ran-errors"
                      >{t("modlist-saved-ran-errors", {
                        count: item.ran.new_errors ?? 0,
                      })}</span
                    >
                  {/if}</strong
                >
                <span class="muted small"
                  >{t("modlist-saved-row", {
                    when: formatWhen(item.when),
                    count: item.count,
                  })}</span
                >
              </div>
              <div class="buttons">
                <button
                  type="button"
                  class="action"
                  disabled={busy || !list}
                  onclick={() =>
                    compare({
                      source: source.id,
                      reference: item.ref,
                      label: item.label,
                    })}>{t("modlist-saved-compare")}</button
                >
                {#if lists.files}
                  <button
                    type="button"
                    class="action"
                    disabled={busy || !list}
                    onclick={() => writeOut(item, item.label)}
                    >{t("modlist-saved-export")}</button
                  >
                {/if}
                {#if source.id === "saved"}
                  <button
                    type="button"
                    class="action"
                    disabled={busy}
                    onclick={() => forget(item)}
                    >{t("modlist-rules-take-away")}</button
                  >
                {/if}
              </div>
            </li>
          {/each}
        </ul>
        {#if items.length > SHOWN && !shownAll[source.id]}
          <button
            type="button"
            class="action"
            onclick={() => (shownAll = { ...shownAll, [source.id]: true })}
            >{t("modlist-sort-show-all", { count: items.length })}</button
          >
        {/if}
      {/if}
    </section>
  {/each}
{/if}

<style>
  .panel {
    margin-bottom: 16px;
    padding: 20px 24px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .panel.compare {
    border: 2px solid var(--colour-accent);
  }

  h2 {
    margin-bottom: 4px;
    font-family: var(--font-display);
    font-size: 1.375rem;
    font-weight: 600;
  }

  h3 {
    margin: 16px 0 8px;
    font-size: 1.0625rem;
    font-weight: 600;
  }

  .buttons {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin: 8px 0;
  }

  .keep {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin: 8px 0;
  }

  .keep label {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }

  .keep input {
    min-height: var(--control-min);
    min-width: min(20em, 100%);
  }

  .action.strong {
    border-width: 2px;
  }

  .clean {
    color: var(--colour-success);
  }

  .counts,
  .lists,
  .missing-list {
    list-style: none;
    padding: 0;
  }

  .counts {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 8px 0;
  }

  .lists li,
  .missing-list li {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 6px 12px;
    padding: 6px 10px;
    border-inline-start: 3px solid transparent;
    overflow-wrap: anywhere;
  }

  .lists li:nth-child(even),
  .missing-list li:nth-child(even) {
    background: color-mix(
      in srgb,
      var(--colour-surface-soft) 45%,
      var(--colour-surface-raised)
    );
  }

  .lists li.picked {
    background: var(--shade-accent);
    border-inline-start-color: var(--colour-accent);
  }

  .missing-list li {
    border-inline-start-color: var(--colour-risk);
  }

  .who,
  .missing-list li > div {
    display: flex;
    flex-direction: column;
    flex: 1 1 16em;
  }

  details {
    margin: 8px 0;
  }

  /* Keeps the fold-out arrow, at a control's height. */
  summary {
    min-height: var(--control-min);
    padding-block: 10px;
    cursor: pointer;
  }

  .names {
    columns: 2 18em;
    font-size: var(--type-small);
  }

  .confirm {
    margin-top: 12px;
    padding: 10px 14px;
    border: 2px solid var(--colour-accent);
    background: var(--colour-surface-raised);
    border-radius: 4px;
  }

  /* What loading changes: words always, a shade of the theme as well. */
  .chip {
    display: inline-block;
    padding: 2px 8px;
    font-size: var(--type-caption);
    border: 1px solid var(--colour-line);
    border-radius: 999px;
    color: var(--colour-text);
  }

  .chip.ran-clean {
    margin-inline-start: 6px;
    font-weight: 400;
    background: var(--shade-success);
    border-color: var(--colour-success);
  }

  .chip.ran-errors {
    margin-inline-start: 6px;
    font-weight: 400;
    background: var(--shade-risk);
    border-color: var(--colour-risk);
  }

  .chip.on {
    background: var(--shade-success);
    border-color: var(--colour-success);
  }

  .chip.off {
    background: var(--shade-risk);
    border-color: var(--colour-risk);
  }

  .chip.moved {
    background: var(--shade-observed);
    border-color: var(--colour-observed);
  }

  .chip.missing {
    background: var(--shade-accent);
    border-color: var(--colour-accent);
  }

  .told {
    margin-bottom: 12px;
  }

  .told.refused {
    color: var(--colour-risk);
  }
</style>
