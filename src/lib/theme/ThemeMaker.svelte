<script lang="ts">
  import { t } from "../i18n/runtime";
  import { exportDraft, keepTheme } from "./desktopClient";
  import {
    BUILT_IN_PREFIX,
    idFor,
    problems,
    themeFile,
    validColour,
    withCodeColours,
  } from "./presentation";
  import { applyTheme } from "./runtime";
  import type { Offered, Theme, ThemeStatus } from "./types";

  /**
   * Make your own theme (0.33.0, as OnAir's authoring tool): starts from any theme, every colour changed with Windows' colour
   * picker or by its #RRGGBB, a preview drawn in the draft's colours, and each pair that cannot be read listed as it changes. Keep
   * and use waits until every check passes; the host checks again. Save as a file works on a draft at any time. A failure keeps
   * the draft open, so nothing made is lost.
   */
  let {
    from,
    taken,
    onkept,
    oncancel,
  }: {
    from: Theme;
    taken: Offered[];
    onkept: (status: ThemeStatus) => void;
    oncancel: () => void;
  } = $props();

  /** Each role's words, by literal key so the catalogue check can read them. */
  const GROUPS: { title: string; note?: string; roles: [string, string][] }[] =
    [
      {
        title: "themes-group-surfaces",
        roles: [
          ["canvas", "themes-role-canvas"],
          ["surface", "themes-role-surface"],
          ["surface_raised", "themes-role-surface-raised"],
          ["surface_soft", "themes-role-surface-soft"],
        ],
      },
      {
        title: "themes-group-words",
        roles: [
          ["text", "themes-role-text"],
          ["text_muted", "themes-role-text-muted"],
          ["line", "themes-role-line"],
        ],
      },
      {
        title: "themes-group-meanings",
        roles: [
          ["accent", "themes-role-accent"],
          ["observed", "themes-role-observed"],
          ["comparison", "themes-role-comparison"],
          ["success", "themes-role-success"],
          ["risk", "themes-role-risk"],
        ],
      },
      {
        title: "themes-group-charts",
        roles: [
          ["series_1", "themes-role-series-1"],
          ["series_2", "themes-role-series-2"],
          ["series_3", "themes-role-series-3"],
          ["series_4", "themes-role-series-4"],
          ["series_5", "themes-role-series-5"],
          ["series_6", "themes-role-series-6"],
          ["series_7", "themes-role-series-7"],
          ["series_8", "themes-role-series-8"],
        ],
      },
      {
        title: "themes-group-code",
        note: "themes-group-code-note",
        roles: [
          ["code_keyword", "themes-role-code-keyword"],
          ["code_flow", "themes-role-code-flow"],
          ["code_type", "themes-role-code-type"],
          ["code_function", "themes-role-code-function"],
          ["code_variable", "themes-role-code-variable"],
          ["code_constant", "themes-role-code-constant"],
          ["code_string", "themes-role-code-string"],
          ["code_number", "themes-role-code-number"],
          ["code_comment", "themes-role-code-comment"],
          ["code_tag", "themes-role-code-tag"],
          ["code_punctuation", "themes-role-code-punctuation"],
          ["code_plain", "themes-role-code-plain"],
        ],
      },
    ];
  const WORDS: Record<string, string> = {
    ...Object.fromEntries(GROUPS.flatMap((g) => g.roles)),
    diff_removed: "themes-role-diff-removed",
    diff_added: "themes-role-diff-added",
    shade_accent: "themes-role-shade-accent",
    shade_observed: "themes-role-shade-observed",
    shade_comparison: "themes-role-shade-comparison",
    shade_success: "themes-role-shade-success",
    shade_risk: "themes-role-shade-risk",
  };

  // svelte-ignore state_referenced_locally
  let name = $state(
    from.id.startsWith(BUILT_IN_PREFIX)
      ? t("themes-made-name", { name: from.name })
      : from.name,
  );
  // svelte-ignore state_referenced_locally
  let author = $state(
    from.id.startsWith(BUILT_IN_PREFIX) ? "" : (from.author ?? ""),
  );
  // svelte-ignore state_referenced_locally
  let colours = $state<Record<string, string>>(
    withCodeColours({ ...from.colours }),
  );
  let typed = $state<Record<string, string>>({});
  let working = $state(false);
  let said = $state<{ ok: boolean; words: string } | null>(null);
  let preview = $state<HTMLDivElement | null>(null);

  const id = $derived(idFor(name));
  const replaces = $derived(
    taken.find((o) => !o.built_in && o.theme.id === id) ?? null,
  );
  const failing = $derived(problems(colours));
  const draft = $derived<Theme>({
    schema_version: 1,
    id,
    name: name.trim(),
    ...(author.trim() ? { author: author.trim() } : {}),
    colours,
  });
  const shapeOk = $derived(
    name.trim().length > 0 && name.trim().length <= 64 && author.length <= 80,
  );

  $effect(() => {
    if (preview) applyTheme(colours, preview);
  });

  function pick(role: string, value: string) {
    colours = { ...colours, [role]: value.toUpperCase() };
    typed = { ...typed, [role]: value.toUpperCase() };
  }

  function type(role: string, value: string) {
    typed = { ...typed, [role]: value };
    const written = value.trim().startsWith("#")
      ? value.trim()
      : `#${value.trim()}`;
    if (validColour(written))
      colours = { ...colours, [role]: written.toUpperCase() };
  }

  async function keep() {
    working = true;
    said = null;
    const answer = await keepTheme(themeFile(draft));
    working = false;
    if (answer.state !== "ready") {
      said = {
        ok: false,
        words: t("themes-make-failed", { reason: answer.failure.detail }),
      };
      return;
    }
    onkept(answer.status);
  }

  async function saveFile() {
    working = true;
    said = null;
    const answer = await exportDraft(
      themeFile(draft),
      t("themes-export-title", { name: draft.name }),
    );
    working = false;
    if (answer.state !== "done") {
      said = {
        ok: false,
        words: t("themes-make-failed", { reason: answer.failure.detail }),
      };
      return;
    }
    said = answer.moved.file
      ? {
          ok: true,
          words: t("themes-exported", {
            name: draft.name,
            path: answer.moved.file,
          }),
        }
      : { ok: true, words: t("themes-dialog-closed") };
  }
</script>

<section class="maker" aria-labelledby="theme-maker-title">
  <h3 id="theme-maker-title">{t("themes-make-title", { name: from.name })}</h3>
  <p class="small">{t("themes-make-body")}</p>

  <div class="names">
    <label for="theme-name">{t("themes-name")}</label>
    <input id="theme-name" type="text" bind:value={name} autocomplete="off" />
    <label for="theme-author">{t("themes-author-label")}</label>
    <input
      id="theme-author"
      type="text"
      bind:value={author}
      autocomplete="off"
    />
    <p class="muted small">
      {replaces
        ? t("themes-id-replaces", { id, name: replaces.theme.name })
        : t("themes-id", { id })}
    </p>
  </div>

  <div class="layout">
    <div class="roles">
      {#each GROUPS as group (group.title)}
        <fieldset>
          <legend>{t(group.title)}</legend>
          {#if group.note}<p class="muted small note">{t(group.note)}</p>{/if}
          {#each group.roles as [role] (role)}
            <div class="role">
              <input
                type="color"
                id={`theme-colour-${role}`}
                value={colours[role].toLowerCase()}
                aria-label={t("themes-pick-colour", { role: t(WORDS[role]) })}
                oninput={(event) =>
                  pick(role, (event.currentTarget as HTMLInputElement).value)}
              />
              <label for={`theme-hex-${role}`}>{t(WORDS[role])}</label>
              <input
                id={`theme-hex-${role}`}
                class="hex"
                type="text"
                spellcheck="false"
                autocomplete="off"
                value={typed[role] ?? colours[role]}
                aria-invalid={typed[role] !== undefined &&
                  !validColour(
                    typed[role].trim().startsWith("#")
                      ? typed[role].trim()
                      : `#${typed[role].trim()}`,
                  )}
                oninput={(event) =>
                  type(role, (event.currentTarget as HTMLInputElement).value)}
              />
            </div>
          {/each}
        </fieldset>
      {/each}
    </div>

    <div class="side">
      <div
        class="preview"
        bind:this={preview}
        role="img"
        aria-label={t("themes-preview-label")}
      >
        <p class="p-title">{t("themes-preview-title")}</p>
        <p class="p-text">{t("themes-preview-text")}</p>
        <p class="p-muted">{t("themes-preview-muted")}</p>
        <hr />
        <p class="p-tags">
          <span class="p-accent">{t("themes-role-accent")}</span>
          <span class="p-observed">{t("themes-role-observed")}</span>
          <span class="p-comparison">{t("themes-role-comparison")}</span>
          <span class="p-success">{t("themes-role-success")}</span>
          <span class="p-risk">{t("themes-role-risk")}</span>
        </p>
        <div class="p-raised">
          <span class="p-button">{t("themes-preview-button")}</span>
          <span class="p-soft">{t("themes-preview-soft")}</span>
        </div>
        <div class="p-bars">
          {#each [1, 2, 3, 4, 5, 6, 7, 8] as n (n)}
            <span
              style:background={`var(--colour-series-${n})`}
              style:height={`${30 + ((n * 37) % 50)}%`}
            ></span>
          {/each}
        </div>
        <!-- A few lines of code in each code colour (0.76.0); the words of its comment are the only words in it. -->
        <div class="p-code code-colours">
          <code
            ><span class="tok-comment">{t("themes-preview-code-comment")}</span
            ></code
          >
          <code
            ><span class="tok-keyword">public</span>
            <span class="tok-keyword">float</span>
            <span class="tok-function">Knots</span>(<span class="tok-type"
              >Boat</span
            > <span class="tok-variable">boat</span>)</code
          >
          <code class="p-removed">
            <span class="tok-flow">return</span>
            <span class="tok-variable">boat</span>.<span class="tok-variable"
              >Speed</span
            ><span class="tok-punctuation"> * </span><span class="tok-number"
              >1.94</span
            >;</code
          >
          <code class="p-added">
            <span class="tok-flow">return</span>
            <span class="tok-type">Units</span>.<span class="tok-function"
              >ToKnots</span
            >(<span class="tok-variable">boat</span>,
            <span class="tok-constant">Rounding</span>.<span
              class="tok-constant">None</span
            >, <span class="tok-string">"Audeamus"</span>);</code
          >
          <code
            ><span class="tok-punctuation">&lt;</span><span class="tok-tag"
              >defName</span
            ><span class="tok-punctuation">&gt;</span>Boat<span
              class="tok-punctuation">&lt;/</span
            ><span class="tok-tag">defName</span><span class="tok-punctuation"
              >&gt;</span
            ></code
          >
        </div>
      </div>

      <div class="checks" aria-live="polite">
        {#if failing.length === 0}
          <p class="ok">{t("themes-checks-ok")}</p>
        {:else}
          <p class="bad">
            {t("themes-checks-bad", { count: failing.length })}
          </p>
          <ul>
            {#each failing.slice(0, 12) as problem (`${problem.role}/${problem.on}`)}
              <li class="small">
                {t("themes-check", {
                  role: t(WORDS[problem.role]),
                  on: t(WORDS[problem.on]),
                  ratio: problem.ratio.toFixed(2),
                  needs: problem.needs,
                })}
              </li>
            {/each}
          </ul>
          {#if failing.length > 12}<p class="muted small">
              {t("themes-checks-more", { count: failing.length - 12 })}
            </p>{/if}
        {/if}
      </div>

      <div class="buttons">
        <button
          type="button"
          class="action"
          disabled={working || failing.length > 0 || !shapeOk}
          onclick={keep}>{t("themes-keep")}</button
        >
        <button
          type="button"
          class="action"
          disabled={working || !shapeOk}
          onclick={saveFile}>{t("themes-save-draft")}</button
        >
        <button
          type="button"
          class="action"
          disabled={working}
          onclick={oncancel}>{t("themes-cancel")}</button
        >
      </div>
      <div aria-live="polite">
        {#if said}
          <p class={said.ok ? "told" : "told refused"} role="status">
            {said.words}
          </p>
        {/if}
      </div>
    </div>
  </div>
</section>

<style>
  .maker {
    margin-top: 10px;
  }

  h3 {
    margin: 0 0 4px;
    font-size: var(--type-body);
    font-weight: 600;
  }

  .names {
    display: grid;
    grid-template-columns: max-content minmax(0, 360px);
    gap: 6px 10px;
    align-items: center;
    margin: 8px 0;
  }

  .names p {
    grid-column: 1 / -1;
    margin: 0;
  }

  input[type="text"] {
    min-height: var(--control-min);
    padding-inline: 10px;
    font: inherit;
    color: var(--colour-text);
    background: var(--colour-canvas);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  input[aria-invalid="true"] {
    border-color: var(--colour-risk);
  }

  .layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 16px;
  }

  @media (max-width: 900px) {
    .layout {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  fieldset {
    margin: 0 0 10px;
    padding: 8px 10px;
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  legend {
    padding-inline: 4px;
    font-weight: 600;
  }

  .role {
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr) 110px;
    gap: 8px;
    align-items: center;
    margin: 4px 0;
  }

  .role label {
    font-size: var(--type-small);
  }

  input[type="color"] {
    width: 44px;
    height: 32px;
    padding: 0;
    background: none;
    border: 1px solid var(--colour-line);
    border-radius: 4px;
    cursor: pointer;
  }

  .hex {
    width: 110px;
    font-family: ui-monospace, monospace;
  }

  .preview {
    padding: 14px;
    color: var(--colour-text);
    background: var(--colour-canvas);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .preview p {
    margin: 0 0 6px;
  }

  .p-title {
    font-family: var(--font-display);
    font-size: 1.25rem;
    color: var(--colour-accent);
  }

  .p-muted {
    color: var(--colour-text-muted);
  }

  .preview hr {
    border: 0;
    border-top: 1px solid var(--colour-line);
  }

  .p-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 12px;
    font-size: var(--type-small);
  }

  .p-accent {
    color: var(--colour-accent);
  }
  .p-observed {
    color: var(--colour-observed);
  }
  .p-comparison {
    color: var(--colour-comparison);
  }
  .p-success {
    color: var(--colour-success);
  }
  .p-risk {
    color: var(--colour-risk);
  }

  .p-raised {
    display: flex;
    gap: 8px;
    padding: 8px;
    background: var(--colour-surface-raised);
    border-radius: 4px;
  }

  .p-button {
    padding: 4px 10px;
    color: var(--colour-text);
    background: var(--colour-surface);
    border: 1px solid var(--colour-accent);
    border-radius: 4px;
  }

  .p-soft {
    padding: 4px 10px;
    color: var(--colour-text-muted);
    background: var(--colour-surface-soft);
    border-radius: 4px;
  }

  .p-bars {
    display: flex;
    align-items: flex-end;
    gap: 4px;
    height: 60px;
    margin-top: 10px;
    padding: 6px;
    background: var(--colour-surface);
    border-radius: 4px;
  }

  .p-bars span {
    flex: 1;
    border-radius: 2px 2px 0 0;
  }

  .p-code {
    display: flex;
    flex-direction: column;
    margin-top: 10px;
    padding: 6px 0;
    font-family: var(--font-mono, ui-monospace, Consolas, monospace);
    font-size: var(--type-caption);
    line-height: 1.55;
    background: var(--colour-canvas);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  /* A sample, so its lines wrap rather than scroll: nothing in a preview needs reaching by keyboard. */
  .p-code code {
    padding-inline: 10px;
    font: inherit;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    border-inline-start: 4px solid transparent;
  }

  /* Removed and added lines' backgrounds, mixed here from the draft's own colours as app.css mixes them (DIFF_SHARE). */
  .p-code .p-removed {
    background: color-mix(
      in srgb,
      var(--colour-risk) 20%,
      var(--colour-canvas)
    );
    border-inline-start-color: var(--colour-risk);
  }

  .p-code .p-added {
    background: color-mix(
      in srgb,
      var(--colour-success) 20%,
      var(--colour-canvas)
    );
    border-inline-start-color: var(--colour-success);
  }

  /* The two lines inside the method, indented as code is (the markup's own spaces are squeezed to one). */
  .p-code .p-removed,
  .p-code .p-added {
    padding-inline-start: calc(10px + 3ch);
  }

  .note {
    margin: 0 0 6px;
  }

  .checks {
    margin-top: 10px;
  }

  .checks ul {
    margin: 4px 0;
    padding-inline-start: 18px;
  }

  .ok {
    color: var(--colour-success);
  }

  .bad {
    color: var(--colour-risk);
    font-weight: 600;
  }

  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
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
