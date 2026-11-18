<script lang="ts">
  import { t } from "../i18n/runtime";
  import { fraction, type ProgressState } from "./progress";

  /**
   * A bar for work in progress. Filled by a count when the work can be counted ("3 of 23"), moving when it cannot; always with
   * words saying what is being done, and the work's latest line of output beneath when it has one. `fallback` is said until the
   * work names itself.
   */
  let { progress, fallback }: { progress: ProgressState; fallback: string } =
    $props();

  const share = $derived(fraction(progress));
  const label = $derived(progress.label || fallback);
</script>

<div class="progress">
  <p class="label" role="status">
    {label}
    {#if progress.step !== null && progress.of !== null}
      <span class="count"
        >{t("progress-count", { step: progress.step, of: progress.of })}</span
      >
    {/if}
  </p>
  {#if share !== null}
    <div
      class="track"
      role="progressbar"
      aria-label={label}
      aria-valuemin="0"
      aria-valuemax={progress.of}
      aria-valuenow={progress.step}
      aria-valuetext={t("progress-count", {
        step: progress.step ?? 0,
        of: progress.of ?? 0,
      })}
    >
      <div class="fill" style:width="{Math.max(2, share * 100)}%"></div>
    </div>
  {:else}
    <div
      class="track"
      role="progressbar"
      aria-label={label}
      aria-valuetext={t("progress-working")}
    >
      <div class="fill moving"></div>
    </div>
  {/if}
  <p class="detail muted" aria-hidden="true">{progress.detail || " "}</p>
</div>

<style>
  .progress {
    max-width: 80ch;
    margin-block: 10px;
  }

  .label {
    margin: 0 0 6px;
    font-weight: 600;
  }

  .count {
    margin-inline-start: 8px;
    font-weight: 400;
    color: var(--colour-text-muted);
  }

  .track {
    height: 10px;
    overflow: hidden;
    background: var(--colour-surface-soft);
    border: 1px solid var(--colour-line);
    border-radius: 5px;
  }

  .fill {
    height: 100%;
    background: var(--colour-accent);
    transition: width 200ms ease-out;
  }

  /* Work that cannot be counted: a band that travels. With reduced motion it stands still, a third of the bar, and the
     words carry the meaning. */
  .moving {
    width: 34%;
    animation: travel 1.4s ease-in-out infinite alternate;
  }

  @keyframes travel {
    from {
      margin-inline-start: 0;
    }

    to {
      margin-inline-start: 66%;
    }
  }

  .detail {
    min-height: 1.4em;
    margin: 4px 0 0;
    overflow: hidden;
    font-size: var(--type-caption);
    white-space: nowrap;
    text-overflow: ellipsis;
  }
</style>
