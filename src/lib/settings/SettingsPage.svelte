<script lang="ts">
  import { goTab, here, setFocus } from "../navigation/navigation.svelte";
  import { reveal } from "../shell/reveal";
  import { untrack } from "svelte";
  import { onMount, tick } from "svelte";
  import type { GameHome } from "../home/types";
  import { t } from "../i18n/runtime";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import Placeholder from "../shell/Placeholder.svelte";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import Tabs from "../shell/Tabs.svelte";
  import SetupPanel from "../setup/SetupPanel.svelte";
  import { tabsOf } from "../shell/tabs";
  import { heard, started } from "../shell/progress";
  import type { Failure } from "../shell/types";
  import { pickPath, readSettings, saveSetting } from "./desktopClient";
  import {
    byGame,
    cleanPath,
    needsYou,
    otherRepositories,
    sendable,
    settingName,
    shown,
  } from "./presentation";
  import ShortcutsDialog from "../shortcuts/ShortcutsDialog.svelte";
  import RecordsPanel from "../records/RecordsPanel.svelte";
  import CleanupPanel from "../cleanup/CleanupPanel.svelte";
  import AddGamePanel from "../games/AddGamePanel.svelte";
  import ThemesPanel from "../theme/ThemesPanel.svelte";
  import AgentsPanel from "../agents/AgentsPanel.svelte";
  import PublishingPanel from "../publish/PublishingPanel.svelte";
  import OnlinePanel from "../online/OnlinePanel.svelte";
  import AiProgramsPanel from "../ai/AiProgramsPanel.svelte";
  import AiServicesPanel from "../ai/AiServicesPanel.svelte";
  import ChatPanel from "../chat/ChatPanel.svelte";
  import type { Setting, SettingsReading } from "./types";

  /**
   * Every folder and file the tools read, for every game, with where each value comes from; and a way to change one for every
   * repository at once, in the central settings file. Nothing else is written: a repository's own settings stay as they are,
   * and the games list only gains an entry through Add a game from Steam (0.31.0), which `ongameadded` tells the window about.
   * Since 0.66.0 the page's parts are tabs (the owner's choice of 23 Nov 2026), and each setting is one line that opens.
   */
  let {
    games,
    ongameadded = () => {},
  }: { games: GameHome[]; ongameadded?: () => void } = $props();

  let reading = $state<SettingsReading>({ state: "reading" });
  let progress = $state(started());
  let editing = $state<string | null>(null);
  let draft = $state("");
  let saving = $state(false);
  let told = $state<{ ok: boolean; words: string } | null>(null);
  let failure = $state<Failure | null>(null);
  let editingShortcuts = $state(false);
  /** Counts the settings saved, so the records panel reads its folder again after each (0.26.1). */
  let saved = $state(0);
  /** The settings open to show their detail and buttons (0.66.0). */
  let opened = $state<string[]>([]);

  const settings = $derived(
    reading.state === "ready" ? reading.list.settings : [],
  );
  const needing = $derived(settings.filter(needsYou).length);
  /** Which settings show: the place's `show` focus key, all of them by default. */
  const show = $derived(here().focus.show ?? "all");
  const groups = $derived(byGame(shown(settings, show)));

  /** The page's parts (shell/tabs.ts), Folders and files saying how many settings need you. */
  const tabs = $derived(
    tabsOf("settings", {
      folders: needing > 0 ? t("settings-tab-needs", { count: needing }) : null,
    }),
  );

  /** The choices above the list: every one that has something to show. */
  const choices = $derived(
    [
      { id: "all", words: t("settings-show-all"), count: settings.length },
      {
        id: "every",
        words: t("settings-group-all"),
        count: shown(settings, "every").length,
      },
      ...byGame(settings)
        .filter((group) => group.game !== null)
        .map((group) => ({
          id: group.game as string,
          words: gameName(group.game),
          count: group.settings.length,
        })),
      { id: "needs", words: t("settings-show-needs"), count: needing },
    ].filter((choice) => choice.id === "all" || choice.count > 0),
  );

  function gameName(id: string | null) {
    if (id === null) return t("settings-group-all");
    return games.find((game) => game.id === id)?.name ?? id;
  }

  function fromWords(setting: Setting) {
    if (setting.layer === "environment")
      return t("settings-from-environment", { env: setting.env ?? "" });
    if (setting.layer === "repository")
      return t("settings-from-repository", {
        repository: setting.repository ?? "",
      });
    if (setting.layer === "central") return t("settings-from-central");
    return t("settings-from-default");
  }

  function toggle(key: string) {
    opened = opened.includes(key)
      ? opened.filter((k) => k !== key)
      : [...opened, key];
  }

  async function load() {
    reading = { state: "reading" };
    progress = started();
    reading = await readSettings((message) => {
      progress = heard(progress, message);
    });
  }

  async function edit(setting: Setting) {
    if (!opened.includes(setting.key)) opened = [...opened, setting.key];
    editing = setting.key;
    draft = setting.central ?? setting.value ?? "";
    told = null;
    await tick();
    document.getElementById(`setting-input-${setting.key}`)?.focus();
  }

  async function save(key: string, value: string | null) {
    saving = true;
    told = null;
    failure = null;
    const done = await saveSetting(key, value);
    saving = false;
    if (done.state === "failed") {
      failure = done.failure;
      return;
    }
    if (!done.result.ok) {
      told = {
        ok: false,
        words: t("settings-refused", { reason: done.result.refusal ?? "" }),
      };
      return;
    }
    told = {
      ok: true,
      words:
        value === null
          ? t("settings-cleared", { key })
          : t("settings-saved", { key }),
    };
    editing = null;
    saved += 1;
    await load();
  }

  /**
   * Windows' own picker for a folder or file setting (0.29.0), opened where its value is. What is chosen is saved at once, through
   * the same save as a typed path, so the kit still checks it; closing the picker changes nothing, and says so.
   */
  async function browse(setting: Setting) {
    told = null;
    failure = null;
    const picked = await pickPath(
      setting.kind,
      setting.kind === "folder"
        ? t("settings-pick-folder-title", { what: setting.description })
        : t("settings-pick-file-title", { what: setting.description }),
      setting.value,
    );
    if (picked.state === "failed") {
      failure = picked.failure;
      return;
    }
    if (picked.state === "closed") {
      told = {
        ok: true,
        words: t("settings-pick-closed", { key: setting.key }),
      };
      return;
    }
    await save(setting.key, cleanPath(picked.path));
  }

  /** Opens the picker for one setting from elsewhere on the page (the records panel's Choose the folder, 0.29.0). */
  async function browseKey(key: string) {
    const setting = settings.find((s) => s.key === key);
    if (setting) await browse(setting);
  }

  /**
   * Opens one setting's box to type in, from elsewhere on the page (the records panel's Type a folder, 0.26.1). The setting is on
   * Folders and files since 0.66.0, so that tab opens first, showing every setting.
   */
  async function editKey(key: string) {
    const setting = settings.find((s) => s.key === key);
    if (!setting) return;
    goTab("folders");
    setFocus({ show: "all" });
    await tick();
    await edit(setting);
    await reveal(`setting-${key}`);
    document.getElementById(`setting-input-${key}`)?.focus();
  }

  onMount(load);

  /**
   * A panel the place names (Home's notes, the Guide's Take me there, Home's gate lights and About): its tab shows (Tabs reads the
   * same `panel`), and the panel is scrolled to and outlined, as before 0.66.0.
   */
  const focusPanel = $derived(here().focus.panel ?? null);
  $effect(() => {
    if (focusPanel) untrack(() => void reveal(`settings-${focusPanel}`));
  });

  /** A setting the place names is opened, scrolled to and outlined once the list is read. */
  const focusKey = $derived(here().focus.key ?? null);
  $effect(() => {
    if (focusKey && reading.state === "ready")
      untrack(() => {
        if (!opened.includes(focusKey)) opened = [...opened, focusKey];
        void reveal(`setting-${focusKey}`);
      });
  });
</script>

<div class="eyebrow accent">{t("settings-kicker")}</div>
<h1>{t("settings-title")}</h1>
<p class="lead">{t("settings-lead-short")}</p>

<div aria-live="polite">
  {#if told}
    <p class={told.ok ? "told" : "told refused"} role="status">{told.words}</p>
  {/if}
  {#if failure}
    <FailurePanel {failure} onretry={load} />
  {/if}
</div>

<Tabs {tabs} id="settings" label={t("settings-tabs-label")}>
  {#snippet children(tab)}
    {#if tab === "look"}
      <ThemesPanel />
      <section class="keyboard" aria-labelledby="settings-keyboard-title">
        <h2 id="settings-keyboard-title">{t("settings-keyboard-title")}</h2>
        <p class="small">{t("settings-keyboard-body")}</p>
        <button
          type="button"
          class="action"
          onclick={() => (editingShortcuts = true)}
          >{t("settings-keyboard-open")}</button
        >
      </section>
    {:else if tab === "games"}
      <AddGamePanel
        taken={games.map((game) => game.id)}
        onchanged={() => {
          ongameadded();
          void load();
        }}
      />
    {:else if tab === "setup"}
      <SetupPanel />
    {:else if tab === "online"}
      <OnlinePanel />
    {:else if tab === "backups"}
      <RecordsPanel
        {saved}
        onbrowse={(key) => void browseKey(key)}
        onchoose={(key) => void editKey(key)}
      />
      <CleanupPanel />
    {:else if tab === "agents"}
      <AgentsPanel />
    {:else if tab === "publishing"}
      <PublishingPanel />
    {:else if tab === "ai"}
      <AiServicesPanel />
      <AiProgramsPanel />
      <ChatPanel />
    {:else}
      {@render folders()}
    {/if}
  {/snippet}
</Tabs>

{#if editingShortcuts}
  <ShortcutsDialog editable={true} onclose={() => (editingShortcuts = false)} />
{/if}

{#snippet folders()}
  <p class="small">{t("settings-lead")}</p>
  {#if reading.state === "reading"}
    <ProgressBar {progress} fallback={t("settings-reading")} />
    <Placeholder shape="rows" rows={5} />
  {:else if reading.state === "browser"}
    <p class="muted">{t("settings-browser")}</p>
  {:else if reading.state === "failed"}
    <FailurePanel failure={reading.failure} onretry={load} />
  {:else}
    <div
      class="choices toggles"
      role="group"
      aria-label={t("settings-show-label")}
    >
      {#each choices as choice (choice.id)}
        <button
          type="button"
          class="toggle"
          aria-pressed={show === choice.id}
          onclick={() => setFocus({ show: choice.id })}
          >{choice.words} <span class="number">{choice.count}</span></button
        >
      {/each}
    </div>

    {#if groups.length === 0}
      <p class="muted">{t("settings-show-none")}</p>
    {/if}

    {#each groups as group (group.game ?? "")}
      <section
        class="group"
        aria-labelledby={`settings-group-${group.game ?? "all"}`}
      >
        <h2 class="group-name" id={`settings-group-${group.game ?? "all"}`}>
          {gameName(group.game)}
        </h2>
        <ul class="settings">
          {#each group.settings as setting (setting.key)}
            {@const open = opened.includes(setting.key)}
            <li class="setting" id={`setting-${setting.key}`}>
              <button
                type="button"
                class="line"
                aria-expanded={open}
                aria-controls={`setting-detail-${setting.key}`}
                onclick={() => toggle(setting.key)}
              >
                <span class="tick" aria-hidden="true">{open ? "▾" : "▸"}</span>
                <span class="what">
                  {settingName(setting)}
                  {#if needsYou(setting)}
                    <span class="missing">· {t("settings-not-here")}</span>
                  {/if}
                </span>
                <span class="value">
                  {#if setting.value}
                    <code>{setting.value}</code>
                  {:else}
                    <span class="muted">{t("settings-value-unset")}</span>
                  {/if}
                </span>
                <span class="from">{fromWords(setting)}</span>
              </button>

              {#if open}
                <div class="detail" id={`setting-detail-${setting.key}`}>
                  {#if setting.name}<p>{setting.description}</p>{/if}
                  <p class="full">
                    {#if setting.value}
                      <code>{setting.value}</code>
                    {:else}
                      <span class="muted">{t("settings-value-none")}</span>
                    {/if}
                  </p>
                  <p class="small">
                    <span class="muted">{t("settings-from")}</span>
                    {fromWords(setting)}
                    {#if needsYou(setting)}
                      <span class="missing">· {t("settings-missing")}</span>
                    {/if}
                  </p>
                  {#if setting.layer === "environment"}
                    <p class="muted small">{t("settings-env-wins")}</p>
                  {/if}
                  {#each otherRepositories(setting) as own (own.repository)}
                    <p class="muted small">
                      {t("settings-overridden", {
                        repository: own.repository,
                        value: own.value,
                      })}
                    </p>
                  {/each}
                  <p class="muted small">
                    {t("settings-key", { key: setting.key })}
                    {#if setting.default}· {t("settings-default", {
                        value: setting.default,
                      })}{/if}
                    {#if setting.central}· {t("settings-central-value", {
                        value: setting.central,
                      })}{/if}
                  </p>

                  {#if editing === setting.key}
                    <form
                      class="edit"
                      onsubmit={(event) => {
                        event.preventDefault();
                        if (sendable(draft))
                          void save(setting.key, cleanPath(draft));
                      }}
                    >
                      <label for={`setting-input-${setting.key}`}
                        >{t("settings-new-value", { key: setting.key })}</label
                      >
                      <input
                        id={`setting-input-${setting.key}`}
                        type="text"
                        bind:value={draft}
                        spellcheck="false"
                        autocomplete="off"
                      />
                      <div class="buttons">
                        <button
                          type="submit"
                          class="action"
                          disabled={saving || !sendable(draft)}
                        >
                          {saving ? t("settings-saving") : t("settings-save")}
                        </button>
                        <button
                          type="button"
                          class="action"
                          disabled={saving}
                          onclick={() => (editing = null)}
                        >
                          {t("settings-cancel")}
                        </button>
                      </div>
                    </form>
                  {:else}
                    <div class="buttons">
                      <button
                        type="button"
                        class="action"
                        aria-label={t("settings-browse-for", {
                          key: setting.key,
                        })}
                        disabled={saving}
                        onclick={() => browse(setting)}
                        >{setting.kind === "folder"
                          ? t("settings-browse-folder")
                          : t("settings-browse-file")}</button
                      >
                      <button
                        type="button"
                        class="action"
                        aria-label={t("settings-change-for", {
                          key: setting.key,
                        })}
                        disabled={saving}
                        onclick={() => edit(setting)}
                        >{t("settings-change")}</button
                      >
                      {#if setting.central}
                        <button
                          type="button"
                          class="action"
                          aria-label={t("settings-use-default-for", {
                            key: setting.key,
                          })}
                          disabled={saving}
                          onclick={() => save(setting.key, null)}
                          >{t("settings-use-default")}</button
                        >
                      {/if}
                    </div>
                  {/if}
                </div>
              {/if}
            </li>
          {/each}
        </ul>
      </section>
    {/each}

    <p class="muted small where">
      {reading.list.central_exists
        ? t("settings-central", { path: reading.list.central_file })
        : t("settings-central-none", { path: reading.list.central_file })}
    </p>
    <p class="muted how">{t("settings-how")}</p>
  {/if}
{/snippet}

<style>
  h2 {
    margin: 0 0 6px;
    font-family: var(--font-display);
    font-size: 1.375rem;
    font-weight: 600;
  }

  .where {
    margin-top: 16px;
    overflow-wrap: anywhere;
  }

  .told {
    padding: 8px 12px;
    border-inline-start: 3px solid var(--colour-success);
  }

  .told.refused {
    border-color: var(--colour-risk);
  }

  .choices {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-block: 12px 4px;
  }

  .number {
    font-variant-numeric: tabular-nums;
    color: var(--colour-text-muted);
  }

  .group {
    margin-top: 16px;
  }

  .group-name {
    margin-bottom: 6px;
    font-family: var(--font-body);
    font-size: var(--type-caption);
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--colour-text-muted);
  }

  .settings {
    margin: 0;
    padding: 0;
    list-style: none;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .setting + .setting {
    border-top: 1px solid var(--colour-line);
  }

  /* One line for each setting (0.66.0): its few words, its value, and where the value comes from. */
  .line {
    display: grid;
    grid-template-columns: 16px minmax(0, 1.1fr) minmax(0, 1.4fr) auto;
    align-items: center;
    gap: 12px;
    width: 100%;
    min-height: var(--control-min);
    padding: 4px 14px;
    font: inherit;
    text-align: start;
    color: var(--colour-text);
    background: transparent;
    border: 0;
    cursor: pointer;
  }

  .line:hover {
    background: var(--colour-surface-soft);
  }

  .tick {
    font-size: var(--type-caption);
    color: var(--colour-text-muted);
  }

  .value {
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .from {
    font-size: var(--type-caption);
    color: var(--colour-text-muted);
    white-space: nowrap;
  }

  code {
    font-size: var(--type-small);
    color: var(--colour-observed);
  }

  .detail {
    padding: 4px 14px 14px 42px;
  }

  .detail p {
    margin: 0 0 4px;
    overflow-wrap: anywhere;
  }

  .missing {
    color: var(--colour-accent);
  }

  .edit {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 8px;
  }

  .edit label {
    font-size: var(--type-small);
  }

  .edit input {
    min-height: var(--control-min);
    padding-inline: 10px;
    font: inherit;
    color: var(--colour-text);
    background: var(--colour-canvas);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 6px;
  }

  .keyboard {
    margin-block: 18px;
    padding: 12px 16px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .keyboard p {
    margin: 0 0 8px;
  }

  @media (max-width: 760px) {
    .line {
      grid-template-columns: 16px minmax(0, 1fr);
    }

    .value,
    .from {
      grid-column: 2;
    }
  }
</style>
