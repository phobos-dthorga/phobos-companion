<script lang="ts">
  import NoteRow from "../home/NoteRow.svelte";
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import { go } from "../navigation/navigation.svelte";
  import { readPicks } from "./desktopClient";

  /** On Home (0.55.0): how many pictures and sounds wait for the owner's pick, leading to the Picks page. Nothing shows when none wait. */
  let { game }: { game: string } = $props();

  let waiting = $state(0);

  onMount(() => {
    void readPicks().then((answer) => {
      if (answer.state === "ready") waiting = answer.list.waiting;
    });
  });
</script>

{#if waiting > 0}
  <NoteRow title={t("picks-note-title")}>
    <p>{t("picks-waiting", { count: waiting })}</p>
    {#snippet actions()}
      <button
        type="button"
        class="action"
        onclick={() => go({ page: "picks", game, focus: {}, dialog: null })}
        >{t("picks-note-go")}</button
      >
    {/snippet}
  </NoteRow>
{/if}
