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
  import {
    editModList,
    readMods,
    undoEdit,
    unsubscribeFrom,
  } from "./desktopClient";
  import {
    CARRY_STEPS,
    type Findable,
    type From,
    type OnRow,
    type Show,
    blockPlace,
    fits,
    nameOf,
    nudged,
    offRows,
    onRows,
    placeBeside,
    placeFrom,
    toggled,
    withBlockAt,
    withList,
    workshopNumberIn,
  } from "./editor";
  import ModFinder from "./ModFinder.svelte";
  import SteamSubscribe from "./SteamSubscribe.svelte";
  import type { ModRow, ModsListing, Subscribed } from "./types";

  /**
   * Edit the list (0.46.0; moving made free in 0.47.0, the owner's choices of 22 Nov 2026: carry with the keys, put beside a named
   * mod, several at once, and dragging too). Every mod on this PC in one scroll: choose mods with Space or a click, then carry them
   * with the arrow keys (Enter puts them down), put them after or before a mod found by name, give a place, switch them off or on,
   * or drag them. Each change is saved once, when it is made, by the tools after a backup of the list; Undo the last change walks
   * back one change at a time. Dragging is a shortcut: every move has keys and buttons.
   */
  let { game }: { game: GameHome } = $props();

  const SHOWS: { id: Show; key: string }[] = [
    { id: "both", key: "modlist-edit-show-both" },
    { id: "on", key: "modlist-edit-show-on" },
    { id: "off", key: "modlist-edit-show-off" },
  ];
  const FROMS: { id: From; key: string }[] = [
    { id: "all", key: "modlist-edit-from-all" },
    { id: "workshop", key: "modlist-edit-from-workshop" },
    { id: "local", key: "modlist-edit-from-local" },
    { id: "game", key: "modlist-edit-from-game" },
  ];
  const SOURCE: Record<string, string> = {
    workshop: "modlist-edit-source-workshop",
    local: "modlist-edit-source-local",
    game: "modlist-edit-source-game",
  };
  /** The keys that walk a list while nothing is carried: one row, ten, or to either end. */
  const WALK: Record<string, number> = {
    ArrowUp: -1,
    ArrowDown: 1,
    PageUp: -10,
    PageDown: 10,
    Home: -Infinity,
    End: Infinity,
  };

  type Reading =
    | { state: "reading" }
    | { state: "ready"; listing: ModsListing }
    | { state: "failed"; failure: Failure };
  type Finding = "after" | "before" | "on-after";

  let reading = $state<Reading>({ state: "reading" });
  let listKey = $state("");
  let search = $state("");
  let show = $state<Show>("both");
  let from = $state<From>("all");
  let chosenOn = $state<string[]>([]);
  let chosenOff = $state<string[]>([]);
  let focusOn = $state("");
  let focusOff = $state("");
  let carrying = $state<{
    keys: string[];
    place: number;
    start: number;
  } | null>(null);
  let finding = $state<Finding | null>(null);
  let placeTyped = $state("");
  let dragging = $state<{ keys: string[]; from: "on" | "off" } | null>(null);
  let dropAt = $state<{ key: string; after: boolean } | null>(null);
  let onList = $state<HTMLElement | null>(null);
  let offList = $state<HTMLElement | null>(null);
  let busy = $state(false);
  let progress = $state(started());
  let said = $state<{ text: string; refused: boolean } | null>(null);
  /** Unsubscribe asks first (0.49.0; the owner's choice: Steam deletes the files, so a yes, and the mods are switched off). */
  let asking = $state<{
    side: "on" | "off";
    numbers: string[];
    names: string[];
  } | null>(null);
  let linkTyped = $state("");
  const linked = $derived(workshopNumberIn(linkTyped));
  /** A mod subscribed from a link and now on this PC, offered to switch on. */
  let offered = $state<{ key: string; name: string } | null>(null);

  function hearing() {
    return (m: Parameters<typeof heard>[1]) => {
      progress = heard(progress, m);
    };
  }

  async function load() {
    busy = true;
    progress = started(t("modlist-edit-reading"));
    const answer = await readMods(game.id, hearing());
    busy = false;
    if (answer.state === "ready") {
      reading = { state: "ready", listing: answer.listing };
      if (!answer.listing.lists.some((l) => l.key === listKey)) {
        listKey = answer.listing.lists[0]?.key ?? "";
      }
      const mods = new Set(answer.listing.mods.map((m) => m.key));
      const listed = new Set(listKeys());
      chosenOn = chosenOn.filter((k) => listed.has(k));
      chosenOff = chosenOff.filter((k) => mods.has(k) && !listed.has(k));
    } else if (answer.state === "failed") {
      reading = { state: "failed", failure: answer.failure };
    }
  }

  function listKeys(): string[] {
    if (reading.state !== "ready") return [];
    return (
      reading.listing.lists
        .find((l) => l.key === listKey)
        ?.entries.map((e) => e.key) ?? []
    );
  }

  function idsOf(keys: string[]): string[] {
    if (reading.state !== "ready") return [];
    const list = reading.listing.lists.find((l) => l.key === listKey);
    const ids = new Map<string, string>();
    for (const mod of reading.listing.mods) ids.set(mod.key, mod.id);
    for (const entry of list?.entries ?? []) ids.set(entry.key, entry.id);
    return keys.map((k) => ids.get(k) ?? k);
  }

  async function act(
    action: "remove" | "enable" | "move",
    keys: string[],
    place: number | null,
  ) {
    if (reading.state !== "ready" || keys.length === 0) return;
    said = null;
    busy = true;
    progress = started(t("modlist-changing"));
    const answer = await editModList(
      game.id,
      listKey,
      action,
      idsOf(keys),
      place,
      hearing(),
    );
    busy = false;
    if (settle(answer, 1)) {
      if (action === "remove") chosenOn = [];
      if (action === "enable") chosenOff = [];
    }
  }

  async function undo() {
    said = null;
    busy = true;
    progress = started(t("modlist-changing"));
    const answer = await undoEdit(game.id, listKey, hearing());
    busy = false;
    settle(answer, -1);
  }

  /** Takes in what a change or an undo answered; true when it was made. */
  function settle(
    answer: Awaited<ReturnType<typeof undoEdit>>,
    step: 1 | -1,
  ): boolean {
    carrying = null;
    finding = null;
    if (answer.state === "failed") {
      said = {
        text: t("modlist-change-failed", { reason: answer.failure.detail }),
        refused: true,
      };
      return false;
    }
    if (!answer.result.ok) {
      said = {
        text: t("modlist-change-failed", {
          reason: answer.result.refusal ?? "",
        }),
        refused: true,
      };
      return false;
    }
    const { ids, keys } = answer.result.data;
    if (reading.state === "ready" && ids && keys) {
      reading = {
        state: "ready",
        listing: withList(reading.listing, listKey, ids, keys, step),
      };
    }
    said = {
      text:
        step === 1
          ? t("modlist-edit-done", { change: answer.result.data.change ?? "" })
          : t("modlist-undone", { change: answer.result.data.undoes ?? "" }),
      refused: false,
    };
    return true;
  }

  // ------------------------------------------------------------ Steam: unsubscribe after a yes, subscribe from a link

  /** The Workshop mods among these, with their numbers and names. */
  function workshopOf(keys: string[]): { numbers: string[]; names: string[] } {
    if (reading.state !== "ready") return { numbers: [], names: [] };
    const mods = new Map(reading.listing.mods.map((m) => [m.key, m]));
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
    const chosen = asking;
    asking = null;
    if (!chosen || reading.state !== "ready") return;
    said = null;
    busy = true;
    progress = started(t("modlist-steam-unsubscribing"));
    const answer = await unsubscribeFrom(
      game.id,
      listKey,
      chosen.numbers,
      hearing(),
    );
    busy = false;
    if (answer.state === "failed") {
      said = {
        text: t("modlist-steam-failed", { reason: answer.failure.detail }),
        refused: true,
      };
      return;
    }
    if (!answer.result.ok) {
      said = {
        text: t("modlist-steam-failed", {
          reason: answer.result.refusal ?? "",
        }),
        refused: true,
      };
      return;
    }
    const gone = (answer.result.data.results ?? []).filter(
      (r) => r.unsubscribed,
    ).length;
    chosenOn = [];
    chosenOff = [];
    await load();
    said = {
      text: t("modlist-steam-unsubscribed", {
        count: gone,
        off: answer.result.data.switched_off?.length ?? 0,
      }),
      refused: gone < chosen.numbers.length,
    };
  }

  async function subscribedFromLink(results: Subscribed[]) {
    linkTyped = "";
    await load();
    const first = results.find((r) => r.installed && r.id);
    if (!first || reading.state !== "ready") return;
    const mod = reading.listing.mods.find((m) => m.id === first.id);
    const listed = new Set(listKeys());
    offered =
      mod && !listed.has(mod.key) ? { key: mod.key, name: mod.name } : null;
  }

  // ------------------------------------------------------------ carrying with the keys

  function pickUp(keys: string[]) {
    if (keys.length === 0) return;
    const all = listKeys();
    const block = all.filter((k) => keys.includes(k));
    const start = blockPlace(all, new Set(block));
    carrying = { keys: block, place: start, start };
    finding = null;
    void showCarried();
  }

  async function showCarried() {
    await tick();
    const row = onList?.querySelector<HTMLElement>("[data-carried='first']");
    row?.focus();
    row?.scrollIntoView({ block: "nearest" });
  }

  function carry(step: number) {
    if (!carrying) return;
    const others = listKeys().length - carrying.keys.length;
    carrying = { ...carrying, place: nudged(carrying.place, step, others) };
    void showCarried();
  }

  function putDown() {
    if (!carrying) return;
    const { keys, place, start } = carrying;
    if (place === start) {
      carrying = null;
      return;
    }
    void act("move", keys, place);
  }

  function putBeside(target: Findable, after: boolean) {
    const place = placeBeside(listKeys(), new Set(chosenOn), target.key, after);
    if (place !== null) void act("move", chosenOn, place);
  }

  function switchOnBeside(target: Findable) {
    const place = placeBeside(listKeys(), new Set(), target.key, true);
    if (place !== null) void act("enable", chosenOff, place);
  }

  function moveToTyped() {
    const last = listKeys().length - chosenOn.length + 1;
    const place = placeFrom(placeTyped, last);
    if (place === null) {
      said = {
        text: t("modlist-edit-place-bad", { count: last }),
        refused: true,
      };
      return;
    }
    placeTyped = "";
    void act("move", chosenOn, place);
  }

  // ------------------------------------------------------------ walking a list with the keys

  async function focusRow(list: HTMLElement | null, key: string) {
    await tick();
    const row = list?.querySelector<HTMLElement>(
      `[data-key="${CSS.escape(key)}"]`,
    );
    row?.focus();
    row?.scrollIntoView({ block: "nearest" });
  }

  function onKeys(event: KeyboardEvent, visible: string[]) {
    if (carrying) {
      const step = CARRY_STEPS[event.key];
      if (step !== undefined) carry(step);
      else if (event.key === "Enter" || event.key === " ") putDown();
      else if (event.key === "Escape") {
        carrying = null;
        void focusRow(onList, focusOn);
      } else return;
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const walk = WALK[event.key];
    const here = focusOn || visible[0];
    if (walk !== undefined) {
      const at = Math.max(0, visible.indexOf(here));
      focusOn = visible[Math.max(0, Math.min(at + walk, visible.length - 1))];
      void focusRow(onList, focusOn);
    } else if (event.key === " ") {
      chosenOn = toggled(chosenOn, here);
    } else if (event.key === "Enter") {
      pickUp(chosenOn.length > 0 ? chosenOn : [here]);
    } else if (event.key === "Escape" && chosenOn.length > 0) {
      chosenOn = [];
    } else return;
    event.preventDefault();
    event.stopPropagation();
  }

  function offKeys(event: KeyboardEvent, visible: string[]) {
    const walk = WALK[event.key];
    const here = focusOff || visible[0];
    if (walk !== undefined) {
      const at = Math.max(0, visible.indexOf(here));
      focusOff = visible[Math.max(0, Math.min(at + walk, visible.length - 1))];
      void focusRow(offList, focusOff);
    } else if (event.key === " ") {
      chosenOff = toggled(chosenOff, here);
    } else if (event.key === "Enter") {
      void act("enable", chosenOff.length > 0 ? chosenOff : [here], null);
    } else if (event.key === "Escape" && chosenOff.length > 0) {
      chosenOff = [];
    } else return;
    event.preventDefault();
    event.stopPropagation();
  }

  // ------------------------------------------------------------ dragging, a shortcut only

  function dragStart(event: DragEvent, key: string, side: "on" | "off") {
    const chosen = side === "on" ? chosenOn : chosenOff;
    dragging = { keys: chosen.includes(key) ? [...chosen] : [key], from: side };
    event.dataTransfer?.setData("text/plain", key);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
  }

  function dragOver(event: DragEvent, key: string) {
    if (!dragging || (dragging.from === "on" && dragging.keys.includes(key)))
      return;
    event.preventDefault();
    const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
    dropAt = { key, after: event.clientY > box.top + box.height / 2 };
  }

  function drop(event: DragEvent) {
    event.preventDefault();
    const held = dragging;
    const at = dropAt;
    dragging = null;
    dropAt = null;
    if (!held || !at) return;
    const moving = new Set(held.from === "on" ? held.keys : []);
    const place = placeBeside(listKeys(), moving, at.key, at.after);
    if (place === null) return;
    void act(held.from === "on" ? "move" : "enable", held.keys, place);
  }

  function dragEnd() {
    dragging = null;
    dropAt = null;
  }

  const sourceWords = (mod: ModRow | null) =>
    mod
      ? t(SOURCE[mod.source] ?? "modlist-edit-source-local")
      : t("modlist-edit-not-here");

  const findable = (rows: OnRow[], leaveOut: string[]): Findable[] =>
    rows
      .filter((r) => !leaveOut.includes(r.entry.key))
      .map((r) => ({
        key: r.entry.key,
        name: nameOf(r),
        id: r.entry.id,
        place: r.place,
      }));

  onMount(() => {
    void load();
    return register({
      scope: "everywhere",
      inDialog: false,
      run: { "look-again": () => void load() },
    });
  });
</script>

{#snippet askUnsubscribe(chosen: { numbers: string[]; names: string[] })}
  <div class="confirm" role="group" aria-label={t("modlist-confirm-label")}>
    <p>
      {t("modlist-steam-unsubscribe-confirm", {
        count: chosen.numbers.length,
        names: chosen.names.join(", "),
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
{/snippet}

{#if said}
  <p class="told" class:refused={said.refused} role="status">{said.text}</p>
{/if}

{#if reading.state === "reading"}
  <ProgressBar {progress} fallback={t("modlist-edit-reading")} />
  <Placeholder shape="rows" />
{:else if reading.state === "failed"}
  <FailurePanel failure={reading.failure} onretry={load} />
{:else if !reading.listing.supported}
  {#each reading.listing.notes as note, index (index)}
    <p>{note}</p>
  {/each}
{:else}
  {@const listing = reading.listing}
  {@const list = listing.lists.find((l) => l.key === listKey)}
  {@const running = listing.running.length > 0}
  {@const locked = busy || running || !list?.writable}
  {@const allOn = onRows(listing, listKey)}
  {@const byKey = new Map(allOn.map((r) => [r.entry.key, r]))}
  {@const carriedSet = new Set(carrying?.keys ?? [])}
  {@const on = carrying
    ? withBlockAt(
        allOn.map((r) => r.entry.key),
        carriedSet,
        carrying.place,
      ).flatMap((key, n) => {
        const row = byKey.get(key);
        return row ? [{ ...row, place: n + 1 }] : [];
      })
    : allOn.filter((r) => fits(r.mod, nameOf(r), search, from))}
  {@const allOff = offRows(listing, listKey)}
  {@const off = allOff.filter((m) => fits(m, m.name, search, from))}
  {@const onShown = on.map((r) => r.entry.key)}
  {@const offShown = off.map((m) => m.key)}
  {@const length = list?.entries.length ?? 0}

  {#if running}
    <p class="told refused" role="status">
      {t("modlist-running", { names: listing.running.join(", ") })}
    </p>
  {/if}

  <section class="panel controls" aria-label={t("modlist-edit-controls")}>
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
              chosenOn = [];
              chosenOff = [];
              carrying = null;
            }}>{choice.label}</button
          >
        {/each}
      </div>
    {/if}
    <div class="row-of">
      <label class="find">
        <span>{t("modlist-edit-find")}</span>
        <input type="search" bind:value={search} disabled={!!carrying} />
      </label>
      <div class="buttons">
        <button
          type="button"
          class="action"
          disabled={locked || (listing.changes[listKey] ?? 0) === 0}
          onclick={undo}>{t("modlist-undo")}</button
        >
        <button type="button" class="action" disabled={busy} onclick={load}
          >{t("modlist-check-again")}</button
        >
      </div>
    </div>
    <div class="row-of link">
      <label class="find">
        <span>{t("modlist-steam-link")}</span>
        <input type="text" bind:value={linkTyped} autocomplete="off" />
      </label>
      <SteamSubscribe
        game={game.id}
        numbers={linked ? [linked] : []}
        label={t("modlist-steam-subscribe")}
        disabled={busy || !linked}
        ondone={subscribedFromLink}
      />
    </div>
    {#if offered}
      {@const offer = offered}
      <p class="offer">
        {t("modlist-steam-offer-on", { name: offer.name })}
        <button
          type="button"
          class="action strong"
          disabled={locked}
          onclick={() => {
            const key = offer.key; // read before the offer goes: it is the offer's own value
            offered = null;
            void act("enable", [key], null);
          }}>{t("modlist-edit-switch-on")}</button
        >
      </p>
    {/if}
    <div class="row-of">
      <div class="buttons" role="group" aria-label={t("modlist-edit-show")}>
        <span class="muted small">{t("modlist-edit-show")}</span>
        {#each SHOWS as choice (choice.id)}
          <button
            type="button"
            class="action toggle"
            aria-pressed={show === choice.id}
            onclick={() => (show = choice.id)}>{t(choice.key)}</button
          >
        {/each}
      </div>
      <div class="buttons" role="group" aria-label={t("modlist-edit-from")}>
        <span class="muted small">{t("modlist-edit-from")}</span>
        {#each FROMS as choice (choice.id)}
          <button
            type="button"
            class="action toggle"
            aria-pressed={from === choice.id}
            onclick={() => (from = choice.id)}>{t(choice.key)}</button
          >
        {/each}
      </div>
    </div>
    <p class="muted small keys-help">{t("modlist-edit-keys")}</p>
    {#if busy}
      <ProgressBar {progress} fallback={t("modlist-changing")} />
    {/if}
  </section>

  {#if show !== "off"}
    <section class="panel" aria-labelledby="modlist-edit-on">
      <h2 id="modlist-edit-on">
        {t("modlist-edit-on-title", { count: length })}
      </h2>

      <div
        class="bar"
        class:carrying={!!carrying}
        role="group"
        aria-label={t("modlist-edit-on-actions")}
      >
        {#if carrying}
          <p class="state">
            {t("modlist-edit-carrying", {
              count: carrying.keys.length,
              place: carrying.place,
            })}
          </p>
          <div class="buttons">
            <button type="button" class="action" onclick={() => carry(-1)}
              >{t("modlist-edit-up")}</button
            >
            <button type="button" class="action" onclick={() => carry(1)}
              >{t("modlist-edit-down")}</button
            >
            <button
              type="button"
              class="action strong"
              disabled={locked}
              onclick={putDown}>{t("modlist-edit-put-down")}</button
            >
            <button
              type="button"
              class="action"
              onclick={() => (carrying = null)}>{t("modlist-cancel")}</button
            >
          </div>
        {:else}
          <p class="state">
            {chosenOn.length > 0
              ? t("modlist-edit-chosen", { count: chosenOn.length })
              : t("modlist-edit-choose-help")}
          </p>
          <div class="buttons">
            <button
              type="button"
              class="action strong"
              disabled={locked || chosenOn.length === 0}
              onclick={() => pickUp(chosenOn)}>{t("modlist-edit-carry")}</button
            >
            <button
              type="button"
              class="action"
              disabled={locked || chosenOn.length === 0}
              aria-pressed={finding === "after"}
              onclick={() => (finding = finding === "after" ? null : "after")}
              >{t("modlist-edit-put-after")}</button
            >
            <button
              type="button"
              class="action"
              disabled={locked || chosenOn.length === 0}
              aria-pressed={finding === "before"}
              onclick={() => (finding = finding === "before" ? null : "before")}
              >{t("modlist-edit-put-before")}</button
            >
            <form
              class="to"
              onsubmit={(event) => {
                event.preventDefault();
                moveToTyped();
              }}
            >
              <label class="place-box">
                <span class="small">{t("modlist-edit-place-short")}</span>
                <input
                  type="text"
                  inputmode="numeric"
                  size="4"
                  aria-label={t("modlist-edit-place-label")}
                  disabled={locked || chosenOn.length === 0}
                  bind:value={placeTyped}
                />
              </label>
              <button
                type="submit"
                class="action"
                disabled={locked || chosenOn.length === 0}
                >{t("modlist-edit-move-to")}</button
              >
            </form>
            <button
              type="button"
              class="action"
              disabled={locked || chosenOn.length === 0}
              onclick={() => act("remove", chosenOn, null)}
              >{t("modlist-edit-off")}</button
            >
            <button
              type="button"
              class="action"
              disabled={locked || workshopOf(chosenOn).numbers.length === 0}
              onclick={() => (asking = { side: "on", ...workshopOf(chosenOn) })}
              >{t("modlist-steam-unsubscribe")}</button
            >
            <button
              type="button"
              class="action"
              disabled={chosenOn.length === 0}
              onclick={() => (chosenOn = [])}>{t("modlist-edit-let-go")}</button
            >
          </div>
        {/if}
      </div>
      {#if asking?.side === "on" && !carrying}
        {@render askUnsubscribe(asking)}
      {/if}

      {#if finding === "after" || finding === "before"}
        {@const after = finding === "after"}
        <ModFinder
          mods={findable(allOn, chosenOn)}
          label={t(after ? "modlist-finder-after" : "modlist-finder-before", {
            count: chosenOn.length,
          })}
          pickWords={(m) =>
            t(
              after
                ? "modlist-finder-pick-after"
                : "modlist-finder-pick-before",
              { name: m.name, place: m.place ?? 0 },
            )}
          onpick={(m) => putBeside(m, after)}
          oncancel={() => (finding = null)}
        />
      {/if}

      {#if carrying}
        <p class="muted small">{t("modlist-edit-filters-paused")}</p>
      {/if}

      {#if on.length === 0}
        <p class="muted">{t("modlist-edit-none-found")}</p>
      {:else}
        <ul
          class="rows"
          role="listbox"
          tabindex="-1"
          aria-multiselectable="true"
          aria-labelledby="modlist-edit-on"
          bind:this={onList}
          onkeydown={(event) => onKeys(event, onShown)}
        >
          {#each on as row, index (row.entry.key)}
            {@const key = row.entry.key}
            {@const chosen = chosenOn.includes(key)}
            {@const carried = carriedSet.has(key)}
            <!-- The list's own keys choose and carry (onkeydown on the listbox), so a row needs no handler of its own. -->
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <li
              role="option"
              aria-selected={chosen || carried}
              tabindex={key === (focusOn || onShown[0]) ? 0 : -1}
              data-key={key}
              data-carried={carried
                ? carrying?.keys[0] === key
                  ? "first"
                  : "yes"
                : undefined}
              class:chosen
              class:carried
              class:stripe={index % 2 === 1}
              class:drop-before={dropAt?.key === key && !dropAt.after}
              class:drop-after={dropAt?.key === key && dropAt.after}
              draggable={!locked && !carrying}
              onclick={() => {
                if (carrying) return;
                focusOn = key;
                chosenOn = toggled(chosenOn, key);
              }}
              onfocus={() => {
                if (!carrying) focusOn = key;
              }}
              ondragstart={(event) => dragStart(event, key, "on")}
              ondragover={(event) => dragOver(event, key)}
              ondrop={drop}
              ondragend={dragEnd}
            >
              <span class="place">{row.place}</span>
              <span class="tick" aria-hidden="true"
                >{carried ? "↕" : chosen ? "✓" : ""}</span
              >
              <span class="who">
                <strong>{nameOf(row)}</strong>
                {#if row.mod?.authors}
                  <span class="muted small">{row.mod.authors}</span>
                {/if}
              </span>
              <span class="chip {row.mod?.source ?? 'gone'}"
                >{sourceWords(row.mod)}</span
              >
            </li>
          {/each}
        </ul>
      {/if}
    </section>
  {/if}

  {#if show !== "on" && !carrying}
    <section class="panel" aria-labelledby="modlist-edit-off">
      <h2 id="modlist-edit-off">
        {t("modlist-edit-off-title", { count: allOff.length })}
      </h2>

      <div class="bar" role="group" aria-label={t("modlist-edit-off-actions")}>
        <p class="state">
          {chosenOff.length > 0
            ? t("modlist-edit-chosen", { count: chosenOff.length })
            : t("modlist-edit-choose-off-help")}
        </p>
        <div class="buttons">
          <button
            type="button"
            class="action strong"
            disabled={locked || chosenOff.length === 0}
            onclick={() => act("enable", chosenOff, null)}
            >{t("modlist-edit-switch-on")}</button
          >
          <button
            type="button"
            class="action"
            disabled={locked || chosenOff.length === 0}
            aria-pressed={finding === "on-after"}
            onclick={() =>
              (finding = finding === "on-after" ? null : "on-after")}
            >{t("modlist-edit-on-after")}</button
          >
          <button
            type="button"
            class="action"
            disabled={locked || workshopOf(chosenOff).numbers.length === 0}
            onclick={() => (asking = { side: "off", ...workshopOf(chosenOff) })}
            >{t("modlist-steam-unsubscribe")}</button
          >
          <button
            type="button"
            class="action"
            disabled={chosenOff.length === 0}
            onclick={() => (chosenOff = [])}>{t("modlist-edit-let-go")}</button
          >
        </div>
      </div>
      {#if asking?.side === "off"}
        {@render askUnsubscribe(asking)}
      {/if}

      {#if finding === "on-after"}
        <ModFinder
          mods={findable(allOn, [])}
          label={t("modlist-finder-on-after", { count: chosenOff.length })}
          pickWords={(m) =>
            t("modlist-finder-pick-after", {
              name: m.name,
              place: m.place ?? 0,
            })}
          onpick={switchOnBeside}
          oncancel={() => (finding = null)}
        />
      {/if}

      {#if off.length === 0}
        <p class="muted">{t("modlist-edit-none-found")}</p>
      {:else}
        <ul
          class="rows"
          role="listbox"
          tabindex="-1"
          aria-multiselectable="true"
          aria-labelledby="modlist-edit-off"
          bind:this={offList}
          onkeydown={(event) => offKeys(event, offShown)}
        >
          {#each off as mod, index (mod.key)}
            {@const chosen = chosenOff.includes(mod.key)}
            <!-- The list's own keys choose and carry (onkeydown on the listbox), so a row needs no handler of its own. -->
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <li
              role="option"
              aria-selected={chosen}
              tabindex={mod.key === (focusOff || offShown[0]) ? 0 : -1}
              data-key={mod.key}
              class:chosen
              class:stripe={index % 2 === 1}
              draggable={!locked}
              onclick={() => {
                focusOff = mod.key;
                chosenOff = toggled(chosenOff, mod.key);
              }}
              onfocus={() => (focusOff = mod.key)}
              ondragstart={(event) => dragStart(event, mod.key, "off")}
              ondragend={dragEnd}
            >
              <span class="tick" aria-hidden="true">{chosen ? "✓" : ""}</span>
              <span class="who">
                <strong>{mod.name}</strong>
                {#if mod.authors}
                  <span class="muted small">{mod.authors}</span>
                {/if}
                {#if mod.needs.length > 0}
                  <span class="muted small"
                    >{t("modlist-edit-needs", {
                      names: mod.needs.join(", "),
                    })}</span
                  >
                {/if}
              </span>
              <span class="chip {mod.source}">{sourceWords(mod)}</span>
            </li>
          {/each}
        </ul>
      {/if}
    </section>
  {/if}
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
    margin-bottom: 8px;
    font-family: var(--font-display);
    font-size: 1.375rem;
    font-weight: 600;
  }

  .row-of {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 6px 20px;
  }

  .row-of.link {
    justify-content: flex-start;
  }

  .buttons {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin: 6px 0;
  }

  .find {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin: 6px 0;
  }

  .find input {
    min-height: var(--control-min);
    min-width: min(24em, 100%);
  }

  .keys-help {
    margin-top: 6px;
  }

  /* What to do with the chosen mods stays in view while the list scrolls under it. */
  .bar {
    position: sticky;
    top: 0;
    z-index: 1;
    margin: 0 -12px 8px;
    padding: 6px 12px;
    background: var(--colour-surface-raised);
    border-block-end: 1px solid var(--colour-line);
  }

  .bar.carrying {
    background: var(--shade-observed);
    border-block-end: 2px solid var(--colour-observed);
  }

  .state {
    margin: 4px 0 0;
    font-weight: 600;
  }

  .action.strong {
    border-width: 2px;
  }

  .to {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .place-box {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .to input {
    min-height: var(--control-min);
    width: 4.5em;
  }

  .rows {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .rows li {
    display: flex;
    align-items: center;
    gap: 6px 12px;
    min-height: var(--control-min);
    padding: 6px 10px;
    border-inline-start: 3px solid transparent;
    cursor: pointer;
    overflow-wrap: anywhere;
  }

  .rows li.stripe {
    background: color-mix(
      in srgb,
      var(--colour-surface-soft) 45%,
      var(--colour-surface-raised)
    );
  }

  .rows li:focus-visible {
    outline: 3px solid var(--colour-accent);
    outline-offset: -3px;
  }

  .rows li.chosen {
    background: var(--shade-accent);
    border-inline-start-color: var(--colour-accent);
  }

  .rows li.carried {
    background: var(--shade-observed);
    border-inline-start-color: var(--colour-observed);
  }

  .rows li.drop-before {
    box-shadow: inset 0 3px 0 var(--colour-accent);
  }

  .rows li.drop-after {
    box-shadow: inset 0 -3px 0 var(--colour-accent);
  }

  .place {
    min-width: 2.5em;
    text-align: end;
    font-variant-numeric: tabular-nums;
    color: var(--colour-text-muted);
  }

  .tick {
    width: 1.2em;
    font-weight: 700;
    color: var(--colour-accent);
  }

  .carried .tick {
    color: var(--colour-observed);
  }

  .who {
    display: flex;
    flex-direction: column;
    flex: 1 1 16em;
  }

  /* Where a mod comes from: words always, a shade of the theme as well. */
  .chip {
    flex: none;
    padding: 2px 8px;
    font-size: var(--type-caption);
    border: 1px solid var(--colour-line);
    border-radius: 999px;
    color: var(--colour-text);
  }

  .chip.workshop {
    background: var(--shade-observed);
    border-color: var(--colour-observed);
  }

  .chip.local {
    background: var(--shade-comparison);
    border-color: var(--colour-comparison);
  }

  .chip.game {
    background: var(--shade-accent);
    border-color: var(--colour-accent);
  }

  .chip.gone {
    background: var(--shade-risk);
    border-color: var(--colour-risk);
  }

  .confirm {
    margin: 8px 0;
    padding: 10px 14px;
    border: 2px solid var(--colour-risk);
    background: var(--shade-risk);
    border-radius: 4px;
  }

  .offer {
    margin: 8px 0;
    padding: 8px 12px;
    border-inline-start: 3px solid var(--colour-success);
    background: var(--shade-success);
  }

  .told {
    margin-bottom: 12px;
  }

  .told.refused {
    color: var(--colour-risk);
  }
</style>
