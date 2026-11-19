<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import { register } from "../shortcuts/registry";
  import { capture } from "../pictures/capture";
  import WindowDialog from "../shell/WindowDialog.svelte";
  import { addressOf } from "../navigation/place";
  import { here } from "../navigation/navigation.svelte";
  import { noteStamp } from "./notes";
  import { noteSaves } from "./saves.svelte";
  import { saveScreenNote } from "./desktopClient";

  /**
   * Something's off (0.22.0; docs/later.md, item 1): one key or this button draws the page as it is, then asks for a few words (or
   * none), and saves both, with the page's address, where agent sessions read them at the start. The picture is taken before the
   * dialog opens, so it shows the page, not the dialog.
   */
  let { game, page }: { game: string; page: string } = $props();

  type State =
    | { state: "idle" }
    | { state: "drawing" }
    | {
        state: "writing" | "sending";
        bytes: Uint8Array;
        preview: string;
        address: string;
        when: Date;
      }
    | { state: "saved"; id: string }
    | { state: "failed"; reason: string };

  let note = $state<State>({ state: "idle" });
  let words = $state("");

  function letGo() {
    if (note.state === "writing" || note.state === "sending")
      URL.revokeObjectURL(note.preview);
  }

  async function begin() {
    if (note.state === "drawing" || note.state === "writing") return;
    if (note.state === "sending") return;
    const main = document.querySelector("main");
    if (!(main instanceof HTMLElement)) return;
    const address = addressOf(here());
    const when = new Date();
    note = { state: "drawing" };
    try {
      const bytes = await capture(main);
      const preview = URL.createObjectURL(
        new Blob([new Uint8Array(bytes)], { type: "image/png" }),
      );
      words = "";
      note = { state: "writing", bytes, preview, address, when };
    } catch (problem) {
      note = { state: "failed", reason: String(problem) };
    }
  }

  async function send() {
    if (note.state !== "writing") return;
    const taken = note;
    note = { ...taken, state: "sending" };
    const saved = await saveScreenNote(taken.bytes, {
      stamp: noteStamp(taken.when),
      game,
      page,
      address: taken.address,
      words: words.trim(),
      width: window.innerWidth,
      height: window.innerHeight,
    });
    URL.revokeObjectURL(taken.preview);
    if (saved.state === "ready") {
      noteSaves.count += 1;
      note = { state: "saved", id: saved.id };
    } else {
      note = { state: "failed", reason: saved.failure.detail };
    }
  }

  function cancel() {
    if (note.state !== "writing") return;
    letGo();
    note = { state: "idle" };
  }

  function wordsKey(event: KeyboardEvent) {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      void send();
    }
  }

  onMount(() =>
    register({
      scope: "everywhere",
      inDialog: false,
      run: { "screen-note": () => void begin() },
    }),
  );
  onDestroy(letGo);
</script>

<span class="screen-note" data-no-picture>
  <button
    type="button"
    class="action"
    disabled={note.state === "drawing"}
    onclick={begin}
    >{note.state === "drawing" ? t("note-drawing") : t("note-take")}</button
  >
  {#if note.state === "saved" || note.state === "failed"}
    <span class="notice" class:failed={note.state === "failed"} role="status">
      <span
        >{note.state === "saved"
          ? t("note-saved", { id: note.id })
          : t("note-failed", { reason: note.reason })}</span
      >
      <button
        type="button"
        class="action"
        aria-label={t("note-dismiss")}
        onclick={() => (note = { state: "idle" })}>✕</button
      >
    </span>
  {/if}
</span>

{#if note.state === "writing" || note.state === "sending"}
  <WindowDialog
    kicker={t("note-kicker")}
    title={t("note-title", { page })}
    closeLabel={t("note-cancel")}
    width={720}
    height="auto"
    onclose={cancel}
  >
    <div class="body">
      <img
        class="preview"
        src={note.preview}
        alt={t("note-preview", { page })}
      />
      <label for="screen-note-words">{t("note-words-label")}</label>
      <!-- svelte-ignore a11y_autofocus -->
      <textarea
        id="screen-note-words"
        rows="4"
        maxlength="4000"
        bind:value={words}
        onkeydown={wordsKey}
        autofocus
        aria-describedby="screen-note-how"></textarea>
      <p id="screen-note-how" class="muted small">{t("note-how")}</p>
      <div class="buttons">
        <button
          type="button"
          class="action"
          disabled={note.state === "sending"}
          onclick={send}
          >{note.state === "sending"
            ? t("note-sending")
            : t("note-save")}</button
        >
      </div>
    </div>
  </WindowDialog>
{/if}

<style>
  .screen-note {
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

  .notice.failed {
    border-color: var(--colour-risk);
  }

  .body {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 0;
  }

  .preview {
    display: block;
    width: 100%;
    max-height: 40vh;
    object-fit: contain;
    object-position: top;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  label {
    font-weight: 600;
  }

  textarea {
    width: 100%;
    padding: 8px 10px;
    font: inherit;
    color: var(--colour-text);
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
    resize: vertical;
  }

  .buttons {
    display: flex;
    justify-content: flex-end;
  }
</style>
