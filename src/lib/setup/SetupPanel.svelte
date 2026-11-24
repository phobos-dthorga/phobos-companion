<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import { goPage } from "../navigation/navigation.svelte";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import RepositoriesPanel from "./RepositoriesPanel.svelte";
  import {
    fetchProgram,
    lookAgain,
    openPage,
    readFetching,
    readSetup,
    setAside,
    stopFetch,
  } from "./desktopClient";
  import { arrived, GROUPS, inGroup, offer, outcome } from "./presentation";
  import { rememberSetup } from "./state.svelte";
  import type { Fetching, SetupReading, SetupRow, SetupState } from "./types";

  /**
   * Settings → Setup (0.87.0; the owner's choices by card, 25 Nov 2026: a setup check, in a Settings tab, "Show command, run on
   * press"). Every program the pages use beyond the Companion, whether it is here, and a way to fetch a missing one: the command
   * is shown whole first and runs only on Run it. Presentation only: the host reads the tools, holds the command and runs it.
   */
  let reading = $state<SetupReading>({ state: "reading" });
  let fetching = $state<Fetching | null>(null);
  /** The row waiting for a yes before its command runs. */
  let asking = $state<string | null>(null);
  let busy = $state(false);
  let said = $state<{ ok: boolean; words: string } | null>(null);
  let poll: ReturnType<typeof setInterval> | undefined;

  const rows = $derived(
    reading.state === "ready" ? reading.setup.rows : ([] as SetupRow[]),
  );
  const running = $derived(
    fetching !== null && outcome(fetching).kind === "running",
  );

  /** `cleared` after Look again, which forgets an ended fetch; otherwise one that ended stays shown until then. */
  function settle(answer: SetupReading, cleared = false) {
    reading = answer;
    if (answer.state === "ready") {
      rememberSetup(answer.setup.rows);
      const ended =
        !cleared && fetching && outcome(fetching).kind !== "running"
          ? fetching
          : null;
      fetching = answer.setup.fetching ?? ended;
      if (fetching && outcome(fetching).kind === "running") watch();
    }
  }

  async function load() {
    settle(await readSetup());
  }

  /** While a fetch runs, its output is read each second; when it ends, the setup is read again. */
  function watch() {
    if (poll) return;
    poll = setInterval(() => void tick(), 1000);
  }

  async function tick() {
    const answer = await readFetching();
    if (answer.state !== "ready") return;
    fetching = answer.fetching;
    if (!fetching || outcome(fetching).kind !== "running") {
      clearInterval(poll);
      poll = undefined;
      await load();
    }
  }

  async function again() {
    busy = true;
    said = null;
    const answer = await lookAgain();
    busy = false;
    if (answer.state === "failed") {
      said = { ok: false, words: answer.failure.detail };
      return;
    }
    settle(answer, true);
  }

  async function run(row: SetupRow) {
    asking = null;
    said = null;
    const answer = await fetchProgram(row.key);
    if (answer.state === "failed") {
      said = {
        ok: false,
        words: t("setup-refused", { reason: answer.failure.detail }),
      };
      return;
    }
    fetching = answer.fetching;
    watch();
  }

  async function stop() {
    await stopFetch();
    await tick();
  }

  async function aside(row: SetupRow, value: boolean) {
    said = null;
    const answer = await setAside(row.key, value);
    if (answer.state === "failed") {
      said = { ok: false, words: answer.failure.detail };
      return;
    }
    settle(answer);
  }

  async function page(row: SetupRow) {
    said = null;
    const answer = await openPage(row.key);
    if (answer.state === "failed")
      said = { ok: false, words: answer.failure.detail };
  }

  function groupWords(state: SetupState, count: number): string {
    if (state === "missing") return t("setup-group-missing", { count });
    if (state === "here") return t("setup-group-here", { count });
    return t("setup-group-set-aside", { count });
  }

  function endWords(shown: Fetching): string {
    const end = outcome(shown);
    if (end.kind === "running") return t("setup-running");
    if (end.kind === "stopped") return t("setup-stopped");
    if (end.kind === "failed")
      // An exit code is a name for what went wrong, never a quantity: no thousands separator.
      return t("setup-failed", { name: shown.name, code: String(end.code) });
    return arrived(shown, rows)
      ? t("setup-done-here", { name: shown.name })
      : t("setup-done-not-found", { name: shown.name });
  }

  onMount(load);
  onDestroy(() => clearInterval(poll));
</script>

<section
  id="settings-setup"
  class="setup"
  aria-labelledby="setup-title"
  data-picture-wait={reading.state === "reading" ? "" : undefined}
>
  <h2 id="setup-title">{t("setup-title")}</h2>
  <p class="small">{t("setup-lead")}</p>

  {#if reading.state === "browser"}
    <p class="muted">{t("setup-browser")}</p>
  {:else if reading.state === "reading"}
    <p role="status">{t("setup-reading")}</p>
  {:else if reading.state === "failed"}
    <FailurePanel failure={reading.failure} onretry={load} />
  {:else}
    <div class="top">
      <button
        type="button"
        class="action"
        disabled={busy || running}
        onclick={() => void again()}
        >{busy ? t("setup-looking") : t("setup-look-again")}</button
      >
    </div>

    {#if reading.setup.games === null}
      <p class="note">
        {t("setup-no-games")}
        <button type="button" class="action" onclick={() => goPage("home")}
          >{t("setup-open-home")}</button
        >
      </p>
    {/if}

    {#if fetching}
      {@const end = outcome(fetching)}
      <div
        class="fetching"
        class:bad={end.kind === "failed"}
        aria-labelledby="setup-fetching-title"
        role="group"
      >
        <h3 id="setup-fetching-title">
          {t("setup-fetching-title", { name: fetching.name })}
        </h3>
        <pre class="command"><code>{fetching.command}</code></pre>
        <p role="status">{endWords(fetching)}</p>
        {#if end.kind === "running"}
          <button type="button" class="action" onclick={() => void stop()}
            >{t("setup-stop")}</button
          >
        {/if}
        <details open={end.kind === "failed"}>
          <summary>{t("setup-output")}</summary>
          <pre class="output">{fetching.output || t("setup-no-output")}</pre>
        </details>
      </div>
    {/if}

    {#if inGroup(rows, "missing").length === 0}
      <p class="all-here">{t("setup-all-here")}</p>
    {/if}

    {#each GROUPS as state (state)}
      {@const group = inGroup(rows, state)}
      {#if group.length > 0}
        <h3 class="group">{groupWords(state, group.length)}</h3>
        <ul class="rows">
          {#each group as row (row.key)}
            {@const can = offer(row)}
            <li class="row" class:missing={state === "missing"}>
              <div class="name">
                <strong>{row.name}</strong>
                {#if row.game}<span class="tag"
                    >{t("setup-for-game", { game: row.game })}</span
                  >{/if}
                {#if row.everyday && state !== "here"}<span class="tag"
                    >{t("setup-everyday")}</span
                  >{/if}
              </div>
              <p class="small">
                {t("setup-needed-by", { what: row.neededBy })}
              </p>
              <p class="small muted">{row.how}</p>
              {#if state !== "here"}
                {#if can.kind === "waits"}
                  <p class="small">
                    {t("setup-waits", { names: can.names.join(", ") })}
                  </p>
                {:else if can.kind === "no-fetcher"}
                  <p class="small">
                    {t("setup-no-fetcher", { fetcher: can.fetcher })}
                  </p>
                {:else if can.kind === "page-only"}
                  <p class="small">{t("setup-page-only")}</p>
                {:else if can.kind === "nothing"}
                  <p class="small">{t("setup-nothing")}</p>
                {/if}
                {#if asking === row.key && row.command}
                  <div
                    class="confirm"
                    role="group"
                    aria-label={t("setup-confirm-title")}
                  >
                    <p><strong>{t("setup-confirm-title")}</strong></p>
                    <pre class="command"><code>{row.command}</code></pre>
                    <p class="small">
                      {row.fetcher === "winget"
                        ? t("setup-confirm-winget")
                        : t("setup-confirm-dotnet")}
                    </p>
                    <div class="buttons">
                      <button
                        type="button"
                        class="action"
                        onclick={() => void run(row)}>{t("setup-run")}</button
                      >
                      <button
                        type="button"
                        class="action"
                        onclick={() => (asking = null)}
                        >{t("setup-not-now")}</button
                      >
                    </div>
                  </div>
                {:else}
                  <div class="buttons">
                    {#if can.kind === "run"}
                      <button
                        type="button"
                        class="action"
                        disabled={running}
                        onclick={() => (asking = row.key)}
                        >{t("setup-fetch", { name: row.name })}</button
                      >
                    {/if}
                    {#if row.page}
                      <button
                        type="button"
                        class="action"
                        onclick={() => void page(row)}
                        >{t("setup-open-page")}</button
                      >
                    {/if}
                    <button
                      type="button"
                      class="action"
                      onclick={() => void aside(row, state !== "set-aside")}
                      >{state === "set-aside"
                        ? t("setup-needed-after-all")
                        : t("setup-aside")}</button
                    >
                  </div>
                {/if}
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    {/each}
  {/if}

  <div aria-live="polite">
    {#if said}
      <p class={said.ok ? "small" : "small refused-line"}>{said.words}</p>
    {/if}
  </div>
</section>

{#if reading.state === "ready"}
  <RepositoriesPanel
    repositories={reading.setup.repositories}
    onchanged={(setup) => settle({ state: "ready", setup })}
  />
{/if}

<style>
  .setup {
    max-width: 90ch;
    margin-top: 20px;
    padding: 12px 16px;
    background: var(--colour-surface);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  h2 {
    margin: 0 0 8px;
    font-family: var(--font-display);
    font-size: 1.25rem;
    font-weight: 600;
  }

  h3 {
    margin: 14px 0 6px;
    font-size: var(--type-body);
    font-weight: 600;
  }

  p {
    margin: 0 0 6px;
  }

  .top,
  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-block: 6px;
  }

  .note,
  .all-here {
    padding: 8px 12px;
    background: var(--colour-surface-raised);
    border-inline-start: 3px solid var(--colour-accent);
  }

  .rows {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .row {
    padding: 8px 12px;
    margin-bottom: 8px;
    background: var(--colour-surface-soft);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .row.missing {
    border-inline-start: 3px solid var(--colour-risk);
  }

  .name {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 4px;
  }

  .tag {
    padding-inline: 6px;
    font-size: var(--type-caption);
    border: 1px solid var(--colour-line);
    border-radius: 3px;
  }

  .confirm,
  .fetching {
    padding: 8px 12px;
    margin-block: 8px;
    background: var(--colour-surface-raised);
    border-inline-start: 3px solid var(--colour-accent);
  }

  .fetching.bad {
    border-inline-start-color: var(--colour-risk);
  }

  .command,
  .output {
    margin: 6px 0;
    padding: 6px 8px;
    overflow-x: auto;
    font-family: var(--font-mono, ui-monospace, Consolas, monospace);
    font-size: var(--type-small);
    background: var(--colour-canvas);
    border: 1px solid var(--colour-line);
    border-radius: 3px;
  }

  .command {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .output {
    max-height: 18rem;
    overflow-y: auto;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  details summary {
    min-height: 44px;
    display: flex;
    align-items: center;
    cursor: pointer;
  }

  .refused-line {
    padding-inline-start: 8px;
    border-inline-start: 3px solid var(--colour-risk);
    overflow-wrap: anywhere;
  }
</style>
