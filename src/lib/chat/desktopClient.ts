import { Channel } from "@tauri-apps/api/core";
import { ask, BROWSER, inBrowser } from "../shell/desktopClient";
import type { Failed } from "../shell/types";
import type {
  ChatEvent,
  ChatStarted,
  ChatStatus,
  ChatStatusReading,
} from "./types";

type Status = { state: "ready"; status: ChatStatus } | Failed;
type Done = { state: "ready" } | Failed;
const ready = (status: ChatStatus) => ({ state: "ready" as const, status });
const done = () => ({ state: "ready" as const });

/** The Chat page's switch, the agents and the one running (0.74.0). Only reads. */
export async function readChatStatus(): Promise<ChatStatusReading> {
  if (inBrowser()) return BROWSER;
  return ask<ChatStatus, Status>("chat_status", {}, ready);
}

export async function chatSwitch(on: boolean): Promise<Status> {
  return ask<ChatStatus, Status>("chat_switch", { on }, ready);
}

export async function chatChoose(agent: string): Promise<Status> {
  return ask<ChatStatus, Status>("chat_choose", { agent }, ready);
}

/** Starts the chosen agent in a repository of the game, on the person's press; what it says comes to onEvent. */
export async function chatStart(
  game: string,
  repository: string,
  onEvent: (event: ChatEvent) => void,
): Promise<{ state: "ready"; started: ChatStarted } | Failed> {
  const channel = new Channel<ChatEvent>();
  channel.onmessage = onEvent;
  return ask<ChatStarted, { state: "ready"; started: ChatStarted } | Failed>(
    "chat_start",
    { game, repository, onEvent: channel },
    (started) => ({ state: "ready", started }),
  );
}

/** One message; answers when the agent's turn ends, with why it ended. */
export async function chatPrompt(
  text: string,
): Promise<{ state: "ready"; stop: string } | Failed> {
  return ask<string, { state: "ready"; stop: string } | Failed>(
    "chat_prompt",
    { text },
    (stop) => ({ state: "ready", stop }),
  );
}

export async function chatCancel(): Promise<Done> {
  return ask<null, Done>("chat_cancel", {}, done);
}

/** The person's answer to a permission the agent asked: one of its options, or null for none. */
export async function chatPermission(
  request: string,
  option: string | null,
): Promise<Done> {
  return ask<null, Done>("chat_permission", { request, option }, done);
}

/** Ends the agent with every process it started. */
export async function chatEnd(): Promise<Done> {
  if (inBrowser()) return { state: "ready" };
  return ask<null, Done>("chat_end", {}, done);
}
