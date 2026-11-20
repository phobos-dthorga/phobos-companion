<script lang="ts">
  import { here, setFocus } from "../navigation/navigation.svelte";
  import { reveal } from "../shell/reveal";
  import { untrack } from "svelte";
  import { onMount, tick } from "svelte";
  import type { GameHome } from "../home/types";
  import { t } from "../i18n/runtime";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import Placeholder from "../shell/Placeholder.svelte";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import { heard, started } from "../shell/progress";
  import type { Failure } from "../shell/types";
  import { pickPath, readSettings, saveSetting } from "./desktopClient";
  import {
    byGame,
    cleanPath,
    otherRepositories,
    sendable,
  } from "./presentation";
  import ShortcutsDialog from "../shortcuts/ShortcutsDialog.svelte";
  import RecordsPanel from "../records/RecordsPanel.svelte";
  import CleanupPanel from "../cleanup/CleanupPanel.svelte";
  import AddGamePanel from "../games/AddGamePanel.svelte";
  import ThemesPanel from "../theme/ThemesPanel.svelte";
  import type { Setting, SettingsReading } from "./types";

  /**
   * Every folder and file the tools read, for every game, with where each value comes from; and a way to change one for every
   * repository at once, in the central settings file. Nothing else is written: a repository's own settings stay as they are,
   * and the games list only gains an entry through Add a game from Steam (0.31.0), which `ongameadded` tells the window about.
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

  const groups = $derived(
    reading.state === "ready" ? byGame(reading.list.settings) : [],
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

  async function load() {
    reading = { state: "reading" };
    progress = started();
    reading = await readSettings((message) => {
      progress = heard(progress, message);
    });
  }

  async function edit(setting: Setting) {
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
    if (reading.state !== "ready") return;
    const setting = reading.list.settings.find((s) => s.key === key);
    if (setting) await browse(setting);
  }

  /** Opens one setting's box to type in, from elsewhere on the page (the records panel's Type a folder, 0.26.1). */
  async function editKey(key: string) {
    if (reading.state !== "ready") return;
    const setting = reading.list.settings.find((s) => s.key === key);
    if (!setting) return;
    await edit(setting);
    await reveal(`setting-${key}`);
    document.getElementById(`setting-input-${key}`)?.focus();
  }

  onMount(load);

  /** A setting the place names is scrolled to and outlined once the list is read. */
  const focusKey = $derived(here().focus.key ?? null);
  /** Home's note about the records backup leads to its panel (0.22.0). */
  const focusPanel = $derived(here().focus.panel ?? null);
  $effect(() => {
    if (focusPanel === "records")
      untrack(() => void reveal("settings-records"));
    if (focusPanel === "cleanup")
      untrack(() => void reveal("settings-cleanup"));
  });
  $effect(() => {
    if (focusKey && reading.state === "ready")
      untrack(() => void reveal(`setting-${focusKey}`));
  });
</script>

<div class="eyebrow accent">{t("settings-kicker")}</div>
<h1>{t("settings-title")}</h1>
<p class="lead">{t("settings-lead")}</p>

<section class="keyboard" aria-labelledby="settings-keyboard-title">
  <h2 id="settings-keyboard-title">{t("settings-keyboard-title")}</h2>
  <p class="small">{t("settings-keyboard-body")}</p>
  <button type="button" class="action" onclick={() => (editingShortcuts = true)}
    >{t("settings-keyboard-open")}</button
  >
</section>
<ThemesPanel />
<RecordsPanel
  {saved}
  onbrowse={(key) => void browseKey(key)}
  onchoose={(key) => void editKey(key)}
/>
<AddGamePanel
  taken={games.map((game) => game.id)}
  onchanged={() => {
    ongameadded();
    void load();
  }}
/>
<CleanupPanel />
{#if editingShortcuts}
  <ShortcutsDialog editable={true} onclose={() => (editingShortcuts = false)} />
{/if}

<div aria-live="polite">
  {#if told}
    <p class={told.ok ? "told" : "told refused"} role="status">{told.words}</p>
  {/if}
  {#if failure}
    <FailurePanel {failure} onretry={load} />
  {/if}
</div>

{#if reading.state === "reading"}
  <ProgressBar {progress} fallback={t("settings-reading")} />
  <Placeholder shape="rows" rows={5} />
{:else if reading.state === "browser"}
  <p class="muted">{t("settings-browser")}</p>
{:else if reading.state === "failed"}
  <FailurePanel failure={reading.failure} onretry={load} />
{:else}
  <p class="muted small where">
    {reading.list.central_exists
      ? t("settings-central", { path: reading.list.central_file })
      : t("settings-central-none", { path: reading.list.central_file })}
  </p>

  {#each groups as group (group.game ?? "")}
    <section
      class="group"
      aria-labelledby={`settings-group-${group.game ?? "all"}`}
    >
      <h2 id={`settings-group-${group.game ?? "all"}`}>
        {gameName(group.game)}
      </h2>
      <ul class="settings">
        {#each group.settings as setting (setting.key)}
          <li class="setting" id={`setting-${setting.key}`}>
            <h3>{setting.description}</h3>
            <p class="value">
              {#if setting.value}
                <code>{setting.value}</code>
              {:else}
                <span class="muted">{t("settings-value-none")}</span>
              {/if}
            </p>
            <p class="small">
              <span class="muted">{t("settings-from")}</span>
              {fromWords(setting)}
              {#if setting.value && setting.exists === false}
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
                  if (sendable(draft)) void save(setting.key, cleanPath(draft));
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
                  aria-label={t("settings-browse-for", { key: setting.key })}
                  disabled={saving}
                  onclick={() => browse(setting)}
                  >{setting.kind === "folder"
                    ? t("settings-browse-folder")
                    : t("settings-browse-file")}</button
                >
                <button
                  type="button"
                  class="action"
                  aria-label={t("settings-change-for", { key: setting.key })}
                  disabled={saving}
                  onclick={() => edit(setting)}>{t("settings-change")}</button
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
          </li>
        {/each}
      </ul>
    </section>
  {/each}
  <p class="muted how">{t("settings-how")}</p>
{/if}

<style>
  h2 {
    margin: 0 0 6px;
    font-family: var(--font-display);
    font-size: 1.375rem;
    font-weight: 600;
  }

  h3 {
    margin: 0 0 4px;
    font-size: var(--type-body);
    font-weight: 600;
  }

  .where {
    overflow-wrap: anywhere;
  }

  .told {
    padding: 8px 12px;
    border-inline-start: 3px solid var(--colour-success);
  }

  .told.refused {
    border-color: var(--colour-risk);
  }

  .group {
    margin-top: 16px;
  }

  .settings {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .setting {
    padding: 12px 16px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .setting p {
    margin: 0 0 4px;
    overflow-wrap: anywhere;
  }

  .value code {
    font-size: var(--type-small);
    color: var(--colour-observed);
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
    margin-block: 6px 18px;
    padding: 12px 16px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .keyboard p {
    margin: 0 0 8px;
  }
</style>
