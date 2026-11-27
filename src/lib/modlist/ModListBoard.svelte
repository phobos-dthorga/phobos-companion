<script lang="ts">
  import { onMount, tick } from "svelte";
  import { t } from "../i18n/runtime";
  import type { GameHome } from "../home/types";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import Placeholder from "../shell/Placeholder.svelte";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import { heard, started } from "../shell/progress";
  import type { Failure } from "../shell/types";
  import { register } from "../shortcuts/registry";
  import ModPreview from "./ModPreview.svelte";
  import SteamSubscribe from "./SteamSubscribe.svelte";
  import {
    readMods,
    startTheGame,
    undoEdit,
    unsubscribeFrom,
    writeModList,
  } from "./desktopClient";
  import {
    begin,
    fitsFilter,
    idsOf,
    marks,
    moveBy,
    offKeys,
    placeBeside,
    range,
    summary,
    switchOff,
    switchOn,
    throwAway,
    undo,
    unsaved,
    type Draft,
    type Mark,
  } from "./draft";
  import { draftKey, drafts } from "./drafts.svelte";
  import { workshopNumberIn } from "./editor";
  import type { ModRow, ModsListing, Subscribed } from "./types";

  /**
   * Edit the list, rebuilt (0.108.0; the owner, 27 Nov 2026: "the mod list page needs a total redo ... take lessons from RimSort",
   * and the choice "Hold until Save"). Mods switched off on the left, on on the right, each list with its own filter. Choose with a
   * click (Ctrl adds one, Shift a run), then switch with Enter, a double-click or the buttons between, move with Alt and the arrows
   * or the buttons, or drag. Each row says what its own files warn of as the draft stands. Nothing is written until Save, which
   * writes the whole list at once after a backup; Undo walks back one step, Throw away returns to the list as read.
   */
  let { game, focusMod = "" }: { game: GameHome; focusMod?: string } = $props();

  type Side = "off" | "on";
  type Reading =
    | { state: "reading" }
    | { state: "ready"; listing: ModsListing }
    | { state: "failed"; failure: Failure };

  const SOURCE: Record<string, string> = {
    workshop: "modlist-edit-source-workshop",
    local: "modlist-edit-source-local",
    game: "modlist-edit-source-game",
  };
  const MARK: Record<Mark["kind"], string> = {
    needs: "modlist-board-mark-needs",
    after: "modlist-board-mark-after",
    before: "modlist-board-mark-before",
    refuses: "modlist-board-mark-refuses",
    absent: "modlist-board-mark-absent",
  };
  /** Moves with Alt held: one place, ten, or to either end. */
  const STEPS: Record<string, number> = {
    ArrowUp: -1,
    ArrowDown: 1,
    PageUp: -10,
    PageDown: 10,
    Home: -Infinity,
    End: Infinity,
  };

  let reading = $state<Reading>({ state: "reading" });
  let listKey = $state("");
  let draft = $state<Draft | null>(null);
  let filter = $state<Record<Side, string>>({ off: "", on: "" });
  let chosen = $state<Record<Side, string[]>>({ off: [], on: [] });
  let anchor = $state<Record<Side, string>>({ off: "", on: "" });
  let focus = $state<Record<Side, string>>({ off: "", on: "" });
  let inFocus = $state("");
  let busy = $state(false);
  let progress = $state(started());
  let said = $state<{ text: string; refused: boolean } | null>(null);
  let savedOnce = $state(false);
  let asking = $state<{ numbers: string[]; names: string[] } | null>(null);
  let linkTyped = $state("");
  let dragging = $state<{ keys: string[]; from: Side } | null>(null);
  let dropAt = $state<{ key: string; after: boolean } | null>(null);
  let lists = $state<Record<Side, HTMLElement | null>>({ off: null, on: null });

  const listing = $derived(reading.state === "ready" ? reading.listing : null);
  const mods = $derived(new Map((listing?.mods ?? []).map((m) => [m.key, m])));
  const list = $derived(listing?.lists.find((l) => l.key === listKey));
  const remembered = $derived(
    new Map((list?.entries ?? []).map((e) => [e.key, e.remembered])),
  );
  const shown = $derived<Record<Side, string[]>>({
    off:
      draft && listing
        ? offKeys(draft, listing).filter((k) =>
            fitsFilter(mods.get(k), nameOf(k), filter.off),
          )
        : [],
    on: draft
      ? draft.order.filter((k) => fitsFilter(mods.get(k), nameOf(k), filter.on))
      : [],
  });
  const warned = $derived<Map<string, Mark[]>>(
    draft ? marks(draft, mods) : new Map(),
  );
  const counts = $derived(draft ? summary(draft) : null);
  const pending = $derived(draft ? unsaved(draft) : false);
  const running = $derived(listing?.running ?? []);
  const focused = $derived(inFocus ? (mods.get(inFocus) ?? null) : null);
  const linked = $derived(workshopNumberIn(linkTyped));

  function nameOf(key: string): string {
    return mods.get(key)?.name || remembered.get(key) || key;
  }

  function hearing() {
    return (m: Parameters<typeof heard>[1]) => {
      progress = heard(progress, m);
    };
  }

  function keep(next: Draft) {
    draft = next;
    drafts[draftKey(game.id, next.listKey)] = next;
  }

  async function load() {
    busy = true;
    progress = started(t("modlist-edit-reading"));
    const answer = await readMods(game.id, hearing());
    busy = false;
    if (answer.state === "failed") {
      reading = { state: "failed", failure: answer.failure };
      return;
    }
    if (answer.state !== "ready") return;
    reading = { state: "ready", listing: answer.listing };
    const lists = answer.listing.lists;
    if (!lists.some((l) => l.key === listKey))
      listKey = lists.find((l) => l.writable)?.key ?? lists[0]?.key ?? "";
    startDraft(answer.listing);
  }

  /** The draft kept for this list when it began from the list as read now; else a fresh one, saying any set aside. */
  function startDraft(read: ModsListing) {
    const fresh = begin(read, listKey);
    const kept = drafts[draftKey(game.id, listKey)];
    const same =
      kept &&
      kept.was.length === fresh.was.length &&
      kept.was.every((k, n) => k === fresh.was[n]);
    if (kept && !same && unsaved(kept))
      said = { text: t("modlist-board-set-aside"), refused: true };
    keep(same ? kept : fresh);
    chosen = { off: [], on: [] };
    if (focusMod) void bringIntoView(focusMod);
  }

  /** The mod a place names, chosen in whichever list holds it and scrolled to (0.110.0). */
  async function bringIntoView(key: string) {
    if (!draft || !mods.has(key)) return;
    const side: Side = draft.order.includes(key) ? "on" : "off";
    filter[side] = "";
    chosen = { off: [], on: [] };
    chosen[side] = [key];
    anchor[side] = key;
    focus[side] = key;
    inFocus = key;
    await showRow(side, key);
  }

  // ------------------------------------------------------------ choosing

  function choose(side: Side, key: string, event: MouseEvent | KeyboardEvent) {
    const other: Side = side === "on" ? "off" : "on";
    chosen[other] = [];
    if (event.shiftKey && anchor[side]) {
      chosen[side] = range(shown[side], anchor[side], key);
    } else if (event.ctrlKey || event.metaKey) {
      chosen[side] = chosen[side].includes(key)
        ? chosen[side].filter((k) => k !== key)
        : [...chosen[side], key];
      anchor[side] = key;
    } else {
      chosen[side] = [key];
      anchor[side] = key;
    }
    focus[side] = key;
    inFocus = key;
  }

  /** What an action works on: the chosen mods, else the one in focus. */
  function acting(side: Side): string[] {
    if (chosen[side].length) return chosen[side];
    return focus[side] ? [focus[side]] : [];
  }

  // ------------------------------------------------------------ changing the draft

  function switchSide(side: Side) {
    if (!draft) return;
    const keys = acting(side);
    if (!keys.length) return;
    keep(side === "off" ? switchOn(draft, keys, mods) : switchOff(draft, keys));
    const to: Side = side === "off" ? "on" : "off";
    chosen = { off: [], on: [] };
    chosen[to] = keys;
    focus[to] = keys[0] ?? "";
    said = null;
  }

  function move(step: number) {
    if (!draft) return;
    const keys = acting("on");
    if (!keys.length) return;
    keep(moveBy(draft, keys, step));
    void showRow("on", keys[0] ?? "");
  }

  function undoStep() {
    if (draft && draft.history.length) keep(undo(draft));
  }

  async function showRow(side: Side, key: string) {
    await tick();
    const row = lists[side]?.querySelector<HTMLElement>(
      `[data-key="${CSS.escape(key)}"]`,
    );
    row?.scrollIntoView({ block: "nearest" });
    row?.focus();
  }

  // ------------------------------------------------------------ keys in a list

  function onKey(side: Side, event: KeyboardEvent) {
    const rows = shown[side];
    const at = rows.indexOf(focus[side]);
    if (event.altKey && side === "on" && event.key in STEPS) {
      event.preventDefault();
      move(STEPS[event.key]!);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const next =
        rows[
          Math.max(
            0,
            Math.min(
              rows.length - 1,
              at + (event.key === "ArrowDown" ? 1 : -1),
            ),
          )
        ];
      if (!next) return;
      if (event.shiftKey) choose(side, next, event);
      else {
        focus[side] = next;
        inFocus = next;
      }
      void showRow(side, next);
    } else if (event.key === " ") {
      event.preventDefault();
      if (focus[side])
        choose(side, focus[side], { ...event, ctrlKey: true } as KeyboardEvent);
    } else if (event.key === "Enter") {
      event.preventDefault();
      switchSide(side);
    } else if (event.key === "Escape") {
      chosen[side] = [];
    } else if ((event.ctrlKey || event.metaKey) && event.key === "a") {
      event.preventDefault();
      chosen[side] = [...rows];
    }
  }

  // ------------------------------------------------------------ dragging (a shortcut: every move has keys and buttons)

  function dragStart(side: Side, key: string, event: DragEvent) {
    const keys = chosen[side].includes(key) ? chosen[side] : [key];
    dragging = { keys, from: side };
    event.dataTransfer?.setData("text/plain", keys.join("\n"));
  }

  function dragOver(key: string, event: DragEvent) {
    if (!dragging) return;
    event.preventDefault();
    const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
    dropAt = { key, after: event.clientY > box.top + box.height / 2 };
  }

  function dropOnRow(side: Side, event: DragEvent) {
    event.preventDefault();
    const was = dragging;
    const at = dropAt;
    dragging = null;
    dropAt = null;
    if (!draft || !was) return;
    if (side === "off") {
      if (was.from === "on") keep(switchOff(draft, was.keys));
      return;
    }
    keep(
      at
        ? placeBeside(draft, was.keys, at.key, at.after)
        : switchOn(draft, was.keys, mods),
    );
  }

  // ------------------------------------------------------------ Save, and going back on it

  /** Writes the draft; true once it is saved. */
  async function save(): Promise<boolean> {
    if (!draft || !listing || !pending || busy || running.length) return false;
    said = null;
    busy = true;
    progress = started(t("modlist-board-saving"));
    const answer = await writeModList(
      game.id,
      listKey,
      idsOf(draft.order, listing, listKey),
      idsOf(draft.was, listing, listKey),
      hearing(),
    );
    busy = false;
    const refusal =
      answer.state === "failed"
        ? answer.failure.detail
        : answer.state === "ready" && !answer.result.ok
          ? (answer.result.refusal ?? "")
          : null;
    if (refusal !== null) {
      said = {
        text: t("modlist-board-save-failed", { reason: refusal }),
        refused: true,
      };
      return false;
    }
    delete drafts[draftKey(game.id, listKey)];
    savedOnce = true;
    await load();
    said = {
      text: t("modlist-board-saved", {
        on: counts?.on.length ?? 0,
        off: counts?.off.length ?? 0,
        moved: counts?.moved ?? 0,
      }),
      refused: false,
    };
    return true;
  }

  /** Start the game through Steam (0.113.0; the owner's "Save and start the game", as RimSort's Run game): saves first when changes
   *  wait, and starts nothing when the save is refused. */
  async function startGame() {
    if (busy) return;
    const saving = pending;
    if (saving && !(await save())) return;
    busy = true;
    progress = started(t("modlist-board-starting"));
    const answer = await startTheGame(game.id);
    busy = false;
    const refusal =
      answer.state === "failed"
        ? answer.failure.detail
        : !answer.result.ok
          ? (answer.result.refusal ?? "")
          : null;
    said =
      refusal !== null
        ? {
            text: t("modlist-board-start-failed", { reason: refusal }),
            refused: true,
          }
        : {
            text: t(
              saving ? "modlist-board-saved-started" : "modlist-board-started",
              { game: game.name },
            ),
            refused: false,
          };
  }

  async function goBack() {
    said = null;
    busy = true;
    progress = started(t("modlist-changing"));
    const answer = await undoEdit(game.id, listKey, hearing());
    busy = false;
    if (
      answer.state === "failed" ||
      (answer.state === "ready" && !answer.result.ok)
    ) {
      said = {
        text: t("modlist-change-failed", {
          reason:
            answer.state === "failed"
              ? answer.failure.detail
              : (answer.result.refusal ?? ""),
        }),
        refused: true,
      };
      return;
    }
    delete drafts[draftKey(game.id, listKey)];
    await load();
    said = { text: t("modlist-board-went-back"), refused: false };
  }

  // ------------------------------------------------------------ Steam: unsubscribe after a yes, subscribe from a link

  function workshopOf(keys: string[]) {
    const found = keys
      .map((k) => mods.get(k))
      .filter(
        (m): m is ModRow =>
          !!m && m.source === "workshop" && m.workshop_id !== "",
      );
    return {
      numbers: found.map((m) => m.workshop_id),
      names: found.map((m) => m.name),
    };
  }

  async function unsubscribe() {
    const asked = asking;
    asking = null;
    if (!asked) return;
    busy = true;
    progress = started(t("modlist-steam-unsubscribing"));
    const answer = await unsubscribeFrom(
      game.id,
      listKey,
      asked.numbers,
      hearing(),
    );
    busy = false;
    if (
      answer.state === "failed" ||
      (answer.state === "ready" && !answer.result.ok)
    ) {
      said = {
        text: t("modlist-steam-failed", {
          reason:
            answer.state === "failed"
              ? answer.failure.detail
              : (answer.result.refusal ?? ""),
        }),
        refused: true,
      };
      return;
    }
    delete drafts[draftKey(game.id, listKey)];
    await load();
    said = {
      text: t("modlist-steam-unsubscribed", {
        count: (answer.result.data.results ?? []).filter((r) => r.unsubscribed)
          .length,
        off: answer.result.data.switched_off?.length ?? 0,
      }),
      refused: false,
    };
  }

  async function subscribed(results: Subscribed[]) {
    linkTyped = "";
    const kept = draft;
    await load();
    if (kept && draft && unsaved(kept))
      keep({ ...draft, order: kept.order, history: kept.history });
    const first = results.find((r) => r.installed && r.id);
    const mod = first
      ? listing?.mods.find((m) => m.id === first.id)
      : undefined;
    if (mod) {
      chosen = { off: [mod.key], on: [] };
      focus.off = mod.key;
      inFocus = mod.key;
      said = {
        text: t("modlist-board-subscribed", { name: mod.name }),
        refused: false,
      };
    }
  }

  onMount(() => {
    void load();
    return register({
      scope: "modlist",
      inDialog: false,
      run: {
        "modlist.save": () => void save(),
        "modlist.undo": undoStep,
      },
    });
  });
</script>

{#snippet rowsOf(side: Side)}
  {@const rows = shown[side]}
  <ul
    class="rows"
    role="listbox"
    aria-multiselectable="true"
    aria-label={t(
      side === "on" ? "modlist-board-on-label" : "modlist-board-off-label",
    )}
    bind:this={lists[side]}
    ondragover={(event) => {
      if (dragging) event.preventDefault();
    }}
    ondrop={(event) => dropOnRow(side, event)}
  >
    {#each rows as key, n (key)}
      {@const mod = mods.get(key)}
      {@const said = warned.get(key) ?? []}
      <li
        role="option"
        data-key={key}
        aria-selected={chosen[side].includes(key)}
        tabindex={focus[side] === key || (!focus[side] && n === 0) ? 0 : -1}
        class:drop-before={dropAt?.key === key &&
          !dropAt.after &&
          side === "on"}
        class:drop-after={dropAt?.key === key && dropAt.after && side === "on"}
        draggable="true"
        onclick={(event) => choose(side, key, event)}
        onkeydown={(event) => onKey(side, event)}
        ondblclick={() => {
          chosen[side] = [key];
          switchSide(side);
        }}
        onfocus={() => {
          focus[side] = key;
          inFocus = key;
        }}
        ondragstart={(event) => dragStart(side, key, event)}
        ondragover={(event) => dragOver(key, event)}
        ondragend={() => {
          dragging = null;
          dropAt = null;
        }}
      >
        {#if side === "on"}<span class="place">{n + 1}</span>{/if}
        <span class="name">{nameOf(key)}</span>
        {#if mod}<span class="source small">{t(SOURCE[mod.source] ?? "")}</span
          >{/if}
        {#if side === "on" && said.length}
          <span class="marks small">
            {#each said as mark (mark.kind + mark.other)}
              <span class="mark-text"
                ><span aria-hidden="true">◆</span>
                {t(MARK[mark.kind], { other: mark.other })}</span
              >
            {/each}
          </span>
        {/if}
      </li>
    {/each}
  </ul>
{/snippet}

{#if reading.state === "reading"}
  <Placeholder shape="rows" rows={8} />
{:else if reading.state === "failed"}
  <FailurePanel failure={reading.failure} onretry={load} />
{:else if listing && draft}
  {#if listing.lists.filter((l) => l.writable).length > 1}
    <label class="small list-choice"
      >{t("modlist-board-which-list")}
      <select
        bind:value={listKey}
        onchange={() => listing && startDraft(listing)}
      >
        {#each listing.lists.filter((l) => l.writable) as each (each.key)}
          <option value={each.key}>{each.label}</option>
        {/each}
      </select>
    </label>
  {/if}

  <div
    class="bar"
    class:pending
    role="group"
    aria-label={t("modlist-board-bar-label")}
  >
    <p>
      {#if pending && counts}
        <strong
          >{t("modlist-board-unsaved", {
            on: counts.on.length,
            off: counts.off.length,
            moved: counts.moved,
          })}</strong
        >
      {:else}
        {t("modlist-board-nothing-unsaved")}
      {/if}
    </p>
    <div class="buttons">
      <button
        type="button"
        class="action strong"
        disabled={!pending || busy || running.length > 0}
        onclick={save}>{t("modlist-board-save")}</button
      >
      <button
        type="button"
        class="action"
        disabled={busy || (pending && running.length > 0)}
        onclick={startGame}
        >{t(pending ? "modlist-board-save-start" : "modlist-board-start", {
          game: game.name,
        })}</button
      >
      <button
        type="button"
        class="action"
        disabled={!draft.history.length || busy}
        onclick={undoStep}>{t("modlist-board-undo")}</button
      >
      <button
        type="button"
        class="action"
        disabled={!pending || busy}
        onclick={() => draft && keep(throwAway(draft))}
        >{t("modlist-board-throw-away")}</button
      >
      {#if (listing.changes[listKey] ?? 0) > 0 && !pending}
        <button type="button" class="action" disabled={busy} onclick={goBack}
          >{t(
            savedOnce ? "modlist-board-go-back-save" : "modlist-board-go-back",
          )}</button
        >
      {/if}
    </div>
    {#if running.length}
      <p class="small">
        {t("modlist-board-running", { names: running.join(", ") })}
      </p>
    {/if}
  </div>
  {#if busy}
    <ProgressBar {progress} fallback={t("modlist-changing")} />
  {/if}
  {#if said}
    <p class="said small" class:refused={said.refused} role="status">
      {said.text}
    </p>
  {/if}

  <div class="board">
    <section class="side" aria-labelledby="board-off-title">
      <h3 id="board-off-title">
        {t("modlist-board-off", {
          count:
            listing.mods.length - draft.order.filter((k) => mods.has(k)).length,
        })}
      </h3>
      <input
        type="search"
        class="filter"
        aria-label={t("modlist-board-filter-off")}
        placeholder={t("modlist-board-filter")}
        bind:value={filter.off}
      />
      {@render rowsOf("off")}
    </section>

    <div
      class="between"
      role="group"
      aria-label={t("modlist-board-moves-label")}
    >
      <button
        type="button"
        class="action"
        disabled={!acting("off").length}
        onclick={() => switchSide("off")}>{t("modlist-board-switch-on")}</button
      >
      <button
        type="button"
        class="action"
        disabled={!acting("on").length}
        onclick={() => switchSide("on")}>{t("modlist-board-switch-off")}</button
      >
      <button
        type="button"
        class="action"
        disabled={!acting("on").length}
        onclick={() => move(-Infinity)}>{t("modlist-board-top")}</button
      >
      <button
        type="button"
        class="action"
        disabled={!acting("on").length}
        onclick={() => move(-1)}>{t("modlist-board-up")}</button
      >
      <button
        type="button"
        class="action"
        disabled={!acting("on").length}
        onclick={() => move(1)}>{t("modlist-board-down")}</button
      >
      <button
        type="button"
        class="action"
        disabled={!acting("on").length}
        onclick={() => move(Infinity)}>{t("modlist-board-bottom")}</button
      >
    </div>

    <section class="side" aria-labelledby="board-on-title">
      <h3 id="board-on-title">
        {t("modlist-board-on", {
          count: draft.order.length,
          label: list?.label ?? "",
        })}
      </h3>
      <input
        type="search"
        class="filter"
        aria-label={t("modlist-board-filter-on")}
        data-page-filter
        placeholder={t("modlist-board-filter")}
        bind:value={filter.on}
      />
      {@render rowsOf("on")}
    </section>
  </div>
  <p class="small muted how">{t("modlist-board-how")}</p>

  <section class="info" aria-label={t("modlist-board-info-label")}>
    <ModPreview mod={focused} game={game.id} />
    {#if focused}
      <dl class="small">
        {#if focused.folder}
          <dt>{t("modlist-board-folder")}</dt>
          <dd><code>{focused.folder}</code></dd>
        {/if}
        {#if focused.needs.length}
          <dt>{t("modlist-board-needs")}</dt>
          <dd>{focused.needs.join(", ")}</dd>
        {/if}
        {#if focused.load_after?.length}
          <dt>{t("modlist-board-after")}</dt>
          <dd>
            {focused.load_after
              .map((id) => nameOf(id.toLowerCase()))
              .join(", ")}
          </dd>
        {/if}
        {#if focused.load_before?.length}
          <dt>{t("modlist-board-before")}</dt>
          <dd>
            {focused.load_before
              .map((id) => nameOf(id.toLowerCase()))
              .join(", ")}
          </dd>
        {/if}
        {#if focused.incompatible?.length}
          <dt>{t("modlist-board-refuses")}</dt>
          <dd>
            {focused.incompatible
              .map((id) => nameOf(id.toLowerCase()))
              .join(", ")}
          </dd>
        {/if}
      </dl>
      {#if focused.source === "workshop" && focused.workshop_id}
        <div class="buttons">
          <button
            type="button"
            class="action"
            disabled={busy}
            onclick={() => (asking = workshopOf([focused.key]))}
            >{t("modlist-board-unsubscribe")}</button
          >
        </div>
      {/if}
      {#if asking}
        <div
          class="confirm"
          role="group"
          aria-label={t("modlist-confirm-label")}
        >
          <p>
            {t("modlist-steam-unsubscribe-confirm", {
              count: asking.numbers.length,
              names: asking.names.join(", "),
            })}
          </p>
          <div class="buttons">
            <button type="button" class="action strong" onclick={unsubscribe}
              >{t("modlist-steam-unsubscribe-yes")}</button
            >
            <button type="button" class="action" onclick={() => (asking = null)}
              >{t("modlist-cancel")}</button
            >
          </div>
        </div>
      {/if}
    {/if}
  </section>

  <details class="add">
    <summary>{t("modlist-board-add")}</summary>
    <label class="small"
      >{t("modlist-steam-link")}
      <input
        type="text"
        bind:value={linkTyped}
        autocomplete="off"
        spellcheck="false"
      />
    </label>
    {#if linked}
      <SteamSubscribe
        game={game.id}
        numbers={[linked]}
        label={t("modlist-steam-subscribe")}
        disabled={busy}
        ondone={(results: Subscribed[]) => void subscribed(results)}
      />
    {/if}
  </details>
{/if}

<style>
  .bar {
    display: grid;
    gap: 6px;
    margin-bottom: 12px;
    padding: 10px 14px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .bar.pending {
    border-inline-start: 4px solid var(--colour-accent);
  }

  .bar p {
    margin: 0;
  }

  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .board {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    gap: 12px;
    container-type: inline-size;
  }

  @media (max-width: 900px) {
    .board {
      grid-template-columns: minmax(0, 1fr);
    }

    .between {
      flex-direction: row !important;
      flex-wrap: wrap;
    }
  }

  .side {
    display: grid;
    grid-template-rows: auto auto minmax(0, 1fr);
    gap: 6px;
    min-width: 0;
  }

  .side h3 {
    margin: 0;
    font-size: 1rem;
  }

  .filter,
  select,
  .add input {
    min-height: 44px;
    padding: 6px 10px;
    font: inherit;
    color: var(--colour-text);
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .rows {
    height: min(60vh, 640px);
    margin: 0;
    padding: 0;
    overflow-y: auto;
    list-style: none;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .rows li {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 2px 8px;
    min-height: 40px;
    padding: 8px 10px;
    border-bottom: 1px solid var(--colour-line);
    cursor: pointer;
    user-select: none;
  }

  .rows li[aria-selected="true"] {
    background: color-mix(in srgb, var(--colour-accent) 18%, transparent);
  }

  .rows li:focus-visible {
    outline: 2px solid var(--colour-accent);
    outline-offset: -2px;
  }

  .rows li.drop-before {
    box-shadow: inset 0 3px 0 var(--colour-accent);
  }

  .rows li.drop-after {
    box-shadow: inset 0 -3px 0 var(--colour-accent);
  }

  .place {
    min-width: 2.5em;
    color: var(--colour-muted);
    font-variant-numeric: tabular-nums;
  }

  .name {
    flex: 1 1 12em;
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .source {
    color: var(--colour-muted);
  }

  .marks {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 10px;
    flex-basis: 100%;
    padding-inline-start: 2.5em;
    color: var(--colour-accent);
  }

  .between {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 8px;
  }

  .how {
    margin: 8px 0 16px;
  }

  .info {
    margin-bottom: 12px;
  }

  .info dl {
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
    gap: 4px 12px;
    margin: 0 0 10px;
  }

  .info dd {
    margin: 0;
    overflow-wrap: anywhere;
  }

  .said.refused {
    color: var(--colour-text);
    font-weight: 600;
  }

  .confirm {
    margin-top: 8px;
    padding: 10px 14px;
    border: 1px solid var(--colour-accent);
    border-radius: 4px;
  }

  .add summary {
    min-height: 44px;
    display: flex;
    align-items: center;
    cursor: pointer;
  }

  .list-choice {
    display: inline-flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 10px;
  }
</style>
