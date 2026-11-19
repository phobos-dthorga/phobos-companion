import { Channel, invoke, isTauri } from "@tauri-apps/api/core";
import type { OnProgress, ProgressMessage } from "./progress";
import type { Failed, Failure, KitReading, KitStatus } from "./types";
import { begin, end, hear } from "./activity.svelte";

/** What a page shows outside the desktop program, where there is no host to ask. */
export const BROWSER = { state: "browser" } as const;

/** Whether the window runs in a browser rather than the desktop program. */
export function inBrowser(): boolean {
  return !isTauri();
}

/**
 * Asks the host one thing, the one way every page does: the answer, shaped by `ready` into what the page shows, or the host's
 * failure. Only the `desktopClient.ts` files call it, so only they talk to the host. A request may send raw bytes as its body, with
 * headers beside them (a picture of a page, 0.21.0).
 */
export async function ask<T, R>(
  command: string,
  args: Record<string, unknown> | Uint8Array,
  ready: (answer: T) => R,
  options?: { headers: Record<string, string> },
): Promise<R | Failed> {
  // Every request is a job on the activity strip while it runs (0.21.0), hearing the same progress its page hears.
  const job = begin(command);
  const channel = args instanceof Uint8Array ? undefined : args.onProgress;
  if (channel instanceof Channel) {
    const before = channel.onmessage;
    channel.onmessage = (message: ProgressMessage) => {
      before?.(message);
      hear(job, message);
    };
  }
  try {
    return ready(await invoke<T>(command, args, options));
  } catch (failure) {
    return { state: "failed", failure: failure as Failure };
  } finally {
    end(job);
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
