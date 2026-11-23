<script lang="ts">
  import { t } from "../i18n/runtime";
  import type { CodeName, Snippet } from "../connections/types";
  import CodeLines from "./CodeLines.svelte";
  import { languageOf } from "./names";

  /**
   * What a name pressed in code is (0.79.0; docs/code-reading.md steps 4, 5 and 7): in C# as the kit's names reader read it with
   * Roslyn; in Lua, Python and XML by name (0.81.0), with the things it may stand for to choose from; and, where the game has a
   * table of them, a name that crosses between its data files and its code, read by a rule that the card names (0.83.0): a
   * translation key the code asks for, a class or a Def a data file names. Its kind and signature, where it is declared, and how
   * often the lines shown name it; then Go there, How it connects and Read their code, each only where it can lead somewhere. A
   * C# name may `also` stand for a thing of the game's data (a DefOf field's Def), shown beneath with its own lines. Presentation
   * only: every move is the viewer's. `name` is the thing chosen; `pressed` the name as read.
   */
  let {
    name,
    pressed,
    chosenCandidate,
    uses,
    snippet,
    snippetOpen,
    canConnect,
    their,
    also = null,
    alsoSnippet = null,
    alsoOpen = false,
    ongo,
    onconnect,
    ontheir,
    onletgo,
    onchoose,
    onalso = () => {},
    onalsoconnect = () => {},
  }: {
    name: CodeName;
    pressed: CodeName;
    chosenCandidate: number;
    uses: number;
    /** The lines of its declaration, when it is this repository's and the reader kept them. */
    snippet: Snippet | null;
    snippetOpen: boolean;
    canConnect: boolean;
    /** Another author's name for it, when Read their code can open it. */
    their: string | null;
    /** What the name also stands for in the game's data, its lines when they were kept, and whether they are open. */
    also?: CodeName | null;
    alsoSnippet?: Snippet | null;
    alsoOpen?: boolean;
    onalso?: () => void;
    onalsoconnect?: () => void;
    ongo: () => void;
    onconnect: () => void;
    ontheir: () => void;
    onletgo: () => void;
    onchoose: (index: number) => void;
  } = $props();

  const candidates = $derived(pressed.candidates ?? []);

  const where = $derived(
    name.declared.file
      ? t("code-name-declared-here", {
          file: name.declared.file,
          line: name.declared.line ?? 0,
        })
      : name.declared.assembly
        ? t("code-name-declared-outside", { assembly: name.declared.assembly })
        : name.outside
          ? t("code-name-declared-nowhere")
          : t("code-name-declared-unknown"),
  );
</script>

<section
  class="name-card"
  aria-label={t("code-name-card", { name: name.text })}
>
  <p class="title">
    <code class="name">{name.text}</code>
    <span class="kind">{name.kind}</span>
  </p>
  <p class="signature"><code>{name.display}</code></p>
  <p class="small">{where}</p>
  {#if pressed.exact === false}
    <!-- Read by a rule of the game's table (0.83.0), or by name (0.81.0): what it may stand for, to choose from when there is
         more than one. -->
    {#if pressed.rule}
      <p class="small muted">
        {t("code-name-by-rule", { words: pressed.ruleWords ?? pressed.rule })}
      </p>
    {:else}
      <p class="small muted">
        {t("code-name-by-name", {
          count: candidates.length + (pressed.more ?? 0),
        })}
      </p>
    {/if}
    {#if candidates.length > 1}
      <div
        class="toggles candidates"
        role="group"
        aria-label={t("code-name-candidates", { name: pressed.text })}
      >
        {#each candidates as candidate, index (candidate.id)}
          <button
            type="button"
            class="toggle"
            aria-pressed={chosenCandidate === index}
            onclick={() => onchoose(index)}
            >{candidate.name}
            <span class="muted small"
              >{t("code-name-candidate-where", {
                file: candidate.file,
                line: candidate.line,
              })}</span
            ></button
          >
        {/each}
      </div>
      {#if (pressed.more ?? 0) > 0}
        <p class="small muted">
          {t("code-name-candidates-more", { count: pressed.more ?? 0 })}
        </p>
      {/if}
    {/if}
  {/if}
  <p class="small muted">{t("code-name-uses", { count: uses })}</p>
  <div class="buttons">
    {#if name.declared.file && !name.here}
      <button type="button" class="action" onclick={ongo}
        >{snippetOpen ? t("code-name-hide") : t("code-name-go")}</button
      >
    {/if}
    {#if canConnect}
      <button type="button" class="action" onclick={onconnect}
        >{t("code-name-connections", { name: name.text })}</button
      >
    {/if}
    {#if their}
      <button type="button" class="action" onclick={ontheir}
        >{t("code-name-their")}</button
      >
    {/if}
    <button type="button" class="action" onclick={onletgo}
      >{t("code-name-let-go")}</button
    >
  </div>
  {#if snippetOpen && snippet}
    <CodeLines
      lines={snippet.lines}
      numbers={snippet.lines.map((_, index) => snippet.start + index)}
      language={languageOf(snippet.file)}
      label={t("code-name-snippet", {
        name: name.text,
        file: snippet.file,
        line: snippet.start,
      })}
    />
    {#if snippet.cut}
      <p class="small muted">
        {t("code-name-snippet-cut", { end: snippet.end })}
      </p>
    {/if}
  {/if}
  {#if also}
    <!-- What a C# name also stands for in the game's data (0.83.0): a DefOf field's Def, found by the rule that read the
         field's own line. -->
    <div class="also">
      <p class="small">
        {t("code-name-also", {
          kind: also.kind,
          name: also.display,
          file: also.declared.file ?? "",
          line: also.declared.line ?? 0,
        })}
      </p>
      <p class="small muted">
        {t("code-name-by-rule", { words: also.ruleWords ?? also.rule ?? "" })}
      </p>
      <div class="buttons">
        {#if alsoSnippet}
          <button type="button" class="action" onclick={onalso}
            >{alsoOpen
              ? t("code-name-also-hide", { kind: also.kind })
              : t("code-name-also-show", { kind: also.kind })}</button
          >
        {/if}
        {#if also.node}
          <button type="button" class="action" onclick={onalsoconnect}
            >{t("code-name-also-connections", {
              kind: also.kind,
              name: also.display,
            })}</button
          >
        {/if}
      </div>
      {#if alsoOpen && alsoSnippet}
        <CodeLines
          lines={alsoSnippet.lines}
          numbers={alsoSnippet.lines.map(
            (_, index) => alsoSnippet.start + index,
          )}
          language={languageOf(alsoSnippet.file)}
          label={t("code-name-snippet", {
            name: also.display,
            file: alsoSnippet.file,
            line: alsoSnippet.start,
          })}
        />
        {#if alsoSnippet.cut}
          <p class="small muted">
            {t("code-name-snippet-cut", { end: alsoSnippet.end })}
          </p>
        {/if}
      {/if}
    </div>
  {/if}
</section>

<style>
  /* The card stays in view above the code. It takes at most half the height of the pane that holds it (the viewer makes the
     pane a size container), and scrolls within itself beyond that (0.83.0): a tall card, with a declaration's lines open or in a
     narrow window where the pane is short, used to cover the code it is about, so no name beneath it could be pressed. */
  .name-card {
    position: sticky;
    top: 0;
    z-index: 1;
    max-height: max(50cqh, 5rem);
    overflow-y: auto;
    margin: 0 12px 10px;
    padding: 8px 12px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-accent);
    border-radius: 4px;
  }

  p {
    margin: 0 0 4px;
  }

  .title {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 10px;
  }

  .name {
    font-family: var(--font-mono, ui-monospace, Consolas, monospace);
    font-size: var(--type-body);
    font-weight: 600;
    color: var(--colour-accent);
  }

  .kind {
    font-size: var(--type-small);
    color: var(--colour-text-muted);
  }

  .signature code {
    font-family: var(--font-mono, ui-monospace, Consolas, monospace);
    font-size: var(--type-small);
    overflow-wrap: anywhere;
  }

  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 6px 0;
  }

  .candidates {
    margin: 4px 0;
  }

  .also {
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px solid var(--colour-line);
  }

  .candidates .toggle {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
</style>
