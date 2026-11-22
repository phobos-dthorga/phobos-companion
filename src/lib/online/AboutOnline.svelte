<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import { goPage } from "../navigation/navigation.svelte";
  import { readOnline } from "./desktopClient";
  import { kindKey } from "./presentation";
  import type { OnlineStatus } from "./types";

  function kindName(id: string): string {
    const key = kindKey(id, "name");
    return key ? t(key) : id;
  }

  /**
   * On About (0.61.0; the release audit's C3): what the Companion asks the internet, said where a person would look. The kinds and
   * their switches come from the host, the same list Settings → Going online shows.
   */
  let status = $state<OnlineStatus | null>(null);

  onMount(async () => {
    const answer = await readOnline();
    if (answer.state === "ready") status = answer.status;
  });
</script>

<section aria-labelledby="about-online">
  <h2 id="about-online">{t("about-online-title")}</h2>
  <p>{t("about-online-body")}</p>
  {#if status}
    <ul>
      {#each status.kinds as kind (kind.id)}
        <li>
          {t("about-online-kind", {
            name: kindName(kind.id),
            address: kind.contacts,
            state: t(kind.on ? "online-on" : "online-off"),
          })}
        </li>
      {/each}
    </ul>
  {/if}
  <p class="small muted">{t("about-online-steam")}</p>
  <button
    type="button"
    class="action"
    onclick={() => goPage("settings", { panel: "online" })}
    >{t("about-online-change")}</button
  >
</section>
