<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import { goPage } from "../navigation/navigation.svelte";
  import { pageNeeds } from "./presentation";
  import { readSetupOnce, setupSeen } from "./state.svelte";

  /**
   * A page's line while a program it uses is missing (0.88.0; the owner's choice "Say it on the page"): what it is, what it is
   * used for, and a button to Settings → Setup, instead of the page failing in a tool's words. Which page uses which program is
   * `config/setup-pages.json`. Nothing shows while everything is here.
   */
  let { page, game }: { page: string; game: string | null } = $props();

  const needs = $derived(pageNeeds(setupSeen.rows ?? [], page, game));

  onMount(readSetupOnce);
</script>

{#if needs.length > 0}
  <section class="page-needs" aria-labelledby="page-needs-title">
    <h2 id="page-needs-title">
      {t("setup-page-needs", { count: needs.length })}
    </h2>
    <ul>
      {#each needs as row (row.key)}
        <li>
          {t("setup-page-needs-row", { name: row.name, what: row.neededBy })}
        </li>
      {/each}
    </ul>
    <button
      type="button"
      class="action"
      onclick={() => goPage("settings", { panel: "setup" })}
      >{t("setup-page-needs-open")}</button
    >
  </section>
{/if}

<style>
  .page-needs {
    margin-bottom: 14px;
    padding: 8px 12px;
    border-inline-start: 3px solid var(--colour-risk);
    background: var(--colour-surface-raised);
  }

  h2 {
    margin: 0 0 4px;
    font-size: var(--type-body);
    font-weight: 600;
  }

  ul {
    margin: 0 0 8px;
    padding-inline-start: 20px;
  }
</style>
