<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import { fraction, trail, type ProgressState } from "./progress";
  import { estimate, expectedMs, remember } from "./timing";

  /**
   * A bar for work in progress. Filled by a count when the work can be counted ("3 of 23"). When it cannot, it fills against how
   * long the same work took last time and says about how long is left (0.21.0), and only moves when it has never been timed.
   * Always with words saying what is being done; the stages already finished show as a trail above (0.21.0), and the work's latest
   * line of output beneath. `fallback` is said until the work names itself, and is the name its timing is kept by.
   *
   * While a bar is on screen, Save a picture waits for it to go (0.24.0), so a picture shows the page and not its loading.
   * `holdsPicture` is false for a bar that stays up for minutes while the page is already there to see (a memory watch).
   */
  let {
    progress,
    fallback,
    holdsPicture = true,
  }: {
    progress: ProgressState;
    fallback: string;
    holdsPicture?: boolean;
  } = $props();

  const TICK_MS = 250;

  const share = $derived(fraction(progress));
  const label = $derived(progress.label || fallback);
  const finished = $derived(trail(progress));

  // svelte-ignore state_referenced_locally
  const task = fallback;
  const begun = Date.now();
  const expected = expectedMs(task);
  let now = $state(Date.now());
  let timer: ReturnType<typeof setInterval> | null = null;
  const guess = $derived(expected ? estimate(now - begun, expected) : null);

  onMount(() => {
    if (expected) timer = setInterval(() => (now = Date.now()), TICK_MS);
  });

  // The bar goes when its work is done: how long it took is kept for next time.
  onDestroy(() => {
    if (timer) clearInterval(timer);
    remember(task, Date.now() - begun);
  });
</script>

<div class="progress" data-picture-wait={holdsPicture ? "" : undefined}>
  {#if finished.stages.length > 0}
    <ol class="trail" aria-label={t("progress-trail")}>
      {#if finished.earlier > 0}
        <li class="earlier">
          {t("progress-earlier", { count: finished.earlier })}
        </li>
      {/if}
      {#each finished.stages as stage, index (index)}
        <li class="done">
          <span class="tick" aria-hidden="true">✓</span>{stage}
        </li>
      {/each}
      <li class="now" aria-current="step">{label}</li>
    </ol>
  {/if}
  <p class="label" role="status">
    {label}
    {#if progress.step !== null && progress.of !== null}
      <span class="count"
        >{t("progress-count", { step: progress.step, of: progress.of })}</span
      >
    {:else if guess}
      <span class="count"
        >{guess.secondsLeft !== null
          ? t("progress-left", { seconds: guess.secondsLeft })
          : t("progress-longer")}</span
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
  {:else if guess}
    <div
      class="track"
      role="progressbar"
      aria-label={label}
      aria-valuetext={guess.secondsLeft !== null
        ? t("progress-left", { seconds: guess.secondsLeft })
        : t("progress-longer")}
    >
      <div
        class="fill guessed"
        style:width="{Math.max(2, guess.share * 100)}%"
      ></div>
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

  .trail {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 0 0 8px;
    padding: 0;
    list-style: none;
    font-size: var(--type-small);
  }

  .trail li {
    display: flex;
    align-items: center;
    gap: 6px;
    max-width: 100%;
    padding: 3px 10px;
    color: var(--colour-text-muted);
    border: 1px solid var(--colour-line);
    border-radius: 999px;
    overflow-wrap: anywhere;
  }

  .trail .done {
    color: var(--colour-text);
    background: var(--colour-surface-soft);
  }

  .tick {
    color: var(--colour-success);
    font-weight: 700;
  }

  .trail .now {
    color: var(--colour-text);
    border-color: var(--colour-accent);
    animation: glow 1.6s ease-in-out infinite;
  }

  .trail .earlier {
    border-style: dashed;
  }

  @keyframes glow {
    50% {
      box-shadow: 0 0 0 3px
        color-mix(in srgb, var(--colour-accent) 35%, transparent);
    }
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

  /* Filled against last time's length: the same bar, its edge softened, since it is a guess. */
  .guessed {
    transition: width 250ms linear;
    background: linear-gradient(
      90deg,
      var(--colour-accent) 85%,
      color-mix(in srgb, var(--colour-accent) 40%, transparent)
    );
  }

  /* Work that cannot be counted or guessed: a band that travels. With reduced motion it stands still, a third of the bar, and
     the words carry the meaning. */
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

  @media (prefers-reduced-motion: reduce) {
    .trail .now,
    .moving {
      animation: none;
    }
  }
</style>
