import { Channel, invoke, isTauri } from "@tauri-apps/api/core";
import type { OnProgress, ProgressMessage } from "./progress";
import type { Failure, KitReading, KitStatus } from "./types";

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
  if (!isTauri()) return { state: "browser" };
  try {
    return { state: "ready", status: await invoke<KitStatus>("kit_status") };
  } catch (failure) {
    return { state: "failed", failure: failure as Failure };
  }
}
