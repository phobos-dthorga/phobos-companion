<script lang="ts">
  import { t } from "../i18n/runtime";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import { started } from "../shell/progress";
  import { prepareFault, sendPrepared } from "./desktopClient";
  import { loadAi } from "./state.svelte";
  import type { AiAnswer, AiPrepared } from "./types";

  /**
   * Explain this fault, on the Logs page (0.71.0; `docs/ai.md`, A2; the owner's choice of 23 Nov 2026: "shown first, then my
   * press"). A press asks the host to build the question from the fault it last read; the card shows all of it, and the service and
   * model it would go to; only **Send** sends it. The answer is shown as plain text as it arrives, never acted on.
   */
  let { game, fault }: { game: string; fault: string } = $props();

  type Step =
    | { step: "idle" }
    | { step: "preparing" }
    | { step: "shown"; prepared: AiPrepared }
    | { step: "sending"; prepared: AiPrepared; text: string }
    | { step: "answered"; prepared: AiPrepared; answer: AiAnswer }
    | { step: "failed"; reason: string };

  let now = $state<Step>({ step: "idle" });

  async function prepare() {
    now = { step: "preparing" };
    const answer = await prepareFault(game, fault);
    now =
      answer.state === "ready"
        ? { step: "shown", prepared: answer.prepared }
        : { step: "failed", reason: answer.failure.detail };
  }

  async function send(prepared: AiPrepared) {
    now = { step: "sending", prepared, text: "" };
    const answer = await sendPrepared(prepared.id, (piece) => {
      if (now.step === "sending") now = { ...now, text: now.text + piece };
    });
    now =
      answer.state === "ready"
        ? { step: "answered", prepared, answer: answer.answer }
        : { step: "failed", reason: answer.failure.detail };
    void loadAi();
  }

  function stopWords(answer: AiAnswer): string | null {
    if (answer.stop === "cut") return t("explain-stop-cut");
    if (answer.stop === "refused") return t("explain-stop-refused");
    if (answer.stop === "failed")
      return t("explain-stop-failed", {
        reason: answer.problem ?? t("explain-no-reason"),
      });
    return null;
  }

  function countWords(answer: AiAnswer): string {
    if (answer.inputTokens === null && answer.outputTokens === null)
      return t("explain-tokens-unknown");
    return t("explain-tokens", {
      sent: answer.inputTokens ?? 0,
      received: answer.outputTokens ?? 0,
    });
  }
</script>

<div class="explain">
  {#if now.step === "idle" || now.step === "failed"}
    <button type="button" class="action" onclick={() => void prepare()}
      >{t("explain-button")}</button
    >
    {#if now.step === "failed"}
      <p class="told refused" role="status">
        {t("explain-failed", { reason: now.reason })}
      </p>
    {/if}
  {:else if now.step === "preparing"}
    <ProgressBar progress={started()} fallback={t("explain-preparing")} />
  {:else if now.step === "shown"}
    {@const prepared = now.prepared}
    <section class="card" aria-labelledby={`explain-title-${fault}`}>
      <h4 id={`explain-title-${fault}`}>{t("explain-shown-title")}</h4>
      <p class="small now">
        {prepared.local
          ? t("explain-goes-local", {
              service: prepared.service,
              model: prepared.model,
            })
          : t("explain-goes-online", {
              service: prepared.service,
              model: prepared.model,
            })}
      </p>
      <p class="small">{t("explain-instruction-title")}</p>
      <pre class="lines">{prepared.instruction}</pre>
      <p class="small">
        {t("explain-text-title", { count: prepared.characters })}
      </p>
      <pre class="lines">{prepared.text}</pre>
      <div class="buttons">
        <button type="button" class="action" onclick={() => void send(prepared)}
          >{t("explain-send")}</button
        >
        <button
          type="button"
          class="action"
          onclick={() => (now = { step: "idle" })}>{t("explain-cancel")}</button
        >
      </div>
    </section>
  {:else if now.step === "sending"}
    <ProgressBar
      progress={started()}
      fallback={t("explain-sending", { service: now.prepared.service })}
    />
    {#if now.text}
      <div class="answer">{now.text}</div>
    {/if}
  {:else if now.step === "answered"}
    {@const answer = now.answer}
    <section class="card" aria-labelledby={`explain-answer-${fault}`}>
      <h4 id={`explain-answer-${fault}`}>
        {t("explain-answer-title", {
          service: now.prepared.service,
          model: now.prepared.model,
        })}
      </h4>
      {#if answer.text}
        <div class="answer">{answer.text}</div>
      {/if}
      <div aria-live="polite">
        {#if stopWords(answer)}
          <p class="told refused" role="status">{stopWords(answer)}</p>
        {:else}
          <p class="sr-only" role="status">{t("explain-done")}</p>
        {/if}
      </div>
      <p class="muted small">{countWords(answer)} {t("explain-not-checked")}</p>
      <button type="button" class="action" onclick={() => void prepare()}
        >{t("explain-again")}</button
      >
    </section>
  {/if}
</div>

<style>
  .explain {
    margin: 8px 0;
  }

  .card {
    margin-top: 6px;
    padding: 10px 14px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  h4 {
    margin: 0 0 6px;
    font-size: 1rem;
    font-weight: 600;
  }

  .now {
    font-weight: 600;
  }

  /* Shown whole, wrapped rather than scrolled: a box that scrolls must be reachable by keyboard, and all of it is what goes. */
  .lines {
    margin: 4px 0 8px;
    padding: 8px 10px;
    font-size: var(--type-small);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    background: var(--colour-canvas);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .answer {
    margin: 6px 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .told {
    margin-top: 8px;
    padding: 6px 10px;
    border: 1px solid var(--colour-success);
    border-radius: 4px;
    overflow-wrap: anywhere;
  }

  .told.refused {
    border-color: var(--colour-risk);
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
</style>
