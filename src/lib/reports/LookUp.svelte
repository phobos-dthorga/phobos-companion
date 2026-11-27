<script lang="ts">
  import { onMount } from "svelte";
  import type { GameHome } from "../home/types";
  import { t } from "../i18n/runtime";
  import { here, setFocus } from "../navigation/navigation.svelte";
  import type { OtherAnswer } from "../othercode/types";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import { heard, started } from "../shell/progress";
  import type { Failed } from "../shell/types";
  import ReportView from "./ReportView.svelte";
  import { lookUp } from "./desktopClient";
  import {
    definitionName,
    LOOK_KINDS,
    lookKind,
    type LookKind,
  } from "./lookup";

  /**
   * Look up (0.106.0; the owner's choice of 27 Nov 2026, "Look up a Def page"), the Reports page's second tab: one definition by
   * name, three ways (who defines and patches it, it as written with its parents, it with every patch applied), from the game's
   * tools by what they do. Only reads. The name and the look are part of the place, so Back and a copied address return to them.
   */
  let { game }: { game: GameHome } = $props();

  const WORDS: Record<LookKind, string> = {
    who: "lookup-who",
    show: "lookup-show",
    patched: "lookup-patched",
  };

  let name = $state(here().focus.name ?? "");
  let kind = $state<LookKind>(lookKind(here().focus.look));
  let reading = $state<
    | { state: "idle" }
    | { state: "running" }
    | { state: "ready"; answer: OtherAnswer<unknown> }
    | Failed
  >({ state: "idle" });
  let progress = $state(started());
  let said = $state("");
  let request = 0;

  /** Runs one look; a newer request wins, so a slow answer can't replace the one on screen. */
  async function look(next: LookKind) {
    const wanted = name.trim();
    if (!definitionName(wanted)) {
      said = t("lookup-bad-name");
      return;
    }
    said = "";
    kind = next;
    setFocus({ name: wanted, look: next });
    const mine = ++request;
    reading = { state: "running" };
    progress = started();
    const answer = await lookUp(game.id, next, wanted, (m) => {
      if (mine === request) progress = heard(progress, m);
    });
    if (mine === request) reading = answer;
  }

  onMount(() => {
    if (definitionName(name)) void look(kind);
  });
</script>

<p class="lead">{t("lookup-lead")}</p>
<form
  class="ask"
  onsubmit={(event) => {
    event.preventDefault();
    void look(kind);
  }}
>
  <label for="lookup-name">{t("lookup-name")}</label>
  <input
    id="lookup-name"
    type="text"
    autocomplete="off"
    spellcheck="false"
    placeholder={t("lookup-name-example")}
    bind:value={name}
    aria-describedby="lookup-name-how"
  />
  <p id="lookup-name-how" class="small muted">{t("lookup-name-how")}</p>
  <div class="buttons">
    {#each LOOK_KINDS as each (each)}
      <button
        type="button"
        class="action toggle"
        aria-pressed={kind === each && reading.state !== "idle"}
        disabled={reading.state === "running"}
        onclick={() => look(each)}>{t(WORDS[each])}</button
      >
    {/each}
  </div>
  {#if said}<p class="small" role="status">{said}</p>{/if}
</form>

{#if reading.state === "running"}
  <ProgressBar {progress} fallback={t("lookup-running")} />
{:else if reading.state === "failed"}
  <FailurePanel failure={reading.failure} onretry={() => look(kind)} />
{:else if reading.state === "ready"}
  {#if !reading.answer.available}
    <p>{t("lookup-missing", { game: game.name })}</p>
  {:else if !reading.answer.ok}
    <p>{t("lookup-refused", { reason: reading.answer.refusal ?? "" })}</p>
  {:else if reading.answer.report}
    <h2 class="answer">{reading.answer.report.title}</h2>
    <ReportView report={reading.answer.report} />
  {/if}
{/if}

<style>
  .ask {
    display: grid;
    gap: 6px;
    max-width: 640px;
    margin-bottom: 16px;
  }

  input {
    min-height: 44px;
    padding: 8px 12px;
    font: inherit;
    color: var(--colour-text);
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .answer {
    margin: 8px 0 12px;
    font-size: 1.25rem;
    overflow-wrap: anywhere;
  }

  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
</style>
