<script lang="ts">
  import { t } from "../i18n/runtime";
  import { goPage } from "../navigation/navigation.svelte";
  import { formatDate, formatTime, formatWhen } from "../shell/dates";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import { heard, started, type ProgressState } from "../shell/progress";
  import { readRepoStatus } from "./desktopClient";
  import {
    callsLeft,
    failedWorkflows,
    lateNightly,
    lightKey,
    markOf,
    oldestStale,
    toneOf,
  } from "./presentation";
  import type { RepoStatus, RepoStatusAnswer } from "./types";

  /**
   * Home's gate lights (0.61.0; `docs/online.md`, O4): for each of the game's repositories, commits not pushed, files changed,
   * and whether GitHub's checks passed for its last push and its nightly runs still run. Home's own look is automatic (the kit
   * asks GitHub only what may have changed); **Look now** is a press. With Gate lights off in Settings → Going online, only what
   * git knows is shown, and the panel says so. Nothing shows for a game with no repositories.
   */
  let { game }: { game: string } = $props();

  let lights = $state<RepoStatusAnswer | null>(null);
  let failed = $state<string | null>(null);
  let progress = $state<ProgressState | null>(null);

  async function look(pressed: boolean) {
    const asked = game;
    failed = null;
    if (pressed) progress = started();
    const answer = await readRepoStatus(asked, pressed, (message) => {
      if (progress) progress = heard(progress, message);
    });
    progress = null;
    if (asked !== game) return;
    if (answer.state === "ready") lights = answer.lights;
    else if (answer.state === "failed") failed = answer.failure.detail;
  }

  $effect(() => {
    lights = null;
    void look(false);
  });

  const stale = $derived(lights ? oldestStale(lights) : null);
  const left = $derived(lights ? callsLeft(lights) : null);

  function localWords(repo: RepoStatus): string[] {
    const words: string[] = [];
    if (repo.ahead) words.push(t("lights-not-pushed", { count: repo.ahead }));
    if (repo.behind) words.push(t("lights-behind", { count: repo.behind }));
    if (repo.changed) words.push(t("lights-changed", { count: repo.changed }));
    return words;
  }

  function openSwitch() {
    goPage("settings", { panel: "online" });
  }

  function askedWhen(seconds: number): string {
    const date = new Date(seconds * 1000);
    return `${formatDate(date)}, ${formatTime(date)}`;
  }
</script>

{#if lights && lights.repositories.length > 0}
  <section class="panel" aria-labelledby="lights-title">
    <h2 id="lights-title">{t("lights-title")}</h2>
    {#if !lights.switchedOn}
      <p class="small off">{t("lights-off")}</p>
    {/if}
    <ul class="repos">
      {#each lights.repositories as repo (repo.root)}
        {@const checks = repo.checks}
        <li>
          <span class="name">{repo.name}</span>
          {#if checks}
            <span class="light {toneOf(checks.state)}">
              <span aria-hidden="true">{markOf(checks.state)}</span>
              {t(
                lightKey(checks.state),
              )}{#if failedWorkflows(checks).length > 0}: {failedWorkflows(
                  checks,
                ).join(", ")}{/if}
            </span>
          {/if}
          {#each localWords(repo) as words, index (index)}
            <span class="local small">{words}</span>
          {/each}
          {#each lateNightly(repo.nightly) as night (night.workflow)}
            <div class="late small">
              {t("lights-nightly-late", {
                workflow: night.workflow,
                when: formatWhen(night.when),
              })}
            </div>
          {/each}
          {#if checks?.state === "unknown" && checks.why}
            <div class="muted small">{checks.why}</div>
          {/if}
        </li>
      {/each}
    </ul>
    {#if stale !== null}
      <p class="small as-of" role="status">
        {t("lights-as-of", { when: askedWhen(stale) })}
      </p>
    {/if}
    {#if lights.limited}
      <p class="muted small">{lights.limited}</p>
    {/if}
    {#if progress}
      <ProgressBar {progress} fallback={t("lights-looking")} />
    {/if}
    <div class="actions">
      {#if lights.switchedOn}
        <button
          type="button"
          class="action"
          disabled={progress !== null}
          onclick={() => void look(true)}
          >{progress ? t("lights-looking") : t("lights-look-now")}</button
        >
      {/if}
      <button type="button" class="action quiet" onclick={openSwitch}
        >{t("lights-settings")}</button
      >
    </div>
    {#if left}
      <p class="muted small">
        {t("lights-calls-left", { remaining: left.remaining, size: left.size })}
      </p>
    {/if}
  </section>
{:else if failed}
  <section class="panel" aria-labelledby="lights-title">
    <h2 id="lights-title">{t("lights-title")}</h2>
    <p class="small failed">{t("lights-failed", { reason: failed })}</p>
  </section>
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
    margin-bottom: 8px;
    font-family: var(--font-display);
    font-size: 1.375rem;
    font-weight: 600;
  }

  .repos {
    margin: 0 0 10px;
    padding: 0;
    list-style: none;
  }

  .repos li {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    align-items: baseline;
    padding: 6px 0;
    border-bottom: 1px solid var(--colour-line);
  }

  .name {
    font-weight: 600;
    min-width: 12em;
  }

  .light {
    padding: 1px 8px;
    border-radius: 4px;
    border-inline-start: 3px solid var(--colour-line);
  }

  .light.good {
    border-inline-start-color: var(--colour-success);
    background: var(--shade-success);
  }

  .light.bad {
    border-inline-start-color: var(--colour-risk);
    background: var(--shade-risk);
  }

  .light.busy {
    border-inline-start-color: var(--colour-accent);
    background: var(--shade-accent);
  }

  .local {
    color: var(--colour-text-muted);
  }

  .late,
  .failed,
  .off {
    flex-basis: 100%;
    padding-inline-start: 8px;
    border-inline-start: 3px solid var(--colour-risk);
  }

  .off {
    border-inline-start-color: var(--colour-line);
  }

  .as-of {
    padding-inline-start: 8px;
    border-inline-start: 3px solid var(--colour-observed);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 8px 0;
  }
</style>
