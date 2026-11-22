<script lang="ts">
  import { t } from "../i18n/runtime";
  import { goGame } from "../navigation/navigation.svelte";
  import { whenWords } from "./presentation";
  import type { GameHome } from "./types";

  /**
   * Your games, on Home (0.66.0; the owner's choice of 23 Nov 2026): every game on the list with when you last worked on it, as
   * the games column on the left showed until the pages took that side. The game looked at is marked; any other is one press away.
   */
  let {
    games,
    selected,
    now,
  }: { games: GameHome[]; selected: string; now: Date } = $props();
</script>

{#if games.length > 1}
  <section class="panel" aria-labelledby="home-games-title">
    <h2 id="home-games-title">{t("home-games-title")}</h2>
    <ul>
      {#each games as game (game.id)}
        {@const when = whenWords(game.last_worked, now)}
        <li>
          <span class="name">
            {#if game.id === selected}<span class="marker" aria-hidden="true"
                >◆</span
              >{/if}
            {game.name}
            {#if game.id === selected}<span class="muted small"
                >· {t("home-games-looking")}</span
              >{/if}
          </span>
          <span class="when">{t(when.key, when.args)}</span>
          {#if game.id !== selected}
            <button
              type="button"
              class="action"
              aria-label={t("home-games-look-at-named", { game: game.name })}
              onclick={() => goGame(game.id)}>{t("home-games-look-at")}</button
            >
          {/if}
        </li>
      {/each}
    </ul>
  </section>
{/if}

<style>
  .panel {
    margin-bottom: 16px;
    padding: 20px 24px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  h2 {
    margin-bottom: 8px;
    font-family: var(--font-display);
    font-size: 1.375rem;
    font-weight: 600;
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 16px;
    min-height: var(--control-min);
    padding-block: 4px;
    border-top: 1px solid var(--colour-line);
  }

  .name {
    flex: 1 1 220px;
    min-width: 0;
    font-weight: 600;
  }

  .marker {
    color: var(--colour-accent);
  }

  .when {
    font-size: var(--type-small);
    color: var(--colour-comparison);
  }
</style>
