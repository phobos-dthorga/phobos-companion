<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import { here, setFocus } from "../navigation/navigation.svelte";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import Placeholder from "../shell/Placeholder.svelte";
  import type { Failure } from "../shell/types";
  import { register } from "../shortcuts/registry";
  import { answerPick, readPicks } from "./desktopClient";
  import PickView from "./PickView.svelte";
  import {
    allPicks,
    keyOf,
    nextWaiting,
    stepped,
    wordsShown,
    type Placed,
  } from "./presentation";
  import { NONE, type PicksList, type PickTry } from "./types";

  /**
   * Picks (0.55.0; the owner, 23 Nov 2026: "Go ahead and build the picks page"): every picture and sound a repository's art tools
   * offered for the owner to choose from, waiting ones first. One is open at a time, its tries stepped through with J and K, the
   * try in focus against the one in use with the code viewer's views; a press keeps the pick through the kit, and the next waiting
   * pick opens. A session applies the pick; the page changes nothing else.
   */
  type Reading =
    | { state: "reading" }
    | { state: "ready"; list: PicksList }
    | { state: "failed"; failure: Failure };

  let reading = $state<Reading>({ state: "reading" });
  let busy = $state(false);
  let told = $state<{ ok: boolean; words: string } | null>(null);
  /** The try in focus for each pick, by its key. */
  let tryOf = $state<Record<string, string>>({});
  /**
   * What the owner has typed for each pick, by its key, until it is kept (0.76.1; the owner, 24 Nov 2026: one of three comments
   * was lost). Held here rather than in the pick's view, so moving to another pick and back keeps it, and the keyboard's "pick"
   * and "none of these" send it as the buttons do; they used to send nothing.
   */
  let wordsOf = $state<Record<string, string>>({});

  /** The words typed for the pick open now. */
  function typed(): string {
    return chosen ? (wordsOf[keyOf(chosen)] ?? "") : "";
  }

  const placed = $derived(
    reading.state === "ready" ? allPicks(reading.list) : [],
  );
  const chosen = $derived(
    placed.find((p) => keyOf(p) === here().focus.pick) ?? placed[0] ?? null,
  );
  const focus = $derived.by((): PickTry | null => {
    if (!chosen) return null;
    const tries = chosen.pick.tries;
    return (
      tries.find((found) => found.id === tryOf[keyOf(chosen)]) ??
      tries[0] ??
      null
    );
  });

  async function load() {
    const answer = await readPicks();
    reading =
      answer.state === "ready"
        ? { state: "ready", list: answer.list }
        : { state: "failed", failure: answer.failure };
  }

  /**
   * Opens a pick. Opened by hand, it lets go of the last "Kept" line (0.69.2; the owner's screen note of 23 Nov 2026: a line
   * naming the pick before, shown over another, read as the wrong name tied to the sound). The move to the next waiting pick
   * after a press keeps it, as it says what the press did.
   */
  function open(next: Placed | undefined, byHand = true) {
    if (!next) return;
    if (byHand) told = null;
    setFocus({ pick: keyOf(next) });
  }

  function stepPick(step: 1 | -1) {
    open(stepped(placed, chosen ? placed.indexOf(chosen) : -1, step));
  }

  function stepTry(step: 1 | -1) {
    if (!chosen || !focus) return;
    const tries = chosen.pick.tries;
    const next = stepped(tries, tries.indexOf(focus), step);
    if (next) tryOf[keyOf(chosen)] = next.id;
  }

  async function keep(pick: string, words: string) {
    if (!chosen || busy) return;
    const was = chosen;
    busy = true;
    told = null;
    const answer = await answerPick(was.repository, was.pick.id, pick, words);
    busy = false;
    if (answer.state !== "done" || !answer.result.ok) {
      const reason =
        answer.state !== "done"
          ? answer.failure.detail
          : (answer.result.refusal ?? "");
      told = { ok: false, words: t("picks-failed", { reason }) };
      return;
    }
    const label =
      was.pick.tries.find((found) => found.id === pick)?.label ?? pick;
    // Say what was kept, the words with it (0.76.1); the list below is read back from the kept file, so it shows they were saved.
    const kept = wordsShown(words);
    told = {
      ok: true,
      words:
        (pick === NONE
          ? t("picks-done-none", { title: was.pick.title })
          : t("picks-done", { title: was.pick.title, label })) +
        (kept ? " " + t("picks-done-words", { words: kept }) : ""),
    };
    delete wordsOf[keyOf(was)];
    await load();
    open(nextWaiting(placed, keyOf(was)), false);
  }

  onMount(() => {
    void load();
    return register({
      scope: "picks",
      inDialog: false,
      run: {
        "picks.next-try": () => stepTry(1),
        "picks.previous-try": () => stepTry(-1),
        "picks.next-pick": () => stepPick(1),
        "picks.previous-pick": () => stepPick(-1),
        "picks.choose": () => {
          if (focus?.there) void keep(focus.id, typed());
        },
        "picks.none": () => void keep(NONE, typed()),
      },
    });
  });
</script>

<div class="eyebrow accent">{t("picks-kicker")}</div>
<h1>{t("picks-title")}</h1>
<p class="lead">{t("picks-lead")}</p>

<div aria-live="polite">
  {#if told}
    <p class={told.ok ? "told" : "told refused"} role="status">{told.words}</p>
  {/if}
</div>

{#if reading.state === "reading"}
  <p class="muted">{t("picks-reading")}</p>
  <Placeholder shape="rows" />
{:else if reading.state === "failed"}
  <FailurePanel failure={reading.failure} onretry={load} />
{:else if placed.length === 0}
  <p class="muted">{t("picks-none-waiting")}</p>
{:else}
  <p class="count">
    {reading.list.waiting > 0
      ? t("picks-waiting", { count: reading.list.waiting })
      : t("picks-all-answered")}
  </p>
  <div class="layout">
    <nav class="list" aria-label={t("picks-list-label")}>
      <ul>
        {#each placed as entry (keyOf(entry))}
          <li>
            <button
              type="button"
              class="entry"
              aria-pressed={chosen !== null && keyOf(chosen) === keyOf(entry)}
              onclick={() => open(entry)}
            >
              <span class="title">{entry.pick.title}</span>
              <span class="muted small"
                >{entry.repository} · {entry.pick.kind === "picture"
                  ? t("picks-kind-picture")
                  : t("picks-kind-sound")}</span
              >
              <span class={entry.pick.answer ? "state done" : "state"}
                >{entry.pick.answer
                  ? t("picks-state-answered")
                  : t("picks-state-waiting")}</span
              >
              {#if wordsShown(entry.pick.answer?.words)}
                <span class="said small"
                  >“{wordsShown(entry.pick.answer?.words)}”</span
                >
              {/if}
            </button>
          </li>
        {/each}
      </ul>
    </nav>
    {#if chosen && focus}
      <PickView
        placed={chosen}
        {focus}
        {busy}
        bind:words={
          typed,
          (value) => {
            if (chosen) wordsOf[keyOf(chosen)] = value;
          }
        }
        onfocus={(found) => {
          if (chosen) tryOf[keyOf(chosen)] = found.id;
        }}
        onpick={(pick, words) => void keep(pick, words)}
      />
    {/if}
  </div>
{/if}
<p class="muted how">{t("picks-how")}</p>

<style>
  .count {
    font-weight: 600;
  }

  .layout {
    display: grid;
    grid-template-columns: minmax(200px, 280px) minmax(0, 1fr);
    gap: 18px;
    align-items: start;
  }

  .list ul {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .entry {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    width: 100%;
    min-height: var(--control-min);
    padding: 6px 10px;
    font: inherit;
    text-align: start;
    color: var(--colour-text);
    background: transparent;
    border: 1px solid var(--colour-line);
    border-radius: 4px;
    cursor: pointer;
  }

  .entry[aria-pressed="true"] {
    background: var(--colour-surface-soft);
    border: 2px solid var(--colour-accent);
  }

  .title {
    font-weight: 600;
    overflow-wrap: anywhere;
  }

  .small {
    font-size: var(--type-small);
  }

  .state {
    font-size: var(--type-caption);
    color: var(--colour-accent);
  }

  .state.done {
    color: var(--colour-success);
  }

  /* The owner's words with an answered pick (0.76.1): read back from the kept answers, so they show they were saved. */
  .said {
    color: var(--colour-text-muted);
    font-style: italic;
    overflow-wrap: anywhere;
  }

  .told {
    font-weight: 600;
    color: var(--colour-success);
  }

  .told.refused {
    color: var(--colour-risk);
  }

  @media (max-width: 900px) {
    .layout {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
