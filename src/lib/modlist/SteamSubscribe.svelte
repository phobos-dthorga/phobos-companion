<script lang="ts">
  import { t } from "../i18n/runtime";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import { heard, started } from "../shell/progress";
  import { subscribeTo } from "./desktopClient";
  import type { Subscribed } from "./types";

  /**
   * Subscribe (0.49.0; the owner's choices of 22 Nov 2026: through the running Steam client, at once; a bar while Steam downloads,
   * then an offer). One press asks Steam to subscribe to the items and waits while it downloads them, the bar saying how far it is;
   * then it says what Steam did and hands the results to the page, which offers what comes next.
   */
  let {
    game,
    numbers,
    label,
    disabled = false,
    ondone,
  }: {
    game: string;
    numbers: string[];
    label: string;
    disabled?: boolean;
    ondone?: (results: Subscribed[]) => void;
  } = $props();

  let busy = $state(false);
  let progress = $state(started());
  let said = $state<{ text: string; refused: boolean } | null>(null);

  async function press() {
    said = null;
    busy = true;
    progress = started(t("modlist-steam-subscribing"));
    const answer = await subscribeTo(game, numbers, true, (m) => {
      progress = heard(progress, m);
    });
    busy = false;
    if (answer.state === "failed") {
      said = {
        text: t("modlist-steam-failed", { reason: answer.failure.detail }),
        refused: true,
      };
      return;
    }
    if (!answer.result.ok) {
      said = {
        text: t("modlist-steam-failed", {
          reason: answer.result.refusal ?? "",
        }),
        refused: true,
      };
      return;
    }
    const results = answer.result.data.results ?? [];
    const installed = results.filter((r) => r.installed).length;
    const refused = results.filter((r) => !r.subscribed).length;
    said = {
      text:
        refused > 0
          ? t("modlist-steam-some-refused", {
              count: refused,
              installed,
            })
          : t("modlist-steam-subscribed", {
              count: results.length,
              installed,
            }),
      refused: refused > 0,
    };
    ondone?.(results);
  }
</script>

<span class="subscribe">
  <button
    type="button"
    class="action strong"
    disabled={disabled || busy}
    onclick={press}>{busy ? t("modlist-steam-working") : label}</button
  >
  {#if busy}
    <ProgressBar {progress} fallback={t("modlist-steam-subscribing")} />
  {/if}
  {#if said}
    <span class="said" class:refused={said.refused} role="status"
      >{said.text}</span
    >
  {/if}
</span>

<style>
  .subscribe {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 10px;
  }

  .action.strong {
    border-width: 2px;
  }

  .said {
    color: var(--colour-success);
  }

  .said.refused {
    color: var(--colour-risk);
  }
</style>
