<script lang="ts">
  import ActivityMeters from "./lib/activity/ActivityMeters.svelte";
  import { onMount, untrack } from "svelte";
  import CodeViewer from "./lib/code/CodeViewer.svelte";
  import AsItStood from "./lib/timeline/AsItStood.svelte";
  import PictureViewer from "./lib/gamefiles/PictureViewer.svelte";
  import {
    addressOf,
    place as placeAt,
    type PageName,
  } from "./lib/navigation/place";
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
  import GamePicker from "./lib/home/GamePicker.svelte";
  import PageRail from "./lib/shell/PageRail.svelte";
  import { readWaiting, waiting } from "./lib/shell/waiting.svelte";
  import { scanIsStale } from "./lib/shell/waiting";
  import WherePage from "./lib/home/WherePage.svelte";
  import NotForTools from "./lib/home/NotForTools.svelte";
  import { pageServes } from "./lib/home/kinds";
  import { VERSION } from "./lib/about/version";
  import { readHome } from "./lib/home/desktopClient";
  import { formatTime } from "./lib/home/presentation";
  import type { HomeReading } from "./lib/home/types";
  import { t } from "./lib/i18n/runtime";
  import PageNeeds from "./lib/setup/PageNeeds.svelte";
  import AtlasPage from "./lib/atlas/AtlasPage.svelte";
  import ReportsPage from "./lib/reports/ReportsPage.svelte";
  import TestsPage from "./lib/tests/TestsPage.svelte";
  import ModsPage from "./lib/mods/ModsPage.svelte";
  import ChangesPage from "./lib/code/ChangesPage.svelte";
  import TimelinePage from "./lib/timeline/TimelinePage.svelte";
  import SettingsPage from "./lib/settings/SettingsPage.svelte";
  import CodeMapPage from "./lib/connections/CodeMapPage.svelte";
  import LogsPage from "./lib/logs/LogsPage.svelte";
  import ActivityStrip from "./lib/shell/ActivityStrip.svelte";
  import PictureButton from "./lib/pictures/PictureButton.svelte";
  import ScreenNoteButton from "./lib/notes/ScreenNoteButton.svelte";
  import MakeupPage from "./lib/makeup/MakeupPage.svelte";
  import DecisionsPage from "./lib/decisions/DecisionsPage.svelte";
  import PicksPage from "./lib/picks/PicksPage.svelte";
  import PublishPage from "./lib/publish/PublishPage.svelte";
  import { agents } from "./lib/agents/state.svelte";
  import { hiddenPages } from "./lib/navigation/hidden.svelte";
  import ChatPage from "./lib/chat/ChatPage.svelte";
  import AboutPage from "./lib/about/AboutPage.svelte";
  import GameFilesPage from "./lib/gamefiles/GameFilesPage.svelte";
  import ModListPage from "./lib/modlist/ModListPage.svelte";
  import MemoryPage from "./lib/memory/MemoryPage.svelte";
  import ExplorerPage from "./lib/explorer/ExplorerPage.svelte";
  import GuidePage from "./lib/guide/GuidePage.svelte";
  import FirstSteps from "./lib/home/FirstSteps.svelte";
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
    lookedAgain += 1;
  }

  /**
   * What waits on you, beside each page (0.66.0): scanned for each game, on each Look again, when agent features change, and
   * (0.67.0) on coming back to the window once the last scan is five minutes old, which is when an update may have arrived.
   */
  let lookedAgain = $state(0);
  $effect(() => {
    void lookedAgain;
    void agents.shown;
    const game = selected;
    // The scan writes what it finds as it goes: untracked, so its own writes never start it again.
    if (game) untrack(() => readWaiting(game));
  });
  const counts = $derived(
    selected && waiting.game === selected.id ? waiting.counts : {},
  );
  const marks = $derived(
    selected && waiting.game === selected.id ? waiting.marks : {},
  );
  function scanIfStale() {
    if (selected && scanIsStale(waiting.at, Date.now())) readWaiting(selected);
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
    ["page.modlist", "modlist"],
    ["page.changes", "changes"],
    ["page.timeline", "timeline"],
    ["page.codemap", "codemap"],
    ["page.settings", "settings"],
    ["page.logs", "logs"],
    ["page.makeup", "makeup"],
    ["page.decisions", "decisions"],
    ["page.picks", "picks"],
    ["page.chat", "chat"],
    ["page.publish", "publish"],
    ["page.about", "about"],
    ["page.gamefiles", "gamefiles"],
    ["page.memory", "memory"],
    ["page.explorer", "explorer"],
    ["page.guide", "guide"],
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
          PAGES.map(([id, next]) => [
            id,
            // A page for agent sessions, or the Chat page, has no key while it is hidden (0.37.0, 0.74.0).
            () => {
              if (!hiddenPages().includes(next)) goPage(next);
            },
          ]),
        ),
        "game.previous": () => stepGame(-1),
        "game.next": () => stepGame(1),
        "look-again": () => void refresh(),
        search: () => (goToOpen = true),
        help: () => (helpOpen = true),
        // F1 (0.34.0): the Guide, at the entry for the page shown; on the Guide itself it stays where it is.
        "guide.here": () => {
          const shown = here();
          if (shown.page !== "guide")
            go(placeAt("guide", shown.game, { entry: `page-${shown.page}` }));
        },
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
    window.addEventListener("focus", scanIfStale);
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
      window.removeEventListener("focus", scanIfStale);
      window.removeEventListener("keydown", listen);
    };
  });
</script>

<div class="shell">
  <!-- One bar on top (0.66.0; the owner's choice of 23 Nov 2026): the brand, the game looked at, and the trail. The pages moved
       to the left side; the games into the picker. -->
  <header class="command-bar" aria-label={t("observation-label")}>
    <div class="brand">
      <Crest />
      <div>
        <div class="house">{t("brand-house")}</div>
        <div class="name">{t("brand-name")}</div>
      </div>
    </div>
    <GamePicker
      {games}
      {selected}
      {now}
      reading={home.state === "reading"}
      onselect={(id) => goGame(id)}
    />
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
    {#if selected}
      <PictureButton game={selected.name} page={t(`page-${page}`)} />
      {#if agents.shown}
        <ScreenNoteButton game={selected.name} page={t(`page-${page}`)} />
      {/if}
    {/if}
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
  </header>

  <ActivityStrip />

  <div class="workspace">
    <div class="navigator">
      <PageRail
        {page}
        kind={selected?.kind}
        {counts}
        {marks}
        onchoose={(next) => goPage(next)}
      />
      {#if games.length === 0 && home.state !== "reading"}
        <p class="muted small">{t("games-empty")}</p>
      {/if}
    </div>

    <main class="canvas">
      {#if home.state === "ready" && home.home.git_found === false}
        <p class="no-git" role="status">
          {t("home-no-git")}
          <button
            type="button"
            class="action"
            onclick={() => goPage("settings", { panel: "setup" })}
            >{t("home-no-git-setup")}</button
          >
        </p>
      {/if}
      <PageNeeds {page} game={selected?.id ?? null} />
      {#if selected && !pageServes(selected.kind, page)}
        <NotForTools game={selected} {page} />
      {:else if page === "settings" && home.state !== "reading"}
        <SettingsPage {games} ongameadded={() => void refresh()} />
      {:else if page === "about"}
        <AboutPage {games} {kit} />
      {:else if page === "guide"}
        <GuidePage game={selected} />
      {:else if page === "decisions" && home.state !== "reading"}
        <DecisionsPage />
      {:else if page === "picks" && home.state !== "reading"}
        <PicksPage />
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
      {:else if selected && page === "makeup"}
        {#key selected.id}
          <MakeupPage game={selected} />
        {/key}
      {:else if selected && page === "publish"}
        {#key selected.id}
          <PublishPage game={selected} />
        {/key}
      {:else if selected && page === "modlist"}
        {#key selected.id}
          <ModListPage game={selected} />
        {/key}
      {:else if selected && page === "gamefiles"}
        {#key selected.id}
          <GameFilesPage game={selected} />
        {/key}
      {:else if selected && page === "memory"}
        {#key selected.id}
          <MemoryPage game={selected} />
        {/key}
      {:else if selected && page === "explorer"}
        {#key selected.id}
          <ExplorerPage game={selected} />
        {/key}
      {:else if selected && page === "chat"}
        {#key selected.id}
          <ChatPage game={selected} />
        {/key}
      {:else if selected && page === "logs"}
        {#key selected.id}
          <LogsPage game={selected} />
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
        <WherePage game={selected} {games} {now} />
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
        <FirstSteps
          listFound={home.home.list_found}
          listFile={home.home.list_file ?? ""}
          onchanged={() => void refresh()}
        />
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
                  : page === "chat"
                    ? t("source-body-chat")
                    : page === "logs"
                      ? t("source-body-logs")
                      : page === "makeup"
                        ? t("source-body-makeup")
                        : page === "decisions"
                          ? t("source-body-decisions")
                          : page === "picks"
                            ? t("source-body-picks")
                            : page === "about"
                              ? t("source-body-about")
                              : page === "gamefiles"
                                ? t("source-body-gamefiles")
                                : page === "modlist"
                                  ? t("source-body-modlist")
                                  : page === "publish"
                                    ? t("source-body-publish")
                                    : page === "memory"
                                      ? t("source-body-memory")
                                      : page === "explorer"
                                        ? t("source-body-explorer")
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
  {:else if place.dialog?.kind === "picture" && selected}
    {#key addressOf(place)}
      <PictureViewer
        game={selected.id}
        path={place.dialog.path}
        name={place.dialog.name}
        taken={place.dialog.taken}
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
    <!-- The computer's activity, with the Companion's share (0.86.0). -->
    <ActivityMeters />
    <span class="footer-end">
      <button
        type="button"
        class="version"
        aria-label={t("status-version-label", { version: VERSION })}
        onclick={() => goPage("about")}
        >{t("status-version", { version: VERSION })}</button
      >
      <span>{t("status-independent")}</span>
    </span>
  </footer>
</div>

<style>
  /* The bar on top, the activity strip, the workspace (the one row that stretches) and the status bar. The strip had no row of its
     own from 0.21.0 to 0.23.0, so it took the stretching row: a short page, such as one still loading, had an empty band above it
     as tall as the space left over. The bar was two bands until 0.66.0. */
  .shell {
    min-height: 100vh;
    display: grid;
    grid-template-rows: auto auto 1fr auto;
  }

  .command-bar,
  /* The version, always in sight (0.25.0: the owner could not find one anywhere); it opens About. */
  .footer-end {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 12px;
  }

  .version {
    min-height: var(--control-min);
    padding-inline: 10px;
    font: inherit;
    color: var(--colour-text);
    background: transparent;
    border: 1px solid var(--colour-line);
    border-radius: 4px;
    cursor: pointer;
  }

  .version:hover {
    border-color: var(--colour-accent);
  }

  .status-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 24px;
    padding-inline: 24px;
  }

  .command-bar {
    gap: 8px 16px;
    padding: 10px 24px;
    font-size: var(--type-small);
    background: var(--colour-surface);
    border-bottom: 1px solid var(--colour-line);
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-inline-end: 8px;
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
    font-size: 1.25rem;
    font-weight: 600;
    line-height: 1.15;
  }

  .no-git {
    margin-bottom: 14px;
    padding: 8px 12px;
    border-inline-start: 3px solid var(--colour-risk);
    background: var(--colour-surface-raised);
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

  /* The pages' list, the page, and the details beside it. The list's column is narrower than the games column it replaced
     (0.66.0), so no page lost width. */
  .workspace {
    display: grid;
    grid-template-columns: 224px minmax(0, 1fr) minmax(240px, 320px);
  }

  .navigator,
  .inspector {
    padding: 24px 20px;
    background: var(--colour-canvas);
  }

  .navigator {
    padding: 16px 10px;
    border-right: 1px solid var(--colour-line);
  }

  .inspector {
    border-left: 1px solid var(--colour-line);
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
