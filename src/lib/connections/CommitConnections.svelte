<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import { heard, started } from "../shell/progress";
  import type { Failure } from "../shell/types";
  import ConnectionsView from "./ConnectionsView.svelte";
  import { askChanged } from "./desktopClient";
  import { startingPoints } from "./presentation";
  import type { Changed, Thing } from "./types";

  /**
   * How the code a commit changed connects to the rest: the things its lines changed, most-changed first, and the connections view
   * centred on the one chosen. For the code viewer's "How it connects". The chosen thing is the viewer's (0.78.0), so the viewer can
   * show its lines beneath the picture; putting something else in the middle chooses it.
   */
  let {
    game,
    repository,
    commit,
    chosen = $bindable(null),
  }: {
    game: string;
    repository: string;
    commit: string | null;
    chosen?: string | null;
  } = $props();

  let reading = $state<
    | { state: "reading" }
    | { state: "ready"; changed: Changed }
    | { state: "refused"; reason: string }
    | { state: "failed"; failure: Failure }
  >({ state: "reading" });
  let progress = $state(started());

  const points = $derived<Thing[]>(
    reading.state === "ready" ? startingPoints(reading.changed.things) : [],
  );
  const gone = $derived(
    reading.state === "ready"
      ? reading.changed.things.length - points.length
      : 0,
  );
  const changedIds = $derived(new Set(points.map((p) => p.id)));
  const start = $derived(chosen ?? points[0]?.id ?? null);

  async function load() {
    if (!commit) return;
    reading = { state: "reading" };
    progress = started();
    const asked = await askChanged(game, repository, commit, (message) => {
      progress = heard(progress, message);
    });
    reading =
      asked.state === "failed"
        ? asked
        : asked.answer.ok
          ? { state: "ready", changed: asked.answer.data }
          : { state: "refused", reason: asked.answer.refusal ?? "" };
    if (reading.state === "ready" && chosen === null)
      chosen = points[0]?.id ?? null;
  }

  onMount(load);
</script>

{#if !commit}
  <p class="lead">{t("connections-changed-uncommitted")}</p>
{:else if reading.state === "reading"}
  <ProgressBar {progress} fallback={t("connections-loading")} />
{:else if reading.state === "failed"}
  <FailurePanel failure={reading.failure} onretry={load} />
{:else if reading.state === "refused"}
  <p class="lead">{t("connections-refused", { reason: reading.reason })}</p>
{:else if points.length === 0}
  <p class="lead">{t("connections-changed-none")}</p>
{:else}
  <div class="pick">
    <span class="muted small">{t("connections-changed-pick")}</span>
    <div
      class="toggles"
      role="group"
      aria-label={t("connections-changed-pick")}
    >
      {#each points.slice(0, 12) as point (point.id)}
        <button
          type="button"
          class="toggle"
          aria-pressed={start === point.id}
          onclick={() => (chosen = point.id)}
        >
          {point.name}
          <span class="muted small"
            >{t("connections-lines-changed", {
              count: point.linesChanged ?? 0,
            })}</span
          >
        </button>
      {/each}
    </div>
    {#if points.length > 12}
      <span class="muted small"
        >{t("connections-changed-more", { count: points.length - 12 })}</span
      >
    {/if}
    {#if gone > 0}
      <span class="muted small"
        >{t("connections-changed-gone", { count: gone })}</span
      >
    {/if}
  </div>
  {#if start}
    {#key start}
      <ConnectionsView
        {game}
        {repository}
        {start}
        changed={changedIds}
        onrecentre={(id) => (chosen = id)}
      />
    {/key}
  {/if}
{/if}

<style>
  .pick {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 10px;
  }

  .pick .toggle {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
</style>
