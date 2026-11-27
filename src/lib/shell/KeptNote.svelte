<script lang="ts">
  import { t } from "../i18n/runtime";
  import { formatWhen } from "./dates";
  import ProgressBar from "./ProgressBar.svelte";
  import { started, type ProgressState } from "./progress";

  /**
   * Said above a page showing its last answer while it reads again (0.116.0; the owner's choice of 28 Nov 2026, "Old at once,
   * then fresh"): when that answer was read, that buttons which change something wait for the fresh one, and a bar for the read.
   * The page is there to read meanwhile, so a picture of it need not wait for the bar.
   */
  let {
    at,
    progress = started(),
    fallback,
  }: { at: string; progress?: ProgressState; fallback: string } = $props();
</script>

<div class="kept">
  <p role="status">{t("kept-note", { when: formatWhen(at) })}</p>
  <ProgressBar {progress} {fallback} holdsPicture={false} />
</div>

<style>
  .kept {
    margin-block: 8px 12px;
    padding: 8px 12px;
    border-inline-start: 3px solid var(--colour-accent);
    background: var(--colour-surface-raised);
  }

  p {
    margin: 0 0 6px;
  }
</style>
