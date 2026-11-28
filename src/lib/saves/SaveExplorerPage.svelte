<script lang="ts">
  import { onMount, untrack } from "svelte";
  import { readGameFiles } from "../gamefiles/desktopClient";
  import type { GameHome } from "../home/types";
  import { t } from "../i18n/runtime";
  import { here, setFocus } from "../navigation/navigation.svelte";
  import { place } from "../navigation/place";
  import ReportView from "../reports/ReportView.svelte";
  import type { Ref } from "../reports/types";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import Placeholder from "../shell/Placeholder.svelte";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import RichText from "../shell/RichText.svelte";
  import { heard, started } from "../shell/progress";
  import { readSave } from "./desktopClient";
  import { childrenOf, partWords, stepsTo, lastName } from "./presentation";
  import type { Part, Reading } from "./types";

  /**
   * The Save explorer (0.121.0; the owner's question of 20 Nov 2026 and their card of 28 Nov 2026, "Save explorer, first slice";
   * `docs/save-explorer.md`): any save opened a part at a time, searched by name, kind or ID, and one thing in full with what
   * holds it and what it holds, each a press from the next. It only reads: the save is never written. Written for players: any
   * save and any mod list.
   */
  let { game }: { game: GameHome } = $props();

  let saves = $state<string[]>([]);
  let parts = $state<Reading>({ state: "reading" });
  let partsFor = $state<string | null>(null);
  let partsProgress = $state(started());
  let found = $state<Reading | null>(null);
  let foundFor = $state<string | null>(null);
  let foundProgress = $state(started());
  let thing = $state<Reading | null>(null);
  let thingFor = $state<string | null>(null);
  let thingProgress = $state(started());
  let searchText = $state("");

  const focus = $derived(here().focus);
  const save = $derived(focus.save || null);
  const at = $derived(focus.place || null);
  const chosenThing = $derived(focus.thing || null);
  const search = $derived(focus.search || null);
  const available = $derived(
    parts.state === "ready" ? parts.reading.available : true,
  );
  const children = $derived.by<Part[]>(() => {
    if (parts.state !== "ready") return [];
    const listed = (parts.reading.data?.paths as Part[] | undefined) ?? [];
    return childrenOf(listed, at);
  });

  onMount(() => {
    void readGameFiles(game.id, null).then((answer) => {
      if (answer.state === "ready")
        saves = answer.files.saves.list.map((s) => s.name);
    });
  });

  /** Where a row of a search or a thing opens: a thing in full, or a part of the save. */
  function link(ref: Ref) {
    const keep: Record<string, string> = save ? { save } : {};
    if (ref.kind === "thing")
      return place("saves", game.id, { ...keep, thing: ref.id });
    if (ref.kind === "place")
      return place("saves", game.id, { ...keep, place: ref.id });
    return null;
  }

  async function readParts(key: string) {
    partsFor = key;
    parts = { state: "reading" };
    partsProgress = started();
    const answer = await readSave(game.id, save, "parts", at, (m) => {
      partsProgress = heard(partsProgress, m);
    });
    if (partsFor === key) parts = answer;
  }

  async function readFound(key: string, text: string) {
    foundFor = key;
    found = { state: "reading" };
    foundProgress = started();
    const answer = await readSave(game.id, save, "search", text, (m) => {
      foundProgress = heard(foundProgress, m);
    });
    if (foundFor === key) found = answer;
  }

  async function readThing(key: string, id: string) {
    thingFor = key;
    thing = { state: "reading" };
    thingProgress = started();
    const answer = await readSave(game.id, save, "thing", id, (m) => {
      thingProgress = heard(thingProgress, m);
    });
    if (thingFor === key) thing = answer;
  }

  // A level of the save's parts, read again whenever the save or the place changes.
  $effect(() => {
    const key = `${save ?? ""} ${at ?? ""}`;
    if (key !== untrack(() => partsFor)) void readParts(key);
  });

  // A search the place names, read once each time it changes.
  $effect(() => {
    const text = search;
    if (!text) {
      untrack(() => {
        found = null;
        foundFor = null;
      });
      return;
    }
    untrack(() => (searchText = text));
    const key = `${save ?? ""} ${text}`;
    if (key !== untrack(() => foundFor)) void readFound(key, text);
  });

  // One thing in full, when the place names one.
  $effect(() => {
    const id = chosenThing;
    if (!id) {
      untrack(() => {
        thing = null;
        thingFor = null;
      });
      return;
    }
    const key = `${save ?? ""} ${id}`;
    if (key !== untrack(() => thingFor)) void readThing(key, id);
  });

  function chooseSave(event: Event) {
    const value = (event.currentTarget as HTMLSelectElement).value;
    setFocus(value ? { save: value } : {});
  }

  function submitSearch(event: SubmitEvent) {
    event.preventDefault();
    const text = searchText.trim();
    if (!text) return;
    setFocus({ ...(save ? { save } : {}), search: text });
  }

  function openPart(path: string | null) {
    setFocus({
      ...(save ? { save } : {}),
      ...(path ? { place: path } : {}),
    });
  }
</script>

<div class="eyebrow accent">{t("saves-kicker")}</div>
<h1>{t("saves-title", { game: game.name })}</h1>
<p class="lead">{t("saves-lead")}</p>

{#if parts.state === "browser"}
  <p class="lead">{t("saves-browser")}</p>
{:else if parts.state === "ready" && !available}
  <p class="lead">{t("saves-none", { game: game.name })}</p>
{:else}
  <section class="gotchas" aria-labelledby="saves-gotchas">
    <h2 id="saves-gotchas">{t("saves-gotchas-title")}</h2>
    <ul>
      <li><RichText text={t("saves-gotcha-reads")} /></li>
      <li><RichText text={t("saves-gotcha-first")} /></li>
      <li><RichText text={t("saves-gotcha-names")} /></li>
    </ul>
  </section>

  <section class="panel" aria-labelledby="saves-which">
    <h2 id="saves-which">{t("saves-which-title")}</h2>
    <label class="field">
      <span class="small muted">{t("saves-which-label")}</span>
      <select value={save ?? ""} onchange={chooseSave}>
        <option value="">{t("saves-which-newest")}</option>
        {#each saves as name (name)}
          <option value={name}>{name}</option>
        {/each}
      </select>
    </label>
    <form class="search" onsubmit={submitSearch}>
      <label for="saves-search">{t("saves-search-label")}</label>
      <div class="row">
        <input
          id="saves-search"
          type="search"
          maxlength="120"
          bind:value={searchText}
          placeholder={t("saves-search-placeholder")}
        />
        <button type="submit" class="action" disabled={!searchText.trim()}
          >{t("saves-search-go")}</button
        >
      </div>
    </form>
  </section>

  {#if found}
    <section class="report" aria-labelledby="saves-found">
      <h2 id="saves-found">{t("saves-found-title", { text: search ?? "" })}</h2>
      {#if found.state === "reading"}
        <ProgressBar progress={foundProgress} fallback={t("saves-reading")} />
        <Placeholder shape="rows" rows={4} />
      {:else if found.state === "failed"}
        <FailurePanel
          failure={found.failure}
          onretry={() =>
            search && void readFound(`${save ?? ""} ${search}`, search)}
        />
      {:else if found.state === "ready" && found.reading.report}
        <ReportView report={found.reading.report} {link} />
      {/if}
    </section>
  {/if}

  {#if thing}
    <section class="report" aria-labelledby="saves-thing">
      <h2 id="saves-thing">
        {t("saves-thing-title", { id: chosenThing ?? "" })}
      </h2>
      {#if thing.state === "reading"}
        <ProgressBar progress={thingProgress} fallback={t("saves-reading")} />
        <Placeholder shape="rows" rows={6} />
      {:else if thing.state === "failed"}
        <FailurePanel
          failure={thing.failure}
          onretry={() =>
            chosenThing &&
            void readThing(`${save ?? ""} ${chosenThing}`, chosenThing)}
        />
      {:else if thing.state === "ready" && thing.reading.report}
        <ReportView report={thing.reading.report} {link} />
        <p class="how muted">
          {t("saves-command-line", { line: thing.reading.command_line })}
        </p>
      {/if}
    </section>
  {/if}

  <section class="panel" aria-labelledby="saves-parts">
    <h2 id="saves-parts">{t("saves-parts-title")}</h2>
    <nav class="steps" aria-label={t("saves-steps-label")}>
      <button type="button" class="action" onclick={() => openPart(null)}
        >{t("saves-steps-top")}</button
      >
      {#each stepsTo(at) as step (step.path)}
        <span aria-hidden="true">›</span>
        <button
          type="button"
          class="action"
          aria-current={step.path === at ? "location" : undefined}
          onclick={() => openPart(step.path)}>{partWords(step.name)}</button
        >
      {/each}
    </nav>
    {#if parts.state === "reading"}
      <ProgressBar progress={partsProgress} fallback={t("saves-reading")} />
      <Placeholder shape="rows" rows={6} />
    {:else if parts.state === "failed"}
      <FailurePanel
        failure={parts.failure}
        onretry={() => void readParts(`${save ?? ""} ${at ?? ""}`)}
      />
    {:else if children.length === 0}
      <p class="muted">{t("saves-parts-none")}</p>
    {:else}
      <ul class="parts">
        {#each children as part (part.path)}
          <li>
            <button
              type="button"
              class="action"
              onclick={() => openPart(part.path)}
            >
              <span class="name">{partWords(lastName(part.path))}</span>
              <span class="count muted"
                >{t("saves-parts-count", { count: part.count })}</span
              >
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
{/if}

<style>
  .gotchas,
  .panel {
    margin-block: 12px;
    padding: 12px 14px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
    overflow-wrap: anywhere;
  }

  .gotchas {
    border-inline-start: 4px solid var(--colour-accent);
  }

  .gotchas ul {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin: 0;
    padding-inline-start: 20px;
  }

  h2 {
    margin: 0 0 8px;
    font-size: var(--type-body);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-width: 40ch;
  }

  select,
  input[type="search"] {
    min-height: var(--control-min);
    padding-inline: 10px;
    font: inherit;
    color: var(--colour-text);
    background: var(--colour-surface);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .search {
    margin-top: 12px;
  }

  .search label {
    font-weight: 600;
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 6px;
  }

  .row input {
    flex: 1 1 260px;
  }

  .steps {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    margin-bottom: 10px;
  }

  .parts {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .parts .action {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    width: 100%;
    text-align: start;
  }

  .count {
    font-variant-numeric: tabular-nums;
  }

  .report {
    margin-block: 16px;
  }
</style>
