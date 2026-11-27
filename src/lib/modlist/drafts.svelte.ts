import type { Draft } from "./draft";

/**
 * Unsaved changes on Edit the list, kept for this run of the program (0.108.0), so going to another page and back loses nothing.
 * A draft is used again only while its list still holds what it began from; the tools refuse to save it otherwise anyway.
 */
export const drafts = $state<Record<string, Draft>>({});

export function draftKey(game: string, list: string): string {
  return `${game}/${list}`;
}
