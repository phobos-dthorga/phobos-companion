<script lang="ts">
  import { t } from "../i18n/runtime";

  /**
   * Newer and older pages of a long list, the one way every page shows them: newest first is page 1. It shows nothing when the
   * list fits on one page.
   */
  let {
    page,
    pages,
    first,
    last,
    total,
    label,
    onchange,
  }: {
    page: number;
    pages: number;
    first: number;
    last: number;
    total: number;
    /** What the pages are of, in words: "Versions of D'thorga Framework". */
    label: string;
    onchange: (page: number) => void;
  } = $props();
</script>

{#if pages > 1}
  <nav class="pager" aria-label={t("pager-label", { what: label })}>
    <button
      type="button"
      class="action"
      disabled={page <= 1}
      onclick={() => onchange(1)}>{t("pager-newest")}</button
    >
    <button
      type="button"
      class="action"
      disabled={page <= 1}
      onclick={() => onchange(page - 1)}>{t("pager-newer")}</button
    >
    <span class="where" aria-live="polite"
      >{t("pager-where", { page, pages, first, last, total })}</span
    >
    <button
      type="button"
      class="action"
      disabled={page >= pages}
      onclick={() => onchange(page + 1)}>{t("pager-older")}</button
    >
    <button
      type="button"
      class="action"
      disabled={page >= pages}
      onclick={() => onchange(pages)}>{t("pager-oldest")}</button
    >
  </nav>
{/if}

<style>
  .pager {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 10px;
    margin-block: 10px;
  }

  .where {
    flex: 1 1 12em;
    text-align: center;
    color: var(--colour-text-muted);
    font-size: var(--type-small);
    font-variant-numeric: tabular-nums;
  }
</style>
