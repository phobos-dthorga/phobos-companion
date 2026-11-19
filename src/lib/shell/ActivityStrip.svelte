<script lang="ts">
  import { onDestroy } from "svelte";
  import { LOCALE, t } from "../i18n/runtime";
  import { activity, jobTask, SHOW_AFTER_MS } from "./activity.svelte";
  import { fraction } from "./progress";
  import { estimate, expectedMs } from "./timing";

  /**
   * One line under the page bar for anything still working, on any page (0.21.0): what is being done, how many jobs, a bar, and
   * how long so far. It shows only work that takes a while, and when it ends it says how long it took, then clears itself.
   */
  const LINGER_MS = 3500;
  const TICK_MS = 200;

  /** Each host command's words, for when its tool has not named what it is doing (written out for the catalogue check). */
  const JOB_WORDS: Record<string, string> = {
    home_status: "activity-home-status",
    kit_status: "activity-kit-status",
    report_catalogue: "activity-report-catalogue",
    run_report: "activity-run-report",
    test_lists: "activity-test-lists",
    test_code: "activity-test-code",
    mod_installs: "activity-mod-installs",
    move_install: "activity-move-install",
    texture_status: "activity-texture-status",
    encode_textures: "activity-encode-textures",
    changes_list: "activity-changes-list",
    entry_code: "activity-entry-code",
    timeline: "activity-timeline",
    as_it_stood: "activity-as-it-stood",
    settings_list: "activity-settings-list",
    connections: "activity-connections",
    read_log: "activity-read-log",
    patch_targets: "activity-patch-targets",
    kit_pins: "activity-kit-pins",
    makeup: "activity-makeup",
    mod_settings: "activity-mod-settings",
    save_picture: "activity-save-picture",
    memory_status: "activity-memory-status",
    memory_report: "activity-memory-report",
    memory_start: "activity-memory-start",
    memory_stop: "activity-memory-stop",
    memory_mark: "activity-memory-mark",
  };

  let now = $state(Date.now());
  let timer: ReturnType<typeof setInterval> | null = null;

  /** The clock runs only while there is work, or a finished one still showing; an idle strip costs nothing. */
  $effect(() => {
    const busy = activity.jobs.length > 0;
    const lingering =
      activity.finished !== null &&
      Date.now() - activity.finished.at < LINGER_MS;
    if ((busy || lingering) && timer === null) {
      now = Date.now();
      timer = setInterval(() => {
        now = Date.now();
        const stillLingering =
          activity.finished !== null && now - activity.finished.at < LINGER_MS;
        if (activity.jobs.length === 0 && !stillLingering && timer !== null) {
          clearInterval(timer);
          timer = null;
        }
      }, TICK_MS);
    }
  });
  onDestroy(() => {
    if (timer !== null) clearInterval(timer);
  });

  const showing = $derived(
    activity.jobs.filter((job) => now - job.begun >= SHOW_AFTER_MS),
  );
  const job = $derived(showing[showing.length - 1] ?? null);
  const recent = $derived(
    !job &&
      activity.finished &&
      activity.finished.ms >= SHOW_AFTER_MS &&
      now - activity.finished.at < LINGER_MS
      ? activity.finished
      : null,
  );

  function words(command: string, label: string): string {
    return label || t(JOB_WORDS[command] ?? "activity-working");
  }

  function seconds(ms: number): string {
    return (ms / 1000).toLocaleString(LOCALE, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  }

  const share = $derived.by(() => {
    if (!job) return null;
    const counted = fraction(job.progress);
    if (counted !== null) return counted;
    const expected = expectedMs(jobTask(job.command));
    return expected ? estimate(now - job.begun, expected).share : null;
  });
</script>

<div class="strip" class:done={recent !== null} class:empty={!job && !recent}>
  <p class="words" role="status" aria-live="polite">
    {#if job}
      <span class="dot" aria-hidden="true"></span>
      {words(job.command, job.progress.label)}
      {#if showing.length > 1}
        <span class="muted"
          >· {t("activity-jobs", { count: showing.length })}</span
        >
      {/if}
    {:else if recent}
      <span class="tick" aria-hidden="true">✓</span>
      {t("activity-done", {
        what: words(recent.command, recent.label),
        seconds: seconds(recent.ms),
      })}
    {/if}
  </p>
  {#if job}
    <div class="track" aria-hidden="true">
      {#if share !== null}
        <div class="fill" style:width="{Math.max(2, share * 100)}%"></div>
      {:else}
        <div class="fill moving"></div>
      {/if}
    </div>
    <span class="time muted" aria-hidden="true"
      >{seconds(now - job.begun)} s</span
    >
  {/if}
</div>

<style>
  .strip {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 12px;
    min-height: 30px;
    padding: 4px max(16px, 2vw);
    font-size: var(--type-small);
    border-bottom: 1px solid var(--colour-line);
    transition: background 400ms ease;
  }

  .strip.empty {
    min-height: 0;
    padding-block: 0;
    border-bottom-color: transparent;
  }

  .strip.done {
    background: color-mix(in srgb, var(--colour-success) 12%, transparent);
  }

  .words {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    margin: 0;
    overflow-wrap: anywhere;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--colour-accent);
    animation: pulse 1s ease-in-out infinite;
  }

  .tick {
    color: var(--colour-success);
    font-weight: 700;
  }

  @keyframes pulse {
    50% {
      opacity: 0.3;
    }
  }

  .track {
    flex: 1 1 120px;
    height: 4px;
    overflow: hidden;
    background: var(--colour-surface-soft);
    border-radius: 2px;
  }

  .fill {
    height: 100%;
    background: var(--colour-accent);
    transition: width 200ms linear;
  }

  .moving {
    width: 30%;
    animation: travel 1.4s ease-in-out infinite alternate;
  }

  @keyframes travel {
    from {
      margin-inline-start: 0;
    }

    to {
      margin-inline-start: 70%;
    }
  }

  .time {
    font-variant-numeric: tabular-nums;
  }

  @media (prefers-reduced-motion: reduce) {
    .dot,
    .moving {
      animation: none;
    }
  }
</style>
