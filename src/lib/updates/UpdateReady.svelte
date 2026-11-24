<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import { goPage } from "../navigation/navigation.svelte";
  import { readUpdates } from "./desktopClient";
  import type { UpdatesStatus } from "./types";

  /**
   * Home's line while a newer version waits to install (0.85.0; `docs/releases.md`, the owner's choice: "a line in About and on
   * Home"). Nothing shows otherwise.
   */
  let status = $state<UpdatesStatus | null>(null);

  onMount(() => {
    void readUpdates().then((answer) => {
      if (answer.state === "ready") status = answer.status;
    });
  });
</script>

{#if status?.state === "ready"}
  <section class="panel" aria-labelledby="update-ready-title">
    <h2 id="update-ready-title">
      {t("app-update-ready", { version: status.version })}
    </h2>
    <p>{t("app-update-ready-how")}</p>
    <button
      type="button"
      class="action"
      onclick={() => goPage("about", { tab: "version" })}
      >{t("app-update-see")}</button
    >
  </section>
{/if}
