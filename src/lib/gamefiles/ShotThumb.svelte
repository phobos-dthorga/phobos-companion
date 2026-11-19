<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import { formatUnixDate, formatTime } from "../shell/dates";
  import { thumbnail, type Shot } from "./shots";

  /**
   * One screenshot, drawn small (0.32.0): the picture is read and shrunk only once it scrolls into view, and kept for this run.
   * Pressing it opens the picture whole. A picture that cannot be read says so in words, never shows a broken image.
   */
  let { shot, onopen }: { shot: Shot; onopen: (shot: Shot) => void } = $props();

  let element = $state<HTMLButtonElement | null>(null);
  let source = $state<string | null>(null);
  let failed = $state(false);

  const when = $derived(
    `${formatUnixDate(shot.taken)} ${formatTime(new Date(shot.taken * 1000))}`,
  );

  onMount(() => {
    if (!element) return;
    const watcher = new IntersectionObserver(
      (seen) => {
        if (!seen.some((s) => s.isIntersecting)) return;
        watcher.disconnect();
        void thumbnail(shot.path).then((made) => {
          if (made) source = made;
          else failed = true;
        });
      },
      { rootMargin: "200px" },
    );
    watcher.observe(element);
    return () => watcher.disconnect();
  });
</script>

<button
  type="button"
  class="thumb"
  bind:this={element}
  aria-label={t("shots-open", { name: shot.name, when })}
  title={t("shots-open", { name: shot.name, when })}
  onclick={() => onopen(shot)}
>
  {#if source}
    <img src={source} alt="" />
  {:else}
    <span class="waiting small muted"
      >{failed ? t("shots-unreadable") : t("shots-drawing")}</span
    >
  {/if}
  <span class="when small">{when}</span>
</button>

<style>
  .thumb {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 180px;
    padding: 4px;
    text-align: start;
    background: var(--colour-surface-soft);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
    cursor: pointer;
  }

  .thumb:hover,
  .thumb:focus-visible {
    border-color: var(--colour-accent);
  }

  img,
  .waiting {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    aspect-ratio: 16 / 9;
    object-fit: cover;
    border-radius: 2px;
    background: var(--colour-canvas);
  }

  .when {
    color: var(--colour-text-muted);
  }
</style>
