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

/** A slow reading's last answer and when it was read (0.116.0). */
export type KeptAnswer<T> = { at: string; answer: T };

/**
 * The last answer the host kept for a slow reading (0.116.0; the owner's choice of 28 Nov 2026, "Old at once, then fresh"), shaped
 * by `ready` as the reading's own answer is, with when it was read; null when there is none, or outside the program. Only a head
 * start: a page shows it while it reads again, and locks every change until the fresh answer lands.
 */
export async function readKept<T, R>(
  command: string,
  key: string[],
  ready: (answer: T) => R,
): Promise<{ reading: R; at: string } | null> {
  if (inBrowser()) return null;
  const kept = await ask<KeptAnswer<T> | null, KeptAnswer<T> | null>(
    "kept_answer",
    { command, key },
    (answer) => answer,
  );
  if (!kept || "state" in kept) return null;
  return { reading: ready(kept.answer), at: kept.at };
}

/** Whether the window reads the slow pages ahead (0.116.0; on by default; outside the program, never). */
export async function readReadingAhead(): Promise<boolean> {
  if (inBrowser()) return false;
  const answer = await ask<boolean, boolean>("reading_ahead", {}, (on) => on);
  return answer === true;
}

/** Keeps the person's choice of reading ahead; the setting as it now stands, or the failure. */
export async function chooseReadingAhead(
  on: boolean,
): Promise<{ state: "ready"; on: boolean } | Failed> {
  return ask<boolean, { state: "ready"; on: boolean }>(
    "choose_reading_ahead",
    { on },
    (kept) => ({ state: "ready", on: kept }),
  );
}
