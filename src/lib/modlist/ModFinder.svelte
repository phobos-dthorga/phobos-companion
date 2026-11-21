<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import { type Findable, matching } from "./editor";

  /**
   * Finds a mod by typing part of its name or id (0.47.0; the owner, 22 Nov 2026: "move mods around more freely"): the matches
   * show as buttons, names that start with the words first; Enter takes the first, Escape lets the finder go. Used to put mods
   * after or before another, to switch mods on beside one, and to name the mods of a rule.
   */
  let {
    mods,
    label,
    pickWords,
    onpick,
    oncancel,
  }: {
    mods: Findable[];
    /** What the box asks, in words. */
    label: string;
    /** A match's button words. */
    pickWords: (mod: Findable) => string;
    onpick: (mod: Findable) => void;
    oncancel?: () => void;
  } = $props();

  let search = $state("");
  let box = $state<HTMLInputElement | null>(null);
  const found = $derived(matching(mods, search));

  function keys(event: KeyboardEvent) {
    if (event.key === "Enter" && found.length > 0) {
      event.preventDefault();
      onpick(found[0]);
    } else if (event.key === "Escape" && oncancel) {
      event.preventDefault();
      event.stopPropagation();
      oncancel();
    }
  }

  onMount(() => box?.focus());
</script>

<div class="finder">
  <label>
    <span>{label}</span>
    <input
      type="search"
      bind:this={box}
      bind:value={search}
      onkeydown={keys}
      autocomplete="off"
    />
  </label>
  {#if search.trim() !== ""}
    {#if found.length === 0}
      <p class="muted">{t("modlist-finder-none")}</p>
    {:else}
      <ul class="found">
        {#each found as mod, index (mod.key)}
          <li>
            <button
              type="button"
              class="action"
              class:first={index === 0}
              onclick={() => onpick(mod)}>{pickWords(mod)}</button
            >
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
  {#if oncancel}
    <button type="button" class="action" onclick={oncancel}
      >{t("modlist-cancel")}</button
    >
  {/if}
</div>

<style>
  .finder {
    margin: 8px 0;
    padding: 10px 14px;
    border-inline-start: 3px solid var(--colour-observed);
    background: var(--shade-observed);
    border-radius: 4px;
  }

  label {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }

  input {
    min-height: var(--control-min);
    min-width: min(24em, 100%);
  }

  .found {
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 8px 0;
    padding: 0;
  }

  .found .first {
    border-width: 2px;
  }
</style>
