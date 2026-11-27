<script lang="ts">
  import { t } from "../i18n/runtime";
  import type { OtherAnswer } from "../othercode/types";
  import ReportView from "../reports/ReportView.svelte";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import WindowDialog from "../shell/WindowDialog.svelte";
  import { heard, started } from "../shell/progress";
  import type { Failed } from "../shell/types";
  import { gameReviews, playersSay } from "./desktopClient";

  /**
   * What players say (0.107.0; the owner's choice of 27 Nov 2026, "Workshop research on Mod list"): a Workshop mod's update date,
   * the newest comments that mention problems, and the uploader's latest replies, read from Steam's public pages on a press, in a
   * dialog over the window so the list beneath never moves. Only reads; Workshop pages in Going online switches it off.
   *
   * With `game` instead of a number (0.111.0; the owner, 27 Nov 2026: "it'll just be reviews instead"): the game's own Steam
   * reviews, or the DLC's whose name this mod has, for the game itself and each DLC.
   */
  let {
    name,
    number = "",
    game = "",
  }: { name: string; number?: string; game?: string } = $props();

  let open = $state(false);
  let reading = $state<
    | { state: "running" }
    | { state: "ready"; answer: OtherAnswer<unknown> }
    | Failed
  >({ state: "running" });
  let progress = $state(started());

  async function read() {
    open = true;
    reading = { state: "running" };
    progress = started();
    const hear = (m: Parameters<typeof heard>[1]) => {
      progress = heard(progress, m);
    };
    reading = game
      ? await gameReviews(game, name, hear)
      : await playersSay(number, hear);
  }
</script>

<button type="button" class="action" onclick={read}
  >{t("modlist-players-say")}</button
>

{#if open}
  <WindowDialog
    kicker={t(game ? "modlist-players-kicker-steam" : "modlist-players-kicker")}
    title={t("modlist-players-title", { name })}
    closeLabel={t("modlist-players-close")}
    width={1100}
    onclose={() => (open = false)}
  >
    {#if reading.state === "running"}
      <ProgressBar
        {progress}
        fallback={t(
          game ? "modlist-players-reading-reviews" : "modlist-players-reading",
        )}
      />
    {:else if reading.state === "failed"}
      <FailurePanel failure={reading.failure} onretry={read} />
    {:else if !reading.answer.ok}
      <p>
        {t("modlist-players-refused", {
          reason: reading.answer.refusal ?? "",
        })}
      </p>
    {:else if reading.answer.report}
      <ReportView report={reading.answer.report} />
    {/if}
  </WindowDialog>
{/if}
