import { ask, BROWSER, inBrowser } from "../shell/desktopClient";
import type { Failed } from "../shell/types";
import type { AgentChoice, AgentFeatures } from "./types";

type Read = { state: "ready"; status: AgentFeatures } | Failed;
const ready = (status: AgentFeatures) => ({ state: "ready" as const, status });

/** Whether features for agent sessions are shown, and what was found (0.37.0). */
export async function readAgentFeatures(): Promise<Read | typeof BROWSER> {
  if (inBrowser()) return BROWSER;
  return ask<AgentFeatures, Read>("agent_features", {}, ready);
}

/** Keeps the person's choice: found, on or off. */
export async function chooseAgentFeatures(choice: AgentChoice): Promise<Read> {
  return ask<AgentFeatures, Read>("choose_agent_features", { choice }, ready);
}
