<script lang="ts">
  import { onMount, tick, type Snippet } from "svelte";
  import { t } from "../i18n/runtime";
  import { goTab, here } from "../navigation/navigation.svelte";
  import { register } from "../shortcuts/registry";
  import { keyFor } from "../shortcuts/state.svelte";
  import { keyWords } from "../shortcuts/keys";
  import { MOST_TABS, tabAt, tabBeside, tabShown, type Tab } from "./tabs";

  /**
   * A page's parts as tabs across it (0.66.0; the owner's choice of 23 Nov 2026), one part shown at a time. The tab shown is the
   * place's `tab` focus key, so each is a step of the trail: Back returns to the tab left, and Go to anything and a copied address
   * reach each one. ; and ' step along the row and Alt + a number jumps to a tab, while the row is on screen; Left, Right, Home and
   * End move along it when a tab has the keyboard. A tab with something waiting says so in words beside its name.
   */
  let {
    tabs,
    label,
    id,
    children,
  }: {
    tabs: Tab[];
    /** What the row is, read out by a screen reader ("Settings: its parts"). */
    label: string;
    /** The row's name, so each tab and its part have ids of their own. */
    id: string;
    children: Snippet<[string]>;
  } = $props();

  const shown = $derived(tabShown(tabs, here().focus));

  async function choose(next: string, focusTab = false) {
    if (next !== shown) goTab(next);
    if (focusTab) {
      await tick();
      document.getElementById(`${id}-tab-${next}`)?.focus();
    }
  }

  function onkeydown(event: KeyboardEvent) {
    const moves: Record<string, () => string> = {
      ArrowRight: () => tabBeside(tabs, shown, 1),
      ArrowLeft: () => tabBeside(tabs, shown, -1),
      Home: () => tabs[0].id,
      End: () => tabs[tabs.length - 1].id,
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    void choose(move(), true);
  }

  onMount(() =>
    register({
      scope: "everywhere",
      inDialog: false,
      run: {
        "tab.previous": () => void choose(tabBeside(tabs, shown, -1)),
        "tab.next": () => void choose(tabBeside(tabs, shown, 1)),
        ...Object.fromEntries(
          Array.from({ length: MOST_TABS }, (_, index) => [
            `tab.${index + 1}`,
            () => {
              const next = tabAt(tabs, index + 1);
              if (next) void choose(next);
            },
          ]),
        ),
      },
    }),
  );
</script>

<div class="tabs" role="tablist" aria-label={label}>
  {#each tabs as tab, index (tab.id)}
    {@const key = keyFor(`tab.${index + 1}`)}
    <button
      type="button"
      role="tab"
      id={`${id}-tab-${tab.id}`}
      aria-controls={`${id}-part`}
      aria-selected={shown === tab.id}
      tabindex={shown === tab.id ? 0 : -1}
      onclick={() => void choose(tab.id)}
      {onkeydown}
    >
      <span>{t(tab.words)}</span>
      {#if tab.mark}<span class="mark">{tab.mark}</span>{/if}
      {#if key}<kbd aria-hidden="true">{keyWords(key)}</kbd>{/if}
    </button>
  {/each}
</div>

<div
  class="part"
  role="tabpanel"
  id={`${id}-part`}
  aria-labelledby={`${id}-tab-${shown}`}
>
  {@render children(shown)}
</div>

<style>
  .tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0 4px;
    margin-block: 8px 20px;
    border-bottom: 1px solid var(--colour-line);
  }

  [role="tab"] {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: var(--control-min);
    padding-inline: 14px;
    margin-bottom: -1px;
    font: inherit;
    color: var(--colour-text-muted);
    background: transparent;
    border: 0;
    border-bottom: 3px solid transparent;
    cursor: pointer;
  }

  [role="tab"]:hover {
    color: var(--colour-text);
  }

  [role="tab"][aria-selected="true"] {
    font-weight: 600;
    color: var(--colour-text);
    border-bottom-color: var(--colour-accent);
  }

  .mark {
    padding: 0 8px;
    font-size: var(--type-caption);
    font-weight: 400;
    color: var(--colour-accent);
    border: 1px solid var(--colour-accent);
    border-radius: 999px;
  }

  kbd {
    padding: 0 5px;
    font-family: inherit;
    font-size: var(--type-caption);
    font-weight: 400;
    color: var(--colour-text-muted);
    border: 1px solid var(--colour-line);
    border-radius: 3px;
  }

  .part {
    min-width: 0;
  }
</style>
