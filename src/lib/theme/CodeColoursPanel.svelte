<script lang="ts">
  import { untrack } from "svelte";
  import { t } from "../i18n/runtime";
  import CodeLines from "../code/CodeLines.svelte";
  import { useCodeColours } from "../code/codeColours";
  import {
    bringInCodeColoursFile,
    bringInVsCodeTheme,
    chooseCodeColours,
    findVsCodeThemes,
    readCodeColours,
    removeCodeColours,
  } from "./desktopClient";
  import { kindOf, THEME_OWN } from "./presentation";
  import type { CodeColoursStatus, VsCodeTheme } from "./types";

  /**
   * Code colours from VS Code (0.77.0; the owner chose "bring in a theme" by card; docs/code-reading.md, step 2), under the themes
   * on Appearance: the theme's own code colours or a set brought in from a VS Code theme, the themes VS Code has on this computer
   * with Bring in beside each, and a sample of code in the colours in use. The host reads, checks and keeps everything; a colour
   * that cannot be read on the theme in use takes the theme's own for that kind of code, and the panel says how many did.
   */
  let { themeId }: { themeId: string } = $props();

  let status = $state<CodeColoursStatus | null>(null);
  let unread = $state<string | null>(null);
  let found = $state<VsCodeTheme[] | null>(null);
  let busy = $state(false);
  let removing = $state<string | null>(null);
  let said = $state<{ ok: boolean; words: string } | null>(null);

  /** A few lines of C# in every kind of code; its comment is the only words in it. */
  const sample = $derived([
    t("code-colours-sample-comment"),
    "public float Knots(Boat boat)",
    "{",
    "    if (boat.Afloat) return boat.Speed * 1.94f;",
    '    return Units.ToKnots(boat, Rounding.None, "Audeamus");',
    "}",
  ]);

  function took(next: CodeColoursStatus) {
    status = next;
    useCodeColours(next.active);
  }

  function refused(reason: string) {
    said = { ok: false, words: t("code-colours-failed", { reason }) };
  }

  async function load() {
    const answer = await readCodeColours();
    if (answer.state === "ready") took(answer.status);
    else if (answer.state === "failed") unread = answer.failure.detail;
  }

  // The set is made readable on the theme in use, so a change of theme reads it again.
  $effect(() => {
    void themeId;
    untrack(() => void load());
  });

  async function use(id: string, name: string) {
    busy = true;
    said = null;
    const answer = await chooseCodeColours(id);
    busy = false;
    if (answer.state !== "ready") return refused(answer.failure.detail);
    took(answer.status);
    said = { ok: true, words: t("code-colours-used", { name }) };
  }

  async function remove(id: string, name: string) {
    busy = true;
    said = null;
    const answer = await removeCodeColours(id);
    busy = false;
    removing = null;
    if (answer.state !== "ready") return refused(answer.failure.detail);
    took(answer.status);
    said = { ok: true, words: t("code-colours-removed", { name }) };
  }

  async function find() {
    busy = true;
    said = null;
    const answer = await findVsCodeThemes();
    busy = false;
    if (answer.state !== "ready") return refused(answer.failure.detail);
    found = answer.themes;
  }

  async function bringIn(theme: VsCodeTheme) {
    busy = true;
    said = null;
    const answer = await bringInVsCodeTheme(theme.file);
    busy = false;
    if (answer.state !== "done") return refused(answer.failure.detail);
    took(answer.moved.status);
    said = {
      ok: true,
      words: t("code-colours-brought-in", { name: theme.label }),
    };
  }

  async function bringInFile() {
    busy = true;
    said = null;
    const answer = await bringInCodeColoursFile(t("code-colours-import-title"));
    busy = false;
    if (answer.state !== "done") return refused(answer.failure.detail);
    if (!answer.moved.file) {
      said = { ok: true, words: t("themes-dialog-closed") };
      return;
    }
    took(answer.moved.status);
    said = {
      ok: true,
      words: t("code-colours-brought-in", {
        name: answer.moved.status.active?.name ?? answer.moved.file,
      }),
    };
  }
</script>

<section class="code-colours" aria-labelledby="code-colours-title">
  <h3 id="code-colours-title">{t("code-colours-title")}</h3>
  <p class="small">{t("code-colours-body")}</p>

  {#if unread}
    <p class="refused-line" role="status">
      {t("code-colours-unread", { reason: unread })}
    </p>
  {:else if status}
    {#if status.fell_back}
      <p class="refused-line" role="status">
        {t("code-colours-fell-back", { reason: status.fell_back })}
      </p>
    {/if}
    <ul class="sets" aria-label={t("code-colours-list")}>
      <li class="set" class:active={status.chosen === THEME_OWN}>
        <span class="set-name">{t("code-colours-own")}</span>
        <span class="muted small">{t("code-colours-own-detail")}</span>
        <div class="buttons">
          <button
            type="button"
            class="toggle"
            aria-pressed={status.chosen === THEME_OWN}
            disabled={busy || status.chosen === THEME_OWN}
            aria-label={t("code-colours-use-named", {
              name: t("code-colours-own"),
            })}
            onclick={() => use(THEME_OWN, t("code-colours-own"))}
            >{t("code-colours-use")}</button
          >
        </div>
      </li>
      {#each status.sets as set (set.id)}
        {@const chosen = status.chosen === set.id}
        <li class="set" class:active={chosen}>
          <span class="set-name">{set.name}</span>
          <span class="muted small"
            >{t("code-colours-set-detail", {
              from: set.from,
              kind: kindOf(set.kind),
              rules: set.rules,
            })}</span
          >
          <div class="buttons">
            <button
              type="button"
              class="toggle"
              aria-pressed={chosen}
              disabled={busy || chosen}
              aria-label={t("code-colours-use-named", { name: set.name })}
              onclick={() => use(set.id, set.name)}
              >{t("code-colours-use")}</button
            >
            {#if removing === set.id}
              <button
                type="button"
                class="action danger"
                disabled={busy}
                onclick={() => remove(set.id, set.name)}
                >{t("code-colours-remove-yes", { name: set.name })}</button
              >
              <button
                type="button"
                class="action"
                onclick={() => (removing = null)}
                >{t("themes-remove-no")}</button
              >
            {:else}
              <button
                type="button"
                class="action"
                disabled={busy}
                aria-label={t("code-colours-remove-named", { name: set.name })}
                onclick={() => (removing = set.id)}>{t("themes-remove")}</button
              >
            {/if}
          </div>
        </li>
      {/each}
    </ul>

    {#if status.active}
      {#if status.active.replaced > 0}
        <p class="small">
          {t("code-colours-replaced", {
            count: status.active.replaced,
            name: status.active.name,
          })}
        </p>
      {/if}
      {#each status.active.notes as note, index (index)}
        <p class="muted small">{note}</p>
      {/each}
    {/if}

    <CodeLines
      lines={sample}
      numbers={sample.map((_, index) => index + 1)}
      language="csharp"
      label={t("code-colours-sample-label")}
    />

    <div class="buttons">
      <button type="button" class="action" disabled={busy} onclick={find}
        >{t("code-colours-find")}</button
      >
      <button type="button" class="action" disabled={busy} onclick={bringInFile}
        >{t("code-colours-import")}</button
      >
    </div>

    {#if found}
      {#if found.length === 0}
        <p class="small">{t("code-colours-none-found")}</p>
      {:else}
        <ul class="found" aria-label={t("code-colours-found-list")}>
          {#each found as theme (theme.file)}
            <li>
              <span>
                <span class="set-name">{theme.label}</span>
                <span class="muted small"
                  >{t("code-colours-found-detail", {
                    extension: theme.extension,
                    kind: kindOf(theme.kind),
                  })}</span
                >
              </span>
              <button
                type="button"
                class="action"
                disabled={busy}
                aria-label={t("code-colours-bring-in-named", {
                  name: theme.label,
                })}
                onclick={() => bringIn(theme)}
                >{t("code-colours-bring-in")}</button
              >
            </li>
          {/each}
        </ul>
      {/if}
    {/if}

    {#each status.unreadable as [file, why] (file)}
      <p class="muted small">
        {t("code-colours-file-unreadable", { file, why })}
      </p>
    {/each}
  {/if}
  <div aria-live="polite">
    {#if said}
      <p class={said.ok ? "told" : "told refused"} role="status">
        {said.words}
      </p>
    {/if}
  </div>
</section>

<style>
  .code-colours {
    margin-top: 18px;
    padding-top: 12px;
    border-top: 1px solid var(--colour-line);
  }

  h3 {
    margin: 0 0 4px;
    font-size: var(--type-body);
    font-weight: 600;
  }

  .sets,
  .found {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 10px 0;
    padding: 0;
    list-style: none;
  }

  .set {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 2px 12px;
    align-items: center;
    padding: 8px 10px;
    background: var(--colour-surface);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .set.active {
    border-color: var(--colour-accent);
  }

  .set .buttons {
    grid-column: 2;
    grid-row: 1 / span 2;
  }

  .set-name {
    font-weight: 600;
  }

  .found li {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 4px 10px;
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .found li > span {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 6px;
  }

  .danger {
    border-color: var(--colour-risk);
    color: var(--colour-risk);
  }

  .refused-line {
    padding-inline-start: 8px;
    border-inline-start: 3px solid var(--colour-risk);
    overflow-wrap: anywhere;
  }

  .told {
    margin-top: 10px;
    padding: 6px 10px;
    border: 1px solid var(--colour-success);
    border-radius: 4px;
    overflow-wrap: anywhere;
  }

  .told.refused {
    border-color: var(--colour-risk);
  }

  @media (max-width: 600px) {
    .set {
      grid-template-columns: minmax(0, 1fr);
    }

    .set .buttons {
      grid-column: 1;
      grid-row: auto;
    }
  }
</style>
