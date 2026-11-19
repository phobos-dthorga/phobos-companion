import { ask } from "../shell/desktopClient";
import type { Failed } from "../shell/types";
import type { About } from "./types";

/** What the running program is, what it was built from, and what its repository holds since. Only reads. */
export async function readAbout(): Promise<
  { state: "ready"; about: About } | Failed
> {
  return ask<About, { state: "ready"; about: About }>("about", {}, (about) => ({
    state: "ready",
    about,
  }));
}
