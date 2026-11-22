<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import { chooseOnline, readOnline } from "./desktopClient";
  import { kindKey } from "./presentation";
  import type { OnlineKind, OnlineStatus } from "./types";

  /** A kind's name, or its id where this window has no words for it yet. */
  function kindName(id: string): string {
    const key = kindKey(id, "name");
    return key ? t(key) : id;
  }

  function kindText(id: string, part: "body" | "loss"): string {
    const key = kindKey(id, part);
    return key ? t(key) : "";
  }

  /**
   * Going online, on the Settings page (0.61.0; `docs/online.md`): every kind of call the program makes to the internet by
   * itself, what each contacts, and its switch. Each starts on (the owner, 23 Nov 2026: "On for listed repositories with a setting
   * to disable otherwise, with applicable warnings of severe loss of functionality"): switching off a kind whose loss is severe
   * first says what stops working, and asks. The host keeps the choice.
   */
  let status = $state<OnlineStatus | null>(null);
  let unread = $state<string | null>(null);
  let busy = $state(false);
  /** The kind waiting for a yes before it is switched off. */
  let asking = $state<string | null>(null);
  let said = $state<{ ok: boolean; words: string } | null>(null);

  async function load() {
    const answer = await readOnline();
    if (answer.state === "ready") status = answer.status;
    else if (answer.state === "failed") unread = answer.failure.detail;
  }

  async function keep(kind: OnlineKind, on: boolean) {
    busy = true;
    said = null;
    asking = null;
    const answer = await chooseOnline(kind.id, on);
    busy = false;
    if (answer.state !== "ready") {
      said = {
        ok: false,
        words: t("online-failed", { reason: answer.failure.detail }),
      };
      return;
    }
    status = answer.status;
    said = {
      ok: true,
      words: t(on ? "online-kept-on" : "online-kept-off", {
        name: kindName(kind.id),
      }),
    };
  }

  function press(kind: OnlineKind, on: boolean) {
    if (on === kind.on) return;
    if (!on && kind.loss === "severe") {
      asking = kind.id;
      said = null;
      return;
    }
    void keep(kind, on);
  }

  onMount(load);
</script>

<section id="settings-online" class="online" aria-labelledby="online-title">
  <h2 id="online-title">{t("online-title")}</h2>
  <p class="small">{t("online-body")}</p>

  {#if unread}
    <p class="refused-line" role="status">
      {t("online-unread", { reason: unread })}
    </p>
  {:else if status}
    <ul class="kinds">
      {#each status.kinds as kind (kind.id)}
        <li>
          <h3>{kindName(kind.id)}</h3>
          <p class="small">{kindText(kind.id, "body")}</p>
          <p class="small muted">
            {t("online-contacts", { address: kind.contacts })}
          </p>
          <div class="toggles" role="group" aria-label={kindName(kind.id)}>
            <button
              type="button"
              class="toggle"
              aria-pressed={kind.on}
              disabled={busy}
              onclick={() => press(kind, true)}>{t("online-on")}</button
            >
            <button
              type="button"
              class="toggle"
              aria-pressed={!kind.on}
              disabled={busy}
              onclick={() => press(kind, false)}>{t("online-off")}</button
            >
          </div>
          {#if asking === kind.id}
            <div class="warning" role="alert">
              <p>
                <strong>{t("online-severe")}</strong>
                {kindText(kind.id, "loss")}
              </p>
              <div class="toggles">
                <button
                  type="button"
                  class="action"
                  disabled={busy}
                  onclick={() => void keep(kind, false)}
                  >{t("online-switch-off")}</button
                >
                <button
                  type="button"
                  class="action"
                  onclick={() => (asking = null)}>{t("online-keep-on")}</button
                >
              </div>
            </div>
          {:else if !kind.on}
            <p class="small off">{kindText(kind.id, "loss")}</p>
          {/if}
        </li>
      {/each}
    </ul>
  {:else}
    <p class="muted small">{t("online-browser")}</p>
  {/if}

  <div aria-live="polite">
    {#if said}
      <p class={said.ok ? "told" : "told refused"} role="status">
        {said.words}
      </p>
    {/if}
  </div>
</section>

<style>
  .online {
    margin-bottom: 20px;
    padding: 16px 20px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  h2 {
    margin-bottom: 6px;
    font-family: var(--font-display);
    font-size: 1.25rem;
    font-weight: 600;
  }

  h3 {
    margin: 0 0 4px;
    font-size: 1rem;
    font-weight: 600;
  }

  .kinds {
    margin: 8px 0 0;
    padding: 0;
    list-style: none;
  }

  .kinds li {
    padding: 10px 0;
    border-top: 1px solid var(--colour-line);
  }

  .warning {
    margin-top: 10px;
    padding: 8px 12px;
    border-inline-start: 3px solid var(--colour-risk);
    background: var(--shade-risk);
  }

  .off {
    margin-top: 6px;
    padding-inline-start: 8px;
    border-inline-start: 3px solid var(--colour-risk);
  }

  .refused-line {
    padding-inline-start: 8px;
    border-inline-start: 3px solid var(--colour-risk);
    overflow-wrap: anywhere;
  }

  .told {
    margin-top: 10px;
    padding: 6px 10px;
    border: 1px solid var(--colour-success);
    border-radius: 4px;
    overflow-wrap: anywhere;
  }

  .told.refused {
    border-color: var(--colour-risk);
  }
</style>
