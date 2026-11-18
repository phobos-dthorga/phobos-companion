<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import RichText from "../shell/RichText.svelte";
  import WindowDialog from "../shell/WindowDialog.svelte";
  import CommitConnections from "../connections/CommitConnections.svelte";
  import { plainText } from "../shell/inline";
  import { heard, started } from "../shell/progress";
  import { readEntryCode } from "./desktopClient";
  import { highlightLines } from "./highlightCore";
  import {
    byKind,
    CHANGE_WORDS,
    entryParts,
    firstFile,
    formatDay,
    hunkHtml,
    KIND_WORDS,
    LINE_MARKS,
    pathParts,
    shortHash,
    sides,
    writtenWords,
    type ViewMode,
  } from "./presentation";
  import type { EntryCodeReading, EntryRequest, FileChange } from "./types";

  /**
   * The code behind one changelog entry, over the whole window: the commit that wrote the entry, the files it changed with code
   * first, and one file's changes at a time, coloured by what the code is. Works for any game's repository.
   */
  let {
    game,
    request,
    onclose,
  }: { game: string; request: EntryRequest; onclose: () => void } = $props();

  /** The most changed lines the tools keep for one file (phobos-modkit `changes`). */
  const FILE_LINE_LIMIT = 600;

  let reading = $state<EntryCodeReading>({ state: "reading" });
  let progress = $state(started());
  let chosen = $state<string | null>(null);
  let mode = $state<ViewMode>("changes");
  /** Each opened file's hunks as HTML, one piece a line; plain until the colours arrive. */
  let painted = $state<Record<string, string[][]>>({});

  const parts = $derived(entryParts(request.entry));
  const code = $derived(
    reading.state === "ready" && reading.found.found
      ? reading.found.code
      : null,
  );
  const file = $derived(
    code?.files.find((candidate) => candidate.path === chosen) ?? null,
  );

  async function load() {
    reading = { state: "reading" };
    progress = started();
    const next = await readEntryCode(game, request, (message) => {
      progress = heard(progress, message);
    });
    reading = next;
    if (next.state === "ready" && next.found.found) {
      const first = firstFile(next.found.code.files);
      if (first) open(first);
    }
  }

  /** Shows a file at once as plain text, then colours it when its grammar has loaded. */
  function open(next: FileChange) {
    chosen = next.path;
    if (painted[next.path]) return;
    painted[next.path] = next.hunks.map((hunk) => hunkHtml(hunk, null, null));
    void Promise.all(
      next.hunks.map(async (hunk) => {
        const text = sides(hunk);
        const [oldLines, newLines] = await Promise.all([
          highlightLines(next.language, text.old),
          highlightLines(next.language, text.new),
        ]);
        return hunkHtml(hunk, oldLines, newLines);
      }),
    ).then((html) => {
      painted[next.path] = html;
    });
  }

  onMount(() => {
    void load();
  });
</script>

<WindowDialog
  kicker={t("code-kicker", {
    product: request.product,
    version: request.entry.version,
  })}
  title={plainText(parts.lead || parts.rest)}
  closeLabel={t("code-close")}
  {onclose}
>
  {#snippet below()}
    {#if parts.lead && parts.rest}
      <p class="entry-rest"><RichText text={parts.rest} /></p>
    {/if}
  {/snippet}

  {#if reading.state === "reading"}
    <ProgressBar {progress} fallback={t("code-reading")} />
  {:else if reading.state === "failed"}
    <FailurePanel failure={reading.failure} onretry={load} />
  {:else if !reading.found.found}
    <p class="refused">
      {t("code-refused", { reason: reading.found.refusal ?? "" })}
    </p>
  {:else if code}
    <div class="about">
      {#if code.commit}
        <p>
          {t("code-commit", {
            hash: shortHash(code.commit.hash),
            day: formatDay(code.commit.time),
          })}
          <span class="subject">{code.commit.subject}</span>
        </p>
      {:else}
        <p class="uncommitted">
          <span aria-hidden="true">◆</span>
          {t("code-uncommitted")}
        </p>
      {/if}
      {#if code.writtenWith.length > 0}
        <details class="shared">
          <summary>
            <span aria-hidden="true">◆</span>
            {t("code-written-with", { count: code.writtenWith.length })}
          </summary>
          <ul>
            {#each code.writtenWith as written, index (index)}
              <li>{writtenWords(written)}</li>
            {/each}
          </ul>
        </details>
      {/if}
      <p class="muted totals">
        {t("code-totals", {
          files: code.files.length,
          additions: code.additions,
          deletions: code.deletions,
        })}
        {#if code.filesLeftOut > 0}
          {t("code-left-out", { count: code.filesLeftOut })}
        {/if}
      </p>
    </div>

    {#if code.files.length === 0}
      <p class="lead">{t("code-no-files")}</p>
    {:else}
      <div class="toggles" role="group" aria-label={t("code-mode-label")}>
        <button
          type="button"
          class="toggle"
          aria-pressed={mode === "changes"}
          onclick={() => (mode = "changes")}>{t("code-mode-changes")}</button
        >
        <button
          type="button"
          class="toggle"
          aria-pressed={mode === "new"}
          onclick={() => (mode = "new")}>{t("code-mode-new")}</button
        >
        <button
          type="button"
          class="toggle"
          aria-pressed={mode === "connections"}
          onclick={() => (mode = "connections")}
          >{t("code-mode-connections")}</button
        >
      </div>

      {#if mode === "connections"}
        <div class="connections-pane">
          <CommitConnections
            {game}
            repository={request.repository}
            commit={code.commit?.hash ?? null}
          />
        </div>
      {:else}
        <div class="body">
          <nav class="files" aria-label={t("code-files-label")}>
            {#each byKind(code.files) as group (group.kind)}
              <h3>{t(KIND_WORDS[group.kind])}</h3>
              <ul>
                {#each group.files as candidate (candidate.path)}
                  {@const where = pathParts(candidate.path)}
                  <li>
                    <button
                      type="button"
                      class="file"
                      aria-pressed={chosen === candidate.path}
                      onclick={() => open(candidate)}
                    >
                      <span class="file-line">
                        <span class="file-name">{where.name}</span>
                        <span class="section-tag"
                          >{t(CHANGE_WORDS[candidate.change])}</span
                        >
                      </span>
                      <span class="file-facts">
                        <span class="file-folder muted">{where.folder}</span>
                        {#if !candidate.binary}
                          <span class="plus"
                            >{t("code-added-count", {
                              count: candidate.additions,
                            })}</span
                          >
                          <span class="minus"
                            >{t("code-removed-count", {
                              count: candidate.deletions,
                            })}</span
                          >
                        {/if}
                      </span>
                    </button>
                  </li>
                {/each}
              </ul>
            {/each}
          </nav>

          {#if file}
            <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
            <section
              class="pane"
              tabindex="0"
              aria-label={t("code-pane-label", { path: file.path })}
            >
              <h3 class="path">{file.path}</h3>
              {#if file.oldPath && file.oldPath !== file.path}
                <p class="muted note">
                  {t("code-renamed-from", { path: file.oldPath })}
                </p>
              {/if}
              {#if file.binary}
                <p class="note">{t("code-binary")}</p>
              {:else if file.hunks.length === 0}
                <p class="note">{t("code-no-lines")}</p>
              {/if}
              {#each file.hunks as hunk, hunkIndex (hunkIndex)}
                {@const first = hunk.lines[0]}
                <p class="hunk-head">
                  {t("code-hunk", {
                    line: first?.new ?? first?.old ?? 1,
                  })}
                  {#if hunk.header}
                    <span class="hunk-where">{hunk.header}</span>
                  {/if}
                </p>
                <div class="lines">
                  {#each hunk.lines as line, lineIndex (lineIndex)}
                    {#if mode === "changes" || line.kind !== "-"}
                      <div
                        class="line"
                        class:added={line.kind === "+"}
                        class:removed={line.kind === "-"}
                      >
                        {#if mode === "changes"}
                          <span class="number">{line.old ?? ""}</span>
                        {/if}
                        <span class="number">{line.new ?? ""}</span>
                        <span class="mark">{LINE_MARKS[line.kind]}</span>
                        <!-- eslint-disable-next-line svelte/no-at-html-tags -- escaped by the highlighter, or by hunkHtml -->
                        <code
                          >{@html painted[file.path]?.[hunkIndex]?.[
                            lineIndex
                          ] ?? ""}</code
                        >
                      </div>
                    {/if}
                  {/each}
                </div>
              {/each}
              {#if file.truncated}
                <p class="note">
                  {t("code-truncated", { lines: FILE_LINE_LIMIT })}
                </p>
              {/if}
            </section>
          {/if}
        </div>
      {/if}
    {/if}
  {/if}
</WindowDialog>

<style>
  .connections-pane {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }

  .entry-rest {
    max-width: 110ch;
    margin: 0;
    font-size: var(--type-small);
  }

  .about p {
    margin: 0 0 4px;
    font-size: var(--type-small);
  }

  .subject {
    font-weight: 600;
  }

  .uncommitted,
  .shared summary {
    color: var(--colour-accent);
  }

  .shared summary {
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: var(--control-min);
    font-size: var(--type-small);
    font-weight: 600;
    cursor: pointer;
  }

  .shared ul {
    margin: 0 0 8px;
    padding-inline-start: 22px;
    font-size: var(--type-small);
  }

  .refused {
    font-weight: 600;
    color: var(--colour-risk);
  }

  .body {
    flex: 1;
    display: grid;
    grid-template-columns: minmax(240px, 340px) minmax(0, 1fr);
    gap: 14px;
    min-height: 0;
  }

  .files {
    overflow-y: auto;
    padding-inline-end: 4px;
  }

  .files h3 {
    margin: 8px 0 4px;
    font-size: var(--type-caption);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--colour-text-muted);
  }

  .files ul {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .file {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0;
    width: 100%;
    min-height: var(--control-min);
    padding: 4px 10px;
    font: inherit;
    font-size: var(--type-small);
    text-align: start;
    color: var(--colour-text);
    background: transparent;
    border: 1px solid var(--colour-line);
    border-radius: 4px;
    cursor: pointer;
  }

  .file[aria-pressed="true"] {
    background: var(--colour-surface-soft);
    border: 2px solid var(--colour-accent);
  }

  .file-line {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }

  .file-name {
    font-weight: 600;
    overflow-wrap: anywhere;
  }

  .file-folder {
    font-size: var(--type-caption);
    overflow-wrap: anywhere;
  }

  .file-facts {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    font-size: var(--type-caption);
  }

  .section-tag {
    padding-inline: 6px;
    color: var(--colour-text-muted);
    border: 1px solid var(--colour-line);
    border-radius: 3px;
  }

  .plus {
    color: var(--colour-success);
  }

  .minus {
    color: var(--colour-risk);
  }

  .pane {
    overflow: auto;
    min-width: 0;
    padding: 10px 0;
    background: var(--colour-canvas);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .path {
    margin: 0 12px 6px;
    font-family: var(--font-mono, ui-monospace, Consolas, monospace);
    font-size: var(--type-small);
    font-weight: 600;
    overflow-wrap: anywhere;
  }

  .note {
    margin: 6px 12px;
    font-size: var(--type-small);
  }

  .hunk-head {
    position: sticky;
    inset-inline-start: 0;
    margin: 10px 0 2px;
    padding: 4px 12px;
    font-size: var(--type-caption);
    color: var(--colour-text-muted);
    background: var(--colour-surface-raised);
  }

  .hunk-where {
    margin-inline-start: 10px;
    font-family: var(--font-mono, ui-monospace, Consolas, monospace);
    color: var(--colour-text);
  }

  .lines {
    width: max-content;
    min-width: 100%;
    font-family: var(--font-mono, ui-monospace, Consolas, monospace);
    font-size: var(--type-caption);
    line-height: 1.55;
  }

  .line {
    display: flex;
    border-inline-start: 4px solid transparent;
  }

  .line.added {
    border-inline-start-color: var(--colour-success);
    background: var(--colour-surface);
  }

  .line.removed {
    border-inline-start-color: var(--colour-risk);
    background: var(--colour-surface);
  }

  .number {
    flex: none;
    width: 6ch;
    padding-inline-end: 1ch;
    text-align: end;
    color: var(--colour-text-muted);
    user-select: none;
  }

  .mark {
    flex: none;
    width: 2ch;
    font-weight: 600;
    text-align: center;
    user-select: none;
  }

  .added .mark {
    color: var(--colour-success);
  }

  .removed .mark {
    color: var(--colour-risk);
  }

  code {
    padding-inline-end: 16px;
    font: inherit;
    white-space: pre;
    tab-size: 4;
  }

  /* What each piece of code is, coloured from the theme's roles. The grammar names the piece; the theme owns the colour. */
  code :global(.hljs-comment),
  code :global(.hljs-quote),
  code :global(.hljs-meta) {
    font-style: italic;
    color: var(--colour-text-muted);
  }

  code :global(.hljs-keyword),
  code :global(.hljs-selector-tag),
  code :global(.hljs-doctag),
  code :global(.hljs-section) {
    color: var(--colour-comparison);
  }

  code :global(.hljs-string),
  code :global(.hljs-regexp) {
    color: var(--colour-success);
  }

  /* Amber for values and attribute names. The "something went wrong" colour is never used for code: nothing here is a fault. */
  code :global(.hljs-number),
  code :global(.hljs-literal),
  code :global(.hljs-symbol),
  code :global(.hljs-bullet),
  code :global(.hljs-attr),
  code :global(.hljs-attribute) {
    color: var(--colour-accent);
  }

  code :global(.hljs-type),
  code :global(.hljs-built_in),
  code :global(.hljs-title),
  code :global(.hljs-name),
  code :global(.hljs-tag) {
    color: var(--colour-observed);
  }

  code :global(.hljs-strong) {
    font-weight: 600;
  }

  code :global(.hljs-emphasis) {
    font-style: italic;
  }

  @media (max-width: 900px) {
    .body {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: minmax(120px, 34%) minmax(0, 1fr);
    }
  }
</style>
