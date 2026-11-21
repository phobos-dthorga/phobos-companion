<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import type { GameHome } from "../home/types";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import Placeholder from "../shell/Placeholder.svelte";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import { heard, started } from "../shell/progress";
  import type { Failure } from "../shell/types";
  import { register } from "../shortcuts/registry";
  import {
    addRule,
    dropRule,
    readMods,
    readRules,
    sortModList,
    undoEdit,
  } from "./desktopClient";
  import type { Findable } from "./editor";
  import ModFinder from "./ModFinder.svelte";
  import {
    RULE_KINDS,
    RULE_WORDS,
    SOURCE_WORDS,
    movedBy,
    namesOf,
  } from "./sorting";
  import type {
    ModsListing,
    OwnRule,
    RuleKind,
    RulesListing,
    SortAnswer,
  } from "./types";

  /**
   * Sort (0.47.0; the owner's choices of 22 Nov 2026: both sorts, chosen at the press; RimSort's rules read as they are, plus the
   * owner's own kept by the tools). **Fewest moves** keeps the list's order and moves only what a rule says is out of place; **Full
   * re-sort** rebuilds it, as RimSort does. Each shows every move and whose rule asked for it before anything is written: **Use this
   * order** writes it after a backup, and Undo takes it back. Your rules: make one by finding the mods by name.
   */
  let { game }: { game: GameHome } = $props();

  const SHOWN = 60;

  type Reading =
    | { state: "reading" }
    | { state: "ready"; listing: ModsListing; rules: RulesListing }
    | { state: "failed"; failure: Failure };

  let reading = $state<Reading>({ state: "reading" });
  let listKey = $state("");
  let preview = $state<SortAnswer["data"] | null>(null);
  let full = $state(false);
  let showAll = $state(false);
  let sorted = $state(false);
  let busy = $state(false);
  let progress = $state(started());
  let said = $state<{ text: string; refused: boolean } | null>(null);
  let ruleMod = $state<Findable | null>(null);
  let ruleKind = $state<RuleKind>("after");

  function hearing() {
    return (m: Parameters<typeof heard>[1]) => {
      progress = heard(progress, m);
    };
  }

  async function load() {
    busy = true;
    progress = started(t("modlist-sort-reading"));
    const [mods, rules] = await Promise.all([
      readMods(game.id, hearing()),
      readRules(game.id),
    ]);
    busy = false;
    if (mods.state === "ready" && rules.state === "ready") {
      reading = { state: "ready", listing: mods.listing, rules: rules.listing };
      if (!mods.listing.lists.some((l) => l.key === listKey)) {
        listKey =
          mods.listing.lists.find((l) => l.writable)?.key ??
          mods.listing.lists[0]?.key ??
          "";
      }
    } else {
      const failed = mods.state === "failed" ? mods : rules;
      if (failed.state === "failed")
        reading = { state: "failed", failure: failed.failure };
    }
  }

  function refused(reason: string) {
    said = { text: t("modlist-change-failed", { reason }), refused: true };
  }

  async function sort(rebuild: boolean) {
    said = null;
    preview = null;
    showAll = false;
    full = rebuild;
    busy = true;
    progress = started(t("modlist-sort-sorting"));
    const answer = await sortModList(
      game.id,
      listKey,
      rebuild,
      false,
      hearing(),
    );
    busy = false;
    if (answer.state === "failed") return refused(answer.failure.detail);
    if (!answer.result.ok) return refused(answer.result.refusal ?? "");
    preview = answer.result.data;
  }

  async function useIt() {
    said = null;
    busy = true;
    progress = started(t("modlist-changing"));
    const answer = await sortModList(game.id, listKey, full, true, hearing());
    busy = false;
    if (answer.state === "failed") return refused(answer.failure.detail);
    if (!answer.result.ok) return refused(answer.result.refusal ?? "");
    preview = null;
    sorted = true;
    said = {
      text: t("modlist-sort-done", {
        count: answer.result.data.moves?.length ?? 0,
      }),
      refused: false,
    };
  }

  async function undo() {
    said = null;
    busy = true;
    progress = started(t("modlist-changing"));
    const answer = await undoEdit(game.id, listKey, hearing());
    busy = false;
    if (answer.state === "failed") return refused(answer.failure.detail);
    if (!answer.result.ok) return refused(answer.result.refusal ?? "");
    sorted = false;
    said = {
      text: t("modlist-undone", { change: answer.result.data.undoes ?? "" }),
      refused: false,
    };
  }

  async function keepRule(other: Findable | null) {
    if (!ruleMod) return;
    const answer = await addRule(
      game.id,
      ruleMod.id,
      ruleKind,
      other?.id ?? "",
    );
    if (answer.state === "failed") return refused(answer.failure.detail);
    if (!answer.result.ok) return refused(answer.result.refusal ?? "");
    said = { text: t("modlist-rule-kept"), refused: false };
    ruleMod = null;
    await reloadRules();
  }

  async function takeAway(rule: OwnRule) {
    if (rule.number === undefined) return;
    const answer = await dropRule(game.id, rule.number);
    if (answer.state === "failed") return refused(answer.failure.detail);
    if (!answer.result.ok) return refused(answer.result.refusal ?? "");
    said = { text: t("modlist-rule-dropped"), refused: false };
    await reloadRules();
  }

  async function reloadRules() {
    const rules = await readRules(game.id);
    if (rules.state === "ready" && reading.state === "ready") {
      reading = { ...reading, rules: rules.listing };
    }
  }

  onMount(() => {
    void load();
    return register({
      scope: "everywhere",
      inDialog: false,
      run: { "look-again": () => void load() },
    });
  });
</script>

{#if said}
  <p class="told" class:refused={said.refused} role="status">{said.text}</p>
{/if}

{#if reading.state === "reading"}
  <ProgressBar {progress} fallback={t("modlist-sort-reading")} />
  <Placeholder shape="rows" />
{:else if reading.state === "failed"}
  <FailurePanel failure={reading.failure} onretry={load} />
{:else if !reading.listing.supported}
  {#each reading.listing.notes as note, index (index)}
    <p>{note}</p>
  {/each}
{:else}
  {@const listing = reading.listing}
  {@const rules = reading.rules}
  {@const named = namesOf(listing)}
  {@const nameFor = (id: string) => named.get(id.toLowerCase()) ?? id}
  {@const list = listing.lists.find((l) => l.key === listKey)}
  {@const running = listing.running.length > 0}
  {@const locked = busy || running || !list?.writable}
  {@const everyMod = listing.mods.map((m) => ({
    key: m.key,
    name: m.name,
    id: m.id,
  }))}

  {#if running}
    <p class="told refused" role="status">
      {t("modlist-running", { names: listing.running.join(", ") })}
    </p>
  {/if}

  <section class="panel" aria-labelledby="modlist-sort-title">
    <h2 id="modlist-sort-title">{t("modlist-sort-title")}</h2>
    <p class="how">{t("modlist-sort-how")}</p>
    {#if listing.lists.length > 1}
      <div
        class="buttons"
        role="group"
        aria-label={t("modlist-edit-which-list")}
      >
        {#each listing.lists as choice (choice.key)}
          <button
            type="button"
            class="action toggle"
            aria-pressed={choice.key === listKey}
            onclick={() => {
              listKey = choice.key;
              preview = null;
            }}>{choice.label}</button
          >
        {/each}
      </div>
    {/if}
    <div class="buttons">
      <button
        type="button"
        class="action strong"
        disabled={busy || !list}
        onclick={() => sort(false)}>{t("modlist-sort-fewest")}</button
      >
      <button
        type="button"
        class="action"
        disabled={busy || !list}
        onclick={() => sort(true)}>{t("modlist-sort-full")}</button
      >
      {#if sorted}
        <button type="button" class="action" disabled={locked} onclick={undo}
          >{t("modlist-undo")}</button
        >
      {/if}
    </div>
    {#if busy}
      <ProgressBar {progress} fallback={t("modlist-sort-sorting")} />
    {/if}

    {#if preview}
      {@const moves = preview.moves ?? []}
      {@const used = preview.rules}
      <div class="result">
        <p class="summary" class:clean={moves.length === 0}>
          {moves.length === 0
            ? t("modlist-sort-nothing")
            : t(full ? "modlist-sort-moves-full" : "modlist-sort-moves", {
                count: moves.length,
                total: preview.count ?? 0,
              })}
        </p>
        {#if used}
          <ul class="sources" aria-label={t("modlist-sort-rules-read")}>
            <li class="chip yours">
              {t("modlist-sort-read-yours", { count: used.yours })}
            </li>
            <li class="chip own">
              {t("modlist-sort-read-own", { count: used.own })}
            </li>
            <li class="chip needs">
              {t("modlist-sort-read-needs", { count: used.needs })}
            </li>
            <li class="chip community">
              {t("modlist-sort-read-community", { count: used.community })}
            </li>
          </ul>
        {/if}

        {#if (preview.set_aside ?? []).length > 0}
          <div class="aside">
            <h3>{t("modlist-sort-aside-title")}</h3>
            <p class="small">{t("modlist-sort-aside-why")}</p>
            <ul>
              {#each preview.set_aside ?? [] as gone, index (index)}
                <li>
                  <strong>{gone.rule}</strong>
                  <span class="muted small"
                    >{t("modlist-sort-aside-loop", { loop: gone.loop })}</span
                  >
                </li>
              {/each}
            </ul>
          </div>
        {/if}

        {#if moves.length > 0}
          <ol class="moves">
            {#each showAll ? moves : moves.slice(0, SHOWN) as move (move.key)}
              {@const by = movedBy(move)}
              <li class={by.direction}>
                <div class="line">
                  <span class="from-to">{move.from} → {move.to}</span>
                  <strong>{move.name}</strong>
                  <span class="direction"
                    >{t(
                      by.direction === "up"
                        ? "modlist-sort-up"
                        : "modlist-sort-down",
                      { count: by.places },
                    )}</span
                  >
                  {#each move.sources as source (source)}
                    <span class="chip {source}">{t(SOURCE_WORDS[source])}</span>
                  {/each}
                </div>
                <ul class="why">
                  {#each move.why as reason, index (index)}
                    <li>{reason}</li>
                  {/each}
                </ul>
              </li>
            {/each}
          </ol>
          {#if moves.length > SHOWN && !showAll}
            <button
              type="button"
              class="action"
              onclick={() => (showAll = true)}
              >{t("modlist-sort-show-all", { count: moves.length })}</button
            >
          {/if}
          <div class="confirm">
            <p>{t("modlist-sort-confirm", { count: moves.length })}</p>
            <div class="buttons">
              <button
                type="button"
                class="action strong"
                disabled={locked}
                onclick={useIt}>{t("modlist-sort-use")}</button
              >
              <button
                type="button"
                class="action"
                onclick={() => (preview = null)}
                >{t("modlist-sort-set-aside")}</button
              >
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </section>

  <section class="panel" aria-labelledby="modlist-rules-title">
    <h2 id="modlist-rules-title">{t("modlist-rules-title")}</h2>
    <p class="how">{t("modlist-rules-how")}</p>

    <div class="maker">
      {#if !ruleMod}
        <ModFinder
          mods={everyMod}
          label={t("modlist-rules-which")}
          pickWords={(m) => m.name}
          onpick={(m) => (ruleMod = m)}
        />
      {:else}
        {@const chosen = ruleMod}
        <p>
          <strong>{chosen.name}</strong>
          <button type="button" class="action" onclick={() => (ruleMod = null)}
            >{t("modlist-rules-other-mod")}</button
          >
        </p>
        <div class="buttons" role="group" aria-label={t("modlist-rules-where")}>
          {#each RULE_KINDS as kind (kind.id)}
            <button
              type="button"
              class="action toggle"
              aria-pressed={ruleKind === kind.id}
              onclick={() => (ruleKind = kind.id)}>{t(kind.words)}</button
            >
          {/each}
        </div>
        {#if ruleKind === "after" || ruleKind === "before"}
          <ModFinder
            mods={everyMod.filter((m) => m.key !== chosen.key)}
            label={t(
              ruleKind === "after"
                ? "modlist-rules-after-which"
                : "modlist-rules-before-which",
              { name: chosen.name },
            )}
            pickWords={(m) =>
              t(
                ruleKind === "after"
                  ? "modlist-rules-keep-after"
                  : "modlist-rules-keep-before",
                { name: chosen.name, other: m.name },
              )}
            onpick={(m) => keepRule(m)}
          />
        {:else}
          <button
            type="button"
            class="action strong"
            onclick={() => keepRule(null)}
            >{t(
              ruleKind === "top"
                ? "modlist-rules-keep-top"
                : "modlist-rules-keep-bottom",
              { name: chosen.name },
            )}</button
          >
        {/if}
      {/if}
    </div>

    <h3>{t("modlist-rules-here", { count: rules.rules.length })}</h3>
    {#if rules.rules.length === 0}
      <p class="muted">{t("modlist-rules-none")}</p>
    {:else}
      <ul class="rules">
        {#each rules.rules as rule (rule.number)}
          <li class="yours">
            <span
              >{t(RULE_WORDS[rule.kind], {
                mod: nameFor(rule.mod),
                other: nameFor(rule.other),
              })}</span
            >
            <button type="button" class="action" onclick={() => takeAway(rule)}
              >{t("modlist-rules-take-away")}</button
            >
          </li>
        {/each}
      </ul>
    {/if}

    {#if rules.theirs.length > 0}
      <h3>{t("modlist-rules-rimsort", { count: rules.theirs.length })}</h3>
      <ul class="rules">
        {#each rules.theirs as rule, index (index)}
          <li class="yours">
            <span
              >{t(RULE_WORDS[rule.kind], {
                mod: nameFor(rule.mod),
                other: nameFor(rule.other),
              })}</span
            >
            {#if rule.note}<span class="muted small">{rule.note}</span>{/if}
          </li>
        {/each}
      </ul>
    {/if}

    <h3>{t("modlist-rules-read-title")}</h3>
    <ul class="sets">
      {#each rules.sets as set (set.where)}
        <li>
          <span class="chip {set.source}">{t(SOURCE_WORDS[set.source])}</span>
          <strong>{set.label}</strong>
          <span class="muted small"
            >{t("modlist-rules-set-count", { count: set.count })} · {set.where}</span
          >
        </li>
      {/each}
    </ul>
  </section>
{/if}

<style>
  .panel {
    margin-bottom: 16px;
    padding: 20px 24px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  h2 {
    margin-bottom: 4px;
    font-family: var(--font-display);
    font-size: 1.375rem;
    font-weight: 600;
  }

  h3 {
    margin: 16px 0 8px;
    font-size: 1.0625rem;
    font-weight: 600;
  }

  .buttons {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin: 8px 0;
  }

  .action.strong {
    border-width: 2px;
  }

  .summary {
    font-weight: 600;
  }

  .summary.clean {
    color: var(--colour-success);
  }

  .sources,
  .sets,
  .rules,
  .why,
  .aside ul {
    list-style: none;
    padding: 0;
  }

  .sources {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 8px 0;
  }

  .moves {
    list-style: none;
    margin: 12px 0;
    padding: 0;
  }

  .moves > li {
    margin-bottom: 8px;
    padding: 8px 12px;
    border-inline-start: 3px solid var(--colour-line);
    background: var(--colour-surface-soft);
    border-radius: 4px;
    overflow-wrap: anywhere;
  }

  .moves > li.up {
    border-inline-start-color: var(--colour-success);
    background: var(--shade-success);
  }

  .moves > li.down {
    border-inline-start-color: var(--colour-observed);
    background: var(--shade-observed);
  }

  .line {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 10px;
  }

  .from-to {
    font-variant-numeric: tabular-nums;
    color: var(--colour-text-muted);
  }

  .direction {
    font-size: var(--type-caption);
    color: var(--colour-text-muted);
  }

  .why li {
    margin-top: 4px;
    font-size: var(--type-small);
  }

  .aside {
    margin: 12px 0;
    padding: 10px 14px;
    border-inline-start: 3px solid var(--colour-accent);
    background: var(--shade-accent);
    border-radius: 4px;
  }

  .confirm {
    position: sticky;
    bottom: 0;
    margin-top: 12px;
    padding: 10px 14px;
    border: 2px solid var(--colour-accent);
    background: var(--colour-surface-raised);
    border-radius: 4px;
  }

  .maker {
    margin: 8px 0 12px;
  }

  .rules li,
  .sets li {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 12px;
    padding: 6px 10px;
    border-inline-start: 3px solid transparent;
    overflow-wrap: anywhere;
  }

  .rules li.yours {
    border-inline-start-color: var(--colour-accent);
  }

  .rules li:nth-child(even),
  .sets li:nth-child(even) {
    background: color-mix(
      in srgb,
      var(--colour-surface-soft) 45%,
      var(--colour-surface-raised)
    );
  }

  /* Whose rule: words always, a shade of the theme as well. */
  .chip {
    display: inline-block;
    padding: 2px 8px;
    font-size: var(--type-caption);
    border: 1px solid var(--colour-line);
    border-radius: 999px;
    color: var(--colour-text);
  }

  .chip.yours {
    background: var(--shade-accent);
    border-color: var(--colour-accent);
  }

  .chip.own {
    background: var(--shade-observed);
    border-color: var(--colour-observed);
  }

  .chip.needs {
    background: var(--shade-comparison);
    border-color: var(--colour-comparison);
  }

  .chip.community {
    background: var(--shade-success);
    border-color: var(--colour-success);
  }

  .told {
    margin-bottom: 12px;
  }

  .told.refused {
    color: var(--colour-risk);
  }
</style>
