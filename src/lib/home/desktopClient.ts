import { ask, BROWSER, inBrowser } from "../shell/desktopClient";
import type { Failed } from "../shell/types";
import type { Home, HomeReading, KitPins } from "./types";

/** Asks the host where each game was left. */
export async function readHome(): Promise<HomeReading> {
  if (inBrowser()) return BROWSER;
  return ask<Home, HomeReading>("home_status", {}, (home) => ({
    state: "ready",
    home,
  }));
}

/** Which tool kit version each of a game's repositories pins (cross-links S2), or why it could not be read. */
export async function readKitPins(
  game: string,
): Promise<{ state: "ready"; pins: KitPins } | Failed> {
  return ask<KitPins, { state: "ready"; pins: KitPins }>(
    "kit_pins",
    { game },
    (pins) => ({ state: "ready", pins }),
  );
}
