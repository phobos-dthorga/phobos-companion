<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import { register } from "../shortcuts/registry";
  import { capture, hideHome } from "../pictures/capture";
  import WindowDialog from "../shell/WindowDialog.svelte";
  import { openReport, previewReport, readHome } from "./desktopClient";

  /**
   * Something's off, for someone without agent sessions (0.100.0; the release audit's C5; the owner's choices by card, 25 Nov
   * 2026). The same key and button as the screen note draw the page (their home folder's name hidden first), then ask for words;
   * the host builds the GitHub issue, shown here whole, and on Open on GitHub saves the picture in their Pictures folder and opens
   * GitHub's own new-issue page, filled in. They read it there and press Submit, or don't: the Companion sends nothing.
   */
  let { page }: { page: string } = $props();

  type State =
    | { state: "idle" }
    | { state: "drawing" }
    | {
        state: "writing" | "opening";
        bytes: Uint8Array;
        preview: string;
        shown: { title: string; body: string } | null;
        problem: string | null;
      }
    | { state: "opened"; picture: string }
    | { state: "failed"; reason: string };

  let report = $state<State>({ state: "idle" });
  let words = $state("");

  function letGo() {
    if (report.state === "writing" || report.state === "opening")
      URL.revokeObjectURL(report.preview);
  }

  async function begin() {
    if (report.state === "drawing" || report.state === "writing") return;
    const main = document.querySelector("main");
    if (!(main instanceof HTMLElement)) return;
    report = { state: "drawing" };
    const home = await readHome();
    const putBack = hideHome(main, home);
    try {
      const bytes = await capture(main);
      const preview = URL.createObjectURL(
        new Blob([new Uint8Array(bytes)], { type: "image/png" }),
      );
      words = "";
      report = { state: "writing", bytes, preview, shown: null, problem: null };
    } catch (problem) {
      report = { state: "failed", reason: String(problem) };
    } finally {
      putBack();
    }
  }

  async function show() {
    if (report.state !== "writing") return;
    const answer = await previewReport(words, page);
    report =
      answer.state === "ready"
        ? { ...report, shown: answer.report, problem: null }
        : { ...report, shown: null, problem: answer.failure.detail };
  }

  async function open() {
    if (report.state !== "writing" || !report.shown) return;
    const taken = report;
    report = { ...taken, state: "opening" };
    const answer = await openReport(taken.bytes, words, page);
    URL.revokeObjectURL(taken.preview);
    report =
      answer.state === "ready"
        ? { state: "opened", picture: answer.picture }
        : { state: "failed", reason: answer.failure.detail };
  }

  function cancel() {
    letGo();
    report = { state: "idle" };
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

<span class="report" data-no-picture>
  <button
    type="button"
    class="action"
    disabled={report.state === "drawing"}
    onclick={begin}
    >{report.state === "drawing" ? t("note-drawing") : t("note-take")}</button
  >
  {#if report.state === "opened" || report.state === "failed"}
    <span class="notice" class:failed={report.state === "failed"} role="status">
      <span
        >{report.state === "opened"
          ? t("report-github-opened", { picture: report.picture })
          : t("report-github-failed", { reason: report.reason })}</span
      >
      <button
        type="button"
        class="action"
        aria-label={t("note-dismiss")}
        onclick={() => (report = { state: "idle" })}>✕</button
      >
    </span>
  {/if}
</span>

{#if report.state === "writing" || report.state === "opening"}
  <WindowDialog
    kicker={t("report-kicker")}
    title={t("report-title", { page })}
    closeLabel={t("note-cancel")}
    width={760}
    height="auto"
    onclose={cancel}
  >
    <div class="body">
      <p class="small">{t("report-lead")}</p>
      <img
        class="preview"
        src={report.preview}
        alt={t("note-preview", { page })}
      />
      <label for="report-words">{t("report-words-label")}</label>
      <!-- svelte-ignore a11y_autofocus -->
      <textarea
        id="report-words"
        rows="4"
        maxlength="2000"
        bind:value={words}
        oninput={() => {
          if (report.state === "writing") report = { ...report, shown: null };
        }}
        autofocus></textarea>
      <div class="buttons">
        <button type="button" class="action" onclick={() => void show()}
          >{t("report-show")}</button
        >
        <button
          type="button"
          class="action"
          disabled={!report.shown || report.state === "opening"}
          onclick={() => void open()}
          >{report.state === "opening"
            ? t("report-opening")
            : t("report-to-github")}</button
        >
      </div>
      {#if report.problem}
        <p class="small refused-line" role="status">{report.problem}</p>
      {:else if report.shown}
        <section class="shown" aria-label={t("report-shown")}>
          <p><strong>{report.shown.title}</strong></p>
          <pre>{report.shown.body}</pre>
          <p class="small muted">{t("report-picture-how")}</p>
        </section>
      {/if}
    </div>
  </WindowDialog>
{/if}

<style>
  .report {
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
  }

  .preview {
    max-height: 220px;
    object-fit: contain;
    border: 1px solid var(--colour-line);
  }

  textarea {
    font: inherit;
    color: var(--colour-text);
    background: var(--colour-canvas);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
    padding: 6px 8px;
  }

  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .shown {
    padding: 8px 12px;
    background: var(--colour-surface-raised);
    border-inline-start: 3px solid var(--colour-accent);
  }

  .shown pre {
    margin: 4px 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font-size: var(--type-small);
  }

  .refused-line {
    padding-inline-start: 8px;
    border-inline-start: 3px solid var(--colour-risk);
  }
</style>
