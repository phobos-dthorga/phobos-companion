<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import { keepLaunch, launches, loadLaunch } from "./launch.svelte";

  /**
   * A game's arguments line, to read and change (0.117.0; the owner's card of 28 Nov 2026: one line per game, kept from Settings →
   * Games and from the Mod list's bar). Keep (or Enter) keeps it; the same line shows in both places. Nothing shows for a game the
   * tools cannot start.
   */
  let { game, label = "" }: { game: string; label?: string } = $props();

  let text = $state("");
  let shownFor = $state<string | null>(null);
  let busy = $state(false);
  let said = $state<{ ok: boolean; words: string } | null>(null);

  const launch = $derived(launches[game]);
  const kept = $derived(launch?.state === "ready" ? launch.line : "");
  const changed = $derived(launch?.state === "ready" && text.trim() !== kept);

  // The box follows the kept line until it is edited here: once read, and again after it is kept elsewhere.
  $effect(() => {
    if (launch?.state === "ready" && shownFor !== kept) {
      text = kept;
      shownFor = kept;
    }
  });

  async function keep() {
    if (busy || !changed) return;
    busy = true;
    said = null;
    const refusal = await keepLaunch(game, text);
    busy = false;
    said =
      refusal === null
        ? {
            ok: true,
            words: text.trim()
              ? t("launch-kept", { line: text.trim() })
              : t("launch-kept-none"),
          }
        : { ok: false, words: t("launch-keep-failed", { reason: refusal }) };
  }

  onMount(() => void loadLaunch(game));
</script>

{#if launch?.state === "ready"}
  <form
    class="line"
    onsubmit={(event) => {
      event.preventDefault();
      void keep();
    }}
  >
    <label>
      <span class="small">{label || t("launch-label")}</span>
      <input
        type="text"
        spellcheck="false"
        autocomplete="off"
        maxlength="1000"
        placeholder={t("launch-placeholder")}
        bind:value={text}
        disabled={busy}
      />
    </label>
    <button type="submit" class="action" disabled={busy || !changed}
      >{t("launch-keep")}</button
    >
  </form>
  <div aria-live="polite">
    {#if said}
      <p class={said.ok ? "said small" : "said small refused"} role="status">
        {said.words}
      </p>
    {/if}
  </div>
{/if}

<style>
  .line {
    display: flex;
    flex-wrap: wrap;
    align-items: end;
    gap: 8px;
  }

  label {
    display: grid;
    gap: 2px;
    flex: 1 1 22em;
  }

  input {
    font-family: var(--font-mono);
  }

  .said {
    margin: 4px 0 0;
  }

  .refused {
    color: var(--colour-risk);
  }
</style>
