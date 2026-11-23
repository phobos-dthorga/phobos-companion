import { readAiStatus } from "./desktopClient";
import type { AiStatus } from "./types";

/**
 * AI services as last read (0.71.0), shared by Settings → AI and the pages that offer help, so a button such as Explain this
 * fault shows only once a service and its model are ready, and goes away the moment they are not.
 */
export const ai = $state<{ status: AiStatus | null }>({ status: null });

export function useAi(status: AiStatus) {
  ai.status = status;
}

/** Reads the status again; a failure leaves the last one, and a browser has none. */
export async function loadAi() {
  const answer = await readAiStatus();
  if (answer.state === "ready") useAi(answer.status);
}
