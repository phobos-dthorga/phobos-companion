<script lang="ts">
  import { hiddenPages } from "../navigation/hidden.svelte";
  import { pageServes, type GameKind } from "../home/kinds";
  import { t } from "../i18n/runtime";
  import type { PageName } from "../navigation/place";
  import { keyWords } from "../shortcuts/keys";
  import { keyFor } from "../shortcuts/state.svelte";

  /**
   * The pages, down the window's left side (0.66.0; the owner's choice of 23 Nov 2026, in place of the bar across the top that
   * wrapped onto several lines): grouped as before into what you play with, the code behind it and the tools' own pages, each with
   * its key beside it and, only when something there waits on you, how many.
   */
  let {
    page,
    kind,
    counts,
    marks = {},
    onchoose,
  }: {
    page: PageName;
    kind: GameKind | undefined;
    counts: Partial<Record<PageName, number>>;
    /** Pages marked without a number (0.67.0), each with the words for why, as a message key. */
    marks?: Partial<Record<PageName, string>>;
    onchoose: (page: PageName) => void;
  } = $props();

  /** Each page's name, as a message key. */
  const PAGE_WORDS: Record<PageName, string> = {
    home: "page-home",
    mods: "page-mods",
    modlist: "page-modlist",
    publish: "page-publish",
    tests: "page-tests",
    logs: "page-logs",
    memory: "page-memory",
    performance: "page-performance",
    gamefiles: "page-gamefiles",
    explorer: "page-explorer",
    atlas: "page-atlas",
    changes: "page-changes",
    timeline: "page-timeline",
    codemap: "page-codemap",
    makeup: "page-makeup",
    reports: "page-reports",
    chat: "page-chat",
    settings: "page-settings",
    safecopies: "page-safecopies",
    decisions: "page-decisions",
    picks: "page-picks",
    about: "page-about",
    guide: "page-guide",
  };

  /** Why a page is marked, as a message key (written out, so the catalogue check finds each). */
  const MARK_WORDS: Record<string, string> = {
    "pages-mark-newer": "pages-mark-newer",
  };

  /** The groups of 0.22.0, in the same order. */
  const GROUPS: { id: string; words: string; pages: PageName[] }[] = [
    {
      id: "play",
      words: "pages-group-play",
      pages: [
        "home",
        "mods",
        "modlist",
        "publish",
        "tests",
        "logs",
        "memory",
        "performance",
        "gamefiles",
        "explorer",
        "atlas",
      ],
    },
    {
      id: "code",
      words: "pages-group-code",
      pages: ["changes", "timeline", "codemap", "makeup"],
    },
    {
      id: "tools",
      words: "pages-group-tools",
      pages: [
        "reports",
        "chat",
        "settings",
        "safecopies",
        "decisions",
        "picks",
        "about",
        "guide",
      ],
    },
  ];
</script>

<nav class="rail" aria-label={t("pages-label")}>
  {#each GROUPS as group (group.id)}
    <div class="group" role="group" aria-labelledby={`pages-${group.id}`}>
      <span class="group-name" id={`pages-${group.id}`}>{t(group.words)}</span>
      {#each group.pages.filter((p) => !hiddenPages().includes(p)) as next (next)}
        {@const key = keyFor(`page.${next}`)}
        {@const count = counts[next]}
        {@const mark = count ? undefined : marks[next]}
        <button
          type="button"
          class="page"
          class:elsewhere={!pageServes(kind, next)}
          aria-current={page === next ? "page" : undefined}
          aria-describedby={count || mark ? `pages-waiting-${next}` : undefined}
          onclick={() => onchoose(next)}
        >
          <span class="here" aria-hidden="true">◆</span>
          <span class="words">{t(PAGE_WORDS[next])}</span>
          {#if count}<span class="count" aria-hidden="true">{count}</span
            >{:else if mark}<span class="count" aria-hidden="true">◆</span>{/if}
          {#if key}<kbd aria-hidden="true">{keyWords(key)}</kbd>{/if}
        </button>
        <!-- The count, read out as the page's description: its name stays the page's own, whatever waits (0.66.0). -->
        {#if count}<span class="unseen" id={`pages-waiting-${next}`}
            >{t("pages-waiting-label", { count })}</span
          >{:else if mark}<span class="unseen" id={`pages-waiting-${next}`}
            >{t(MARK_WORDS[mark] ?? "pages-mark-newer")}</span
          >{/if}
      {/each}
    </div>
  {/each}
</nav>

<style>
  .rail {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .group {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .group-name {
    padding: 0 10px 4px;
    font-size: var(--type-caption);
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--colour-text-muted);
  }

  /* 40 px, below the 44 px rule for a control: the owner's choice of 23 Nov 2026, so all of the pages show without scrolling in a
     window about 940 px high (AGENTS.md says so beside the rule). */
  .page {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 40px;
    padding: 2px 10px;
    font: inherit;
    text-align: start;
    color: var(--colour-text-muted);
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    cursor: pointer;
  }

  .page:hover {
    color: var(--colour-text);
    background: var(--colour-surface-raised);
  }

  .page[aria-current="page"] {
    font-weight: 600;
    color: var(--colour-text);
    background: var(--colour-surface-soft);
    border-color: var(--colour-accent);
  }

  /* A page with nothing for the entry looked at (a set of tools has no saves or log, 0.24.0): a dashed edge, and the page says why
     when opened. */
  .page.elsewhere {
    border-style: dashed;
    border-color: var(--colour-line);
  }

  .here {
    flex: none;
    width: 12px;
    font-size: var(--type-caption);
    color: var(--colour-accent);
    visibility: hidden;
  }

  .page[aria-current="page"] .here {
    visibility: visible;
  }

  .words {
    flex: 1;
    min-width: 0;
  }

  /* Read out, never drawn: the count is drawn beside the page's name. */
  .unseen {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .count {
    padding: 0 7px;
    font-size: var(--type-caption);
    font-weight: 400;
    font-variant-numeric: tabular-nums;
    color: var(--colour-accent);
    border: 1px solid var(--colour-accent);
    border-radius: 999px;
  }

  kbd {
    min-width: 22px;
    padding: 0 5px;
    font-family: inherit;
    font-size: var(--type-caption);
    font-weight: 400;
    text-align: center;
    color: var(--colour-text-muted);
    border: 1px solid var(--colour-line);
    border-radius: 3px;
    white-space: nowrap;
  }

  @media (max-width: 900px) {
    .group {
      flex-direction: row;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px;
    }

    .group-name {
      padding: 0 6px 0 4px;
    }
  }
</style>
