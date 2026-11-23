<script lang="ts">
  import { t } from "../i18n/runtime";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import { started } from "../shell/progress";
  import type { Failed } from "../shell/types";
  import { answerCall, sendPrepared } from "./desktopClient";
  import { loadAi } from "./state.svelte";
  import type {
    AiAnswer,
    AiCallView,
    AiEvent,
    AiPrepared,
    AiStep,
  } from "./types";

  /**
   * One question to an AI service, on any page (0.71.0 for Explain this fault on Logs; shared since 0.72.0 by Summarise this
   * version on Changes and What does this mean for my mods? on Mods; `docs/ai.md`, A2; the owner's choice of 23 Nov 2026: "shown
   * first, then my press"). A press asks the host, through `prepare`, to build the question from what it last read; the card shows
   * all of it, and the service and model it would go to; only **Send** sends it. The answer is shown as plain text as it arrives,
   * never acted on. `key` keeps each card's headings apart on a page with several.
   *
   * Since 0.73.0 the model may ask the tool kit's read-only reports while it answers. For a model on this computer each report it
   * asks for is listed as it runs; **for an online one each waits here, shown whole, until Send this report or Don't send.**
   */
  let {
    key,
    button,
    prepare: build,
  }: {
    key: string;
    button: string;
    prepare: () => Promise<{ state: "ready"; prepared: AiPrepared } | Failed>;
  } = $props();

  type Step =
    | { step: "idle" }
    | { step: "preparing" }
    | { step: "shown"; prepared: AiPrepared }
    | {
        step: "sending";
        prepared: AiPrepared;
        text: string;
        calls: AiCallView[];
      }
    | {
        step: "waiting";
        prepared: AiPrepared;
        call: AiCallView;
        calls: AiCallView[];
        text: string;
      }
    | {
        step: "answered";
        prepared: AiPrepared;
        answer: AiAnswer;
        calls: AiCallView[];
        toolsUnavailable: boolean;
      }
    | { step: "failed"; reason: string };

  let now = $state<Step>({ step: "idle" });

  async function prepare() {
    now = { step: "preparing" };
    const answer = await build();
    now =
      answer.state === "ready"
        ? { step: "shown", prepared: answer.prepared }
        : { step: "failed", reason: answer.failure.detail };
  }

  /** What arrives while the host works: a piece of the answer, or a report the model asked for and was sent. */
  function hear(event: AiEvent) {
    if (now.step !== "sending") return;
    now =
      event.kind === "text"
        ? { ...now, text: now.text + event.text }
        : { ...now, calls: [...now.calls, event.call] };
  }

  function settle(
    prepared: AiPrepared,
    text: string,
    answer: { state: "ready"; step: AiStep } | Failed,
  ) {
    if (answer.state !== "ready") {
      now = { step: "failed", reason: answer.failure.detail };
    } else if (answer.step.step === "waiting") {
      now = {
        step: "waiting",
        prepared,
        call: answer.step.call,
        calls: answer.step.calls,
        text,
      };
    } else {
      now = {
        step: "answered",
        prepared,
        answer: answer.step.answer,
        calls: answer.step.calls,
        toolsUnavailable: answer.step.toolsUnavailable,
      };
    }
    void loadAi();
  }

  async function send(prepared: AiPrepared) {
    now = { step: "sending", prepared, text: "", calls: [] };
    const answer = await sendPrepared(prepared.id, hear);
    settle(prepared, now.step === "sending" ? now.text : "", answer);
  }

  /** The person's yes or no to a report an online model asked for; the question then goes on. */
  async function decide(allow: boolean) {
    if (now.step !== "waiting") return;
    const { prepared, calls, text } = now;
    now = { step: "sending", prepared, text, calls };
    const answer = await answerCall(prepared.id, allow, hear);
    settle(prepared, now.step === "sending" ? now.text : text, answer);
  }

  function stopWords(answer: AiAnswer): string | null {
    if (answer.stop === "cut") return t("ask-stop-cut");
    if (answer.stop === "refused") return t("ask-stop-refused");
    if (answer.stop === "failed")
      return t("ask-stop-failed", {
        reason: answer.problem ?? t("ask-no-reason"),
      });
    return null;
  }

  function countWords(answer: AiAnswer): string {
    if (answer.inputTokens === null && answer.outputTokens === null)
      return t("ask-tokens-unknown");
    return t("ask-tokens", {
      sent: answer.inputTokens ?? 0,
      received: answer.outputTokens ?? 0,
    });
  }

  function callWords(call: AiCallView): string {
    if (!call.sent) return t("ask-call-declined", { summary: call.summary });
    if (call.failed) return t("ask-call-refused", { summary: call.summary });
    return t("ask-call-sent", {
      summary: call.summary,
      count: call.characters,
    });
  }
</script>

{#snippet called(calls: AiCallView[])}
  {#if calls.length > 0}
    <details class="calls">
      <summary>{t("ask-calls", { count: calls.length })}</summary>
      <ul class="small">
        {#each calls as call, index (index)}
          <li>{callWords(call)}</li>
        {/each}
      </ul>
    </details>
  {/if}
{/snippet}

<div class="ask">
  {#if now.step === "idle" || now.step === "failed"}
    <button type="button" class="action" onclick={() => void prepare()}
      >{button}</button
    >
    {#if now.step === "failed"}
      <p class="told refused" role="status">
        {t("ask-failed", { reason: now.reason })}
      </p>
    {/if}
  {:else if now.step === "preparing"}
    <ProgressBar progress={started()} fallback={t("ask-preparing")} />
  {:else if now.step === "shown"}
    {@const prepared = now.prepared}
    <section class="card" aria-labelledby={`ask-title-${key}`}>
      <h4 id={`ask-title-${key}`}>{t("ask-shown-title")}</h4>
      <p class="small now">
        {prepared.local
          ? t("ask-goes-local", {
              service: prepared.service,
              model: prepared.model,
            })
          : t("ask-goes-online", {
              service: prepared.service,
              model: prepared.model,
            })}
      </p>
      {#if prepared.tools}
        <p class="small">
          {prepared.local ? t("ask-tools-local") : t("ask-tools-online")}
        </p>
      {/if}
      <p class="small">{t("ask-instruction-title")}</p>
      <pre class="lines">{prepared.instruction}</pre>
      <p class="small">
        {t("ask-text-title", { count: prepared.characters })}
      </p>
      <pre class="lines">{prepared.text}</pre>
      <div class="buttons">
        <button type="button" class="action" onclick={() => void send(prepared)}
          >{t("ask-send")}</button
        >
        <button
          type="button"
          class="action"
          onclick={() => (now = { step: "idle" })}>{t("ask-cancel")}</button
        >
      </div>
    </section>
  {:else if now.step === "sending"}
    <ProgressBar
      progress={started()}
      fallback={t("ask-sending", { service: now.prepared.service })}
    />
    {@render called(now.calls)}
    {#if now.text}
      <div class="answer">{now.text}</div>
    {/if}
  {:else if now.step === "waiting"}
    {@const call = now.call}
    <section class="card" aria-labelledby={`ask-wait-${key}`}>
      <h4 id={`ask-wait-${key}`}>
        {t("ask-wait-title", { service: now.prepared.service })}
      </h4>
      <p class="small now">{call.summary}</p>
      <p class="small">
        {call.failed
          ? t("ask-wait-refused")
          : t("ask-wait-text", { count: call.characters })}
      </p>
      <pre class="lines">{call.text}</pre>
      <div class="buttons">
        <button type="button" class="action" onclick={() => void decide(true)}
          >{t("ask-send-call")}</button
        >
        <button type="button" class="action" onclick={() => void decide(false)}
          >{t("ask-decline-call")}</button
        >
      </div>
      {@render called(now.calls)}
      {#if now.text}
        <div class="answer">{now.text}</div>
      {/if}
    </section>
  {:else if now.step === "answered"}
    {@const answer = now.answer}
    <section class="card" aria-labelledby={`ask-answer-${key}`}>
      <h4 id={`ask-answer-${key}`}>
        {t("ask-answer-title", {
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
          <p class="sr-only" role="status">{t("ask-done")}</p>
        {/if}
      </div>
      {#if now.toolsUnavailable}
        <p class="muted small">{t("ask-tools-unavailable")}</p>
      {/if}
      {@render called(now.calls)}
      <p class="muted small">{countWords(answer)} {t("ask-not-checked")}</p>
      <button type="button" class="action" onclick={() => void prepare()}
        >{t("ask-again")}</button
      >
    </section>
  {/if}
</div>

<style>
  .ask {
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

  .calls {
    margin: 6px 0;
  }

  .calls summary {
    min-height: 44px;
    display: flex;
    align-items: center;
    cursor: pointer;
  }

  .calls ul {
    margin: 4px 0 0;
    padding-inline-start: 20px;
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
