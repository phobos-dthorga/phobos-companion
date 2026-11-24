<script lang="ts">
  import { agents } from "../agents/state.svelte";
  import { t } from "../i18n/runtime";
  import { writeStarters } from "./desktopClient";
  import { offered } from "./presentation";
  import type { Readiness, Setup } from "./types";

  /**
   * Your repositories, on Settings → Setup (0.89.0; the owner's choice by card, 25 Nov 2026: "Starter files for a repository"):
   * each repository on the games list, whether it is kept with git, and which of the files the pages read it has. A missing one
   * is offered as a starter: shown whole, ticked or not, and written only on Write the ticked files, where its path is free.
   * Presentation only: the host checks and writes.
   */
  let {
    repositories,
    onchanged,
  }: { repositories: Readiness[]; onchanged: (setup: Setup) => void } =
    $props();

  /** The repository whose starters are open, by game and name, and what is ticked. */
  let open = $state<string | null>(null);
  let ticked = $state<string[]>([]);
  let busy = $state(false);
  let said = $state<{ ok: boolean; words: string } | null>(null);

  const keyOf = (repository: Readiness) =>
    `${repository.game}/${repository.name}`;

  function start(repository: Readiness) {
    open = keyOf(repository);
    said = null;
    ticked = offered(repository, agents.shown)
      .filter((s) => s.chosen)
      .map((s) => s.id);
  }

  function tick(id: string, on: boolean) {
    ticked = on ? [...ticked, id] : ticked.filter((t) => t !== id);
  }

  async function write(repository: Readiness) {
    busy = true;
    const answer = await writeStarters(
      repository.game,
      repository.name,
      ticked,
    );
    busy = false;
    if (answer.state === "failed") {
      said = { ok: false, words: answer.failure.detail };
      return;
    }
    open = null;
    said =
      answer.refused.length > 0
        ? {
            ok: false,
            words: t("starters-some-refused", {
              why: answer.refused.join("; "),
            }),
          }
        : {
            ok: true,
            words: t("starters-written", { repository: repository.name }),
          };
    onchanged(answer.setup);
  }
</script>

<section
  id="settings-repositories"
  class="repositories"
  aria-labelledby="starters-title"
>
  <h2 id="starters-title">{t("starters-title")}</h2>
  <p class="small">{t("starters-lead")}</p>
  {#if repositories.length === 0}
    <p class="muted">{t("starters-none")}</p>
  {/if}
  <ul class="list">
    {#each repositories as repository (keyOf(repository))}
      {@const missing = offered(repository, agents.shown)}
      <li class="repository">
        <div class="name">
          <strong>{repository.name}</strong>
          <span class="tag">{repository.gameName}</span>
        </div>
        <p class="small">
          {#if !repository.found}
            {t("starters-not-found")}
          {:else}
            {repository.git ? t("starters-git") : t("starters-no-git")}
            {missing.length === 0
              ? t("starters-all")
              : t("starters-missing", {
                  paths: missing.map((s) => s.path).join(", "),
                })}
          {/if}
        </p>
        {#if repository.found && missing.length > 0}
          {#if open === keyOf(repository)}
            <div
              class="confirm"
              role="group"
              aria-label={t("starters-confirm", {
                repository: repository.name,
              })}
            >
              <p>
                <strong
                  >{t("starters-confirm", {
                    repository: repository.name,
                  })}</strong
                >
              </p>
              {#each missing as starter (starter.id)}
                <label class="pick">
                  <input
                    type="checkbox"
                    checked={ticked.includes(starter.id)}
                    onchange={(event) =>
                      tick(starter.id, event.currentTarget.checked)}
                  />
                  <span><code>{starter.path}</code></span>
                </label>
                <pre class="content">{starter.content}</pre>
              {/each}
              <p class="small">{t("starters-how")}</p>
              <div class="buttons">
                <button
                  type="button"
                  class="action"
                  disabled={busy || ticked.length === 0}
                  onclick={() => void write(repository)}
                  >{t("starters-write")}</button
                >
                <button
                  type="button"
                  class="action"
                  onclick={() => (open = null)}>{t("setup-not-now")}</button
                >
              </div>
            </div>
          {:else}
            <button
              type="button"
              class="action"
              onclick={() => start(repository)}
              >{t("starters-add", { count: missing.length })}</button
            >
          {/if}
        {/if}
      </li>
    {/each}
  </ul>
  <div aria-live="polite">
    {#if said}
      <p class={said.ok ? "small" : "small refused-line"}>{said.words}</p>
    {/if}
  </div>
</section>

<style>
  .repositories {
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

  p {
    margin: 0 0 6px;
  }

  .list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .repository {
    padding: 8px 12px;
    margin-bottom: 8px;
    background: var(--colour-surface-soft);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
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

  .confirm {
    padding: 8px 12px;
    margin-block: 8px;
    background: var(--colour-surface-raised);
    border-inline-start: 3px solid var(--colour-accent);
  }

  .pick {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 44px;
    cursor: pointer;
  }

  .pick input {
    width: 22px;
    height: 22px;
  }

  .content {
    margin: 0 0 8px;
    padding: 6px 8px;
    max-height: 14rem;
    overflow: auto;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font-family: var(--font-mono, ui-monospace, Consolas, monospace);
    font-size: var(--type-small);
    background: var(--colour-canvas);
    border: 1px solid var(--colour-line);
    border-radius: 3px;
  }

  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .refused-line {
    padding-inline-start: 8px;
    border-inline-start: 3px solid var(--colour-risk);
    overflow-wrap: anywhere;
  }
</style>
