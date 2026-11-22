<script lang="ts">
  import { untrack } from "svelte";
  import { t } from "../i18n/runtime";
  import { openDialog } from "../navigation/navigation.svelte";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import Pager from "../shell/Pager.svelte";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import { heard, started } from "../shell/progress";
  import type { Failure } from "../shell/types";
  import {
    COMMITS_PER_PAGE,
    readCommits,
    type CommitsPage,
  } from "./desktopClient";
  import { formatDay, shortHash } from "./presentation";

  /**
   * A repository's commits, newest first, for one that keeps no changelog (0.53.0; the owner's choice of 23 Nov 2026, so Workers &
   * Resources' textures can be seen): each opens the code viewer on what it changed, pictures and textures included.
   */
  let {
    game,
    repository,
    page,
    onturn,
  }: {
    game: string;
    repository: string;
    page: number;
    onturn: (page: number) => void;
  } = $props();

  let reading = $state<
    | { state: "reading" }
    | { state: "failed"; failure: Failure }
    | { state: "ready"; found: CommitsPage }
  >({ state: "reading" });
  let progress = $state(started());

  async function load(skip: number) {
    reading = { state: "reading" };
    progress = started();
    reading = await readCommits(game, repository, skip, (message) => {
      progress = heard(progress, message);
    });
  }

  $effect(() => {
    const skip = (Math.max(1, page) - 1) * COMMITS_PER_PAGE;
    void repository;
    untrack(() => void load(skip));
  });

  function show(commit: CommitsPage["commits"][number]) {
    openDialog({
      kind: "code",
      request: {
        repository,
        changelog: "",
        product: repository,
        entry: {
          version: "",
          section: "",
          text: commit.subject,
          lead: commit.subject,
        },
        commit: commit.hash,
      },
    });
  }
</script>

<p class="lead">{t("changes-commits-lead", { repository })}</p>
{#if reading.state === "reading"}
  <ProgressBar {progress} fallback={t("changes-commits-reading")} />
{:else if reading.state === "failed"}
  <FailurePanel
    failure={reading.failure}
    onretry={() => load((page - 1) * COMMITS_PER_PAGE)}
  />
{:else}
  {@const found = reading.found}
  {#if found.total === 0}
    <p class="muted">{t("changes-commits-none")}</p>
  {:else}
    <Pager
      page={Math.floor(found.skip / COMMITS_PER_PAGE) + 1}
      pages={Math.max(1, Math.ceil(found.total / COMMITS_PER_PAGE))}
      first={found.skip + 1}
      last={found.skip + found.commits.length}
      total={found.total}
      label={t("changes-commits-pages", { repository })}
      onchange={onturn}
    />
    <ul class="commits">
      {#each found.commits as commit (commit.hash)}
        <li>
          <div class="text">
            <strong>{commit.subject}</strong>
            <span class="muted small"
              >{t("changes-commit-facts", {
                hash: shortHash(commit.hash),
                day: formatDay(commit.time),
                files: commit.files,
                binary: commit.binary,
              })}</span
            >
          </div>
          <button
            type="button"
            class="action"
            aria-label={t("code-show-for", { entry: commit.subject })}
            onclick={() => show(commit)}>{t("code-show")}</button
          >
        </li>
      {/each}
    </ul>
  {/if}
{/if}

<style>
  .commits {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 8px 0;
    padding: 0;
    list-style: none;
  }

  .commits li {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 6px 14px;
    padding: 8px 12px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .text strong {
    overflow-wrap: anywhere;
  }

  .small {
    font-size: var(--type-small);
  }
</style>
