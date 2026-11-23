<script lang="ts">
  import { t } from "../i18n/runtime";
  import type { CodeName, Snippet } from "../connections/types";
  import CodeLines from "./CodeLines.svelte";
  import { languageOf } from "./names";

  /**
   * What a name pressed in code is (0.79.0; docs/code-reading.md steps 4 and 5): in C# as the kit's names reader read it with
   * Roslyn; in Lua, Python and XML by name (0.81.0), with the things it may stand for to choose from. Its kind and signature, where
   * it is declared, and how often the lines shown name it; then Go there, How it connects and Read their code, each only where it
   * can lead somewhere. Presentation only: every move is the viewer's. `name` is the thing chosen; `pressed` the name as read.
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
    ongo,
    onconnect,
    ontheir,
    onletgo,
    onchoose,
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
    <!-- Read by name (0.81.0): what it may stand for, to choose from when there is more than one. -->
    <p class="small muted">
      {t("code-name-by-name", {
        count: candidates.length + (pressed.more ?? 0),
      })}
    </p>
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
</section>

<style>
  .name-card {
    position: sticky;
    top: 0;
    z-index: 1;
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

  .candidates .toggle {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
</style>
