import type { Failed } from "../shell/types";

/** The lines an AI program needs to start the kit's MCP server: the kit's `mcp setup` (0.70.0, `docs/ai.md`, A1). */
export type AiProgramsSetup = {
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  /** The server list most programs keep (Claude Desktop, LM Studio, Gemini CLI and others), as JSON text. */
  serversJson: string;
  /** Claude Code's command, run once in a terminal. */
  claudeCode: string;
};

export type AiProgramsReading =
  | { state: "reading" }
  | { state: "browser" }
  | { state: "ready"; setup: AiProgramsSetup }
  | Failed;

/** Where a service's key comes from now (0.71.0). The key itself never reaches the window. */
export type AiKeySource =
  | { from: "environment"; variable: string }
  | { from: "store" }
  | { from: "none" };

export type AiLength = "short" | "medium" | "long";

export type AiServiceStatus = {
  id: string;
  name: string;
  api: "anthropic" | "openai";
  /** It runs on this computer: nothing leaves it, and it needs no key. */
  local: boolean;
  needsKey: boolean;
  key: AiKeySource;
  model: string | null;
};

export type AiMonth = {
  month: string;
  answers: number;
  inputTokens: number;
  outputTokens: number;
};

/** AI services for help on pages (0.71.0, `docs/ai.md`, A2), as the host keeps them. */
export type AiStatus = {
  services: AiServiceStatus[];
  chosen: string | null;
  length: AiLength;
  /** Whether the model may ask the tool kit's reports while it answers (0.73.0). */
  tools: boolean;
  /** Whether AI services is on in Settings → Going online. */
  onlineOn: boolean;
  /** The key store's name, or null when this computer has none the program can use. */
  keyStore: string | null;
  ready: boolean;
  month: AiMonth;
};

export type AiStatusReading =
  | { state: "reading" }
  | { state: "browser" }
  | { state: "ready"; status: AiStatus }
  | Failed;

/** What a press of Send would send, built and shown by the host first. */
export type AiPrepared = {
  id: number;
  what: string;
  service: string;
  model: string;
  local: boolean;
  /** Whether the model may ask the tool kit's reports (0.73.0). */
  tools: boolean;
  instruction: string;
  text: string;
  characters: number;
};

export type AiStop = "finished" | "calling" | "cut" | "refused" | "failed";

export type AiAnswer = {
  text: string;
  stop: AiStop;
  problem: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
};

/** A report the model asked for (0.73.0): what it asked in a few words, the tool kit's answer, and whether it was sent. */
export type AiCallView = {
  tool: string;
  summary: string;
  text: string;
  characters: number;
  failed: boolean;
  sent: boolean;
};

/** What the window hears while an answer comes. */
export type AiEvent =
  { kind: "text"; text: string } | { kind: "call"; call: AiCallView };

/** Where a question stands after Send or a yes: answered, or waiting on the person for an online model's report. */
export type AiStep =
  | {
      step: "answered";
      answer: AiAnswer;
      calls: AiCallView[];
      toolsUnavailable: boolean;
    }
  | { step: "waiting"; call: AiCallView; calls: AiCallView[] };
