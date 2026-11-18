<script lang="ts">
  import { t } from "../i18n/runtime";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import { started } from "../shell/progress";
  import { formatWhen } from "../shell/dates";
  import { plainText } from "../shell/inline";
  import type { Failure } from "../shell/types";
  import { go, openDialog } from "../navigation/navigation.svelte";
  import { commitRequest } from "../code/presentation";
  import { askConnections } from "./desktopClient";
  import type { History } from "./types";

  /**
   * One thing's own history (cross-links L2): the commits that changed its lines, newest first, each with the changelog entries it
   * wrote. Read only when asked, since following a thing's lines back through every commit takes git a moment. An entry or a
   * commit opens the code viewer on that commit, as a step the window's Back returns from.
   */
  let {
    game,
    repository,
    node,
    name,
  }: { game: string; repository: string; node: string; name: string } =
    $props();

  type Reading =
    | { state: "idle" }
    | { state: "reading" }
    | { state: "ready"; data: History }
    | { state: "refused"; reason: string }
    | { state: "failed"; failure: Failure };

  let reading = $state<Reading>({ state: "idle" });

  // A new thing in the middle starts unread again.
  $effect(() => {
    void node;
    reading = { state: "idle" };
  });

  async function read() {
    reading = { state: "reading" };
    const asked = await askConnections<History>(
      game,
      repository,
      "history",
      node,
    );
    reading =
      asked.state === "failed"
        ? asked
        : asked.answer.ok
          ? { state: "ready", data: asked.answer.data }
          : { state: "refused", reason: asked.answer.refusal ?? "" };
  }

  /** Each changelog a commit wrote in, once: the products whose backups from before it may undo it. */
  function productsOf(commit: History["commits"][number]) {
    const seen = new Map<string, string>();
    for (const entry of commit.entries)
      if (!seen.has(entry.changelog)) seen.set(entry.changelog, entry.product);
    return [...seen].map(([changelog, product]) => ({ changelog, product }));
  }

  /** The Mods page, at that product's newest backup from before the commit (cross-links L1). */
  function backupsBefore(
    commit: History["commits"][number],
    changelog: string,
  ) {
    go({
      page: "mods",
      game,
      focus: { repository, changelog, before: commit.time },
      dialog: null,
    });
  }

  function show(
    commit: History["commits"][number],
    entry: { changelog: string; product: string; text: string } | null,
  ) {
    const first = entry ?? commit.entries[0] ?? null;
    openDialog({
      kind: "code",
      request: first
        ? commitRequest(
            repository,
            commit.hash,
            first.text,
            first.changelog,
            first.product,
          )
        : commitRequest(repository, commit.hash, commit.subject),
    });
  }
</script>

<section class="history" aria-label={t("connections-history-title", { name })}>
  <h4>{t("connections-history-title", { name })}</h4>
  {#if reading.state === "idle"}
    <p class="muted small">{t("connections-history-why")}</p>
    <button type="button" class="action" onclick={read}>
      {t("connections-history-read")}
    </button>
  {:else if reading.state === "reading"}
    <ProgressBar
      progress={started()}
      fallback={t("connections-history-reading")}
    />
  {:else if reading.state === "failed"}
    <FailurePanel failure={reading.failure} onretry={read} />
  {:else if reading.state === "refused"}
    <p class="small">{t("connections-refused", { reason: reading.reason })}</p>
  {:else if reading.data.commits.length === 0}
    <p class="small">{t("connections-history-none", { name })}</p>
  {:else}
    <p class="muted small">
      {t("connections-history-lead", {
        count: reading.data.commits.length,
        file: reading.data.file,
        first: reading.data.lines[0],
        last: reading.data.lines[1],
      })}
    </p>
    <ol class="commits">
      {#each reading.data.commits as commit (commit.hash)}
        <li>
          <p class="when small">
            {formatWhen(commit.time)} · <code>{commit.hash.slice(0, 8)}</code>
          </p>
          <p class="subject">{commit.subject}</p>
          {#if commit.entries.length > 0}
            <ul class="entries">
              {#each commit.entries as entry (entry.changelog + entry.text)}
                <li>
                  <button
                    type="button"
                    class="entry"
                    onclick={() => show(commit, entry)}
                  >
                    <span class="product small">{entry.product}</span>
                    <span>{plainText(entry.text)}</span>
                  </button>
                </li>
              {/each}
            </ul>
            <div class="befores">
              {#each productsOf(commit) as found (found.changelog)}
                <button
                  type="button"
                  class="action"
                  onclick={() => backupsBefore(commit, found.changelog)}
                >
                  {t("connections-history-before", { product: found.product })}
                </button>
              {/each}
            </div>
          {:else}
            <button
              type="button"
              class="action"
              onclick={() => show(commit, null)}
            >
              {t("connections-history-commit")}
            </button>
          {/if}
        </li>
      {/each}
    </ol>
    {#if reading.data.more}
      <p class="muted small">{t("connections-history-more")}</p>
    {/if}
  {/if}
</section>

<style>
  .history {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
    overflow-wrap: anywhere;
  }

  .history h4 {
    margin: 0;
    font-size: var(--type-small);
    font-weight: 600;
  }

  .history p {
    margin: 0;
  }

  .commits {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .commits > li {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    padding-block-start: 8px;
    border-top: 1px solid var(--colour-line);
  }

  .subject {
    font-weight: 600;
  }

  .entries {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .entry {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 10px;
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

  .entry:hover,
  .entry:focus-visible {
    border-color: var(--colour-accent);
  }

  .befores {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .product {
    color: var(--colour-text-muted);
  }
</style>
