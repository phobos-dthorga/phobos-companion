<script lang="ts">
  import { t } from "../i18n/runtime";
  import type { OtherAnswer } from "../othercode/types";
  import ReportView from "../reports/ReportView.svelte";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import WindowDialog from "../shell/WindowDialog.svelte";
  import { heard, started } from "../shell/progress";
  import type { Failed } from "../shell/types";
  import { playersSay } from "./desktopClient";

  /**
   * What players say (0.107.0; the owner's choice of 27 Nov 2026, "Workshop research on Mod list"): a Workshop mod's update date,
   * the newest comments that mention problems, and the uploader's latest replies, read from Steam's public pages on a press, in a
   * dialog over the window so the list beneath never moves. Only reads; Workshop pages in Going online switches it off.
   */
  let { number, name }: { number: string; name: string } = $props();

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
    reading = await playersSay(number, (m) => {
      progress = heard(progress, m);
    });
  }
</script>

<button type="button" class="action" onclick={read}
  >{t("modlist-players-say")}</button
>

{#if open}
  <WindowDialog
    kicker={t("modlist-players-kicker")}
    title={t("modlist-players-title", { name })}
    closeLabel={t("modlist-players-close")}
    width={1100}
    onclose={() => (open = false)}
  >
    {#if reading.state === "running"}
      <ProgressBar {progress} fallback={t("modlist-players-reading")} />
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
