<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import { forgetPatchTargets } from "../connections/patches";
  import {
    checkUpdates,
    keepBuilds,
    markUpdateRead,
  } from "../othercode/desktopClient";
  import { openUpdate } from "../othercode/navigation";
  import type { KeptFile } from "../othercode/types";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import { heard, started } from "../shell/progress";
  import { formatUtcMinute, formatWhen } from "../shell/dates";
  import { rememberChecked } from "./checkedMemory";
  import {
    newTypes,
    patchedDefsNote,
    rowKey,
    summariseCheck,
    updateSize,
    type CheckSummary,
    type SinceSummary,
    type TemporaryRow,
    type UpdateCheck,
  } from "./sinceLastPlayed";
  import { readPatches, readSince, type Patches } from "./sinceReading";
  import AskAi from "../ai/AskAi.svelte";
  import { prepareUpdateCheck } from "../ai/desktopClient";
  import { ai, loadAi } from "../ai/state.svelte";

  /**
   * Since you last played (0.28.0; the owner's go-ahead, 20 Nov 2026), in Before you play: what updated since the session before
   * (while the game runs, the launch before this one), which of those changed a method our mods patch, with See what changed,
   * and which have new builds the tools have not kept yet, with Keep the new builds. It reads only, except that press, which writes
   * only into the tools' archive.
   *
   * Check what they mean for ours (0.35.0; the owner's choice of 20 Nov 2026, all four checks) runs the tools' check after an update
   * on the owner's press, for the first repository: our patches' targets, the temporary patches' faults, each update's size and
   * new types, and our XML patches. It may decompile new builds into the tools' cache, so it never runs by itself (the owner's
   * choice on the Decisions page: "Only when I press it").
   */
  let {
    game,
    repositories,
    running,
  }: { game: string; repositories: string[]; running: boolean } = $props();

  let summary = $state<SinceSummary | null>(null);
  let unread = $state(false);
  let patches = $state<Patches>({ state: "idle" });
  let keeping = $state(false);
  let progress = $state(started());
  let said = $state("");

  type Check =
    | { state: "idle" }
    | { state: "running" }
    | { state: "missing" }
    | { state: "failed"; reason: string }
    | { state: "ready"; summary: CheckSummary };
  let checked = $state<Check>({ state: "idle" });
  let checkProgress = $state(started());

  /** Rows marked as read since this check was shown (0.104.0): they leave the list, each with Undo. */
  let marked = $state<TemporaryRow[]>([]);
  let marking = $state("");
  let markSaid = $state("");

  /** I've read it, or Undo (`clear`): the mark is kept in the program's own folder, for this row's build only. */
  async function markRead(row: TemporaryRow, clear: boolean) {
    const repository = repositories[0];
    if (!repository || !row.build) return;
    marking = rowKey(row);
    markSaid = "";
    const done = await markUpdateRead<unknown>(
      game,
      repository,
      String(row.row),
      row.build,
      clear,
    );
    marking = "";
    const refusal =
      done.state === "failed"
        ? done.failure.detail
        : done.answer.ok
          ? null
          : (done.answer.refusal ?? "");
    if (refusal !== null) {
      markSaid = t("check-read-failed", { reason: refusal });
      return;
    }
    marked = clear
      ? marked.filter((m) => rowKey(m) !== rowKey(row))
      : [...marked, row];
  }

  /** The touched rows still asking to be read. */
  const asking = (rows: TemporaryRow[]) =>
    rows.filter((row) => !marked.some((m) => rowKey(m) === rowKey(row)));

  // The readings themselves are in sinceReading.ts (0.67.0), which the page list's scan asks too.
  async function read() {
    const found = await readSince(game, running);
    if (!found) {
      unread = true;
      return;
    }
    summary = found;
    await check();
  }

  /** Which updates are mods ours tie into, which changed what ours patch, and which are not kept yet to compare. */
  async function check() {
    const now = summary;
    if (!now || (now.updated.length === 0 && !now.gameUpdated)) return;
    patches = { state: "checking" };
    patches = await readPatches(game, repositories, now);
  }

  async function keep() {
    keeping = true;
    said = "";
    progress = started();
    let failed = "";
    for (const repository of repositories) {
      const done = await keepBuilds<unknown>(game, repository, (m) => {
        progress = heard(progress, m);
      });
      if (done.state === "failed") failed = done.failure.detail;
      else if (!done.answer.ok) failed = done.answer.refusal ?? "";
      forgetPatchTargets(game, repository);
    }
    keeping = false;
    said = failed
      ? t("since-keep-failed", { reason: failed })
      : t("since-kept");
    await check();
  }

  /** The check after an update, for the first repository, counting updates the tools kept since the moment compared with. */
  async function checkOurs() {
    const repository = repositories[0];
    if (!repository || !summary) return;
    checked = { state: "running" };
    checkProgress = started();
    marked = [];
    markSaid = "";
    // The moment it began, so an update arriving while it runs is still listed next time.
    const began = new Date();
    const done = await checkUpdates<UpdateCheck>(
      game,
      repository,
      summary.since,
      (m) => {
        checkProgress = heard(checkProgress, m);
      },
    );
    if (done.state === "failed") {
      checked = { state: "failed", reason: done.failure.detail };
    } else if (!done.answer.available) {
      checked = { state: "missing" };
    } else if (!done.answer.ok) {
      checked = { state: "failed", reason: done.answer.refusal ?? "" };
    } else {
      checked = { state: "ready", summary: summariseCheck(done.answer.data) };
      rememberChecked(game, began);
    }
  }

  const names = (files: KeptFile[]) =>
    files.map((f) => f.owner_name).join(", ");

  onMount(() => {
    void read();
    // What does this mean for my mods? shows only once an AI service and its model are ready (0.72.0, Settings → AI).
    void loadAi();
  });
</script>

{#if summary}
  <div class="since" role="group" aria-label={t("since-label")}>
    <p>
      {#if summary.updated.length === 0 && !summary.gameUpdated}
        {t("since-nothing", { when: formatWhen(summary.since) })}
      {:else}
        {t("since-updated", {
          when: formatWhen(summary.since),
          count: summary.updated.length,
          game: summary.gameUpdated ? "yes" : "no",
        })}
      {/if}
    </p>
    {#if summary.thisLaunchOnly}
      <p class="small muted">{t("since-this-launch-only")}</p>
    {/if}
    {#if summary.reach !== "launch"}
      <!-- 0.42.4: once a check has looked, say so; the list itself stays until Mods next opens, beside the check's answers. -->
      <p class="small muted">
        {t(
          checked.state === "ready"
            ? "since-reach-done"
            : summary.reach === "check"
              ? "since-reach-check"
              : "since-reach-week",
        )}
      </p>
    {/if}
    {#if summary.updated.length > 0}
      <details>
        <summary>{t("since-which", { count: summary.updated.length })}</summary>
        <p class="small">{summary.updated.join(", ")}</p>
      </details>
    {/if}

    {#if patches.state === "checking"}
      <p class="small muted">{t("since-checking")}</p>
    {:else if patches.state === "none"}
      <p class="small">{t("since-none-tied")}</p>
    {:else if patches.state === "ready"}
      {#if patches.patched.length === 0}
        <p class="small">
          {t("since-patched-none", {
            count: patches.tied.length - patches.notKept.length,
          })}
        </p>
      {:else}
        <ul class="patched">
          {#each patches.patched as change}
            <li>
              <span class="mark" aria-hidden="true">◆</span>
              <span
                >{t("since-patched", {
                  mod: change.mod,
                  count: change.methods.length,
                  methods: change.methods.join(", "),
                })}</span
              >
              {#each repositories.slice(0, 1) as repository (repository)}
                <button
                  type="button"
                  class="action"
                  onclick={() => openUpdate(game, repository, change.file)}
                  >{t("since-see-change")}</button
                >
              {/each}
            </li>
          {/each}
        </ul>
      {/if}
      {#if patches.notKept.length > 0}
        <p class="small">
          {t("since-not-kept", {
            count: patches.notKept.length,
            names: names(patches.notKept),
          })}
        </p>
        {#if keeping}
          <ProgressBar {progress} fallback={t("since-keeping")} />
        {:else}
          <button type="button" class="action" onclick={keep}
            >{t("since-keep")}</button
          >
        {/if}
      {/if}
    {/if}
    <p class="small" role="status" aria-live="polite">{said}</p>

    <!-- 0.42.1: always offered, even with nothing new (the owner's choice, 21 Nov 2026). -->
    {#if repositories.length > 0}
      <div class="check" role="group" aria-label={t("check-label")}>
        <!-- 0.100.1: an answer that cannot be drawn says so, rather than leaving the bar where it stopped (the owner's screen note
             of 26 Nov 2026). -->
        <svelte:boundary>
          {#snippet failed(error, reset)}
            <p class="small">
              {t("check-show-failed", {
                reason: error instanceof Error ? error.message : String(error),
              })}
            </p>
            <button
              type="button"
              class="action"
              onclick={() => {
                reset();
                void checkOurs();
              }}>{t("check-again")}</button
            >
          {/snippet}
          {#if checked.state === "running"}
            <ProgressBar
              progress={checkProgress}
              fallback={t("check-running")}
            />
          {:else if checked.state === "ready"}
            {@const found = checked.summary}
            {#if found.olderKit}
              <p class="small">
                <span class="mark" aria-hidden="true">◆</span>
                {t("check-older-kit", {
                  runs: found.olderKit.runs,
                  pins: found.olderKit.pins,
                })}
              </p>
            {/if}
            {#if found.names}
              <p class="small">
                {#if found.names.failing.length === 0}
                  <span class="mark" aria-hidden="true">✓</span>
                  {t("check-names-ok", { count: found.names.found })}
                {:else}
                  <span class="mark" aria-hidden="true">◆</span>
                  {t("check-names-broken", {
                    count: found.names.failing.length,
                    targets: found.names.failing
                      .map((f) => f.target)
                      .join(", "),
                  })}
                {/if}
              </p>
            {/if}
            {#if found.temporary}
              {@const asked = asking(found.temporary.touched)}
              {#if asked.length === 0}
                <p class="small">
                  <span class="mark" aria-hidden="true">✓</span>
                  {t("check-temporary-none", { count: found.temporary.total })}
                </p>
              {:else}
                <p class="small">
                  {t("check-temporary-lead", {
                    count: asked.length,
                  })}
                </p>
                <ul class="patched">
                  {#each asked as row}
                    <li>
                      <span class="mark" aria-hidden="true">◆</span>
                      <span
                        >{t("check-temporary-row", {
                          row: String(row.row),
                          patch: row.patch,
                          mod: row.mod,
                          detail: row.detail,
                        })}</span
                      >
                      {#each repositories.slice(0, 1) as repository (repository)}
                        <button
                          type="button"
                          class="action"
                          onclick={() => openUpdate(game, repository, row.file)}
                          >{t("since-see-change")}</button
                        >
                      {/each}
                      {#if row.build && repositories[0]}
                        <button
                          type="button"
                          class="action"
                          disabled={marking !== ""}
                          aria-label={t("check-read-it-label", {
                            row: String(row.row),
                          })}
                          onclick={() => markRead(row, false)}
                          >{marking === rowKey(row)
                            ? t("check-read-working")
                            : t("check-read-it")}</button
                        >
                      {/if}
                    </li>
                  {/each}
                </ul>
              {/if}
              {#if found.temporary.reviewed > 0}
                <p class="small muted">
                  {t("check-temporary-reviewed", {
                    count: found.temporary.reviewed,
                  })}
                </p>
              {/if}
              {#each marked as row (rowKey(row))}
                <p class="small read">
                  <span class="mark" aria-hidden="true">✓</span>
                  <span>{t("check-read-done", { row: String(row.row) })}</span>
                  <button
                    type="button"
                    class="action"
                    disabled={marking !== ""}
                    aria-label={t("check-read-undo-label", {
                      row: String(row.row),
                    })}
                    onclick={() => markRead(row, true)}
                    >{t("check-read-undo")}</button
                  >
                </p>
              {/each}
              {#if markSaid}
                <p class="small" role="status">{markSaid}</p>
              {/if}
            {/if}
            {#if found.updates && found.updates.shown.length > 0}
              <details>
                <summary
                  >{t("check-updates", {
                    count: found.updates.shown.length + found.updates.more,
                  })}</summary
                >
                <ul class="sizes small">
                  <!-- 0.100.1: no key: two mods may ship a file of one name, and a repeated key stops the page drawing. -->
                  {#each found.updates.shown as row}
                    <li>
                      {t("check-update-row", {
                        mod: row.mod,
                        file: row.file,
                        size: updateSize(row),
                        added: row.added,
                        types: newTypes(row),
                      })}
                    </li>
                  {/each}
                  {#if found.updates.more > 0}
                    <li>
                      {t("check-updates-more", { count: found.updates.more })}
                    </li>
                  {/if}
                </ul>
              </details>
            {/if}
            {#if found.xml}
              {#if found.xml.problems.length === 0}
                <p class="small">
                  <span class="mark" aria-hidden="true">✓</span>
                  {t("check-xml-ok", {
                    count: found.xml.checked,
                    patched: found.xml.patched,
                  })}
                </p>
              {:else}
                <p class="small">
                  {t("check-xml-lead", {
                    count: found.xml.problems.length,
                    checked: found.xml.checked,
                  })}
                </p>
                <ul class="sizes small">
                  {#each found.xml.problems as row (row.key)}
                    <li>
                      {t("check-xml-row", {
                        def: row.def,
                        file: row.file,
                        detail: row.detail,
                        count: row.count,
                      })}
                    </li>
                  {/each}
                </ul>
              {/if}
              {@const fileNote = patchedDefsNote(found.xml.file)}
              {#if fileNote}
                <p class="small">
                  <span class="mark" aria-hidden="true">◆</span>
                  {fileNote === "stale"
                    ? t("check-xml-file-stale", {
                        written: formatUtcMinute(found.xml.file.written),
                        how: found.xml.file.how ?? "",
                      })
                    : t("check-xml-file-missing", {
                        how: found.xml.file.how ?? "",
                      })}
                </p>
              {/if}
            {/if}
            <p class="small muted">{t("check-limits")}</p>
            {#if ai.status?.ready && repositories[0]}
              <AskAi
                key="update-check"
                button={t("update-meaning-button")}
                prepare={() => prepareUpdateCheck(game, repositories[0])}
              />
            {/if}
            <button type="button" class="action" onclick={checkOurs}
              >{t("check-again")}</button
            >
          {:else}
            {#if checked.state === "failed"}
              <p class="small">
                {t("check-failed", { reason: checked.reason })}
              </p>
            {:else if checked.state === "missing"}
              <p class="small">{t("check-missing")}</p>
            {:else}
              <p class="small">{t("check-lead")}</p>
            {/if}
            <button type="button" class="action" onclick={checkOurs}
              >{t("check-button")}</button
            >
          {/if}
        </svelte:boundary>
      </div>
    {/if}
  </div>
{:else if unread}
  <p class="small muted">{t("since-unread")}</p>
{/if}

<style>
  .since {
    display: grid;
    gap: 4px;
    margin: 6px 0 10px;
    padding: 8px 12px;
    border-inline-start: 3px solid var(--colour-accent);
  }

  .since p {
    margin: 0;
  }

  summary {
    min-height: 44px;
    display: flex;
    align-items: center;
    cursor: pointer;
    font-size: var(--type-small);
  }

  .patched {
    display: grid;
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .patched li,
  .read {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 10px;
  }

  .mark {
    color: var(--colour-accent);
  }

  .check {
    display: grid;
    gap: 4px;
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px solid var(--colour-line);
  }

  .sizes {
    display: grid;
    gap: 2px;
    margin: 0;
    padding-inline-start: 18px;
  }
</style>
