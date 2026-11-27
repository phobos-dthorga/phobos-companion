<script lang="ts">
  import { t } from "../i18n/runtime";

  /**
   * A filter box for a page's long list (0.110.0): Ctrl + F gives it the keyboard (`data-page-filter`), Escape empties it, and it
   * says how many of the list are shown when a filter is typed. The page filters with `matchesFilter`.
   */
  let {
    value = $bindable(""),
    label,
    shown = null,
    total = null,
  }: {
    value?: string;
    label: string;
    shown?: number | null;
    total?: number | null;
  } = $props();
</script>

<div class="filter-box">
  <input
    type="search"
    data-page-filter
    aria-label={label}
    placeholder={t("filter-placeholder")}
    autocomplete="off"
    spellcheck="false"
    bind:value
    onkeydown={(event) => {
      if (event.key === "Escape" && value) {
        event.stopPropagation();
        value = "";
      }
    }}
  />
  {#if value.trim() && shown !== null && total !== null}
    <span class="small muted" role="status"
      >{t("filter-shown", { shown, total })}</span
    >
  {/if}
</div>

<style>
  .filter-box {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 12px;
    margin-bottom: 12px;
  }

  input {
    flex: 0 1 28rem;
    min-width: 12rem;
    min-height: 44px;
    padding: 6px 10px;
    font: inherit;
    color: var(--colour-text);
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }
</style>
