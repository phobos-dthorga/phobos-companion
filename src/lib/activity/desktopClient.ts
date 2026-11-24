import { ask, inBrowser } from "../shell/desktopClient";
import type { Sample } from "./types";

/** The computer's activity over the last minute, oldest first (0.86.0); none in the browser preview or when it can't be read. */
export async function readActivity(): Promise<Sample[]> {
  if (inBrowser()) return [];
  const answer = await ask<Sample[], { state: "ready"; samples: Sample[] }>(
    "activity",
    {},
    (samples) => ({ state: "ready", samples }),
  );
  return answer.state === "ready" ? answer.samples : [];
}
