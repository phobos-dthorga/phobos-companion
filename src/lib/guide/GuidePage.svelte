<script lang="ts">
  import { tick } from "svelte";
  import type { GameHome } from "../home/types";
  import { t } from "../i18n/runtime";
  import { go, here } from "../navigation/navigation.svelte";
  import { place } from "../navigation/place";
  import { agents } from "../agents/state.svelte";
  import {
    ENTRIES,
    entry as entryById,
    GUIDE_KIND_WORDS,
    KINDS,
    pieces,
    search,
    type GuideEntry,
    type Piece,
  } from "./entries";

  /**
   * The Guide (0.34.0): How do I…? answers, an entry for every page, and the Companion's own words. F1 opens it at the page shown;
   * a search finds by title, search words and text; links between entries and Take me there are steps of the window's trail, so
   * Back returns. Entries are files in `guide/`, built into the window.
   */
  let { game }: { game: GameHome | null } = $props();

  let query = $state("");
  const GROUP_WORDS: Record<string, string> = {
    task: "guide-group-task",
    page: "guide-group-page",
    term: "guide-group-term",
    agents: "guide-group-agents",
  };

  const chosenId = $derived(here().focus.entry ?? "page-guide");
  const chosen = $derived(entryById(chosenId) ?? entryById("page-guide"));
  const found = $derived(search(query));
  /** Entries about features for agent sessions come last, in a group of their own (0.37.0), so the rest read without them. */
  const groups = $derived([
    ...KINDS.map((kind) => ({
      kind: kind as string,
      entries: ENTRIES.filter((e) => e.kind === kind && !e.forAgents),
    })),
    { kind: "agents", entries: ENTRIES.filter((e) => e.forAgents) },
  ]);

  /** Each entry opened is a step of the trail, as each new thing in the middle of the Code map is, so Back returns to the last. */
  async function open(id: string) {
    if (here().focus.entry !== id)
      go(place("guide", here().game, { entry: id }));
    await tick();
    const heading = document.getElementById("guide-entry-title");
    heading?.scrollIntoView({ block: "start" });
    heading?.focus();
  }

  function takeMeThere(entry: GuideEntry) {
    if (entry.go) go(place(entry.go.page, game?.id ?? null, entry.go.focus));
  }
</script>

<div class="eyebrow accent">{t("guide-kicker")}</div>
<h1>{t("guide-title")}</h1>
<p class="lead">{t("guide-lead")}</p>

<div class="layout">
  <nav class="index" aria-label={t("guide-index-label")}>
    <label class="search-label" for="guide-search">{t("guide-search")}</label>
    <input
      id="guide-search"
      type="search"
      data-page-filter
      bind:value={query}
      autocomplete="off"
      spellcheck="false"
      placeholder={t("guide-search-hint")}
    />
    {#if query.trim()}
      <p class="muted small" role="status">
        {t("guide-found", { count: found.length })}
      </p>
      <ul class="entries">
        {#each found as e (e.id)}
          <li>
            <button
              type="button"
              class="entry-link"
              aria-current={e.id === chosen?.id ? "page" : undefined}
              onclick={() => open(e.id)}
            >
              {e.title}
              <span class="muted small">{t(GUIDE_KIND_WORDS[e.kind])}</span>
            </button>
          </li>
        {/each}
      </ul>
    {:else}
      {#each groups as group (group.kind)}
        <h2 class="group">{t(GROUP_WORDS[group.kind])}</h2>
        <ul class="entries">
          {#each group.entries as e (e.id)}
            <li>
              <button
                type="button"
                class="entry-link"
                aria-current={e.id === chosen?.id ? "page" : undefined}
                onclick={() => open(e.id)}>{e.title}</button
              >
            </li>
          {/each}
        </ul>
      {/each}
    {/if}
  </nav>

  {#if chosen}
    <article class="entry" aria-labelledby="guide-entry-title">
      <p class="eyebrow muted">{t(GUIDE_KIND_WORDS[chosen.kind])}</p>
      <h2 id="guide-entry-title" tabindex="-1">{chosen.title}</h2>
      {#if chosen.forAgents}
        <p class="for-agents small">
          {agents.shown
            ? t("guide-for-agents-shown")
            : t("guide-for-agents-hidden")}
          {#if !agents.shown}
            <button
              type="button"
              class="inline-link"
              onclick={() =>
                go(place("settings", game?.id ?? null, { panel: "agents" }))}
              >{t("guide-for-agents-switch")}</button
            >
          {/if}
        </p>
      {/if}
      {#if chosen.go}
        <button
          type="button"
          class="action there"
          onclick={() => takeMeThere(chosen)}>{t("guide-take-me")}</button
        >
      {/if}
      {#each chosen.blocks as block, index (index)}
        {#if block.kind === "heading"}
          <h3>{block.text}</h3>
        {:else if block.kind === "para"}
          <p>{@render line(pieces(block.text))}</p>
        {:else if block.ordered}
          <ol>
            {#each block.items as item, itemIndex (itemIndex)}
              <li>{@render line(pieces(item))}</li>
            {/each}
          </ol>
        {:else}
          <ul>
            {#each block.items as item, itemIndex (itemIndex)}
              <li>{@render line(pieces(item))}</li>
            {/each}
          </ul>
        {/if}
      {/each}
      {#if chosen.see.length > 0}
        <h3>{t("guide-see-also")}</h3>
        <div class="see">
          {#each chosen.see as id (id)}
            {@const other = entryById(id)}
            {#if other}
              <button type="button" class="action" onclick={() => open(id)}
                >{other.title}</button
              >
            {/if}
          {/each}
        </div>
      {/if}
    </article>
  {/if}
</div>

{#snippet line(parts: Piece[])}
  <!-- prettier-ignore -->
  {#each parts as part, index (index)}{#if part.style === "link"}<button type="button" class="inline-link" onclick={() => open(part.id)}>{part.text}</button>{:else if part.style === "bold"}<strong>{part.text}</strong>{:else if part.style === "code"}<code>{part.text}</code>{:else}{part.text}{/if}{/each}
{/snippet}

<style>
  .for-agents {
    padding: 6px 10px;
    border-inline-start: 3px solid var(--colour-accent);
    background: var(--colour-surface-soft);
  }

  .layout {
    display: grid;
    grid-template-columns: minmax(220px, 300px) minmax(0, 1fr);
    gap: 20px;
    align-items: start;
  }

  @media (max-width: 760px) {
    .layout {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  .index {
    position: sticky;
    top: 0;
    max-height: calc(100vh - 160px);
    overflow-y: auto;
    padding: 12px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .search-label {
    display: block;
    margin-bottom: 4px;
    font-size: var(--type-small);
    font-weight: 600;
  }

  input[type="search"] {
    width: 100%;
    min-height: var(--control-min);
    padding-inline: 10px;
    font: inherit;
    color: var(--colour-text);
    background: var(--colour-canvas);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .group {
    margin: 14px 0 4px;
    font-size: var(--type-small);
    font-weight: 600;
    color: var(--colour-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .entries {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .entry-link {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
    min-height: 36px;
    padding: 6px 8px;
    font: inherit;
    text-align: start;
    color: var(--colour-text);
    background: none;
    border: 0;
    border-radius: 3px;
    cursor: pointer;
  }

  .entry-link:hover,
  .entry-link:focus-visible {
    background: var(--colour-surface-soft);
  }

  .entry-link[aria-current="page"] {
    color: var(--colour-accent);
    background: var(--colour-surface-soft);
    font-weight: 600;
  }

  .entry {
    max-width: 72ch;
    padding: 18px 22px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .entry h2 {
    margin: 0 0 10px;
    font-family: var(--font-display);
    font-size: 1.5rem;
    font-weight: 600;
  }

  .entry h3 {
    margin: 16px 0 6px;
    font-size: var(--type-body);
    font-weight: 600;
  }

  .entry p,
  .entry li {
    line-height: 1.55;
  }

  .entry li {
    margin-bottom: 4px;
  }

  .there {
    margin-bottom: 12px;
  }

  .see {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .inline-link {
    padding: 0;
    font: inherit;
    color: var(--colour-accent);
    text-decoration: underline;
    text-underline-offset: 2px;
    background: none;
    border: 0;
    cursor: pointer;
  }

  code {
    padding-inline: 4px;
    font-family: var(--font-mono, ui-monospace, Consolas, monospace);
    font-size: 0.92em;
    background: var(--colour-surface-soft);
    border-radius: 3px;
  }
</style>
