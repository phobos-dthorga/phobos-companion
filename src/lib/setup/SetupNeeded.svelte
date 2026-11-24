<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import { goPage } from "../navigation/navigation.svelte";
  import { readSetup } from "./desktopClient";
  import { homeNeeds } from "./presentation";
  import { rememberSetup, setupSeen } from "./state.svelte";

  /**
   * Home's line while a program an everyday page uses is missing and not set aside (0.87.0; the owner's choice: "Settings tab +
   * Home line"). Read once a run of the program; the Setup tab keeps it current. git is said on every page, so not here too.
   */
  const needs = $derived(homeNeeds(setupSeen.rows ?? []));

  onMount(() => {
    if (setupSeen.rows !== null) return;
    void readSetup().then((answer) => {
      if (answer.state === "ready") rememberSetup(answer.setup.rows);
    });
  });
</script>

{#if needs.length > 0}
  <section class="panel" aria-labelledby="setup-needed-title">
    <h2 id="setup-needed-title">
      {t("setup-home-title", { count: needs.length })}
    </h2>
    <p>
      {t("setup-home-body", { names: needs.map((row) => row.name).join(", ") })}
    </p>
    <button
      type="button"
      class="action"
      onclick={() => goPage("settings", { panel: "setup" })}
      >{t("setup-home-open")}</button
    >
  </section>
{/if}
