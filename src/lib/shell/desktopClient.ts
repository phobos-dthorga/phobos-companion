import { Channel, invoke, isTauri } from "@tauri-apps/api/core";
import type { OnProgress, ProgressMessage } from "./progress";
import type { Failed, Failure, KitReading, KitStatus } from "./types";

/** What a page shows outside the desktop program, where there is no host to ask. */
export const BROWSER = { state: "browser" } as const;

/** Whether the window runs in a browser rather than the desktop program. */
export function inBrowser(): boolean {
  return !isTauri();
}

/**
 * Asks the host one thing, the one way every page does: the answer, shaped by `ready` into what the page shows, or the host's
 * failure. Only the `desktopClient.ts` files call it, so only they talk to the host.
 */
export async function ask<T, R>(
  command: string,
  args: Record<string, unknown>,
  ready: (answer: T) => R,
): Promise<R | Failed> {
  try {
    return ready(await invoke<T>(command, args));
  } catch (failure) {
    return { state: "failed", failure: failure as Failure };
  }
}

/**
 * The channel a request gives the host so progress can come back while the host works. Every request that can report progress
 * sends one as `onProgress`; a caller that does not listen still sends one, and its messages go nowhere.
 */
export function progressChannel(
  onProgress?: OnProgress,
): Channel<ProgressMessage> {
  const channel = new Channel<ProgressMessage>();
  channel.onmessage = (message) => onProgress?.(message);
  return channel;
}

/** Asks the host how the tools are. The only place the window talks to the host about them. */
export async function readKit(): Promise<KitReading> {
  if (inBrowser()) return BROWSER;
  return ask<KitStatus, KitReading>("kit_status", {}, (status) => ({
    state: "ready",
    status,
  }));
}
