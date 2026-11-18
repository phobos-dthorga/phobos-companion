<script module lang="ts">
  let made = 0;
</script>

<script lang="ts">
  import { onMount, type Snippet } from "svelte";
  import { t } from "../i18n/runtime";
  import { copyAddress } from "../navigation/navigation.svelte";

  /**
   * A dialog over the whole window, opened as soon as it is shown: a kicker, a title that names the dialog, a Close button, and
   * whatever it holds. The code viewer and the changelog as it stood are both one (docs/shared-code-audit.md, W4).
   */
  let {
    kicker,
    title,
    closeLabel,
    width = 1500,
    copyable = false,
    onclose,
    below,
    children,
  }: {
    kicker: string;
    title: string;
    closeLabel: string;
    /** Its widest, in pixels; never wider than the window. */
    width?: number;
    /** Offers "Copy address" for the place it shows (docs/cross-links.md, N3). */
    copyable?: boolean;
    onclose: () => void;
    /** Anything under the title, inside the header. */
    below?: Snippet;
    children: Snippet;
  } = $props();

  const titleId = `window-dialog-title-${++made}`;
  let dialog: HTMLDialogElement;

  let copied = $state<"yes" | "no" | null>(null);

  async function copy() {
    copied = (await copyAddress()) ? "yes" : "no";
  }

  onMount(() => dialog.showModal());
</script>

<dialog
  bind:this={dialog}
  class="window"
  style:--window-width={`${width}px`}
  aria-labelledby={titleId}
  {onclose}
>
  <header class="head">
    <div class="head-words">
      <div class="eyebrow accent">{kicker}</div>
      <h2 id={titleId}>{title}</h2>
      {@render below?.()}
    </div>
    {#if copyable}
      <span class="copy">
        <button type="button" class="action" onclick={copy}
          >{t("trail-copy")}</button
        >
        {#if copied}
          <span class="muted small" role="status"
            >{copied === "yes"
              ? t("trail-copied-short")
              : t("trail-copy-failed")}</span
          >
        {/if}
      </span>
    {/if}
    <button type="button" class="action close" onclick={() => dialog.close()}>
      {closeLabel}
    </button>
  </header>
  {@render children()}
</dialog>

<style>
  .window {
    width: min(var(--window-width), 96vw);
    height: 92vh;
    max-width: none;
    max-height: none;
    padding: 20px 24px;
    color: var(--colour-text);
    background: var(--colour-surface);
    border: 2px solid var(--colour-accent);
    border-radius: 6px;
  }

  .window[open] {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .window::backdrop {
    background: rgb(0 0 0 / 70%);
  }

  .head {
    display: flex;
    align-items: flex-start;
    gap: 16px;
  }

  .head-words {
    flex: 1;
    min-width: 0;
  }

  h2 {
    margin: 2px 0 4px;
    font-family: var(--font-display);
    font-size: 1.5rem;
    font-weight: 600;
    line-height: 1.25;
  }

  .copy {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
    flex: none;
  }

  .close {
    flex: none;
  }
</style>
