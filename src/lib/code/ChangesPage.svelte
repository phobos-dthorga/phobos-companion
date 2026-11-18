<script lang="ts">
  import { onMount } from "svelte";
  import type { GameHome } from "../home/types";
  import { t } from "../i18n/runtime";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import { heard, started } from "../shell/progress";
  import CodeViewer from "./CodeViewer.svelte";
  import { readChanges } from "./desktopClient";
  import { entryParts } from "./presentation";
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
  let chosenKey = $state<string | null>(null);
  let viewing = $state<EntryRequest | null>(null);

  const choices = $derived<Choice[]>(
    reading.state === "ready"
      ? reading.repositories.flatMap((r) =>
          r.changelogs.map((log) => ({ repository: r.repository, log })),
        )
      : [],
  );
  const chosen = $derived(
    choices.find((c) => keyOf(c) === chosenKey) ?? choices[0] ?? null,
  );

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
    viewing = {
      repository: choice.repository,
      changelog: choice.log.changelog,
      product: choice.log.product,
      entry,
    };
  }

  /** The sections of one version, in the order its entries name them. */
  function bySection(entries: ChangelogEntry[]) {
    const sections: { section: string; entries: ChangelogEntry[] }[] = [];
    for (const entry of entries) {
      let found = sections.find((s) => s.section === entry.section);
      if (!found) {
        found = { section: entry.section, entries: [] };
        sections.push(found);
      }
      found.entries.push(entry);
    }
    return sections;
  }

  onMount(load);
</script>

<div class="eyebrow accent">{t("changes-kicker")}</div>
<h1>{t("changes-title", { game: game.name })}</h1>
<p class="lead">{t("changes-lead")}</p>

{#if reading.state === "reading"}
  <ProgressBar {progress} fallback={t("changes-reading")} />
{:else if reading.state === "browser"}
  <p class="muted">{t("changes-browser")}</p>
{:else if reading.state === "failed"}
  <FailurePanel failure={reading.failure} onretry={load} />
{:else if choices.length === 0}
  <p class="lead">{t("changes-none", { game: game.name })}</p>
{:else if chosen}
  <div class="products" role="group" aria-label={t("changes-products-label")}>
    {#each choices as choice (keyOf(choice))}
      <button
        type="button"
        class="product"
        aria-pressed={keyOf(choice) === keyOf(chosen)}
        onclick={() => (chosenKey = keyOf(choice))}
      >
        {choice.log.product}
      </button>
    {/each}
  </div>
  <p class="muted where">
    {t("changes-where", {
      repository: chosen.repository,
      path: chosen.log.changelog,
    })}
    <button type="button" class="action" onclick={load}>
      {t("changes-read-again")}
    </button>
  </p>

  {#each chosen.log.versions as version (version.version)}
    <section class="version" aria-label={version.version}>
      <h2>
        {version.version === "Unreleased"
          ? t("changes-unreleased")
          : version.version}
        {#if version.heading}
          <span class="muted heading-rest">{version.heading}</span>
        {/if}
      </h2>
      {#if version.summary}
        <p class="summary">{version.summary}</p>
      {/if}
      {#if version.entries.length === 0}
        <p class="muted">{t("changes-no-entries")}</p>
      {/if}
      {#each bySection(version.entries) as section (section.section)}
        {#if section.section}
          <h3>{section.section}</h3>
        {/if}
        <ul class="entries">
          {#each section.entries as entry, index (index)}
            {@const parts = entryParts(entry)}
            <li>
              <p class="entry-words">
                {#if parts.lead}<strong>{parts.lead}</strong>{/if}
                {parts.rest}
              </p>
              <button
                type="button"
                class="action"
                aria-label={t("code-show-for", { entry: entry.lead })}
                onclick={() => show(chosen, entry)}
              >
                {t("code-show")}
              </button>
            </li>
          {/each}
        </ul>
      {/each}
    </section>
  {/each}
  {#if chosen.log.versionsInAll > chosen.log.versions.filter((v) => v.version !== "Unreleased").length}
    <p class="muted how">
      {t("changes-older", {
        count:
          chosen.log.versionsInAll -
          chosen.log.versions.filter((v) => v.version !== "Unreleased").length,
        path: chosen.log.changelog,
      })}
    </p>
  {/if}
  <p class="muted how">{t("changes-how")}</p>
{/if}

{#if viewing}
  {#key `${viewing.changelog}/${viewing.entry.text}`}
    <CodeViewer
      game={game.id}
      request={viewing}
      onclose={() => (viewing = null)}
    />
  {/key}
{/if}

<style>
  h1 {
    margin-block: 4px 8px;
    font-family: var(--font-display);
    font-size: 2.25rem;
    font-weight: 600;
    line-height: 1.2;
  }

  .lead {
    max-width: 70ch;
    margin-bottom: 14px;
    font-size: var(--type-lead);
  }

  .products {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .product {
    min-height: var(--control-min);
    padding-inline: 18px;
    font: inherit;
    color: var(--colour-text-muted);
    background: transparent;
    border: 1px solid var(--colour-line);
    border-radius: 4px;
    cursor: pointer;
  }

  .product[aria-pressed="true"] {
    font-weight: 600;
    color: var(--colour-text);
    background: var(--colour-surface-soft);
    border: 2px solid var(--colour-accent);
  }

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
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .entries li {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding-top: 6px;
    border-top: 1px solid var(--colour-line);
  }

  .entry-words {
    flex: 1;
    min-width: 0;
    max-width: 100ch;
    margin: 0;
    font-size: var(--type-small);
  }

  .entries .action {
    flex: none;
  }

  .how {
    max-width: 80ch;
    margin-top: 14px;
    font-size: var(--type-small);
  }

  @media (max-width: 700px) {
    .entries li {
      flex-direction: column;
      gap: 6px;
    }
  }
</style>
