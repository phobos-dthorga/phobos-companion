import { Channel } from "@tauri-apps/api/core";
import { ask, BROWSER, inBrowser } from "../shell/desktopClient";
import type { Failed } from "../shell/types";
import type {
  AiEvent,
  AiLength,
  AiPrepared,
  AiProgramsReading,
  AiProgramsSetup,
  AiStatus,
  AiStatusReading,
  AiStep,
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

type Prepared = { state: "ready"; prepared: AiPrepared } | Failed;
const shown = (prepared: AiPrepared) => ({ state: "ready" as const, prepared });

/** What Summarise this version would send, built by the host from the changelogs it last read (0.72.0). Nothing is sent. */
export async function prepareVersion(
  game: string,
  repository: string,
  changelog: string,
  version: string,
): Promise<Prepared> {
  return ask<AiPrepared, Prepared>(
    "ai_prepare_version",
    { game, repository, changelog, version },
    shown,
  );
}

/** What "What does this mean for my mods?" would send, built from the repository's last update check (0.72.0). */
export async function prepareUpdateCheck(
  game: string,
  repository: string,
): Promise<Prepared> {
  return ask<AiPrepared, Prepared>(
    "ai_prepare_update_check",
    { game, repository },
    shown,
  );
}

type Stepped = { state: "ready"; step: AiStep } | Failed;

function hearing(onEvent: (event: AiEvent) => void): Channel<AiEvent> {
  const channel = new Channel<AiEvent>();
  channel.onmessage = onEvent;
  return channel;
}

/** Sends the question the host last prepared, on the person's press. Each piece of the answer, and each report the model asks
 *  for (0.73.0), goes to onEvent as it comes; it ends answered, or waiting on the person's yes for an online model's report. */
export async function sendPrepared(
  id: number,
  onEvent: (event: AiEvent) => void,
): Promise<Stepped> {
  return ask<AiStep, Stepped>(
    "ai_send",
    { id, onEvent: hearing(onEvent) },
    (step) => ({ state: "ready", step }),
  );
}

/** The person's yes or no to the report an online model asked for, shown whole first (0.73.0); the question then goes on. */
export async function answerCall(
  id: number,
  allow: boolean,
  onEvent: (event: AiEvent) => void,
): Promise<Stepped> {
  return ask<AiStep, Stepped>(
    "ai_answer_call",
    { id, allow, onEvent: hearing(onEvent) },
    (step) => ({ state: "ready", step }),
  );
}

/** Keeps whether the model may ask the tool kit's reports while it answers (0.73.0). */
export async function chooseAiTools(on: boolean): Promise<Status> {
  return ask<AiStatus, Status>("ai_choose_tools", { on }, ready);
}
