import type { Failed } from "../shell/types";

/** An agent the Chat page can start (0.74.0, `docs/ai.md`, A3), and whether its program is on this computer. */
export type ChatAgent = {
  id: string;
  name: string;
  found: boolean;
  /** Where the person gets it, in words. */
  get: string;
};

export type ChatStatus = {
  /** Whether the Chat page is switched on (it starts off). */
  on: boolean;
  chosen: string | null;
  agents: ChatAgent[];
  running: { agent: string; repository: string } | null;
};

export type ChatStatusReading =
  { state: "browser" } | { state: "ready"; status: ChatStatus } | Failed;

export type ChatStarted = {
  agent: string;
  repository: string;
  /** Whether the agent was handed the tool kit's reports. */
  kitReports: boolean;
};

export type ChatOption = { id: string; name: string; kind: string };

/** What the page hears from the agent, as the host passes it on. */
export type ChatEvent =
  | { kind: "text"; role: "agent" | "thought"; text: string }
  | {
      kind: "tool";
      id: string;
      title: string | null;
      tool: string | null;
      status: string | null;
    }
  | { kind: "plan"; entries: { content: string; status: string }[] }
  | {
      kind: "permission";
      request: string;
      title: string;
      options: ChatOption[];
    }
  | { kind: "read"; path: string; allowed: boolean; reason: string | null }
  | { kind: "refused"; what: string }
  | { kind: "ended"; reason: string };
