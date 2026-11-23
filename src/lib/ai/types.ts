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
