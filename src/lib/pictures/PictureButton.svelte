<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import { register } from "../shortcuts/registry";
  import {
    capture,
    copyPicture,
    pictureName,
    SETTLED_LOOKS,
    settledLooks,
    stillLoading,
  } from "./capture";
  import { savePicture, showPicture } from "./desktopClient";

  /**
   * Save a picture: the whole window, the page's scrolled parts included, saved into the Companion's folder in the owner's Pictures
   * and copied, ready to paste into a message (the owner's request, 19 Nov 2026, to share with Hiddensoul and friends). It says
   * where it went, with a button to show it in its folder. Until 0.68.0 it drew only the page; the owner chose the whole window
   * (23 Nov 2026), once the pages had moved to the left side, so a picture shows the bar, the page list and the details too.
   */
  let { game, page }: { game: string; page: string } = $props();

  type Result =
    | { state: "idle" }
    | { state: "waiting" }
    | { state: "drawing" }
    | { state: "saved"; path: string; copied: boolean }
    | { state: "failed"; reason: string };

  let result = $state<Result>({ state: "idle" });

  /** How often a waiting picture looks again whether the page has finished loading. */
  const LOOK_MS = 250;
  let looking: ReturnType<typeof setInterval> | null = null;

  /** The page itself, which says whether it is still loading. */
  function pageElement(): HTMLElement | null {
    const main = document.querySelector("main");
    return main instanceof HTMLElement ? main : null;
  }

  /** What the picture shows: the whole window (0.68.0). */
  function windowElement(): HTMLElement | null {
    const shell = document.querySelector(".shell");
    return shell instanceof HTMLElement ? shell : null;
  }

  function stopLooking() {
    if (looking) clearInterval(looking);
    looking = null;
  }

  /**
   * A picture asked for while the page is still loading waits until it has loaded (0.24.0: one taken mid-read showed only the
   * progress bar), unless the owner takes it now. Changing page while it waits lets it go.
   */
  function take() {
    if (result.state === "drawing" || result.state === "waiting") return;
    const main = pageElement();
    if (!main) return;
    if (!stillLoading(main)) return void draw();
    result = { state: "waiting" };
    const askedOn = page;
    let looks = 0;
    looking = setInterval(() => {
      const now = pageElement();
      if (page !== askedOn || !now) {
        stopLooking();
        result = { state: "idle" };
        return;
      }
      looks = settledLooks(looks, stillLoading(now));
      if (looks >= SETTLED_LOOKS) {
        stopLooking();
        void draw();
      }
    }, LOOK_MS);
  }

  function takeNow() {
    stopLooking();
    void draw();
  }

  function dismiss() {
    stopLooking();
    result = { state: "idle" };
  }

  onDestroy(stopLooking);

  async function draw() {
    const whole = windowElement();
    if (!whole) return;
    result = { state: "drawing" };
    try {
      const bytes = await capture(whole);
      const copied = await copyPicture(bytes);
      const saved = await savePicture(
        bytes,
        pictureName(game, page, new Date()),
      );
      result =
        saved.state === "ready"
          ? { state: "saved", path: saved.path, copied }
          : { state: "failed", reason: saved.failure.detail };
    } catch (problem) {
      result = { state: "failed", reason: String(problem) };
    }
  }

  onMount(() =>
    register({
      scope: "everywhere",
      inDialog: false,
      run: { picture: () => void take() },
    }),
  );
</script>

<span class="picture" data-no-picture>
  <button
    type="button"
    class="action"
    disabled={result.state === "drawing" || result.state === "waiting"}
    onclick={take}
    >{result.state === "drawing"
      ? t("picture-drawing")
      : result.state === "waiting"
        ? t("picture-waiting-button")
        : t("picture-take")}</button
  >
  {#if result.state === "saved" || result.state === "failed" || result.state === "waiting"}
    <span
      class="notice"
      class:waiting={result.state === "waiting"}
      role="status"
    >
      {#if result.state === "waiting"}
        <span>{t("picture-waiting")}</span>
        <button type="button" class="action" onclick={takeNow}
          >{t("picture-now")}</button
        >
      {:else if result.state === "saved"}
        <span
          >{result.copied
            ? t("picture-saved-copied", { path: result.path })
            : t("picture-saved", { path: result.path })}</span
        >
        <button
          type="button"
          class="action"
          onclick={() =>
            result.state === "saved" && void showPicture(result.path)}
          >{t("picture-show")}</button
        >
      {:else}
        <span>{t("picture-failed", { reason: result.reason })}</span>
      {/if}
      <button
        type="button"
        class="action"
        aria-label={result.state === "waiting"
          ? t("picture-cancel")
          : t("picture-dismiss")}
        onclick={dismiss}>✕</button
      >
    </span>
  {/if}
</span>

<style>
  .picture {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 10px;
  }

  .notice {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 10px;
    padding: 4px 10px;
    font-size: var(--type-small);
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-success);
    border-radius: 4px;
    overflow-wrap: anywhere;
  }

  .notice.waiting {
    border-color: var(--colour-accent);
  }
</style>
