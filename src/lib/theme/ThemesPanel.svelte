<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import {
    chooseTheme,
    exportTheme,
    importTheme,
    readThemes,
    removeTheme,
  } from "./desktopClient";
  import { SWATCHES } from "./presentation";
  import { useTheme } from "./runtime";
  import CodeColoursPanel from "./CodeColoursPanel.svelte";
  import ThemeMaker from "./ThemeMaker.svelte";
  import type { Offered, Theme, ThemeStatus } from "./types";

  /**
   * Appearance, on the Settings page (0.33.0; the owner: themes "as OnAir has them"): every theme on offer drawn in its own
   * colours; Use this takes effect at once and is kept; a theme file can be brought in or saved elsewhere; the owner's own can be
   * removed (after a second press) or made from any theme. A theme is data only, checked by the host before it is used.
   */
  let status = $state<ThemeStatus | null>(null);
  let unread = $state<string | null>(null);
  let busy = $state(false);
  let removing = $state<string | null>(null);
  let making = $state<Theme | null>(null);
  let said = $state<{ ok: boolean; words: string } | null>(null);

  async function load() {
    const answer = await readThemes();
    if (answer.state === "ready") status = answer.status;
    else if (answer.state === "failed") unread = answer.failure.detail;
  }

  function took(next: ThemeStatus) {
    status = next;
    useTheme(next.active.colours);
  }

  async function use(offered: Offered) {
    busy = true;
    said = null;
    const answer = await chooseTheme(offered.theme.id);
    busy = false;
    if (answer.state !== "ready") {
      said = {
        ok: false,
        words: t("themes-failed", { reason: answer.failure.detail }),
      };
      return;
    }
    took(answer.status);
    said = { ok: true, words: t("themes-used", { name: offered.theme.name }) };
  }

  async function bringIn() {
    busy = true;
    said = null;
    const answer = await importTheme(t("themes-import-title"));
    busy = false;
    if (answer.state !== "done") {
      said = {
        ok: false,
        words: t("themes-failed", { reason: answer.failure.detail }),
      };
      return;
    }
    if (!answer.moved.file) {
      said = { ok: true, words: t("themes-dialog-closed") };
      return;
    }
    took(answer.moved.status);
    said = {
      ok: true,
      words: t("themes-imported", { name: answer.moved.status.active.name }),
    };
  }

  async function saveCopy(offered: Offered) {
    busy = true;
    said = null;
    const answer = await exportTheme(
      offered.theme.id,
      t("themes-export-title", { name: offered.theme.name }),
    );
    busy = false;
    if (answer.state !== "done") {
      said = {
        ok: false,
        words: t("themes-failed", { reason: answer.failure.detail }),
      };
      return;
    }
    said = answer.moved.file
      ? {
          ok: true,
          words: t("themes-exported", {
            name: offered.theme.name,
            path: answer.moved.file,
          }),
        }
      : { ok: true, words: t("themes-dialog-closed") };
  }

  async function remove(offered: Offered) {
    busy = true;
    said = null;
    const answer = await removeTheme(offered.theme.id);
    busy = false;
    removing = null;
    if (answer.state !== "ready") {
      said = {
        ok: false,
        words: t("themes-failed", { reason: answer.failure.detail }),
      };
      return;
    }
    took(answer.status);
    said = {
      ok: true,
      words: t("themes-removed", { name: offered.theme.name }),
    };
  }

  function made(next: ThemeStatus) {
    making = null;
    took(next);
    said = { ok: true, words: t("themes-made", { name: next.active.name }) };
  }

  onMount(load);
</script>

<section id="settings-themes" class="themes" aria-labelledby="themes-title">
  <h2 id="themes-title">{t("themes-title")}</h2>
  <p class="small">{t("themes-body")}</p>

  {#if unread}
    <p class="refused-line" role="status">
      {t("themes-unread", { reason: unread })}
    </p>
  {:else if status}
    {#if status.fell_back}
      <p class="refused-line" role="status">
        {t("themes-fell-back", { reason: status.fell_back })}
      </p>
    {/if}
    {#if making}
      <ThemeMaker
        from={making}
        taken={status.themes}
        onkept={made}
        oncancel={() => (making = null)}
      />
    {:else}
      <ul class="cards" aria-label={t("themes-list")}>
        {#each status.themes as offered (offered.theme.id)}
          {@const c = offered.theme.colours}
          {@const active = status.active.id === offered.theme.id}
          <li class="card" class:active>
            <div
              class="preview"
              style:background={c.canvas}
              style:border-color={c.line}
              aria-hidden="true"
            >
              <div class="panel" style:background={c.surface_raised}>
                <span style:color={c.text}>{offered.theme.name}</span>
                <span style:color={c.text_muted}>{t("themes-sample")}</span>
                <span class="chips">
                  {#each SWATCHES as role (role)}
                    <span class="chip" style:background={c[role]}></span>
                  {/each}
                </span>
              </div>
            </div>
            <h3>
              {offered.theme.name}
              {#if active}<span class="in-use">· {t("themes-in-use")}</span
                >{/if}
            </h3>
            <p class="muted small">
              {offered.built_in ? t("themes-built-in") : t("themes-yours")}
              <!-- A file's author is its own claim, never checked (as OnAir labels it); the program's own need none. -->
              {#if offered.theme.author && !offered.built_in}· {t(
                  "themes-author",
                  {
                    author: offered.theme.author,
                  },
                )}{/if}
            </p>
            <div class="buttons">
              <button
                type="button"
                class="toggle"
                aria-pressed={active}
                disabled={busy || active}
                aria-label={t("themes-use-named", { name: offered.theme.name })}
                onclick={() => use(offered)}>{t("themes-use")}</button
              >
              <button
                type="button"
                class="action"
                disabled={busy}
                aria-label={t("themes-make-named", {
                  name: offered.theme.name,
                })}
                onclick={() => (making = offered.theme)}
                >{t("themes-make")}</button
              >
              <button
                type="button"
                class="action"
                disabled={busy}
                aria-label={t("themes-export-named", {
                  name: offered.theme.name,
                })}
                onclick={() => saveCopy(offered)}>{t("themes-export")}</button
              >
              {#if !offered.built_in}
                {#if removing === offered.theme.id}
                  <button
                    type="button"
                    class="action danger"
                    disabled={busy}
                    onclick={() => remove(offered)}
                    >{t("themes-remove-yes", {
                      name: offered.theme.name,
                    })}</button
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
                    aria-label={t("themes-remove-named", {
                      name: offered.theme.name,
                    })}
                    onclick={() => (removing = offered.theme.id)}
                    >{t("themes-remove")}</button
                  >
                {/if}
              {/if}
            </div>
          </li>
        {/each}
      </ul>
      <div class="buttons">
        <button type="button" class="action" disabled={busy} onclick={bringIn}
          >{t("themes-import")}</button
        >
      </div>
      {#each status.unreadable as [file, why] (file)}
        <p class="muted small">{t("themes-file-unreadable", { file, why })}</p>
      {/each}
      <p class="muted small">{t("themes-how")}</p>
      <CodeColoursPanel themeId={status.active.id} />
    {/if}
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
  .themes {
    margin-bottom: 20px;
    padding: 16px 20px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  h2 {
    margin-bottom: 6px;
    font-family: var(--font-display);
    font-size: 1.25rem;
    font-weight: 600;
  }

  h3 {
    margin: 8px 0 2px;
    font-size: var(--type-body);
    font-weight: 600;
  }

  .in-use {
    color: var(--colour-accent);
    font-weight: 400;
  }

  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
    gap: 12px;
    margin: 10px 0;
    padding: 0;
    list-style: none;
  }

  .card {
    padding: 10px;
    background: var(--colour-surface);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .card.active {
    border-color: var(--colour-accent);
    box-shadow: 0 0 0 1px var(--colour-accent);
  }

  .preview {
    padding: 10px;
    border: 1px solid;
    border-radius: 4px;
  }

  .panel {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 10px;
    border-radius: 3px;
    font-size: var(--type-small);
  }

  .chips {
    display: flex;
    gap: 4px;
    margin-top: 4px;
  }

  .chip {
    width: 22px;
    height: 10px;
    border-radius: 2px;
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
</style>
