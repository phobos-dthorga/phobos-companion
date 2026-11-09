<script lang="ts">
  import { t } from "../i18n/runtime";
  import { whenWords } from "./presentation";
  import type { GameHome } from "./types";

  let {
    games,
    selectedId,
    now,
    onselect,
  }: {
    games: GameHome[];
    selectedId: string | null;
    now: Date;
    onselect: (id: string) => void;
  } = $props();
</script>

<ul>
  {#each games as game (game.id)}
    {@const when = whenWords(game.last_worked, now)}
    {@const selected = game.id === selectedId}
    <li>
      <button
        type="button"
        class:selected
        aria-pressed={selected}
        onclick={() => onselect(game.id)}
      >
        <span class="name">
          {#if selected}<span class="marker" aria-hidden="true">◆</span>{/if}
          {game.name}
        </span>
        <span class="when">{t(when.key, when.args)}</span>
      </button>
    </li>
  {/each}
</ul>

<style>
  ul {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  button {
    display: block;
    width: 100%;
    min-height: 64px;
    padding: 10px 14px;
    text-align: start;
    font: inherit;
    color: var(--colour-text);
    background: transparent;
    border: 1px solid var(--colour-line);
    border-radius: 4px;
    cursor: pointer;
  }

  button.selected {
    background: var(--colour-surface-soft);
    border: 2px solid var(--colour-accent);
    padding: 9px 13px;
  }

  .name {
    display: block;
    font-weight: 600;
  }

  .marker {
    color: var(--colour-accent);
  }

  .when {
    display: block;
    font-size: var(--type-small);
    color: var(--colour-comparison);
  }
</style>
