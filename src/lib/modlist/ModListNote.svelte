<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import { goPage } from "../navigation/navigation.svelte";
  import { latest, refreshIfStale } from "./latest.svelte";
  import { worthMentioning } from "./presentation";

  /**
   * On Home (0.45.0): a note when a game's list of active mods has problems or warnings, leading to the Mod list page. The check
   * is read quietly, without asking Steam, at most every half hour; nothing shows when the list is fine, or when the tools cannot
   * read this game's list yet.
   */
  let { game }: { game: string } = $props();

  onMount(() => void refreshIfStale(game));

  const count = $derived(worthMentioning(latest.checks[game] ?? null));
</script>

{#if count !== null}
  <section class="panel attention" aria-labelledby="modlist-note-title">
    <h2 id="modlist-note-title">{t("modlist-note-title")}</h2>
    <p>{t("modlist-note-body", { count })}</p>
    <button type="button" class="action" onclick={() => goPage("modlist")}
      >{t("modlist-note-go")}</button
    >
  </section>
{/if}

<style>
  .panel {
    margin-bottom: 16px;
    padding: 20px 24px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-inline-start: 3px solid var(--colour-accent);
    border-radius: 4px;
  }

  h2 {
    margin-bottom: 8px;
    font-family: var(--font-display);
    font-size: 1.375rem;
    font-weight: 600;
  }

  p {
    margin-bottom: 10px;
  }
</style>
