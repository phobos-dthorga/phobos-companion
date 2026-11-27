<script lang="ts">
  import { t } from "../i18n/runtime";
  import type { GameHome } from "../home/types";
  import { pageServes } from "../home/kinds";
  import LaunchLine from "../modlist/LaunchLine.svelte";
  import { launches } from "../modlist/launch.svelte";

  /**
   * Starting each game, on Settings → Games (0.117.0; the owner's card of 28 Nov 2026: one line per game, here and on the Mod list's
   * bar): the arguments each game's own program is started with. Only games the tools can start show a line.
   */
  let { games }: { games: GameHome[] } = $props();

  const playable = $derived(
    games.filter((game) => pageServes(game.kind, "modlist")),
  );
  const none = $derived(
    playable.every((game) => launches[game.id]?.state === "none"),
  );
</script>

<section id="settings-launch" class="panel" aria-labelledby="launch-title">
  <h2 id="launch-title">{t("launch-panel-title")}</h2>
  <p class="small">{t("launch-panel-body")}</p>
  {#each playable as game (game.id)}
    <LaunchLine game={game.id} label={game.name} />
  {/each}
  {#if none}
    <p class="small muted">{t("launch-panel-none")}</p>
  {/if}
</section>

<style>
  .panel {
    margin-block: 12px;
    display: grid;
    gap: 8px;
  }

  h2 {
    margin-bottom: 0;
    font-family: var(--font-display);
  }
</style>
