<script lang="ts">
  import { untrack } from "svelte";
  import { LOCALE, t } from "../i18n/runtime";
  import type { GameHome } from "../home/types";
  import { here, setFocus } from "../navigation/navigation.svelte";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import { heard, started } from "../shell/progress";
  import OptionChart from "../charts/OptionChart.svelte";
  import { readChartTheme } from "../charts/chartTheme";
  import { readTestLists } from "../tests/desktopClient";
  import type { TestList } from "../tests/types";
  import { askMakeup } from "./desktopClient";
  import {
    growthOptions,
    HEAT_RAMP,
    kindColours,
    mixOptions,
    rowsHeight,
    testedOptions,
    treemapOptions,
    type Palette,
    type Words,
  } from "./charts";
  import {
    formatAmount,
    growthOf,
    KIND_WORDS,
    kindRole,
    kindsPresent,
    measured,
    mixOf,
    ownerOf,
    TEST_STATE_WORDS,
    TEST_STATES,
    testedOf,
    treeOf,
  } from "./presentation";
  import type {
    Census,
    Churn,
    Growth,
    Kind,
    MadeFile,
    MadeNow,
    Measure,
    Reading,
  } from "./types";

  /**
   * What a game's repositories are made of (the owner's request, 19 Nov 2026): every committed file by product and kind, how it
   * grew day by day, where the work goes, how much is tested in game, and what each product holds for players. Every picture has
   * its numbers beside it. Works for any game; the census needs XML Defs, and the test picture a test list.
   */
  let { game }: { game: GameHome } = $props();

  const CHURN_DAYS = 30;
  const TREE_PX = 520;
  const GROWTH_PX = 340;
  const BIGGEST = 12;

  const repositories = $derived(game.repositories ?? []);
  const repository = $derived(
    here().focus.repository && repositories.includes(here().focus.repository)
      ? here().focus.repository
      : (repositories[0] ?? null),
  );

  let measure = $state<Measure>("lines");
  let colourBy = $state<"kind" | "change">("kind");
  let shown = $state<Record<string, boolean>>({});
  let failedCharts = $state<Record<string, boolean>>({});
  let progress = $state(started());
  let now = $state<Reading<MadeNow>>({ state: "reading" });
  let growth = $state<Reading<Growth>>({ state: "reading" });
  let churn = $state<Reading<Churn>>({ state: "reading" });
  let census = $state<Reading<Census>>({ state: "reading" });
  let lists = $state<TestList[] | null>(null);

  async function load(name: string) {
    now = { state: "reading" };
    growth = { state: "reading" };
    churn = { state: "reading" };
    census = { state: "reading" };
    progress = started();
    now = await askMakeup<MadeNow>(game.id, name, "now", {
      onProgress: (message) => (progress = heard(progress, message)),
    });
    void askMakeup<Growth>(game.id, name, "growth").then((r) => (growth = r));
    void askMakeup<Churn>(game.id, name, "churn", { days: CHURN_DAYS }).then(
      (r) => (churn = r),
    );
    void askMakeup<Census>(game.id, name, "census").then((r) => (census = r));
  }

  $effect(() => {
    const name = repository;
    if (name) untrack(() => void load(name));
  });

  $effect(() => {
    void readTestLists(game.id).then((read) => {
      lists = read.state === "ready" ? read.lists : [];
    });
  });

  function choose(name: string) {
    setFocus({ repository: name });
  }

  function toggle(key: string) {
    shown = { ...shown, [key]: !shown[key] };
  }

  function outside(group: string) {
    return group ? t("makeup-outside", { group }) : t("makeup-outside-top");
  }

  const owner = (file: MadeFile) => ownerOf(file, outside);

  /** The census names a group outside any product in brackets, "(docs)"; say it as the other pictures do. */
  function censusName(name: string): string {
    const group = /^\((.*)\)$/.exec(name);
    return group ? outside(group[1]) : name;
  }

  function palette(): Palette {
    const theme = readChartTheme();
    const style = getComputedStyle(document.documentElement);
    const colour = (role: string) =>
      style.getPropertyValue(`--colour-${role}`).trim();
    return {
      kinds: kindColours(colour),
      states: {
        passed: theme.roles.success,
        seen: theme.roles.observed,
        waiting: theme.muted,
        failed: theme.roles.risk,
      },
      heat: HEAT_RAMP,
      text: theme.text,
      muted: theme.muted,
      line: theme.line,
      surface: theme.surface,
      font: theme.font,
    };
  }

  const words: Words = $derived({
    kind: (kind: Kind) => t(KIND_WORDS[kind]),
    state: (state) => t(TEST_STATE_WORDS[state]),
    amount: (value: number) => formatAmount(value, measure, LOCALE),
    changes: (count: number) => t("makeup-changes", { count }),
    everything: t("makeup-everything"),
  });

  const files = $derived(now.state === "ready" ? now.data.files : []);
  const tree = $derived(treeOf(files, measure, owner));
  const mix = $derived(mixOf(files, measure, owner));
  const mixKinds = $derived(kindsPresent(mix.totals.values()));
  const changesOf = $derived(
    new Map(
      (churn.state === "ready" ? churn.data.files : []).map((f) => [
        f.path,
        f.commits,
      ]),
    ),
  );
  const growthData = $derived(
    growth.state === "ready" ? growthOf(growth.data.points, measure) : null,
  );
  const tested = $derived(
    lists ? testedOf(lists, t("makeup-tested-unnamed")) : null,
  );
  const testedProducts = $derived(
    tested
      ? [...tested.keys()].sort(
          (a, b) =>
            TEST_STATES.reduce((n, s) => n + tested.get(b)![s], 0) -
              TEST_STATES.reduce((n, s) => n + tested.get(a)![s], 0) ||
            a.localeCompare(b),
        )
      : [],
  );
  const biggest = $derived(
    [...files]
      .filter((f) => measured(f, measure) > 0)
      .sort((a, b) => measured(b, measure) - measured(a, measure))
      .slice(0, BIGGEST),
  );
  const totals = $derived({
    files: files.length,
    lines: files.reduce((n, f) => n + f.lines, 0),
    bytes: files.reduce((n, f) => n + f.bytes, 0),
  });

  function amount(value: number) {
    return formatAmount(value, measure, LOCALE);
  }

  function chartFailed(key: string) {
    failedCharts = { ...failedCharts, [key]: true };
    shown = { ...shown, [key]: true };
  }
</script>

<div class="eyebrow accent">{t("makeup-kicker")}</div>
<h1>{t("makeup-title", { game: game.name })}</h1>
<p class="lead">{t("makeup-lead")}</p>

{#if repositories.length === 0}
  <p class="lead">{t("codemap-no-repositories", { game: game.name })}</p>
{:else}
  <div class="controls">
    {#if repositories.length > 1}
      <div
        class="toggles"
        role="group"
        aria-label={t("makeup-repository-label")}
      >
        {#each repositories as name (name)}
          <button
            type="button"
            class="toggle"
            aria-pressed={name === repository}
            onclick={() => choose(name)}>{name}</button
          >
        {/each}
      </div>
    {/if}
    <div class="toggles" role="group" aria-label={t("makeup-measure-label")}>
      {#each [["lines", "makeup-measure-lines"], ["bytes", "makeup-measure-bytes"], ["files", "makeup-measure-files"]] as [value, key] (value)}
        <button
          type="button"
          class="toggle"
          aria-pressed={measure === value}
          onclick={() => (measure = value as Measure)}>{t(key)}</button
        >
      {/each}
    </div>
  </div>

  {#if now.state === "reading"}
    <ProgressBar {progress} fallback={t("makeup-reading")} />
  {:else if now.state === "failed"}
    <FailurePanel
      failure={now.failure}
      onretry={() => repository && load(repository)}
    />
  {:else}
    <p class="summary">
      {t("makeup-summary", {
        files: totals.files,
        lines: totals.lines.toLocaleString(LOCALE),
        size: formatAmount(totals.bytes, "bytes", LOCALE),
        commit: now.data.commit,
      })}
    </p>

    <section class="panel" aria-labelledby="makeup-made-title">
      <div class="panel-head">
        <h2 id="makeup-made-title">{t("makeup-made-title")}</h2>
        <div class="toggles" role="group" aria-label={t("makeup-colour-label")}>
          <button
            type="button"
            class="toggle"
            aria-pressed={colourBy === "kind"}
            onclick={() => (colourBy = "kind")}
            >{t("makeup-colour-kind")}</button
          >
          <button
            type="button"
            class="toggle"
            aria-pressed={colourBy === "change"}
            onclick={() => (colourBy = "change")}
            >{t("makeup-colour-change", { days: CHURN_DAYS })}</button
          >
        </div>
      </div>
      <p class="muted small">{t("makeup-made-how")}</p>
      {#if measure === "lines"}
        <p class="muted small">{t("makeup-lines-note")}</p>
      {/if}
      {#if !failedCharts.tree}
        <OptionChart
          options={(reducedMotion) =>
            treemapOptions(
              tree,
              palette(),
              words,
              colourBy === "change"
                ? (node) => (node.path ? (changesOf.get(node.path) ?? 0) : 0)
                : null,
              reducedMotion,
            )}
          height={TREE_PX}
          label={t("makeup-made-picture", {
            game: game.name,
            measure: t(`makeup-measure-${measure}`),
          })}
          onfailed={() => chartFailed("tree")}
        />
      {/if}
      {#if colourBy === "kind"}
        {@render key(mixKinds)}
      {:else}
        <p class="heat-key">
          <span>{t("makeup-heat-few")}</span>
          {#each HEAT_RAMP as colour (colour)}
            <span class="heat" style:background={colour} aria-hidden="true"
            ></span>
          {/each}
          <span>{t("makeup-heat-many")}</span>
        </p>
      {/if}
      <button
        type="button"
        class="action"
        aria-expanded={shown.tree ?? false}
        onclick={() => toggle("tree")}
        >{shown.tree
          ? t("chart-hide-numbers")
          : t("makeup-biggest-show")}</button
      >
      {#if shown.tree}
        <table>
          <caption
            >{t("makeup-biggest-caption", { count: biggest.length })}</caption
          >
          <thead>
            <tr>
              <th scope="col">{t("makeup-col-file")}</th>
              <th scope="col">{t("makeup-col-kind")}</th>
              <th scope="col" class="number"
                >{t(`makeup-measure-${measure}`)}</th
              >
              <th scope="col" class="number"
                >{t("makeup-col-changes", { days: CHURN_DAYS })}</th
              >
            </tr>
          </thead>
          <tbody>
            {#each biggest as file (file.path)}
              <tr>
                <td class="path">{file.path}</td>
                <td>{t(KIND_WORDS[file.kind])}</td>
                <td class="number">{amount(measured(file, measure))}</td>
                <td class="number">{changesOf.get(file.path) ?? 0}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </section>

    <section class="panel" aria-labelledby="makeup-mix-title">
      <h2 id="makeup-mix-title">{t("makeup-mix-title")}</h2>
      <p class="muted small">{t("makeup-mix-how")}</p>
      {#if !failedCharts.mix}
        <OptionChart
          options={(reducedMotion) =>
            mixOptions(mix, mixKinds, palette(), words, reducedMotion)}
          height={rowsHeight(mix.owners.length)}
          label={t("makeup-mix-picture", {
            measure: t(`makeup-measure-${measure}`),
          })}
          onfailed={() => chartFailed("mix")}
        />
      {/if}
      {@render key(mixKinds)}
      <button
        type="button"
        class="action"
        aria-expanded={shown.mix ?? false}
        onclick={() => toggle("mix")}
        >{shown.mix ? t("chart-hide-numbers") : t("chart-show-numbers")}</button
      >
      {#if shown.mix}
        <!-- svelte-ignore a11y_no_noninteractive_tabindex (a table wider than the window scrolls sideways, so the keyboard must reach it) -->
        <div
          class="scroll"
          tabindex="0"
          role="region"
          aria-label={t("makeup-numbers-of", { title: t("makeup-mix-title") })}
        >
          <table>
            <caption>{t("makeup-mix-title")}</caption>
            <thead>
              <tr>
                <th scope="col">{t("makeup-col-owner")}</th>
                {#each mixKinds as kind (kind)}
                  <th scope="col" class="number">{t(KIND_WORDS[kind])}</th>
                {/each}
              </tr>
            </thead>
            <tbody>
              {#each mix.owners as name (name)}
                <tr>
                  <th scope="row">{name}</th>
                  {#each mixKinds as kind (kind)}
                    <td class="number"
                      >{amount(mix.totals.get(name)?.get(kind) ?? 0)}</td
                    >
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </section>

    <section class="panel" aria-labelledby="makeup-growth-title">
      <h2 id="makeup-growth-title">{t("makeup-growth-title")}</h2>
      {#if measure === "files"}
        <p class="muted small">{t("makeup-growth-files")}</p>
      {/if}
      {#if growth.state === "reading"}
        <ProgressBar
          progress={started()}
          fallback={t("makeup-growth-reading")}
        />
      {:else if growth.state === "failed"}
        <FailurePanel
          failure={growth.failure}
          onretry={() => repository && load(repository)}
        />
      {:else if growthData}
        {#if !failedCharts.growth}
          <OptionChart
            options={(reducedMotion) =>
              growthOptions(
                growthData.days,
                growthData.series,
                palette(),
                words,
                reducedMotion,
              )}
            height={GROWTH_PX}
            label={t("makeup-growth-picture", {
              first: growthData.days[0] ?? "",
              last: growthData.days[growthData.days.length - 1] ?? "",
            })}
            onfailed={() => chartFailed("growth")}
          />
        {/if}
        {@render key(growthData.series.map((s) => s.kind))}
        <button
          type="button"
          class="action"
          aria-expanded={shown.growth ?? false}
          onclick={() => toggle("growth")}
          >{shown.growth
            ? t("chart-hide-numbers")
            : t("chart-show-numbers")}</button
        >
        {#if shown.growth}
          <!-- svelte-ignore a11y_no_noninteractive_tabindex (a table wider than the window scrolls sideways, so the keyboard must reach it) -->
          <div
            class="scroll"
            tabindex="0"
            role="region"
            aria-label={t("makeup-numbers-of", {
              title: t("makeup-growth-title"),
            })}
          >
            <table>
              <caption>{t("makeup-growth-title")}</caption>
              <thead>
                <tr>
                  <th scope="col">{t("makeup-col-day")}</th>
                  {#each growthData.series as series (series.kind)}
                    <th scope="col" class="number"
                      >{t(KIND_WORDS[series.kind])}</th
                    >
                  {/each}
                </tr>
              </thead>
              <tbody>
                {#each growthData.days as day, index (day)}
                  <tr>
                    <th scope="row">{day}</th>
                    {#each growthData.series as series (series.kind)}
                      <td class="number"
                        >{formatAmount(
                          series.values[index],
                          measure === "bytes" ? "bytes" : "lines",
                          LOCALE,
                        )}</td
                      >
                    {/each}
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      {/if}
    </section>

    <section class="panel" aria-labelledby="makeup-tested-title">
      <h2 id="makeup-tested-title">{t("makeup-tested-title")}</h2>
      <p class="muted small">{t("makeup-tested-how")}</p>
      {#if tested === null}
        <ProgressBar
          progress={started()}
          fallback={t("makeup-tested-reading")}
        />
      {:else if testedProducts.length === 0}
        <p class="small">{t("makeup-tested-none", { game: game.name })}</p>
      {:else}
        {#if !failedCharts.tested}
          <OptionChart
            options={(reducedMotion) =>
              testedOptions(
                testedProducts,
                tested,
                palette(),
                words,
                reducedMotion,
              )}
            height={rowsHeight(testedProducts.length)}
            label={t("makeup-tested-picture", { game: game.name })}
            onfailed={() => chartFailed("tested")}
          />
        {/if}
        <ul class="key" aria-label={t("chart-key")}>
          {#each TEST_STATES as state (state)}
            <li>
              <span class="swatch state-{state}"></span>{t(
                TEST_STATE_WORDS[state],
              )}
            </li>
          {/each}
        </ul>
        <button
          type="button"
          class="action"
          aria-expanded={shown.tested ?? false}
          onclick={() => toggle("tested")}
          >{shown.tested
            ? t("chart-hide-numbers")
            : t("chart-show-numbers")}</button
        >
        {#if shown.tested}
          <table>
            <caption>{t("makeup-tested-title")}</caption>
            <thead>
              <tr>
                <th scope="col">{t("makeup-col-product")}</th>
                {#each TEST_STATES as state (state)}
                  <th scope="col" class="number"
                    >{t(TEST_STATE_WORDS[state])}</th
                  >
                {/each}
              </tr>
            </thead>
            <tbody>
              {#each testedProducts as name (name)}
                <tr>
                  <th scope="row">{name}</th>
                  {#each TEST_STATES as state (state)}
                    <td class="number">{tested.get(name)?.[state] ?? 0}</td>
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
        {/if}
      {/if}
    </section>

    <section class="panel" aria-labelledby="makeup-census-title">
      <h2 id="makeup-census-title">{t("makeup-census-title")}</h2>
      <p class="muted small">{t("makeup-census-how")}</p>
      {#if census.state === "reading"}
        <ProgressBar
          progress={started()}
          fallback={t("makeup-census-reading")}
        />
      {:else if census.state === "failed"}
        <FailurePanel
          failure={census.failure}
          onretry={() => repository && load(repository)}
        />
      {:else}
        {@const products = Object.entries(census.data.products)
          .map(([name, holding]) => [censusName(name), holding] as const)
          .sort(
            (a, b) =>
              Object.values(b[1].defs).reduce((n, v) => n + v, 0) -
              Object.values(a[1].defs).reduce((n, v) => n + v, 0),
          )}
        <!-- svelte-ignore a11y_no_noninteractive_tabindex (a table wider than the window scrolls sideways, so the keyboard must reach it) -->
        <div
          class="scroll"
          tabindex="0"
          role="region"
          aria-label={t("makeup-numbers-of", {
            title: t("makeup-census-title"),
          })}
        >
          <table>
            <caption>{t("makeup-census-title")}</caption>
            <thead>
              <tr>
                <th scope="col">{t("makeup-col-product")}</th>
                <th scope="col" class="number">{t("makeup-col-defs")}</th>
                <th scope="col">{t("makeup-col-most")}</th>
                <th scope="col" class="number">{t("makeup-kind-pictures")}</th>
                <th scope="col" class="number">{t("makeup-kind-sounds")}</th>
                <th scope="col" class="number">{t("makeup-col-keys")}</th>
              </tr>
            </thead>
            <tbody>
              {#each products as [name, holding] (name)}
                <tr>
                  <th scope="row">{name}</th>
                  <td class="number"
                    >{Object.values(holding.defs)
                      .reduce((n, v) => n + v, 0)
                      .toLocaleString(LOCALE)}</td
                  >
                  <td class="types"
                    >{Object.entries(holding.defs)
                      .slice(0, 5)
                      .map(
                        ([type, count]) => `${type.split(".").pop()} ${count}`,
                      )
                      .join(", ")}</td
                  >
                  <td class="number"
                    >{holding.pictures.toLocaleString(LOCALE)}</td
                  >
                  <td class="number">{holding.sounds.toLocaleString(LOCALE)}</td
                  >
                  <td class="number">{holding.keys.toLocaleString(LOCALE)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </section>
  {/if}
{/if}

{#snippet key(kinds: Kind[])}
  <ul class="key" aria-label={t("chart-key")}>
    {#each kinds as kind (kind)}
      <li>
        <span
          class="swatch"
          style:background={`var(--colour-${kindRole(kind)})`}
        ></span>{t(KIND_WORDS[kind])}
      </li>
    {/each}
  </ul>
{/snippet}

<style>
  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 16px;
    margin-block-end: 12px;
  }

  .summary {
    margin: 0 0 12px;
    overflow-wrap: anywhere;
  }

  .panel {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-block-end: 16px;
    padding: 16px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
    min-width: 0;
  }

  .panel h2 {
    margin: 0;
    font-size: 1.25rem;
  }

  .panel p {
    margin: 0;
  }

  .panel-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px 16px;
  }

  .panel > .action {
    align-self: flex-start;
  }

  .key {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 16px;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: var(--type-small);
  }

  .key li {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .swatch {
    display: inline-block;
    width: 14px;
    height: 14px;
    border-radius: 3px;
  }

  .state-passed {
    background: var(--colour-success);
  }

  .state-seen {
    background: var(--colour-observed);
  }

  .state-waiting {
    background: var(--colour-text-muted);
  }

  .state-failed {
    background: var(--colour-risk);
  }

  .heat-key {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    font-size: var(--type-small);
  }

  .heat {
    display: inline-block;
    width: 22px;
    height: 14px;
    border-radius: 2px;
  }

  .scroll {
    max-width: 100%;
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--type-small);
  }

  caption {
    text-align: start;
    font-weight: 600;
    padding-block-end: 6px;
  }

  th,
  td {
    padding: 6px 8px;
    border-top: 1px solid var(--colour-line);
    text-align: start;
    vertical-align: top;
  }

  .number {
    text-align: end;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .path,
  .types {
    overflow-wrap: anywhere;
  }
</style>
