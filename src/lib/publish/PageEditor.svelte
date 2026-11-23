<script lang="ts">
  import { onDestroy } from "svelte";
  import { t } from "../i18n/runtime";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import Placeholder from "../shell/Placeholder.svelte";
  import type { Failure } from "../shell/types";
  import { bytesOf } from "./bbcode";
  import BbcodePreview from "./BbcodePreview.svelte";
  import { checkPage, readPage, savePage } from "./desktopClient";
  import type { PageText } from "./types";

  /**
   * The Workshop page editor (0.69.0; the owner's choice of 23 Nov 2026: "Edit in Companion"): the page's BBCode on the left, Steam's
   * look on the right, a byte counter against the budget, and every problem the kit finds, checked a moment after typing stops.
   * Save writes the page file in the repository, only when it has no problems; committing is the owner's.
   */
  let {
    game,
    repository,
    mod,
    onsaved,
  }: {
    game: string;
    repository: string;
    mod: string;
    onsaved?: () => void;
  } = $props();

  const CHECK_AFTER_MS = 600;

  let reading = $state<
    | { state: "reading" }
    | { state: "ready"; page: PageText }
    | { state: "failed"; failure: Failure }
  >({ state: "reading" });
  let text = $state("");
  let saved = $state("");
  let problems = $state<string[]>([]);
  let checking = $state(false);
  let busy = $state(false);
  let said = $state<{ ok: boolean; words: string } | null>(null);
  let timer: ReturnType<typeof setTimeout> | undefined;

  const budget = $derived(reading.state === "ready" ? reading.page.budget : 0);
  const bytes = $derived(bytesOf(text));
  const changed = $derived(text !== saved);
  const over = $derived(budget > 0 && bytes > budget);

  async function load() {
    reading = { state: "reading" };
    const answer = await readPage(game, repository, mod);
    if (answer.state !== "ready") {
      reading = { state: "failed", failure: answer.failure };
      return;
    }
    reading = { state: "ready", page: answer.value };
    text = answer.value.text;
    saved = answer.value.exists ? answer.value.text : "";
    problems = answer.value.problems;
  }

  function edited() {
    said = null;
    clearTimeout(timer);
    timer = setTimeout(() => void check(), CHECK_AFTER_MS);
  }

  async function check() {
    checking = true;
    const asked = text;
    const answer = await checkPage(game, repository, mod, asked);
    checking = false;
    if (answer.state === "ready" && asked === text)
      problems = answer.value.problems;
  }

  async function save() {
    clearTimeout(timer);
    busy = true;
    said = null;
    const answer = await savePage(game, repository, mod, text);
    busy = false;
    if (answer.state !== "ready" || !answer.value.ok) {
      const reason =
        answer.state !== "ready"
          ? answer.failure.detail
          : (answer.value.refusal ?? "");
      said = { ok: false, words: t("publish-page-not-saved", { reason }) };
      return;
    }
    saved = text;
    problems = [];
    said = { ok: true, words: t("publish-page-saved") };
    onsaved?.();
  }

  $effect(() => {
    void [game, repository, mod];
    void load();
  });
  onDestroy(() => clearTimeout(timer));
</script>

{#if reading.state === "reading"}
  <Placeholder shape="rows" rows={6} />
{:else if reading.state === "failed"}
  <FailurePanel failure={reading.failure} onretry={load} />
{:else}
  {@const page = reading.page}
  <p class="small muted">
    {page.exists
      ? t("publish-page-file", { path: page.path })
      : t("publish-page-starter", { path: page.path })}
  </p>
  <div class="editor">
    <label class="side">
      <span class="side-title">{t("publish-page-source")}</span>
      <textarea
        bind:value={text}
        oninput={edited}
        spellcheck="true"
        rows="22"
        aria-describedby="publish-page-size publish-page-problems"></textarea>
    </label>
    <div class="side">
      <span class="side-title">{t("publish-page-preview")}</span>
      <BbcodePreview {text} label={t("publish-page-preview")} />
    </div>
  </div>
  <p id="publish-page-size" class={over ? "size over" : "size"}>
    {t("publish-page-bytes", { bytes, budget })}
    {#if over}{t("publish-page-over")}{/if}
  </p>
  <div id="publish-page-problems" aria-live="polite">
    {#if checking}
      <p class="small muted">{t("publish-page-checking")}</p>
    {:else if problems.length > 0}
      <p class="problems-title">
        {t("publish-page-problems", { count: problems.length })}
      </p>
      <ul class="problems">
        {#each problems as problem (problem)}<li>{problem}</li>{/each}
      </ul>
    {:else}
      <p class="small ok">{t("publish-page-no-problems")}</p>
    {/if}
  </div>
  <div class="buttons">
    <button
      type="button"
      class="action"
      disabled={busy || !changed || problems.length > 0 || checking}
      onclick={save}
      >{busy ? t("publish-page-saving") : t("publish-page-save")}</button
    >
    <button
      type="button"
      class="action"
      disabled={busy || !changed}
      onclick={() => {
        text = saved || page.text;
        edited();
      }}>{t("publish-page-undo")}</button
    >
  </div>
  <div aria-live="polite">
    {#if said}
      <p class={said.ok ? "said" : "said refused"} role="status">
        {said.words}
      </p>
    {/if}
  </div>
{/if}

<style>
  .editor {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 14px;
    margin-top: 8px;
  }

  .side {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .side-title {
    font-weight: 600;
  }

  textarea {
    min-height: 320px;
    padding: 10px 12px;
    font-family: var(--font-mono, monospace);
    font-size: var(--type-small);
    color: var(--colour-text);
    background: var(--colour-surface);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
    resize: vertical;
  }

  .size {
    margin-top: 6px;
    font-size: var(--type-small);
  }

  .size.over,
  .problems-title,
  .said.refused {
    color: var(--colour-risk);
  }

  .problems-title {
    margin-top: 6px;
    font-weight: 600;
  }

  .problems {
    margin: 2px 0 0;
    padding-inline-start: 20px;
    font-size: var(--type-small);
  }

  .ok,
  .said {
    color: var(--colour-success);
  }

  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 10px;
  }

  @media (max-width: 900px) {
    .editor {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
