<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import { goPage } from "../navigation/navigation.svelte";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import { formatUnixWhen } from "../shell/dates";
  import { checkUpdates, installUpdate, readUpdates } from "./desktopClient";
  import { busy, megabytes, percent, releaseDay } from "./presentation";
  import type { UpdatesReading } from "./types";

  /**
   * Updates from GitHub, on About's Version tab (0.85.0; `docs/releases.md`, O1; the owner's "auto-updater", 25 Nov 2026): how
   * the updater stands. A newer published version is fetched by itself and installs when the Companion closes; Install now does
   * it at once and opens the new version. Presentation only: the host decides when to look and installs.
   */
  let reading = $state<UpdatesReading>({ state: "reading" });
  let said = $state<string | null>(null);
  let again: ReturnType<typeof setTimeout> | undefined;

  async function load() {
    clearTimeout(again);
    reading = await readUpdates();
    if (reading.state === "ready" && busy(reading.status))
      again = setTimeout(() => void load(), 1000);
  }

  async function check() {
    said = null;
    const answer = await checkUpdates();
    if (answer.state === "failed")
      said = t("app-update-failed-press", { reason: answer.failure.detail });
    await load();
  }

  async function install() {
    said = t("app-update-installing");
    const answer = await installUpdate();
    if (answer.state === "failed")
      said = t("app-update-failed-press", { reason: answer.failure.detail });
  }

  onMount(load);
  onDestroy(() => clearTimeout(again));
</script>

<section class="updates" aria-labelledby="app-update-title">
  <h2 id="app-update-title">{t("app-update-title")}</h2>
  {#if reading.state === "browser"}
    <p class="muted">{t("app-update-browser")}</p>
  {:else if reading.state === "failed"}
    <FailurePanel failure={reading.failure} onretry={load} />
  {:else if reading.state === "ready"}
    {@const status = reading.status}
    {#if status.state === "off"}
      <p>{t("app-update-off")}</p>
      <button
        type="button"
        class="action"
        onclick={() => goPage("settings", { panel: "online" })}
        >{t("app-update-open-online")}</button
      >
    {:else if status.state === "not-set-up"}
      <p>{t("app-update-not-set-up")}</p>
    {:else if status.state === "elsewhere"}
      <p>{t("app-update-elsewhere")}</p>
    {:else if status.state === "waiting" || status.state === "checking"}
      <p role="status">{t("app-update-checking")}</p>
    {:else if status.state === "current"}
      <p>
        {t("app-update-current", { when: formatUnixWhen(status.checked) })}
      </p>
      <button type="button" class="action" onclick={() => void check()}
        >{t("app-update-check")}</button
      >
    {:else if status.state === "fetching"}
      {@const done = percent(status.got, status.total)}
      <p role="status">
        {done === null
          ? t("app-update-fetching", {
              version: status.version,
              got: megabytes(status.got),
            })
          : t("app-update-fetching-percent", {
              version: status.version,
              percent: done,
            })}
      </p>
    {:else if status.state === "ready"}
      {@const day = releaseDay(status.date)}
      <div class="ready">
        <p>
          <strong>{t("app-update-ready", { version: status.version })}</strong>
          {#if day}<span class="muted">{day}</span>{/if}
        </p>
        <p>{t("app-update-ready-how")}</p>
        <button type="button" class="action" onclick={() => void install()}
          >{t("app-update-install-now")}</button
        >
        {#if status.notes}
          <details>
            <summary
              >{t("app-update-notes", { version: status.version })}</summary
            >
            <div class="notes">{status.notes}</div>
          </details>
        {/if}
      </div>
    {:else}
      <p class="refused-line">
        {t("app-update-failed", { reason: status.reason })}
      </p>
      <button type="button" class="action" onclick={() => void check()}
        >{t("app-update-check-again")}</button
      >
    {/if}
  {/if}
  <div aria-live="polite">
    {#if said}<p class="small">{said}</p>{/if}
  </div>
</section>

<style>
  .updates {
    max-width: 90ch;
    margin-top: 20px;
    padding: 12px 16px;
    background: var(--colour-surface);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  h2 {
    margin: 0 0 8px;
    font-family: var(--font-display);
    font-size: 1.25rem;
    font-weight: 600;
  }

  p {
    margin: 0 0 6px;
  }

  .ready {
    padding-inline-start: 10px;
    border-inline-start: 3px solid var(--colour-accent);
  }

  /* The release's notes are its changelog section as text, never drawn as markup. */
  .notes {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font-size: var(--type-small);
  }

  details summary {
    min-height: 44px;
    display: flex;
    align-items: center;
    cursor: pointer;
  }

  .refused-line {
    padding-inline-start: 8px;
    border-inline-start: 3px solid var(--colour-risk);
    overflow-wrap: anywhere;
  }
</style>
