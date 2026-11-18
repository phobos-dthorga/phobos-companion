<script lang="ts">
  import { tick } from "svelte";
  import { t } from "../i18n/runtime";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import WindowDialog from "../shell/WindowDialog.svelte";
  import type { Failure } from "../shell/types";
  import { action, SCOPES } from "./actions";
  import {
    keysNow,
    NOTHING_SAVED,
    refusal,
    withDefault,
    withKey,
    type Saved,
  } from "./bindings";
  import { actionsIn, keyOf, keyWords } from "./keys";
  import { keepShortcuts, shortcuts } from "./state.svelte";

  /**
   * Every keyboard shortcut, by where it works. With `editable`, each can be changed (press the new key), turned off or put back to
   * its default, and all of them turned off at once; every change is saved at once in the program's own folder. Without it, a list
   * to read (the "?" key opens that one).
   */
  let { editable, onclose }: { editable: boolean; onclose: () => void } =
    $props();

  let recording = $state<string | null>(null);
  let told = $state<{ ok: boolean; words: string } | null>(null);
  let failure = $state<Failure | null>(null);
  let saving = $state(false);

  const keys = $derived(keysNow(shortcuts.saved));

  function words(id: string) {
    return t(action(id)!.words);
  }

  async function keep(next: Saved, done: string) {
    saving = true;
    failure = null;
    const problem = await keepShortcuts(next);
    saving = false;
    if (problem) {
      failure = problem;
      told = null;
    } else {
      told = { ok: true, words: done };
    }
  }

  async function record(id: string) {
    recording = id;
    told = null;
    await tick();
    document.getElementById(`shortcut-record-${id}`)?.focus();
  }

  function heard(event: KeyboardEvent, id: string) {
    event.preventDefault();
    event.stopPropagation();
    if (event.key === "Escape") {
      recording = null;
      return;
    }
    const key = keyOf(event);
    if (!key) return;
    const why = refusal(id, key, shortcuts.saved);
    if (why?.reason === "reserved") {
      told = {
        ok: false,
        words: t("shortcuts-reserved", { key: keyWords(key) }),
      };
      return;
    }
    if (why?.reason === "taken") {
      told = {
        ok: false,
        words: t("shortcuts-taken", {
          key: keyWords(key),
          other: words(why.by),
        }),
      };
      return;
    }
    recording = null;
    void keep(
      withKey(shortcuts.saved, id, key),
      t("shortcuts-changed", { action: words(id), key: keyWords(key) }),
    );
  }
</script>

<WindowDialog
  kicker={t("shortcuts-kicker")}
  title={editable ? t("shortcuts-title-edit") : t("shortcuts-title")}
  closeLabel={t("shortcuts-close")}
  width={900}
  {onclose}
>
  <!-- The list scrolls; with nothing to press in it, the list itself takes the keyboard so it can be scrolled. -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div
    class="body"
    role="region"
    aria-label={t("shortcuts-list-label")}
    tabindex={editable ? undefined : 0}
  >
    <p class="small">
      {editable ? t("shortcuts-lead-edit") : t("shortcuts-lead")}
    </p>
    {#if shortcuts.readFailure}
      <p class="small told refused">{t("shortcuts-read-failed")}</p>
    {/if}
    <div aria-live="polite">
      {#if told}
        <p class={told.ok ? "told" : "told refused"} role="status">
          {told.words}
        </p>
      {/if}
      {#if failure}
        <FailurePanel {failure} onretry={() => (failure = null)} />
      {/if}
    </div>
    {#if editable}
      <div class="toggles">
        <button
          type="button"
          class="toggle"
          aria-pressed={shortcuts.saved.enabled}
          disabled={saving}
          onclick={() =>
            keep(
              { ...shortcuts.saved, enabled: !shortcuts.saved.enabled },
              shortcuts.saved.enabled
                ? t("shortcuts-turned-off")
                : t("shortcuts-turned-on"),
            )}>{t("shortcuts-enabled")}</button
        >
        <button
          type="button"
          class="action"
          disabled={saving || Object.keys(shortcuts.saved.keys).length === 0}
          onclick={() =>
            keep(
              { ...NOTHING_SAVED, enabled: shortcuts.saved.enabled },
              t("shortcuts-all-back"),
            )}>{t("shortcuts-reset-all")}</button
        >
      </div>
    {:else if !shortcuts.saved.enabled}
      <p class="told refused">{t("shortcuts-off-now")}</p>
    {/if}

    {#each SCOPES as { scope, words: scopeWords } (scope)}
      <section aria-labelledby={`shortcuts-scope-${scope}`}>
        <h3 id={`shortcuts-scope-${scope}`}>{t(scopeWords)}</h3>
        <ul class="rows">
          {#each actionsIn(scope) as item (item.id)}
            {@const key = keys.get(item.id) ?? null}
            <li class="row">
              <span class="what">{t(item.words)}</span>
              {#if recording === item.id}
                <button
                  type="button"
                  class="action recording"
                  id={`shortcut-record-${item.id}`}
                  onkeydown={(event) => heard(event, item.id)}
                  onblur={() => (recording = null)}
                  >{t("shortcuts-press-now")}</button
                >
              {:else}
                <kbd class:off={key === null}
                  >{key === null ? t("shortcuts-off") : keyWords(key)}</kbd
                >
              {/if}
              {#if editable && recording !== item.id}
                <span class="buttons">
                  <button
                    type="button"
                    class="action"
                    disabled={saving}
                    aria-label={t("shortcuts-change-for", {
                      action: t(item.words),
                    })}
                    onclick={() => record(item.id)}
                    >{t("shortcuts-change")}</button
                  >
                  {#if key !== null}
                    <button
                      type="button"
                      class="action"
                      disabled={saving}
                      aria-label={t("shortcuts-turn-off-for", {
                        action: t(item.words),
                      })}
                      onclick={() =>
                        keep(
                          withKey(shortcuts.saved, item.id, null),
                          t("shortcuts-one-off", { action: t(item.words) }),
                        )}>{t("shortcuts-turn-off")}</button
                    >
                  {/if}
                  {#if item.id in shortcuts.saved.keys}
                    <button
                      type="button"
                      class="action"
                      disabled={saving}
                      aria-label={t("shortcuts-default-for", {
                        action: t(item.words),
                      })}
                      onclick={() =>
                        keep(
                          withDefault(shortcuts.saved, item.id),
                          t("shortcuts-one-back", { action: t(item.words) }),
                        )}>{t("shortcuts-default")}</button
                    >
                  {/if}
                </span>
              {/if}
            </li>
          {/each}
        </ul>
      </section>
    {/each}
    <p class="muted small">{t("shortcuts-how")}</p>
  </div>
</WindowDialog>

<style>
  .body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding-inline-end: 6px;
  }

  h3 {
    margin: 14px 0 6px;
    font-size: var(--type-body);
    font-weight: 600;
  }

  .rows {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 14px;
    min-height: var(--control-min);
    padding: 4px 10px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .what {
    flex: 1 1 220px;
  }

  kbd {
    min-width: 3em;
    padding: 4px 10px;
    font: inherit;
    font-weight: 600;
    text-align: center;
    color: var(--colour-text);
    background: var(--colour-surface-soft);
    border: 1px solid var(--colour-line);
    border-bottom-width: 3px;
    border-radius: 4px;
  }

  kbd.off {
    font-weight: 400;
    color: var(--colour-text-muted);
  }

  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .recording {
    border-width: 2px;
  }

  .toggles {
    margin-block: 8px;
  }

  .told {
    padding: 6px 10px;
    border-inline-start: 3px solid var(--colour-success);
  }

  .told.refused {
    border-color: var(--colour-accent);
  }
</style>
