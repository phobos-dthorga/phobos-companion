<script lang="ts">
  import { onMount } from "svelte";
  import type { GameHome } from "../home/types";
  import { t } from "../i18n/runtime";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import { makeMove, readInstalls } from "./desktopClient";
  import {
    blockedBy,
    entryParts,
    FIRST_ENTRIES,
    formatSize,
    formatWhen,
    groupByVersion,
    MOVE_WORDS,
    shortCommit,
    STATE_WORDS,
  } from "./presentation";
  import type {
    Backup,
    Delta,
    Entry,
    InstallsReading,
    ModInstall,
    Move,
  } from "./types";

  let { game }: { game: GameHome } = $props();

  type Asking = {
    repository: string;
    mod: ModInstall;
    move: Move;
    backup: Backup | null;
  };

  /** How long the page waits before reading again when the window comes back into focus. */
  const FOCUS_READ_AFTER_MS = 15_000;

  let reading = $state<InstallsReading>({ state: "reading" });
  let readAt = 0;
  let asking = $state<Asking | null>(null);
  let busy = $state<string | null>(null);
  let said = $state("");
  let output = $state<string[]>([]);
  let showAll = $state<Record<string, boolean>>({});

  const running = $derived(
    reading.state === "ready"
      ? reading.repositories.flatMap((r) => r.status.gameRunning)
      : [],
  );

  /** Reads again. A quiet read keeps what is on screen until the answer arrives. */
  async function load(quiet = false) {
    if (!quiet) reading = { state: "reading" };
    const next = await readInstalls(game.id);
    if (!quiet || next.state === "ready") reading = next;
    readAt = Date.now();
  }

  /** Coming back to the window reads again, so a change made elsewhere shows without a button. */
  function onFocus() {
    if (
      busy === null &&
      asking === null &&
      Date.now() - readAt > FOCUS_READ_AFTER_MS
    ) {
      void load(true);
    }
  }

  function ask(
    repository: string,
    mod: ModInstall,
    move: Move,
    backup: Backup | null = null,
  ) {
    asking = { repository, mod, move, backup };
    said = "";
    output = [];
  }

  function isAsking(mod: ModInstall, move: Move, backup: Backup | null = null) {
    return (
      asking !== null &&
      asking.mod.mod === mod.mod &&
      asking.move === move &&
      (asking.backup?.backup ?? null) === (backup?.backup ?? null)
    );
  }

  async function confirm() {
    if (asking === null) return;
    const { repository, mod, move, backup } = asking;
    busy = `${mod.mod}/${move}`;
    said = t(MOVE_WORDS[move].working, { name: mod.name });
    const answer = await makeMove(
      game.id,
      repository,
      move,
      mod.mod,
      backup?.backup ?? null,
    );
    busy = null;
    asking = null;
    if (answer.state === "failed") {
      said = t("mods-move-failed", { name: mod.name });
      reading = { state: "failed", failure: answer.failure };
      return;
    }
    const result = answer.result;
    said = result.ok
      ? result.title
      : t("mods-move-refused", {
          name: mod.name,
          reason: result.refusal ?? result.title,
        });
    output = result.data.output ?? [];
    await load(true);
  }

  /** Puts the keyboard on the confirmation when it opens, so it is read out and answered first. */
  function takeFocus(node: HTMLElement) {
    node.focus();
  }

  function cardKey(repository: string, mod: ModInstall) {
    return `${repository}/${mod.mod}`;
  }

  onMount(() => {
    void load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  });
</script>

{#snippet entryList(
  list: Entry[],
  summaries: Record<string, string>,
  key: string,
)}
  {@const shown = showAll[key] ? list : list.slice(0, FIRST_ENTRIES)}
  {#each groupByVersion(shown, summaries) as group (group.version)}
    <p class="version">
      <strong>{group.version}</strong>
      {#if group.summary}
        <span class="muted">{`— ${group.summary}`}</span>
      {/if}
    </p>
    <ul class="entries">
      {#each group.entries as entry, index (index)}
        {@const parts = entryParts(entry)}
        <li>
          {#if entry.section}<span class="section-tag">{entry.section}</span
            >{/if}
          {#if parts.lead}<strong>{parts.lead}</strong>{/if}
          {parts.rest}
        </li>
      {/each}
    </ul>
  {/each}
  {#if list.length > FIRST_ENTRIES}
    <button
      type="button"
      class="action"
      aria-expanded={showAll[key] ?? false}
      onclick={() => (showAll[key] = !showAll[key])}
    >
      {showAll[key]
        ? t("mods-show-fewer")
        : t("mods-show-all", { count: list.length })}
    </button>
  {/if}
{/snippet}

{#snippet deltaView(delta: Delta, key: string)}
  {#if delta.saveNotes.length > 0}
    <div class="saves">
      <p class="saves-heading">
        <span aria-hidden="true">⚠</span>
        {t("mods-saves-heading")}
      </p>
      <ul>
        {#each delta.saveNotes as entry, index (index)}
          <li><strong>{entry.version}:</strong> {entry.text}</li>
        {/each}
      </ul>
    </div>
  {/if}
  {#if delta.gain.length > 0}
    <h5 class="gain">
      <span aria-hidden="true">+</span>
      {t("mods-gain", { count: delta.gain.length })}
    </h5>
    {@render entryList(delta.gain, delta.summaries, `${key}/gain`)}
  {/if}
  {#if delta.lose.length > 0}
    <h5 class="lose">
      <span aria-hidden="true">−</span>
      {t("mods-lose", { count: delta.lose.length })}
    </h5>
    {@render entryList(delta.lose, delta.summaries, `${key}/lose`)}
  {/if}
  {#if delta.reworded.length > 0}
    <details class="reworded">
      <summary>{t("mods-reworded", { count: delta.reworded.length })}</summary>
      <ul class="entries">
        {#each delta.reworded as pair, index (index)}
          <li><strong>{pair.would.version}:</strong> {pair.would.text}</li>
        {/each}
      </ul>
    </details>
  {/if}
  {#if delta.gain.length === 0 && delta.lose.length === 0 && delta.reworded.length === 0}
    <p class="muted">{t("mods-no-difference")}</p>
  {/if}
{/snippet}

{#snippet confirmation(mod: ModInstall)}
  {#if asking !== null && asking.mod.mod === mod.mod}
    {@const move = asking.move}
    {@const backup = asking.backup}
    <div class="confirm" role="group" aria-label={t("mods-confirm-label")}>
      <p class="confirm-question" tabindex="-1" use:takeFocus>
        {#if move === "backup"}
          {t("mods-confirm-backup", {
            name: mod.name,
            version: mod.installed?.version ?? "",
            game: game.name,
          })}
        {:else if move === "restore" && backup}
          {t("mods-confirm-restore", {
            name: mod.name,
            when: formatWhen(backup.taken),
            version: backup.version || "?",
            installed: mod.installed?.version || "?",
            lose: backup.delta.lose.length,
            gain: backup.delta.gain.length,
          })}
        {:else}
          {t("mods-confirm-install", {
            name: mod.name,
            version: mod.repository.version || "?",
          })}
        {/if}
      </p>
      {#if move === "restore" && backup && backup.delta.saveNotes.length > 0}
        <p class="confirm-warning">
          <span aria-hidden="true">⚠</span>
          {t("mods-confirm-saves")}
        </p>
      {/if}
      {#if move === "install" && mod.uncommittedCount > 0}
        <p class="confirm-warning">
          <span aria-hidden="true">⚠</span>
          {t("mods-confirm-uncommitted", { count: mod.uncommittedCount })}
        </p>
      {/if}
      <div class="buttons">
        <button
          type="button"
          class="move-button"
          disabled={busy !== null}
          onclick={confirm}
        >
          {t(MOVE_WORDS[move].yes)}
        </button>
        <button
          type="button"
          class="action"
          disabled={busy !== null}
          onclick={() => (asking = null)}
        >
          {t("mods-action-cancel")}
        </button>
      </div>
    </div>
  {/if}
{/snippet}

{#snippet moveButton(
  repository: string,
  mod: ModInstall,
  move: Move,
  backup: Backup | null,
)}
  {@const blocked = blockedBy(move, running)}
  <button
    type="button"
    class="move-button"
    disabled={busy !== null || blocked !== null}
    aria-pressed={isAsking(mod, move, backup)}
    onclick={() => ask(repository, mod, move, backup)}
  >
    {t(MOVE_WORDS[move].button)}
  </button>
  {#if blocked}
    <span class="muted blocked">{t(blocked, { game: game.name })}</span>
  {/if}
{/snippet}

<div class="eyebrow accent">{t("mods-kicker")}</div>
<h1>{t("mods-title", { game: game.name })}</h1>
<p class="lead">{t("mods-lead")}</p>

{#if running.length > 0}
  <p class="running">
    <span aria-hidden="true">●</span>
    {t("mods-running", { game: game.name })}
  </p>
{/if}

<p class="status" role="status" aria-live="polite">{said}</p>
{#if output.length > 0}
  <details class="output">
    <summary>{t("mods-output")}</summary>
    <pre>{output.join("\n")}</pre>
  </details>
{/if}

{#if reading.state === "reading"}
  <p class="muted" role="status">{t("mods-reading")}</p>
{:else if reading.state === "browser"}
  <p class="muted">{t("mods-browser")}</p>
{:else if reading.state === "failed"}
  <FailurePanel failure={reading.failure} onretry={() => load()} />
{:else if reading.repositories.length === 0}
  <p class="lead">{t("mods-none", { game: game.name })}</p>
{:else}
  <div class="buttons top">
    <button
      type="button"
      class="action"
      disabled={busy !== null}
      onclick={() => load(true)}
    >
      {t("mods-action-read-again")}
    </button>
  </div>
  {#each reading.repositories as repository (repository.repository)}
    {#if reading.repositories.length > 1}
      <h2 class="repository">{repository.repository}</h2>
    {/if}
    <ol class="mods">
      {#each repository.status.mods as mod (mod.mod)}
        {@const key = cardKey(repository.repository, mod)}
        {@const words = STATE_WORDS[mod.state]}
        {@const record = mod.installed?.record ?? null}
        <li>
          <article class="mod" aria-label={mod.name}>
            <div class="mod-head">
              <h3>{mod.name}</h3>
              <p class="state state-{mod.state}">
                <span aria-hidden="true">{words.mark}</span>
                {t(words.label)}
              </p>
            </div>
            <dl>
              <dt>{t("mods-installed")}</dt>
              <dd>
                {#if mod.installed}
                  <strong>{mod.installed.version || "?"}</strong>
                  {#if record}
                    <span class="muted"
                      >{t("mods-record", {
                        when: formatWhen(record.installed),
                        commit: shortCommit(record.commit) || "?",
                      })}</span
                    >
                    {#if mod.commitsSince}
                      <span class="muted"
                        >{t("mods-commits-since", {
                          count: mod.commitsSince,
                        })}</span
                      >
                    {/if}
                  {:else}
                    <span class="muted">{t("mods-no-record")}</span>
                  {/if}
                {:else}
                  {t("mods-not-installed")}
                {/if}
              </dd>
              <dt>{t("mods-in-repository")}</dt>
              <dd>
                <strong>{mod.repository.version || "?"}</strong>
                {#if mod.uncommittedCount > 0}
                  <span class="muted"
                    >{t("mods-uncommitted", {
                      count: mod.uncommittedCount,
                    })}</span
                  >
                {/if}
              </dd>
            </dl>

            {#if mod.installed && mod.state !== "up-to-date"}
              <h4>{t("mods-update-heading")}</h4>
              {@render deltaView(mod.update, `${key}/update`)}
            {/if}

            <div class="buttons">
              {@render moveButton(repository.repository, mod, "install", null)}
              {#if mod.installed}
                {@render moveButton(repository.repository, mod, "backup", null)}
              {/if}
            </div>
            {#if asking?.backup === null}
              {@render confirmation(mod)}
            {/if}

            {#if mod.backups.length > 0}
              <details class="backups">
                <summary>
                  {t("mods-backups", {
                    count: mod.backups.length,
                    size: formatSize(
                      mod.backups.reduce((sum, b) => sum + (b.size ?? 0), 0),
                    ),
                  })}
                </summary>
                <ol class="backup-list">
                  {#each mod.backups as backup (backup.backup)}
                    {@const backupKey = `${key}/${backup.backup}`}
                    <li class="backup">
                      <p>
                        <strong>{formatWhen(backup.taken)}</strong>
                        <span>· {backup.version || "?"}</span>
                        <span class="muted">· {formatSize(backup.size)}</span>
                      </p>
                      <p class="muted">
                        {t("mods-backup-change", {
                          lose: backup.delta.lose.length,
                          gain: backup.delta.gain.length,
                        })}
                        {#if backup.delta.saveNotes.length > 0}
                          <span aria-hidden="true">⚠</span>
                          {t("mods-backup-saves", {
                            count: backup.delta.saveNotes.length,
                          })}
                        {/if}
                      </p>
                      <div class="buttons">
                        <button
                          type="button"
                          class="action"
                          aria-expanded={showAll[backupKey] ?? false}
                          onclick={() =>
                            (showAll[backupKey] = !showAll[backupKey])}
                        >
                          {showAll[backupKey]
                            ? t("mods-hide-changes")
                            : t("mods-show-changes")}
                        </button>
                        {@render moveButton(
                          repository.repository,
                          mod,
                          "restore",
                          backup,
                        )}
                      </div>
                      {#if showAll[backupKey]}
                        <div class="backup-delta">
                          {@render deltaView(backup.delta, backupKey)}
                        </div>
                      {/if}
                      {#if asking?.backup?.backup === backup.backup}
                        {@render confirmation(mod)}
                      {/if}
                    </li>
                  {/each}
                </ol>
              </details>
            {/if}
          </article>
        </li>
      {/each}
    </ol>
    <p class="muted how">
      {t("mods-space", {
        size: formatSize(repository.status.space.backups),
        free: formatSize(repository.status.space.backupsFree) || "?",
      })}
    </p>
  {/each}
  <p class="muted how">{t("mods-how")}</p>
{/if}

<style>
  h1 {
    margin-block: 4px 8px;
    font-family: var(--font-display);
    font-size: 2.25rem;
    font-weight: 600;
    line-height: 1.2;
  }

  .lead {
    max-width: 70ch;
    font-size: var(--type-lead);
  }

  .status {
    min-height: 1.5em;
    margin-block: 8px;
    font-weight: 600;
    color: var(--colour-observed);
  }

  .running {
    margin-block: 12px;
    padding: 10px 14px;
    font-weight: 600;
    border-inline-start: 4px solid var(--colour-accent);
    background: var(--colour-surface-soft);
  }

  .repository {
    margin-block: 20px 8px;
    font-family: var(--font-display);
    font-size: 1.25rem;
  }

  .mods,
  .backup-list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .mod {
    padding: 16px 18px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .mod-head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 16px;
  }

  h3 {
    margin: 0;
    font-size: var(--type-lead);
    font-weight: 600;
  }

  h4 {
    margin-block: 14px 6px;
    font-size: var(--type-body, 1rem);
    font-weight: 600;
  }

  h5 {
    margin-block: 10px 4px;
    font-size: var(--type-small);
    font-weight: 600;
  }

  .state {
    margin: 0;
    font-size: var(--type-small);
    font-weight: 600;
  }

  .state-behind,
  .state-differs {
    color: var(--colour-accent);
  }

  .state-up-to-date {
    color: var(--colour-success);
  }

  .state-ahead {
    color: var(--colour-observed);
  }

  .gain {
    color: var(--colour-success);
  }

  .lose {
    color: var(--colour-risk);
  }

  dl {
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
    gap: 6px 14px;
    margin-block: 10px;
    font-size: var(--type-small);
  }

  dt {
    font-weight: 600;
    color: var(--colour-text-muted);
  }

  dd {
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 2px 10px;
  }

  .version {
    margin-block: 8px 2px;
    font-size: var(--type-small);
  }

  .entries {
    margin: 0;
    padding-inline-start: 20px;
    font-size: var(--type-small);
    max-width: 90ch;
  }

  .entries li + li {
    margin-top: 4px;
  }

  .section-tag {
    display: inline-block;
    margin-inline-end: 6px;
    padding-inline: 6px;
    font-size: var(--type-caption);
    color: var(--colour-text-muted);
    border: 1px solid var(--colour-line);
    border-radius: 3px;
  }

  .saves,
  .confirm {
    margin-block: 10px;
    padding: 10px 14px;
    background: var(--colour-surface-soft);
  }

  .saves {
    border-inline-start: 4px solid var(--colour-risk);
  }

  .saves-heading {
    margin: 0 0 4px;
    font-weight: 600;
  }

  .saves ul {
    margin: 0;
    padding-inline-start: 20px;
    font-size: var(--type-small);
  }

  .confirm {
    border: 2px solid var(--colour-accent);
    border-radius: 4px;
  }

  .confirm-question {
    margin: 0 0 6px;
    font-weight: 600;
    max-width: 80ch;
  }

  .confirm-warning {
    margin-block: 4px;
    font-size: var(--type-small);
  }

  .buttons {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    margin-top: 10px;
  }

  .buttons.top {
    margin-block: 0 12px;
  }

  .move-button {
    min-height: var(--control-min);
    padding-inline: 20px;
    font: inherit;
    font-weight: 600;
    color: var(--colour-text);
    background: var(--colour-surface-soft);
    border: 2px solid var(--colour-accent);
    border-radius: 4px;
    cursor: pointer;
  }

  .move-button:disabled {
    cursor: not-allowed;
    opacity: 0.7;
  }

  .move-button[aria-pressed="true"] {
    background: var(--colour-surface);
  }

  .blocked {
    font-size: var(--type-small);
  }

  details > summary {
    display: flex;
    align-items: center;
    min-height: var(--control-min);
    font-weight: 600;
    cursor: pointer;
  }

  .backups {
    margin-top: 12px;
    border-top: 1px solid var(--colour-line);
  }

  .backup {
    padding: 10px 12px;
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .backup p {
    margin: 0 0 4px;
    font-size: var(--type-small);
  }

  .backup-delta {
    margin-top: 8px;
  }

  .output pre {
    max-height: 18rem;
    overflow: auto;
    padding: 10px;
    font-size: var(--type-caption);
    white-space: pre-wrap;
    background: var(--colour-canvas);
    border: 1px solid var(--colour-line);
  }

  .how {
    margin-top: 16px;
    font-size: var(--type-small);
    max-width: 80ch;
  }
</style>
