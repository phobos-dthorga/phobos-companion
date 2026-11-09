<script lang="ts">
  import { onMount } from "svelte";
  import GamesNavigator from "./lib/home/GamesNavigator.svelte";
  import WherePage from "./lib/home/WherePage.svelte";
  import { readHome } from "./lib/home/desktopClient";
  import { formatTime, formatUnixDate } from "./lib/home/presentation";
  import type { HomeReading } from "./lib/home/types";
  import { t } from "./lib/i18n/runtime";
  import Crest from "./lib/shell/Crest.svelte";
  import FailurePanel from "./lib/shell/FailurePanel.svelte";
  import { readKit } from "./lib/shell/desktopClient";
  import type { KitReading } from "./lib/shell/types";

  let kit = $state<KitReading>({ state: "reading" });
  let home = $state<HomeReading>({ state: "reading" });
  let looking = $state(true);
  let chosenId = $state<string | null>(null);
  let now = $state(new Date());

  const games = $derived(home.state === "ready" ? home.home.games : []);
  const selected = $derived(
    games.find((game) => game.id === chosenId) ?? games[0] ?? null,
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

  onMount(refresh);
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
    <nav aria-label={t("pages-label")}>
      <span class="page" aria-current="page">{t("page-home")}</span>
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
  </section>

  <div class="workspace">
    <nav class="navigator" aria-label={t("games-label")}>
      <h2 class="eyebrow muted">{t("games-label")}</h2>
      {#if games.length > 0}
        <GamesNavigator
          {games}
          selectedId={selected?.id ?? null}
          {now}
          onselect={(id) => (chosenId = id)}
        />
      {:else if home.state === "reading"}
        <p class="muted">{t("games-reading")}</p>
      {:else}
        <p class="muted">{t("games-empty")}</p>
      {/if}
    </nav>

    <main class="canvas">
      {#if selected}
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
      <p>{t("source-body")}</p>

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

  .page {
    display: inline-flex;
    align-items: center;
    min-height: var(--control-min);
    padding-inline: 18px;
    font-weight: 600;
    background: var(--colour-surface-soft);
    border: 1px solid var(--colour-accent);
    border-radius: 4px;
  }

  .observation-bar {
    padding-block: 10px;
    font-size: var(--type-small);
    background: var(--colour-canvas);
    border-bottom: 1px solid var(--colour-line);
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

  h1 {
    margin-block: 4px 8px;
    font-family: var(--font-display);
    font-size: 2.25rem;
    font-weight: 600;
    line-height: 1.2;
  }

  .lead {
    max-width: 64ch;
    margin-bottom: 16px;
    font-size: var(--type-lead);
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
