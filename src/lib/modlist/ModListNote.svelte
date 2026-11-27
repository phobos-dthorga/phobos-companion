<script lang="ts">
  import NoteRow from "../home/NoteRow.svelte";
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import { goPage } from "../navigation/navigation.svelte";
  import { latest, refreshIfStale } from "./latest.svelte";
  import { breakage, worthMentioning } from "./presentation";

  /**
   * On Home (0.45.0): a note when a game's list of active mods has problems or warnings, leading to the Mod list page. The check
   * is read quietly, without asking Steam, at most every half hour; nothing shows when the list is fine, or when the tools cannot
   * read this game's list yet.
   */
  let { game }: { game: string } = $props();

  onMount(() => void refreshIfStale(game));

  const count = $derived(worthMentioning(latest.checks[game] ?? null));
  /** New errors in the first game run after the last change (0.56.0). */
  const broke = $derived(breakage(latest.checks[game] ?? null));
</script>

{#if count !== null || broke !== null}
  <NoteRow title={t("modlist-note-title")} attention>
    {#if broke !== null}
      <p class="broke">{t("modlist-note-broke", { count: broke })}</p>
    {/if}
    {#if count !== null}
      <p>{t("modlist-note-body", { count })}</p>
    {/if}
    {#snippet actions()}
      <button type="button" class="action" onclick={() => goPage("modlist")}
        >{t("modlist-note-go")}</button
      >
    {/snippet}
  </NoteRow>
{/if}

<style>
  .broke {
    padding: 6px 10px;
    border-inline-start: 3px solid var(--colour-risk);
    background: var(--shade-risk);
  }
</style>
