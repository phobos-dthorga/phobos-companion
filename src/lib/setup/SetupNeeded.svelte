<script lang="ts">
  import NoteRow from "../home/NoteRow.svelte";
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import { goPage } from "../navigation/navigation.svelte";
  import { homeNeeds } from "./presentation";
  import { readSetupOnce, setupSeen } from "./state.svelte";

  /**
   * Home's line while a program an everyday page uses is missing and not set aside (0.87.0; the owner's choice: "Settings tab +
   * Home line"). Read once a run of the program; the Setup tab keeps it current. git is said on every page, so not here too.
   */
  const needs = $derived(homeNeeds(setupSeen.rows ?? []));

  onMount(readSetupOnce);
</script>

{#if needs.length > 0}
  <NoteRow title={t("setup-home-title", { count: needs.length })}>
    <p>
      {t("setup-home-body", { names: needs.map((row) => row.name).join(", ") })}
    </p>
    {#snippet actions()}
      <button
        type="button"
        class="action"
        onclick={() => goPage("settings", { panel: "setup" })}
        >{t("setup-home-open")}</button
      >
    {/snippet}
  </NoteRow>
{/if}
