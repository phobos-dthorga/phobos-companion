import { agents } from "../agents/state.svelte";
import { chat } from "../chat/state.svelte";
import { FOR_AGENTS_PAGES, type PageName } from "./place";

/** Pages shown only once the Chat page is switched on and an agent chosen (0.74.0, `docs/ai.md`, A3). */
export const CHAT_PAGES: readonly PageName[] = ["chat"];

/**
 * The pages left out of the page list, Go to anything and the page keys now (0.74.0): those for agent sessions while those
 * features are hidden (0.37.0), and the Chat page until it is switched on. One place, so every list hides the same pages.
 */
export function hiddenPages(): readonly PageName[] {
  return [
    ...(agents.shown ? [] : FOR_AGENTS_PAGES),
    ...(chat.shown ? [] : CHAT_PAGES),
  ];
}
