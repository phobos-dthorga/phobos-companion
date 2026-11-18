<script lang="ts" module>
  import { readTestCode, readTestLists } from "../tests/desktopClient";
  import type { CodePlace } from "../tests/links";
  import type { TestList } from "../tests/types";

  /**
   * What was read, kept while the window is open: a picture re-centres often, and the test list changes only when the owner
   * judges a row or the game notes one. Reading the Tests page again does not refresh this; a restart does.
   */
  const placesRead = new Map<string, Promise<CodePlace[]>>();
  const listsRead = new Map<string, Promise<TestList[]>>();

  function placesOf(game: string, repository: string): Promise<CodePlace[]> {
    const key = `${game}/${repository}`;
    if (!placesRead.has(key))
      placesRead.set(
        key,
        readTestCode(game, repository).then((answer) =>
          answer.state === "ready" ? answer.code.places : [],
        ),
      );
    return placesRead.get(key)!;
  }

  function listsOf(game: string): Promise<TestList[]> {
    if (!listsRead.has(game))
      listsRead.set(
        game,
        readTestLists(game).then((read) =>
          read.state === "ready" ? read.lists : [],
        ),
      );
    return listsRead.get(game)!;
  }
</script>

<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import { go } from "../navigation/navigation.svelte";
  import { rowOf, rowsWatching } from "../tests/links";

  /**
   * The in-game test rows a thing's code notes (cross-links L3): the rows whose seen-in-play keys it, or one of its members, writes.
   * Shown only in a repository that keeps a test list, and only when a row watches the thing; each opens on the Tests page.
   */
  let {
    game,
    repository,
    node,
    name,
  }: { game: string; repository: string; node: string; name: string } =
    $props();

  let places = $state<CodePlace[]>([]);
  let lists = $state<TestList[]>([]);

  onMount(async () => {
    places = await placesOf(game, repository);
    if (rowsWatching(places, node).length > 0) lists = await listsOf(game);
  });

  // A thing put in the middle later may be watched when the first was not.
  $effect(() => {
    if (rows.length > 0 && lists.length === 0)
      void listsOf(game).then((found) => (lists = found));
  });

  const rows = $derived(rowsWatching(places, node));

  function open(row: string) {
    go({ page: "tests", game, focus: { repository, row }, dialog: null });
  }
</script>

{#if rows.length > 0}
  <section class="watching" aria-label={t("connections-rows-title", { name })}>
    <h4>{t("connections-rows-title", { name })}</h4>
    <p class="muted small">{t("connections-rows-why")}</p>
    <div class="rows">
      {#each rows as row (row)}
        {@const found = rowOf(lists, repository, row)}
        <button type="button" class="action" onclick={() => open(row)}>
          {found
            ? t("connections-row", { row, title: found.title })
            : t("connections-row-number", { row })}
        </button>
      {/each}
    </div>
  </section>
{/if}

<style>
  .watching {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
    overflow-wrap: anywhere;
  }

  .watching h4,
  .watching p {
    margin: 0;
  }

  .watching h4 {
    font-size: var(--type-small);
    font-weight: 600;
  }

  .rows {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .rows .action {
    text-align: start;
  }
</style>
