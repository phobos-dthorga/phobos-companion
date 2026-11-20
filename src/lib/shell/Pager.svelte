<script lang="ts">
  import { t } from "../i18n/runtime";

  /**
   * Newer and older pages of a long list, the one way every page shows them: newest first is page 1. It shows nothing when the
   * list fits on one page.
   *
   * A list in no order of time (one kind's objects in a snapshot) says First, Previous, Next and Last instead (`plain`). A list
   * asked of the host a page at a time, whose length a filter hides, has no count of pages (`pages` null): it offers Next while
   * the host says there are `more`, and no Last.
   */
  let {
    page,
    pages,
    first,
    last,
    total,
    label,
    onchange,
    more = false,
    plain = false,
  }: {
    page: number;
    pages: number | null;
    first: number;
    last: number;
    total: number | null;
    /** What the pages are of, in words: "Versions of D'thorga Framework". */
    label: string;
    onchange: (page: number) => void;
    more?: boolean;
    plain?: boolean;
  } = $props();

  const hasNext = $derived(pages === null ? more : page < pages);
  const shown = $derived(pages === null ? page > 1 || more : pages > 1);
</script>

{#if shown}
  <nav class="pager" aria-label={t("pager-label", { what: label })}>
    <button
      type="button"
      class="action"
      disabled={page <= 1}
      onclick={() => onchange(1)}
      >{plain ? t("pager-first") : t("pager-newest")}</button
    >
    <button
      type="button"
      class="action"
      disabled={page <= 1}
      onclick={() => onchange(page - 1)}
      >{plain ? t("pager-previous") : t("pager-newer")}</button
    >
    <span class="where" aria-live="polite"
      >{pages === null || total === null
        ? t("pager-where-open", { page, first, last })
        : t("pager-where", { page, pages, first, last, total })}</span
    >
    <button
      type="button"
      class="action"
      disabled={!hasNext}
      onclick={() => onchange(page + 1)}
      >{plain ? t("pager-next") : t("pager-older")}</button
    >
    {#if pages !== null}
      <button
        type="button"
        class="action"
        disabled={page >= pages}
        onclick={() => onchange(pages ?? page)}
        >{plain ? t("pager-last") : t("pager-oldest")}</button
      >
    {/if}
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
