import { Channel } from "@tauri-apps/api/core";
import { ask, BROWSER, inBrowser } from "../shell/desktopClient";
import type { Failed } from "../shell/types";
import type {
  AiAnswer,
  AiLength,
  AiPrepared,
  AiProgramsReading,
  AiProgramsSetup,
  AiStatus,
  AiStatusReading,
} from "./types";

/** The lines an AI program needs to start the kit's MCP server (0.70.0). The host only reads them from the kit. */
export async function readAiProgramsSetup(): Promise<AiProgramsReading> {
  if (inBrowser()) return BROWSER;
  return ask<AiProgramsSetup, AiProgramsReading>(
    "ai_programs_setup",
    {},
    (setup) => ({ state: "ready", setup }),
  );
}

type Status = { state: "ready"; status: AiStatus } | Failed;
const ready = (status: AiStatus) => ({ state: "ready" as const, status });

/** AI services as the host keeps them (0.71.0): services, choices, where each key comes from, the month's count. */
export async function readAiStatus(): Promise<AiStatusReading> {
  if (inBrowser()) return BROWSER;
  return ask<AiStatus, Status>("ai_status", {}, ready);
}

export async function chooseAiService(service: string): Promise<Status> {
  return ask<AiStatus, Status>("ai_choose_service", { service }, ready);
}

export async function chooseAiModel(
  service: string,
  model: string,
): Promise<Status> {
  return ask<AiStatus, Status>("ai_choose_model", { service, model }, ready);
}

export async function chooseAiLength(length: AiLength): Promise<Status> {
  return ask<AiStatus, Status>("ai_choose_length", { length }, ready);
}

/** Hands a key the person typed to the host, which keeps it in the system's key store; it never comes back. */
export async function keepAiKey(service: string, key: string): Promise<Status> {
  return ask<AiStatus, Status>("ai_keep_key", { service, key }, ready);
}

export async function forgetAiKey(service: string): Promise<Status> {
  return ask<AiStatus, Status>("ai_forget_key", { service }, ready);
}

/** A service's own list of models, on a press. */
export async function readAiModels(
  service: string,
): Promise<{ state: "ready"; models: string[] } | Failed> {
  return ask<string[], { state: "ready"; models: string[] } | Failed>(
    "ai_models",
    { service },
    (models) => ({ state: "ready", models }),
  );
}

/** What Explain this fault would send, built by the host from the fault it last read. Nothing is sent. */
export async function prepareFault(
  game: string,
  fault: string,
): Promise<{ state: "ready"; prepared: AiPrepared } | Failed> {
  return ask<AiPrepared, { state: "ready"; prepared: AiPrepared } | Failed>(
    "ai_prepare_fault",
    { game, fault },
    (prepared) => ({ state: "ready", prepared }),
  );
}

/** Sends the question the host last prepared, on the person's press; each piece of the answer goes to onText as it comes. */
export async function sendPrepared(
  id: number,
  onText: (text: string) => void,
): Promise<{ state: "ready"; answer: AiAnswer } | Failed> {
  const channel = new Channel<string>();
  channel.onmessage = onText;
  return ask<AiAnswer, { state: "ready"; answer: AiAnswer } | Failed>(
    "ai_send",
    { id, onText: channel },
    (answer) => ({ state: "ready", answer }),
  );
}
