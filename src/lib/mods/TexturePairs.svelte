<script lang="ts">
  import { t } from "../i18n/runtime";
  import { inFolder, readViewable } from "../media/desktopClient";
  import MediaCompare from "../media/MediaCompare.svelte";
  import type { MediaSource } from "../media/source";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import Pager from "../shell/Pager.svelte";
  import { pageOf } from "../shell/paging";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import { heard, started } from "../shell/progress";
  import type { Failure } from "../shell/types";
  import {
    readTexturePairs,
    type TexturePair,
    type TexturePairs,
  } from "./desktopClient";

  /**
   * A mod's pictures beside the encoded textures the game loads in their place (0.53.0; the owner's choice of 23 Nov 2026, the
   * encoded texture check): whether encoding kept the picture, and whether a stale texture still shows an old one. Read on a press,
   * since a mod may hold hundreds. Only reads.
   */
  let { game, name }: { game: string; name: string } = $props();

  type Filter = "all" | TexturePair["state"];
  /** Pairs listed a page (agent default). */
  const PER_PAGE = 12;
  /** How far an encoded pixel may differ before it is marked, at first: encoding shifts most pixels a little (agent default). */
  const ENCODED_TOLERANCE = 16;

  const STATE_WORDS: Record<TexturePair["state"], string> = {
    fresh: "mods-pairs-fresh",
    stale: "mods-pairs-stale",
    missing: "mods-pairs-missing",
    "left-over": "mods-pairs-left-over",
  };
  const FILTERS: Filter[] = ["all", "stale", "missing", "left-over", "fresh"];

  let open = $state(false);
  let reading = $state<
    | { state: "idle" }
    | { state: "reading" }
    | { state: "failed"; failure: Failure }
    | { state: "ready"; found: TexturePairs }
  >({ state: "idle" });
  let progress = $state(started());
  let filter = $state<Filter>("all");
  let search = $state("");
  let page = $state(1);
  let chosen = $state<TexturePair | null>(null);

  async function load() {
    reading = { state: "reading" };
    progress = started();
    const answer = await readTexturePairs(game, name, (message) => {
      progress = heard(progress, message);
    });
    reading = answer;
  }

  function toggle() {
    open = !open;
    if (open && reading.state === "idle") void load();
  }

  function fileName(pair: TexturePair): string {
    const path = pair.picture ?? pair.encoded ?? "";
    return path.split("/").pop() ?? path;
  }

  const listed = $derived(
    reading.state === "ready"
      ? reading.found.pairs.filter(
          (p) =>
            (filter === "all" || p.state === filter) &&
            (search.trim() === "" ||
              (p.picture ?? p.encoded ?? "")
                .toLowerCase()
                .includes(search.trim().toLowerCase())),
        )
      : [],
  );
  const paged = $derived(pageOf(listed, page, PER_PAGE));

  const source = $derived.by((): MediaSource | null => {
    if (reading.state !== "ready" || !chosen) return null;
    const { folder, flipped } = reading.found;
    const pair = chosen;
    const picturePath = pair.picture ? inFolder(folder, pair.picture) : null;
    const encodedPath = pair.encoded ? inFolder(folder, pair.encoded) : null;
    return {
      key: `${name}/${pair.picture ?? pair.encoded}`,
      before: picturePath
        ? {
            label: t("mods-pairs-picture"),
            path: picturePath,
            read: () => readViewable(picturePath),
          }
        : null,
      after: encodedPath
        ? {
            label: t("mods-pairs-encoded"),
            path: encodedPath,
            read: () => readViewable(encodedPath),
            turnOver: flipped,
          }
        : null,
      tolerance: ENCODED_TOLERANCE,
      place: "textures",
      alone:
        pair.state === "missing"
          ? t("mods-pairs-alone-missing")
          : t("mods-pairs-alone-left-over"),
    };
  });
</script>

<button type="button" class="action" aria-expanded={open} onclick={toggle}>
  {open ? t("mods-pairs-hide") : t("mods-pairs-show")}
</button>

{#if open}
  <div class="pairs">
    {#if reading.state === "reading"}
      <ProgressBar {progress} fallback={t("mods-pairs-reading")} />
    {:else if reading.state === "failed"}
      <FailurePanel failure={reading.failure} onretry={load} />
    {:else if reading.state === "ready"}
      {@const found = reading.found}
      <p class="small">
        {t("mods-pairs-counts", {
          total: found.total,
          fresh: found.counts.fresh,
          stale: found.counts.stale,
          missing: found.counts.missing,
          leftOver: found.counts["left-over"],
        })}
      </p>
      <p class="small muted">{t("mods-pairs-how")}</p>
      <div class="bar">
        <div class="toggles" role="group" aria-label={t("mods-pairs-filter")}>
          {#each FILTERS.filter((f) => f === "all" || found.counts[f] > 0) as choice (choice)}
            <button
              type="button"
              class="toggle"
              aria-pressed={filter === choice}
              onclick={() => {
                filter = choice;
                page = 1;
              }}
              >{choice === "all"
                ? t("mods-pairs-all")
                : t(STATE_WORDS[choice])}</button
            >
          {/each}
        </div>
        <label class="find">
          <span>{t("mods-pairs-find")}</span>
          <input type="search" bind:value={search} oninput={() => (page = 1)} />
        </label>
      </div>
      <Pager
        page={paged.page}
        pages={paged.pages}
        first={paged.first}
        last={paged.last}
        total={paged.total}
        label={t("mods-pairs-pages", { name })}
        onchange={(next) => (page = next)}
      />
      <ul class="list">
        {#each paged.items as pair (pair.picture ?? pair.encoded)}
          <li>
            <button
              type="button"
              class="pair"
              aria-pressed={chosen === pair}
              onclick={() => (chosen = pair)}
            >
              <span class="name">{fileName(pair)}</span>
              <span class="state {pair.state}"
                >{t(STATE_WORDS[pair.state])}</span
              >
            </button>
          </li>
        {/each}
      </ul>
      {#if source && chosen}
        <h6 class="chosen">{chosen.picture ?? chosen.encoded}</h6>
        <MediaCompare {source} />
      {/if}
    {/if}
  </div>
{/if}

<style>
  .pairs {
    margin: 6px 0 12px;
    padding: 8px 12px;
    background: var(--colour-canvas);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .small {
    margin: 4px 0;
    font-size: var(--type-small);
  }

  .bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 16px;
    margin-block: 6px;
  }

  .toggles {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .find {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: var(--type-small);
  }

  .find input {
    min-height: var(--control-min);
    padding: 0 8px;
    font: inherit;
    color: var(--colour-text);
    background: var(--colour-surface);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 4px;
    margin: 6px 0;
    padding: 0;
    list-style: none;
  }

  .pair {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    width: 100%;
    min-height: var(--control-min);
    padding: 4px 10px;
    font: inherit;
    font-size: var(--type-small);
    text-align: start;
    color: var(--colour-text);
    background: transparent;
    border: 1px solid var(--colour-line);
    border-radius: 4px;
    cursor: pointer;
  }

  .pair[aria-pressed="true"] {
    background: var(--colour-surface-soft);
    border: 2px solid var(--colour-accent);
  }

  .name {
    overflow-wrap: anywhere;
  }

  .state {
    flex: none;
    font-size: var(--type-caption);
    color: var(--colour-text-muted);
  }

  .state.stale {
    color: var(--colour-risk);
    font-weight: 600;
  }

  .chosen {
    margin: 10px 0 4px;
    font-family: var(--font-mono, ui-monospace, Consolas, monospace);
    font-size: var(--type-small);
    overflow-wrap: anywhere;
  }
</style>
