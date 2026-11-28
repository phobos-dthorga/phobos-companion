<script lang="ts">
  import CostTag from "../performance/CostTag.svelte";
  import { untrack } from "svelte";
  import CodeLines from "../code/CodeLines.svelte";
  import { t } from "../i18n/runtime";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import Placeholder from "../shell/Placeholder.svelte";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import { heard, started } from "../shell/progress";
  import type { Failure } from "../shell/types";
  import { askTheirCode, decompileAssembly } from "./desktopClient";
  import { isGameItself } from "./presentation";
  import type { Decompiled, Held, Holder, Shown } from "./types";

  /**
   * Their code (0.26.0; the owner chose "Read and compare, on your press"): another author's type or member, from their public
   * source when it is kept, else from a decompile. When neither is kept it names the assembly that declares it and offers to
   * decompile it, on a press. It only reads, except that press, which writes into the tools' own cache.
   */
  let {
    game,
    repository,
    name,
    onclose,
  }: { game: string; repository: string; name: string; onclose: () => void } =
    $props();

  type State =
    | { state: "reading" }
    | { state: "none" }
    | { state: "shown"; shown: Shown }
    | { state: "holders"; holders: Holder[] }
    | { state: "decompiling"; holder: Holder }
    | { state: "refused"; reason: string }
    | { state: "failed"; failure: Failure };

  let view = $state<State>({ state: "reading" });
  let progress = $state(started());
  let chosen = $state(0);

  async function read() {
    view = { state: "reading" };
    progress = started();
    chosen = 0;
    const asked = await askTheirCode<Shown>(
      game,
      repository,
      "show",
      name,
      (m) => {
        progress = heard(progress, m);
      },
    );
    if (asked.state === "failed") return (view = asked);
    const answer = asked.answer;
    if (!answer.available) return (view = { state: "none" });
    if (!answer.ok)
      return (view = { state: "refused", reason: answer.refusal ?? "" });
    if (answer.data.found.length > 0)
      return (view = { state: "shown", shown: answer.data });
    const held = await askTheirCode<Held>(
      game,
      repository,
      "holder",
      name,
      (m) => {
        progress = heard(progress, m);
      },
    );
    if (held.state === "failed") return (view = held);
    view = held.answer.ok
      ? { state: "holders", holders: held.answer.data.holders }
      : { state: "refused", reason: held.answer.refusal ?? "" };
  }

  async function decompile(holder: Holder) {
    view = { state: "decompiling", holder };
    progress = started();
    const done = await decompileAssembly<Decompiled>(
      game,
      repository,
      holder.path,
      (m) => {
        progress = heard(progress, m);
      },
    );
    if (done.state === "failed") return (view = done);
    if (!done.answer.ok)
      return (view = { state: "refused", reason: done.answer.refusal ?? "" });
    await read();
  }

  $effect(() => {
    void name;
    untrack(() => void read());
  });

  const declaration = $derived(
    view.state === "shown" ? (view.shown.found[chosen] ?? null) : null,
  );
</script>

<section class="their" aria-labelledby="their-title">
  <div class="head">
    <div>
      <div class="eyebrow accent">{t("their-kicker")}</div>
      <h2 id="their-title">{name}</h2>
      <CostTag {game} method={name} />
    </div>
    <button type="button" class="action" onclick={onclose}
      >{t("their-close")}</button
    >
  </div>

  {#if view.state === "reading"}
    <ProgressBar {progress} fallback={t("their-reading")} />
    <p class="small muted">{t("their-reading-note")}</p>
    <Placeholder shape="rows" rows={6} />
  {:else if view.state === "decompiling"}
    <ProgressBar
      {progress}
      fallback={t("their-decompiling", { file: view.holder.assembly ?? "" })}
    />
    <p class="small muted">{t("their-decompiling-note")}</p>
  {:else if view.state === "none"}
    <p class="lead">{t("their-none")}</p>
  {:else if view.state === "refused"}
    <p class="lead">{t("their-refused", { reason: view.reason })}</p>
  {:else if view.state === "failed"}
    <FailurePanel failure={view.failure} onretry={read} />
  {:else if view.state === "holders"}
    {#if view.holders.length === 0}
      <p class="lead">{t("their-nowhere")}</p>
    {:else}
      <p>{t("their-not-kept")}</p>
      <ul class="holders">
        {#each view.holders as holder (holder.path)}
          <li>
            <p>
              {t("their-held", {
                type: holder.type,
                file: `${holder.assembly ?? "?"}.dll`,
                mod: holder.mod ?? t("their-unknown-mod"),
              })}
            </p>
            {#if isGameItself(holder)}
              <p class="small muted">{t("their-game-slow")}</p>
            {/if}
            <button
              type="button"
              class="action"
              onclick={() => void decompile(holder)}
              >{t("their-decompile", {
                file: `${holder.assembly ?? "?"}.dll`,
              })}</button
            >
          </li>
        {/each}
      </ul>
      <p class="small muted">{t("their-decompile-how")}</p>
    {/if}
  {:else if view.state === "shown" && declaration}
    {#if view.shown.found.length > 1}
      <div class="toggles" role="group" aria-label={t("their-choose")}>
        {#each view.shown.found as item, index (`${item.corpus}/${item.file}/${item.start}`)}
          <button
            type="button"
            class="toggle"
            aria-pressed={index === chosen}
            onclick={() => (chosen = index)}
            >{item.full}
            <span class="muted small">{item.corpus}</span></button
          >
        {/each}
      </div>
    {/if}
    <p class="from" class:decompiled={declaration.source === "decompiled"}>
      {declaration.source === "source"
        ? t("their-from-source", {
            corpus: declaration.corpus,
            file: declaration.file,
            line: declaration.start,
          })
        : t("their-from-decompile", {
            corpus: declaration.corpus,
            file: declaration.file,
            line: declaration.start,
          })}
    </p>
    <CodeLines
      lines={declaration.lines}
      numbers={declaration.numbers}
      language={declaration.language}
      label={t("their-code-label", { name: declaration.full })}
    />
    {#if declaration.more}
      <p class="small muted">{t("their-more")}</p>
    {/if}
    <p class="small muted">{t("their-private")}</p>
  {/if}
</section>

<style>
  .their {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-block: 12px;
    padding: 12px 16px;
    background: var(--colour-surface);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
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

  .holders {
    display: grid;
    gap: 10px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .holders p {
    margin: 0 0 6px;
  }

  .from {
    margin: 0;
    padding: 6px 10px;
    font-size: var(--type-small);
    border-inline-start: 3px solid var(--colour-success);
  }

  .from.decompiled {
    border-inline-start-color: var(--colour-accent);
  }
</style>
