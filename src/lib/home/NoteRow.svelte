<script module lang="ts">
  let made = 0;
</script>

<script lang="ts">
  import type { Snippet } from "svelte";

  /**
   * One line of Home's "Needs you" list (0.109.0; the owner's choice of 27 Nov 2026, "Inbox + 2 tabs"): what needs you, a
   * sentence on it, and its buttons, the same for every note. Each note decides whether it shows; this only draws it, inside the
   * list Home gives it. `attention` marks one that needs you before the rest (a broken mod list, a crash).
   */
  let {
    title,
    attention = false,
    children,
    actions,
  }: {
    title: string;
    attention?: boolean;
    children?: Snippet;
    actions?: Snippet;
  } = $props();

  const id = `note-row-${++made}`;
</script>

<li class="note" class:attention aria-labelledby={id}>
  <span class="mark" aria-hidden="true">◆</span>
  <div class="text">
    <strong {id}>{title}</strong>
    {#if children}<div class="body">{@render children()}</div>{/if}
  </div>
  {#if actions}<div class="actions">{@render actions()}</div>{/if}
</li>

<style>
  .note {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: start;
    gap: 4px 12px;
    padding: 12px 16px;
    border-top: 1px solid var(--colour-line);
    overflow-wrap: anywhere;
  }

  .note:first-child {
    border-top: none;
  }

  .attention {
    border-inline-start: 3px solid var(--colour-accent);
  }

  .mark {
    padding-top: 2px;
    color: var(--colour-accent);
  }

  .body :global(p) {
    margin: 2px 0 0;
    font-size: var(--type-small);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: end;
    gap: 8px;
  }

  @media (max-width: 640px) {
    .note {
      grid-template-columns: auto minmax(0, 1fr);
    }

    .actions {
      grid-column: 2;
      justify-content: start;
    }
  }
</style>
