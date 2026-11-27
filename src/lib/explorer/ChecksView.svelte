<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import ReportView from "../reports/ReportView.svelte";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import Placeholder from "../shell/Placeholder.svelte";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import { heard, started } from "../shell/progress";
  import { formatClock } from "../memory/presentation";
  import { formatCount } from "./presentation";
  import { explorer, question, remembered } from "./snapshot.svelte";
  import type { AnswerReading, ChecksAnswer } from "./types";

  /**
   * The live checks (0.91.0; the owner's choice of 25 Nov 2026, phobos-rimworld's docs/development/test-automation.md): every rule
   * the game's repositories keep for the running game (their `config/checks.json`, the tools' "live" checks), asked of the snapshot
   * already held, so it takes no second pause. What breaks a rule is listed, worst first, by the tools' own report. A finding is
   * something to look at, never a test; the snapshot holds one instant, garbage not yet collected included.
   */
  const REQUEST = { op: "checks" } as const;

  /** 0.102.0: an answer already read with the game frozen, shown as it is; with none, the snapshot held is asked. */
  let {
    given = null,
    frozenAt = null,
  }: { given?: ChecksAnswer | null; frozenAt?: number | null } = $props();

  // 0.103.0: asked while browsing frozen, it is one frozen read of its own.
  const frozenSession = $derived(explorer.held?.frozen === true);
  let readAt = $state(Date.now());

  let reading = $state<AnswerReading<ChecksAnswer>>({ state: "reading" });
  let progress = $state(started());

  const answer = $derived(
    reading.state === "ready" && reading.answer.ok ? reading.answer.data : null,
  );

  async function load() {
    if (given) {
      reading = {
        state: "ready",
        answer: { ok: true, data: given, error: null, released: null },
      };
      return;
    }
    const known = remembered<ChecksAnswer>(REQUEST);
    if (known) {
      reading = { state: "ready", answer: known };
      return;
    }
    reading = { state: "reading" };
    progress = started();
    readAt = Date.now();
    reading = await question<ChecksAnswer>(REQUEST, (message) => {
      progress = heard(progress, message);
    });
  }

  onMount(() => void load());
</script>

<section class="view" aria-labelledby="explorer-checks">
  <h2 id="explorer-checks">{t("explorer-checks-title")}</h2>
  <p class="small">
    {given || frozenSession
      ? t("explorer-frozen-lead", {
          when: formatClock((frozenAt ?? readAt) / 1000),
        })
      : t("explorer-checks-lead")}
  </p>
  {#if reading.state === "reading"}
    <ProgressBar {progress} fallback={t("explorer-bar-checks")} />
    <Placeholder shape="rows" rows={4} />
  {:else if reading.state === "failed"}
    <FailurePanel failure={reading.failure} onretry={() => void load()} />
  {:else if reading.state === "ready" && !reading.answer.ok && !reading.answer.released}
    <p class="said wrong" role="status">
      {t("explorer-could-not-answer", { reason: reading.answer.error ?? "" })}
    </p>
    <button type="button" class="action" onclick={() => void load()}
      >{t("action-try-again")}</button
    >
  {:else if answer}
    <dl class="tiles">
      <div class="tile">
        <dt>{t("explorer-checks-tile-checks")}</dt>
        <dd>{formatCount(answer.checks.length)}</dd>
      </div>
      <div class="tile">
        <dt>{t("explorer-checks-tile-faults")}</dt>
        <dd>{formatCount(answer.faults)}</dd>
      </div>
      <div class="tile">
        <dt>{t("explorer-checks-tile-looks")}</dt>
        <dd>{formatCount(answer.looks)}</dd>
      </div>
    </dl>
    <ReportView report={answer.report} />
  {/if}
</section>

<style>
  .view {
    margin-block: 12px;
    overflow-wrap: anywhere;
  }

  h2 {
    margin: 0 0 8px;
    font-size: var(--type-lead);
  }

  .tiles {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 10px;
    margin: 8px 0 6px;
  }

  .tile {
    padding: 8px 10px;
    background: var(--colour-surface-soft);
    border-radius: 4px;
  }

  .tile dt {
    font-size: var(--type-small);
    color: var(--colour-text-muted);
  }

  .tile dd {
    margin: 2px 0 0;
    font-size: var(--type-lead);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .said.wrong {
    color: var(--colour-risk);
  }
</style>
