<script lang="ts">
  import { onMount, tick, untrack } from "svelte";
  import { LOCALE, t } from "../i18n/runtime";
  import { askChanged, askNames } from "../connections/desktopClient";
  import type { Names, Thing } from "../connections/types";
  import { openTheirCode } from "../othercode/navigation";
  import { theirName } from "../othercode/presentation";
  import NameCard from "./NameCard.svelte";
  import {
    asAlso,
    asCandidate,
    inside,
    namesByLine,
    nodeIdOf,
    sameDeclaration,
    step as stepName,
    wrapNames,
  } from "./names";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import RichText from "../shell/RichText.svelte";
  import WindowDialog from "../shell/WindowDialog.svelte";
  import { register } from "../shortcuts/registry";
  import CommitConnections from "../connections/CommitConnections.svelte";
  import { plainText } from "../shell/inline";
  import { heard, started } from "../shell/progress";
  import { readEntryCode } from "./desktopClient";
  import ChangedFile from "./ChangedFile.svelte";
  import { formatSize } from "../shell/sizes";
  import { onCodeColours } from "./codeColours";
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
    linesOf,
    pathParts,
    shortHash,
    showsLine,
    sides,
    writtenWords,
    type ViewMode,
  } from "./presentation";
  import type {
    DiffLine,
    EntryCodeReading,
    EntryRequest,
    FileChange,
  } from "./types";

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
  /**
   * The languages whose names the kit reads: C# exactly (0.79.0), Lua, Python and XML by name (0.81.0; TypeScript, Svelte and
   * Rust since 0.99.0), and a data file by the
   * rules of the game's table, where it has one (0.83.0); a data file no rule reads comes back with no names.
   */
  const NAMED_LANGUAGES = [
    "csharp",
    "lua",
    "python",
    "xml",
    "json",
    "typescript",
    "svelte",
    "rust",
  ];

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

  /** What the commit changed (0.78.0; docs/code-reading.md step 3), each with where it stood: shared with How it connects. */
  let things = $state<Thing[]>([]);
  /** The thing chosen: its lines are lit, and How it connects is centred on it, so the lines and the picture follow each other. */
  let thing = $state<string | null>(null);

  const chosenThing = $derived(things.find((t) => t.id === thing) ?? null);
  const fileThings = $derived(
    file ? things.filter((t) => t.at?.file === file.path) : [],
  );
  /** For each hunk of the file shown, the places of the chosen thing's lines. */
  const lit = $derived(
    file
      ? file.hunks.map((hunk) =>
          chosenThing?.at?.file === file.path
            ? linesOf(hunk, chosenThing.at)
            : new Set<number>(),
        )
      : [],
  );
  /** The file the chosen thing is in, for its lines beneath the connections picture. */
  const thingFile = $derived(
    chosenThing?.at
      ? (code?.files.find((f) => f.path === chosenThing.at!.file) ?? null)
      : null,
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
      const commit = next.found.code.commit?.hash;
      if (commit) void loadThings(commit);
    }
  }

  /** Reads what the commit changed, quietly: the lines show without it, and the buttons that light a thing come when it does. */
  async function loadThings(commit: string) {
    const asked = await askChanged(game, request.repository, commit);
    if (asked.state === "ready" && asked.answer.ok)
      things = asked.answer.data.things;
  }

  /** Lights a thing's lines, or puts them out when it is lit already, and brings its first line into view. */
  async function light(candidate: Thing) {
    thing = thing === candidate.id ? null : candidate.id;
    await tick();
    document
      .querySelector(".code-viewer-pane .line.lit")
      ?.scrollIntoView({ block: "center" });
  }

  // The chosen thing's file is coloured too, for its lines beneath the picture.
  $effect(() => {
    const shown = thingFile;
    if (mode === "connections" && shown) untrack(() => paint(shown));
  });

  /** Each C# file's names (0.79.0; docs/code-reading.md step 4): read by the kit's names reader in the background. */
  let names = $state<
    Record<
      string,
      | { state: "reading" }
      | { state: "ready"; names: Names }
      | { state: "failed"; reason: string }
    >
  >({});
  /** The name pressed, by its place in the file's reading, and whether its declaration's lines are open on its card. */
  let nameChosen = $state<number | null>(null);
  let snippetOpen = $state(false);
  /** Whether the lines of what a name also stands for in the game's data are open on its card (0.83.0). */
  let alsoOpen = $state(false);
  let pane = $state<HTMLElement | null>(null);
  /** For a name read by name (0.81.0): which of the things it may stand for the card shows. */
  let candidateChosen = $state(0);

  const fileNames = $derived(file ? names[file.path] : undefined);
  const ready = $derived(fileNames?.state === "ready" ? fileNames.names : null);
  const byLine = $derived(ready ? namesByLine(ready) : new Map());
  const chosenName = $derived(
    ready && nameChosen !== null ? (ready.names[nameChosen] ?? null) : null,
  );
  /** The names on the lines the mode shows, in reading order, for the arrow keys. */
  const shownNames = $derived.by(() => {
    const found: { index: number; row: number; column: number }[] = [];
    if (!file || !ready) return found;
    let row = 0;
    for (const hunk of file.hunks)
      for (const line of hunk.lines) {
        if (!showsLine(mode, line.kind)) continue;
        row++;
        if (line.kind === "-" || line.new == null) continue;
        for (const range of byLine.get(line.new) ?? [])
          found.push({ index: range.index, row, column: range.start });
      }
    return found;
  });
  const uses = $derived(
    ready && chosenName
      ? shownNames.filter((s) =>
          sameDeclaration(ready.names[s.index], chosenName),
        ).length
      : 0,
  );
  /** The name pressed, as the thing chosen from those it may stand for when it was read by name. */
  const taken = $derived(
    chosenName ? asCandidate(chosenName, candidateChosen) : null,
  );
  const snippet = $derived(
    ready && taken?.declared.file
      ? (ready.snippets[`${taken.declared.file}:${taken.declared.line}`] ??
          null)
      : null,
  );
  const connectable = $derived(
    taken && taken.declared.file && !inside(taken) ? nodeIdOf(taken) : null,
  );
  /** What a C# name also stands for in the game's data (0.83.0): a DefOf field's Def, with its lines when they were kept. */
  const also = $derived(chosenName ? asAlso(chosenName) : null);
  const alsoSnippet = $derived(
    ready && also?.declared.file
      ? (ready.snippets[`${also.declared.file}:${also.declared.line}`] ?? null)
      : null,
  );
  /**
   * Another author's name for it, for Read their code: only for a game's or another mod's code, never .NET's own. A class a data
   * file names that is not this repository's (0.83.0) is looked for by the name as written.
   */
  const theirs = $derived.by(() => {
    if (chosenName?.their) return chosenName.their;
    const assembly = chosenName?.declared.assembly ?? "";
    if (!chosenName || !assembly) return null;
    if (/^(System|mscorlib|netstandard|Microsoft\.)/.test(assembly))
      return null;
    const id = nodeIdOf(chosenName);
    return id ? theirName(id) : null;
  });

  /**
   * Reads a file's names, quietly and once: C# exactly, Lua, Python and XML by name (0.81.0). The code shows without them, and its
   * names become buttons when they come.
   */
  function readNames(next: FileChange) {
    if (
      !NAMED_LANGUAGES.includes(next.language) ||
      next.binary ||
      next.change === "removed" ||
      names[next.path]
    )
      return;
    names[next.path] = { state: "reading" };
    void askNames(
      game,
      request.repository,
      next.path,
      code?.commit?.hash ?? null,
    ).then((asked) => {
      names[next.path] =
        asked.state === "failed"
          ? { state: "failed", reason: asked.failure.detail }
          : asked.answer.ok
            ? { state: "ready", names: asked.answer.data }
            : { state: "failed", reason: asked.answer.refusal ?? "" };
    });
  }

  /** A line of the file shown, coloured, with its names marked when they have been read. */
  function lineHtml(
    shown: FileChange,
    hunkIndex: number,
    lineIndex: number,
    line: DiffLine,
  ): string {
    const html = painted[shown.path]?.[hunkIndex]?.[lineIndex] ?? "";
    if (!ready || line.kind === "-" || line.new == null) return html;
    return wrapNames(html, byLine.get(line.new) ?? [], (index) =>
      index === nameChosen
        ? "nm-chosen"
        : chosenName && sameDeclaration(ready.names[index], chosenName)
          ? "nm-same"
          : "",
    );
  }

  async function chooseName(index: number | null) {
    nameChosen = index;
    snippetOpen = false;
    alsoOpen = false;
    candidateChosen = 0;
    await tick();
    pane
      ?.querySelector(".nm-chosen")
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  function pressName(event: MouseEvent) {
    const mark = (event.target as Element | null)?.closest?.(".nm");
    if (mark instanceof HTMLElement && mark.dataset.name)
      void chooseName(Number(mark.dataset.name));
  }

  /** With a name chosen, the arrow keys move between names, Enter goes to its declaration and Escape lets it go. */
  function nameKeys(event: KeyboardEvent) {
    if (nameChosen === null) return;
    const moves: Record<string, "next" | "previous" | "up" | "down"> = {
      ArrowRight: "next",
      ArrowLeft: "previous",
      ArrowDown: "down",
      ArrowUp: "up",
    };
    if (moves[event.key]) {
      const next = stepName(shownNames, nameChosen, moves[event.key]);
      if (next !== null) void chooseName(next);
    } else if (event.key === "Enter" || event.key === "F12") goThere();
    else if (event.key === "Escape") void chooseName(null);
    else return;
    event.preventDefault();
    event.stopPropagation();
  }

  /** Goes to where the chosen name is declared: its line, when the lines shown hold it; otherwise its lines open on its card. */
  function goThere() {
    if (!ready || !taken?.declared.file) return;
    const declaration = shownNames.find((s) => {
      const candidate = ready.names[s.index];
      return candidate.here && sameDeclaration(candidate, taken);
    });
    if (declaration && declaration.index !== nameChosen)
      void chooseName(declaration.index);
    else snippetOpen = !snippetOpen;
  }

  /** Starts on the first name shown, from a button, so the names can be reached from the keyboard alone. */
  function stepThrough() {
    const first = shownNames[0]?.index ?? null;
    void chooseName(first);
    pane?.focus();
  }

  /** Shows a file at once as plain text, then colours it when its grammar has loaded, and reads its names. */
  function open(next: FileChange) {
    if (chosen !== next.path) {
      nameChosen = null;
      snippetOpen = false;
      alsoOpen = false;
    }
    chosen = next.path;
    paint(next);
    readNames(next);
  }

  function paint(next: FileChange) {
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

  /** Opens the file before or after the one shown, in the list's order. */
  function stepFile(step: 1 | -1) {
    if (!code) return;
    const files = byKind(code.files).flatMap((group) => group.files);
    if (files.length === 0) return;
    const index = Math.max(
      0,
      files.findIndex((f) => f.path === chosen),
    );
    mode = mode === "connections" ? "changes" : mode;
    open(files[(index + step + files.length) % files.length]);
  }

  onMount(() => {
    void load();
    // New code colours (0.77.0): every file is coloured again, the one shown at once.
    const stopColours = onCodeColours(() => {
      painted = {};
      if (file) open(file);
    });
    const stopKeys = register({
      scope: "code",
      inDialog: true,
      run: {
        "code.changes": () => (mode = "changes"),
        "code.new": () => (mode = "new"),
        "code.old": () => (mode = "old"),
        "code.connections": () => (mode = "connections"),
        "code.next-file": () => stepFile(1),
        "code.previous-file": () => stepFile(-1),
      },
    });
    return () => {
      stopColours();
      stopKeys();
    };
  });
</script>

<WindowDialog
  copyable
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
          aria-pressed={mode === "old"}
          onclick={() => (mode = "old")}>{t("code-mode-old")}</button
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
            bind:chosen={thing}
          />
          <!-- The chosen thing's lines in this commit, beneath its picture (0.78.0): the picture first, then the code it is. -->
          {#if thing && !chosenThing && things.length > 0}
            <p class="muted note">{t("code-thing-unchanged")}</p>
          {:else if chosenThing?.at && thingFile}
            {@const at = chosenThing.at}
            <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
            <section
              class="thing-lines"
              tabindex="0"
              aria-label={t("code-thing-lines-title", {
                name: chosenThing.name,
                file: at.file,
                from: at.line,
                to: at.end,
              })}
            >
              <h3 class="path">
                {t("code-thing-lines-title", {
                  name: chosenThing.name,
                  file: at.file,
                  from: at.line,
                  to: at.end,
                })}
              </h3>
              {#each thingFile.hunks as hunk, hunkIndex (hunkIndex)}
                {@const places = linesOf(hunk, at)}
                {#if places.size > 0}
                  <div class="lines code-colours">
                    {#each hunk.lines as line, lineIndex (lineIndex)}
                      {#if places.has(lineIndex)}
                        <div
                          class="line"
                          class:diff-added={line.kind === "+"}
                          class:diff-removed={line.kind === "-"}
                        >
                          <span class="number">{line.old ?? ""}</span>
                          <span class="number">{line.new ?? ""}</span>
                          <span class="mark diff-sign"
                            >{LINE_MARKS[line.kind]}</span
                          >
                          <!-- eslint-disable-next-line svelte/no-at-html-tags -- escaped by the highlighter, or by hunkHtml -->
                          <code
                            >{@html painted[thingFile.path]?.[hunkIndex]?.[
                              lineIndex
                            ] ?? ""}</code
                          >
                        </div>
                      {/if}
                    {/each}
                  </div>
                {/if}
              {/each}
            </section>
          {/if}
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
                        {#if candidate.binary && (candidate.sizeAfter ?? candidate.sizeBefore) != null}
                          <span class="muted"
                            >{formatSize(
                              (candidate.sizeAfter ?? candidate.sizeBefore)!,
                              LOCALE,
                            )}</span
                          >
                        {:else if !candidate.binary}
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
            <!-- The pane takes a press on a name, and the keys that move between names once one is chosen (0.79.0). -->
            <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
            <section
              class="pane code-viewer-pane"
              tabindex="0"
              aria-label={t("code-pane-label", { path: file.path })}
              bind:this={pane}
              onclick={pressName}
              onkeydown={nameKeys}
            >
              <h3 class="path">{file.path}</h3>
              {#if fileThings.length > 0}
                <!-- What the commit changed in this file (0.78.0): press one to light its lines, then see how it connects. -->
                <div class="things">
                  <div
                    class="toggles"
                    role="group"
                    aria-label={t("code-things-label")}
                  >
                    {#each fileThings as candidate (candidate.id)}
                      <button
                        type="button"
                        class="toggle"
                        aria-pressed={thing === candidate.id}
                        onclick={() => light(candidate)}
                        >{candidate.name}
                        <span class="muted small"
                          >{t("connections-lines-changed", {
                            count: candidate.linesChanged ?? 0,
                          })}</span
                        ></button
                      >
                    {/each}
                  </div>
                  {#if chosenThing && fileThings.includes(chosenThing) && chosenThing.inGraph !== false}
                    <button
                      type="button"
                      class="action"
                      onclick={() => (mode = "connections")}
                      >{t("code-thing-connections", {
                        name: chosenThing.name,
                      })}</button
                    >
                  {/if}
                </div>
              {/if}
              <!-- Names to follow (0.79.0): how far their reading is, or the card of the one pressed. -->
              {#if fileNames?.state === "reading"}
                <p class="muted note" role="status">
                  {t("code-names-reading")}
                </p>
              {:else if fileNames?.state === "failed"}
                <p class="muted note">
                  {t("code-names-failed", { reason: fileNames.reason })}
                </p>
              {:else if ready && chosenName && taken}
                <NameCard
                  name={taken}
                  pressed={chosenName}
                  chosenCandidate={candidateChosen}
                  onchoose={(index) => {
                    candidateChosen = index;
                    snippetOpen = false;
                  }}
                  {uses}
                  {snippet}
                  {snippetOpen}
                  canConnect={connectable !== null}
                  their={theirs}
                  {also}
                  {alsoSnippet}
                  {alsoOpen}
                  onalso={() => (alsoOpen = !alsoOpen)}
                  onalsoconnect={() => {
                    if (!also?.node) return;
                    thing = also.node;
                    mode = "connections";
                  }}
                  ongo={goThere}
                  onconnect={() => {
                    thing = connectable;
                    mode = "connections";
                  }}
                  ontheir={() => {
                    if (theirs) openTheirCode(game, request.repository, theirs);
                  }}
                  onletgo={() => {
                    void chooseName(null);
                    pane?.focus();
                  }}
                />
              {:else if ready && shownNames.length > 0}
                <div class="names-help">
                  <p class="muted small">{t("code-names-help")}</p>
                  <button type="button" class="action" onclick={stepThrough}
                    >{t("code-names-start")}</button
                  >
                </div>
              {/if}
              {#if file.oldPath && file.oldPath !== file.path}
                <p class="muted note">
                  {t("code-renamed-from", { path: file.oldPath })}
                </p>
              {/if}
              {#if file.binary}
                {#if file.media === undefined}
                  <p class="note">{t("code-binary")}</p>
                {:else}
                  <ChangedFile
                    {game}
                    repository={request.repository}
                    commit={code.commit?.hash ?? null}
                    {file}
                  />
                {/if}
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
                <div class="lines code-colours">
                  {#each hunk.lines as line, lineIndex (lineIndex)}
                    {#if showsLine(mode, line.kind)}
                      <div
                        class="line"
                        class:diff-added={line.kind === "+"}
                        class:diff-removed={line.kind === "-"}
                        class:lit={lit[hunkIndex]?.has(lineIndex)}
                      >
                        {#if mode !== "new"}
                          <span class="number">{line.old ?? ""}</span>
                        {/if}
                        {#if mode !== "old"}
                          <span class="number">{line.new ?? ""}</span>
                        {/if}
                        <span class="mark diff-sign"
                          >{LINE_MARKS[line.kind]}</span
                        >
                        <!-- eslint-disable-next-line svelte/no-at-html-tags -- escaped by the highlighter or hunkHtml; names marked by wrapNames -->
                        <code
                          >{@html lineHtml(
                            file,
                            hunkIndex,
                            lineIndex,
                            line,
                          )}</code
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

  /* What the commit changed in the file shown (0.78.0), and the lines of the one chosen: an accent bar at the line's end and its
     numbers in the accent, so a lit line never rests on colour alone over the added and removed tints. */
  .things {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin: 0 12px 8px;
  }

  .things .toggle {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .line.lit {
    box-shadow: inset -4px 0 0 var(--colour-accent);
  }

  /* Names to follow (0.79.0), marked inside the coloured HTML, so styled through :global. Outlines only, never a background, so
     the code keeps its contrast: a pressed name ringed in the accent, its other uses ringed dotted in the read-from-files colour. */
  .lines :global(.nm) {
    cursor: pointer;
    border-radius: 2px;
  }

  .lines :global(.nm:hover) {
    text-decoration: underline dotted;
  }

  .lines :global(.nm-same) {
    outline: 1px dotted var(--colour-observed);
    outline-offset: 1px;
  }

  .lines :global(.nm-chosen) {
    outline: 2px solid var(--colour-accent);
    outline-offset: 1px;
  }

  .names-help {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    margin: 0 12px 8px;
  }

  .names-help p {
    margin: 0;
    max-width: 80ch;
  }

  .line.lit .number {
    color: var(--colour-accent);
    font-weight: 700;
  }

  .thing-lines {
    margin-top: 12px;
    padding: 10px 0;
    overflow-x: auto;
    background: var(--colour-canvas);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
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

  /* A size container, so the card of a name pressed can keep to a share of the pane's own height (0.83.0). Its size comes
     from the grid it sits in, never from its content. */
  .pane {
    container-type: size;
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
  }

  /* Unchanged lines keep the changed lines' indent; a changed line's bar comes from app.css, which this must not outrank. */
  .line:not(.diff-removed):not(.diff-added) {
    border-inline-start: 6px solid transparent;
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
    text-align: center;
    user-select: none;
  }

  code {
    padding-inline-end: 16px;
    font: inherit;
    white-space: pre;
    tab-size: 4;
  }

  @media (max-width: 900px) {
    .body {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: minmax(120px, 34%) minmax(0, 1fr);
    }
  }
</style>
