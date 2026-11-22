<script lang="ts">
  import { VERSION } from "../about/version";
  import type { LogData, Signature } from "../logs/types";
  import { t } from "../i18n/runtime";
  import { pointsAt } from "../logs/presentation";
  import {
    openIssue,
    openTheirForm,
    readTheirReports,
    reportOurs,
  } from "./desktopClient";
  import {
    placesFor,
    reportBody,
    reportTitle,
    searchWords,
  } from "./reportText";
  import type { ReportPlace, TheirIssue } from "./types";

  /**
   * Report links on one fault of the Logs page (0.65.0; `docs/online.md`, O4; the owner's choice: the Logs page only). For a mod
   * of ours, **Report this on GitHub** opens our repository's new-issue form filled in; for another author's mod with known
   * public source, **Their reports** lists their issues (those naming the fault's words first) and **Their new-issue form** opens
   * it blank, as `rules/reports.md` asks. Nothing is ever posted: the person reads the form and sends it themselves.
   */
  let {
    game,
    signature,
    places,
    log,
  }: {
    game: string;
    signature: Signature;
    places: ReportPlace[];
    log: LogData["log"];
  } = $props();

  const SHOWN = 8;

  const mine = $derived(placesFor(pointsAt(signature), places));
  let busy = $state(false);
  let said = $state<{ ok: boolean; words: string } | null>(null);
  let listed = $state<Record<string, TheirIssue[]>>({});

  async function reportToOurs(place: ReportPlace) {
    if (!place.repository) return;
    busy = true;
    said = null;
    const answer = await reportOurs(
      game,
      place.repository,
      reportTitle(signature),
      reportBody(signature, log, VERSION),
    );
    busy = false;
    if (answer.state !== "ready") {
      said = {
        ok: false,
        words: t("report-failed", { reason: answer.failure.detail }),
      };
      return;
    }
    if (answer.clipboard) {
      try {
        await navigator.clipboard.writeText(answer.clipboard);
        said = { ok: true, words: t("report-opened-paste") };
      } catch {
        said = { ok: false, words: t("report-opened-no-clipboard") };
      }
    } else said = { ok: true, words: t("report-opened") };
  }

  async function theirReports(place: ReportPlace) {
    if (!place.repository) return;
    busy = true;
    said = null;
    const answer = await readTheirReports(
      game,
      place.repository,
      searchWords(signature),
    );
    busy = false;
    if (answer.state !== "ready") {
      said = {
        ok: false,
        words: t("report-failed", { reason: answer.failure.detail }),
      };
      return;
    }
    listed = { ...listed, [place.repository]: answer.issues };
  }

  async function press(work: Promise<{ state: string }>) {
    said = null;
    const answer = await work;
    if (answer.state !== "ready")
      said = {
        ok: false,
        words: t("report-failed", {
          reason:
            (answer as { failure?: { detail: string } }).failure?.detail ?? "",
        }),
      };
  }
</script>

{#if mine.length > 0}
  <div class="report-links">
    {#each mine as place (`${place.whose}|${place.repository}`)}
      {@const repository = place.repository ?? ""}
      <div class="place">
        {#if place.whose === "ours"}
          <span class="small"
            >{t("report-ours", { mod: place.mod, repository })}</span
          >
          <button
            type="button"
            class="action"
            disabled={busy}
            onclick={() => void reportToOurs(place)}
            >{t("report-ours-button")}</button
          >
        {:else}
          <span class="small"
            >{t("report-theirs", { mod: place.mod, repository })}</span
          >
          <button
            type="button"
            class="action"
            disabled={busy}
            onclick={() => void theirReports(place)}
            >{t("report-theirs-list")}</button
          >
          <button
            type="button"
            class="action"
            onclick={() => void press(openTheirForm(game, repository))}
            >{t("report-theirs-form")}</button
          >
        {/if}
      </div>
      {#if listed[repository]}
        {@const issues = listed[repository]}
        {#if issues.length === 0}
          <p class="small muted">{t("report-theirs-none")}</p>
        {:else}
          <ul class="issues">
            {#each issues.slice(0, SHOWN) as issue (issue.number)}
              <li>
                <button
                  type="button"
                  class="link"
                  onclick={() =>
                    void press(openIssue(game, repository, issue.number))}
                  >#{issue.number} {issue.title}</button
                >
                <span class="small muted">
                  {t(issue.state === "open" ? "report-open" : "report-closed")}
                  {#if issue.matches}· {t("report-matches")}{/if}
                </span>
              </li>
            {/each}
          </ul>
        {/if}
      {/if}
    {/each}
    <p class="small muted">{t("report-never-posts")}</p>
    <div aria-live="polite">
      {#if said}
        <p class={said.ok ? "told" : "told refused"} role="status">
          {said.words}
        </p>
      {/if}
    </div>
  </div>
{/if}

<style>
  .report-links {
    margin: 8px 0;
    padding: 8px 12px;
    border-inline-start: 3px solid var(--colour-accent);
    background: var(--shade-accent);
  }

  .place {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 10px;
    align-items: center;
    margin-bottom: 6px;
  }

  .issues {
    margin: 4px 0 8px;
    padding-inline-start: 20px;
  }

  .told {
    margin-top: 6px;
    padding: 4px 8px;
    border: 1px solid var(--colour-success);
    border-radius: 4px;
  }

  .told.refused {
    border-color: var(--colour-risk);
  }
</style>
