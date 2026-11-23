import { readChatStatus } from "./desktopClient";
import type { ChatStatus } from "./types";

/**
 * Whether the Chat page shows (0.74.0, `docs/ai.md`, A3): only once it is switched on in Settings → AI and an agent is chosen; it
 * starts off. The last answer is remembered so the page list doesn't blink at each start.
 */
const KEPT = "companion.chatShown";

function remembered(): boolean {
  try {
    return localStorage.getItem(KEPT) === "yes";
  } catch {
    return false;
  }
}

export const chat = $state<{ shown: boolean; status: ChatStatus | null }>({
  shown: remembered(),
  status: null,
});

/** Takes the host's answer: shown or not, and kept for the next start. */
export function useChat(status: ChatStatus): void {
  chat.status = status;
  chat.shown = status.on && status.chosen !== null;
  try {
    localStorage.setItem(KEPT, chat.shown ? "yes" : "no");
  } catch {
    // Storage refused: the next start begins hidden until the host answers.
  }
}

/** Asks the host; in the browser preview, or when it can't answer, it stays as it was. */
export async function loadChat(): Promise<void> {
  const answer = await readChatStatus();
  if (answer.state === "ready") useChat(answer.status);
}
