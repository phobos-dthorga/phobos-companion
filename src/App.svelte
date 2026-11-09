<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "./lib/i18n/runtime";
  import Crest from "./lib/shell/Crest.svelte";
  import { readKit } from "./lib/shell/desktopClient";
  import { failureWords } from "./lib/shell/presentation";
  import type { KitReading } from "./lib/shell/types";

  let kit = $state<KitReading>({ state: "reading" });

  async function refresh() {
    kit = { state: "reading" };
    kit = await readKit();
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
      <strong>{t("observation-nothing")}</strong>
    </span>
    <span class="muted">{t("observation-reading-only")}</span>
  </section>

  <div class="workspace">
    <nav class="navigator" aria-label={t("games-label")}>
      <h2 class="eyebrow">{t("games-label")}</h2>
      <p class="muted">{t("games-empty")}</p>
    </nav>

    <main class="canvas">
      <div class="eyebrow accent">{t("home-kicker")}</div>
      <h1>{t("home-title")}</h1>
      <p class="lead">{t("home-body")}</p>
    </main>

    <aside class="inspector" aria-label={t("details-label")}>
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
          {@const words = failureWords(kit.failure.code)}
          <p class="problem">{t(words.happened)}</p>
          <p>{t("failure-safe")}</p>
          <p>{t(words.next)}</p>
          <button type="button" onclick={refresh}
            >{t("action-try-again")}</button
          >
          <details>
            <summary>{t("failure-details")}</summary>
            <pre>{kit.failure.code}: {kit.failure.detail}</pre>
          </details>
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

  .house,
  .eyebrow {
    font-size: var(--type-caption);
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .house,
  .accent {
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
    justify-content: space-between;
    padding-block: 10px;
    font-size: var(--type-small);
    background: var(--colour-canvas);
    border-bottom: 1px solid var(--colour-line);
  }

  strong {
    font-weight: 600;
  }

  .muted {
    color: var(--colour-text-muted);
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
    margin-bottom: 8px;
    color: var(--colour-text-muted);
  }

  .canvas {
    padding: 32px;
    background: var(--colour-surface);
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
    font-size: var(--type-lead);
  }

  .inspector h2 {
    margin-bottom: 8px;
    font-family: var(--font-display);
    font-size: 1.25rem;
    font-weight: 600;
  }

  .inspector p {
    font-size: var(--type-small);
  }

  .inspector p + p {
    margin-top: 6px;
  }

  .found {
    color: var(--colour-observed);
    font-weight: 600;
  }

  .problem {
    color: var(--colour-risk);
    font-weight: 600;
  }

  button {
    min-height: var(--control-min);
    margin-top: 12px;
    padding-inline: 18px;
    font: inherit;
    color: var(--colour-text);
    background: var(--colour-surface-soft);
    border: 1px solid var(--colour-accent);
    border-radius: 4px;
    cursor: pointer;
  }

  details {
    margin-top: 12px;
    font-size: var(--type-small);
  }

  summary {
    min-height: var(--control-min);
    display: flex;
    align-items: center;
    cursor: pointer;
  }

  pre {
    margin: 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font-size: var(--type-caption);
    color: var(--colour-text-muted);
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
