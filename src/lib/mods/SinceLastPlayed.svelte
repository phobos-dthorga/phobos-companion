<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import {
    forgetPatchTargets,
    patchTargetsOf,
    type PatchTarget,
  } from "../connections/patches";
  import { readGameFiles } from "../gamefiles/desktopClient";
  import { askUpdates, keepBuilds } from "../othercode/desktopClient";
  import { openUpdate } from "../othercode/navigation";
  import type { KeptFile, KeptFiles } from "../othercode/types";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import { heard, started } from "../shell/progress";
  import { formatWhen } from "../shell/dates";
  import {
    notKeptYet,
    patchedSince,
    summarise,
    tiedUpdates,
    type PatchedChange,
    type SinceSummary,
  } from "./sinceLastPlayed";

  /**
   * Since you last played (0.28.0; the owner's go-ahead, 20 Nov 2026), in Before you play: what updated since the session before
   * (while the game runs, the launch before this one), which of those changed a method our mods patch, with See what changed,
   * and which have new builds the tools have not kept yet, with Keep the new builds. It reads only, except that press, which writes
   * only into the tools' archive.
   */
  let {
    game,
    repositories,
    running,
  }: { game: string; repositories: string[]; running: boolean } = $props();

  type Patches =
    | { state: "idle" }
    | { state: "checking" }
    | { state: "none" }
    | {
        state: "ready";
        patched: PatchedChange[];
        tied: KeptFile[];
        notKept: KeptFile[];
      };

  let summary = $state<SinceSummary | null>(null);
  let unread = $state(false);
  let patches = $state<Patches>({ state: "idle" });
  let keeping = $state(false);
  let progress = $state(started());
  let said = $state("");

  async function read() {
    const answer = await readGameFiles(game, running ? "previous" : null);
    if (answer.state !== "ready") {
      unread = true;
      return;
    }
    summary = summarise(answer.files, running);
    await check();
  }

  /** Which updates are mods ours tie into, which changed what ours patch, and which are not kept yet to compare. */
  async function check() {
    const now = summary;
    if (!now || (now.updated.length === 0 && !now.gameUpdated)) return;
    patches = { state: "checking" };
    const listed = await askUpdates<KeptFiles>(game, null, null, null);
    const kept =
      listed.state === "ready" && listed.answer.available
        ? (listed.answer.data?.files ?? [])
        : [];
    const tied = tiedUpdates(kept, now);
    if (tied.length === 0) {
      patches = { state: "none" };
      return;
    }
    const targets: PatchTarget[] = [];
    for (const repository of repositories) {
      const found = await patchTargetsOf(game, repository);
      targets.push(...(found.data?.targets ?? []));
    }
    patches = {
      state: "ready",
      patched: patchedSince(targets, now),
      tied,
      notKept: notKeptYet(tied, now.since),
    };
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

  const names = (files: KeptFile[]) =>
    files.map((f) => f.owner_name).join(", ");

  onMount(read);
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
          {#each patches.patched as change (change.file)}
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

  .patched li {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 10px;
  }

  .mark {
    color: var(--colour-accent);
  }
</style>
