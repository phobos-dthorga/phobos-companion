<script lang="ts">
  import { onDestroy } from "svelte";
  import { LOCALE, t } from "../i18n/runtime";
  import { themeColour, whineAlone } from "./decode";
  import { rgbOf } from "./pixels";
  import {
    averagePower,
    findWhine,
    HIGH_HZ,
    highsGap,
    loudness,
    mono,
    outline,
    samplePeak,
    spectrogram,
    STRONG_HIGHS_DB,
    WHINE_PROMINENCE_DB,
  } from "./sound";

  /**
   * One version of a changed sound (0.50.0): a player, its length, loudness, peak, how strong its highs are and any steady whine, its
   * waveform and its spectrogram (frequency over time, the high band marked), and the whine alone moved down where it can be heard.
   */
  let {
    label,
    channels,
    rate,
    seconds,
    address,
    chosen,
    onchoose,
    player = $bindable(null),
  }: {
    label: string;
    channels: Float32Array[];
    rate: number;
    seconds: number;
    address: string;
    chosen: boolean;
    onchoose: () => void;
    player?: HTMLAudioElement | null;
  } = $props();

  /** Columns drawn across the spectrogram and the waveform, and the spectrogram's rows (agent defaults). */
  const COLUMNS = 480;
  const ROWS = 240;
  /** The quietest level the spectrogram shows, under its loudest. */
  const RANGE_DB = 90;
  /** Where many adults stop hearing: marked on the spectrogram as well as 4 kHz. */
  const HIGH_MARK_HZ = 15000;
  const TICKS_HZ = [0, 4000, 8000, 12000, 16000, 20000];

  const mixed = $derived(mono(channels));
  const power = $derived(averagePower(mixed));
  const measured = $derived({
    lufs: loudness(channels, rate),
    peak: samplePeak(channels),
    gap: highsGap(power, rate),
    whine: findWhine(power, rate),
  });
  const top = $derived(rate / 2);

  let whineAddress = $state<string | null>(null);
  let making = $state(false);
  let whineFailed = $state(false);

  function decibels(value: number): string {
    return Number.isFinite(value)
      ? value.toLocaleString(LOCALE, {
          maximumFractionDigits: 1,
          minimumFractionDigits: 1,
        })
      : "−∞";
  }

  function kilohertz(hz: number): string {
    return (hz / 1000).toLocaleString(LOCALE, { maximumFractionDigits: 1 });
  }

  /** A ramp from the theme: its canvas, then its comparison, accent and words colours, brighter for louder. */
  function ramp(): [number, number, number][] {
    const stops = ["canvas", "comparison", "accent", "text"].map((role) =>
      rgbOf(themeColour(role)),
    );
    const at = [0, 0.45, 0.8, 1];
    return Array.from({ length: 256 }, (_, i) => {
      const x = i / 255;
      let s = 0;
      while (s < at.length - 2 && x > at[s + 1]) s++;
      const f = (x - at[s]) / (at[s + 1] - at[s]);
      return [0, 1, 2].map((c) =>
        Math.round(stops[s][c] + (stops[s + 1][c] - stops[s][c]) * f),
      ) as [number, number, number];
    });
  }

  function drawSpectrogram(canvas: HTMLCanvasElement, samples: Float32Array) {
    const found = spectrogram(samples, rate, COLUMNS);
    canvas.width = COLUMNS;
    canvas.height = ROWS;
    const context = canvas.getContext("2d");
    if (!context) return;
    const picture = context.createImageData(COLUMNS, ROWS);
    const colours = ramp();
    const floor = found.loudest - RANGE_DB;
    for (let y = 0; y < ROWS; y++) {
      const bin = Math.min(
        found.bins - 1,
        Math.floor(((ROWS - 1 - y) / ROWS) * found.bins),
      );
      for (let x = 0; x < COLUMNS; x++) {
        const level = found.levels[x * found.bins + bin];
        const step = Math.max(
          0,
          Math.min(255, Math.round(((level - floor) / RANGE_DB) * 255)),
        );
        const o = (y * COLUMNS + x) * 4;
        const [r, g, b] = colours[step];
        picture.data[o] = r;
        picture.data[o + 1] = g;
        picture.data[o + 2] = b;
        picture.data[o + 3] = 255;
      }
    }
    context.putImageData(picture, 0, 0);
  }

  function drawWaveform(canvas: HTMLCanvasElement, samples: Float32Array) {
    const height = 64;
    canvas.width = COLUMNS;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return;
    const { low, high } = outline(samples, COLUMNS);
    context.fillStyle = themeColour("line");
    context.fillRect(0, height / 2, COLUMNS, 1);
    context.fillStyle = themeColour("observed");
    for (let x = 0; x < COLUMNS; x++) {
      const from = Math.round((1 - high[x]) * (height / 2));
      const to = Math.round((1 - low[x]) * (height / 2));
      context.fillRect(x, from, 1, Math.max(1, to - from));
    }
  }

  function spectrogramAction(canvas: HTMLCanvasElement, samples: Float32Array) {
    drawSpectrogram(canvas, samples);
    return { update: (next: Float32Array) => drawSpectrogram(canvas, next) };
  }

  function waveformAction(canvas: HTMLCanvasElement, samples: Float32Array) {
    drawWaveform(canvas, samples);
    return { update: (next: Float32Array) => drawWaveform(canvas, next) };
  }

  /** How far up the spectrogram a frequency sits, as a share of its height from the bottom. */
  function heightOf(hz: number): string {
    return `${Math.min(100, (hz / top) * 100)}%`;
  }

  async function makeWhine() {
    if (!measured.whine) return;
    making = true;
    whineFailed = false;
    try {
      if (whineAddress) URL.revokeObjectURL(whineAddress);
      whineAddress = await whineAlone(channels, rate, measured.whine.hz);
    } catch {
      whineFailed = true;
    } finally {
      making = false;
    }
  }

  onDestroy(() => {
    if (whineAddress) URL.revokeObjectURL(whineAddress);
  });
</script>

<section class="sound" class:chosen aria-label={label}>
  <header>
    <h4>{label}</h4>
    <button
      type="button"
      class="toggle"
      aria-pressed={chosen}
      onclick={onchoose}
      >{chosen ? t("media-sound-chosen") : t("media-sound-choose")}</button
    >
  </header>
  <audio
    controls
    preload="metadata"
    src={address}
    bind:this={player}
    aria-label={t("media-sound-player", { side: label })}
  ></audio>

  <dl class="figures">
    <dt>{t("media-sound-length")}</dt>
    <dd>
      {t("media-sound-seconds", {
        seconds: seconds.toLocaleString(LOCALE, { maximumFractionDigits: 2 }),
      })}
    </dd>
    <dt>{t("media-sound-loudness")}</dt>
    <dd>
      {t("media-sound-lufs", { lufs: decibels(measured.lufs) })}
    </dd>
    <dt>{t("media-sound-peak")}</dt>
    <dd>{t("media-sound-dbfs", { peak: decibels(measured.peak) })}</dd>
    <dt>{t("media-sound-highs")}</dt>
    <dd>
      {#if measured.gap === null}
        {t("media-sound-highs-none")}
      {:else if measured.gap <= STRONG_HIGHS_DB}
        <strong
          >{t("media-sound-highs-strong", {
            gap: decibels(measured.gap),
            high: kilohertz(HIGH_HZ),
          })}</strong
        >
      {:else}
        {t("media-sound-highs-gap", {
          gap: decibels(measured.gap),
          high: kilohertz(HIGH_HZ),
        })}
      {/if}
    </dd>
    <dt>{t("media-sound-whine")}</dt>
    <dd>
      {#if !measured.whine}
        {t("media-sound-whine-none")}
      {:else if measured.whine.prominenceDb >= WHINE_PROMINENCE_DB}
        <strong
          >{t("media-sound-whine-found", {
            khz: kilohertz(measured.whine.hz),
            prominence: decibels(measured.whine.prominenceDb),
          })}</strong
        >
      {:else}
        {t("media-sound-whine-weak", {
          khz: kilohertz(measured.whine.hz),
          prominence: decibels(measured.whine.prominenceDb),
        })}
      {/if}
    </dd>
  </dl>

  {#if measured.whine}
    <div class="whine">
      <button
        type="button"
        class="action"
        disabled={making}
        onclick={makeWhine}
      >
        {making
          ? t("media-sound-whine-making")
          : t("media-sound-whine-make", { khz: kilohertz(measured.whine.hz) })}
      </button>
      {#if whineAddress}
        <audio
          controls
          src={whineAddress}
          aria-label={t("media-sound-whine-player", { side: label })}
        ></audio>
      {/if}
      {#if whineFailed}
        <p class="small">{t("media-sound-whine-failed")}</p>
      {/if}
      <p class="small muted">{t("media-sound-whine-about")}</p>
    </div>
  {/if}

  <figure>
    <figcaption class="small">{t("media-sound-waveform")}</figcaption>
    <div
      role="img"
      aria-label={t("media-sound-waveform-label", { side: label })}
    >
      <canvas class="waveform" use:waveformAction={mixed} aria-hidden="true"
      ></canvas>
    </div>
  </figure>

  <figure>
    <figcaption class="small">
      {t("media-sound-spectrogram", { range: RANGE_DB })}
    </figcaption>
    <div
      class="spectrum"
      role="img"
      aria-label={t("media-sound-spectrogram-label", {
        side: label,
        top: kilohertz(top),
      })}
    >
      <canvas use:spectrogramAction={mixed} aria-hidden="true"></canvas>
      {#each TICKS_HZ.filter((hz) => hz < top) as hz (hz)}
        <span class="tick" style:bottom={heightOf(hz)}
          >{t("media-sound-khz", { khz: kilohertz(hz) })}</span
        >
      {/each}
      <span class="mark" style:bottom={heightOf(HIGH_HZ)}
        ><span>{t("media-sound-mark-high", { khz: kilohertz(HIGH_HZ) })}</span
        ></span
      >
      {#if HIGH_MARK_HZ < top}
        <span class="mark" style:bottom={heightOf(HIGH_MARK_HZ)}
          ><span
            >{t("media-sound-mark-top", { khz: kilohertz(HIGH_MARK_HZ) })}</span
          ></span
        >
      {/if}
      {#if measured.whine && measured.whine.prominenceDb >= WHINE_PROMINENCE_DB}
        <span class="mark whine-mark" style:bottom={heightOf(measured.whine.hz)}
          ><span
            >{t("media-sound-mark-whine", {
              khz: kilohertz(measured.whine.hz),
            })}</span
          ></span
        >
      {/if}
    </div>
  </figure>
</section>

<style>
  .sound {
    min-width: 0;
    padding: 10px 12px;
    background: var(--colour-surface);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .sound.chosen {
    border: 2px solid var(--colour-accent);
  }

  header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;
  }

  h4 {
    margin: 0;
    font-size: var(--type-body, 1rem);
  }

  audio {
    width: 100%;
    margin-bottom: 8px;
  }

  .figures {
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
    gap: 4px 12px;
    margin: 0 0 10px;
    font-size: var(--type-small);
  }

  dt {
    color: var(--colour-text-muted);
  }

  dd {
    margin: 0;
  }

  .whine {
    margin-bottom: 10px;
  }

  .action {
    min-height: var(--control-min);
    padding: 0 12px;
    font: inherit;
    font-size: var(--type-small);
    color: var(--colour-text);
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
    cursor: pointer;
  }

  .small {
    margin: 4px 0;
    font-size: var(--type-small);
  }

  figure {
    margin: 0 0 10px;
  }

  canvas {
    display: block;
    width: 100%;
  }

  .waveform {
    height: 64px;
    background: var(--colour-canvas);
  }

  .spectrum {
    position: relative;
    margin-inline-start: 52px;
  }

  .spectrum canvas {
    height: 240px;
  }

  .tick {
    position: absolute;
    inset-inline-end: calc(100% + 6px);
    transform: translateY(50%);
    font-size: var(--type-caption);
    color: var(--colour-text-muted);
    white-space: nowrap;
  }

  .mark {
    position: absolute;
    inset-inline: 0;
    border-top: 1px dashed var(--colour-text);
    pointer-events: none;
  }

  .mark span {
    position: absolute;
    inset-inline-end: 4px;
    bottom: 2px;
    padding: 0 4px;
    font-size: var(--type-caption);
    color: var(--colour-text);
    background: var(--colour-canvas);
  }

  .whine-mark {
    border-top: 2px solid var(--colour-accent);
  }
</style>
