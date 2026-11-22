<script lang="ts">
  import { tick } from "svelte";
  import { t } from "../i18n/runtime";
  import { whenWords } from "./presentation";
  import type { GameHome } from "./types";

  /**
   * The game looked at, as a button in the top bar that opens your games (0.66.0; the owner's choice of 23 Nov 2026, once the
   * pages moved to the left side, where the games had been). Each game says when you last worked on it, as Home's Your games does.
   * Escape or a press outside closes it; [ and ] still step through the games without opening it.
   */
  let {
    games,
    selected,
    now,
    reading,
    onselect,
  }: {
    games: GameHome[];
    selected: GameHome | null;
    now: Date;
    /** Whether the list of games is still being read. */
    reading: boolean;
    onselect: (id: string) => void;
  } = $props();

  let open = $state(false);
  let picker = $state<HTMLDivElement | null>(null);

  async function toggle() {
    open = !open;
    if (open) {
      await tick();
      picker
        ?.querySelector<HTMLButtonElement>("[aria-current='true'], .game")
        ?.focus();
    }
  }

  function choose(id: string) {
    open = false;
    onselect(id);
    picker?.querySelector<HTMLButtonElement>(".opener")?.focus();
  }

  function onkeydown(event: KeyboardEvent) {
    if (!open) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      open = false;
      picker?.querySelector<HTMLButtonElement>(".opener")?.focus();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const buttons = [
      ...(picker?.querySelectorAll<HTMLButtonElement>(".game") ?? []),
    ];
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next =
      (at + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) %
      buttons.length;
    event.preventDefault();
    buttons[next]?.focus();
  }

  function outside(event: MouseEvent) {
    if (open && picker && !picker.contains(event.target as Node)) open = false;
  }
</script>

<svelte:window onclick={outside} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="picker" bind:this={picker} {onkeydown}>
  <button
    type="button"
    class="opener"
    aria-expanded={open}
    aria-controls="game-picker-list"
    disabled={games.length === 0}
    onclick={() => void toggle()}
  >
    <span class="muted">{t("observation-looking-at")}</span>
    <strong
      >{selected
        ? selected.name
        : reading
          ? t("games-reading")
          : t("observation-nothing")}</strong
    >
    <span aria-hidden="true">▾</span>
  </button>
  {#if open}
    <ul id="game-picker-list" class="games" aria-label={t("games-label")}>
      {#each games as game (game.id)}
        {@const when = whenWords(game.last_worked, now)}
        <li>
          <button
            type="button"
            class="game"
            aria-current={game.id === selected?.id}
            onclick={() => choose(game.id)}
          >
            <span class="name">
              <span class="marker" aria-hidden="true">◆</span>
              {game.name}
            </span>
            <span class="when">{t(when.key, when.args)}</span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .picker {
    position: relative;
  }

  .opener {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: var(--control-min);
    padding-inline: 14px;
    font: inherit;
    color: var(--colour-text);
    background: transparent;
    border: 1px solid var(--colour-line);
    border-radius: 4px;
    cursor: pointer;
  }

  .opener:hover:not(:disabled) {
    background: var(--colour-surface-soft);
  }

  strong {
    font-weight: 600;
  }

  .games {
    position: absolute;
    z-index: 20;
    top: calc(100% + 6px);
    inset-inline-start: 0;
    width: min(360px, 86vw);
    margin: 0;
    padding: 6px;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 2px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 6px;
  }

  .game {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
    width: 100%;
    min-height: var(--control-min);
    padding: 4px 10px;
    font: inherit;
    text-align: start;
    color: var(--colour-text);
    background: transparent;
    border: 0;
    border-radius: 4px;
    cursor: pointer;
  }

  .game:hover,
  .game[aria-current="true"] {
    background: var(--colour-surface-soft);
  }

  .marker {
    color: var(--colour-accent);
    visibility: hidden;
  }

  .game[aria-current="true"] .marker {
    visibility: visible;
  }

  .when {
    flex: none;
    font-size: var(--type-small);
    color: var(--colour-text-muted);
  }
</style>
