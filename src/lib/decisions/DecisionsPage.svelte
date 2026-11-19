<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import Placeholder from "../shell/Placeholder.svelte";
  import { formatWhen } from "../shell/dates";
  import type { Failure } from "../shell/types";
  import DecisionCard from "./DecisionCard.svelte";
  import { chosenLabel, grouped } from "./presentation";
  import type { DecisionsList } from "./types";
  import { answerDecision, readDecisions } from "./desktopClient";

  /**
   * Decisions (0.22.0; docs/later.md, item 4): every question the agents left for the owner, in every repository, with options and
   * the agent's lean; answered ones wait below until an agent acts on them. Pressing Decide records the answer through the kit; the
   * page changes nothing else.
   */
  type Reading =
    | { state: "reading" }
    | { state: "ready"; list: DecisionsList }
    | { state: "failed"; failure: Failure };

  let reading = $state<Reading>({ state: "reading" });
  let busy = $state<string | null>(null);
  let changing = $state<string | null>(null);
  let told = $state<{ ok: boolean; words: string } | null>(null);

  async function load() {
    const answer = await readDecisions();
    reading =
      answer.state === "ready"
        ? { state: "ready", list: answer.list }
        : { state: "failed", failure: answer.failure };
  }

  async function decide(
    repository: string,
    id: string,
    question: string,
    option: string,
    words: string,
  ) {
    busy = `${repository}/${id}`;
    told = null;
    const answer = await answerDecision(repository, id, option, words);
    busy = null;
    if (answer.state !== "done") {
      told = {
        ok: false,
        words: t("decisions-failed", { reason: answer.failure.detail }),
      };
    } else if (!answer.result.ok) {
      told = {
        ok: false,
        words: t("decisions-failed", { reason: answer.result.refusal ?? "" }),
      };
    } else {
      told = { ok: true, words: t("decisions-done", { question }) };
      changing = null;
    }
    await load();
  }

  const groups = $derived(
    reading.state === "ready" ? grouped(reading.list) : [],
  );

  onMount(load);
</script>

<div class="eyebrow accent">{t("decisions-kicker")}</div>
<h1>{t("decisions-title")}</h1>
<p class="lead">{t("decisions-lead")}</p>

<div aria-live="polite">
  {#if told}
    <p class={told.ok ? "told" : "told refused"} role="status">{told.words}</p>
  {/if}
</div>

{#if reading.state === "reading"}
  <p class="muted">{t("decisions-reading")}</p>
  <Placeholder shape="rows" />
{:else if reading.state === "failed"}
  <FailurePanel failure={reading.failure} onretry={load} />
{:else if groups.length === 0}
  <p class="muted">{t("decisions-none")}</p>
{:else}
  <p class="count">
    {reading.list.waiting > 0
      ? t("decisions-waiting", { count: reading.list.waiting })
      : t("decisions-none-waiting")}
  </p>
  {#each groups as group (group.repository)}
    <section aria-labelledby={`decisions-${group.repository}`}>
      <h2 id={`decisions-${group.repository}`}>{group.repository}</h2>
      {#each group.open as decision (decision.id)}
        <DecisionCard
          {decision}
          repository={group.repository}
          busy={busy === `${group.repository}/${decision.id}`}
          ondecide={(option, words) =>
            decide(
              group.repository,
              decision.id,
              decision.question,
              option,
              words,
            )}
        />
      {/each}
      {#if group.answered.length > 0}
        <h3 class="answered-title">
          {t("decisions-answered", { count: group.answered.length })}
        </h3>
        <ul class="answered">
          {#each group.answered as decision (decision.id)}
            {@const key = `${group.repository}/${decision.id}`}
            <li>
              {#if changing === key}
                <DecisionCard
                  {decision}
                  repository={group.repository}
                  busy={busy === key}
                  ondecide={(option, words) =>
                    decide(
                      group.repository,
                      decision.id,
                      decision.question,
                      option,
                      words,
                    )}
                />
              {:else}
                <div class="question">{decision.question}</div>
                <div class="small">
                  {t("decisions-you-chose", {
                    choice: chosenLabel(decision, t("decisions-other")),
                    when: formatWhen(decision.answer?.time),
                  })}
                  {#if decision.answer?.words}
                    <span class="muted"> · {decision.answer.words}</span>
                  {/if}
                </div>
                <button
                  type="button"
                  class="action"
                  onclick={() => (changing = key)}
                  >{t("decisions-change")}</button
                >
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    </section>
  {/each}
{/if}

<style>
  h2 {
    margin: 22px 0 10px;
    font-family: var(--font-display);
    font-size: 1.375rem;
    font-weight: 600;
  }

  .count {
    color: var(--colour-comparison);
  }

  .answered-title {
    margin: 18px 0 6px;
    font-size: 1rem;
    font-weight: 600;
    color: var(--colour-text-muted);
  }

  .answered {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .answered li {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    padding-block: 10px;
    border-top: 1px solid var(--colour-line);
    overflow-wrap: anywhere;
  }

  .answered li:has(:global(article)) {
    align-items: stretch;
  }

  .told {
    padding: 6px 10px;
    border: 1px solid var(--colour-success);
    border-radius: 4px;
  }

  .told.refused {
    border-color: var(--colour-risk);
  }
</style>
