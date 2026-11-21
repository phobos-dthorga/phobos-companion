<script lang="ts">
  import { onMount } from "svelte";
  import { LOCALE, t } from "../i18n/runtime";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import { heard, started } from "../shell/progress";
  import { formatWhen } from "../shell/dates";
  import { formatSize } from "../shell/sizes";
  import { pickPath } from "../settings/desktopClient";
  import {
    checkCopies,
    copyNow,
    letGoCopy,
    readSafeCopies,
    restoreCopies,
  } from "./desktopClient";
  import {
    cellKey,
    checkCounts,
    copyCounts,
    kindKey,
    setName,
    summarise,
    wantsCopy,
  } from "./presentation";
  import type {
    CopyReading,
    KeptOnly,
    SafeCopiesReading,
    SafeSet,
  } from "./types";

  /** A move waiting for the owner's yes on the card (0.43.0): restoring a set into a picked folder, or letting a copy go. */
  type Pending =
    | {
        kind: "restore";
        repository: string;
        set: string;
        unit: string | null;
        name: string;
        bytes: number;
        to: string;
        overwrite: boolean;
      }
    | { kind: "let-go"; repository: string; copy: KeptOnly };

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
  let pending = $state<Pending | null>(null);
  /** After a restore that found different files in the folder: the same restore, offered again to replace the older ones. */
  let replaceOffer = $state<Pending | null>(null);

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
    if (state.endsWith(":restore")) return t("safe-copies-restoring");
    if (state.endsWith(":let-go")) return t("safe-copies-letting-go");
    return t("safe-copies-reading");
  }

  function hearing() {
    return (m: Parameters<typeof heard>[1]) => {
      progress = heard(progress, m);
    };
  }

  /** Restore…: Windows' own folder picker, then a yes on the card before anything is copied. */
  async function chooseRestore(repository: string, set: SafeSet) {
    replaceOffer = null;
    const picked = await pickPath(
      "folder",
      t("safe-copies-restore-pick", { name: setName(set) }),
      null,
    );
    if (picked.state === "failed") {
      said = {
        ...said,
        [repository]: t("safe-copies-restore-failed", {
          reason: reasonOf(picked.failure),
        }),
      };
      return;
    }
    if (picked.state !== "picked") return;
    pending = {
      kind: "restore",
      repository,
      set: set.set,
      unit: set.unit,
      name: setName(set),
      bytes: set.bytes,
      to: picked.path,
      overwrite: false,
    };
  }

  async function confirm(chosen: Pending) {
    pending = null;
    replaceOffer = null;
    busy = `${chosen.repository}:${chosen.kind}`;
    progress = started();
    if (chosen.kind === "restore") {
      const answer = await restoreCopies(
        game,
        chosen.repository,
        chosen.set,
        chosen.unit,
        chosen.to,
        chosen.overwrite,
        hearing(),
      );
      if (answer.state === "failed") {
        said = {
          ...said,
          [chosen.repository]: t("safe-copies-restore-failed", {
            reason: reasonOf(answer.failure),
          }),
        };
      } else if (!answer.result.ok) {
        said = {
          ...said,
          [chosen.repository]: t("safe-copies-restore-failed", {
            reason: answer.result.refusal ?? "",
          }),
        };
        // Different files are in the way: offer to replace the older ones. The tools never replace a newer one from here.
        if (!chosen.overwrite) replaceOffer = { ...chosen, overwrite: true };
      } else {
        said = {
          ...said,
          [chosen.repository]: t("safe-copies-restored", {
            count: answer.result.data.restored ?? 0,
            same: answer.result.data.same ?? 0,
            folder: chosen.to,
          }),
        };
      }
    } else {
      const answer = await letGoCopy(
        game,
        chosen.repository,
        chosen.copy.key,
        hearing(),
      );
      const failed =
        answer.state === "failed"
          ? reasonOf(answer.failure)
          : answer.result.ok
            ? null
            : (answer.result.refusal ?? "");
      said = {
        ...said,
        [chosen.repository]:
          failed === null
            ? t("safe-copies-let-go-done", { copy: chosen.copy.key })
            : t("safe-copies-let-go-failed", { reason: failed }),
      };
      busy = `${chosen.repository}:read`;
      const fresh = await readSafeCopies(game, hearing());
      if (fresh.state === "ready") reading = fresh;
    }
    busy = null;
  }

  /** Commits the repository's copy holds that its remote has not had yet, across every repository (kit 1.69.0). */
  const unsentCount = $derived(
    reading.state === "ready" && Array.isArray(reading.repositories)
      ? reading.repositories
          .flatMap((r) => r.status.destinations)
          .reduce((n, d) => n + (d.unsent ?? 0), 0)
      : 0,
  );
</script>

{#if reading.state === "ready" || reading.state === "failed"}
  <section
    class="panel"
    class:attention={(summary !== null &&
      (summary.never > 0 || summary.changed > 0)) ||
      unsentCount > 0}
    aria-labelledby="safe-copies-title"
  >
    <h2 id="safe-copies-title">
      {#if (summary && (summary.never > 0 || summary.changed > 0)) || unsentCount > 0}<span
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
              <th scope="col">{t("safe-copies-restore-column")}</th>
            </tr>
          </thead>
          <tbody>
            {#each found.status.sets as set (`${set.set}/${set.unit}`)}
              <tr class:wants={wantsCopy(set)}>
                <th scope="row">{setName(set)}</th>
                <td title={set.why}>
                  {t(kindKey(set.kind))}
                </td>
                <td>{formatSize(set.bytes, LOCALE)}</td>
                {#each destinations as destination (destination.name)}
                  <td>{cell(set, destination.name)}</td>
                {/each}
                <td>
                  {#if Object.values(set.destinations).some((d) => d.state === "copied" || d.state === "changed since")}
                    <button
                      type="button"
                      class="action"
                      disabled={busy !== null}
                      aria-label={t("safe-copies-restore-named", {
                        name: setName(set),
                      })}
                      onclick={() => chooseRestore(found.repository, set)}
                      >{t("safe-copies-restore")}</button
                    >
                  {/if}
                </td>
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
              {#if (destination.unsent ?? 0) > 0}
                <strong
                  >{t("safe-copies-unsent", {
                    count: destination.unsent ?? 0,
                  })}</strong
                >
              {/if}
            </li>
          {/each}
        </ul>
        {#if (found.status.keptOnly ?? []).length > 0}
          <h3>{t("safe-copies-kept-title")}</h3>
          <p class="small">{t("safe-copies-kept-lead")}</p>
          <ul class="kept">
            {#each found.status.keptOnly ?? [] as copy (copy.key)}
              <li>
                <span
                  >{t("safe-copies-kept-row", {
                    copy: copy.key,
                    why: copy.why,
                    size: formatSize(copy.bytes + copy.earlierBytes, LOCALE),
                    earlier: copy.earlier,
                  })}</span
                >
                <button
                  type="button"
                  class="action"
                  disabled={busy !== null}
                  aria-label={t("safe-copies-let-go-named", { copy: copy.key })}
                  onclick={() => {
                    replaceOffer = null;
                    pending = {
                      kind: "let-go",
                      repository: found.repository,
                      copy,
                    };
                  }}>{t("safe-copies-let-go")}</button
                >
              </li>
            {/each}
          </ul>
        {/if}
        {#if pending && pending.repository === found.repository}
          {@const waiting = pending}
          <div
            class="confirm"
            role="group"
            aria-label={t("safe-copies-confirm-label")}
          >
            <p>
              {#if waiting.kind === "restore"}
                {t("safe-copies-restore-confirm", {
                  name: waiting.name,
                  size: formatSize(waiting.bytes, LOCALE),
                  folder: waiting.to,
                })}
              {:else}
                {t("safe-copies-let-go-confirm", {
                  copy: waiting.copy.key,
                  earlier: waiting.copy.earlier,
                })}
              {/if}
            </p>
            <div class="buttons">
              <button
                type="button"
                class="action"
                onclick={() => confirm(waiting)}
                >{waiting.kind === "restore"
                  ? t("safe-copies-restore-yes")
                  : t("safe-copies-let-go-yes")}</button
              >
              <button
                type="button"
                class="action"
                onclick={() => {
                  pending = null;
                }}>{t("safe-copies-cancel")}</button
              >
            </div>
          </div>
        {/if}
        {#if replaceOffer && replaceOffer.repository === found.repository && !busy}
          {@const again = replaceOffer}
          <div
            class="confirm"
            role="group"
            aria-label={t("safe-copies-confirm-label")}
          >
            <p>{t("safe-copies-replace-lead")}</p>
            <div class="buttons">
              <button
                type="button"
                class="action"
                onclick={() => confirm(again)}
                >{t("safe-copies-replace-yes")}</button
              >
              <button
                type="button"
                class="action"
                onclick={() => {
                  replaceOffer = null;
                }}>{t("safe-copies-cancel")}</button
              >
            </div>
          </div>
        {/if}
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

  .kept {
    display: grid;
    gap: 6px;
    margin: 0 0 10px;
    padding: 0;
    list-style: none;
    overflow-wrap: anywhere;
  }

  .kept li {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 10px;
  }

  .confirm {
    margin: 8px 0 10px;
    padding: 10px 14px;
    border-inline-start: 3px solid var(--colour-accent);
    background: var(--colour-surface-soft);
    overflow-wrap: anywhere;
  }
</style>
