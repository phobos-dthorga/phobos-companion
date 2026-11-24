<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import { readActivity } from "./desktopClient";
  import { measures, shown, sparkline, type MeasureId } from "./presentation";
  import type { Sample } from "./types";

  /**
   * The computer's activity in the status bar (0.86.0; the owner, 25 Nov 2026, and their choices by card): CPU, memory, disk and
   * network, each its value now and a tiny graph of the last minute, with the part taken by the Companion and the programs it
   * started drawn within it and named beside it (network has no such part: Windows can't tell which program carried what). It
   * asks the host once a second while the window is in view, and never announces itself: a screen reader reads it when asked.
   */
  const WIDTH = 60;
  const HEIGHT = 18;
  const LABELS: Record<MeasureId, string> = {
    cpu: "activity-cpu",
    memory: "activity-memory",
    disk: "activity-disk",
    network: "activity-network",
  };

  let samples = $state<Sample[]>([]);
  let timer: ReturnType<typeof setInterval> | undefined;

  async function read() {
    if (
      typeof document !== "undefined" &&
      document.visibilityState !== "visible"
    )
      return;
    samples = await readActivity();
  }

  const shownMeasures = $derived(measures(samples));
  const last = $derived(samples.at(-1));

  /** The words on hover: the whole computer, and the Companion's part, or for network what came and went. */
  function hover(id: MeasureId): string {
    const m = shownMeasures.find((x) => x.id === id);
    if (!m || !last) return "";
    if (id === "network")
      return t("activity-network-hover", {
        down: shown(last.netDown, "bytes-per-second"),
        up: shown(last.netUp, "bytes-per-second"),
      });
    if (id === "disk")
      return t("activity-disk-hover", {
        read: shown(last.diskRead, "bytes-per-second"),
        write: shown(last.diskWrite, "bytes-per-second"),
        ours: shown(m.ours ?? 0, m.unit),
      });
    if (id === "memory")
      return t("activity-memory-hover", {
        used: shown(last.memoryUsed, "bytes"),
        total: shown(last.memoryTotal, "bytes"),
        ours: shown(m.ours ?? 0, m.unit),
      });
    return t("activity-cpu-hover", {
      now: shown(m.now, m.unit),
      ours: shown(m.ours ?? 0, m.unit),
    });
  }

  onMount(() => {
    void read();
    timer = setInterval(() => void read(), 1000);
  });
  onDestroy(() => clearInterval(timer));
</script>

{#if shownMeasures.length > 0}
  <div class="meters" role="group" aria-label={t("activity-label")}>
    {#each shownMeasures as m (m.id)}
      {@const whole = sparkline(m.whole, WIDTH, HEIGHT)}
      {@const share = m.share ? sparkline(m.share, WIDTH, HEIGHT) : null}
      <span class="meter" title={hover(m.id)}>
        <span class="label">{t(LABELS[m.id])}</span>
        <svg
          class="graph"
          width={WIDTH}
          height={HEIGHT}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          aria-hidden="true"
        >
          <path class="whole-area" d={whole.area} />
          <path class="whole-line" d={whole.line} />
          {#if share}<path class="share-area" d={share.area} />{/if}
        </svg>
        <span class="value">{shown(m.now, m.unit)}</span>
        {#if m.ours !== null}
          <span class="ours"
            >{t("activity-ours", { value: shown(m.ours, m.unit) })}</span
          >
        {/if}
      </span>
    {/each}
  </div>
{/if}

<style>
  .meters {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 14px;
    font-variant-numeric: tabular-nums;
  }

  .meter {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    white-space: nowrap;
  }

  .label {
    font-weight: 600;
    color: var(--colour-text);
  }

  .graph {
    display: block;
    background: var(--colour-canvas);
    border: 1px solid var(--colour-line);
    border-radius: 2px;
  }

  /* The whole computer in the observed colour; the Companion's part in the accent, within it. Told apart by the words beside it
     too, never by colour alone. */
  .whole-area {
    fill: var(--colour-observed);
    fill-opacity: 0.25;
  }

  .whole-line {
    fill: none;
    stroke: var(--colour-observed);
    stroke-width: 1.2;
  }

  .share-area {
    fill: var(--colour-accent);
    fill-opacity: 0.7;
  }

  .value {
    min-width: 6ch;
    color: var(--colour-text);
  }

  .ours {
    color: var(--colour-accent);
  }

  @media (max-width: 900px) {
    .graph,
    .ours {
      display: none;
    }
  }
</style>
