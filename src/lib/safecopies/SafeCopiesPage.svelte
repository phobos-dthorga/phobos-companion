<script lang="ts">
  import { t } from "../i18n/runtime";
  import type { GameHome } from "../home/types";
  import SafeCopiesCard from "./SafeCopiesCard.svelte";

  /**
   * Safe copies, a page of its own (0.95.0; the owner's answer on the Decisions page, "A page of its own", and Shift+B by card,
   * 25 Nov 2026): what cannot be made again, whether each is copied, and the daily run, with room for a history of runs later.
   * Home keeps a one-line note while something waits (`SafeCopiesNote.svelte`).
   */
  let { game }: { game: GameHome } = $props();
</script>

<div class="eyebrow accent">{t("safe-copies-page-kicker")}</div>
<h1>{t("safe-copies-page-title", { game: game.name })}</h1>
<p class="lead">{t("safe-copies-page-lead")}</p>

{#key game.id}<SafeCopiesCard game={game.id} />{/key}
