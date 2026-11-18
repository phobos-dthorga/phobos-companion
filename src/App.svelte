<script lang="ts">
  import { onMount } from "svelte";
  import CodeViewer from "./lib/code/CodeViewer.svelte";
  import AsItStood from "./lib/timeline/AsItStood.svelte";
  import { addressOf, type PageName } from "./lib/navigation/place";
  import {
    back,
    canGoBack,
    canGoForward,
    closeDialog,
    copyAddress,
    forward,
    go,
    goGame,
    goPage,
    here,
    settleGame,
  } from "./lib/navigation/navigation.svelte";
  import ShortcutsDialog from "./lib/shortcuts/ShortcutsDialog.svelte";
  import GoTo from "./lib/navigation/GoTo.svelte";
  import { register, dispatch } from "./lib/shortcuts/registry";
  import { loadShortcuts, shortcuts } from "./lib/shortcuts/state.svelte";
  import GamesNavigator from "./lib/home/GamesNavigator.svelte";
  import WherePage from "./lib/home/WherePage.svelte";
  import { readHome } from "./lib/home/desktopClient";
  import { formatTime, formatUnixDate } from "./lib/home/presentation";
  import type { HomeReading } from "./lib/home/types";
  import { t } from "./lib/i18n/runtime";
  import AtlasPage from "./lib/atlas/AtlasPage.svelte";
  import ReportsPage from "./lib/reports/ReportsPage.svelte";
  import TestsPage from "./lib/tests/TestsPage.svelte";
  import ModsPage from "./lib/mods/ModsPage.svelte";
  import ChangesPage from "./lib/code/ChangesPage.svelte";
  import TimelinePage from "./lib/timeline/TimelinePage.svelte";
  import SettingsPage from "./lib/settings/SettingsPage.svelte";
  import CodeMapPage from "./lib/connections/CodeMapPage.svelte";
  import Crest from "./lib/shell/Crest.svelte";
  import FailurePanel from "./lib/shell/FailurePanel.svelte";
  import ProgressBar from "./lib/shell/ProgressBar.svelte";
  import { started } from "./lib/shell/progress";
  import { readKit } from "./lib/shell/desktopClient";
  import type { KitReading } from "./lib/shell/types";

  let kit = $state<KitReading>({ state: "reading" });
  let home = $state<HomeReading>({ state: "reading" });
  let looking = $state(true);
  /** Where the owner is: the trail's place (docs/cross-links.md, N1). */
  const place = $derived(here());
  const page = $derived(place.page);

  // The first place names no game until the list of games is read; then it is the game shown.
  $effect(() => {
    if (place.game === null && selected) settleGame(selected.id);
  });
  let copied = $state<"yes" | "no" | null>(null);

  async function copyHere() {
    copied = (await copyAddress()) ? "yes" : "no";
  }
  let now = $state(new Date());

  const games = $derived(home.state === "ready" ? home.home.games : []);
  const selected = $derived(
    games.find((game) => game.id === place.game) ?? games[0] ?? null,
  );

  /** Keeps what is on screen until the new reading arrives, so looking again doesn't blank the page. */
  async function refresh() {
    looking = true;
    const [nextKit, nextHome] = await Promise.all([readKit(), readHome()]);
    kit = nextKit;
    home = nextHome;
    now = new Date();
    looking = false;
  }

  let helpOpen = $state(false);
  let goToOpen = $state(false);

  type Page = PageName;
  const PAGES: [string, Page][] = [
    ["page.home", "home"],
    ["page.reports", "reports"],
    ["page.atlas", "atlas"],
    ["page.tests", "tests"],
    ["page.mods", "mods"],
    ["page.changes", "changes"],
    ["page.timeline", "timeline"],
    ["page.codemap", "codemap"],
    ["page.settings", "settings"],
  ];

  /** Moves to the game before or after the one shown, in the list's order. */
  function stepGame(step: 1 | -1) {
    if (games.length === 0) return;
    const index = Math.max(
      0,
      games.findIndex((game) => game.id === selected?.id),
    );
    goGame(games[(index + step + games.length) % games.length].id);
  }

  onMount(() => {
    void refresh();
    void loadShortcuts();
    const unregister = register({
      scope: "everywhere",
      inDialog: false,
      run: {
        ...Object.fromEntries(
          PAGES.map(([id, next]) => [id, () => goPage(next)]),
        ),
        "game.previous": () => stepGame(-1),
        "game.next": () => stepGame(1),
        "look-again": () => void refresh(),
        search: () => (goToOpen = true),
        help: () => (helpOpen = true),
        "nav.back": back,
        "nav.forward": forward,
      },
    });
    // Back and Forward work over a dialog too: closing it is a step back.
    const unregisterInDialog = register({
      scope: "everywhere",
      inDialog: true,
      run: { "nav.back": back, "nav.forward": forward },
    });
    // The mouse's side buttons, as in a browser.
    const sideButtons = (event: MouseEvent) => {
      if (event.button === 3 || event.button === 4) {
        event.preventDefault();
        if (event.button === 3) back();
        else forward();
      }
    };
    window.addEventListener("mouseup", sideButtons);
    const listen = (event: KeyboardEvent) =>
      dispatch(
        event,
        shortcuts.saved,
        document.querySelector("dialog[open]") !== null,
      );
    window.addEventListener("keydown", listen);
    return () => {
      unregister();
      unregisterInDialog();
      window.removeEventListener("mouseup", sideButtons);
      window.removeEventListener("keydown", listen);
    };
  });
</script>

<div class="shell">
  <header class="command-bar">
    <div class="brand">
      <Crest />
      <div>
        <div class="house">{t("brand-house")}</div>
        <div class="name">{t("brand-name")}</div>
      </div>
    </div>
    <nav class="pages" aria-label={t("pages-label")}>
      <button
        type="button"
        class="page"
        class:current={page === "home"}
        aria-current={page === "home" ? "page" : undefined}
        onclick={() => goPage("home")}>{t("page-home")}</button
      >
      <button
        type="button"
        class="page"
        class:current={page === "reports"}
        aria-current={page === "reports" ? "page" : undefined}
        onclick={() => goPage("reports")}>{t("page-reports")}</button
      >
      <button
        type="button"
        class="page"
        class:current={page === "atlas"}
        aria-current={page === "atlas" ? "page" : undefined}
        onclick={() => goPage("atlas")}>{t("page-atlas")}</button
      >
      <button
        type="button"
        class="page"
        class:current={page === "tests"}
        aria-current={page === "tests" ? "page" : undefined}
        onclick={() => goPage("tests")}>{t("page-tests")}</button
      >
      <button
        type="button"
        class="page"
        class:current={page === "mods"}
        aria-current={page === "mods" ? "page" : undefined}
        onclick={() => goPage("mods")}>{t("page-mods")}</button
      >
      <button
        type="button"
        class="page"
        class:current={page === "changes"}
        aria-current={page === "changes" ? "page" : undefined}
        onclick={() => goPage("changes")}>{t("page-changes")}</button
      >
      <button
        type="button"
        class="page"
        class:current={page === "timeline"}
        aria-current={page === "timeline" ? "page" : undefined}
        onclick={() => goPage("timeline")}>{t("page-timeline")}</button
      >
      <button
        type="button"
        class="page"
        class:current={page === "codemap"}
        aria-current={page === "codemap" ? "page" : undefined}
        onclick={() => goPage("codemap")}>{t("page-codemap")}</button
      >
      <button
        type="button"
        class="page"
        class:current={page === "settings"}
        aria-current={page === "settings" ? "page" : undefined}
        onclick={() => goPage("settings")}>{t("page-settings")}</button
      >
    </nav>
  </header>

  <section class="observation-bar" aria-label={t("observation-label")}>
    <span>
      <span class="muted">{t("observation-looking-at")}</span>
      <strong>{selected ? selected.name : t("observation-nothing")}</strong>
    </span>
    {#if selected?.last_worked != null}
      <span>
        <span class="muted">{t("observation-last-worked")}</span>
        <strong class="read">{formatUnixDate(selected.last_worked)}</strong>
      </span>
    {/if}
    <span class="trail" role="group" aria-label={t("trail-label")}>
      <button
        type="button"
        class="action"
        disabled={!canGoBack()}
        onclick={back}>{t("trail-back")}</button
      >
      <button
        type="button"
        class="action"
        disabled={!canGoForward()}
        onclick={forward}>{t("trail-forward")}</button
      >
      <button type="button" class="action" onclick={() => (goToOpen = true)}
        >{t("goto-button")}</button
      >
      <button type="button" class="action" onclick={copyHere}
        >{t("trail-copy")}</button
      >
      {#if copied}
        <span class="muted small" role="status"
          >{copied === "yes" ? t("trail-copied") : t("trail-copy-failed")}</span
        >
      {/if}
    </span>
    <span class="look-again">
      {#if !looking && home.state === "ready"}
        <span class="muted" role="status"
          >{t("observation-read-at", { time: formatTime(now) })}</span
        >
      {/if}
      <button type="button" class="action" disabled={looking} onclick={refresh}>
        {looking ? t("action-looking") : t("action-look-again")}
      </button>
    </span>
    {#if looking && home.state === "ready"}
      <div class="looking-bar">
        <ProgressBar progress={started()} fallback={t("action-looking-bar")} />
      </div>
    {/if}
  </section>

  <div class="workspace">
    <nav class="navigator" aria-label={t("games-label")}>
      <h2 class="eyebrow muted">{t("games-label")}</h2>
      {#if games.length > 0}
        <GamesNavigator
          {games}
          selectedId={selected?.id ?? null}
          {now}
          onselect={(id) => goGame(id)}
        />
      {:else if home.state === "reading"}
        <p class="muted">{t("games-reading")}</p>
      {:else}
        <p class="muted">{t("games-empty")}</p>
      {/if}
    </nav>

    <main class="canvas">
      {#if page === "settings" && home.state !== "reading"}
        <SettingsPage {games} />
      {:else if selected && page === "reports"}
        {#key selected.id}
          <ReportsPage game={selected} />
        {/key}
      {:else if selected && page === "tests"}
        {#key selected.id}
          <TestsPage game={selected} />
        {/key}
      {:else if selected && page === "changes"}
        {#key selected.id}
          <ChangesPage game={selected} />
        {/key}
      {:else if selected && page === "timeline"}
        {#key selected.id}
          <TimelinePage game={selected} />
        {/key}
      {:else if selected && page === "codemap"}
        {#key selected.id}
          <CodeMapPage game={selected} />
        {/key}
      {:else if selected && page === "mods"}
        {#key selected.id}
          <ModsPage game={selected} />
        {/key}
      {:else if selected && page === "atlas"}
        {#key selected.id}
          <AtlasPage game={selected} />
        {/key}
      {:else if selected}
        <WherePage game={selected} {now} />
      {:else if home.state === "reading"}
        <div class="eyebrow accent">{t("home-kicker")}</div>
        <h1>{t("home-reading")}</h1>
      {:else if home.state === "browser"}
        <div class="eyebrow accent">{t("home-kicker")}</div>
        <h1>{t("home-browser-title")}</h1>
        <p class="lead">{t("home-browser-body")}</p>
      {:else if home.state === "failed"}
        <div class="eyebrow accent">{t("home-kicker")}</div>
        <h1>{t("home-failed-title")}</h1>
        <FailurePanel failure={home.failure} onretry={refresh} />
      {:else}
        <div class="eyebrow accent">{t("home-kicker")}</div>
        <h1>{t("home-no-list-title")}</h1>
        <p class="lead">{t("home-no-list-body")}</p>
      {/if}
    </main>

    <aside class="inspector" aria-label={t("details-label")}>
      <h2>{t("source-title")}</h2>
      <p>
        {page === "mods"
          ? t("source-body-mods")
          : page === "changes"
            ? t("source-body-changes")
            : page === "timeline"
              ? t("source-body-timeline")
              : page === "settings"
                ? t("source-body-settings")
                : page === "codemap"
                  ? t("source-body-codemap")
                  : t("source-body")}
      </p>

      <h2>{t("legend-title")}</h2>
      <ul class="legend">
        <li><span class="swatch observed"></span>{t("legend-observed")}</li>
        <li><span class="swatch worked"></span>{t("legend-worked")}</li>
        <li><span class="swatch attention"></span>{t("legend-attention")}</li>
        <li><span class="swatch wrong"></span>{t("legend-wrong")}</li>
      </ul>

      <h2>{t("tools-title")}</h2>
      <div aria-live="polite">
        {#if kit.state === "reading"}
          <p class="muted">{t("tools-reading")}</p>
        {:else if kit.state === "browser"}
          <p class="muted">{t("tools-browser")}</p>
        {:else if kit.state === "ready"}
          <p class="found">{t("tools-found", { count: kit.status.tools })}</p>
          <p class="muted">
            {t("tools-kit", { version: kit.status.kit_version })}
          </p>
          <p class="muted">{t("tools-source")}</p>
        {:else}
          <FailurePanel failure={kit.failure} onretry={refresh} />
        {/if}
      </div>
    </aside>
  </div>

  {#if place.dialog?.kind === "code" && selected}
    {#key addressOf(place)}
      <CodeViewer
        game={selected.id}
        request={place.dialog.request}
        onclose={closeDialog}
      />
    {/key}
  {:else if place.dialog?.kind === "stood" && selected}
    {#key addressOf(place)}
      <AsItStood
        game={selected.id}
        request={place.dialog.request}
        onclose={closeDialog}
      />
    {/key}
  {/if}

  {#if goToOpen}
    <GoTo
      game={selected}
      onclose={() => (goToOpen = false)}
      onchoose={(where) => {
        goToOpen = false;
        go({ ...where, game: where.game ?? selected?.id ?? null });
      }}
    />
  {/if}

  {#if helpOpen}
    <ShortcutsDialog editable={false} onclose={() => (helpOpen = false)} />
  {/if}

  <footer class="status-bar">
    <span>{t("status-reading-only")}</span>
    <span>{t("status-independent")}</span>
  </footer>
</div>

<style>
  .shell {
    min-height: 100vh;
    display: grid;
    grid-template-rows: auto auto 1fr auto;
  }

  .command-bar,
  .observation-bar,
  .status-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 24px;
    padding-inline: 24px;
  }

  .command-bar {
    padding-block: 12px;
    background: var(--colour-surface);
    border-bottom: 1px solid var(--colour-line);
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .house {
    font-size: var(--type-caption);
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--colour-accent);
  }

  .name {
    font-family: var(--font-display);
    font-size: 1.5rem;
    font-weight: 600;
    line-height: 1.15;
  }

  .pages {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .page {
    min-height: var(--control-min);
    padding-inline: 18px;
    font: inherit;
    color: var(--colour-text-muted);
    background: transparent;
    border: 1px solid var(--colour-line);
    border-radius: 4px;
    cursor: pointer;
  }

  .page.current {
    font-weight: 600;
    color: var(--colour-text);
    background: var(--colour-surface-soft);
    border: 2px solid var(--colour-accent);
  }

  .observation-bar {
    padding-block: 10px;
    font-size: var(--type-small);
    background: var(--colour-canvas);
    border-bottom: 1px solid var(--colour-line);
  }

  .looking-bar {
    flex-basis: 100%;
    padding-bottom: 8px;
  }

  .trail {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 8px;
  }

  .look-again {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 16px;
    margin-inline-start: auto;
  }

  strong {
    font-weight: 600;
  }

  .read {
    color: var(--colour-observed);
  }

  .workspace {
    display: grid;
    grid-template-columns: minmax(240px, 300px) minmax(0, 1fr) minmax(
        240px,
        320px
      );
  }

  .navigator,
  .inspector {
    padding: 24px 20px;
    background: var(--colour-canvas);
  }

  .navigator {
    border-right: 1px solid var(--colour-line);
  }

  .inspector {
    border-left: 1px solid var(--colour-line);
  }

  .navigator .eyebrow {
    margin-bottom: 10px;
  }

  .canvas {
    padding: 32px;
    background: var(--colour-surface);
    min-width: 0;
  }

  .inspector h2 {
    margin-block: 20px 8px;
    font-family: var(--font-display);
    font-size: 1.25rem;
    font-weight: 600;
  }

  .inspector h2:first-child {
    margin-top: 0;
  }

  .inspector p,
  .legend {
    font-size: var(--type-small);
  }

  .inspector p + p {
    margin-top: 6px;
  }

  .legend {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .legend li {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .swatch {
    flex: none;
    width: 14px;
    height: 14px;
  }

  .observed {
    background: var(--colour-observed);
  }

  .worked {
    border: 2px solid var(--colour-comparison);
  }

  .attention {
    background: var(--colour-accent);
    transform: rotate(45deg) scale(0.8);
  }

  .wrong {
    height: 4px;
    background: var(--colour-risk);
  }

  .found {
    color: var(--colour-observed);
    font-weight: 600;
  }

  .status-bar {
    justify-content: space-between;
    padding-block: 8px;
    font-size: var(--type-caption);
    color: var(--colour-text-muted);
    background: var(--colour-surface);
    border-top: 1px solid var(--colour-line);
  }

  @media (max-width: 900px) {
    .workspace {
      grid-template-columns: minmax(0, 1fr);
    }

    .navigator,
    .inspector {
      border-inline: none;
      border-bottom: 1px solid var(--colour-line);
    }
  }
</style>
