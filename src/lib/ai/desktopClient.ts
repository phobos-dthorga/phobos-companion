import { ask, BROWSER, inBrowser } from "../shell/desktopClient";
import type { AiProgramsReading, AiProgramsSetup } from "./types";

/** The lines an AI program needs to start the kit's MCP server (0.70.0). The host only reads them from the kit. */
export async function readAiProgramsSetup(): Promise<AiProgramsReading> {
  if (inBrowser()) return BROWSER;
  return ask<AiProgramsSetup, AiProgramsReading>(
    "ai_programs_setup",
    {},
    (setup) => ({ state: "ready", setup }),
  );
}
