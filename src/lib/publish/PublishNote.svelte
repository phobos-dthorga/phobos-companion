<script lang="ts">
  import NoteRow from "../home/NoteRow.svelte";
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import { go } from "../navigation/navigation.svelte";
  import { latest, refreshIfStale } from "./latest.svelte";

  /**
   * On Home (0.69.0): how many of the game's Workshop items have a newer version than the one on Steam, leading to the Publish
   * page. Read quietly from the kit's `pending`, at most every half hour, as Home's other notes are; nothing shows when none wait.
   */
  let { game }: { game: string } = $props();

  onMount(() => void refreshIfStale(game));

  const waiting = $derived(latest.game === game ? latest.waiting : 0);
</script>

{#if waiting > 0}
  <NoteRow title={t("publish-note-title")}>
    <p>{t("publish-note-body", { count: waiting })}</p>
    {#snippet actions()}
      <button
        type="button"
        class="action"
        onclick={() => go({ page: "publish", game, focus: {}, dialog: null })}
        >{t("publish-note-go")}</button
      >
    {/snippet}
  </NoteRow>
{/if}
