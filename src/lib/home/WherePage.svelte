<script lang="ts">
  import { t } from "../i18n/runtime";
  import {
    formatUnixDate,
    headlineWords,
    pendingWords,
    problemKey,
  } from "./presentation";
  import type { GameHome } from "./types";

  const PENDING_SHOWN = 6;
  const OPEN_SHOWN = 6;

  let { game, now }: { game: GameHome; now: Date } = $props();

  const headline = $derived(headlineWords(game, now));
  const last = $derived(game.latest[0]);
</script>

<div class="eyebrow accent">{t("home-kicker")}</div>
<h1>{t(headline.key, headline.args)}</h1>
<p class="lead">
  {#if last}
    {t("home-last-thing", { subject: last.subject })}
  {:else}
    {t("home-never-body")}
  {/if}
</p>

{#if game.unfinished.length > 0}
  <section class="panel attention">
    <h2><span aria-hidden="true">◆</span> {t("unfinished-title")}</h2>
    <ul>
      {#each game.unfinished as item (item.repository)}
        <li>
          <div>{t("unfinished-files", { count: item.files })}</div>
          <div class="muted small">{item.repository}</div>
        </li>
      {/each}
    </ul>
  </section>
{/if}

{#if game.latest.length > 0}
  <section class="panel">
    <h2>{t("latest-title")}</h2>
    <ul>
      {#each game.latest as item, index (`${item.repository}-${index}`)}
        <li class="dated">
          <div class="read">{formatUnixDate(item.unix)}</div>
          <div class="body">
            <div>{item.subject}</div>
            <div class="muted small">{item.repository}</div>
          </div>
        </li>
      {/each}
    </ul>
  </section>
{/if}

{#if game.pending.length > 0}
  {@const shown = game.pending.slice(0, PENDING_SHOWN)}
  <section class="panel">
    <h2>{t("pending-title")}</h2>
    <ul>
      {#each shown as item (`${item.repository}-${item.product}`)}
        {@const words = pendingWords(item)}
        <li>
          <div>{item.product}</div>
          <div class="muted small">
            {t(words.key, words.args)}{#if item.earlier_drafts > 0}{" "}{t(
                "pending-earlier",
                { count: item.earlier_drafts },
              )}{/if}
          </div>
        </li>
      {/each}
    </ul>
    {#if game.pending.length > shown.length}
      <p class="muted small more">
        {t("list-more", { count: game.pending.length - shown.length })}
      </p>
    {/if}
  </section>
{/if}

{#if game.open_work.length > 0}
  {@const shown = game.open_work.slice(0, OPEN_SHOWN)}
  <section class="panel">
    <h2>{t("open-title")}</h2>
    <p class="count">{t("open-count", { count: game.open_work.length })}</p>
    <ul>
      {#each shown as item, index (index)}
        <li>{item}</li>
      {/each}
    </ul>
    {#if game.open_work.length > shown.length}
      <p class="muted small more">
        {t("list-more", { count: game.open_work.length - shown.length })}
      </p>
    {/if}
  </section>
{/if}

{#if game.problems.length > 0}
  <section class="panel">
    <h2 class="problem">{t("problems-title")}</h2>
    <ul>
      {#each game.problems as item (item.repository)}
        <li>
          <div>{item.repository}</div>
          <div class="muted small">{t(problemKey(item.problem))}</div>
        </li>
      {/each}
    </ul>
  </section>
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
    max-width: 64ch;
    margin-bottom: 24px;
    font-size: var(--type-lead);
  }

  .panel {
    margin-bottom: 16px;
    padding: 20px 24px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .attention {
    border: 2px solid var(--colour-accent);
    padding: 19px 23px;
  }

  h2 {
    margin-bottom: 8px;
    font-family: var(--font-display);
    font-size: 1.375rem;
    font-weight: 600;
  }

  .attention h2 span {
    color: var(--colour-accent);
  }

  .problem {
    color: var(--colour-risk);
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    padding-block: 10px;
    border-top: 1px solid var(--colour-line);
    overflow-wrap: anywhere;
  }

  .dated {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 20px;
  }

  .read {
    flex: 0 0 110px;
    color: var(--colour-observed);
    font-size: var(--type-small);
    font-weight: 500;
  }

  .body {
    flex: 1 1 320px;
    min-width: 0;
  }

  .small {
    font-size: var(--type-small);
  }

  .count {
    margin-bottom: 8px;
    color: var(--colour-comparison);
  }

  .more {
    padding-top: 10px;
    border-top: 1px solid var(--colour-line);
  }
</style>
