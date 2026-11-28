<script lang="ts">
  import { t } from "../i18n/runtime";
  import {
    formatUnixDate,
    headlineWords,
    pendingWords,
    problemKey,
  } from "./presentation";
  import type { GameHome, KitPins } from "./types";
  import { readKitPins } from "./desktopClient";
  import { keptLedger, readLedger } from "../mods/desktopClient";
  import { split } from "../mods/ledger";
  import { go, openDialog } from "../navigation/navigation.svelte";
  import { commitRequest } from "../code/presentation";
  import { placeOf } from "../navigation/place";
  import { formatWhen } from "../shell/dates";
  import type { Notes } from "../notes/notes";
  import { readScreenNotes, showScreenNote } from "../notes/desktopClient";
  import { noteSaves } from "../notes/saves.svelte";
  import RecordsNote from "../records/RecordsNote.svelte";
  import CleanupNote from "../cleanup/CleanupNote.svelte";
  import CrashNote from "../crash/CrashNote.svelte";
  import PerformanceNote from "../performance/PerformanceNote.svelte";
  import ModListNote from "../modlist/ModListNote.svelte";
  import GameStart from "../modlist/GameStart.svelte";
  import WaitingNote from "../reports/WaitingNote.svelte";
  import { pageServes } from "./kinds";
  import SafeCopiesNote from "../safecopies/SafeCopiesNote.svelte";
  import ClaimsPanel from "../claims/ClaimsPanel.svelte";
  import DecisionsNote from "../decisions/DecisionsNote.svelte";
  import PicksNote from "../picks/PicksNote.svelte";
  import PublishNote from "../publish/PublishNote.svelte";
  import { agents } from "../agents/state.svelte";
  import GateLights from "../online/GateLights.svelte";
  import UpdateReady from "../updates/UpdateReady.svelte";
  import SetupNeeded from "../setup/SetupNeeded.svelte";
  import TheirCodeChanged from "../online/TheirCodeChanged.svelte";
  import GamesPanel from "./GamesPanel.svelte";
  import NoteRow from "./NoteRow.svelte";
  import Tabs from "../shell/Tabs.svelte";
  import { PAGE_TABS } from "../shell/tabs";

  const PENDING_SHOWN = 6;
  const OPEN_SHOWN = 6;

  let {
    game,
    games = [],
    now,
  }: { game: GameHome; games?: GameHome[]; now: Date } = $props();

  const headline = $derived(headlineWords(game, now));
  const last = $derived(game.latest[0]);

  /** How many mod settings wait to be looked at (0.21.0); null until read, or when the game keeps none. */
  let settingsToLook = $state<number | null>(null);
  $effect(() => {
    const id = game.id;
    settingsToLook = null;
    // The count from the last answer kept, at once (0.116.0), then from a fresh read.
    let fresh = false;
    void keptLedger(id).then((kept) => {
      if (
        !fresh &&
        kept?.reading.state === "ready" &&
        id === game.id &&
        kept.reading.ledgers.length > 0
      )
        settingsToLook = split(kept.reading.ledgers).toLook.length;
    });
    void readLedger(id).then((answer) => {
      fresh = true;
      if (
        answer.state === "ready" &&
        id === game.id &&
        answer.ledgers.length > 0
      )
        settingsToLook = split(answer.ledgers).toLook.length;
    });
  });

  function openSettings() {
    go({
      page: "mods",
      game: game.id,
      focus: { panel: "settings" },
      dialog: null,
    });
  }

  /** Each repository's pin of the tool kit (cross-links S2); empty until read, or when the read fails. */
  let pins = $state<KitPins | null>(null);
  $effect(() => {
    const id = game.id;
    pins = null;
    void readKitPins(id).then((answer) => {
      if (answer.state === "ready" && id === game.id) pins = answer.pins;
    });
  });

  /** The screen notes (0.22.0): read again whenever one is saved; null until read, or when the read fails. */
  let notes = $state<Notes | null>(null);
  $effect(() => {
    void noteSaves.count;
    // Notes are for agent sessions (0.37.0): not read at all while those features are hidden.
    if (!agents.shown) return;
    void readScreenNotes().then((answer) => {
      if (answer.state === "ready") notes = answer.notes;
    });
  });

  /** A note's address takes the owner back to the page it was taken on. */
  function openNotePage(address: string) {
    const where = placeOf(address);
    if (where) go(where);
  }

  /** A latest commit opens its code (cross-links S4). */
  function openCommit(repository: string, hash: string, subject: string) {
    openDialog({
      kind: "code",
      request: commitRequest(repository, hash, subject),
    });
  }

  /**
   * How many rows Needs you shows (0.109.0), counted from the list as its notes come and go, for the tab's mark. A tab's parts
   * are drawn only while it is shown, so the last count is kept while another tab is open; Needs you opens first.
   */
  let inbox = $state<HTMLElement | null>(null);
  let waitingRows = $state<number | null>(null);
  $effect(() => {
    const list = inbox;
    if (!list) return;
    const count = () => {
      waitingRows = list.querySelectorAll(":scope > li").length;
    };
    count();
    const watching = new MutationObserver(count);
    watching.observe(list, { childList: true });
    return () => watching.disconnect();
  });
  const tabs = $derived(
    (PAGE_TABS.home ?? []).map((tab) =>
      tab.id === "needs" && waitingRows
        ? { ...tab, mark: t("home-needs-mark", { count: waitingRows }) }
        : tab,
    ),
  );

  /** Something not yet released opens its changelog on the Changes page. */
  function openChangelog(repository: string, product: string) {
    go({
      page: "changes",
      game: game.id,
      focus: { repository, product },
      dialog: null,
    });
  }
</script>

<div class="eyebrow accent">{t("home-kicker")}</div>
<h1>{t(headline.key, headline.args)}</h1>
<p class="lead">
  {#if last}
    {t("home-last-thing", { subject: last.subject })}
  {:else}
    {t("home-never-body")}
  {/if}
</p>

{#if pageServes(game.kind, "modlist")}
  {#key game.id}<GameStart {game} />{/key}
{/if}

{#snippet needsYou()}
  <ul class="inbox" bind:this={inbox} aria-label={t("home-needs-label")}>
    <UpdateReady />
    <SetupNeeded />
    {#if settingsToLook !== null && settingsToLook > 0}
      <NoteRow title={t("home-settings-title")}>
        <p>{t("home-settings-count", { count: settingsToLook })}</p>
        {#snippet actions()}
          <button type="button" class="action" onclick={openSettings}
            >{t("home-settings-open")}</button
          >
        {/snippet}
      </NoteRow>
    {/if}
    {#if pageServes(game.kind, "modlist")}
      {#key game.id}<ModListNote game={game.id} />{/key}
    {/if}
    <WaitingNote game={game.id} />
    <CrashNote game={game.id} />
    {#if pageServes(game.kind, "performance")}
      {#key game.id}<PerformanceNote game={game.id} />{/key}
    {/if}
    {#if agents.shown}
      <DecisionsNote game={game.id} />
      <PicksNote game={game.id} />
    {/if}
    {#if agents.shown && notes && notes.open.length > 0}
      <NoteRow title={t("notes-title")} attention>
        <p>{t("notes-open", { count: notes.open.length })}</p>
        <details>
          <summary>{t("home-notes-each")}</summary>
          <ul class="notes">
            {#each notes.open as note (note.id)}
              <li class="dated">
                <span class="read">{formatWhen(note.time)}</span>
                <div class="body">
                  <div>{note.words || t("notes-no-words")}</div>
                  <div class="muted small">{note.page} · {note.game}</div>
                  <div class="note-actions">
                    {#if note.has_picture}
                      <button
                        type="button"
                        class="action"
                        onclick={() => void showScreenNote(note.id)}
                        >{t("notes-show")}</button
                      >
                    {/if}
                    {#if placeOf(note.address)}
                      <button
                        type="button"
                        class="action"
                        onclick={() => openNotePage(note.address)}
                        >{t("notes-go")}</button
                      >
                    {/if}
                  </div>
                </div>
              </li>
            {/each}
          </ul>
          {#if notes.dealt.length > 0}
            <p class="muted small">
              {t("notes-dealt", {
                count: notes.dealt_count,
                shown: notes.dealt.length,
              })}
            </p>
            <ul class="notes">
              {#each notes.dealt as note (note.id)}
                <li class="dated">
                  <span class="read">{formatWhen(note.time)}</span>
                  <div class="body">
                    <div>{note.words || t("notes-no-words")}</div>
                    <div class="muted small">
                      {note.page} · {note.resolved?.how}
                    </div>
                  </div>
                </li>
              {/each}
            </ul>
          {/if}
          <p class="muted small">{t("notes-how")}</p>
        </details>
      </NoteRow>
    {/if}
    <RecordsNote game={game.id} />
    {#key game.id}<PublishNote game={game.id} />{/key}
    <CleanupNote game={game.id} />
  </ul>
  {#if waitingRows === 0}
    <p class="fine">
      <span aria-hidden="true">✓</span>
      {t("home-needs-none")}
    </p>
  {/if}
{/snippet}

{#snippet recentWork()}
  <GamesPanel {games} selected={game.id} {now} />
  {#if game.unfinished.length > 0}
    <section class="panel attention">
      <h2><span aria-hidden="true">◆</span> {t("unfinished-title")}</h2>
      <ul>
        {#each game.unfinished as item (item.repository)}
          <li>
            <div>{t("unfinished-files", { count: item.files })}</div>
            <div class="muted small">{item.repository}</div>
          </li>
        {/each}
      </ul>
    </section>
  {/if}
  {#if game.latest.length > 0}
    <section class="panel">
      <h2>{t("latest-title")}</h2>
      <ul>
        {#each game.latest as item, index (`${item.repository}-${index}`)}
          <li class="dated">
            <div class="read">{formatUnixDate(item.unix)}</div>
            <div class="body">
              {#if item.hash}
                <button
                  type="button"
                  class="link"
                  aria-label={t("home-open-commit", { subject: item.subject })}
                  onclick={() =>
                    openCommit(item.repository, item.hash ?? "", item.subject)}
                  >{item.subject}</button
                >
              {:else}
                <div>{item.subject}</div>
              {/if}
              <div class="muted small">{item.repository}</div>
            </div>
          </li>
        {/each}
      </ul>
    </section>
  {/if}
  {#if game.pending.length > 0}
    {@const shown = game.pending.slice(0, PENDING_SHOWN)}
    <section class="panel">
      <h2>{t("pending-title")}</h2>
      <ul>
        {#each shown as item (`${item.repository}-${item.product}`)}
          {@const words = pendingWords(item)}
          <li>
            <button
              type="button"
              class="link"
              aria-label={t("home-open-changelog", { product: item.product })}
              onclick={() => openChangelog(item.repository, item.product)}
              >{item.product}</button
            >
            <div class="muted small">
              {t(words.key, words.args)}{#if item.earlier_drafts > 0}{" "}{t(
                  "pending-earlier",
                  { count: item.earlier_drafts },
                )}{/if}
            </div>
          </li>
        {/each}
      </ul>
      {#if game.pending.length > shown.length}
        <p class="muted small more">
          {t("list-more", { count: game.pending.length - shown.length })}
        </p>
      {/if}
    </section>
  {/if}
  {#if game.open_work.length > 0}
    {@const shown = game.open_work.slice(0, OPEN_SHOWN)}
    <section class="panel">
      <h2>{t("open-title")}</h2>
      <p class="count">{t("open-count", { count: game.open_work.length })}</p>
      <ul>
        {#each shown as item, index (index)}
          <li>{item}</li>
        {/each}
      </ul>
      {#if game.open_work.length > shown.length}
        <p class="muted small more">
          {t("list-more", { count: game.open_work.length - shown.length })}
        </p>
      {/if}
    </section>
  {/if}
{/snippet}

{#snippet repositories()}
  <GateLights game={game.id} />
  <TheirCodeChanged game={game.id} />
  {#key game.id}<SafeCopiesNote game={game.id} />{/key}
  {#if pins && pins.pins.length > 0}
    <section class="panel" aria-labelledby="pins-title">
      <h2 id="pins-title">{t("pins-title")}</h2>
      <ul>
        {#each pins.pins as pin (`${pin.repository}/${pin.path}`)}
          <li>
            <div>
              {pin.ahead
                ? t("pins-ahead", {
                    repository: pin.repository,
                    version: pin.version,
                    kit: pin.kit,
                  })
                : pin.behind === 0
                  ? t("pins-current", {
                      repository: pin.repository,
                      version: pin.version,
                    })
                  : t("pins-behind", {
                      repository: pin.repository,
                      version: pin.version,
                      kit: pin.kit,
                      count: pin.behind,
                    })}
            </div>
            {#if pin.versions.length > 0}
              <details class="pin-versions">
                <summary
                  >{t("pins-gains", { count: pin.versions.length })}</summary
                >
                <ul>
                  {#each pin.versions as version (version.version)}
                    <li>
                      <strong>{version.version}</strong>
                      <span class="muted small">{version.heading}</span>
                      <ul class="leads">
                        {#each version.entries as lead, index (index)}
                          <li>{lead}</li>
                        {/each}
                      </ul>
                    </li>
                  {/each}
                </ul>
              </details>
            {/if}
          </li>
        {/each}
      </ul>
      <p class="muted small more">{t("pins-how")}</p>
    </section>
  {/if}
  {#if agents.shown}
    <ClaimsPanel />
  {/if}
  {#if game.problems.length > 0}
    <section class="panel">
      <h2 class="problem">{t("problems-title")}</h2>
      <ul>
        {#each game.problems as item (item.repository)}
          <li>
            <div>{item.repository}</div>
            <div class="muted small">{t(problemKey(item.problem))}</div>
          </li>
        {/each}
      </ul>
    </section>
  {/if}
{/snippet}

<Tabs {tabs} id="home" label={t("home-tabs-label")}>
  {#snippet children(tab)}
    {#if tab === "recent"}
      {@render recentWork()}
    {:else if tab === "repositories"}
      {@render repositories()}
    {:else}
      {@render needsYou()}
    {/if}
  {/snippet}
</Tabs>

<style>
  .inbox {
    margin: 0 0 16px;
    padding: 0;
    list-style: none;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .inbox:not(:has(> li)) {
    display: none;
  }

  .fine {
    margin-bottom: 16px;
    color: var(--colour-comparison);
  }

  .notes li {
    border-top: 1px solid var(--colour-line);
  }

  .panel {
    margin-bottom: 16px;
    padding: 20px 24px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .attention {
    border: 2px solid var(--colour-accent);
    padding: 19px 23px;
  }

  h2 {
    margin-bottom: 8px;
    font-family: var(--font-display);
    font-size: 1.375rem;
    font-weight: 600;
  }

  .attention h2 span {
    color: var(--colour-accent);
  }

  .note-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 10px;
    margin-top: 4px;
  }

  .problem {
    color: var(--colour-risk);
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    padding-block: 10px;
    border-top: 1px solid var(--colour-line);
    overflow-wrap: anywhere;
  }

  .dated {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 20px;
  }

  .read {
    flex: 0 0 110px;
    color: var(--colour-observed);
    font-size: var(--type-small);
    font-weight: 500;
  }

  .body {
    flex: 1 1 320px;
    min-width: 0;
  }

  .count {
    margin-bottom: 8px;
    color: var(--colour-comparison);
  }

  .link {
    display: block;
    min-height: var(--control-min);
    padding: 0;
    font: inherit;
    color: var(--colour-text);
    text-align: start;
    text-decoration: underline;
    text-decoration-color: var(--colour-line);
    text-underline-offset: 3px;
    background: none;
    border: none;
    cursor: pointer;
  }

  .link:hover,
  .link:focus-visible {
    color: var(--colour-accent);
    text-decoration-color: currentColor;
  }

  .pin-versions summary {
    min-height: var(--control-min);
    padding-block: 10px;
    cursor: pointer;
  }

  .leads {
    margin: 4px 0 0;
    padding-inline-start: 18px;
    list-style: disc;
  }

  .leads li {
    padding-block: 2px;
    border-top: none;
    font-size: var(--type-small);
  }

  .more {
    padding-top: 10px;
    border-top: 1px solid var(--colour-line);
  }
</style>
