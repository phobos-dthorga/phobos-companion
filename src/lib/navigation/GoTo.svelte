<script lang="ts">
  import { onMount } from "svelte";
  import { readChanges } from "../code/desktopClient";
  import { askConnections } from "../connections/desktopClient";
  import type { Found } from "../connections/types";
  import type { GameHome } from "../home/types";
  import { t } from "../i18n/runtime";
  import { readCatalogue } from "../reports/desktopClient";
  import { readSettings } from "../settings/desktopClient";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import WindowDialog from "../shell/WindowDialog.svelte";
  import { started } from "../shell/progress";
  import { readTestLists } from "../tests/desktopClient";
  import { readTimeline } from "../timeline/desktopClient";
  import { readStatus } from "../memory/desktopClient";
  import { formatStarted } from "../memory/presentation";
  import type { StatusData } from "../memory/types";
  import {
    fromAddress,
    fromChanges,
    fromCode,
    fromGuide,
    fromPages,
    fromReports,
    fromWatches,
    fromSettings,
    fromTests,
    fromTimeline,
    KINDS,
    rank,
    type Candidate,
    type Kind,
  } from "./goto";
  import type { Place } from "./place";
  import { ENTRIES, GUIDE_KIND_WORDS } from "../guide/entries";

  /**
   * Go to anything (docs/cross-links.md, N2): one search over pages, changelog versions and entries, methods, classes and Defs,
   * test rows, timeline versions, settings and reports, for the game shown; or a pasted address. A result opens its place.
   */
  let {
    game,
    onclose,
    onchoose,
  }: {
    game: GameHome | null;
    onclose: () => void;
    onchoose: (where: Place) => void;
  } = $props();

  type Source = "version" | "test" | "fact" | "setting" | "report" | "watch";
  const CODE_WAIT_MS = 350;

  let query = $state("");
  let loaded = $state<Record<Source, Candidate[] | "reading" | "failed">>({
    version: "reading",
    test: "reading",
    fact: "reading",
    setting: "reading",
    report: "reading",
    watch: "reading",
  });
  let code = $state<Candidate[]>([]);
  let searchingCode = $state(false);
  let input: HTMLInputElement;

  const KIND_KEYS: Record<Kind, string> = {
    address: "goto-kind-address",
    page: "goto-kind-page",
    guide: "goto-kind-guide",
    code: "goto-kind-code",
    version: "goto-kind-version",
    entry: "goto-kind-entry",
    test: "goto-kind-test",
    fact: "goto-kind-fact",
    setting: "goto-kind-setting",
    report: "goto-kind-report",
    watch: "goto-kind-watch",
  };

  const reading = $derived(Object.values(loaded).some((v) => v === "reading"));
  const failed = $derived(
    (Object.entries(loaded) as [Source, unknown][])
      .filter(([, v]) => v === "failed")
      .map(([k]) => t(KIND_KEYS[k])),
  );
  const candidates = $derived([
    ...fromAddress(query, t("goto-open-address")),
    ...fromPages(game?.id ?? null, (page) => t(`page-${page}`)),
    ...fromGuide(game?.id ?? null, ENTRIES, (kind) =>
      t(GUIDE_KIND_WORDS[kind as keyof typeof GUIDE_KIND_WORDS]),
    ),
    ...Object.values(loaded).flatMap((v) => (Array.isArray(v) ? v : [])),
    ...code,
  ]);
  const results = $derived(rank(candidates, query));
  const groups = $derived(
    KINDS.map((kind) => ({
      kind,
      items: results.filter((r) => r.kind === kind),
    })).filter((g) => g.items.length > 0),
  );

  function settle<T>(
    source: Source,
    answer: Promise<{ state: string } & Partial<T>>,
    read: (value: T) => Candidate[],
  ) {
    void answer.then((value) => {
      loaded[source] =
        value.state === "ready"
          ? read(value as T)
          : value.state === "browser"
            ? []
            : "failed";
    });
  }

  onMount(() => {
    input.focus();
    settle<{ list: { settings: Parameters<typeof fromSettings>[0] } }>(
      "setting",
      readSettings(),
      (v) => fromSettings(v.list.settings),
    );
    if (!game) {
      for (const source of [
        "version",
        "test",
        "fact",
        "report",
        "watch",
      ] as Source[])
        loaded[source] = [];
      return;
    }
    const id = game.id;
    settle<{ repositories: Parameters<typeof fromChanges>[1] }>(
      "version",
      readChanges(id),
      (v) => fromChanges(id, v.repositories),
    );
    settle<{ lists: Parameters<typeof fromTests>[1] }>(
      "test",
      readTestLists(id),
      (v) => fromTests(id, v.lists),
    );
    settle<{ timeline: { facts: Parameters<typeof fromTimeline>[1] } }>(
      "fact",
      readTimeline(id),
      (v) => fromTimeline(id, v.timeline.facts),
    );
    settle<{ entries: Parameters<typeof fromReports>[1] }>(
      "report",
      readCatalogue(id),
      (v) => fromReports(id, v.entries),
    );
    settle<{ status: StatusData | null }>("watch", readStatus(id, null), (v) =>
      fromWatches(id, v.status?.kept ?? [], formatStarted),
    );
  });

  // Code is searched as you type, a moment after the last key, in every repository of the game.
  let waiting: number | undefined;
  let asked = 0;
  $effect(() => {
    const text = query.trim();
    window.clearTimeout(waiting);
    if (!game || text.length < 2 || text.startsWith("dthorga://")) {
      code = [];
      searchingCode = false;
      return;
    }
    const id = game.id;
    const repositories = game.repositories ?? [];
    waiting = window.setTimeout(async () => {
      const mine = ++asked;
      searchingCode = true;
      const answers = await Promise.all(
        repositories.map((repository) =>
          askConnections<Found>(id, repository, "find", text).then((a) =>
            a.state === "ready" && a.answer.ok
              ? fromCode(id, repository, a.answer.data.things)
              : [],
          ),
        ),
      );
      if (mine !== asked) return;
      code = answers.flat();
      searchingCode = false;
    }, CODE_WAIT_MS);
  });

  function choose(candidate: Candidate) {
    onchoose(candidate.place);
  }

  function keydown(event: KeyboardEvent) {
    if (event.key === "Enter" && results.length > 0) {
      event.preventDefault();
      choose(results[0]);
    }
  }
</script>

<WindowDialog
  kicker={t("goto-kicker")}
  title={t("goto-title")}
  closeLabel={t("goto-close")}
  width={900}
  {onclose}
>
  <div class="body">
    <label for="goto-query">{t("goto-search-label")}</label>
    <input
      id="goto-query"
      type="search"
      bind:this={input}
      bind:value={query}
      onkeydown={keydown}
      spellcheck="false"
      autocomplete="off"
    />
    <p class="muted small">{t("goto-hint")}</p>
    {#if reading || searchingCode}
      <ProgressBar
        progress={started()}
        fallback={searchingCode
          ? t("goto-searching-code")
          : t("goto-gathering")}
      />
    {/if}
    {#if failed.length > 0}
      <p class="muted small">
        {t("goto-failed", { sources: failed.join(", ") })}
      </p>
    {/if}
    {#if query.trim() && groups.length === 0 && !reading && !searchingCode}
      <p class="muted">{t("goto-none", { query: query.trim() })}</p>
    {/if}
    {#each groups as group (group.kind)}
      <section aria-label={t(KIND_KEYS[group.kind])}>
        <h3>{t(KIND_KEYS[group.kind])}</h3>
        <ul>
          {#each group.items as item, index (`${group.kind}-${index}`)}
            <li>
              <button type="button" class="result" onclick={() => choose(item)}>
                <span class="label">{item.label}</span>
                {#if item.detail}<span class="muted small">{item.detail}</span
                  >{/if}
              </button>
            </li>
          {/each}
        </ul>
      </section>
    {/each}
  </div>
</WindowDialog>

<style>
  .body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-inline-end: 6px;
  }

  label {
    font-size: var(--type-small);
  }

  input {
    min-height: var(--control-min);
    padding-inline: 10px;
    font: inherit;
    font-size: var(--type-lead);
    color: var(--colour-text);
    background: var(--colour-canvas);
    border: 2px solid var(--colour-accent);
    border-radius: 4px;
  }

  h3 {
    margin: 10px 0 4px;
    font-size: var(--type-caption);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--colour-text-muted);
  }

  ul {
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
    align-items: baseline;
    gap: 2px 12px;
    width: 100%;
    min-height: var(--control-min);
    padding: 6px 10px;
    font: inherit;
    color: var(--colour-text);
    text-align: start;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
    cursor: pointer;
    overflow-wrap: anywhere;
  }

  .label {
    font-weight: 600;
  }
</style>
