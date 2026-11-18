<script lang="ts">
  import { untrack } from "svelte";
  import { t } from "../i18n/runtime";
  import type { GameHome } from "../home/types";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import { heard, started } from "../shell/progress";
  import { reveal } from "../shell/reveal";
  import { go, here, setFocus } from "../navigation/navigation.svelte";
  import { askConnections } from "../connections/desktopClient";
  import type { Found } from "../connections/types";
  import { readLog } from "./desktopClient";
  import {
    levelRank,
    matchFrame,
    pointsAt,
    searchName,
    shownSignatures,
  } from "./presentation";
  import type { Frame, LogPageReading, Signature } from "./types";

  /**
   * The Logs page (cross-links L1): the game's log as its tools group it, compared with the run before, and each message's stack
   * leading into the code. A frame found in one of the game's repositories opens on the Code map, where its history (L2) shows
   * the changes that touched it, and from there the Mods page's backup from before the change. Any game whose tools mark a log
   * reader gets this page; the rest are told so in words.
   */
  let { game }: { game: GameHome } = $props();

  let reading = $state<LogPageReading>({ state: "reading" });
  let progress = $state(started());
  let hidden = $state(new Set<string>());
  let opened = $state(new Set<string>());
  /** Each frame's search, by signature and place in its stack. */
  let finding = $state<
    Record<string, "searching" | "outside" | { failed: string }>
  >({});

  async function read() {
    reading = { state: "reading" };
    progress = started();
    reading = await readLog(game.id, (message) => {
      progress = heard(progress, message);
    });
  }

  void read();

  const data = $derived(
    reading.state === "ready" && reading.reading.available
      ? reading.reading.data
      : null,
  );
  const levels = $derived(
    data
      ? Object.entries(data.levels).sort(
          ([a], [b]) => levelRank(a) - levelRank(b),
        )
      : [],
  );
  const listedLevels = $derived(
    new Set((data?.groups ?? []).map((group) => group.level)),
  );
  const shown = $derived(
    data
      ? shownSignatures(
          data.groups,
          new Set([...listedLevels].filter((level) => !hidden.has(level))),
        )
      : [],
  );
  const listed = $derived(new Set((data?.groups ?? []).map((g) => g.id)));

  function toggleLevel(level: string) {
    const next = new Set(hidden);
    if (next.has(level)) next.delete(level);
    else next.add(level);
    hidden = next;
  }

  function toggleSignature(id: string, open: boolean) {
    const next = new Set(opened);
    if (open) next.add(id);
    else next.delete(id);
    opened = next;
    if (open && here().focus.signature !== id) setFocus({ signature: id });
  }

  function jump(id: string) {
    toggleSignature(id, true);
    void reveal(`log-${id}`);
  }

  // A signature the place names is opened and brought into view once the log is read.
  $effect(() => {
    const id = here().focus.signature;
    if (id && data)
      untrack(() => {
        if (!opened.has(id)) opened = new Set([...opened, id]);
        void reveal(`log-${id}`);
      });
  });

  /** Looks the frame's method up in each of the game's repositories; opens the first match on the Code map. */
  async function findCode(key: string, frame: Frame) {
    finding = { ...finding, [key]: "searching" };
    let outside: { repository: string; id: string } | null = null;
    for (const repository of game.repositories) {
      const asked = await askConnections<Found>(
        game.id,
        repository,
        "find",
        searchName(frame.method),
      );
      if (asked.state === "failed") {
        finding = { ...finding, [key]: { failed: asked.failure.detail } };
        return;
      }
      if (!asked.answer.ok) continue;
      const match = matchFrame(frame.method, asked.answer.data.things);
      if (match && !match.external) {
        openOnMap(repository, match.id);
        return;
      }
      if (match && !outside) outside = { repository, id: match.id };
    }
    if (outside) {
      openOnMap(outside.repository, outside.id);
      return;
    }
    finding = { ...finding, [key]: "outside" };
  }

  function openOnMap(repository: string, node: string) {
    const rest = { ...finding };
    for (const key of Object.keys(rest))
      if (rest[key] === "searching") delete rest[key];
    finding = rest;
    go({
      page: "codemap",
      game: game.id,
      focus: { repository, node },
      dialog: null,
    });
  }

  function where(frame: Frame): string {
    if (frame.file) {
      const name = frame.file.split(/[\\/]/).pop() ?? frame.file;
      return frame.line ? `${name}:${frame.line}` : name;
    }
    return frame.assembly;
  }

  function header(key: string): string | null {
    return data?.log.header[key] ?? null;
  }

  function clueWords(signature: Signature): string {
    return pointsAt(signature)
      .map((clue) => clue.mod || clue.value)
      .join(" · ");
  }
</script>

<div class="eyebrow accent">{t("logs-kicker")}</div>
<h1>{t("logs-title", { game: game.name })}</h1>
<p class="lead">{t("logs-lead")}</p>

{#if reading.state === "reading"}
  <ProgressBar {progress} fallback={t("logs-reading")} />
{:else if reading.state === "failed"}
  <FailurePanel failure={reading.failure} onretry={read} />
{:else if !reading.reading.available}
  <p class="lead">{t("logs-none", { game: game.name })}</p>
{:else if data}
  <div class="summary">
    <p>
      <strong>{data.log.name}</strong>
      · {t("logs-size", {
        lines: data.log.lines,
        messages: data.log.messages,
      })}
      {#if header("version")}
        · {t("logs-version", { version: header("version") ?? "" })}{/if}
      {#if header("started")}
        · {t("logs-started", { when: header("started") ?? "" })}{/if}
    </p>
    <button type="button" class="action" onclick={read}
      >{t("logs-read-again")}</button
    >
  </div>

  {#if data.notices.length > 0 || data.limits.length > 0}
    <section class="panel" aria-label={t("logs-notices-title")}>
      <h2>{t("logs-notices-title")}</h2>
      <ul class="notices">
        {#each data.notices as notice, index (index)}
          <li>{notice.text}</li>
        {/each}
        {#each data.limits as limit, index (index)}
          <li class="muted">{limit}</li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if data.comparison && data.comparison.new.length > 0}
    <section class="panel" aria-label={t("logs-new-title")}>
      <h2>
        {t("logs-new-title")}
        <span class="muted small"
          >{t("logs-new-count", {
            count: data.comparison.counts?.new ?? data.comparison.new.length,
            previous: data.comparison.previous,
          })}</span
        >
      </h2>
      <ul class="changes">
        {#each data.comparison.new as change (change.id)}
          <li>
            <span class="level level-{change.level.toLowerCase()}"
              >{change.level}</span
            >
            <span class="count">{change.current}×</span>
            {#if listed.has(change.id)}
              <button type="button" class="link" onclick={() => jump(change.id)}
                >{change.headline}</button
              >
            {:else}
              <span>{change.headline}</span>
            {/if}
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  <div class="toggles" role="group" aria-label={t("logs-levels-label")}>
    {#each levels as [level, counts] (level)}
      {#if listedLevels.has(level)}
        <button
          type="button"
          class="toggle"
          aria-pressed={!hidden.has(level)}
          onclick={() => toggleLevel(level)}
        >
          {t("logs-level", {
            level,
            messages: counts.messages,
            signatures: counts.signatures,
          })}
        </button>
      {/if}
    {/each}
  </div>
  {#if data.brief && data.brief.of > data.brief.shown}
    <p class="muted small">
      {t("logs-brief", { shown: data.brief.shown, of: data.brief.of })}
    </p>
  {/if}

  <ol class="signatures">
    {#each shown as signature (signature.id)}
      <li>
        <details
          id={`log-${signature.id}`}
          open={opened.has(signature.id)}
          ontoggle={(event) =>
            toggleSignature(
              signature.id,
              (event.currentTarget as HTMLDetailsElement).open,
            )}
        >
          <summary>
            <span class="level level-{signature.level.toLowerCase()}"
              >{signature.level}</span
            >
            <span class="count">{signature.count}×</span>
            <span class="headline">{signature.signature}</span>
          </summary>
          <div class="detail">
            <p class="small muted">
              {t("logs-when", {
                first: signature.first.time || String(signature.first.line),
                last: signature.last.time || String(signature.last.line),
              })}
            </p>
            {#if signature.evidence.length > 0}
              <p class="small">
                <strong>{t("logs-points-at")}</strong>
                {clueWords(signature)}
              </p>
            {/if}
            {#if (signature.frames ?? []).length > 0}
              <h3>{t("logs-stack-title")}</h3>
              <ol class="frames">
                {#each signature.frames ?? [] as frame, index (index)}
                  {@const key = `${signature.id}/${index}`}
                  {@const state = finding[key]}
                  <li>
                    <code class="method">{frame.method}</code>
                    {#if where(frame)}<span class="muted small"
                        >{where(frame)}</span
                      >{/if}
                    <button
                      type="button"
                      class="action"
                      disabled={state === "searching"}
                      onclick={() => findCode(key, frame)}
                    >
                      {state === "searching"
                        ? t("logs-finding")
                        : t("logs-find-code")}
                    </button>
                    {#if state === "outside"}
                      <p class="small muted" role="status">
                        {t("logs-outside")}
                      </p>
                    {:else if state && typeof state === "object"}
                      <p class="small" role="status">
                        {t("logs-find-failed", { reason: state.failed })}
                      </p>
                    {/if}
                  </li>
                {/each}
              </ol>
            {/if}
            <details class="as-written">
              <summary>{t("logs-as-written")}</summary>
              <pre>{[
                  signature.example.headline,
                  ...signature.example.body,
                ].join("\n")}</pre>
              {#if signature.example.bodyLines > signature.example.body.length}
                <p class="small muted">
                  {t("logs-cut", {
                    shown: signature.example.body.length,
                    of: signature.example.bodyLines,
                  })}
                </p>
              {/if}
            </details>
          </div>
        </details>
      </li>
    {/each}
  </ol>
  <p class="small muted">
    {t("logs-command", { command: reading.reading.command_line })}
  </p>
{/if}

<style>
  .summary {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 16px;
    margin-block-end: 12px;
    overflow-wrap: anywhere;
  }

  .summary p {
    margin: 0;
  }

  .panel {
    margin-block: 12px;
    padding: 12px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
    overflow-wrap: anywhere;
  }

  .panel h2 {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 10px;
    margin: 0 0 8px;
    font-size: var(--type-body);
  }

  .notices,
  .changes {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 0;
    padding-inline-start: 18px;
  }

  .changes {
    padding: 0;
    list-style: none;
  }

  .changes li {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 10px;
  }

  .link {
    min-height: var(--control-min);
    padding: 0;
    font: inherit;
    color: var(--colour-accent);
    text-align: start;
    text-decoration: underline;
    background: none;
    border: none;
    cursor: pointer;
  }

  .toggles {
    margin-block: 12px 6px;
  }

  .signatures {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 8px 0 12px;
    padding: 0;
    list-style: none;
  }

  .signatures > li > details {
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
    overflow-wrap: anywhere;
  }

  .signatures > li > details > summary {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 10px;
    min-height: var(--control-min);
    padding: 8px 12px;
    cursor: pointer;
  }

  .headline {
    flex: 1 1 18em;
  }

  .level {
    font-size: var(--type-small);
    font-weight: 600;
  }

  .level-fatal,
  .level-error {
    color: var(--colour-risk);
  }

  .level-warn {
    color: var(--colour-comparison);
  }

  .count {
    font-variant-numeric: tabular-nums;
    font-weight: 600;
  }

  .detail {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 0 12px 12px;
  }

  .detail p,
  .detail h3 {
    margin: 0;
  }

  .detail h3 {
    font-size: var(--type-small);
  }

  .frames {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 0;
    padding-inline-start: 22px;
  }

  .frames li {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 10px;
  }

  .frames li p {
    flex-basis: 100%;
  }

  .method {
    overflow-wrap: anywhere;
  }

  .as-written summary {
    min-height: var(--control-min);
    padding-block: 8px;
    cursor: pointer;
  }

  .as-written pre {
    max-height: 24em;
    margin: 0;
    padding: 8px;
    overflow: auto;
    font-size: var(--type-small);
    white-space: pre-wrap;
    background: var(--colour-surface);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }
</style>
