<script lang="ts">
  import { go, here, setFocus } from "../navigation/navigation.svelte";
  import { untrack } from "svelte";
  import type { GameHome } from "../home/types";
  import { t } from "../i18n/runtime";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import { heard, started } from "../shell/progress";
  import type { Failure } from "../shell/types";
  import ConnectionsView from "./ConnectionsView.svelte";
  import BusiestCode from "./BusiestCode.svelte";
  import { askConnections } from "./desktopClient";
  import { kindMark, whereWords } from "./presentation";
  import type { Found, Summary, Thing } from "./types";

  /**
   * The Code map: search a repository's code for any class, method, Def or function, then follow how it connects. Every game's
   * repositories are read the same way, in whichever of C#, XML Defs, Lua and Python they hold.
   */
  let { game }: { game: GameHome } = $props();

  type Reading<T> =
    | { state: "idle" }
    | { state: "reading" }
    | { state: "ready"; data: T }
    | { state: "refused"; reason: string }
    | { state: "failed"; failure: Failure };

  const repositories = $derived(game.repositories ?? []);
  /** The repository and the thing in the middle are part of the place. */
  const repository = $derived(here().focus.repository || null);
  const chosenId = $derived(here().focus.node || null);
  let summary = $state<Reading<Summary>>({ state: "idle" });
  let found = $state<Reading<Found>>({ state: "idle" });
  let progress = $state(started());
  let search = $state("");

  const current = $derived(repository ?? repositories[0] ?? null);

  async function read() {
    if (!current) return;
    summary = { state: "reading" };
    progress = started();
    found = { state: "idle" };
    const asked = await askConnections<Summary>(
      game.id,
      current,
      "summary",
      null,
      {
        onProgress: (message) => {
          progress = heard(progress, message);
        },
      },
    );
    summary =
      asked.state === "failed"
        ? asked
        : asked.answer.ok
          ? { state: "ready", data: asked.answer.data }
          : { state: "refused", reason: asked.answer.refusal ?? "" };
  }

  async function find() {
    const name = search.trim();
    if (!current || !name) return;
    found = { state: "reading" };
    const asked = await askConnections<Found>(game.id, current, "find", name);
    found =
      asked.state === "failed"
        ? asked
        : asked.answer.ok
          ? { state: "ready", data: asked.answer.data }
          : { state: "refused", reason: asked.answer.refusal ?? "" };
  }

  function pick(name: string) {
    setFocus({ repository: name, node: "" });
  }

  // Reads again whenever the repository changes: chosen here, by Back, or by a link.
  $effect(() => {
    if (current) untrack(() => void read());
  });
</script>

<div class="eyebrow accent">{t("codemap-kicker")}</div>
<h1>{t("codemap-title", { game: game.name })}</h1>
<p class="lead">{t("codemap-lead")}</p>

{#if repositories.length === 0}
  <p class="lead">{t("codemap-no-repositories", { game: game.name })}</p>
{:else}
  {#if repositories.length > 1}
    <div
      class="toggles"
      role="group"
      aria-label={t("codemap-repository-label")}
    >
      {#each repositories as name (name)}
        <button
          type="button"
          class="toggle"
          aria-pressed={current === name}
          onclick={() => pick(name)}>{name}</button
        >
      {/each}
    </div>
  {/if}

  {#if summary.state === "reading"}
    <ProgressBar {progress} fallback={t("codemap-reading")} />
  {:else if summary.state === "failed"}
    <FailurePanel failure={summary.failure} onretry={read} />
  {:else if summary.state === "refused"}
    <p class="lead">{t("connections-refused", { reason: summary.reason })}</p>
  {:else if summary.state === "ready"}
    {#if summary.data.readers.length === 0}
      <p class="lead">
        {t("codemap-nothing-read", { repository: current ?? "" })}
      </p>
    {:else}
      <ul class="readers small">
        {#each summary.data.readers as reader (reader.language)}
          <li>
            <strong>{reader.language}</strong>: {reader.how}
            <span class="muted"
              >{t("codemap-reader-counts", {
                things: reader.nodes,
                connections: reader.edges,
              })}</span
            >
          </li>
        {/each}
      </ul>
      <form
        class="search"
        onsubmit={(event) => {
          event.preventDefault();
          void find();
        }}
      >
        <label for="codemap-search">{t("codemap-search-label")}</label>
        <div class="search-row">
          <input
            id="codemap-search"
            data-shortcut-search
            type="search"
            bind:value={search}
            spellcheck="false"
            autocomplete="off"
          />
          <button
            type="submit"
            class="action"
            disabled={!search.trim() || found.state === "reading"}
          >
            {found.state === "reading"
              ? t("codemap-searching")
              : t("codemap-search")}
          </button>
        </div>
      </form>

      {#if found.state === "reading"}
        <ProgressBar
          progress={started()}
          fallback={t("codemap-searching-bar", { name: search.trim() })}
        />
      {:else if found.state === "failed"}
        <FailurePanel failure={found.failure} onretry={find} />
      {:else if found.state === "refused"}
        <p class="lead">{t("connections-refused", { reason: found.reason })}</p>
      {:else if found.state === "ready" && !chosenId}
        {#if found.data.things.length === 0}
          <p class="muted">
            {t("codemap-none-found", { repository: current ?? "" })}
          </p>
        {:else}
          <p class="muted small">
            {t("codemap-found", { count: found.data.things.length })}
          </p>
          <ul class="results">
            {#each found.data.things as thing (thing.id)}
              <li>
                <button
                  type="button"
                  class="result"
                  onclick={() => setFocus({ node: thing.id })}
                >
                  <span class="mark-letter" aria-hidden="true"
                    >{kindMark(thing)}</span
                  >
                  <span class="name">{thing.name}</span>
                  <span class="muted small"
                    >{thing.kind} · {whereWords(thing)}</span
                  >
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      {/if}

      {#if !chosenId && found.state !== "ready" && current}
        {#key current}
          <BusiestCode
            game={game.id}
            repository={current}
            onopen={(id) => setFocus({ node: id })}
          />
        {/key}
      {/if}

      {#if chosenId && current}
        <button
          type="button"
          class="action back"
          onclick={() => setFocus({ node: "" })}
          >{t("codemap-back-to-results")}</button
        >
        {#key `${current}/${chosenId}`}
          <ConnectionsView
            game={game.id}
            repository={current}
            start={chosenId}
            onrecentre={(id) =>
              go({ ...here(), focus: { ...here().focus, node: id } })}
          />
        {/key}
      {/if}
    {/if}
  {/if}
  <p class="muted how">{t("codemap-how")}</p>
{/if}

<style>
  .readers {
    margin: 10px 0;
    padding-inline-start: 18px;
  }

  .search {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-width: 640px;
    margin-bottom: 12px;
  }

  .search label {
    font-size: var(--type-small);
  }

  .search-row {
    display: flex;
    gap: 8px;
  }

  .search input {
    flex: 1;
    min-width: 0;
    min-height: var(--control-min);
    padding-inline: 10px;
    font: inherit;
    color: var(--colour-text);
    background: var(--colour-canvas);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .results {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .result {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 10px;
    width: 100%;
    min-height: var(--control-min);
    padding: 4px 10px;
    font: inherit;
    color: var(--colour-text);
    text-align: start;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
    cursor: pointer;
    overflow-wrap: anywhere;
  }

  .name {
    font-weight: 600;
  }

  .mark-letter {
    display: inline-grid;
    place-items: center;
    width: 1.6em;
    height: 1.6em;
    font-size: var(--type-small);
    font-weight: 600;
    border: 1px solid var(--colour-line);
    border-radius: 50%;
  }

  .back {
    margin-bottom: 10px;
  }
</style>
