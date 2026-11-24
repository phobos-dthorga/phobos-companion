import type { Failed } from "../shell/types";

/** An agent the Chat page can start (0.74.0, `docs/ai.md`, A3), and whether its program is on this computer. */
export type ChatAgent = {
  id: string;
  name: string;
  found: boolean;
  /** Where the person gets it, in words. */
  get: string;
};

/** How the agent's commands are handled (0.84.0; the owner's choices by card, 25 Nov 2026); it starts on Ask. */
export type CommandsMode = "refused" | "ask" | "automatic";

export type ChatStatus = {
  /** Whether the Chat page is switched on (it starts off). */
  on: boolean;
  chosen: string | null;
  agents: ChatAgent[];
  running: { agent: string; repository: string } | null;
  commands: CommandsMode;
};

/** The person's answer to a command the agent asked to run (0.84.0). */
export type CommandAnswer = "run" | "no" | "for-chat";

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
      /** Where it names a command (0.84.0): the command, why it asks (ids), whether to look twice, and whether it may be allowed
       *  for the rest of the chat. */
      command?: string | null;
      why?: string[];
      warn?: boolean;
      remember?: boolean;
    }
  | {
      kind: "decided";
      title: string;
      command: string;
      outcome: "allowed" | "for-chat" | "refused";
      why: string[];
    }
  | {
      kind: "command-ask";
      request: string;
      command: string;
      cwd: string;
      why: string[];
      warn: boolean;
    }
  | {
      kind: "command-run";
      terminal: string;
      command: string;
      cwd: string;
      how: "automatic" | "you" | "for-chat";
      why: string[];
    }
  | {
      kind: "command-not-run";
      command: string;
      refused: boolean;
      why: string[];
      reason: string | null;
    }
  | {
      kind: "command-ended";
      terminal: string;
      code: number | null;
      signal: string | null;
      tail: string;
      truncated: boolean;
    }
  | { kind: "read"; path: string; allowed: boolean; reason: string | null }
  | {
      kind: "write";
      request: string;
      path: string;
      before: string | null;
      after: string;
    }
  | { kind: "written"; path: string; written: boolean; reason: string | null }
  | { kind: "refused"; what: string }
  | { kind: "ended"; reason: string };
