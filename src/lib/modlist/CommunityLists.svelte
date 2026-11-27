<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import { heard, started } from "../shell/progress";
  import { readCommunityLists } from "./desktopClient";
  import type { CommunityList, CommunityLists } from "./types";

  /**
   * Community lists (0.112.0; the owner's choice of 28 Nov 2026, "Own data + your rules", so RimSort can retire): the lists the
   * community keeps that the sorter and the check read, whose copy is read (the Companion's or RimSort's, whichever is newer) and
   * how old each is. **Fetch them now** fetches them from GitHub, while Community lists is on in Going online.
   */
  let { game }: { game: string } = $props();

  let lists = $state<CommunityLists | null>(null);
  let busy = $state(false);
  let progress = $state(started());
  let said = $state<{ text: string; refused: boolean } | null>(null);

  async function read(fetch: boolean) {
    said = null;
    busy = fetch;
    if (fetch) progress = started(t("modlist-lists-fetching"));
    const answer = await readCommunityLists(game, fetch, false, (m) => {
      progress = heard(progress, m);
    });
    busy = false;
    if (answer.state === "failed") {
      said = {
        text: t("modlist-lists-refused", { reason: answer.failure.detail }),
        refused: true,
      };
      return;
    }
    lists = answer.lists;
    if (!fetch) return;
    const failed = answer.lists.fetched.filter((f) => f.error);
    said = failed.length
      ? {
          text: t("modlist-lists-some-failed", {
            reason: failed.map((f) => `${f.label}: ${f.error}`).join("; "),
          }),
          refused: true,
        }
      : {
          text: t("modlist-lists-fetched", {
            fetched: answer.lists.fetched.reduce((n, f) => n + f.fetched, 0),
            unchanged: answer.lists.fetched.reduce(
              (n, f) => n + f.unchanged,
              0,
            ),
          }),
          refused: false,
        };
  }

  function whose(row: CommunityList, manager: string): string {
    if (row.read === "ours") return t("modlist-lists-ours");
    if (row.read === "theirs") return t("modlist-lists-theirs", { manager });
    return t("modlist-lists-none");
  }

  onMount(() => {
    void read(false);
  });
</script>

{#if lists && lists.databases.length > 0}
  <section class="lists" aria-labelledby="community-lists-title">
    <h3 id="community-lists-title">{t("modlist-lists-title")}</h3>
    <p class="muted">
      {t("modlist-lists-intro", {
        manager: lists.manager,
        days: lists.freshDays,
      })}
    </p>
    {#if said}
      <p class="told" class:refused={said.refused} role="status">
        {said.text}
      </p>
    {/if}
    {#if busy}
      <ProgressBar {progress} fallback={t("modlist-lists-fetching")} />
    {/if}
    <table>
      <thead>
        <tr>
          <th scope="col">{t("modlist-lists-list")}</th>
          <th scope="col">{t("modlist-lists-read")}</th>
          <th scope="col">{t("modlist-lists-age")}</th>
        </tr>
      </thead>
      <tbody>
        {#each lists.databases as row (row.name)}
          <tr>
            <th scope="row"
              >{row.label}<span class="muted small from"
                >github.com/{row.repo} · {row.licence}</span
              ></th
            >
            <td>{whose(row, lists.manager)}</td>
            <td class:stale={row.stale}
              >{row.age_days === null
                ? ""
                : t("modlist-lists-days", {
                    days: row.age_days,
                  })}{#if row.stale}
                · {t("modlist-lists-stale", { days: lists.freshDays })}{/if}</td
            >
          </tr>
        {/each}
      </tbody>
    </table>
    <button
      type="button"
      class="action"
      disabled={busy}
      onclick={() => read(true)}>{t("modlist-lists-fetch")}</button
    >
  </section>
{/if}

<style>
  .lists {
    margin-top: 20px;
  }

  table {
    width: 100%;
    margin-bottom: 12px;
    border-collapse: collapse;
  }

  th,
  td {
    padding: 6px 8px;
    text-align: left;
    vertical-align: top;
    border-bottom: 1px solid var(--colour-line);
  }

  .from {
    display: block;
    font-weight: normal;
  }

  .stale {
    font-weight: 600;
  }

  .told {
    margin-bottom: 12px;
  }

  .told.refused {
    color: var(--colour-risk);
  }
</style>
