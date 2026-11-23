import type { PageName } from "../navigation/place";

/**
 * A page's parts as tabs (0.66.0; the owner's choice of 23 Nov 2026: "tabs across the page", for Settings, Mods and About). The
 * tab shown is the place's `tab` focus key, so each tab is a step of the trail and has its own address; an older link that names a
 * `panel` lands on the tab that holds it.
 */
export type Tab = {
  id: string;
  /** The tab's words, as a message key. */
  words: string;
  /** What waits behind it, said in words beside its name ("1 needs you"); null when nothing does. */
  mark?: string | null;
  /** The panels (older `panel` focus values) this tab holds. */
  panels?: string[];
  /** Focus keys that name something in this tab (Settings' `key`, a setting): a place naming one shows it. */
  keys?: string[];
};

/** The most tabs a row may hold: Alt + 1 to Alt + 9 reach each one. */
export const MOST_TABS = 9;

/**
 * Every page's tabs, in order: the one list the pages and Go to anything read. A panel is an older `panel` focus value (Home's
 * notes, the Guide's Take me there) that now lands on the tab holding it.
 */
export const PAGE_TABS: Partial<Record<PageName, Tab[]>> = {
  settings: [
    { id: "look", words: "settings-tab-look", panels: ["themes"] },
    { id: "games", words: "settings-tab-games", panels: ["games"] },
    { id: "folders", words: "settings-tab-folders", keys: ["key"] },
    { id: "online", words: "settings-tab-online", panels: ["online"] },
    {
      id: "backups",
      words: "settings-tab-backups",
      panels: ["records", "cleanup"],
    },
    { id: "agents", words: "settings-tab-agents", panels: ["agents"] },
    {
      id: "publishing",
      words: "settings-tab-publishing",
      panels: ["publishing"],
    },
    { id: "ai", words: "settings-tab-ai", panels: ["ai-programs"] },
  ],
  mods: [
    { id: "before", words: "mods-tab-before", panels: ["settings"] },
    {
      id: "installed",
      words: "mods-tab-installed",
      keys: ["mod", "changelog", "before"],
    },
    { id: "textures", words: "mods-tab-textures" },
  ],
  publish: [
    { id: "page", words: "publish-tab-page" },
    { id: "note", words: "publish-tab-note" },
    { id: "steam", words: "publish-tab-steam" },
    { id: "history", words: "publish-tab-history" },
  ],
  about: [
    { id: "version", words: "about-tab-version" },
    { id: "where", words: "about-tab-where" },
    { id: "online", words: "about-tab-online", panels: ["online"] },
    { id: "built", words: "about-tab-built" },
  ],
};

/** A page's tabs, each with what waits behind it (by tab id), for its tab row. */
export function tabsOf(
  page: PageName,
  marks: Record<string, string | null> = {},
): Tab[] {
  return (PAGE_TABS[page] ?? []).map((tab) => ({
    ...tab,
    mark: marks[tab.id] ?? null,
  }));
}

/**
 * The tab a place shows: its `tab` when the page has it, else the tab holding its `panel`, else the tab one of its focus keys
 * names something in, else the first.
 */
export function tabShown(tabs: Tab[], focus: Record<string, string>): string {
  const named = tabs.find((tab) => tab.id === focus.tab);
  if (named) return named.id;
  const holding = focus.panel
    ? tabs.find((tab) => tab.panels?.includes(focus.panel))
    : undefined;
  const naming = tabs.find((tab) => tab.keys?.some((key) => focus[key]));
  return (holding ?? naming ?? tabs[0]).id;
}

/** The tab before (-1) or after (1) the one shown, round from the last to the first and back. */
export function tabBeside(tabs: Tab[], shown: string, by: 1 | -1): string {
  const at = Math.max(
    0,
    tabs.findIndex((tab) => tab.id === shown),
  );
  return tabs[(at + by + tabs.length) % tabs.length].id;
}

/** The tab at a place in the row, counting from 1; null when the row has fewer. */
export function tabAt(tabs: Tab[], place: number): string | null {
  return tabs[place - 1]?.id ?? null;
}
