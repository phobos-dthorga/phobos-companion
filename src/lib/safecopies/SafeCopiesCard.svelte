<script lang="ts">
  import { onMount } from "svelte";
  import { LOCALE, t } from "../i18n/runtime";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import { heard, started } from "../shell/progress";
  import { formatWhen } from "../shell/dates";
  import { formatSize } from "../shell/sizes";
  import { checkCopies, copyNow, readSafeCopies } from "./desktopClient";
  import {
    cellKey,
    checkCounts,
    copyCounts,
    setName,
    summarise,
    wantsCopy,
  } from "./presentation";
  import type { CopyReading, SafeCopiesReading, SafeSet } from "./types";

  /**
   * Safe copies on Home (0.42.0; the owner, 21 Nov 2026): for each of the game's repositories that lists what cannot be made again
   * (training sets, style models, notes), whether each is copied, changed since its copy, or never copied, at each place the copies
   * go. Copy now copies what changed and sends the repository's copy; Check the copies hashes every copy again. Hidden in the
   * browser; a game that lists none is told so in one line.
   */
  let { game }: { game: string } = $props();

  let reading = $state<SafeCopiesReading>({ state: "reading" });
  let progress = $state(started());
  let busy = $state<string | null>(null);
  let said = $state<Record<string, string>>({});

  async function read() {
    progress = started();
    reading = await readSafeCopies(game, (m) => {
      progress = heard(progress, m);
    });
  }

  onMount(() => {
    void read();
  });

  // A host that answers with no list (one from before 0.42.0) counts as listing none.
  const summary = $derived(
    reading.state === "ready"
      ? summarise(
          Array.isArray(reading.repositories) ? reading.repositories : [],
        )
      : null,
  );

  function cell(set: SafeSet, destination: string): string {
    const state = set.destinations[destination];
    if (!state) return "";
    const found = cellKey(state);
    return t(found.key, {
      when: found.when ? formatWhen(found.when) : "",
      count: found.count,
    });
  }

  function destinationWords(name: string): string {
    return name === "repository"
      ? t("safe-copies-destination-repository")
      : t("safe-copies-destination-local");
  }

  /** A failure's words, even from a host too old to know the request (its answer then has no detail). */
  function reasonOf(failure: { detail?: string } | null | undefined): string {
    return failure?.detail ?? String(failure ?? "");
  }

  function sayCopy(answer: CopyReading): string {
    if (answer.state === "failed")
      return t("safe-copies-failed", { reason: reasonOf(answer.failure) });
    if (!answer.result.ok)
      return t("safe-copies-failed", { reason: answer.result.refusal ?? "" });
    const counts = copyCounts(answer.result);
    const parts = [
      t("safe-copies-copied", {
        copied: counts.copied,
        size: formatSize(counts.bytes, LOCALE),
        same: counts.same,
      }),
    ];
    if (counts.sent === "sent") parts.push(t("safe-copies-sent"));
    if (counts.firstProblem)
      parts.push(
        t("safe-copies-problems", {
          count: counts.failed,
          first: counts.firstProblem,
        }),
      );
    return parts.join(" ");
  }

  function sayCheck(answer: CopyReading): string {
    if (answer.state === "failed")
      return t("safe-copies-check-failed", {
        reason: reasonOf(answer.failure),
      });
    const counts = checkCounts(answer.result);
    return counts.problems
      ? t("safe-copies-checked-problems", {
          count: counts.problems,
          first: counts.firstProblem ?? "",
        })
      : t("safe-copies-checked-whole", { count: counts.checked });
  }

  async function act(repository: string, kind: "copy" | "check") {
    busy = `${repository}:${kind}`;
    progress = started();
    const hear = (m: Parameters<typeof heard>[1]) => {
      progress = heard(progress, m);
    };
    const answer =
      kind === "copy"
        ? await copyNow(game, repository, hear)
        : await checkCopies(game, repository, hear);
    said = {
      ...said,
      [repository]: kind === "copy" ? sayCopy(answer) : sayCheck(answer),
    };
    if (kind === "copy") {
      // A read again keeps its bar on screen until the new state is in.
      busy = `${repository}:read`;
      const fresh = await readSafeCopies(game, hear);
      if (fresh.state === "ready") reading = fresh;
    }
    busy = null;
  }

  function busyWords(state: string): string {
    if (state.endsWith(":copy")) return t("safe-copies-copying");
    if (state.endsWith(":check")) return t("safe-copies-checking");
    return t("safe-copies-reading");
  }
</script>

{#if reading.state === "ready" || reading.state === "failed"}
  <section
    class="panel"
    class:attention={summary !== null &&
      (summary.never > 0 || summary.changed > 0)}
    aria-labelledby="safe-copies-title"
  >
    <h2 id="safe-copies-title">
      {#if summary && (summary.never > 0 || summary.changed > 0)}<span
          aria-hidden="true">◆</span
        >{/if}
      {t("safe-copies-title")}
    </h2>
    {#if reading.state === "failed"}
      <p>{t("safe-copies-unread", { reason: reasonOf(reading.failure) })}</p>
    {:else if !Array.isArray(reading.repositories) || reading.repositories.length === 0}
      <p class="muted">{t("safe-copies-none")}</p>
    {:else}
      <p class="lead">{t("safe-copies-body")}</p>
      {#if summary}
        <p>
          {#if summary.never > 0}{t("safe-copies-never", {
              count: summary.never,
            })}{/if}
          {#if summary.changed > 0}{t("safe-copies-changed", {
              count: summary.changed,
            })}{/if}
          {#if summary.never === 0 && summary.changed === 0}{t(
              "safe-copies-all-copied",
            )}{/if}
        </p>
      {/if}
      {#each reading.repositories as found (found.repository)}
        {@const destinations = found.status.destinations}
        {#if reading.repositories.length > 1}
          <h3>
            {t("safe-copies-repository", { repository: found.repository })}
          </h3>
        {/if}
        <table>
          <thead>
            <tr>
              <th scope="col">{t("safe-copies-set")}</th>
              <th scope="col">{t("safe-copies-kind")}</th>
              <th scope="col">{t("safe-copies-size")}</th>
              {#each destinations as destination (destination.name)}
                <th scope="col">{destinationWords(destination.name)}</th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each found.status.sets as set (`${set.set}/${set.unit}`)}
              <tr class:wants={wantsCopy(set)}>
                <th scope="row">{setName(set)}</th>
                <td title={set.why}>
                  {set.kind === "own"
                    ? t("safe-copies-kind-own")
                    : t("safe-copies-kind-game-derived")}
                </td>
                <td>{formatSize(set.bytes, LOCALE)}</td>
                {#each destinations as destination (destination.name)}
                  <td>{cell(set, destination.name)}</td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
        <ul class="small destinations">
          {#each destinations as destination (destination.name)}
            <li>
              {destination.problem
                ? t("safe-copies-destination-problem", {
                    name: destinationWords(destination.name),
                    problem: destination.problem,
                  })
                : t("safe-copies-destination-ready", {
                    name: destinationWords(destination.name),
                    folder: destination.folder,
                  })}
            </li>
          {/each}
        </ul>
        {#if busy?.startsWith(`${found.repository}:`)}
          <ProgressBar {progress} fallback={busyWords(busy)} />
        {:else}
          <div class="buttons">
            <button
              type="button"
              class="action"
              disabled={busy !== null}
              onclick={() => act(found.repository, "copy")}
              >{t("safe-copies-copy")}</button
            >
            <button
              type="button"
              class="action"
              disabled={busy !== null}
              onclick={() => act(found.repository, "check")}
              >{t("safe-copies-check")}</button
            >
          </div>
        {/if}
        {#if said[found.repository]}
          <p class="small" role="status">{said[found.repository]}</p>
        {/if}
      {/each}
    {/if}
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

  .panel.attention {
    border: 2px solid var(--colour-accent);
    padding: 19px 23px;
  }

  .attention h2 span {
    color: var(--colour-accent);
  }

  h2 {
    margin-bottom: 8px;
    font-family: var(--font-display);
    font-size: 1.375rem;
    font-weight: 600;
  }

  h3 {
    margin: 12px 0 6px;
    font-size: 1rem;
    font-weight: 600;
  }

  p {
    margin-bottom: 10px;
  }

  table {
    width: 100%;
    margin-bottom: 8px;
    border-collapse: collapse;
  }

  th,
  td {
    padding: 6px 8px;
    border-bottom: 1px solid var(--colour-line);
    text-align: left;
    vertical-align: top;
  }

  tr.wants th[scope="row"] {
    font-weight: 700;
  }

  .destinations {
    margin: 0 0 10px;
    padding-left: 18px;
    overflow-wrap: anywhere;
  }

  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 8px;
  }
</style>
