<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import GuideLink from "../guide/GuideLink.svelte";
  import type { GameHome } from "../home/types";
  import { here, setFocus } from "../navigation/navigation.svelte";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import Placeholder from "../shell/Placeholder.svelte";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import { heard, started, type ProgressState } from "../shell/progress";
  import Tabs from "../shell/Tabs.svelte";
  import { tabsOf } from "../shell/tabs";
  import type { Failure } from "../shell/types";
  import { register } from "../shortcuts/registry";
  import {
    openItem,
    prepareMod,
    pullFromSteam,
    readCard,
    readPublishing,
    updateAll,
    uploadMod,
  } from "./desktopClient";
  import PageEditor from "./PageEditor.svelte";
  import {
    cardsOf,
    STEP_WORDS,
    stepped,
    VISIBILITY_WORDS,
    waitingCount,
    type ModCard,
  } from "./presentation";
  import type { Card, PressResult, PublishReading, Sender } from "./types";

  /**
   * Publish (0.69.0; the owner, 23 Nov 2026: Ostranauts' publishing scripts "in a visual way for the user to modify and upload their
   * mods easily", "genericized as far as is possible"; `docs/publishing.md`). Every repository of the game that keeps a Workshop
   * catalogue, a card per mod in publication order with its one next step, and the chosen mod's page, change note, Steam settings
   * and uploads. **Nothing reaches Steam except on the owner's press and yes**: Upload, Make public (a second, stronger yes) and
   * Update all waiting, while the Workshop uploads setting is on; Read Steam back reads Steam's public pages only.
   */
  let { game }: { game: GameHome } = $props();

  type Asking =
    | {
        kind: "create" | "update" | "public" | "public-sure";
        card: ModCard;
        title: string;
      }
    | { kind: "update-all"; count: number };

  let reading = $state<
    | { state: "reading" }
    | { state: "browser" }
    | { state: "ready"; data: PublishReading }
    | { state: "failed"; failure: Failure }
  >({ state: "reading" });
  let card = $state<
    | { state: "none" }
    | { state: "reading"; key: string }
    | { state: "ready"; key: string; card: Card }
    | { state: "failed"; key: string; failure: Failure }
  >({ state: "none" });
  let via = $state<Sender>("steam");
  let build = $state(true);
  let busy = $state(false);
  let working = $state<ProgressState | null>(null);
  let asking = $state<Asking | null>(null);
  let said = $state<{ ok: boolean; words: string; lines: string[] } | null>(
    null,
  );

  const repositories = $derived(
    reading.state === "ready" ? reading.data.repositories : [],
  );
  const chosenRepository = $derived(
    repositories.find((r) => r.repository === here().focus.repository) ??
      repositories[0] ??
      null,
  );
  const cards = $derived(chosenRepository ? cardsOf(chosenRepository) : []);
  const chosen = $derived(
    cards.find((c) => c.mod === here().focus.mod) ?? cards[0] ?? null,
  );
  const uploads = $derived(reading.state === "ready" && reading.data.uploads);
  const steamBack = $derived(
    reading.state === "ready" && reading.data.steamBack,
  );
  const waiting = $derived(
    chosenRepository ? waitingCount(chosenRepository) : 0,
  );
  const shown = $derived(card.state === "ready" ? card.card : null);
  const tabs = $derived(
    tabsOf("publish", {
      page: null,
      note:
        shown?.changeNoteVersions && shown.changeNoteVersions.length > 1
          ? t("publish-tab-versions", {
              count: shown.changeNoteVersions.length,
            })
          : null,
    }),
  );
  const senderWords = $derived(
    via === "steam" ? t("publish-via-steam") : t("publish-via-steamcmd"),
  );

  async function load() {
    const answer = await readPublishing(game.id);
    if (answer.state === "browser") reading = { state: "browser" };
    else if (answer.state === "ready")
      reading = { state: "ready", data: answer.value };
    else reading = { state: "failed", failure: answer.failure };
  }

  async function loadCard() {
    if (!chosenRepository || !chosen) {
      card = { state: "none" };
      return;
    }
    const key = `${chosenRepository.repository}/${chosen.mod}`;
    card = { state: "reading", key };
    const answer = await readCard(
      game.id,
      chosenRepository.repository,
      chosen.mod,
    );
    if (card.state !== "reading" || card.key !== key) return;
    card =
      answer.state === "ready"
        ? { state: "ready", key, card: answer.value }
        : { state: "failed", key, failure: answer.failure };
  }

  $effect(() => {
    void [chosenRepository?.repository, chosen?.mod, reading.state];
    void loadCard();
  });

  function choose(next: ModCard | undefined) {
    if (next) setFocus({ mod: next.mod });
  }

  function stepMod(step: 1 | -1) {
    choose(stepped(cards, chosen ? cards.indexOf(chosen) : -1, step));
  }

  /** What a press said: its lines, and the kit's word or the host's refusal. */
  function told(
    answer:
      | { state: "ready"; value: PressResult }
      | { state: "failed"; failure: Failure },
    done: string,
  ) {
    if (answer.state !== "ready") {
      said = {
        ok: false,
        words: t("publish-failed", { reason: answer.failure.detail }),
        lines: [],
      };
      return;
    }
    const data = answer.value.data ?? {};
    said = answer.value.ok
      ? { ok: true, words: done, lines: data.lines ?? [] }
      : {
          ok: false,
          words: t("publish-failed", { reason: answer.value.refusal ?? "" }),
          lines: data.lines ?? [],
        };
  }

  async function after() {
    working = started(t("publish-reading-again"));
    await load();
    await loadCard();
    working = null;
    busy = false;
  }

  function hear() {
    return (message: Parameters<typeof heard>[1]) => {
      if (working) working = heard(working, message);
    };
  }

  async function prepare() {
    if (!chosenRepository || !chosen || busy) return;
    busy = true;
    said = null;
    working = started(t("publish-preparing", { mod: chosen.mod }));
    told(
      await prepareMod(
        game.id,
        chosenRepository.repository,
        chosen.mod,
        build,
        hear(),
      ),
      t("publish-prepared", { mod: chosen.mod }),
    );
    await after();
  }

  /** The upload a card's press would ask for, if any: a new item, an update, or making it public. */
  function uploadKind(c: ModCard | null): "create" | "update" | null {
    if (!c || c.step === "fix") return null;
    if (!c.itemId) return "create";
    return c.due ? "update" : null;
  }

  function askUpload() {
    const kind = uploadKind(chosen);
    if (!uploads || !chosen || !kind || busy) return;
    asking = { kind, card: chosen, title: shown?.title ?? chosen.mod };
  }

  function askPublic() {
    if (!uploads || !chosen || busy || !chosen.itemId || chosen.due) return;
    if (chosen.visibility === "public") return;
    asking = {
      kind: "public",
      card: chosen,
      title: shown?.title ?? chosen.mod,
    };
  }

  function askUpdateAll() {
    if (!uploads || waiting === 0 || busy) return;
    asking = { kind: "update-all", count: waiting };
  }

  async function confirm() {
    if (!asking || !chosenRepository) return;
    const now = asking;
    if (now.kind === "public") {
      asking = { ...now, kind: "public-sure" };
      return;
    }
    asking = null;
    busy = true;
    said = null;
    if (now.kind === "update-all") {
      working = started(t("publish-updating-all"));
      told(
        await updateAll(game.id, chosenRepository.repository, via, hear()),
        t("publish-updated-all"),
      );
    } else {
      const kind = now.kind === "public-sure" ? "public" : now.kind;
      working = started(t("publish-uploading", { mod: now.card.mod }));
      told(
        await uploadMod(
          game.id,
          chosenRepository.repository,
          now.card.mod,
          kind,
          via,
          hear(),
        ),
        kind === "public"
          ? t("publish-made-public", { mod: now.card.mod })
          : t("publish-uploaded", { mod: now.card.mod }),
      );
    }
    await after();
  }

  async function readBack() {
    if (!chosenRepository || busy || !steamBack) return;
    busy = true;
    said = null;
    working = started(t("publish-reading-steam"));
    told(
      await pullFromSteam(game.id, chosenRepository.repository, hear()),
      t("publish-read-steam"),
    );
    await after();
  }

  async function openInSteam() {
    if (!shown?.itemId) return;
    const answer = await openItem(shown.itemId);
    if (answer.state === "failed")
      said = {
        ok: false,
        words: t("publish-failed", { reason: answer.failure.detail }),
        lines: [],
      };
  }

  /** Puts the keyboard on the confirmation when it opens, so it is read out and answered first. */
  function takeFocus(node: HTMLElement) {
    node.focus();
  }

  onMount(() => {
    void load();
    return register({
      scope: "publish",
      inDialog: false,
      run: {
        "publish.next-mod": () => stepMod(1),
        "publish.previous-mod": () => stepMod(-1),
        "publish.prepare": () => void prepare(),
        "publish.upload": askUpload,
        "publish.public": askPublic,
        "publish.read-back": () => void readBack(),
        "publish.update-all": askUpdateAll,
        "publish.open-steam": () => void openInSteam(),
      },
    });
  });
</script>

<div class="eyebrow accent">{t("publish-kicker")}</div>
<h1>{t("publish-title")}</h1>
<p class="lead">{t("publish-lead")}</p>

{#if reading.state === "reading"}
  <p class="muted">{t("publish-reading")}</p>
  <Placeholder shape="rows" />
{:else if reading.state === "browser"}
  <p class="muted">{t("publish-browser")}</p>
{:else if reading.state === "failed"}
  <FailurePanel failure={reading.failure} onretry={load} />
{:else if repositories.length === 0}
  <p class="lead">{t("publish-none", { game: game.name })}</p>
  <GuideLink entry="page-publish" words={t("publish-guide-link")} />
{:else}
  {#if repositories.length > 1}
    <div
      class="toggles"
      role="group"
      aria-label={t("publish-repository-label")}
    >
      {#each repositories as found (found.repository)}
        <button
          type="button"
          class="toggle"
          aria-pressed={chosenRepository?.repository === found.repository}
          onclick={() => setFocus({ repository: found.repository, mod: "" })}
          >{found.repository}</button
        >
      {/each}
    </div>
  {/if}

  <section class="strip" aria-labelledby="publish-sending">
    <h2 id="publish-sending">{t("publish-sending-title")}</h2>
    <div class="toggles" role="group" aria-label={t("publish-via-label")}>
      <button
        type="button"
        class="toggle"
        aria-pressed={via === "steam"}
        onclick={() => (via = "steam")}>{t("publish-via-steam")}</button
      >
      <button
        type="button"
        class="toggle"
        aria-pressed={via === "steamcmd"}
        onclick={() => (via = "steamcmd")}>{t("publish-via-steamcmd")}</button
      >
    </div>
    <p class="small muted">
      {via === "steam"
        ? t("publish-via-steam-how")
        : t("publish-via-steamcmd-how")}
    </p>
    {#if !uploads}
      <p class="small off">{t("publish-uploads-off")}</p>
    {/if}
    <div class="buttons">
      <button
        type="button"
        class="action"
        disabled={busy || !steamBack}
        onclick={readBack}>{t("publish-read-back")}</button
      >
      {#if uploads}
        <button
          type="button"
          class="action"
          disabled={busy || waiting === 0}
          onclick={askUpdateAll}
          >{t("publish-update-all", { count: waiting })}</button
        >
      {/if}
    </div>
    {#if !steamBack}
      <p class="small muted">{t("publish-steam-back-off")}</p>
    {/if}
  </section>

  {#if chosenRepository?.failure !== undefined}
    <p class="refused" role="status">
      {t("publish-repository-failed", {
        repository: chosenRepository.repository,
        reason: chosenRepository.failure,
      })}
    </p>
  {/if}

  <div aria-live="polite">
    {#if working}
      <ProgressBar progress={working} fallback={t("publish-working")} />
    {/if}
    {#if said}
      <div class={said.ok ? "said" : "said refused"} role="status">
        <p>{said.words}</p>
        {#if said.lines.length > 0}
          <details>
            <summary>{t("publish-lines", { count: said.lines.length })}</summary
            >
            <ul class="lines">
              {#each said.lines as line, index (index)}<li>{line}</li>{/each}
            </ul>
          </details>
        {/if}
      </div>
    {/if}
  </div>

  {#if asking}
    {@const now = asking}
    <div class="confirm" role="group" aria-label={t("publish-confirm-label")}>
      <p class="confirm-question" tabindex="-1" use:takeFocus>
        {#if now.kind === "update-all"}
          {t("publish-confirm-update-all", {
            count: now.count,
            via: senderWords,
          })}
        {:else if now.kind === "create"}
          {t("publish-confirm-create", {
            title: now.title,
            version: now.card.version ?? "",
            via: senderWords,
          })}
        {:else if now.kind === "update"}
          {t("publish-confirm-update", {
            title: now.title,
            version: now.card.version ?? "",
            item: now.card.itemId ?? "",
            visibility: t(VISIBILITY_WORDS[now.card.visibility ?? "private"]),
            via: senderWords,
          })}
        {:else if now.kind === "public"}
          {t("publish-confirm-public", { title: now.title })}
        {:else}
          {t("publish-confirm-public-sure", {
            title: now.title,
            version: now.card.version ?? "",
            item: now.card.itemId ?? "",
          })}
        {/if}
      </p>
      {#if now.kind !== "update-all" && now.card.blockers.length > 0}
        <p class="confirm-warning">
          {t("publish-confirm-blockers", {
            blockers: now.card.blockers.join("; "),
          })}
        </p>
      {/if}
      <div class="buttons">
        <button type="button" class="action strong" onclick={confirm}>
          {now.kind === "update-all"
            ? t("publish-yes-update-all")
            : now.kind === "create"
              ? t("publish-yes-create")
              : now.kind === "update"
                ? t("publish-yes-update")
                : now.kind === "public"
                  ? t("publish-yes-public-first")
                  : t("publish-yes-public")}
        </button>
        <button type="button" class="action" onclick={() => (asking = null)}
          >{t("publish-cancel")}</button
        >
      </div>
    </div>
  {/if}

  <div class="layout">
    <nav class="list" aria-label={t("publish-list-label")}>
      <ul>
        {#each cards as entry (entry.mod)}
          <li>
            <button
              type="button"
              class="entry"
              aria-pressed={chosen?.mod === entry.mod}
              onclick={() => choose(entry)}
            >
              <span class="title">{entry.mod}</span>
              <span class="small muted">
                {entry.itemId
                  ? t("publish-card-item", {
                      item: entry.itemId,
                      visibility: t(
                        VISIBILITY_WORDS[entry.visibility ?? "private"],
                      ),
                    })
                  : t("publish-card-not-on-steam")}
              </span>
              <span class="small">
                {t("publish-card-versions", {
                  here: entry.version ?? "?",
                  steam: entry.uploadedVersion ?? t("publish-card-none"),
                })}
              </span>
              <span class={`step step-${entry.step}`}
                >{t(STEP_WORDS[entry.step])}</span
              >
            </button>
          </li>
        {/each}
      </ul>
    </nav>

    {#if chosen}
      <section class="view" aria-labelledby="publish-mod-title">
        <h2 id="publish-mod-title">{shown?.title ?? chosen.mod}</h2>
        <p class="small muted">
          {t("publish-view-line", {
            mod: chosen.mod,
            version: chosen.version ?? "?",
            step: t(STEP_WORDS[chosen.step]),
          })}
        </p>
        {#if chosen.error}
          <p class="refused">
            {t("publish-not-ready", { reason: chosen.error })}
          </p>
        {/if}
        {#if chosen.blockers.length > 0}
          <p class="blockers-title">{t("publish-blockers")}</p>
          <ul class="blockers">
            {#each chosen.blockers as blocker (blocker)}<li>
                {blocker}
              </li>{/each}
          </ul>
        {/if}
        <div class="buttons">
          <button
            type="button"
            class="toggle"
            aria-pressed={build}
            onclick={() => (build = !build)}>{t("publish-build-first")}</button
          >
          <button type="button" class="action" disabled={busy} onclick={prepare}
            >{t("publish-prepare")}</button
          >
          {#if uploads && uploadKind(chosen)}
            <button
              type="button"
              class="action strong"
              disabled={busy}
              onclick={askUpload}
              >{uploadKind(chosen) === "create"
                ? t("publish-upload-private")
                : t("publish-send-update")}</button
            >
          {/if}
          {#if uploads && chosen.itemId && !chosen.due && chosen.visibility !== "public"}
            <button
              type="button"
              class="action strong"
              disabled={busy}
              onclick={askPublic}>{t("publish-make-public")}</button
            >
          {/if}
          {#if shown?.itemId}
            <button type="button" class="action" onclick={openInSteam}
              >{t("publish-open-steam")}</button
            >
          {/if}
        </div>

        {#if card.state === "reading"}
          <Placeholder shape="rows" rows={4} />
        {:else if card.state === "failed"}
          <FailurePanel failure={card.failure} onretry={loadCard} />
        {:else if shown && chosenRepository}
          <Tabs {tabs} id="publish" label={t("publish-tabs-label")}>
            {#snippet children(tab)}
              {#if tab === "note"}
                {@render notePart(shown)}
              {:else if tab === "steam"}
                {@render steamPart(shown)}
              {:else if tab === "history"}
                {@render historyPart(shown)}
              {:else}
                <PageEditor
                  game={game.id}
                  repository={chosenRepository.repository}
                  mod={chosen.mod}
                  onsaved={() => void loadCard()}
                />
              {/if}
            {/snippet}
          </Tabs>
        {/if}
      </section>
    {/if}
  </div>
{/if}
<p class="muted how">{t("publish-how")}</p>

{#snippet notePart(c: Card)}
  {#if c.error}
    <p class="refused">{t("publish-not-ready", { reason: c.error })}</p>
  {:else}
    <p class="small">
      {t("publish-note-covers", {
        versions: (c.changeNoteVersions ?? []).join(", "),
      })}
    </p>
    {#if (c.changeNoteOmitted ?? []).length > 0}
      <p class="small muted">
        {t("publish-note-omitted", {
          versions: (c.changeNoteOmitted ?? []).join(", "),
        })}
      </p>
    {/if}
    <pre class="note">{c.changeNote}</pre>
  {/if}
{/snippet}

{#snippet steamPart(c: Card)}
  <dl class="facts">
    <dt>{t("publish-fact-item")}</dt>
    <dd>{c.itemId ?? t("publish-card-not-on-steam")}</dd>
    <dt>{t("publish-fact-visibility")}</dt>
    <dd>
      {c.uploadedVisibility
        ? t(VISIBILITY_WORDS[c.uploadedVisibility])
        : t("publish-card-none")}
    </dd>
    <dt>{t("publish-fact-sent")}</dt>
    <dd>{c.uploadedVersion ?? t("publish-card-none")}</dd>
    <dt>{t("publish-fact-tags")}</dt>
    <dd>{(c.tags ?? []).join(", ") || t("publish-card-none")}</dd>
    <dt>{t("publish-fact-required")}</dt>
    <dd>
      {(c.requiredItems ?? [])
        .map((r) =>
          r.itemId
            ? `${r.name} (${r.itemId})`
            : t("publish-required-not-yet", { name: r.name }),
        )
        .join("; ") || t("publish-card-none")}
    </dd>
    <dt>{t("publish-fact-cover")}</dt>
    <dd>{c.preview ?? t("publish-card-none")}</dd>
    <dt>{t("publish-fact-hold")}</dt>
    <dd>{c.hold ?? t("publish-card-none")}</dd>
  </dl>
  {#if c.reminders.length > 0}
    <p class="blockers-title">{t("publish-reminders")}</p>
    <ul class="blockers">
      {#each c.reminders as reminder (reminder)}<li>{reminder}</li>{/each}
    </ul>
  {/if}
{/snippet}

{#snippet historyPart(c: Card)}
  {#if c.receipts.length === 0}
    <p class="muted">{t("publish-history-none")}</p>
  {:else}
    <table class="history">
      <thead>
        <tr>
          <th scope="col">{t("publish-history-when")}</th>
          <th scope="col">{t("publish-history-version")}</th>
          <th scope="col">{t("publish-history-how")}</th>
          <th scope="col">{t("publish-history-visibility")}</th>
          <th scope="col">{t("publish-history-status")}</th>
        </tr>
      </thead>
      <tbody>
        {#each c.receipts as receipt (receipt.folder)}
          <tr>
            <td>{receipt.startedAt ?? receipt.folder}</td>
            <td>{receipt.version ?? ""}</td>
            <td>
              {receipt.via === "steam"
                ? t("publish-via-steam")
                : t("publish-via-steamcmd")}
            </td>
            <td>
              {receipt.visibility
                ? t(VISIBILITY_WORDS[receipt.visibility])
                : ""}
            </td>
            <td>{receipt.status ?? ""}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
{/snippet}

<style>
  .strip {
    margin-block: 12px;
    padding: 12px 16px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  h2 {
    margin-bottom: 6px;
    font-family: var(--font-display);
    font-size: 1.375rem;
    font-weight: 600;
  }

  .buttons {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    margin-top: 10px;
  }

  .action.strong {
    border-width: 2px;
  }

  .off,
  .refused,
  .said.refused {
    color: var(--colour-risk);
  }

  .said {
    margin-block: 8px;
    color: var(--colour-success);
  }

  .said p {
    font-weight: 600;
  }

  .lines {
    margin: 4px 0 0;
    padding-inline-start: 20px;
    font-size: var(--type-small);
    color: var(--colour-text);
  }

  .confirm {
    margin-block: 10px;
    padding: 10px 14px;
    background: var(--colour-surface-soft);
    border: 2px solid var(--colour-accent);
    border-radius: 4px;
  }

  .confirm-question {
    margin: 0 0 6px;
    font-weight: 600;
    max-width: 80ch;
  }

  .confirm-warning {
    margin-block: 4px;
    font-size: var(--type-small);
  }

  .layout {
    display: grid;
    grid-template-columns: minmax(200px, 280px) minmax(0, 1fr);
    gap: 18px;
    align-items: start;
    margin-top: 12px;
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

  .step {
    font-size: var(--type-caption);
    color: var(--colour-accent);
  }

  .step-done {
    color: var(--colour-success);
  }

  .step-fix,
  .step-blocked {
    color: var(--colour-risk);
  }

  .blockers-title {
    margin-top: 6px;
    font-weight: 600;
  }

  .blockers {
    margin: 2px 0 0;
    padding-inline-start: 20px;
    font-size: var(--type-small);
  }

  .note {
    max-height: 60vh;
    overflow: auto;
    padding: 10px 12px;
    font-size: var(--type-small);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .facts {
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
    gap: 4px 14px;
  }

  .facts dt {
    font-weight: 600;
  }

  .facts dd {
    margin: 0;
    overflow-wrap: anywhere;
  }

  .history {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--type-small);
  }

  .history th,
  .history td {
    padding: 4px 8px;
    text-align: start;
    border-bottom: 1px solid var(--colour-line);
  }

  @media (max-width: 900px) {
    .layout {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
