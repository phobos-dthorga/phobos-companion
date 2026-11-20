import type { AgentFeatures } from "./types";
import { readAgentFeatures } from "./desktopClient";

/**
 * Whether features for AI agent sessions are shown (0.37.0; the owner, 20 Nov 2026: "Hidden unless switched on, or otherwise
 * detected"): Something's off, the Decisions page and its note on Home, open screen notes and the claims board. Hidden until the
 * host says otherwise; the last answer is remembered so they don't blink in and out at each start.
 */
const KEPT = "companion.agentFeaturesShown";

function remembered(): boolean {
  try {
    return localStorage.getItem(KEPT) === "yes";
  } catch {
    return false;
  }
}

export const agents = $state<{ shown: boolean; status: AgentFeatures | null }>({
  shown: remembered(),
  status: null,
});

/** Takes the host's answer: shown or not, and kept for the next start. */
export function useAgents(status: AgentFeatures): void {
  agents.status = status;
  agents.shown = status.shown;
  try {
    localStorage.setItem(KEPT, status.shown ? "yes" : "no");
  } catch {
    // Storage refused: the next start begins hidden until the host answers.
  }
}

/** Asks the host; in the browser preview, or when it can't answer, they stay as they were. */
export async function loadAgents(): Promise<void> {
  const answer = await readAgentFeatures();
  if (answer.state === "ready") useAgents(answer.status);
}
