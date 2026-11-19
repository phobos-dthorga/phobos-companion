<script lang="ts">
  import type { GameHome } from "./types";
  import { t } from "../i18n/runtime";

  /**
   * A page about a game being played, opened for a set of tools (0.24.0): it says in words why there is nothing here and where
   * the tools' own work is, never a blank or a failed reading.
   */
  let { game, page }: { game: GameHome; page: string } = $props();

  /** Why each game-only page has nothing for a set of tools, written out so the words test can see every key. */
  const WHY: Record<string, string> = {
    atlas: "tools-page-atlas",
    logs: "tools-page-logs",
    memory: "tools-page-memory",
    gamefiles: "tools-page-gamefiles",
  };
</script>

<div class="eyebrow accent">{t(`page-${page}`)}</div>
<h1>{t("tools-page-title", { name: game.name })}</h1>
{#if WHY[page]}
  <p class="lead">{t(WHY[page], { name: game.name })}</p>
{/if}
<p class="how">{t("tools-page-instead")}</p>
