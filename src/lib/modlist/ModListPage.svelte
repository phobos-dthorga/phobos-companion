<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import type { GameHome } from "../home/types";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import Placeholder from "../shell/Placeholder.svelte";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import { formatWhen } from "../shell/dates";
  import { heard, started } from "../shell/progress";
  import type { Failure } from "../shell/types";
  import { register } from "../shortcuts/registry";
  import {
    changeModList,
    openInSteam,
    readModList,
    undoModList,
  } from "./desktopClient";
  import { keep } from "./latest.svelte";
  import ModListEditor from "./ModListEditor.svelte";
  import ModListSort from "./ModListSort.svelte";
  import {
    HEADING,
    MARK,
    SEVERITIES,
    findingsByList,
    lastChange,
    stampMoment,
    steamWorthy,
  } from "./presentation";
  import type { ModFix, ModListCheck, ModListInfo } from "./types";

  /**
   * Mod list (0.45.0; the owner, 22 Nov 2026: "our own, third-party, mod managing", better than RimSort's "1 missing mod"): what is
   * wrong with each of the game's lists of active mods and why, from the kit's `mod-list check`. Each change it offers waits for a
   * yes on its card; the tools keep a backup of the list first, and Undo the last change puts it back. Open in Steam opens a mod's
   * Workshop page in the Steam client, where you subscribe.
   */
  let { game }: { game: GameHome } = $props();

  type Reading =
    | { state: "reading" }
    | { state: "ready"; check: ModListCheck }
    | { state: "failed"; failure: Failure };
  type Asked =
    | { kind: "fix"; fix: ModFix; list: ModListInfo }
    | { kind: "undo"; list: ModListInfo; change: string };

  let reading = $state<Reading>({ state: "reading" });
  /** What's wrong, Edit the list (0.46.0) or Sort (0.47.0): coming back to What's wrong checks again, so it follows the edits. */
  let view = $state<"wrong" | "edit" | "sort">("wrong");
  let online = $state(true);
  let busy = $state(false);
  let progress = $state(started());
  let asked = $state<Asked | null>(null);
  let said = $state<{ text: string; refused: boolean } | null>(null);
  let shownVersions = $state<Record<string, boolean>>({});

  function hearing() {
    return (m: Parameters<typeof heard>[1]) => {
      progress = heard(progress, m);
    };
  }

  async function load() {
    busy = true;
    progress = started(t(online ? "modlist-reading-steam" : "modlist-reading"));
    const answer = await readModList(game.id, online, hearing());
    busy = false;
    if (answer.state === "ready") {
      reading = { state: "ready", check: answer.check };
      keep(game.id, answer.check);
    } else if (answer.state === "failed" && reading.state !== "ready") {
      reading = { state: "failed", failure: answer.failure };
    } else if (answer.state === "failed") {
      said = {
        text: t("modlist-read-failed", { reason: answer.failure.detail }),
        refused: true,
      };
    }
  }

  function showView(chosen: "wrong" | "edit" | "sort") {
    if (chosen === view) return;
    view = chosen;
    said = null;
    if (chosen === "wrong") void load();
  }

  function toggleSteam() {
    online = !online;
    void load();
  }

  async function yes(chosen: Asked) {
    asked = null;
    said = null;
    busy = true;
    progress = started(t("modlist-changing"));
    const answer =
      chosen.kind === "fix"
        ? await changeModList(
            game.id,
            chosen.fix.list_key,
            chosen.fix.action,
            chosen.fix.id,
            hearing(),
          )
        : await undoModList(game.id, chosen.list.key, hearing());
    busy = false;
    if (answer.state === "failed") {
      said = {
        text: t("modlist-change-failed", { reason: answer.failure.detail }),
        refused: true,
      };
    } else if (!answer.result.ok) {
      said = {
        text: t("modlist-change-failed", {
          reason: answer.result.refusal ?? "",
        }),
        refused: true,
      };
    } else {
      said = {
        text:
          chosen.kind === "fix"
            ? t("modlist-changed", { change: answer.result.data.change ?? "" })
            : t("modlist-undone", { change: answer.result.data.undoes ?? "" }),
        refused: false,
      };
    }
    await load();
  }

  async function steam(number: string) {
    const answer = await openInSteam(number);
    if (answer.state === "failed") {
      said = {
        text: t("modlist-steam-failed", { reason: answer.failure.detail }),
        refused: true,
      };
    }
  }

  onMount(() => {
    void load();
    return register({
      scope: "everywhere",
      inDialog: false,
      run: { "look-again": () => void load() },
    });
  });
</script>

<div class="eyebrow accent">{t("modlist-kicker")}</div>
<h1>{t("modlist-title", { game: game.name })}</h1>
<p class="lead">{t("modlist-lead")}</p>

<div class="buttons" role="group" aria-label={t("modlist-view-label")}>
  <button
    type="button"
    class="action toggle"
    aria-pressed={view === "wrong"}
    onclick={() => showView("wrong")}>{t("modlist-view-wrong")}</button
  >
  <button
    type="button"
    class="action toggle"
    aria-pressed={view === "edit"}
    onclick={() => showView("edit")}>{t("modlist-view-edit")}</button
  >
  <button
    type="button"
    class="action toggle"
    aria-pressed={view === "sort"}
    onclick={() => showView("sort")}>{t("modlist-view-sort")}</button
  >
</div>

{#if view === "edit"}
  <ModListEditor {game} />
{:else if view === "sort"}
  <ModListSort {game} />
{:else}
  {#if said}
    <p class="told" class:refused={said.refused} role="status">{said.text}</p>
  {/if}

  {#if reading.state === "reading"}
    <ProgressBar {progress} fallback={t("modlist-reading")} />
    <Placeholder shape="rows" />
  {:else if reading.state === "failed"}
    <FailurePanel failure={reading.failure} onretry={load} />
  {:else}
    {@const check = reading.check}
    {@const running = check.running.length > 0}
    <div class="buttons">
      <button type="button" class="action" disabled={busy} onclick={load}
        >{busy ? t("modlist-checking") : t("modlist-check-again")}</button
      >
      <button
        type="button"
        class="action toggle"
        aria-pressed={online}
        disabled={busy}
        onclick={toggleSteam}>{t("modlist-ask-steam")}</button
      >
    </div>
    {#if busy}
      <ProgressBar {progress} fallback={t("modlist-reading")} />
    {/if}

    {#if !check.supported}
      <section class="panel" aria-labelledby="modlist-unsupported">
        <h2 id="modlist-unsupported">
          {t("modlist-unsupported-title", { game: game.name })}
        </h2>
        {#each check.notes as note, index (index)}
          <p>{note}</p>
        {/each}
      </section>
    {:else}
      <p class="muted small">
        {t("modlist-facts", {
          version: check.version || "?",
          installed: check.installed,
          steam: check.online ? "yes" : "no",
        })}
      </p>
      {#if running}
        <p class="told refused" role="status">
          {t("modlist-running", { names: check.running.join(", ") })}
        </p>
      {/if}
      {#if check.lists.length === 0}
        <p>{t("modlist-no-lists")}</p>
      {/if}

      {#each findingsByList(check) as found (found.list.key)}
        {@const change = lastChange(check, found.list.key)}
        <section class="panel" aria-labelledby={`modlist-${found.list.key}`}>
          <h2 id={`modlist-${found.list.key}`}>{found.list.label}</h2>
          <p class="muted small">
            {t("modlist-list-count", { count: found.list.count })}
          </p>
          {#if found.bySeverity.problem.length + found.bySeverity.warning.length === 0}
            <p class="clean">{t("modlist-list-clean")}</p>
          {/if}

          {#each SEVERITIES as severity (severity)}
            {#if found.bySeverity[severity].length > 0}
              <h3>{t(HEADING[severity])}</h3>
              <ul class="findings">
                {#each found.bySeverity[severity] as problem, index (index)}
                  <li class={severity}>
                    <p>
                      <span class="mark">{t(MARK[severity])}</span>
                      <strong>{problem.title}</strong>
                    </p>
                    {#if problem.why}<p>{problem.why}</p>{/if}
                    {#if problem.clue}
                      <p class="clue">
                        <strong>{t("modlist-clue")}</strong>
                        {problem.clue}
                      </p>
                    {/if}
                    {#if problem.fixes.length > 0 || steamWorthy(problem)}
                      <div class="buttons">
                        {#each problem.fixes as fix (fix.action + fix.id)}
                          <button
                            type="button"
                            class="action"
                            disabled={busy || running || !found.list.writable}
                            onclick={() =>
                              (asked = { kind: "fix", fix, list: found.list })}
                            >{fix.label}</button
                          >
                        {/each}
                        {#if steamWorthy(problem)}
                          <button
                            type="button"
                            class="action"
                            onclick={() => steam(problem.workshop_id)}
                            >{t("modlist-open-steam")}</button
                          >
                        {/if}
                      </div>
                    {/if}
                    {#if asked?.kind === "fix" && problem.fixes.includes(asked.fix)}
                      {@const waiting = asked}
                      <div
                        class="confirm"
                        role="group"
                        aria-label={t("modlist-confirm-label")}
                      >
                        <p>
                          {t("modlist-fix-confirm", {
                            change: waiting.fix.label,
                            name: problem.name,
                            list: waiting.list.label,
                          })}
                        </p>
                        <div class="buttons">
                          <button
                            type="button"
                            class="action"
                            onclick={() => yes(waiting)}
                            >{t("modlist-fix-yes")}</button
                          >
                          <button
                            type="button"
                            class="action"
                            onclick={() => (asked = null)}
                            >{t("modlist-cancel")}</button
                          >
                        </div>
                      </div>
                    {/if}
                  </li>
                {/each}
              </ul>
            {/if}
          {/each}

          {#if found.versions.length > 0}
            <h3>{t("modlist-versions-title")}</h3>
            <p>
              {t("modlist-versions-body", {
                count: found.versions.length,
                version: check.version,
              })}
            </p>
            <button
              type="button"
              class="action toggle"
              aria-pressed={shownVersions[found.list.key] ?? false}
              onclick={() =>
                (shownVersions = {
                  ...shownVersions,
                  [found.list.key]: !(shownVersions[found.list.key] ?? false),
                })}
              >{t("modlist-versions-show", {
                count: found.versions.length,
              })}</button
            >
            {#if shownVersions[found.list.key]}
              <ul class="names">
                {#each found.versions as problem, index (index)}
                  <li>{problem.title}</li>
                {/each}
              </ul>
            {/if}
          {/if}

          {#if change}
            <h3>{t("modlist-last-change-title")}</h3>
            <p>
              {t("modlist-last-change", {
                change: change.why,
                when: formatWhen(stampMoment(change.at)),
              })}
            </p>
            <button
              type="button"
              class="action"
              disabled={busy || running}
              onclick={() =>
                (asked = {
                  kind: "undo",
                  list: found.list,
                  change: change.why,
                })}>{t("modlist-undo")}</button
            >
            {#if asked?.kind === "undo" && asked.list.key === found.list.key}
              {@const waiting = asked}
              <div
                class="confirm"
                role="group"
                aria-label={t("modlist-confirm-label")}
              >
                <p>
                  {t("modlist-undo-confirm", {
                    change: waiting.change,
                    list: waiting.list.label,
                  })}
                </p>
                <div class="buttons">
                  <button
                    type="button"
                    class="action"
                    onclick={() => yes(waiting)}>{t("modlist-undo-yes")}</button
                  >
                  <button
                    type="button"
                    class="action"
                    onclick={() => (asked = null)}>{t("modlist-cancel")}</button
                  >
                </div>
              </div>
            {/if}
          {/if}
        </section>
      {/each}

      {#if check.notes.length > 0}
        <section class="panel" aria-labelledby="modlist-unseen">
          <h2 id="modlist-unseen">{t("modlist-unseen-title")}</h2>
          <ul>
            {#each check.notes as note, index (index)}
              <li>{note}</li>
            {/each}
          </ul>
        </section>
      {/if}
    {/if}
  {/if}
{/if}

<style>
  .panel {
    margin-bottom: 16px;
    padding: 20px 24px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  h2 {
    margin-bottom: 4px;
    font-family: var(--font-display);
    font-size: 1.375rem;
    font-weight: 600;
  }

  h3 {
    margin: 16px 0 8px;
    font-size: 1.0625rem;
    font-weight: 600;
  }

  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 8px 0;
  }

  .findings {
    list-style: none;
    padding: 0;
  }

  .findings li {
    margin-bottom: 10px;
    padding: 10px 14px;
    border-inline-start: 3px solid var(--colour-line);
    background: var(--colour-surface-soft);
    overflow-wrap: anywhere;
  }

  .findings li.problem {
    border-inline-start-color: var(--colour-risk);
    background: var(--shade-risk);
  }

  .findings li.warning {
    border-inline-start-color: var(--colour-accent);
    background: var(--shade-accent);
  }

  .findings p {
    margin-bottom: 6px;
  }

  .mark {
    display: inline-block;
    margin-inline-end: 6px;
    font-size: 0.8125rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .problem .mark {
    color: var(--colour-risk);
  }

  .warning .mark {
    color: var(--colour-accent);
  }

  .clue {
    color: var(--colour-text-muted);
  }

  .clean {
    color: var(--colour-success);
  }

  .names {
    columns: 2 18em;
    margin-top: 8px;
  }

  .confirm {
    margin: 8px 0 10px;
    padding: 10px 14px;
    border-inline-start: 3px solid var(--colour-accent);
    background: var(--colour-surface-raised);
    overflow-wrap: anywhere;
  }

  .told {
    margin-bottom: 12px;
  }

  .told.refused {
    color: var(--colour-risk);
  }
</style>
