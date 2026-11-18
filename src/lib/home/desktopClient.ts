import { ask, BROWSER, inBrowser } from "../shell/desktopClient";
import type { Home, HomeReading } from "./types";

/** Asks the host where each game was left. */
export async function readHome(): Promise<HomeReading> {
  if (inBrowser()) return BROWSER;
  return ask<Home, HomeReading>("home_status", {}, (home) => ({
    state: "ready",
    home,
  }));
}
