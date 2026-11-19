<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import { register } from "../shortcuts/registry";
  import { capture, copyPicture, pictureName } from "./capture";
  import { savePicture, showPicture } from "./desktopClient";

  /**
   * Save a picture: the whole page, scrolled parts included, saved into the Companion's folder in the owner's Pictures and copied,
   * ready to paste into a message (the owner's request, 19 Nov 2026, to share with Hiddensoul and friends). It says where it went,
   * with a button to show it in its folder.
   */
  let { game, page }: { game: string; page: string } = $props();

  type Result =
    | { state: "idle" }
    | { state: "drawing" }
    | { state: "saved"; path: string; copied: boolean }
    | { state: "failed"; reason: string };

  let result = $state<Result>({ state: "idle" });

  async function take() {
    if (result.state === "drawing") return;
    const main = document.querySelector("main");
    if (!(main instanceof HTMLElement)) return;
    result = { state: "drawing" };
    try {
      const bytes = await capture(main);
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
    disabled={result.state === "drawing"}
    onclick={take}
    >{result.state === "drawing"
      ? t("picture-drawing")
      : t("picture-take")}</button
  >
  {#if result.state === "saved" || result.state === "failed"}
    <span class="notice" role="status">
      {#if result.state === "saved"}
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
        aria-label={t("picture-dismiss")}
        onclick={() => (result = { state: "idle" })}>✕</button
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
</style>
