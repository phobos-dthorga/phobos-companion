<script lang="ts">
  import { t } from "../i18n/runtime";
  import { OTHER, type Decision } from "./types";
  import { canDecide, firstChoice } from "./presentation";

  /**
   * One decision: the question, what it is about, its options as plain radio buttons (the agent's lean marked, and chosen to begin
   * with, so taking it is one press of Decide), "something else" with words, and Decide. It only presents: Decide hands the choice to
   * the page.
   */
  let {
    decision,
    repository,
    busy,
    ondecide,
  }: {
    decision: Decision;
    repository: string;
    busy: boolean;
    ondecide: (option: string, words: string) => void;
  } = $props();

  // The choice starts at the owner's answer or the lean, then belongs to the card until it is sent.
  // svelte-ignore state_referenced_locally
  let choice = $state<string | null>(firstChoice(decision));
  // svelte-ignore state_referenced_locally
  let words = $state(decision.answer?.words ?? "");

  const base = $derived(`decision-${repository}-${decision.id}`);
</script>

<article class="decision" id={base} aria-labelledby={`${base}-question`}>
  <h3 id={`${base}-question`}>{decision.question}</h3>
  {#if decision.context}<p class="context">{decision.context}</p>{/if}
  <fieldset>
    <legend class="small">{t("decisions-choose")}</legend>
    {#each decision.options as option (option.id)}
      <label class="option" class:lean={option.id === decision.lean}>
        <input type="radio" name={base} value={option.id} bind:group={choice} />
        <span class="words">
          <span class="label">
            {option.label}
            {#if option.id === decision.lean}<span class="badge"
                >{t("decisions-lean")}</span
              >{/if}
          </span>
          {#if option.detail}<span class="muted small">{option.detail}</span
            >{/if}
        </span>
      </label>
    {/each}
    <label class="option">
      <input type="radio" name={base} value={OTHER} bind:group={choice} />
      <span class="words"
        ><span class="label">{t("decisions-other")}</span></span
      >
    </label>
  </fieldset>
  {#if decision.why}
    <p class="small why">{t("decisions-why", { why: decision.why })}</p>
  {/if}
  <label class="small" for={`${base}-words`}
    >{choice === OTHER
      ? t("decisions-words-needed")
      : t("decisions-words")}</label
  >
  <textarea id={`${base}-words`} rows="2" maxlength="4000" bind:value={words}
  ></textarea>
  <div class="foot">
    <button
      type="button"
      class="action"
      disabled={busy || !canDecide(choice, words)}
      onclick={() => choice && ondecide(choice, words.trim())}
      >{busy ? t("decisions-saving") : t("decisions-decide")}</button
    >
    {#if decision.from}
      <span class="muted small"
        >{t("decisions-from", { from: decision.from })}</span
      >
    {/if}
  </div>
</article>

<style>
  .decision {
    margin-bottom: 14px;
    padding: 16px 20px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  h3 {
    margin-bottom: 6px;
    font-size: 1.125rem;
    font-weight: 600;
  }

  .context {
    margin-bottom: 10px;
  }

  fieldset {
    margin: 0 0 8px;
    padding: 0;
    border: none;
  }

  legend {
    margin-bottom: 4px;
    color: var(--colour-text-muted);
  }

  .option {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    min-height: var(--control-min);
    padding: 8px 10px;
    border: 1px solid transparent;
    border-radius: 4px;
    cursor: pointer;
  }

  .option:has(input:checked) {
    background: var(--colour-surface-soft);
    border-color: var(--colour-accent);
  }

  .option input {
    flex: none;
    width: 20px;
    height: 20px;
    margin-top: 2px;
    accent-color: var(--colour-accent);
  }

  .words {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .label {
    font-weight: 500;
  }

  .badge {
    margin-left: 8px;
    padding: 1px 8px;
    font-size: var(--type-small);
    font-weight: 600;
    color: var(--colour-text);
    border: 1px solid var(--colour-accent);
    border-radius: 999px;
  }

  .why {
    margin-bottom: 8px;
    color: var(--colour-text-muted);
  }

  textarea {
    display: block;
    width: 100%;
    margin-top: 4px;
    padding: 8px 10px;
    font: inherit;
    color: var(--colour-text);
    background: var(--colour-surface);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
    resize: vertical;
  }

  .foot {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 16px;
    margin-top: 10px;
  }
</style>
