<script lang="ts">
  import NoteRow from "../home/NoteRow.svelte";
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import { go } from "../navigation/navigation.svelte";
  import { readDecisions } from "./desktopClient";

  /** On Home (0.22.0): how many decisions wait for the owner's word, leading to the Decisions page. Nothing shows when none wait. */
  let { game }: { game: string } = $props();

  let waiting = $state(0);

  onMount(() => {
    void readDecisions().then((answer) => {
      if (answer.state === "ready") waiting = answer.list.waiting;
    });
  });
</script>

{#if waiting > 0}
  <NoteRow title={t("decisions-note-title")}>
    <p>{t("decisions-waiting", { count: waiting })}</p>
    {#snippet actions()}
      <button
        type="button"
        class="action"
        onclick={() => go({ page: "decisions", game, focus: {}, dialog: null })}
        >{t("decisions-note-go")}</button
      >
    {/snippet}
  </NoteRow>
{/if}
