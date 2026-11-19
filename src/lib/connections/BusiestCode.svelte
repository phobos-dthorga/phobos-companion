<script lang="ts">
  import { onMount } from "svelte";
  import { LOCALE, t } from "../i18n/runtime";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import { started } from "../shell/progress";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import { askMakeup } from "../makeup/desktopClient";
  import { busiest } from "../makeup/presentation";
  import type { Churn, Churned, Reading } from "../makeup/types";
  import { askConnections } from "./desktopClient";
  import type { Found, Thing } from "./types";

  /**
   * Where the work goes in this repository's code (the owner's make-up request, 19 Nov 2026): the code files changed most often
   * lately. Pressing one puts what it holds (its type, or its first thing) in the middle of the Code map.
   */
  let {
    game,
    repository,
    onopen,
  }: { game: string; repository: string; onopen: (id: string) => void } =
    $props();

  const DAYS = 30;
  const SHOWN = 10;

  let reading = $state<Reading<Churn>>({ state: "reading" });
  let opening = $state<string | null>(null);
  let missing = $state<string | null>(null);

  async function read() {
    reading = { state: "reading" };
    reading = await askMakeup<Churn>(game, repository, "churn", { days: DAYS });
  }

  onMount(read);

  const files = $derived(
    reading.state === "ready"
      ? busiest(reading.data.files, ["code"], SHOWN)
      : [],
  );

  /** The thing a file holds: a type before its members, the first in the file. */
  function holder(things: Thing[], path: string): Thing | null {
    const inFile = things.filter((t) => t.file === path && !t.external);
    const member = (t: Thing) =>
      /method|field|property|event|constructor/.test(t.kind) ? 1 : 0;
    return (
      inFile.sort(
        (a, b) => member(a) - member(b) || (a.line ?? 0) - (b.line ?? 0),
      )[0] ?? null
    );
  }

  async function open(file: Churned) {
    opening = file.path;
    missing = null;
    const stem = (file.path.split("/").pop() ?? file.path).replace(
      /\.[^.]+$/,
      "",
    );
    const asked = await askConnections<Found>(
      game,
      repository,
      "find",
      `${stem}*`,
    );
    opening = null;
    const found =
      asked.state === "ready" && asked.answer.ok
        ? holder(asked.answer.data.things, file.path)
        : null;
    if (found) onopen(found.id);
    else missing = file.path;
  }
</script>

<section class="busiest" aria-labelledby="codemap-busiest-title">
  <h2 id="codemap-busiest-title">
    {t("codemap-busiest-title", { days: DAYS })}
  </h2>
  <p class="muted small">{t("codemap-busiest-how")}</p>
  {#if reading.state === "reading"}
    <ProgressBar progress={started()} fallback={t("codemap-busiest-reading")} />
  {:else if reading.state === "failed"}
    <FailurePanel failure={reading.failure} onretry={read} />
  {:else if files.length === 0}
    <p class="small">{t("codemap-busiest-none", { days: DAYS })}</p>
  {:else}
    <ol>
      {#each files as file (file.path)}
        <li>
          <button
            type="button"
            class="result"
            disabled={opening !== null}
            onclick={() => open(file)}
          >
            {t("codemap-busiest-file", {
              file: file.path,
              commits: file.commits,
              added: file.added.toLocaleString(LOCALE),
              removed: file.removed.toLocaleString(LOCALE),
            })}
          </button>
        </li>
      {/each}
    </ol>
    {#if missing}
      <p class="small" role="status">
        {t("codemap-busiest-missing", { file: missing })}
      </p>
    {/if}
  {/if}
</section>

<style>
  .busiest {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-block: 16px;
    padding: 12px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
    overflow-wrap: anywhere;
  }

  .busiest h2,
  .busiest p {
    margin: 0;
  }

  .busiest h2 {
    font-size: 1.125rem;
  }

  ol {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .result {
    width: 100%;
    min-height: var(--control-min);
    padding: 4px 10px;
    font: inherit;
    color: var(--colour-text);
    text-align: start;
    background: var(--colour-surface);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
    cursor: pointer;
  }

  .result:hover,
  .result:focus-visible {
    border-color: var(--colour-accent);
  }
</style>
