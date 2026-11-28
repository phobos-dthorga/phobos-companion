<script lang="ts">
  import NoteRow from "../home/NoteRow.svelte";
  import { t } from "../i18n/runtime";
  import { go } from "../navigation/navigation.svelte";
  import { place } from "../navigation/place";
  import RichText from "../shell/RichText.svelte";
  import { costsOf, loadCosts } from "./costs.svelte";
  import { ownRose, shareWords } from "./presentation";

  /**
   * On Home's "Needs you" (0.119.0, `docs/performance.md` B4): the newest recording, when what it found first is a risk or our own
   * mods' share rose against the earlier recordings, leading to it on the Performance page. Nothing shows otherwise.
   */
  let { game }: { game: string } = $props();

  $effect(() => loadCosts(game));

  const data = $derived(costsOf(game));
  const risky = $derived(data?.first_finding?.role === "risk");
  const rose = $derived(data ? ownRose(data.own.note) : false);
</script>

{#if data && (risky || rose)}
  <NoteRow title={t("performance-note-title")} attention={risky}>
    {#if risky && data.first_finding.text}
      <p><RichText text={data.first_finding.text} /></p>
    {/if}
    {#if rose}
      <p>
        {t("performance-note-ours", {
          share: shareWords(data.own.share),
          before: shareWords(data.own.earlier_middle ?? 0),
        })}
      </p>
    {/if}
    {#snippet actions()}
      <button
        type="button"
        class="action"
        onclick={() =>
          go(place("performance", game, { recording: data.newest }))}
        >{t("performance-note-open")}</button
      >
    {/snippet}
  </NoteRow>
{/if}
