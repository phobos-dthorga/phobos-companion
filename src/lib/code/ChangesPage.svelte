<script lang="ts">
  import Placeholder from "../shell/Placeholder.svelte";
  import { go, here, setFocus } from "../navigation/navigation.svelte";
  import { readTestLists } from "../tests/desktopClient";
  import { waitingOn } from "../tests/links";
  import type { TestList } from "../tests/types";
  import { openDialog } from "../navigation/navigation.svelte";
  import { onMount } from "svelte";
  import type { GameHome } from "../home/types";
  import { t } from "../i18n/runtime";
  import GuideLink from "../guide/GuideLink.svelte";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import { heard, started } from "../shell/progress";
  import { readChanges } from "./desktopClient";
  import {
    releasedCount,
    sections,
    versionWords,
  } from "../changelog/presentation";
  import RichText from "../shell/RichText.svelte";
  import RepositoryCommits from "./RepositoryCommits.svelte";
  import Pager from "../shell/Pager.svelte";
  import { pageFrom, pageOf } from "../shell/paging";
  import { commitRuns, plainText } from "../shell/inline";
  import type {
    ChangelogEntry,
    ChangelogList,
    ChangesReading,
    EntryRequest,
  } from "./types";

  /**
   * What each of a game's repositories' changelogs say changed lately, with the code behind any entry a press away. It reads
   * changelogs and git only, so it works the same for every game on the owner's list.
   */
  let { game }: { game: GameHome } = $props();

  type Choice = { repository: string; log: ChangelogList };

  let reading = $state<ChangesReading>({ state: "reading" });
  let progress = $state(started());
  /** The chosen changelog is part of the place, so Back returns to it and an address names it. */
  const chosenKey = $derived(
    here().focus.repository && here().focus.changelog
      ? `${here().focus.repository}/${here().focus.changelog}`
      : null,
  );

  const choices = $derived<Choice[]>(
    reading.state === "ready"
      ? reading.repositories.flatMap((r) =>
          r.changelogs.map((log) => ({ repository: r.repository, log })),
        )
      : [],
  );
  /** A link may name the product instead of its changelog (the Home page's "not yet released"). */
  const chosenProduct = $derived(
    here().focus.repository && here().focus.product
      ? choices.find(
          (c) =>
            c.repository === here().focus.repository &&
            c.log.product === here().focus.product,
        )
      : undefined,
  );
  const chosen = $derived(
    choices.find((c) => keyOf(c) === chosenKey) ??
      chosenProduct ??
      choices[0] ??
      null,
  );

  /** Repositories with no changelog (0.53.0): their commits are listed instead, a press away. */
  const bare = $derived(
    reading.state === "ready"
      ? reading.repositories
          .filter((r) => r.changelogs.length === 0)
          .map((r) => r.repository)
      : [],
  );
  /** The repository whose commits are shown: the one the place names, or the only kind there is. */
  const commitsOf = $derived(
    bare.find((r) => r === here().focus.commits) ??
      (choices.length === 0 ? (bare[0] ?? null) : null),
  );

  /** Versions a page: the newest six first; the page is part of the place, so Back returns to it. */
  const VERSIONS_PER_PAGE = 6;
  const paged = $derived(
    pageOf(
      chosen?.log.versions ?? [],
      pageFrom(here().focus.page),
      VERSIONS_PER_PAGE,
    ),
  );

  /** A page turn is a step, so Back turns back. */
  function turn(page: number) {
    go({ ...here(), focus: { ...here().focus, page: String(page) } });
  }

  function keyOf(choice: Choice) {
    return `${choice.repository}/${choice.log.changelog}`;
  }

  async function load() {
    reading = { state: "reading" };
    progress = started();
    reading = await readChanges(game.id, (message) => {
      progress = heard(progress, message);
    });
  }

  function show(choice: Choice, entry: ChangelogEntry) {
    viewCode({
      repository: choice.repository,
      changelog: choice.log.changelog,
      product: choice.log.product,
      entry,
    });
  }

  function viewCode(request: EntryRequest) {
    openDialog({ kind: "code", request });
  }

  /** The label a "show the code" button reads out: the entry it opens, and how many more the same commit wrote. */
  function codeLabel(run: ChangelogEntry[]) {
    return run.length > 1
      ? t("code-show-for-run", {
          entry: plainText(run[0].lead),
          more: run.length - 1,
        })
      : t("code-show-for", { entry: plainText(run[0].lead) });
  }

  /** The game's test lists, for the rows still waiting on each version (cross-links L3); empty until read, or with none. */
  let testLists = $state<TestList[]>([]);

  function openRow(repository: string, row: string) {
    go({
      page: "tests",
      game: game.id,
      focus: { repository, row },
      dialog: null,
    });
  }

  onMount(() => {
    void load();
    void readTestLists(game.id).then((read) => {
      if (read.state === "ready") testLists = read.lists;
    });
  });
</script>

<div class="eyebrow accent">{t("changes-kicker")}</div>
<h1>{t("changes-title", { game: game.name })}</h1>
<p class="lead">{t("changes-lead")}</p>

{#if reading.state === "reading"}
  <ProgressBar {progress} fallback={t("changes-reading")} />
  <Placeholder shape="rows" rows={6} />
{:else if reading.state === "browser"}
  <p class="muted">{t("changes-browser")}</p>
{:else if reading.state === "failed"}
  <FailurePanel failure={reading.failure} onretry={load} />
{:else if choices.length === 0 && bare.length === 0}
  <p class="lead">{t("changes-none", { game: game.name })}</p>
  <GuideLink entry="task-repository-ready" words={t("guide-ready-link")} />
{:else if commitsOf}
  {@render toggles()}
  <RepositoryCommits
    game={game.id}
    repository={commitsOf}
    page={pageFrom(here().focus.page)}
    onturn={turn}
  />
{:else if chosen}
  {@render toggles()}
  <p class="muted where">
    {t("changes-where", {
      repository: chosen.repository,
      path: chosen.log.changelog,
    })}
    <button type="button" class="action" onclick={load}>
      {t("changes-read-again")}
    </button>
  </p>

  {@render pager()}
  {#each paged.items as version (version.version)}
    {@const runs = commitRuns(version.entries)}
    {@const waiting = waitingOn(testLists, chosen.log.product, version.version)}
    <section class="version" aria-label={version.version}>
      <div class="version-head">
        <h2>
          {versionWords(version.version)}
          {#if version.heading}
            <span class="muted heading-rest">{version.heading}</span>
          {/if}
        </h2>
        {#if runs.length === 1}
          <button
            type="button"
            class="action"
            aria-label={codeLabel(runs[0])}
            onclick={() => show(chosen, runs[0][0])}
          >
            {t("code-show-version")}
          </button>
        {/if}
      </div>
      {#if version.summary}
        <p class="summary">{version.summary}</p>
      {/if}
      {#if waiting.length > 0}
        <div class="waiting">
          <span class="muted">{t("changes-tests-waiting")}</span>
          {#each waiting as found (`${found.repository}/${found.row.id}`)}
            <button
              type="button"
              class="action"
              onclick={() => openRow(found.repository, found.row.id)}
              >{t("changes-test-row", {
                row: found.row.id,
                title: found.row.title,
              })}</button
            >
          {/each}
        </div>
      {/if}
      {#if version.entries.length === 0}
        <p class="muted">{t("changes-no-entries")}</p>
      {:else if runs.length === 1}
        {#each sections(version.entries) as section (section.section)}
          {#if section.section}
            <h3>{section.section}</h3>
          {/if}
          <ul class="entries">
            {#each section.entries as entry, index (index)}
              <li><RichText text={entry.text} /></li>
            {/each}
          </ul>
        {/each}
      {:else}
        <p class="muted small">
          {t("changes-several-commits", { count: runs.length })}
        </p>
        {#each runs as run, runIndex (runIndex)}
          <div class="run">
            {#each sections(run) as section (section.section)}
              {#if section.section}
                <h3>{section.section}</h3>
              {/if}
              <ul class="entries">
                {#each section.entries as entry, index (index)}
                  <li><RichText text={entry.text} /></li>
                {/each}
              </ul>
            {/each}
            <button
              type="button"
              class="action run-button"
              aria-label={codeLabel(run)}
              onclick={() => show(chosen, run[0])}
            >
              {run.length > 1
                ? t("code-show-run", { count: run.length })
                : t("code-show")}
            </button>
          </div>
        {/each}
      {/if}
    </section>
  {/each}
  {@render pager()}
  {#if chosen.log.versionsInAll > releasedCount(chosen.log.versions)}
    <p class="muted how">
      {t("changes-older", {
        count: chosen.log.versionsInAll - releasedCount(chosen.log.versions),
        path: chosen.log.changelog,
      })}
    </p>
  {/if}
  <p class="muted how">{t("changes-how")}</p>
{/if}

{#snippet toggles()}
  <div class="toggles" role="group" aria-label={t("changes-products-label")}>
    {#each choices as choice (keyOf(choice))}
      <button
        type="button"
        class="toggle"
        aria-pressed={!commitsOf && !!chosen && keyOf(choice) === keyOf(chosen)}
        onclick={() =>
          setFocus({
            repository: choice.repository,
            changelog: choice.log.changelog,
            commits: "",
            page: "",
          })}
      >
        {choice.log.product}
      </button>
    {/each}
    {#each bare as repository (repository)}
      <button
        type="button"
        class="toggle"
        aria-pressed={commitsOf === repository}
        onclick={() =>
          setFocus({
            repository: "",
            changelog: "",
            commits: repository,
            page: "",
          })}
      >
        {t("changes-commits-of", { repository })}
      </button>
    {/each}
  </div>
{/snippet}

{#snippet pager()}
  <Pager
    page={paged.page}
    pages={paged.pages}
    first={paged.first}
    last={paged.last}
    total={paged.total}
    label={t("changes-pages", { product: chosen?.log.product ?? "" })}
    onchange={turn}
  />
{/snippet}

<style>
  .where {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 16px;
    margin-block: 10px 6px;
    font-size: var(--type-small);
    overflow-wrap: anywhere;
  }

  .version {
    margin-top: 14px;
    padding: 14px 18px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .version-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 6px 16px;
  }

  .run {
    margin-block: 8px 12px;
    padding-inline-start: 12px;
    border-inline-start: 2px solid var(--colour-line);
  }

  .run-button {
    margin-top: 6px;
  }

  .small {
    margin-block: 4px;
    font-size: var(--type-small);
  }

  h2 {
    margin: 0 0 4px;
    font-family: var(--font-display);
    font-size: 1.375rem;
    font-weight: 600;
  }

  .heading-rest {
    margin-inline-start: 10px;
    font-family: var(--font-body, inherit);
    font-size: var(--type-small);
    font-weight: 400;
  }

  .waiting {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 8px;
    margin: 0 0 8px;
    overflow-wrap: anywhere;
  }

  .summary {
    max-width: 90ch;
    margin: 0 0 8px;
    font-size: var(--type-small);
  }

  h3 {
    margin: 12px 0 4px;
    font-size: var(--type-caption);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--colour-text-muted);
  }

  .entries {
    max-width: 110ch;
    margin: 0;
    padding-inline-start: 20px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: var(--type-small);
  }
</style>
