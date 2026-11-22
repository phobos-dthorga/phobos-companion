<script lang="ts">
  import { t } from "../i18n/runtime";
  import { goPage } from "../navigation/navigation.svelte";
  import { formatDay, formatUnixWhen } from "../shell/dates";
  import { readNightly } from "./desktopClient";
  import { nightlyAsOf, watchFindings } from "./presentation";
  import type { NightlyAnswer } from "./types";

  /**
   * Home's "Their code changed" (0.63.0; `docs/online.md`, O3): what the nightly watch on GitHub's own machine found in the public
   * source of mods ours patch: each commit that touched a member our code names, before the Workshop build carries it. Read from
   * each repository's results branch while Nightly watch is on in Settings → Going online. Nothing shows when the watch found
   * nothing, or no repository of the game has a nightly watch.
   */
  let { game }: { game: string } = $props();

  const SHOWN = 10;

  let nightly = $state<NightlyAnswer | null>(null);

  $effect(() => {
    const asked = game;
    nightly = null;
    void readNightly(asked).then((answer) => {
      if (answer.state === "ready" && asked === game) nightly = answer.nightly;
    });
  });

  const found = $derived(nightly ? watchFindings(nightly) : []);
  const asOf = $derived(nightly ? nightlyAsOf(nightly) : null);
</script>

{#if found.length > 0}
  <section class="panel" aria-labelledby="their-code-title">
    <h2 id="their-code-title">{t("nightly-title")}</h2>
    <p>{t("nightly-body", { count: found.length })}</p>
    <ul class="findings">
      {#each found.slice(0, SHOWN) as finding (`${finding.repository}|${finding.commit}|${finding.member}`)}
        <li>
          <div>
            <strong>{finding.mod}</strong>
            <code>{finding.member}</code>
          </div>
          <div class="muted small">
            {t("nightly-commit", {
              commit: finding.commit,
              when: formatDay(finding.date),
              subject: finding.subject ?? "",
            })}
          </div>
          {#if finding.ours}
            <div class="small">
              {t("nightly-ours", { where: finding.ours })}
            </div>
          {/if}
        </li>
      {/each}
    </ul>
    {#if found.length > SHOWN}
      <p class="muted small">
        {t("nightly-more", { count: found.length - SHOWN })}
      </p>
    {/if}
    {#if asOf !== null}
      <p class="small as-of" role="status">
        {t("nightly-as-of", { when: formatUnixWhen(asOf) })}
      </p>
    {/if}
    <p class="muted small">{t("nightly-limit")}</p>
    <button
      type="button"
      class="action"
      onclick={() => goPage("settings", { panel: "online" })}
      >{t("lights-settings")}</button
    >
  </section>
{/if}

<style>
  .panel {
    margin-bottom: 16px;
    padding: 20px 24px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-inline-start: 3px solid var(--colour-observed);
    border-radius: 4px;
  }

  h2 {
    margin-bottom: 8px;
    font-family: var(--font-display);
    font-size: 1.375rem;
    font-weight: 600;
  }

  .findings {
    margin: 0 0 10px;
    padding: 0;
    list-style: none;
  }

  .findings li {
    padding: 6px 0;
    border-bottom: 1px solid var(--colour-line);
  }

  code {
    margin-inline-start: 8px;
    overflow-wrap: anywhere;
  }

  .as-of {
    padding-inline-start: 8px;
    border-inline-start: 3px solid var(--colour-observed);
  }
</style>
