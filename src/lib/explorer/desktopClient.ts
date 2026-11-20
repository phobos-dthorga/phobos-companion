import {
  ask,
  BROWSER,
  inBrowser,
  progressChannel,
} from "../shell/desktopClient";
import type { OnProgress } from "../shell/progress";
import type {
  Answer,
  AnswerReading,
  Offer,
  OfferReading,
  ReleaseReading,
  Request,
  Taken,
  TakenReading,
} from "./types";

/** Whether this game's tools can look inside the running game; the host reads the manifest and says so. */
export async function readOffer(game: string): Promise<OfferReading> {
  if (inBrowser()) return BROWSER;
  return ask<Offer, OfferReading>("explorer_offer", { game }, (offer) => ({
    state: "ready",
    offer,
  }));
}

/** Takes a snapshot of the running game and holds it, once the person has pressed and confirmed. */
export async function takeSnapshot(
  game: string,
  label: string,
  onProgress?: OnProgress,
): Promise<TakenReading> {
  if (inBrowser()) return BROWSER;
  return ask<Taken, TakenReading>(
    "explorer_start",
    { game, label, onProgress: progressChannel(onProgress) },
    (taken) => ({ state: "ready", taken }),
  );
}

/** Asks the held snapshot one question; the host checks it first, and says when the snapshot is no longer held. */
export async function askSnapshot<T>(
  snapshot: number,
  request: Request,
  onProgress?: OnProgress,
): Promise<AnswerReading<T>> {
  if (inBrowser()) return BROWSER;
  return ask<Answer<T>, AnswerReading<T>>(
    "explorer_ask",
    { snapshot, request, onProgress: progressChannel(onProgress) },
    (answer) => ({ state: "ready", answer }),
  );
}

/** Lets the held snapshot go. */
export async function releaseSnapshot(
  snapshot: number | null,
): Promise<ReleaseReading> {
  if (inBrowser()) return { state: "ready", held: false };
  return ask<boolean, ReleaseReading>(
    "explorer_release",
    { snapshot },
    (held) => ({ state: "ready", held }),
  );
}
