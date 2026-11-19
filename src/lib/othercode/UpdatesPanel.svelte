<script lang="ts">
  import { untrack } from "svelte";
  import { t } from "../i18n/runtime";
  import ReportView from "../reports/ReportView.svelte";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import Placeholder from "../shell/Placeholder.svelte";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import { heard, started } from "../shell/progress";
  import type { Failure } from "../shell/types";
  import type { Report } from "../reports/types";
  import { askUpdates } from "./desktopClient";
  import { changedNames, comparable } from "./presentation";
  import type { KeptFile, KeptFiles } from "./types";

  /**
   * What did an update change? (0.26.0): the builds the tools keep of the game and the mods we tie into, each comparable once a
   * second build has been kept; a file's last update, declaration by declaration; and any one declaration's change as a diff.
   * The file and the declaration are part of the place, so Back steps out of them.
   */
  let {
    game,
    file,
    owner,
    member,
    onpick,
    onmember,
    onclose,
  }: {
    game: string;
    file: string | null;
    owner: string | null;
    member: string | null;
    onpick: (file: KeptFile) => void;
    onmember: (name: string) => void;
    onclose: () => void;
  } = $props();

  type Reading<T> =
    | { state: "reading" }
    | { state: "none" }
    | { state: "ready"; data: T }
    | { state: "refused"; reason: string }
    | { state: "failed"; failure: Failure };

  let kept = $state<Reading<KeptFile[]>>({ state: "reading" });
  let compared = $state<Reading<Report>>({ state: "reading" });
  let progress = $state(started());

  async function readKept() {
    kept = { state: "reading" };
    const asked = await askUpdates<KeptFiles>(game, null, null, null);
    if (asked.state === "failed") return (kept = asked);
    const answer = asked.answer;
    kept = !answer.available
      ? { state: "none" }
      : answer.ok
        ? { state: "ready", data: comparable(answer.data?.files ?? []) }
        : { state: "refused", reason: answer.refusal ?? "" };
  }

  async function compare(name: string, by: string | null, one: string | null) {
    compared = { state: "reading" };
    progress = started();
    const asked = await askUpdates<unknown>(game, name, by, one, (m) => {
      progress = heard(progress, m);
    });
    if (asked.state === "failed") return (compared = asked);
    const answer = asked.answer;
    compared =
      answer.ok && answer.report
        ? { state: "ready", data: answer.report }
        : { state: "refused", reason: answer.refusal ?? "" };
  }

  $effect(() => {
    const chosen = file;
    const by = owner;
    const one = member;
    untrack(() => void (chosen ? compare(chosen, by, one) : readKept()));
  });

  const names = $derived(
    compared.state === "ready" && !member ? changedNames(compared.data) : [],
  );
</script>

<section class="updates" aria-labelledby="updates-title">
  <div class="head">
    <div>
      <div class="eyebrow accent">{t("updates-kicker")}</div>
      <h2 id="updates-title">
        {member
          ? t("updates-member-title", { member, file: file ?? "" })
          : file
            ? t("updates-file-title", { file })
            : t("updates-title")}
      </h2>
    </div>
    {#if file}
      <button type="button" class="action" onclick={onclose}
        >{t("updates-back")}</button
      >
    {/if}
  </div>

  {#if !file}
    {#if kept.state === "reading"}
      <Placeholder shape="rows" rows={4} />
    {:else if kept.state === "none"}
      <p class="muted">{t("updates-none")}</p>
    {:else if kept.state === "refused"}
      <p class="muted">{t("updates-refused", { reason: kept.reason })}</p>
    {:else if kept.state === "failed"}
      <FailurePanel failure={kept.failure} onretry={readKept} />
    {:else if kept.data.length === 0}
      <p class="muted">{t("updates-nothing-twice")}</p>
    {:else}
      <p class="small muted">{t("updates-how")}</p>
      <ul class="files">
        {#each kept.data as item (`${item.owner}/${item.file}`)}
          <li>
            <button type="button" class="file" onclick={() => onpick(item)}>
              <strong>{item.file}</strong>
              <span class="muted small"
                >{t("updates-file-line", {
                  mod: item.owner_name,
                  newest: item.newest_seen ?? "",
                  previous: item.previous_seen ?? "",
                })}</span
              >
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  {:else if compared.state === "reading"}
    <ProgressBar {progress} fallback={t("updates-comparing", { file })} />
    <p class="small muted">{t("updates-comparing-note")}</p>
    <Placeholder shape="rows" rows={5} />
  {:else if compared.state === "failed"}
    <FailurePanel
      failure={compared.failure}
      onretry={() => void compare(file ?? "", owner, member)}
    />
  {:else if compared.state === "refused" || compared.state === "none"}
    <p class="lead">
      {t("updates-refused", {
        reason: compared.state === "refused" ? compared.reason : "",
      })}
    </p>
  {:else if compared.state === "ready"}
    {#if names.length > 0}
      <div class="names">
        {#each names as group (group.heading)}
          <section aria-label={group.heading}>
            <h3>{group.heading}</h3>
            <div class="toggles">
              {#each group.names as name (name)}
                <button
                  type="button"
                  class="toggle"
                  onclick={() => onmember(name)}>{name}</button
                >
              {/each}
            </div>
          </section>
        {/each}
      </div>
      <p class="small muted">{t("updates-names-how")}</p>
    {/if}
    <ReportView report={compared.data} />
  {/if}
</section>

<style>
  .updates {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-block: 16px;
  }

  .head {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px 16px;
  }

  h2 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 1.25rem;
    overflow-wrap: anywhere;
  }

  h3 {
    margin: 8px 0 6px;
    font-size: var(--type-small);
  }

  .files {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .file {
    width: 100%;
    min-height: 44px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    padding: 6px 10px;
    font: inherit;
    text-align: start;
    color: var(--colour-text);
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
    cursor: pointer;
  }

  .file:hover {
    border-color: var(--colour-comparison);
  }

  .toggles {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .toggle {
    overflow-wrap: anywhere;
  }
</style>
