<script lang="ts">
  import { untrack } from "svelte";
  import { t } from "../i18n/runtime";
  import { pictureAddress } from "../media/addresses";
  import { showingOf } from "../media/decode";
  import { readViewable } from "../media/desktopClient";
  import MediaCompare from "../media/MediaCompare.svelte";
  import type { MediaSource } from "../media/source";
  import { formatWhen } from "../shell/dates";
  import type { Placed } from "./presentation";
  import { NONE, type PickTry } from "./types";

  /**
   * One pick (0.55.0): what it is, every try at a glance, the try in focus against the picture or sound in use, with the code viewer's
   * views, and the presses that keep the owner's pick. The page holds which try is in focus, so its keys can step through them.
   */
  let {
    placed,
    focus,
    busy,
    words = $bindable(""),
    onfocus,
    onpick,
  }: {
    placed: Placed;
    /** The try in focus. */
    focus: PickTry;
    busy: boolean;
    /**
     * What the owner has typed for this pick, kept by the page per pick (0.76.1; the owner, 24 Nov 2026: of three comments, one was
     * lost): moving to another pick and back keeps it, and the page's keyboard shortcuts send it too.
     */
    words?: string;
    onfocus: (found: PickTry) => void;
    /** A try's id, or "none"; with the owner's words. */
    onpick: (pick: string, words: string) => void;
  } = $props();

  /** What the try in focus is set against (0.57.0): "in-use", another try's id, or "" for the one in use, else the first other try. */
  let against = $state("");
  let thumbnails = $state<Record<string, string | null>>({});

  const pick = $derived(placed.pick);
  /** Every try drawn small, side by side: only pictures a browser draws itself, and only when there is more than one. */
  const glance = $derived(
    pick.kind === "picture" &&
      pick.tries.length > 1 &&
      pick.tries.every(
        (found) =>
          showingOf(found.path) === "picture" &&
          !found.path.toLowerCase().endsWith(".dds"),
      ),
  );

  $effect(() => {
    if (!glance) return;
    const tries = pick.tries;
    // Asking the host writes to the activity strip's state: untracked, so this effect never waits on its own write.
    untrack(() => {
      for (const found of tries)
        if (found.there && !(found.path in thumbnails))
          void pictureAddress(found.path).then((address) => {
            thumbnails[found.path] = address;
          });
    });
  });

  // A new pick starts with its own comparison. Its words are the page's, kept per pick (0.76.1), so they are not cleared here.
  $effect(() => {
    void pick.id;
    against = "";
  });

  /** The tries the one in focus can be set against: every other try on this PC. */
  const others = $derived(
    pick.tries.filter((found) => found.id !== focus.id && found.there),
  );
  const inUseShown = $derived(Boolean(pick.inUse && pick.inUseThere));
  /** The choice in effect: the one asked for while it can be shown, else the one in use, else the first other try. */
  const setAgainst = $derived(
    against === "in-use" && inUseShown
      ? "in-use"
      : others.some((found) => found.id === against)
        ? against
        : inUseShown
          ? "in-use"
          : (others[0]?.id ?? ""),
  );

  const source = $derived.by((): MediaSource => {
    const other = others.find((found) => found.id === setAgainst);
    return {
      key: `${placed.repository}/${pick.id}/${focus.id}/${setAgainst}`,
      before:
        setAgainst === "in-use" && pick.inUse
          ? {
              label: t("picks-in-use"),
              path: pick.inUse,
              read: () => readViewable(pick.inUse ?? ""),
            }
          : other
            ? {
                label: other.label,
                path: other.path,
                read: () => readViewable(other.path),
              }
            : null,
      after: focus.there
        ? {
            label: focus.label,
            path: focus.path,
            read: () => readViewable(focus.path),
          }
        : null,
      tolerance: 0,
      alone: pick.inUse ? t("picks-alone-missing") : t("picks-alone-new"),
      grounds: placed.grounds,
      place: "picks",
    };
  });

  function answerWords(): string {
    if (!pick.answer) return "";
    const chosen = pick.tries.find((found) => found.id === pick.answer?.pick);
    return pick.answer.pick === NONE
      ? t("picks-answered-none", { when: formatWhen(pick.answer.time) })
      : t("picks-answered", {
          label: chosen?.label ?? pick.answer.pick,
          when: formatWhen(pick.answer.time),
        });
  }
</script>

<section class="pick" aria-labelledby="pick-title">
  <h2 id="pick-title">{pick.title}</h2>
  <p class="muted small">
    {t("picks-facts", {
      repository: placed.repository,
      kind:
        pick.kind === "picture"
          ? t("picks-kind-picture")
          : t("picks-kind-sound"),
      count: pick.tries.length,
      asked: pick.asked,
    })}
    {#if pick.from}<span class="from"> · {pick.from}</span>{/if}
  </p>
  {#if pick.context}<p class="context">{pick.context}</p>{/if}
  {#if pick.answer}
    <p class="answered" role="status">
      {answerWords()}
      {#if pick.answer.words}<span class="muted">
          “{pick.answer.words}”</span
        >{/if}
      <span class="muted"> {t("picks-answered-change")}</span>
    </p>
  {/if}

  <div class="tries" role="group" aria-label={t("picks-tries-label")}>
    {#each pick.tries as found (found.id)}
      <button
        type="button"
        class="try"
        aria-pressed={focus.id === found.id}
        onclick={() => onfocus(found)}
      >
        {#if glance}
          <span class="thumb" style:background={placed.grounds[0]?.colour}>
            {#if thumbnails[found.path]}
              <img src={thumbnails[found.path]} alt="" />
            {/if}
          </span>
        {/if}
        <span class="label">{found.label}</span>
        {#if found.note}<span class="muted note">{found.note}</span>{/if}
        {#if !found.there}<span class="missing">{t("picks-try-missing")}</span
          >{/if}
      </button>
    {/each}
  </div>

  {#if inUseShown || others.length > 0}
    <div class="toggles" role="group" aria-label={t("picks-against-label")}>
      <span class="muted small against">{t("picks-against")}</span>
      {#if inUseShown}
        <button
          type="button"
          class="toggle"
          aria-pressed={setAgainst === "in-use"}
          onclick={() => (against = "in-use")}>{t("picks-in-use")}</button
        >
      {/if}
      {#each others as other (other.id)}
        <button
          type="button"
          class="toggle"
          aria-pressed={setAgainst === other.id}
          onclick={() => (against = other.id)}>{other.label}</button
        >
      {/each}
    </div>
  {/if}

  {#if focus.there || inUseShown}
    <div class="compare">
      <MediaCompare {source} />
    </div>
  {:else}
    <p class="missing">{t("picks-nothing-to-show")}</p>
  {/if}

  <div class="decide">
    <label class="words">
      <span>{t("picks-words")}</span>
      <textarea rows="2" bind:value={words} maxlength="4000"></textarea>
    </label>
    <div class="buttons">
      <button
        type="button"
        class="action pick-button"
        disabled={busy || !focus.there}
        onclick={() => onpick(focus.id, words)}
        >{t("picks-pick", { label: focus.label })}</button
      >
      <button
        type="button"
        class="action"
        disabled={busy}
        onclick={() => onpick(NONE, words)}>{t("picks-none")}</button
      >
    </div>
  </div>
</section>

<style>
  .pick {
    min-width: 0;
  }

  h2 {
    margin: 0 0 4px;
    font-family: var(--font-display);
    font-size: 1.375rem;
  }

  .small {
    margin: 0 0 6px;
    font-size: var(--type-small);
  }

  .from {
    overflow-wrap: anywhere;
  }

  .context {
    margin: 0 0 8px;
  }

  .answered {
    margin: 0 0 10px;
    padding: 6px 10px;
    border-inline-start: 3px solid var(--colour-success);
  }

  .tries {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 10px;
  }

  .try {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    min-width: 96px;
    min-height: var(--control-min);
    padding: 6px 10px;
    font: inherit;
    font-size: var(--type-small);
    color: var(--colour-text);
    background: transparent;
    border: 1px solid var(--colour-line);
    border-radius: 4px;
    cursor: pointer;
  }

  .try[aria-pressed="true"] {
    background: var(--colour-surface-soft);
    border: 2px solid var(--colour-accent);
  }

  .thumb {
    display: grid;
    place-items: center;
    width: 128px;
    height: 128px;
    background: var(--colour-canvas);
  }

  .thumb img {
    max-width: 128px;
    max-height: 128px;
    image-rendering: pixelated;
  }

  .label {
    font-weight: 600;
  }

  .note {
    font-size: var(--type-caption);
  }

  .missing {
    color: var(--colour-risk);
    font-size: var(--type-small);
  }

  .toggles {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    margin-bottom: 8px;
  }

  .against {
    margin-inline-end: 6px;
  }

  .compare {
    margin-bottom: 12px;
    padding: 8px 0;
    background: var(--colour-canvas);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .decide {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 10px 16px;
  }

  .words {
    display: flex;
    flex: 1 1 320px;
    flex-direction: column;
    gap: 4px;
    font-size: var(--type-small);
  }

  textarea {
    font: inherit;
    color: var(--colour-text);
    background: var(--colour-surface);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
    padding: 6px 8px;
  }

  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .pick-button {
    border: 2px solid var(--colour-accent);
    font-weight: 600;
  }
</style>
